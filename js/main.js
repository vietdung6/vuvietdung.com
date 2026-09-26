import * as THREE from 'three';
import {
  renderer, scene, camera, composer, bloomPass, updateCameraFov
} from './scene-core.js';
import { starUniforms } from './starfield.js';
import { diskUniforms, haloMat, rimGlowMat, diskLensed } from './blackhole.js';
import { cockpit, layoutCockpit, updateCockpit } from './cockpit.js';
import { ship, updateShip } from './ship.js';
import { state, layoutDiveTargets } from './state.js';
import { camPos, camLook, updateCamera } from './camera-control.js';
import { initInteraction } from './interaction.js';
import { initUI, updateVelocityReadout } from './ui.js';
import {
  updateMotion, cruise,
  setMotionPixelRatio, getWarpContribution
} from './motion.js';
import { initProjectPanel } from './project-panel.js';

/* ============================================================
   RESIZE
   ============================================================ */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio, 2);

  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h);
  composer.setPixelRatio(dpr);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);

  starUniforms.uPixelRatio.value = dpr;
  setMotionPixelRatio(dpr);

  updateCameraFov();
  layoutCockpit();
  layoutDiveTargets();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 180));

/* ============================================================
   BOOT
   ============================================================ */
updateCameraFov();
layoutCockpit();
layoutDiveTargets();

camPos.set(0, 0, 0);
camLook.set(0, 0, -100);
camera.position.copy(camPos);
camera.lookAt(camLook);

initInteraction();
initUI();
initProjectPanel();

/* ============================================================
   ANIMATION LOOP
   ============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  /* --- 1. Motion system --- */
  updateMotion(t, dt);

  /* --- 2. Camera (không có shake) --- */
  updateCamera(dt);

  /* --- 3. Ship visibility --- */
  const showShip = state.viewBlend > 0.45;
  ship.visible = showShip;
  cockpit.visible = !showShip;

  /* --- 4. Warp: baseline + dive --- */
  const targetWarp = state.warpAmount + getWarpContribution();
  starUniforms.uWarp.value += (targetWarp - starUniforms.uWarp.value) * Math.min(1, dt * 2.0);

  /* --- 5. Shader time --- */
  diskUniforms.uTime.value = t;
  haloMat.uniforms.uTime.value = t;
  rimGlowMat.uniforms.uTime.value = t;
  starUniforms.uTime.value = t;
  diskLensed.rotation.z = t * 0.012;

  /* --- 6. 3D updates --- */
  updateCockpit(t, dt);
  updateShip(t);

  /* --- 7. HUD --- */
  updateVelocityReadout(cruise.velocity * 3.2);

  /* --- 8. Bloom --- */
  bloomPass.strength = 0.52 + Math.sin(t * 0.7) * 0.03 + starUniforms.uWarp.value * 0.45;

  composer.render();
}

animate();