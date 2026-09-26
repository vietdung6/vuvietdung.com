import * as THREE from 'three';
import { scene } from './scene-core.js';
import { state } from './state.js';

/* ============================================================
   CRUISE STATE
   ============================================================ */
export const cruise = {
  velocity: 0.28,        // vận tốc hiện tại
  target: 0.28,          // vận tốc mục tiêu
  boostFromDive: 0.55,   // cộng thêm khi dive
  baseCruise: 0.28,
};

/* ============================================================
   SPEED DUST — hạt bụi sao bay vụt qua
   ============================================================ */
const dustUniforms = {
  uTime:       { value: 0 },
  uVelocity:   { value: 0 },
  uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
};

(function buildSpeedDust() {
  const COUNT = 1100;
  const positions = new Float32Array(COUNT * 3);
  const speeds    = new Float32Array(COUNT);
  const sizes     = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 260;
    positions[i * 3 + 2] = -Math.random() * 900 + 20;
    speeds[i] = 0.5 + Math.random() * 2.2;
    sizes[i]  = 0.6 + Math.random() * 1.6;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSpeed',   new THREE.BufferAttribute(speeds, 1));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: dustUniforms,
    vertexShader: `
      attribute float aSpeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uVelocity;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float travel = uVelocity * aSpeed * 260.0 * uTime;
        p.z = mod(p.z + travel + 900.0, 1000.0) - 900.0;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;

        vAlpha = smoothstep(900.0, 120.0, dist) * smoothstep(-5.0, 30.0, dist);
        gl_PointSize = aSize * uPixelRatio * (140.0 / max(dist, 1.0));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        p.x *= 3.0;
        float d = length(p);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.72, 0.88, 1.0), a * vAlpha * 0.65);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const dust = new THREE.Points(geo, mat);
  dust.frustumCulled = false;
  scene.add(dust);
})();

/* ============================================================
   UPDATE — gọi mỗi frame
   ============================================================ */
export function updateMotion(t, dt) {
  cruise.target = cruise.baseCruise + (state.diveActive ? cruise.boostFromDive : 0);
  cruise.velocity += (cruise.target - cruise.velocity) * Math.min(1, dt * 1.6);

  dustUniforms.uTime.value = t;
  dustUniforms.uVelocity.value = cruise.velocity;
}

export function setMotionPixelRatio(dpr) {
  dustUniforms.uPixelRatio.value = dpr;
}

/* Đóng góp vào starfield uWarp → sao kéo dài khi bay */
export function getWarpContribution() {
  return cruise.velocity * 0.42;
}