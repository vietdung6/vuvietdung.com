import * as THREE from 'three';

/* ============================================================
   TEXTURE FACTORIES
   ============================================================ */
export function makeHullPanelTexture(repeatX, repeatY) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#3a4450'); grad.addColorStop(0.5, '#4a5666'); grad.addColorStop(1, '#2f3945');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = 'rgba(8, 15, 22, 0.95)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 16; i++) { const x = i * 64; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
  for (let i = 0; i <= 16; i++) { const y = i * 64; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(Math.random() * 16) * 64;
    const y = Math.floor(Math.random() * 16) * 64;
    ctx.fillStyle = `rgba(10, 18, 26, ${0.15 + Math.random() * 0.35})`;
    ctx.fillRect(x + 2, y + 2, 60, 60);
  }
  ctx.fillStyle = 'rgba(110, 130, 150, 0.7)';
  for (let i = 0; i < 150; i++) { ctx.beginPath(); ctx.arc(Math.random() * 1024, Math.random() * 1024, 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255, 180, 84, 0.30)'; ctx.fillRect(0, 320, 1024, 5);
  ctx.fillStyle = 'rgba(95, 242, 255, 0.24)'; ctx.fillRect(0, 700, 1024, 4);
  ctx.save(); ctx.translate(760, 160); ctx.fillStyle = 'rgba(255, 180, 84, 0.75)';
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 10, 0, 5, 48);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeatX, repeatY); tex.anisotropy = 4;
  return tex;
}

export function makeGrilleTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(40,110,170,0.55)';
  for (let x = 4; x < c.width - 4; x += 6) ctx.fillRect(x, 4, 3, c.height - 8);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

export function makeGaugeTexture(label, hex) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#01080d'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = hex; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(128, 128, 108, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(128, 128, 96, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = hex; ctx.lineWidth = 3;
  for (let i = 0; i <= 20; i++) {
    const a = -Math.PI * 0.75 + (i / 20) * Math.PI * 1.5;
    const r1 = 84, r2 = (i % 5 === 0) ? 68 : 76;
    ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
    ctx.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2); ctx.stroke();
  }
  const ang = -Math.PI * 0.75 + Math.random() * Math.PI * 1.5;
  ctx.strokeStyle = '#ff5030'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.cos(ang) * 78, 128 + Math.sin(ang) * 78); ctx.stroke();
  ctx.fillStyle = hex; ctx.beginPath(); ctx.arc(128, 128, 8, 0, Math.PI * 2); ctx.fill();
  ctx.font = 'bold 20px "Share Tech Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = hex;
  ctx.fillText(label, 128, 200);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

export function makeLEDStripTexture(count, colors) {
  const c = document.createElement('canvas'); c.width = count * 24; c.height = 24;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#01050a'; ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(i * 24 + 12, 12, 6, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

export function makeEngineGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0.00, 'rgba(255,245,225,1.0)');
  grad.addColorStop(0.18, 'rgba(255,205,130,0.85)');
  grad.addColorStop(0.45, 'rgba(255,130,50,0.35)');
  grad.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

/* ============================================================
   SHARED MATERIALS
   ============================================================ */
export const hullTexCockpit = makeHullPanelTexture(2, 2);
export const hullTexShip    = makeHullPanelTexture(3, 3);

export const MAT_HULL   = new THREE.MeshStandardMaterial({ color: 0x6b7885, roughness: 0.62, metalness: 0.82, emissive: 0x04080d, emissiveIntensity: 0.35, map: hullTexCockpit });
export const MAT_DARK   = new THREE.MeshStandardMaterial({ color: 0x0e141c, roughness: 0.92, metalness: 0.55, emissive: 0x02060a, emissiveIntensity: 0.70 });
export const MAT_TRIM   = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, roughness: 0.24, metalness: 1.00, emissive: 0x080f16, emissiveIntensity: 0.35 });
export const MAT_PANEL  = new THREE.MeshStandardMaterial({ color: 0x12181f, roughness: 0.78, metalness: 0.55, emissive: 0x030810, emissiveIntensity: 0.50 });
export const MAT_RUBBER = new THREE.MeshStandardMaterial({ color: 0x080a0d, roughness: 0.96, metalness: 0.15 });
export const MAT_METAL  = MAT_TRIM;

export const MAT_CYAN  = new THREE.MeshBasicMaterial({ color: 0x5ff2ff });
export const MAT_AMBER = new THREE.MeshBasicMaterial({ color: 0xffb454 });
export const MAT_RED   = new THREE.MeshBasicMaterial({ color: 0xff4a3a });
export const MAT_GREEN = new THREE.MeshBasicMaterial({ color: 0x4dff9e });

export const MAT_EDGE_CYAN  = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
export const MAT_EDGE_AMBER = new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false });

export const shipHullMat  = new THREE.MeshStandardMaterial({ color: 0x6b7885, roughness: 0.62, metalness: 0.82, emissive: 0x04080d, emissiveIntensity: 0.35, map: hullTexShip });
export const shipDarkMat  = MAT_DARK;
export const shipTrimMat  = MAT_TRIM;
export const shipGlassMat = new THREE.MeshPhysicalMaterial({ color: 0x052030, roughness: 0.05, metalness: 0.15, emissive: 0x186a9a, emissiveIntensity: 1.1, transparent: true, opacity: 0.82, clearcoat: 1.0 });

export const glowCyanS  = new THREE.MeshBasicMaterial({ color: 0x5ff2ff });
export const glowAmberS = new THREE.MeshBasicMaterial({ color: 0xffb454 });
export const glowRedS   = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
export const glowGreenS = new THREE.MeshBasicMaterial({ color: 0x4dff9e });