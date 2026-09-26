import * as THREE from 'three';
import { camera } from './scene-core.js';
import { state, layoutDiveTargets } from './state.js';
import { Sound } from './audio.js';
import { emit, on } from './events.js';
import {
  interactiveObjects, stickMeshes, setProjectScreenHighlight
} from './cockpit.js';
import { mouse, orbit } from './camera-control.js';
import {
  openProjectPanel, closeProjectPanel, isProjectPanelOpen
} from './project-panel.js';

let isOrbitDragging = false;
let activeStick = null;
const stickPointer = { x: 0, y: 0 };
const prevPointer  = { x: 0, y: 0 };

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

export function setView(mode) {
  if (mode === state.viewMode) return;
  if (state.diveActive) deployProjects();

  state.viewMode = mode;
  Sound.whoosh();

  const btn = document.getElementById('btn-view');
  btn.textContent = mode === 'cockpit' ? '◉ EXTERIOR VIEW  [C]' : '◉ BRIDGE VIEW  [C]';

  const hero = document.getElementById('hero-banner');
  if (mode === 'exterior') hero.classList.add('faded');
  else hero.classList.remove('faded');
}

export function deployProjects() {
  if (isProjectPanelOpen()) {
    closeProjectPanel();
    document.getElementById('btn-projects').textContent = '▶ DEPLOY PROJECTS';
    return;
  }
  openProjectPanel();
  document.getElementById('btn-projects').textContent = '◀ CLOSE ARCHIVE';
}

export function initInteraction() {
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  on('deploy-projects', deployProjects);
  on('toggle-view', () => setView(state.viewMode === 'cockpit' ? 'exterior' : 'cockpit'));
}

function onPointerMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);

  if (activeStick) {
    const dx = e.clientX - stickPointer.x;
    const dy = e.clientY - stickPointer.y;
    stickPointer.x = e.clientX;
    stickPointer.y = e.clientY;

    if (activeStick.type === 'throttle') {
      activeStick.tx = THREE.MathUtils.clamp(activeStick.tx - dy * 0.015, -0.42, 0.42);
    } else {
      activeStick.tx = THREE.MathUtils.clamp(activeStick.tx - dy * 0.012, -0.42, 0.42);
      activeStick.tz = THREE.MathUtils.clamp(activeStick.tz - dx * 0.012, -0.42, 0.42);
    }
    return;
  }

  if (isOrbitDragging && state.viewMode === 'exterior') {
    const dx = e.clientX - prevPointer.x;
    const dy = e.clientY - prevPointer.y;
    orbit.targetYaw   -= dx * 0.006;
    orbit.targetPitch += dy * 0.005;
    orbit.targetPitch = THREE.MathUtils.clamp(orbit.targetPitch, -0.35, 1.15);
    prevPointer.x = e.clientX;
    prevPointer.y = e.clientY;
  }
}

function onPointerDown(e) {
  if (isProjectPanelOpen()) return;

  prevPointer.x = e.clientX;
  prevPointer.y = e.clientY;

  if (state.viewMode === 'exterior' && !e.target.closest('button, a, .modal')) {
    isOrbitDragging = true;
  }

  if (e.target.closest('button, a, .modal')) return;

  ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
  ndc.y = -((e.clientY / window.innerHeight) * 2 - 1);

  if (state.viewMode === 'cockpit' && !state.diveActive) {
    raycaster.setFromCamera(ndc, camera);

    const stickHits = raycaster.intersectObjects(stickMeshes, false);
    if (stickHits.length > 0) {
      activeStick = stickHits[0].object.userData.stick;
      stickPointer.x = e.clientX;
      stickPointer.y = e.clientY;
      Sound.servo();
      return;
    }

    const hits = raycaster.intersectObjects(interactiveObjects, false);
    if (hits.length > 0) {
      const obj = hits[0].object;
      if (obj.userData && obj.userData.onClick) obj.userData.onClick();
    }
  }
}

function onPointerUp() {
  isOrbitDragging = false;
  if (activeStick) {
    activeStick.tx = 0;
    activeStick.tz = 0;
    Sound.toggle();
    activeStick = null;
  }
}

function onPointerCancel() {
  isOrbitDragging = false;
  if (activeStick) {
    activeStick.tx = 0;
    activeStick.tz = 0;
    activeStick = null;
  }
}

function onWheel(e) {
  if (state.viewMode === 'exterior') {
    orbit.targetDist += e.deltaY * 0.04;
    orbit.targetDist = THREE.MathUtils.clamp(orbit.targetDist, 22, 100);
  }
}

function onKeyDown(e) {
  if (isProjectPanelOpen()) return;

  const k = e.key.toLowerCase();
  if (k === 'c') setView(state.viewMode === 'cockpit' ? 'exterior' : 'cockpit');
  if (e.key === 'Escape') emit('close-modal');
}