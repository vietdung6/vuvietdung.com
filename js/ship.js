import * as THREE from 'three';
import { cruise } from './motion.js';
import { scene } from './scene-core.js';
import {
  shipHullMat, shipDarkMat, shipTrimMat, shipGlassMat,
  glowCyanS, glowAmberS, glowRedS, glowGreenS,
  makeEngineGlowTexture
} from './materials.js';

/* ============================================================
   ISV GARGANTUA-7 — "Arrow" class personal recon vessel
   Length 32u, z from -16 to +16
   ============================================================ */
export const ship = new THREE.Group();
ship.visible = false;
scene.add(ship);

const engineGlowMeshes = [];
const enginePlumes     = [];
const plumeMats        = [];
const engineRings      = [];
const engineLights     = [];
const navLights        = [];
const runningLights    = [];

/* ---- Shared ship materials ---- */
const hullMat = new THREE.MeshStandardMaterial({
  color: 0xd0d4d8, roughness: 0.42, metalness: 0.68,
  emissive: 0x080c12, emissiveIntensity: 0.25
});
const hullDarkMat = new THREE.MeshStandardMaterial({
  color: 0x1a222c, roughness: 0.82, metalness: 0.55
});
const hullTrimMat = new THREE.MeshStandardMaterial({
  color: 0xb8c2cc, roughness: 0.20, metalness: 0.95
});
const accentGoldMat = new THREE.MeshBasicMaterial({ color: 0xffb454 });
const accentCyanMat = new THREE.MeshBasicMaterial({ color: 0x5ff2ff });

/* ============================================================
   NOSE  (z = -16 → -10)
   ============================================================ */
(function buildNose() {
  const noseGeo = new THREE.ConeGeometry(2.4, 6, 20);
  noseGeo.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, hullMat);
  nose.position.z = -13;
  nose.scale.set(1.0, 0.82, 1.0);
  ship.add(nose);

  const capGeo = new THREE.SphereGeometry(0.8, 16, 12);
  const cap = new THREE.Mesh(capGeo, hullMat);
  cap.position.z = -16;
  cap.scale.set(1.0, 0.82, 0.6);
  ship.add(cap);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.30, 14, 10),
    accentCyanMat
  );
  dome.position.z = -16.4;
  ship.add(dome);

  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const r = 2.4 * (1 - t) + 0.9 * t;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.035, 6, 24),
      hullTrimMat
    );
    ring.position.z = -10.5 - i * 1.8;
    ring.scale.set(1.0, 0.82, 1.0);
    ship.add(ring);
  }

  [-1, 1].forEach(side => {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 1.4, 6),
      hullTrimMat
    );
    ant.position.set(side * 1.2, 1.0, -12);
    ant.rotation.z = side * 0.35;
    ship.add(ant);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      accentCyanMat
    );
    tip.position.set(side * 1.55, 1.55, -12);
    ship.add(tip);

    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.15, 0.4),
      hullDarkMat
    );
    vent.position.set(side * 1.6, -0.3, -12.5);
    vent.rotation.y = side * 0.3;
    ship.add(vent);
  });
})();

/* ============================================================
   CANOPY SECTION — hull base + 3 windows on top
   z: -10 → -6
   ============================================================ */
/* ============================================================
   CANOPY SECTION — enclosed cockpit block
   z: -10 → -6, matches interior at CY=0.85, CZ=-9.9
   ============================================================ */
/* ============================================================
   CANOPY SECTION — raised cockpit block (Boeing-style)
   Base hull at y=-0.2, Canopy at CY=2.55, CZ=-8.0
   ============================================================ */
(function buildCanopy() {
  const CY = 2.55, CZ = -8.0;

  /* Glass tint đậm cho exterior */
  const glassExteriorMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1520,
    roughness: 0.08,
    metalness: 0.6,
    emissive: 0x0a1a2a,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.88,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
  });

  /* --- HULL BASE (giữ nguyên như cũ) --- */
  const baseGeo = new THREE.CylinderGeometry(2.4, 2.4, 4.0, 20);
  baseGeo.rotateX(Math.PI / 2);
  const baseHull = new THREE.Mesh(baseGeo, hullMat);
  baseHull.position.set(0, -0.2, -8);
  baseHull.scale.set(1.0, 0.82, 1.0);
  ship.add(baseHull);

  /* Panel rings */
  [-9.5, -6.5].forEach(z => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.04, 6, 24),
      hullTrimMat
    );
    ring.position.set(0, -0.2, z);
    ring.scale.set(1.0, 0.82, 1.0);
    ship.add(ring);
  });

  /* Side stripes + vents */
  [-1, 1].forEach(side => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.14, 3.8),
      accentCyanMat
    );
    stripe.position.set(side * 2.4, 0.4, -8);
    ship.add(stripe);

    const stripe2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.10, 3.8),
      accentGoldMat
    );
    stripe2.position.set(side * 2.4, -1.0, -8);
    ship.add(stripe2);

    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.8),
      hullDarkMat
    );
    vent.position.set(side * 2.3, -0.5, -8);
    vent.rotation.y = side * 0.1;
    ship.add(vent);
  });

  /* ============================================================
     NECK — khối nối base hull lên canopy
     Nghiêng nhẹ về trước 5°
     ============================================================ */
  const neckGeo = new THREE.CylinderGeometry(2.0, 2.4, 2.0, 16);
  const neck = new THREE.Mesh(neckGeo, hullMat);
  neck.position.set(0, 1.0, -8.2);
  neck.rotation.x = -0.10;   // nghiêng về trước
  ship.add(neck);

  /* Panel ring trên neck */
  const neckRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.05, 6, 20),
    hullTrimMat
  );
  neckRing.position.set(0, 1.0, -8.2);
  neckRing.rotation.x = Math.PI / 2 - 0.10;
  neckRing.scale.set(1.0, 1.0, 0.85);
  ship.add(neckRing);

  /* 2 accent stripe trên neck */
  [-1, 1].forEach(side => {
    const neckStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.9, 0.06),
      accentCyanMat
    );
    neckStripe.position.set(side * 2.05, 1.0, -8.2);
    neckStripe.rotation.x = -0.10;
    ship.add(neckStripe);
  });

  /* ============================================================
     2 SIDE WALLS của canopy (tường đặc, tạo khối kín)
     ============================================================ */
  [-1, 1].forEach(side => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 2.0, 3.9),
      hullMat
    );
    wall.position.set(side * 3.35, CY - 0.10, CZ + 1.9);
    ship.add(wall);

    const wallInnerGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.9, 3.9),
      accentCyanMat
    );
    wallInnerGlow.position.set(side * 3.12, CY - 0.10, CZ + 1.9);
    ship.add(wallInnerGlow);

    const wallOuterEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.9, 3.9),
      accentGoldMat
    );
    wallOuterEdge.position.set(side * 3.58, CY - 0.10, CZ + 1.9);
    ship.add(wallOuterEdge);
  });

  /* ============================================================
     FRONT TOP FRAME
     ============================================================ */
  const frontTop = new THREE.Mesh(
    new THREE.BoxGeometry(7.0, 0.35, 0.45),
    hullMat
  );
  frontTop.position.set(0, CY + 0.75, CZ - 0.15);
  ship.add(frontTop);

  const frontTopGlow = new THREE.Mesh(
    new THREE.BoxGeometry(7.0, 0.05, 0.08),
    accentCyanMat
  );
  frontTopGlow.position.set(0, CY + 0.75, CZ - 0.38);
  ship.add(frontTopGlow);

  /* ============================================================
     3 GLASS PANELS
     ============================================================ */
  const centerGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.35),
    glassExteriorMat
  );
  centerGlass.position.set(0, CY, CZ);
  ship.add(centerGlass);

  const leftGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.35),
    glassExteriorMat
  );
  leftGlass.position.set(-2.15, CY, CZ + 0.28);
  leftGlass.rotation.y = Math.PI / 8;
  ship.add(leftGlass);

  const rightGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.35),
    glassExteriorMat
  );
  rightGlass.position.set(2.15, CY, CZ + 0.28);
  rightGlass.rotation.y = -Math.PI / 8;
  ship.add(rightGlass);

  /* ============================================================
     2 MULLIONS
     ============================================================ */
  [-1, 1].forEach(side => {
    const mullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 1.62, 0.5),
      hullMat
    );
    mullion.position.set(side * 1.15, CY, CZ + 0.08);
    mullion.rotation.z = side * 0.18;
    ship.add(mullion);

    const mullionGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.55, 0.06),
      accentCyanMat
    );
    mullionGlow.position.set(side * 1.15, CY, CZ + 0.34);
    mullionGlow.rotation.z = side * 0.18;
    ship.add(mullionGlow);
  });

  /* ============================================================
     2 SIDE EDGES
     ============================================================ */
  [-1, 1].forEach(side => {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 1.9, 0.6),
      hullMat
    );
    edge.position.set(side * 3.15, CY - 0.05, CZ + 0.35);
    edge.rotation.z = -side * 0.35;
    ship.add(edge);

    const edgeGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.85, 0.06),
      accentCyanMat
    );
    edgeGlow.position.set(side * 3.15, CY - 0.05, CZ + 0.62);
    edgeGlow.rotation.z = -side * 0.35;
    ship.add(edgeGlow);
  });

  /* ============================================================
     TOP BROW
     ============================================================ */
  const browPts = [
    new THREE.Vector3(-3.5, CY + 0.70, CZ + 0.40),
    new THREE.Vector3(-1.8, CY + 0.78, CZ + 0.02),
    new THREE.Vector3( 0.0, CY + 0.80, CZ - 0.02),
    new THREE.Vector3( 1.8, CY + 0.78, CZ + 0.02),
    new THREE.Vector3( 3.5, CY + 0.70, CZ + 0.40)
  ];
  const browCurve = new THREE.CatmullRomCurve3(browPts);
  const brow = new THREE.Mesh(
    new THREE.TubeGeometry(browCurve, 32, 0.15, 6, false),
    hullMat
  );
  ship.add(brow);

  const browGlow = new THREE.Mesh(
    new THREE.TubeGeometry(browCurve, 32, 0.028, 5, false),
    accentCyanMat
  );
  browGlow.position.z += 0.12;
  ship.add(browGlow);

  /* ============================================================
     BOTTOM SILL
     ============================================================ */
  const sillPts = [
    new THREE.Vector3(-3.5, CY - 0.85, CZ + 0.40),
    new THREE.Vector3(-1.8, CY - 0.88, CZ + 0.02),
    new THREE.Vector3( 0.0, CY - 0.90, CZ - 0.02),
    new THREE.Vector3( 1.8, CY - 0.88, CZ + 0.02),
    new THREE.Vector3( 3.5, CY - 0.85, CZ + 0.40)
  ];
  const sillCurve = new THREE.CatmullRomCurve3(sillPts);
  const sill = new THREE.Mesh(
    new THREE.TubeGeometry(sillCurve, 32, 0.17, 6, false),
    hullMat
  );
  ship.add(sill);

  const sillGlow = new THREE.Mesh(
    new THREE.TubeGeometry(sillCurve, 32, 0.028, 5, false),
    accentGoldMat
  );
  sillGlow.position.z += 0.12;
  ship.add(sillGlow);

  /* ============================================================
     CORNER FILLERS
     ============================================================ */
  [
    { x: -3.30, y: CY + 0.55, z: CZ - 0.1 },
    { x:  3.30, y: CY + 0.55, z: CZ - 0.1 },
    { x: -3.30, y: CY - 0.60, z: CZ - 0.1 },
    { x:  3.30, y: CY - 0.60, z: CZ - 0.1 }
  ].forEach(c => {
    const corner = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.5),
      hullMat
    );
    corner.position.set(c.x, c.y, c.z);
    ship.add(corner);
  });
})();

/* ============================================================
   MID HULL (z = -6 → +4)
   ============================================================ */
(function buildMidHull() {
  const midGeo = new THREE.CylinderGeometry(2.6, 2.6, 10, 20);
  midGeo.rotateX(Math.PI / 2);
  const mid = new THREE.Mesh(midGeo, hullMat);
  mid.position.z = -1;
  mid.scale.set(1.0, 0.82, 1.0);
  ship.add(mid);

  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.03, 6, 24),
      hullTrimMat
    );
    ring.position.z = -4 + i * 2.8;
    ring.scale.set(1.0, 0.82, 1.0);
    ship.add(ring);
  }

  [-1, 1].forEach(side => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.20, 10),
      accentCyanMat
    );
    stripe.position.set(side * 2.6, 1.0, -1);
    ship.add(stripe);

    const stripe2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.14, 10),
      accentGoldMat
    );
    stripe2.position.set(side * 2.6, -0.9, -1);
    ship.add(stripe2);

    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.9),
        hullDarkMat
      );
      vent.position.set(side * 2.5, -0.6, -4 + i * 3);
      vent.rotation.y = side * 0.1;
      ship.add(vent);
    }
  });

  for (let i = 0; i < 4; i++) {
    const bump = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      hullDarkMat
    );
    bump.position.set(0, 2.2, -4 + i * 2.5);
    ship.add(bump);
  }
})();

/* ============================================================
   TAIL  (z = +4 → +10)
   ============================================================ */
(function buildTail() {
  const tailGeo = new THREE.CylinderGeometry(2.6, 2.2, 6, 20);
  tailGeo.rotateX(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, hullMat);
  tail.position.z = 7;
  tail.scale.set(1.0, 0.82, 1.0);
  ship.add(tail);

  const tailRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.06, 6, 24),
    hullTrimMat
  );
  tailRing.position.z = 4.5;
  tailRing.scale.set(1.0, 0.82, 1.0);
  ship.add(tailRing);

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.35, 6),
    hullTrimMat
  );
  spine.position.set(0, 2.0, 7);
  ship.add(spine);

  const spineEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 6),
    accentCyanMat
  );
  spineEdge.position.set(0, 2.2, 7);
  ship.add(spineEdge);
})();

/* ============================================================
   WINGS — swept back 33°, length 9u
   ============================================================ */
function buildWing(side) {
  const wing = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(0, 2.2);
  shape.lineTo(8.5, -1.5);
  shape.lineTo(9.2, -2.8);
  shape.lineTo(8.0, -3.4);
  shape.lineTo(0.5, -3.2);
  shape.lineTo(0, -2.5);
  shape.lineTo(0, 2.2);

  const wingGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.06,
    bevelSegments: 2
  });
  wingGeo.rotateX(-Math.PI / 2);
  wing.add(new THREE.Mesh(wingGeo, hullMat));

  const leGlow = new THREE.Mesh(
    new THREE.BoxGeometry(8.7, 0.04, 0.06),
    accentCyanMat
  );
  leGlow.position.set(4.3, 0.16, 0.35);
  leGlow.rotation.y = -0.42;
  wing.add(leGlow);

  for (let i = 0; i < 3; i++) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.03, 0.04),
      hullDarkMat
    );
    panel.position.set(4.2, 0.15, -0.4 - i * 0.9);
    panel.rotation.y = -0.42;
    wing.add(panel);
  }

  const teStrip = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.05, 0.5),
    hullDarkMat
  );
  teStrip.position.set(4.0, 0.14, -2.7);
  teStrip.rotation.y = -0.42;
  wing.add(teStrip);

  const pod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 1.8, 12),
    hullDarkMat
  );
  pod.rotation.z = Math.PI / 2;
  pod.position.set(8.6, 0.05, -2.4);
  wing.add(pod);

  const podRingA = new THREE.Mesh(
    new THREE.TorusGeometry(0.30, 0.035, 6, 14),
    hullTrimMat
  );
  podRingA.rotation.y = Math.PI / 2;
  podRingA.position.set(8.0, 0.05, -2.4);
  wing.add(podRingA);

  const podTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    accentGoldMat
  );
  podTip.position.set(9.6, 0.05, -2.4);
  wing.add(podTip);

  const nav = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    side > 0 ? glowGreenS : glowRedS
  );
  nav.position.set(9.0, 0.5, -2.4);
  wing.add(nav);
  navLights.push(nav);

  if (side < 0) wing.scale.x = -1;
  return wing;
}
const wingL = buildWing(-1);
wingL.position.set(-2.5, -0.3, 0);
ship.add(wingL);

const wingR = buildWing(1);
wingR.position.set(2.5, -0.3, 0);
ship.add(wingR);

/* ============================================================
   TAIL FIN
   ============================================================ */
(function buildTailFin() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 3.0);
  shape.lineTo(0.9, 3.4);
  shape.lineTo(2.6, 1.4);
  shape.lineTo(3.0, -0.6);
  shape.lineTo(2.4, -1.4);
  shape.lineTo(0, -1.4);
  shape.lineTo(0, 0);

  const finGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.30,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 2
  });
  const fin = new THREE.Mesh(finGeo, hullMat);
  fin.rotation.y = Math.PI / 2;
  fin.position.set(0, 2.2, 9);
  ship.add(fin);

  const finEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 4.6, 0.32),
    accentCyanMat
  );
  finEdge.position.set(0, 4.5, 8.9);
  finEdge.rotation.x = -0.30;
  ship.add(finEdge);

  const finTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 6),
    accentGoldMat
  );
  finTip.position.set(0, 6.7, 8.0);
  ship.add(finTip);

  [-1, 1].forEach(side => {
    const hStab = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.16, 1.8),
      hullMat
    );
    hStab.position.set(side * 2.2, 2.0, 8);
    hStab.rotation.z = side * 0.08;
    ship.add(hStab);

    const hStabEdge = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.05, 0.06),
      accentCyanMat
    );
    hStabEdge.position.set(side * 2.2, 2.1, 7.1);
    ship.add(hStabEdge);

    const hStabTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 6, 6),
      accentGoldMat
    );
    hStabTip.position.set(side * 3.6, 2.0, 8);
    ship.add(hStabTip);
  });
})();

/* ============================================================
   EXHAUST PLUME
   ============================================================ */
function makePlumeMaterial(seed, intensity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uSeed:      { value: seed },
      uIntensity: { value: intensity }
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vP;
      void main() {
        vP = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vH = uv.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform float uSeed; uniform float uIntensity;
      varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vP;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise3(vec3 x){
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
              mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
              mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p){ float v = 0.0, a = 0.55; for (int i = 0; i < 3; i++) { v += a * noise3(p); p *= 2.07; a *= 0.5; } return v; }
      void main(){
        float h = clamp(vH, 0.0, 1.0);
        float axial = 1.0 - h;
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float body = pow(facing, 0.85);
        float n = fbm(vec3(vP.x * 2.1, vP.y * 2.1, h * 4.5 - uTime * 2.6 + uSeed * 6.28));
        float turb = 0.60 + 0.66 * n;
        float dens = pow(axial, 1.85) * body * turb * uIntensity;
        dens *= 0.94 + 0.06 * sin(uTime * 11.0 + uSeed * 6.28);
        vec3 cCore = vec3(0.94, 0.99, 1.00);
        vec3 cMid  = vec3(1.00, 0.58, 0.20);
        vec3 cTail = vec3(0.40, 0.08, 0.02);
        vec3 col = mix(cCore, cMid,  smoothstep(0.02, 0.32, h));
        col      = mix(col,  cTail, smoothstep(0.32, 0.95, h));
        col *= 0.40 + 1.95 * pow(axial, 2.0);
        gl_FragColor = vec4(col * dens, 1.0);
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
}

function makePlume(radiusStart, radiusEnd, length, seed, intensity) {
  const geo = new THREE.CylinderGeometry(radiusEnd, radiusStart, length, 28, 12, true);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, length / 2);
  const mat = makePlumeMaterial(seed, intensity);
  plumeMats.push(mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

/* ============================================================
   ENGINE — 1 main + 2 vernier
   ============================================================ */
(function buildEngines() {
  const engineGlowTex = makeEngineGlowTexture();

  /* MAIN ENGINE */
  const mainHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.4, 3.5, 20),
    hullDarkMat
  );
  mainHousing.rotation.x = Math.PI / 2;
  mainHousing.position.z = 11.5;
  ship.add(mainHousing);

  for (let r = 0; r < 2; r++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2 + r * 0.15, 0.09, 8, 24),
      hullTrimMat
    );
    ring.position.z = 10 + r * 3;
    ship.add(ring);
    engineRings.push(ring);
  }

  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(2.3, 0.05, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffb454, transparent: true, opacity: 0.9 })
  );
  stripe.position.z = 11.5;
  ship.add(stripe);

  const nozzleInner = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 24),
    glowAmberS.clone()
  );
  nozzleInner.material.transparent = true;
  nozzleInner.material.opacity = 1.0;
  nozzleInner.position.z = 13.3;
  ship.add(nozzleInner);
  engineGlowMeshes.push(nozzleInner);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.55, 26),
    new THREE.MeshBasicMaterial({
      color: 0xffd070, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
  );
  outerRing.position.z = 13.4;
  ship.add(outerRing);

  const flare = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({
      map: engineGlowTex, color: 0xffb070,
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.55
    })
  );
  flare.position.z = 14;
  ship.add(flare);
  engineGlowMeshes.push(flare);

  const core = makePlume(1.9, 3.2, 8.0, 0.11, 1.30);
  core.position.z = 13.3;
  ship.add(core);
  enginePlumes.push({ mesh: core, s: 1.0 });

  const outer = makePlume(2.1, 7.0, 22.0, 0.63, 0.62);
  outer.position.z = 13.3;
  ship.add(outer);
  enginePlumes.push({ mesh: outer, s: 1.0 });

  const eLight = new THREE.PointLight(0xff8030, 24, 38, 2);
  eLight.position.set(0, 0, 15);
  ship.add(eLight);
  engineLights.push({ light: eLight, base: 24, s: 1.0 });

  /* 2 VERNIER THRUSTERS */
  [-1, 1].forEach(side => {
    const vHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 1.6, 12),
      hullDarkMat
    );
    vHousing.rotation.x = Math.PI / 2;
    vHousing.position.set(side * 1.8, -0.2, 10.5);
    ship.add(vHousing);

    const vRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 6, 14),
      hullTrimMat
    );
    vRing.position.set(side * 1.8, -0.2, 11.2);
    ship.add(vRing);

    const vNozzle = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      glowAmberS.clone()
    );
    vNozzle.material.transparent = true;
    vNozzle.material.opacity = 1.0;
    vNozzle.position.set(side * 1.8, -0.2, 11.3);
    ship.add(vNozzle);
    engineGlowMeshes.push(vNozzle);

    const vCore = makePlume(0.42, 1.0, 3.5, 0.5 + side * 0.3, 0.85);
    vCore.position.set(side * 1.8, -0.2, 11.3);
    ship.add(vCore);
    enginePlumes.push({ mesh: vCore, s: 0.55 });

    const vLight = new THREE.PointLight(0xff8030, 5, 12, 2);
    vLight.position.set(side * 1.8, -0.2, 12);
    ship.add(vLight);
    engineLights.push({ light: vLight, base: 5, s: 0.55 });
  });
})();

/* ============================================================
   HULL DETAILS
   ============================================================ */
(function buildDetails() {
  [[-2.2, 0.8, -4], [2.2, 0.8, -4], [-2.2, 0.8, 2], [2.2, 0.8, 2]].forEach(([x, y, z], i) => {
    const rl = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      i % 2 === 0 ? glowGreenS : glowRedS
    );
    rl.position.set(x, y, z);
    ship.add(rl);
    runningLights.push(rl);
  });

  for (let i = 0; i < 3; i++) {
    const hatch = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.03, 0.6),
      hullDarkMat
    );
    hatch.position.set(1.8, 1.2, -2 + i * 2.5);
    ship.add(hatch);
  }

  [[-2.4, -0.5, -5], [2.4, -0.5, -5], [-2.4, -0.5, 3], [2.4, -0.5, 3]].forEach(([x, y, z]) => {
    const port = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 0.2, 8),
      hullDarkMat
    );
    port.rotation.z = Math.PI / 2;
    port.position.set(x, y, z);
    ship.add(port);
  });
})();

/* ============================================================
   UPDATE
   ============================================================ */
export function updateShip(t) {
  ship.position.y = Math.sin(t * 0.5)  * 0.4;
  ship.rotation.x = Math.cos(t * 0.42) * 0.010;
  ship.rotation.z = Math.sin(t * 0.35) * 0.015;

  plumeMats.forEach(m => { m.uniforms.uTime.value = t; });

  const thrustBoost = 1 + cruise.velocity * 0.35;
  const widthBoost  = 1 + cruise.velocity * 0.20;

  enginePlumes.forEach((p, i) => {
    const along = (1.0 + Math.sin(t * 5.6 + i * 1.1) * 0.055) * thrustBoost;
    const wide  = (1.0 + Math.sin(t * 4.1 + i * 0.8) * 0.045) * widthBoost;
    p.mesh.scale.set(wide, wide, along);
  });

  engineGlowMeshes.forEach((g, i) => {
    g.material.opacity = 0.72 + Math.sin(t * 7.5 + i * 1.3) * 0.16 + cruise.velocity * 0.15;
  });

  engineRings.forEach((r, i) => {
    r.scale.setScalar(1 + Math.sin(t * 6 + i) * 0.03 * (1 + cruise.velocity));
  });

  engineLights.forEach((e, i) => {
    const flicker = 0.85 + Math.sin(t * 8.5 + i * 2.1) * 0.12 + Math.sin(t * 21.0 + i) * 0.05;
    e.light.intensity = e.base * flicker * (1 + cruise.velocity * 0.35);
  });

  navLights.forEach((n, i)     => { n.visible = Math.sin(t * 3.2 + i * Math.PI) > 0; });
  runningLights.forEach((r, i) => { r.visible = Math.sin(t * 2.6 + i * 1.4)  > -0.2; });
}