export const plateVertex = `
  uniform sampler2D uDepth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += texture2D(uDepth, uv).r * .38;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }
`;

export const plateFragment = `
  uniform sampler2D uPhoto;
  uniform float uTime;
  uniform float uReveal;
  uniform float uPhone;
  uniform vec4 uFires;
  uniform vec4 uSteady;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715))));
  }

  vec3 bank(vec2 uv, vec2 lamp, vec2 direction, float blast, float power, float phase) {
    vec2 p = (uv - lamp) * vec2(1.5, 1.);
    float along = dot(direction, p);
    float crossBeam = dot(vec2(-direction.y, direction.x), p);
    float width = .012 + max(0., along) * .38;
    float axial = smoothstep(-.01, .04, along) * (1. - smoothstep(.10, .64, along));
    float shaft = max(0., 1. - abs(crossBeam) / width);
    float layers = .58 + .23 * sin(along * 35. + crossBeam * 22. + phase - uTime * .50)
      + .15 * cos(along * 83. - crossBeam * 42. + phase + uTime * .34);
    float haze = 0.;
    if (axial > 0. && shaft > 0.) {
      vec2 cell = vec2(crossBeam * 88., along * 83. - uTime * .65 + phase);
      vec2 grain = fract(cell) - .5;
      float dust = step(.90, hash(floor(cell))) * (1. - smoothstep(.025, .14, length(grain)));
      haze = axial * shaft * shaft * (layers * .43 + dust * .44);
    }
    float core = exp(-length(p * vec2(168., 126.)));
    float bloom = exp(-length(p * vec2(17., 19.)));
    float streak = exp(-abs(p.x) * 5.0 - abs(p.y) * 270.)
      + .22 * exp(-abs(p.x + p.y * 2.4) * 6. - abs(p.y) * 48.);
    vec2 reflection = (vec2(.5) - lamp) * .82 + .5;
    float ghost = exp(-abs(length((uv - reflection) * vec2(1.5, 1.)) - .031) * 185.) * .04;
    vec3 warm = mix(vec3(.56, .78, .67), vec3(1., .83, .58), phase * .19);
    return warm * ((.67 * power + blast) * haze * mix(1., .52, uPhone)
      + core * (power * .57 + blast * 9.) + bloom * (power * .10 + blast * .43)
      + blast * (streak * .31 + ghost));
  }

  void main() {
    vec2 p = vUv;
    vec3 photo = texture2D(uPhoto, p).rgb;
    float arena = smoothstep(.02, .62, p.y);
    float underexpose = mix(.050, .99, uReveal);
    vec3 colour = photo * underexpose * mix(.76, 1., arena);
    colour += bank(p, vec2(.164, .88),  normalize(vec2(.38, -.93)), uFires.x, uSteady.x, 3.);
    colour += bank(p, vec2(.370, .735), normalize(vec2(.18, -.98)), uFires.y, uSteady.y, 0.);
    colour += bank(p, vec2(.529, .735), normalize(vec2(-.09, -.99)), uFires.z, uSteady.z, 1.);
    colour += bank(p, vec2(.913, .839), normalize(vec2(-.63, -.78)), uFires.w, uSteady.w, 2.);
    gl_FragColor = vec4(colour, 1.);
  }
`;

export const lensPass = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(c, vec3(.2126, .7152, .0722));
      c *= mix(vec3(.77, 1.04, .98), vec3(1.09, 1.01, .88), smoothstep(.04, .69, luma));
      vec2 uv = (vUv - .5) * vec2(1., .84);
      c *= 1. - .47 * smoothstep(.22, .68, length(uv));
      c = clamp((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14), 0., 1.);
      c = pow(c, vec3(.54));
      float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy + floor(uTime * 24.) * 19., vec2(.06711056, .00583715))));
      gl_FragColor = vec4(max(vec3(0.), c + (grain - .5) * .042 * smoothstep(.01, .24, luma)), 1.);
    }
  `,
};
