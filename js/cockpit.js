import * as THREE from 'three';
import { scene, camera } from './scene-core.js';
import {
  MAT_HULL, MAT_DARK, MAT_TRIM, MAT_PANEL, MAT_RUBBER, MAT_METAL,
  MAT_CYAN, MAT_AMBER, MAT_RED,
  MAT_EDGE_CYAN, MAT_EDGE_AMBER,
  shipHullMat, shipDarkMat, shipTrimMat,
  glowCyanS, glowAmberS, glowRedS, glowGreenS,
  makeGrilleTexture, makeGaugeTexture, makeLEDStripTexture
} from './materials.js';
import { PROJECT_SCREEN_LINES } from './config.js';
import { Sound } from './audio.js';
import { emit } from './events.js';

/* ============================================================
   COCKPIT — Interior of ISV GARGANTUA-7
   Camera at (0, 1.0, -5)
   Canopy windows at z = -9.9, matching ship.js
   ============================================================ */
export const cockpit = new THREE.Group();
/* Added to the real ship by main.js; no standalone scene copy. */

export const interactiveObjects = [];
export const bowLights = [];
export const sticks = [];
export const stickMeshes = [];

/* Camera anchors live inside the same cockpit geometry.
   The camera-control module reads their world positions every frame,
   so the interior view cannot drift away from the physical cabin. */
export const cockpitCameraAnchor = new THREE.Object3D();
cockpitCameraAnchor.position.set(0, 0.95, -4.85);
cockpit.add(cockpitCameraAnchor);

export const cockpitLookAnchor = new THREE.Object3D();
cockpitLookAnchor.position.set(0, 0.62, -14.0);
cockpit.add(cockpitLookAnchor);

/* ============================================================
   CANOPY FRAME — matches ship.js EXACTLY
   ============================================================ */
const canopyGroup = new THREE.Group();
cockpit.add(canopyGroup);
/* The exterior ship owns the real canopy frame/glass now.
   Keep this legacy geometry disabled to avoid duplicate/z-fighting panes. */
canopyGroup.visible = false;

const CY = 0.85, CZ = -9.9;

/* --- 2 MULLIONS (nghiêng 10° inward) --- */
[-1, 1].forEach(side => {
  const mullion = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 1.5, 0.32),
    MAT_TRIM
  );
  mullion.position.set(side * 1.15, CY, CZ + 0.05);
  mullion.rotation.z = side * 0.18;
  canopyGroup.add(mullion);

  const mullionGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 1.45, 0.05),
    MAT_EDGE_CYAN
  );
  mullionGlow.position.set(side * 1.15, CY, CZ + 0.20);
  mullionGlow.rotation.z = side * 0.18;
  canopyGroup.add(mullionGlow);
});

/* --- 2 SIDE EDGES (nghiêng 20° outward) --- */
[-1, 1].forEach(side => {
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 1.75, 0.36),
    MAT_TRIM
  );
  edge.position.set(side * 3.20, CY - 0.05, CZ + 0.35);
  edge.rotation.z = -side * 0.35;
  canopyGroup.add(edge);

  const edgeGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 1.7, 0.06),
    MAT_EDGE_CYAN
  );
  edgeGlow.position.set(side * 3.20, CY - 0.05, CZ + 0.55);
  edgeGlow.rotation.z = -side * 0.35;
  canopyGroup.add(edgeGlow);
});

/* --- TOP BROW --- */
const browPts = [
  new THREE.Vector3(-3.5, CY + 0.70, CZ + 0.40),
  new THREE.Vector3(-1.8, CY + 0.78, CZ + 0.02),
  new THREE.Vector3( 0.0, CY + 0.80, CZ - 0.02),
  new THREE.Vector3( 1.8, CY + 0.78, CZ + 0.02),
  new THREE.Vector3( 3.5, CY + 0.70, CZ + 0.40)
];
const browCurve = new THREE.CatmullRomCurve3(browPts);
const browMesh = new THREE.Mesh(
  new THREE.TubeGeometry(browCurve, 32, 0.075, 6, false),
  MAT_TRIM
);
canopyGroup.add(browMesh);

const browGlow = new THREE.Mesh(
  new THREE.TubeGeometry(browCurve, 32, 0.022, 5, false),
  MAT_EDGE_CYAN
);
browGlow.position.z += 0.05;
canopyGroup.add(browGlow);

/* --- BOTTOM SILL --- */
const sillPts = [
  new THREE.Vector3(-3.5, CY - 0.85, CZ + 0.40),
  new THREE.Vector3(-1.8, CY - 0.88, CZ + 0.02),
  new THREE.Vector3( 0.0, CY - 0.90, CZ - 0.02),
  new THREE.Vector3( 1.8, CY - 0.88, CZ + 0.02),
  new THREE.Vector3( 3.5, CY - 0.85, CZ + 0.40)
];
const sillCurve = new THREE.CatmullRomCurve3(sillPts);
const sillMesh = new THREE.Mesh(
  new THREE.TubeGeometry(sillCurve, 32, 0.085, 6, false),
  MAT_HULL
);
canopyGroup.add(sillMesh);

const sillGlow = new THREE.Mesh(
  new THREE.TubeGeometry(sillCurve, 32, 0.022, 5, false),
  MAT_EDGE_AMBER
);
sillGlow.position.z += 0.05;
canopyGroup.add(sillGlow);

/* --- WINDSHIELD GLASS: actual panes, not only the frame --- */
const centerWindshield = new THREE.Mesh(
  new THREE.PlaneGeometry(2.18, 1.38),
  cockpitGlassMat
);
centerWindshield.position.set(0, CY, CZ + 0.18);
canopyGroup.add(centerWindshield);

const leftWindshield = new THREE.Mesh(
  new THREE.PlaneGeometry(2.18, 1.38),
  cockpitGlassMat
);
leftWindshield.position.set(-2.15, CY, CZ + 0.43);
leftWindshield.rotation.y = Math.PI / 8;
canopyGroup.add(leftWindshield);

const rightWindshield = new THREE.Mesh(
  new THREE.PlaneGeometry(2.18, 1.38),
  cockpitGlassMat
);
rightWindshield.position.set(2.15, CY, CZ + 0.43);
rightWindshield.rotation.y = -Math.PI / 8;
canopyGroup.add(rightWindshield);

/* subtle top glass strip closes the visual gap above the windshield */
const topGlass = new THREE.Mesh(
  new THREE.PlaneGeometry(5.6, 1.1),
  cockpitGlassMat
);
topGlass.rotation.x = -Math.PI / 2;
topGlass.position.set(0, CY + 1.32, CZ + 1.25);
canopyGroup.add(topGlass);

/* ============================================================
   INTERIOR ENCLOSURE — Tường / Trần / Sàn
   ============================================================ */

/* --- SIDE WALLS + SIDE WINDOWS --- */
const cockpitGlassMat = new THREE.MeshStandardMaterial({
  color: 0x9cefff,
  emissive: 0x102f3a,
  emissiveIntensity: 0.52,
  roughness: 0.18,
  metalness: 0.06,
  transparent: true,
  opacity: 0.22,
  side: THREE.DoubleSide,
  depthWrite: false
});

[-1, 1].forEach(side => {
  /* solid lower pressure wall */
  const lowerWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 2.30, 8.0),
    MAT_PANEL
  );
  lowerWall.position.set(side * 3.5, -1.32, -5.9);
  cockpit.add(lowerWall);

  /* narrow structural rail above the window */
  const upperRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.30, 8.0),
    MAT_PANEL
  );
  upperRail.position.set(side * 3.5, 2.02, -5.9);
  cockpit.add(upperRail);

  /* transparent side canopy, visible from inside */
  const sideWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.9, 1.95),
    cockpitGlassMat
  );
  sideWindow.position.set(side * 3.38, 0.80, -5.95);
  sideWindow.rotation.y = side * Math.PI / 2;
  cockpit.add(sideWindow);

  const wallEdgeTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 8.0),
    MAT_EDGE_CYAN
  );
  wallEdgeTop.position.set(side * 3.5, 2.18, -5.9);
  cockpit.add(wallEdgeTop);

  const windowSill = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.08, 7.7),
    MAT_EDGE_AMBER
  );
  windowSill.position.set(side * 3.5, -0.18, -5.9);
  cockpit.add(windowSill);

  const wallEdgeBot = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 8.0),
    MAT_EDGE_AMBER
  );
  wallEdgeBot.position.set(side * 3.5, -2.48, -5.9);
  cockpit.add(wallEdgeBot);
});

/* --- CEILING --- */
const ceiling = new THREE.Mesh(
  new THREE.BoxGeometry(7.2, 0.15, 8.0),
  MAT_PANEL
);
ceiling.position.set(0, 2.25, -5.9);
cockpit.add(ceiling);

/* --- 2 CEILING LED STRIPS --- */
[-2.6, 2.6].forEach(x => {
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.04, 7.5),
    new THREE.MeshBasicMaterial({
      color: 0xdfefff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  strip.position.set(x, 2.16, -6);
  cockpit.add(strip);
});

/* --- FLOOR --- */
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(7.2, 0.15, 10.0),
  MAT_DARK
);
floor.position.set(0, -2.55, -5.5);
cockpit.add(floor);

/* --- REAR PRESSURE BULKHEAD --- */
const rearBulkhead = new THREE.Mesh(
  new THREE.BoxGeometry(7.2, 4.7, 0.18),
  MAT_PANEL
);
rearBulkhead.position.set(0, -0.15, -1.88);
cockpit.add(rearBulkhead);

const rearDoor = new THREE.Mesh(
  new THREE.BoxGeometry(2.15, 3.35, 0.08),
  MAT_DARK
);
rearDoor.position.set(0, -0.20, -1.97);
cockpit.add(rearDoor);

const rearDoorEdge = new THREE.Mesh(
  new THREE.BoxGeometry(2.32, 3.52, 0.035),
  MAT_EDGE_AMBER
);
rearDoorEdge.position.set(0, -0.20, -2.02);
cockpit.add(rearDoorEdge);

/* --- 2 FLOOR LED STRIPS --- */
[-1.6, 1.6].forEach(x => {
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.04, 9),
    new THREE.MeshBasicMaterial({
      color: 0xdfefff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  strip.position.set(x, -2.46, -5.5);
  cockpit.add(strip);
});

/* ============================================================
   DASHBOARD — 2 tầng cong, dốc về phi công
   ============================================================ */
const dashGroup = new THREE.Group();
cockpit.add(dashGroup);

/* Lower dash panel — cong, dốc về phi công */
const dashPts = [
  new THREE.Vector3(-3.4, CY - 0.90, CZ + 0.05),
  new THREE.Vector3(-2.0, -0.20, -9.0),
  new THREE.Vector3( 0.0, -0.30, -8.5),
  new THREE.Vector3( 2.0, -0.20, -9.0),
  new THREE.Vector3( 3.4, CY - 0.90, CZ + 0.05)
];
const dashCurve = new THREE.CatmullRomCurve3(dashPts);
const dashMesh = new THREE.Mesh(
  new THREE.TubeGeometry(dashCurve, 40, 0.32, 8, false),
  MAT_PANEL
);
dashGroup.add(dashMesh);

/* Upper edge glow */
const dashTopGlow = new THREE.Mesh(
  new THREE.TubeGeometry(dashCurve, 40, 0.015, 5, false),
  MAT_EDGE_CYAN
);
dashTopGlow.position.y += 0.32;
dashGroup.add(dashTopGlow);

/* --- Main project screen --- */
function makeProjectScreenTexture() {
  const c = document.createElement('canvas'); c.width = 800; c.height = 480;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#010e16'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(50,190,230,0.14)'; ctx.lineWidth = 1;
  for (let x = 0; x < c.width; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
  for (let y = 0; y < c.height; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(90,240,255,0.95)'; ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.strokeStyle = 'rgba(255,180,84,0.55)'; ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, c.width - 40, c.height - 40);
  ctx.fillStyle = '#8ffaff'; ctx.font = 'bold 36px "Share Tech Mono", monospace';
  ctx.fillText(PROJECT_SCREEN_LINES[0], 44, 82);
  ctx.fillStyle = 'rgba(140,240,255,0.55)'; ctx.font = '22px "Share Tech Mono", monospace';
  ctx.fillText(PROJECT_SCREEN_LINES[1], 44, 118);
  ctx.fillStyle = '#d5fcff'; ctx.font = '26px "Share Tech Mono", monospace';
  for (let i = 2; i < PROJECT_SCREEN_LINES.length; i++) ctx.fillText(PROJECT_SCREEN_LINES[i], 44, 175 + (i - 2) * 52);
  ctx.strokeStyle = '#5ff2ff'; ctx.lineWidth = 3;
  const bL = 30;
  [[30,30,1,1],[c.width-30,30,-1,1],[30,c.height-30,1,-1],[c.width-30,c.height-30,-1,-1]].forEach(([x,y,dx,dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + dy*bL); ctx.lineTo(x, y); ctx.lineTo(x + dx*bL, y); ctx.stroke();
  });
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, 'rgba(60,220,255,0.14)');
  grad.addColorStop(0.5, 'rgba(60,220,255,0.02)');
  grad.addColorStop(1, 'rgba(60,220,255,0.14)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const screenMat = new THREE.MeshBasicMaterial({
  map: makeProjectScreenTexture(),
  transparent: true, opacity: 0.98, side: THREE.DoubleSide
});
screenMat.color.setRGB(1.2, 1.2, 1.2);

const projectScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), screenMat);
projectScreen.position.set(0, -0.30, -8.6);
projectScreen.rotation.x = -Math.PI * 0.30;
dashGroup.add(projectScreen);
projectScreen.userData.onClick = () => emit('deploy-projects');
interactiveObjects.push(projectScreen);

const screenFrame = new THREE.Mesh(
  new THREE.PlaneGeometry(2.55, 1.55),
  MAT_EDGE_CYAN
);
screenFrame.position.set(0, -0.30, -8.62);
screenFrame.rotation.x = -Math.PI * 0.30;
dashGroup.add(screenFrame);

/* --- Side gauges --- */
const gaugeL = new THREE.Mesh(
  new THREE.PlaneGeometry(1.0, 1.0),
  new THREE.MeshBasicMaterial({ map: makeGaugeTexture('NAV', '#5ff2ff'), transparent: true })
);
gaugeL.position.set(-2.4, -0.35, -8.4);
gaugeL.rotation.x = -Math.PI * 0.30;
dashGroup.add(gaugeL);

const gaugeR = new THREE.Mesh(
  new THREE.PlaneGeometry(1.0, 1.0),
  new THREE.MeshBasicMaterial({ map: makeGaugeTexture('PWR', '#ffb454'), transparent: true })
);
gaugeR.position.set(2.4, -0.35, -8.4);
gaugeR.rotation.x = -Math.PI * 0.30;
dashGroup.add(gaugeR);

/* --- 4 small gauges gần kính --- */
[-2.6, -0.9, 0.9, 2.6].forEach((x, i) => {
  const gauge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.65, 0.32),
    new THREE.MeshBasicMaterial({
      map: makeGaugeTexture(['AUX','SYS','RCS','O2'][i], ['#4dff9e','#5ff2ff','#ffb454','#5ff2ff'][i]),
      transparent: true
    })
  );
  gauge.position.set(x, -0.30, -9.05);
  gauge.rotation.x = -Math.PI * 0.32;
  dashGroup.add(gauge);
});

/* ============================================================
   SIDE CONSOLES — bảng nút 2 bên
   ============================================================ */
const BTN_COLORS = [0x5ff2ff, 0x4dff9e, 0xffb454, 0xff4a3a];

[-1, 1].forEach(side => {
  const console = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 1.6, 2.6),
    MAT_PANEL
  );
  console.add(panel);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.06, 2.6),
    MAT_EDGE_CYAN
  );
  edge.position.y = 0.8;
  console.add(edge);

  /* Matrix buttons 3x4 */
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10),
        new THREE.MeshBasicMaterial({ color: BTN_COLORS[(row * 4 + col) % 4] })
      );
      btn.rotation.z = Math.PI / 2;
      btn.position.set(side * 0.20, 0.4 - row * 0.35, -1 + col * 0.65);
      console.add(btn);
    }
  }

  /* 2 dials */
  for (let i = 0; i < 2; i++) {
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12),
      MAT_METAL
    );
    dial.rotation.z = Math.PI / 2;
    dial.position.set(side * 0.20, -0.55, -0.6 + i * 1.2);
    console.add(dial);
  }

  console.position.set(side * 3.20, -0.9, -7.5);
  cockpit.add(console);
});

/* ============================================================
   OVERHEAD PANEL
   ============================================================ */
const overheadGroup = new THREE.Group();
cockpit.add(overheadGroup);

const overheadPanel = new THREE.Mesh(
  new THREE.BoxGeometry(4.5, 0.35, 1.2),
  MAT_PANEL
);
overheadGroup.add(overheadPanel);

const overheadEdge = new THREE.Mesh(
  new THREE.BoxGeometry(4.55, 0.05, 1.25),
  MAT_EDGE_CYAN
);
overheadEdge.position.y = -0.18;
overheadGroup.add(overheadEdge);

const overheadSwitches = [];
for (let i = 0; i < 6; i++) {
  const sw = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.30), MAT_DARK);
  sw.add(base);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), MAT_METAL);
  lever.position.y = -0.16;
  sw.add(lever);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff3a2a })
  );
  tip.position.y = -0.30;
  lever.add(tip);
  sw.position.set(-1.5 + i * 0.6, -0.22, 0);
  sw.userData.lever = lever;
  sw.userData.on = false;
  sw.userData.tip = tip;
  sw.userData.targetRot = 0.3;

  [base, lever, tip].forEach(m => {
    m.userData.onClick = () => {
      sw.userData.on = !sw.userData.on;
      sw.userData.targetRot = sw.userData.on ? -0.3 : 0.3;
      sw.userData.tip.material.color.setHex(sw.userData.on ? 0x4dff9e : 0xff3a2a);
      Sound.toggle();
    };
    interactiveObjects.push(m);
  });

  overheadGroup.add(sw);
  overheadSwitches.push(sw);
}
overheadGroup.position.set(0, 2.0, -8.0);
overheadGroup.rotation.x = Math.PI * 0.15;

/* ============================================================
   BOW — visible through center window
   ============================================================ */
const bowGroup = new THREE.Group();
cockpit.add(bowGroup);

(function buildBow() {
  const bowGeo = new THREE.CylinderGeometry(1.8, 1.2, 5, 20);
  bowGeo.rotateX(Math.PI / 2);
  const bow = new THREE.Mesh(bowGeo, shipHullMat);
  bow.position.set(0, -1.4, -13.5);
  bow.scale.set(1.0, 0.85, 1.0);
  bowGroup.add(bow);

  const tipGeo = new THREE.ConeGeometry(1.2, 3.5, 20);
  tipGeo.rotateX(-Math.PI / 2);
  const tip = new THREE.Mesh(tipGeo, shipHullMat);
  tip.position.set(0, -1.4, -17.75);
  tip.scale.set(1.0, 0.85, 1.0);
  bowGroup.add(tip);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 10),
    glowCyanS
  );
  dome.position.set(0, -1.4, -19.8);
  bowGroup.add(dome);
  bowLights.push(dome);

  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8 - i * 0.3, 0.06, 6, 20),
      shipTrimMat
    );
    ring.position.set(0, -1.4, -11.5 - i * 2.5);
    ring.scale.set(1.0, 0.85, 1.0);
    bowGroup.add(ring);
  }

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.30, 6),
    shipTrimMat
  );
  spine.position.set(0, 0.2, -13);
  bowGroup.add(spine);

  const spineGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.03, 6),
    glowCyanS
  );
  spineGlow.position.set(0, 0.36, -13);
  bowGroup.add(spineGlow);

  [-1, 1].forEach(side => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.14, 5),
      glowCyanS
    );
    stripe.position.set(side * 1.65, -1.0, -13.5);
    bowGroup.add(stripe);

    const stripe2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.10, 4),
      glowAmberS
    );
    stripe2.position.set(side * 1.65, -1.9, -14);
    bowGroup.add(stripe2);
  });

  [[-1.3, -1.4, -12], [1.3, -1.4, -12]].forEach(([x, y, z], i) => {
    const l = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      i % 2 === 0 ? glowGreenS : glowRedS
    );
    l.position.set(x, y, z);
    bowGroup.add(l);
    bowLights.push(l);
  });
})();

/* ============================================================
   PILOT SEAT + ARMRESTS
   ============================================================ */
const seatGroup = new THREE.Group();
cockpit.add(seatGroup);

/* Seat base */
const seatBase = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 0.35, 2.0),
  MAT_DARK
);
seatBase.position.set(0, -1.5, -4.0);
seatGroup.add(seatBase);

/* Seat back */
const seatBack = new THREE.Mesh(
  new THREE.BoxGeometry(2.1, 2.6, 0.35),
  MAT_DARK
);
seatBack.position.set(0, 0.0, -3.0);
seatGroup.add(seatBack);

/* Headrest */
const headrest = new THREE.Mesh(
  new THREE.BoxGeometry(1.3, 0.5, 0.30),
  MAT_DARK
);
headrest.position.set(0, 1.5, -3.0);
seatGroup.add(headrest);

/* Cyan LED strips trên seat back */
[-0.85, 0.85].forEach(x => {
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 2.4, 0.03),
    MAT_CYAN
  );
  strip.position.set(x, 0.0, -2.82);
  seatGroup.add(strip);
});

/* Armrests */
[-1, 1].forEach(side => {
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.15, 2.0),
    MAT_DARK
  );
  arm.position.set(side * 1.45, -0.85, -5.0);
  seatGroup.add(arm);

  const armEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 0.10),
    MAT_EDGE_CYAN
  );
  armEdge.position.set(side * 1.45, -0.78, -5.9);
  seatGroup.add(armEdge);
});

/* ============================================================
   HOTAS — THROTTLE (left)
   ============================================================ */
function buildThrottle() {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 1.2), MAT_DARK);
  base.position.y = 0.07;
  g.add(base);

  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 1.0),
    new THREE.MeshBasicMaterial({ color: 0x5ff2ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  track.rotation.x = -Math.PI / 2;
  track.position.set(0, 0.15, 0);
  g.add(track);

  for (let i = 0; i < 9; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), MAT_METAL);
    tick.position.set(0, 0.14, -0.5 + i * 0.125);
    g.add(tick);
  }

  const pivot = new THREE.Group();
  pivot.position.set(0, 0.14, 0);
  g.add(pivot);

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.30, 0.20), MAT_METAL);
  post.position.y = 0.15;
  pivot.add(post);

  const grip = new THREE.Group();
  grip.position.y = 0.30;
  pivot.add(grip);

  const gripBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 0.40, 8, 12),
    MAT_RUBBER
  );
  gripBody.rotation.x = Math.PI / 2;
  gripBody.position.set(0, 0, -0.05);
  grip.add(gripBody);

  const gripCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    MAT_DARK
  );
  gripCap.rotation.x = -Math.PI / 2;
  gripCap.position.set(0, 0, -0.28);
  grip.add(gripCap);

  for (let i = 0; i < 4; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.025, 10),
      new THREE.MeshBasicMaterial({ color: [0x5ff2ff, 0x4dff9e, 0xffb454, 0xff4a3a][i] })
    );
    btn.position.set(-0.05 + i * 0.033, 0.12, -0.05);
    grip.add(btn);
  }

  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), MAT_TRIM);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(0.12, 0.04, 0.08);
  grip.add(knob);

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.010, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0x5ff2ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.15;
  g.add(baseRing);

  const record = { group: g, pivot, grip, tx: 0, tz: 0, side: -1, type: 'throttle' };
  [base, post, gripBody, gripCap, knob].forEach(m => {
    m.userData.stick = record;
    stickMeshes.push(m);
  });

  cockpit.add(g);
  sticks.push(record);
  return record;
}

/* ============================================================
   HOTAS — JOYSTICK (right)
   ============================================================ */
function buildJoystick() {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.12, 24), MAT_DARK);
  base.position.y = 0.06;
  g.add(base);

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.015, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0x5ff2ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.13;
  g.add(baseRing);

  const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), MAT_TRIM);
  gimbal.position.y = 0.25;
  g.add(gimbal);

  const pivot = new THREE.Group();
  pivot.position.y = 0.25;
  g.add(pivot);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.70, 12), MAT_METAL);
  shaft.position.y = 0.40;
  pivot.add(shaft);

  const shaftGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.022, 12),
    new THREE.MeshBasicMaterial({ color: 0x5ff2ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  shaftGlow.position.y = 0.28;
  pivot.add(shaftGlow);

  const grip = new THREE.Group();
  grip.position.y = 0.80;
  grip.rotation.x = -0.12;
  pivot.add(grip);

  const gripBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.28, 8, 12), MAT_RUBBER);
  grip.add(gripBody);

  const gripCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.122, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    MAT_DARK
  );
  gripCap.position.y = 0.14;
  grip.add(gripCap);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.07), MAT_TRIM);
  trigger.position.set(0, 0.02, -0.13);
  trigger.rotation.x = 0.25;
  grip.add(trigger);

  const triggerTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff3a2a })
  );
  triggerTip.position.set(0, 0.02, -0.165);
  grip.add(triggerTip);

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), MAT_TRIM);
  hat.position.set(0, 0.19, -0.03);
  grip.add(hat);

  const safety = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.03, 10),
    new THREE.MeshBasicMaterial({ color: 0xff4a3a })
  );
  safety.position.set(0, 0.21, 0.06);
  grip.add(safety);

  const sideBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x4dff9e })
  );
  sideBtn.position.set(0.11, 0.04, 0);
  grip.add(sideBtn);

  const record = { group: g, pivot, grip, tx: 0, tz: 0, side: 1, type: 'joystick' };
  [base, gimbal, shaft, gripBody, gripCap, trigger, triggerTip, hat].forEach(m => {
    m.userData.stick = record;
    stickMeshes.push(m);
  });

  cockpit.add(g);
  sticks.push(record);
  return record;
}

buildThrottle();
buildJoystick();

/* ============================================================
   LAYOUT
   ============================================================ */
export function layoutCockpit() {
  sticks.forEach(s => {
    if (s.type === 'throttle') {
      /* Throttle trái — gắn vào armrest trái */
      s.group.position.set(-1.45, -0.75, -7.0);
      s.group.rotation.set(0.15, 0.12, 0);
    } else {
      /* Joystick phải — gắn vào armrest phải */
      s.group.position.set(1.45, -0.75, -7.0);
      s.group.rotation.set(0.15, -0.12, 0);
    }
  });
}

export function setProjectScreenHighlight(on) {
  screenMat.opacity = on ? 1.0 : 0.98;
  const c = on ? 1.4 : 1.2;
  screenMat.color.setRGB(c, c, c);
}

/* ============================================================
   UPDATE
   ============================================================ */
export function updateCockpit(t, dt) {
  sticks.forEach(s => {
    if (s.type === 'throttle') {
      const targetZ = -s.tx * 0.65;
      s.pivot.position.z += (targetZ - s.pivot.position.z) * Math.min(1, dt * 7);
      s.pivot.rotation.x = 0;
      s.pivot.rotation.z = 0;
    } else {
      s.pivot.rotation.x += (s.tx - s.pivot.rotation.x) * Math.min(1, dt * 9);
      s.pivot.rotation.z += (s.tz - s.pivot.rotation.z) * Math.min(1, dt * 9);
      s.pivot.position.z = 0;
    }
  });

  overheadSwitches.forEach(sw => {
    const target = sw.userData.targetRot;
    sw.userData.lever.rotation.x += (target - sw.userData.lever.rotation.x) * Math.min(1, dt * 10);
  });

  /* The interior is rigidly mounted to ship.
     Ship motion is inherited from the parent transform. */

  /* Bow running lights */
  bowLights.forEach((l, i) => { l.visible = Math.sin(t * 2.4 + i * 1.7) > -0.15; });
}