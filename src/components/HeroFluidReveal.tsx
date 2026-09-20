import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HeroFluidRevealProps {
  imageSrc: string;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SIM_FRAG = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform vec2 uResolution;
uniform float uDecay;
uniform float uRadius;
uniform float uSplat;
varying vec2 vUv;

float distToSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));
  float prev = texture2D(uPrev, vUv).r;
  float n = texture2D(uPrev, vUv + vec2(texel.x, 0.0)).r;
  float s = texture2D(uPrev, vUv - vec2(texel.x, 0.0)).r;
  float e = texture2D(uPrev, vUv + vec2(0.0, texel.y)).r;
  float w = texture2D(uPrev, vUv - vec2(0.0, texel.y)).r;
  float diffused = (prev * 2.0 + n + s + e + w) / 6.0;

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(vUv.x * aspect, vUv.y);
  vec2 a = vec2(uPrevMouse.x * aspect, uPrevMouse.y);
  vec2 b = vec2(uMouse.x * aspect, uMouse.y);
  float d = distToSegment(p, a, b);
  float stamp = uSplat * exp(-d * d * uRadius);

  float trail = max(diffused * uDecay, stamp);
  gl_FragColor = vec4(trail, trail, trail, 1.0);
}
`;

const DISPLAY_FRAG = /* glsl */ `
uniform sampler2D uImage;
uniform sampler2D uTrail;
uniform vec2 uPlaneSize;
uniform vec2 uImageSize;
varying vec2 vUv;

vec2 getCoverUv(vec2 uv, vec2 screenRes, vec2 imageRes) {
  float sAspect = screenRes.x / max(screenRes.y, 1.0);
  float iAspect = imageRes.x / max(imageRes.y, 1.0);
  vec2 scale = (sAspect > iAspect) ? vec2(1.0, sAspect / iAspect) : vec2(iAspect / sAspect, 1.0);
  return clamp((uv - 0.5) / scale + 0.5, 0.0, 1.0);
}

void main() {
  vec2 coverUv = getCoverUv(vUv, uPlaneSize, uImageSize);
  vec3 tex = texture2D(uImage, coverUv).rgb;
  float luma = dot(tex, vec3(0.299, 0.587, 0.114));
  vec3 mono = vec3(luma);
  float mask = texture2D(uTrail, vUv).r;
  float mixAmt = smoothstep(0.04, 0.78, mask);
  vec3 color = mix(mono, tex, mixAmt);
  gl_FragColor = vec4(color, 1.0);
}
`;

type FluidApi = {
  load: (url: string) => void;
};

function makeTarget(w: number, h: number) {
  const rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  });
  rt.texture.generateMipmaps = false;
  return rt;
}

function makePlaceholder() {
  const data = new Uint8Array([8, 8, 10, 255]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function sizeOf(tex: THREE.Texture) {
  const img = tex.image as { width?: number; height?: number } | undefined;
  return { w: img?.width ?? 1, h: img?.height ?? 1 };
}

export function HeroFluidReveal({ imageSrc }: HeroFluidRevealProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<FluidApi | null>(null);
  const srcRef = useRef(imageSrc);
  srcRef.current = imageSrc;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    THREE.Cache.enabled = true;
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x08080a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.right = 'auto';
    canvas.style.bottom = 'auto';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'auto';
    canvas.style.touchAction = 'none';
    canvas.style.objectFit = 'cover';
    wrap.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
    wrap.style.willChange = 'transform';
    wrap.appendChild(canvas);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const placeholder = makePlaceholder();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    let imageTex: THREE.Texture = placeholder;
    let imageOwned = false;

    const simUniforms = {
      uPrev: { value: placeholder as THREE.Texture },
      uMouse: { value: new THREE.Vector2(-10, -10) },
      uPrevMouse: { value: new THREE.Vector2(-10, -10) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uDecay: { value: 0.965 },
      uRadius: { value: 42 },
      uSplat: { value: 0 },
    };

    const displayUniforms = {
      uImage: { value: placeholder as THREE.Texture },
      uTrail: { value: placeholder as THREE.Texture },
      uPlaneSize: { value: new THREE.Vector2(1, 1) },
      uImageSize: { value: new THREE.Vector2(1, 1) },
    };

    const simMaterial = new THREE.ShaderMaterial({
      uniforms: simUniforms,
      vertexShader: VERT,
      fragmentShader: SIM_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: displayUniforms,
      vertexShader: VERT,
      fragmentShader: DISPLAY_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(geometry, displayMaterial);
    scene.add(quad);

    let rtA = makeTarget(1, 1);
    let rtB = makeTarget(1, 1);
    let write = rtA;
    let read = rtB;

    const mouse = new THREE.Vector2(-10, -10);
    const prevMouse = new THREE.Vector2(-10, -10);
    let splat = 0;
    let raf = 0;
    let disposed = false;

    const disposeOwned = () => {
      if (imageOwned && imageTex !== placeholder) imageTex.dispose();
      imageOwned = false;
      imageTex = placeholder;
    };

    const assignImage = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      if (imageOwned && imageTex !== placeholder && imageTex !== tex) imageTex.dispose();
      imageTex = tex;
      imageOwned = true;
      const { w, h } = sizeOf(tex);
      displayUniforms.uImage.value = tex;
      displayUniforms.uImageSize.value.set(w, h);
    };

    const load = (url: string) => {
      loader.load(
        url,
        (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          assignImage(tex);
          window.dispatchEvent(new Event('tmrw-hero-ready'));
        },
        undefined,
        () => undefined,
      );
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      displayUniforms.uPlaneSize.value.set(w, h);

      const simW = Math.max(1, Math.floor(w * dpr));
      const simH = Math.max(1, Math.floor(h * dpr));
      rtA.dispose();
      rtB.dispose();
      rtA = makeTarget(simW, simH);
      rtB = makeTarget(simW, simH);
      write = rtA;
      read = rtB;
      simUniforms.uResolution.value.set(simW, simH);
      simUniforms.uPrev.value = read.texture;
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(rtA);
      renderer.clear();
      renderer.setRenderTarget(rtB);
      renderer.clear();
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x08080a, 1);
    };

    const pointerUv = (e: PointerEvent | MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: 1 - (e.clientY - rect.top) / rect.height,
      };
    };

    const applyParallax = (e: PointerEvent | MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      wrap.style.transform = `translate3d(${-nx * 10}px, ${-ny * 10}px, 0)`;
    };

    const onMove = (e: PointerEvent | MouseEvent) => {
      applyParallax(e);
      const uv = pointerUv(e);
      if (!uv) return;
      if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
        splat = 0;
        return;
      }
      mouse.set(uv.x, uv.y);
      splat = 1;
    };

    const onLeave = () => {
      splat = 0;
    };

    const tick = () => {
      simUniforms.uPrev.value = read.texture;
      simUniforms.uMouse.value.copy(mouse);
      simUniforms.uPrevMouse.value.copy(prevMouse);
      simUniforms.uSplat.value = splat;

      quad.material = simMaterial;
      renderer.setRenderTarget(write);
      renderer.clear();
      renderer.render(scene, camera);

      const tmp = read;
      read = write;
      write = tmp;

      displayUniforms.uTrail.value = read.texture;
      quad.material = displayMaterial;
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);

      prevMouse.copy(mouse);
      splat *= 0.72;
      raf = requestAnimationFrame(tick);
    };

    resize();
    load(srcRef.current);
    apiRef.current = { load };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onWindowMove = (e: PointerEvent) => {
      if (!reduced) applyParallax(e);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    wrap.addEventListener('pointermove', onMove, { passive: true });
    wrap.addEventListener('pointerdown', onMove, { passive: true });
    wrap.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointermove', onWindowMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      apiRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerdown', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onWindowMove);
      geometry.dispose();
      simMaterial.dispose();
      displayMaterial.dispose();
      disposeOwned();
      placeholder.dispose();
      rtA.dispose();
      rtB.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (canvas.parentNode === wrap) wrap.removeChild(canvas);
    };
  }, []);

  useEffect(() => {
    apiRef.current?.load(imageSrc);
  }, [imageSrc]);

  return <div ref={wrapRef} className="hero-fluid-reveal" />;
}
