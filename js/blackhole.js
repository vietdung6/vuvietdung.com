import * as THREE from 'three';
import { scene } from './scene-core.js';

export const bhGroup = new THREE.Group();
bhGroup.position.set(0, -8, -360);
bhGroup.scale.setScalar(38);
scene.add(bhGroup);

bhGroup.add(new THREE.Mesh(
  new THREE.SphereGeometry(1, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
));

export const rimGlowMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float f = 1.0 - abs(dot(vNormal, vViewDir));
      f = pow(f, 3.2);
      vec3 warm = vec3(1.0, 0.52, 0.16);
      vec3 hot = vec3(1.0, 0.96, 0.88);
      vec3 col = mix(warm, hot, pow(f, 2.0));
      gl_FragColor = vec4(col, f * 0.75);
    }
  `,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
});
bhGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.07, 48, 48), rimGlowMat));

export const diskUniforms = { uTime: { value: 0 } };

const DISK_VERT = `varying vec3 vLocal; void main(){ vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DISK_FRAG = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  varying vec3 vLocal;
  float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0 - 2.0*f); return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0; i<5; i++){ v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
  void main(){
    float r = length(vLocal.xy);
    float ang = atan(vLocal.y, vLocal.x);
    float rn = clamp((r - 1.5) / 4.1, 0.0, 1.0);
    float shear = ang + uTime * 0.95 / pow(max(r, 0.001), 1.5);
    vec2 sp = vec2(cos(shear), sin(shear)) * r;
    float n = fbm(sp * 1.05 + vec2(uTime * 0.05, uSeed));
    float streak = fbm(vec2(r * 4.2 - uTime * 0.55, ang * 3.0 + uSeed));
    float density = 0.42 + 0.95 * n * (0.5 + 0.5 * streak);
    float inner = smoothstep(0.0, 0.10, rn);
    float outer = 1.0 - smoothstep(0.34, 1.0, rn);
    float shape = inner * outer;
    float dop = 0.58 + 0.85 * smoothstep(-1.0, 1.0, cos(ang - 1.15));
    float glow = shape * density * dop * 1.95;
    vec3 cHot = vec3(1.00, 0.97, 0.92);
    vec3 cMid = vec3(1.00, 0.62, 0.22);
    vec3 cCool = vec3(0.80, 0.17, 0.05);
    vec3 col = mix(cHot, cMid, smoothstep(0.00, 0.28, rn));
    col = mix(col, cCool, smoothstep(0.28, 0.95, rn));
    gl_FragColor = vec4(col, clamp(glow, 0.0, 1.0) * uOpacity * 0.85);
  }
`;

const diskMain = new THREE.Mesh(
  new THREE.RingGeometry(1.5, 5.6, 180, 1),
  new THREE.ShaderMaterial({
    uniforms: { uTime: diskUniforms.uTime, uOpacity: { value: 1.0 }, uSeed: { value: 0.0 } },
    vertexShader: DISK_VERT, fragmentShader: DISK_FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  })
);
diskMain.rotation.x = -Math.PI / 2 + 0.23;
bhGroup.add(diskMain);

export const diskLensed = new THREE.Mesh(
  new THREE.RingGeometry(1.5, 4.4, 180, 1),
  new THREE.ShaderMaterial({
    uniforms: { uTime: diskUniforms.uTime, uOpacity: { value: 0.38 }, uSeed: { value: 37.4 } },
    vertexShader: DISK_VERT, fragmentShader: DISK_FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  })
);
bhGroup.add(diskLensed);

export const haloMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec2 p = (vUv - 0.5) * 2.0;
      float d = length(p);
      float ring = exp(-pow((d - 0.300) / 0.017, 2.0));
      float halo = exp(-pow((d - 0.340) / 0.105, 2.0)) * 0.55;
      float inner = exp(-pow(d / 0.300, 2.0)) * 0.10;
      float a = ring * 1.85 + halo + inner;
      vec3 col = mix(vec3(1.0, 0.84, 0.60), vec3(1.0, 0.40, 0.11), smoothstep(0.28, 0.55, d));
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
    }
  `,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
});
bhGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(8, 8), haloMat));