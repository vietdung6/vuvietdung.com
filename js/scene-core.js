import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';

export const canvas = document.getElementById('scene-canvas');

export const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance', alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.84;
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01020a);

export const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 8000);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -100);
scene.add(camera);

/* ---- Post-processing ---- */
export const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

export const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.52, 0.48, 0.90
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ---- Lights ---- */
scene.add(new THREE.AmbientLight(0x24384a, 0.30));

const hemi = new THREE.HemisphereLight(0x3a7bb0, 0x050810, 0.48);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xa8d8ff, 2.2);
keyLight.position.set(8, 12, 6);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x5fb4ff, 1.6);
rimLight.position.set(-10, 6, -14);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xff8844, 0.55);
fillLight.position.set(-4, -10, -4);
scene.add(fillLight);

const bhRimLight = new THREE.PointLight(0xff8833, 90, 240, 2);
bhRimLight.position.set(0, -10, -80);
scene.add(bhRimLight);

/* Cockpit local lights */
const bridgeKey   = new THREE.PointLight(0x77e8ff, 22, 18, 2.0); bridgeKey.position.set(0, 2.0, -5);   scene.add(bridgeKey);
const bridgeWarm  = new THREE.PointLight(0xff9a3a, 16, 16, 2.0); bridgeWarm.position.set(-5, -1.0, -5); scene.add(bridgeWarm);
const bridgeCool  = new THREE.PointLight(0x3a8aff, 14, 16, 2.0); bridgeCool.position.set(5, -1.0, -5);  scene.add(bridgeCool);
const bridgeFloor = new THREE.PointLight(0x1a5f8a, 12, 22, 2.0); bridgeFloor.position.set(0, -6.0, -3); scene.add(bridgeFloor);
const bridgeAmber = new THREE.PointLight(0xffb454, 10, 12, 2.0); bridgeAmber.position.set(0, 2.5, -2);  scene.add(bridgeAmber);

/* ---- Helpers ---- */
export function updateCameraFov() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  const hFov = THREE.MathUtils.degToRad(88);
  const fovRad = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(fovRad), 52, 84);
  camera.updateProjectionMatrix();
}