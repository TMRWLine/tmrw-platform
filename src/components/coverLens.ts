import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { COVER_LINE_DELAYS, COVER_SETTLE_MS, COVER_WORD_DELAYS } from '../lib/coverMotion';
import { lensPass, plateFragment, plateVertex } from './coverLensShaders';

const ASPECT = 612 / 407;
const REST_Z = 5.9;
const FOV = 38;
const BEATS = COVER_WORD_DELAYS.map(ms => ms / 1000);
const LAMPS = [[.164, .88, .38], [.370, .735, .18], [.529, .735, -.09], [.913, .839, -.63]] as const;
const COURT = [
  [0, .20, 1, .20], [.26, .20, .26, .80], [.74, .20, .74, .80],
  [.21, .50, .31, .50], [.69, .50, .79, .50], [0, .80, .44, .80],
  [.50, .80, .50, 14 / 15], [.56, .80, 1, .80],
] as const;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const shaftMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uLight: { value: 0 }, uTime: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 view = modelViewMatrix * vec4(position, 1.);
      vView = -view.xyz;
      gl_Position = projectionMatrix * view;
    }
  `,
  fragmentShader: `
    uniform float uLight;
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float edge = abs(dot(normalize(vNormal), normalize(vView)));
      float height = smoothstep(.02, .23, vUv.y) * (1. - smoothstep(.7, 1., vUv.y));
      float fog = .72 + .28 * sin(vUv.y * 33. + sin(vUv.x * 21.) + uTime);
      gl_FragColor = vec4(.7, .86, .75, uLight * fog * height * pow(edge, 1.7));
    }
  `,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
});

export function mountCoverLens(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  onReady: () => void,
  onFallback: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
  });
  if (!renderer.extensions.has('EXT_color_buffer_float')) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw new Error('Cover lens requires half-float render targets');
  }
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const software = debug && /swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
  const pixelBudget = software ? 240_000 : 1_250_000;
  renderer.setClearColor(0x080808);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, .05, 32);
  camera.position.z = REST_Z;
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass(lensPass);
  composer.addPass(grade);
  const loader = new THREE.TextureLoader();
  const photo = loader.load('/coverpage.jpg', markLoaded, undefined, onFallback);
  photo.colorSpace = THREE.SRGBColorSpace;
  const depth = loader.load('/cover-depth.svg', markLoaded, undefined, onFallback);
  const uniforms = {
    uPhoto: { value: photo }, uDepth: { value: depth },
    uTime: { value: 0 }, uReveal: { value: 0 }, uPhone: { value: 0 },
    uFires: { value: new THREE.Vector4() }, uSteady: { value: new THREE.Vector4() },
  };
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(ASPECT, 1, 84, 56),
    new THREE.ShaderMaterial({ uniforms, vertexShader: plateVertex, fragmentShader: plateFragment }));
  scene.add(plate);
  const cone = new THREE.ConeGeometry(.28, 1, 28, 1, true).translate(0, -.5, 0);
  const rig = LAMPS.map(() => new THREE.Mesh(cone, shaftMaterial()));
  rig.forEach(shaft => scene.add(shaft));
  const led = new THREE.SphereGeometry(.027, 12, 8);
  const banks = LAMPS.map(() => new THREE.Mesh(led, new THREE.MeshBasicMaterial({ color: 0xffeac8 })));
  banks.forEach(bank => scene.add(bank));
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, -.62).normalize(), 1.96);
  const direction = new THREE.Vector3();
  const axis = new THREE.Vector3(0, -1, 0);
  const receiver = new THREE.Vector3();
  const ray = new THREE.Ray(new THREE.Vector3(0, 0, REST_Z), direction);
  const strips = COURT.map(() => {
    const material = new THREE.LineBasicMaterial({ color: 0xfff7dc, transparent: true, depthTest: false });
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    scene.add(line);
    return { line, geometry, material, start: new THREE.Vector3(), end: new THREE.Vector3() };
  });

  let frame = 0;
  let loaded = 0;
  let started = 0;
  let previous = 0;
  let elapsedTotal = 0;
  let frames = 0;
  let visible = true;
  let stopped = false;
  let stageTop = 0;
  let stageHeight = 1;
  let ptrX = 0, ptrY = 0, driftX = 0, driftY = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  function size() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const ratio = Math.min(devicePixelRatio, 1.5, Math.sqrt(pixelBudget / (width * height)));
    composer.setPixelRatio(ratio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    const h = 2 * REST_Z * Math.tan(FOV * Math.PI / 360);
    const scale = h * Math.max(1, camera.aspect / ASPECT) * 1.12;
    plate.scale.set(scale, scale, 1);
    uniforms.uPhone.value = camera.aspect < .85 ? 1 : 0;
    const viewport = stage.getBoundingClientRect();
    stageTop = viewport.top + scrollY;
    stageHeight = viewport.height;
    LAMPS.forEach(([x, y, slope], i) => {
      const shaft = rig[i];
      shaft.position.set((x - .5) * scale * ASPECT, (y - .5) * scale, .12);
      direction.set(slope, -.87, .32).normalize();
      shaft.quaternion.setFromUnitVectors(axis, direction);
      shaft.scale.set(scale * .39, scale * .56, scale * .39);
      banks[i].position.copy(shaft.position);
    });
    camera.position.set(0, 0, REST_Z);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const ground = (x: number, y: number, out: THREE.Vector3) => {
      direction.set(x * 2 - 1, 1 - y * 2, .5).unproject(camera).sub(camera.position).normalize();
      ray.intersectPlane(floor, out);
    };
    COURT.forEach(([x1, y1, x2, y2], i) => {
      ground(x1, y1, strips[i].start);
      ground(x2, y2, strips[i].end);
    });
  }

  function draw(now: number) {
    frame = 0;
    if (!visible || document.hidden || stopped) return;
    const t = (now - started) / 1000;
    const skipped = t > .16 && stage.dataset.intro === 'false' && t < COVER_SETTLE_MS / 1000;
    const beat = skipped ? COVER_SETTLE_MS / 1000 : t;
    const dolly = smooth(.02, 2.28, beat);
    const idle = smooth(2.26, 3.35, beat);
    const travel = smooth(0, stageHeight * .63, scrollY - stageTop);
    driftX += (ptrX - driftX) * .06;
    driftY += (ptrY - driftY) * .06;
    const mobile = uniforms.uPhone.value === 1;
    camera.position.set(
      mix(-.24, 0, dolly) * (mobile ? .42 : 1) + driftX * .12 * idle,
      mix(.44, 0, dolly) + driftY * .09 * idle - travel * .28,
      mix(REST_Z + .24, REST_Z - .23, dolly) - travel * .63 + Math.sin(t * .62) * .035 * idle,
    );
    camera.lookAt(camera.position.x * .38, camera.position.y * .12 - travel * .25, 0);
    uniforms.uTime.value = t;
    uniforms.uReveal.value = smooth(.11, 2.15, beat);
    grade.uniforms.uTime.value = t;
    BEATS.forEach((delay, i) => {
      const age = beat - delay;
      const shutter = smooth(0, .044, age);
      const strike = shutter * Math.exp(-Math.max(0, age - .045) * 7.4);
      const flicker = .82 + .18 * Math.cos(age * 78) * (1 - smooth(.06, .30, age));
      const power = smooth(.03, .38, age) * (.48 + .052 * Math.cos(t * 1.1 + i));
      uniforms.uFires.value.setComponent(i, strike * flicker);
      uniforms.uSteady.value.setComponent(i, power);
      rig[i].material.uniforms.uLight.value = (strike * .27 + power * .105) * (mobile ? .52 : 1);
      rig[i].material.uniforms.uTime.value = t + i;
      banks[i].scale.setScalar(strike * .9 + power * .18);
      banks[i].visible = !mobile && shutter > 0;
    });
    strips.forEach(({ line, geometry, material, start, end }, i) => {
      const age = beat - COVER_LINE_DELAYS[i] / 1000;
      const progress = smooth(0, .58, age);
      line.visible = progress > 0 && beat < 2.65;
      material.opacity = smooth(0, .09, age) * (1 - smooth(2.04, 2.63, beat)) * .80;
      receiver.copy(start).lerp(end, progress);
      const points = geometry.attributes.position;
      points.setXYZ(0, start.x, start.y, start.z);
      points.setXYZ(1, receiver.x, receiver.y, receiver.z);
      points.needsUpdate = true;
    });
    composer.render();
    if (previous) {
      elapsedTotal += now - previous;
      frames += 1;
      if (frames % 30 === 0) canvas.dataset.fps = (frames * 1000 / elapsedTotal).toFixed(1);
    }
    previous = now;
    frame = requestAnimationFrame(draw);
  }

  function markLoaded() {
    if (stopped || ++loaded !== 2) return;
    size();
    composer.render();
    started = performance.now();
    frame = requestAnimationFrame(draw);
    onReady();
  }
  const resume = () => {
    if (!visible || document.hidden) previous = 0;
    else if (started && !frame) frame = requestAnimationFrame(draw);
  };
  const pointer = (ev: PointerEvent) => {
    if (!fine.matches || ev.pointerType !== 'mouse') return;
    const rect = stage.getBoundingClientRect();
    ptrX = (ev.clientX - rect.left) / rect.width - .5;
    ptrY = (ev.clientY - rect.top) / rect.height - .5;
  };
  const clearPointer = () => { ptrX = 0; ptrY = 0; };
  const loseContext = (ev: Event) => { ev.preventDefault(); onFallback(); };
  const resize = new ResizeObserver(size);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    resume();
  });
  resize.observe(canvas);
  observer.observe(stage);
  stage.addEventListener('pointermove', pointer);
  stage.addEventListener('pointerleave', clearPointer);
  document.addEventListener('visibilitychange', resume);
  canvas.addEventListener('webglcontextlost', loseContext);
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    resize.disconnect();
    stage.removeEventListener('pointermove', pointer);
    stage.removeEventListener('pointerleave', clearPointer);
    document.removeEventListener('visibilitychange', resume);
    canvas.removeEventListener('webglcontextlost', loseContext);
    photo.dispose();
    depth.dispose();
    plate.geometry.dispose();
    plate.material.dispose();
    cone.dispose();
    led.dispose();
    rig.forEach(mesh => mesh.material.dispose());
    banks.forEach(mesh => mesh.material.dispose());
    strips.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
    grade.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
