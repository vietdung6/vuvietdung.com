import * as THREE from 'three';

export const state = {
  viewMode: 'cockpit',   // 'cockpit' | 'exterior'
  viewBlend: 0,          // 0 = cockpit, 1 = exterior (interpolated)
  diveActive: false,
  warpAmount: 0,
  divePos: new THREE.Vector3(),
  diveLook: new THREE.Vector3()
};

export function layoutDiveTargets() {
  state.divePos.set(0, -1.0, -3.5);
  state.diveLook.set(0, -1.6, -9);
}