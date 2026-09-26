import * as THREE from 'three';
import { scene } from './scene-core.js';

export const starUniforms = {
  uTime:       { value: 0 },
  uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  uWarp:       { value: 0.0 }
};

(function buildStarfield() {
  const COUNT = 3600;
  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);
  const sizes     = new Float32Array(COUNT);
  const col = new THREE.Color();

  for (let i = 0; i < COUNT; i++) {
    const r = 900 + Math.random() * 1500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    if (Math.random() > 0.86) {
      col.setHSL(0.07 + Math.random() * 0.05, 0.65, 0.72);
    } else {
      col.setHSL(0.56 + (Math.random() - 0.5) * 0.12, 0.45 * Math.random(), 0.72 + Math.random() * 0.26);
    }
    colors[i * 3]     = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = 1.0 + Math.pow(Math.random(), 3.0) * 3.4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uWarp;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = aColor;
        vec3 p = position;
        p.z = mod(p.z + uWarp * 420.0 * uTime, 3000.0) - 1500.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.72 + 0.28 * sin(uTime * 1.7 + position.x * 0.013 + position.y * 0.021);
        vTwinkle = tw;
        float stretch = 1.0 + uWarp * 3.5;
        gl_PointSize = (aSize * stretch) * uPixelRatio * (620.0 / max(-mv.z, 1.0)) * tw;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float a = smoothstep(0.5, 0.0, d);
        a = pow(a, 2.2);
        gl_FragColor = vec4(vColor * vTwinkle * 1.3, a);
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });

  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  scene.add(stars);
})();