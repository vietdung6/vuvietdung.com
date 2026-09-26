import * as THREE from 'three';
import { camera } from './scene-core.js';
import { state } from './state.js';
import { cockpitCameraAnchor, cockpitLookAnchor } from './cockpit.js';

export const mouse  = { x: 0, y: 0 };
export const smooth = { x: 0, y: 0 };

export const camPos  = new THREE.Vector3(0, 0.95, -4.85);
export const camLook = new THREE.Vector3(0, 0.62, -14.0);
export const tPos    = new THREE.Vector3(0, 0.95, -4.85);
export const tLook   = new THREE.Vector3(0, 0.62, -14.0);

export const orbit = {
  yaw: 0.35, pitch: 0.18, dist: 52,
  targetYaw: 0.35, targetPitch: 0.18, targetDist: 52
};

/* Pilot-eye camera is anchored to the actual cockpit module. */
const cockpitPos  = new THREE.Vector3();
const cockpitLook = new THREE.Vector3();
const extPos      = new THREE.Vector3();
const extLook     = new THREE.Vector3();

export function updateCamera(dt) {
  smooth.x += (mouse.x - smooth.x) * Math.min(1, dt * 4.2);
  smooth.y += (mouse.y - smooth.y) * Math.min(1, dt * 4.2);

  const targetBlend = state.viewMode === 'exterior' ? 1.0 : 0.0;
  state.viewBlend += (targetBlend - state.viewBlend) * Math.min(1, dt * 2.8);

  cockpitCameraAnchor.getWorldPosition(cockpitPos);
  cockpitLookAnchor.getWorldPosition(cockpitLook);

  /* small head movement, but always relative to the real cabin */
  cockpitPos.x += smooth.x * 0.34;
  cockpitPos.y += smooth.y * 0.18;
  cockpitLook.x += smooth.x * 2.6;
  cockpitLook.y += smooth.y * 1.8;

  orbit.yaw   += (orbit.targetYaw   - orbit.yaw)   * Math.min(1, dt * 5.0);
  orbit.pitch += (orbit.targetPitch - orbit.pitch) * Math.min(1, dt * 5.0);
  orbit.dist  += (orbit.targetDist  - orbit.dist)  * Math.min(1, dt * 5.0);

  const ex = orbit.dist * Math.sin(orbit.yaw) * Math.cos(orbit.pitch);
  const ey = orbit.dist * Math.sin(orbit.pitch);
  const ez = orbit.dist * Math.cos(orbit.yaw) * Math.cos(orbit.pitch);
  extPos.set(ex, ey + 3.5, ez);
  extLook.set(0, 0.8, 0);

  if (state.diveActive) {
    tPos.copy(state.divePos);
    tLook.copy(state.diveLook);
    tPos.x += smooth.x * 0.20;
    tPos.y += smooth.y * 0.14;
  } else {
    tPos.lerpVectors(cockpitPos, extPos, state.viewBlend);
    tLook.lerpVectors(cockpitLook, extLook, state.viewBlend);
  }

  camPos.lerp(tPos, Math.min(1, dt * 3.5));
  camLook.lerp(tLook, Math.min(1, dt * 3.5));
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}