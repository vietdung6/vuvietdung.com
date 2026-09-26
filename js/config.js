export const TERMINAL_LINES = [
  { label: 'PILOT',   value: 'DŨNG' },
  { label: 'VESSEL',  value: 'ISV GARGANTUA-7 · RECON' },
  { label: 'FOCUS',   value: 'REALTIME 3D · INTERACTION DESIGN' },
  { label: 'STACK',   value: 'THREE.JS · GLSL · TS · WEBGPU' },
  { label: 'STATUS',  value: 'OPEN FOR NEW MISSIONS' }
];

/* Legacy — vẫn dùng cho texture trên dash 3D */
export const PROJECT_SCREEN_LINES = [
  'MISSION ARCHIVE', '─────────────────────────',
  '01  ORBITAL ATLAS        WEBGL',
  '02  NEURAL GARDEN        GLSL',
  '03  SENTINEL INTERFACE   THREE',
  '04  GRAVITY WELL         R3F',
  '05  BRIDGE OS            TS'
];

/* ============================================================
   PROJECT DATA — dùng cho Hologram Panel
   ============================================================ */
export const PROJECTS = [
  {
    id: '01',
    title: 'ORBITAL ATLAS',
    year: '2024',
    tech: 'WEBGL',
    status: 'ACTIVE',
    tags: ['Three.js', 'WebGL', 'GLSL', 'TSL'],
    desc: 'Interactive 3D globe rendering live satellite trajectories and real-time orbital mechanics. Custom compute shaders process 40K+ TLE datasets with sub-frame propagation accuracy.'
  },
  {
    id: '02',
    title: 'NEURAL GARDEN',
    year: '2024',
    tech: 'GLSL',
    status: 'ACTIVE',
    tags: ['GLSL', 'WebGL', 'FBM', 'Reaction-Diffusion'],
    desc: 'Procedural ecosystem that grows and evolves in real time. Fragment shaders simulate plant growth, mycelium networks and nutrient diffusion entirely on the GPU — no CPU ticking required.'
  },
  {
    id: '03',
    title: 'SENTINEL INTERFACE',
    year: '2023',
    tech: 'THREE',
    status: 'ARCHIVED',
    tags: ['Three.js', 'Instanced', 'LOD', 'WebSockets'],
    desc: 'Real-time monitoring dashboard for distributed systems. A 3D topology graph renders 10K+ nodes with LOD culling and instanced rendering at a stable 60 fps.'
  },
  {
    id: '04',
    title: 'GRAVITY WELL',
    year: '2023',
    tech: 'R3F',
    status: 'ARCHIVED',
    tags: ['React', 'R3F', 'Physics', 'N-Body'],
    desc: 'N-body gravitational sandbox built on react-three-fiber. Users can spawn massive bodies and watch emergent orbital dynamics stabilise, collapse, or fling themselves out of the system.'
  },
  {
    id: '05',
    title: 'BRIDGE OS',
    year: '2022',
    tech: 'TS',
    status: 'ARCHIVED',
    tags: ['TypeScript', 'Canvas', 'IndexedDB', 'Plugins'],
    desc: 'Web-based operating environment with a modular window manager, keyboard-first navigation and a plugin API for building custom sci-fi UI panels — the ancestor of this very bridge.'
  }
];