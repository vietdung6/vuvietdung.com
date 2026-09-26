import * as THREE from 'three';
import { cruise } from './motion.js';
import { scene } from './scene-core.js';
import {
  glowCyanS, glowAmberS, glowRedS, glowGreenS,
  makeEngineGlowTexture
} from './materials.js';

/* ============================================================
   ISV GARGANTUA-7 — deep-space single-seat recon vessel

   One physical vessel:
   - exterior hull and canopy live here
   - cockpit interior is mounted into this Group by main.js
   - interior/exterior views differ only by camera position
   ============================================================ */
export const ship = new THREE.Group();
ship.visible = true;
scene.add(ship);

const engineGlowMeshes = [];
const enginePlumes = [];
const plumeMats = [];
const engineRings = [];
const engineLights = [];
const navLights = [];
const runningLights = [];

const hullMat = new THREE.MeshStandardMaterial({
  color: 0xb7b2a4,
  roughness: 0.62,
  metalness: 0.46,
  emissive: 0x06080a,
  emissiveIntensity: 0.18
});
const hullLightMat = new THREE.MeshStandardMaterial({
  color: 0xd5d0c2,
  roughness: 0.58,
  metalness: 0.38
});
const darkMat = new THREE.MeshStandardMaterial({
  color: 0x171b1d,
  roughness: 0.86,
  metalness: 0.44
});
const metalMat = new THREE.MeshStandardMaterial({
  color: 0x83898b,
  roughness: 0.30,
  metalness: 0.92
});
const cyanMat = new THREE.MeshBasicMaterial({ color: 0x5ff2ff });
const amberMat = new THREE.MeshBasicMaterial({ color: 0xffb454 });

const glassMat = new THREE.MeshStandardMaterial({
  color: 0x9defff,
  emissive: 0x15343b,
  emissiveIntensity: 0.60,
  roughness: 0.14,
  metalness: 0.06,
  transparent: true,
  opacity: 0.34,
  side: THREE.DoubleSide,
  depthWrite: false
});

function addBox(w, h, d, mat, x, y, z, rx=0, ry=0, rz=0, parent=ship) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x,y,z);
  m.rotation.set(rx,ry,rz);
  parent.add(m);
  return m;
}

function addCylinder(rTop, rBot, len, mat, x, y, z, sx=1, sy=1, parent=ship) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, 24);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x,y,z);
  m.scale.set(sx,sy,1);
  parent.add(m);
  return m;
}

/* ============================================================
   PRIMARY PRESSURE HULL
   A broad, low central body instead of the old tube/aircraft fuselage.
   ============================================================ */
(function buildPrimaryHull() {
  addCylinder(2.75, 3.10, 12.8, hullMat, 0, 0.0, -0.8, 1.0, 0.70);
  addCylinder(2.40, 2.75, 7.0, hullLightMat, 0, 0.12, -10.3, 1.0, 0.66);
  addCylinder(3.00, 2.55, 7.2, hullMat, 0, -0.05, 8.4, 1.0, 0.70);

  /* flattened belly gives the ship a real lower hull */
  addBox(5.4, 0.75, 21.0, darkMat, 0, -1.72, -0.1);

  /* dorsal spine */
  addBox(1.10, 0.42, 14.0, metalMat, 0, 2.00, 1.0);
  addBox(0.16, 0.05, 13.2, cyanMat, 0, 2.24, 0.8);

  /* shoulder chines make the body read as one continuous spacecraft */
  [-1,1].forEach(side => {
    addBox(1.15, 0.72, 16.5, hullMat, side*2.55, 0.95, -0.8, 0, 0, -side*0.10);
    addBox(0.14, 0.16, 13.8, darkMat, side*3.04, 0.98, -0.3);
    addBox(0.05, 0.08, 10.5, cyanMat, side*3.12, 1.18, -1.0);
  });
})();

/* ============================================================
   SENSOR NOSE
   Shorter, integrated wedge-like nose rather than the old long cone.
   ============================================================ */
(function buildNose() {
  addCylinder(1.10, 2.40, 5.4, hullLightMat, 0, -0.05, -16.0, 1.0, 0.64);

  const sensor = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 20, 14),
    darkMat
  );
  sensor.scale.set(1.35,0.72,0.62);
  sensor.position.set(0,0.10,-18.8);
  ship.add(sensor);

  const sensorEye = new THREE.Mesh(
    new THREE.CircleGeometry(0.28,20),
    cyanMat
  );
  sensorEye.position.set(0,0.10,-19.17);
  ship.add(sensorEye);

  [-1,1].forEach(side => {
    addBox(0.10,0.12,4.4,amberMat,side*1.55,-0.72,-15.5,0,side*0.10,0);
  });
})();

/* ============================================================
   INTEGRATED COCKPIT / CANOPY
   This geometry surrounds the real interior module.
   Interior transform maps its legacy canopy exactly to:
   CY = 2.55, CZ = -8.0
   ============================================================ */
(function buildCanopy() {
  const CY = 2.55;
  const CZ = -8.0;

  /* cockpit tub / pressure deck */
  addBox(6.20,0.34,4.80,hullMat,0,CY-1.10,CZ+1.65);
  addBox(4.70,0.08,3.85,darkMat,0,CY-1.30,CZ+1.70);

  /* roof bridge is narrow so the canopy remains mostly glazed */
  addBox(6.25,0.26,0.48,hullMat,0,CY+1.03,CZ+3.60);
  addBox(6.25,0.26,0.48,hullMat,0,CY+1.03,CZ+0.10);

  /* front windshield: three faceted panes */
  const center = new THREE.Mesh(new THREE.PlaneGeometry(2.25,1.50),glassMat);
  center.position.set(0,CY,CZ);
  ship.add(center);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(2.38,1.50),glassMat);
  left.position.set(-2.18,CY,CZ+0.30);
  left.rotation.y = Math.PI/8;
  ship.add(left);

  const right = left.clone();
  right.position.x = 2.18;
  right.rotation.y = -Math.PI/8;
  ship.add(right);

  /* long side glazing */
  [-1,1].forEach(side => {
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.65,1.52),glassMat);
    sideGlass.position.set(side*3.05,CY-0.02,CZ+2.00);
    sideGlass.rotation.y = side*Math.PI/2;
    ship.add(sideGlass);

    addBox(0.26,0.22,4.15,hullMat,side*3.24,CY+0.84,CZ+1.92);
    addBox(0.28,0.24,4.15,hullMat,side*3.24,CY-0.88,CZ+1.92);
    addBox(0.30,1.90,0.32,hullMat,side*3.24,CY-0.02,CZ+3.82);
  });

  /* top glazing */
  const roofGlass = new THREE.Mesh(new THREE.PlaneGeometry(4.65,3.00),glassMat);
  roofGlass.rotation.x = -Math.PI/2;
  roofGlass.position.set(0,CY+1.13,CZ+1.83);
  ship.add(roofGlass);

  /* mullions */
  [-1,1].forEach(side => {
    addBox(0.22,1.72,0.42,metalMat,side*1.15,CY,CZ+0.10,0,0,side*0.16);
  });

  /* rear pressure arch */
  addBox(6.25,2.15,0.30,hullMat,0,CY-0.02,CZ+3.86);
  addBox(3.00,1.15,0.05,darkMat,0,CY-0.04,CZ+3.68);

  /* warm/cyan cabin glow makes the real interior readable through glass */
  const cabinLight = new THREE.PointLight(0x9defff,6.5,8.0,2);
  cabinLight.position.set(0,CY+0.20,CZ+1.45);
  ship.add(cabinLight);

  const warm = new THREE.PointLight(0xffb454,3.2,5.0,2);
  warm.position.set(-1.5,CY-0.40,CZ+1.4);
  ship.add(warm);
})();

/* ============================================================
   FLIGHT SURFACES / RADIATOR WINGS
   Compact, swept, industrial — not airplane-like.
   ============================================================ */
(function buildWings() {
  [-1,1].forEach(side => {
    const wing = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(0, 2.4);
    shape.lineTo(7.2, 0.9);
    shape.lineTo(8.8, -1.3);
    shape.lineTo(6.6, -2.1);
    shape.lineTo(0.8, -1.1);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape,{
      depth:0.22,
      bevelEnabled:true,
      bevelSize:0.05,
      bevelThickness:0.04,
      bevelSegments:1
    });
    geo.rotateX(-Math.PI/2);
    const plate = new THREE.Mesh(geo,hullMat);
    wing.add(plate);

    addBox(6.5,0.06,0.10,cyanMat,3.65,0.18,0.22,0,-0.20,0,wing);
    addBox(5.0,0.10,0.65,darkMat,3.00,0.10,-1.10,0,-0.18,0,wing);

    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.50,3.6,16),darkMat);
    pod.rotation.x = Math.PI/2;
    pod.position.set(6.25,-0.05,-1.25);
    wing.add(pod);

    const nav = new THREE.Mesh(
      new THREE.SphereGeometry(0.14,10,8),
      side > 0 ? glowGreenS : glowRedS
    );
    nav.position.set(8.15,0.24,-1.45);
    wing.add(nav);
    navLights.push(nav);

    wing.scale.x = side;
    wing.position.set(side*2.55,-0.45,0.6);
    ship.add(wing);
  });
})();

/* ============================================================
   AFT BOOMS / ENGINE SHOULDERS
   ============================================================ */
(function buildAftShoulders() {
  [-1,1].forEach(side => {
    addBox(1.55,1.25,7.6,hullMat,side*2.65,-0.10,7.1,0,0,-side*0.06);
    addBox(0.85,0.55,6.8,darkMat,side*2.98,-0.28,7.4);
    addBox(0.06,0.08,5.9,amberMat,side*3.20,0.18,7.5);
  });

  /* low twin fins; keeps silhouette spacecraft-like */
  [-1,1].forEach(side => {
    const shape = new THREE.Shape();
    shape.moveTo(0,0);
    shape.lineTo(0,2.3);
    shape.lineTo(0.8,2.8);
    shape.lineTo(1.7,0.3);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape,{depth:0.20,bevelEnabled:false});
    const fin = new THREE.Mesh(geo,hullMat);
    fin.rotation.y = Math.PI/2;
    fin.position.set(side*2.35,1.45,8.7);
    ship.add(fin);
  });
})();

/* ============================================================
   EXHAUST PLUME
   ============================================================ */
function makePlumeMaterial(seed, intensity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime:{value:0},
      uSeed:{value:seed},
      uIntensity:{value:intensity}
    },
    vertexShader:`
      varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vP;
      void main(){
        vP=position;
        vec4 wp=modelMatrix*vec4(position,1.0);
        vN=normalize(mat3(modelMatrix)*normal);
        vV=normalize(cameraPosition-wp.xyz);
        vH=uv.y;
        gl_Position=projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader:`
      uniform float uTime; uniform float uSeed; uniform float uIntensity;
      varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vP;
      float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise3(vec3 x){
        vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
        return mix(
          mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
              mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
              mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p){float v=0.0,a=0.55;for(int i=0;i<3;i++){v+=a*noise3(p);p*=2.07;a*=0.5;}return v;}
      void main(){
        float h=clamp(vH,0.0,1.0);
        float axial=1.0-h;
        float facing=abs(dot(normalize(vN),normalize(vV)));
        float body=pow(facing,0.85);
        float n=fbm(vec3(vP.x*2.1,vP.y*2.1,h*4.5-uTime*2.6+uSeed*6.28));
        float turb=0.60+0.66*n;
        float dens=pow(axial,1.85)*body*turb*uIntensity;
        dens*=0.94+0.06*sin(uTime*11.0+uSeed*6.28);
        vec3 cCore=vec3(0.94,0.99,1.00);
        vec3 cMid=vec3(1.00,0.58,0.20);
        vec3 cTail=vec3(0.40,0.08,0.02);
        vec3 col=mix(cCore,cMid,smoothstep(0.02,0.32,h));
        col=mix(col,cTail,smoothstep(0.32,0.95,h));
        col*=0.40+1.95*pow(axial,2.0);
        gl_FragColor=vec4(col*dens,1.0);
      }`,
    transparent:true,
    blending:THREE.AdditiveBlending,
    depthWrite:false,
    side:THREE.DoubleSide
  });
}

function makePlume(radiusStart,radiusEnd,length,seed,intensity){
  const geo=new THREE.CylinderGeometry(radiusEnd,radiusStart,length,28,12,true);
  geo.rotateX(Math.PI/2);
  geo.translate(0,0,length/2);
  const mat=makePlumeMaterial(seed,intensity);
  plumeMats.push(mat);
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  return mesh;
}

/* ============================================================
   ENGINE CLUSTER — one central drive + two verniers
   ============================================================ */
(function buildEngines(){
  const glowTex=makeEngineGlowTexture();

  const mainHousing=addCylinder(2.15,2.45,3.2,darkMat,0,-0.05,12.0,1,0.82);
  engineRings.push(new THREE.Mesh(new THREE.TorusGeometry(2.25,0.09,8,28),metalMat));
  engineRings[engineRings.length-1].position.set(0,-0.05,13.45);
  ship.add(engineRings[engineRings.length-1]);

  const nozzle=new THREE.Mesh(new THREE.CircleGeometry(2.12,28),glowAmberS.clone());
  nozzle.material.transparent=true;
  nozzle.material.opacity=1;
  nozzle.position.set(0,-0.05,13.66);
  ship.add(nozzle);
  engineGlowMeshes.push(nozzle);

  const flare=new THREE.Mesh(
    new THREE.PlaneGeometry(7.5,7.5),
    new THREE.MeshBasicMaterial({
      map:glowTex,color:0xffb070,transparent:true,
      blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.50
    })
  );
  flare.position.set(0,-0.05,14.2);
  ship.add(flare);
  engineGlowMeshes.push(flare);

  const core=makePlume(1.85,3.1,8.0,0.11,1.25);
  core.position.set(0,-0.05,13.65);
  ship.add(core);
  enginePlumes.push({mesh:core,s:1.0});

  const outer=makePlume(2.0,6.7,21.0,0.63,0.58);
  outer.position.set(0,-0.05,13.65);
  ship.add(outer);
  enginePlumes.push({mesh:outer,s:1.0});

  const eLight=new THREE.PointLight(0xff8030,24,38,2);
  eLight.position.set(0,-0.05,15);
  ship.add(eLight);
  engineLights.push({light:eLight,base:24,s:1});

  [-1,1].forEach(side=>{
    const vh=addCylinder(0.52,0.62,1.8,darkMat,side*2.72,-0.18,11.15,1,0.9);
    const vr=new THREE.Mesh(new THREE.TorusGeometry(0.57,0.05,6,16),metalMat);
    vr.position.set(side*2.72,-0.18,12.02);
    ship.add(vr);

    const vn=new THREE.Mesh(new THREE.CircleGeometry(0.50,16),glowAmberS.clone());
    vn.material.transparent=true;
    vn.position.set(side*2.72,-0.18,12.08);
    ship.add(vn);
    engineGlowMeshes.push(vn);

    const vp=makePlume(0.42,1.0,3.7,0.5+side*0.3,0.82);
    vp.position.set(side*2.72,-0.18,12.08);
    ship.add(vp);
    enginePlumes.push({mesh:vp,s:0.55});
  });
})();

/* ============================================================
   SERVICE DETAILS
   ============================================================ */
(function buildDetails(){
  [-1,1].forEach(side=>{
    for(let i=0;i<3;i++){
      addBox(0.65,0.05,0.70,darkMat,side*2.90,1.18,-1.0+i*2.2);
    }
  });

  [[-2.8,0.9,-3.5],[2.8,0.9,-3.5],[-2.7,0.8,5.0],[2.7,0.8,5.0]].forEach(([x,y,z],i)=>{
    const l=new THREE.Mesh(
      new THREE.SphereGeometry(0.07,8,6),
      i%2===0?glowGreenS:glowRedS
    );
    l.position.set(x,y,z);
    ship.add(l);
    runningLights.push(l);
  });
})();

/* ============================================================
   UPDATE
   ============================================================ */
export function updateShip(t){
  ship.position.y=Math.sin(t*0.5)*0.22;
  ship.rotation.x=Math.cos(t*0.42)*0.006;
  ship.rotation.z=Math.sin(t*0.35)*0.009;

  plumeMats.forEach(m=>{m.uniforms.uTime.value=t;});

  const thrustBoost=1+cruise.velocity*0.35;
  const widthBoost=1+cruise.velocity*0.20;

  enginePlumes.forEach((p,i)=>{
    const along=(1.0+Math.sin(t*5.6+i*1.1)*0.055)*thrustBoost;
    const wide=(1.0+Math.sin(t*4.1+i*0.8)*0.045)*widthBoost;
    p.mesh.scale.set(wide,wide,along);
  });

  engineGlowMeshes.forEach((g,i)=>{
    g.material.opacity=0.72+Math.sin(t*7.5+i*1.3)*0.16+cruise.velocity*0.15;
  });

  engineRings.forEach((ring,i)=>{
    ring.scale.setScalar(1+Math.sin(t*6+i)*0.025*(1+cruise.velocity));
  });

  engineLights.forEach((e,i)=>{
    const flicker=0.85+Math.sin(t*8.5+i*2.1)*0.12+Math.sin(t*21+i)*0.05;
    e.light.intensity=e.base*flicker*(1+cruise.velocity*0.35);
  });

  navLights.forEach((n,i)=>{n.visible=Math.sin(t*3.2+i*Math.PI)>0;});
  runningLights.forEach((l,i)=>{l.visible=Math.sin(t*2.6+i*1.4)>-0.2;});
}
