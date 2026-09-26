import * as THREE from 'three';

// Metres, +Y up, -Z forward. Everything is built in this one coordinate system.
export const CABIN = Object.freeze({ front: -6.3, rear: -1.25, width: 4.8, floor: .12, roof: 2.86, eye: [0, 1.65, -2.55] });
export function createVessel(makeCanvas = () => document.createElement('canvas')) {
  const root = new THREE.Group(); root.name = 'VIEN-DU-07';
  const opaque = [], panes = [], engineGlows = [], plumes = [], cabinLights = [];
  const mat = (color, roughness=.72, metalness=.2) => new THREE.MeshStandardMaterial({color,roughness,metalness});
  const cream = mat('#bcb8a4'), light = mat('#ded7c0'), dark = mat('#222c29'), black = mat('#111b19');
  const metal = mat('#74776b',.4,.65), rubber = mat('#303a32',.95,0), orange = mat('#b7773f');
  const glow = new THREE.MeshBasicMaterial({color:'#e2b981'});
  const glass = new THREE.MeshStandardMaterial({color:'#819c92',roughness:.16,metalness:.08,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false});
  const boxGeometry = new THREE.BoxGeometry(1,1,1);
  function mesh(geometry, material, name, x=0,y=0,z=0) {
    const m = new THREE.Mesh(geometry,material); m.name=name; m.position.set(x,y,z); root.add(m);
    if (!material.transparent) opaque.push(m); return m;
  }
  function box(name, w,h,d,x,y,z,material=cream) { const m=mesh(boxGeometry,material,name,x,y,z);m.scale.set(w,h,d);return m; }
  function cylinder(name, r1,r2,length,x,y,z,material=dark,segments=16) {
    const geo = new THREE.CylinderGeometry(r1,r2,length,segments,1);geo.rotateX(Math.PI/2);
    return mesh(geo,material,name,x,y,z);
  }
  function quad(name, vertices, material) {
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
    return mesh(geo,material,name);
  }
  function strut(name,a,b,r=.07,material=metal) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b), delta=end.clone().sub(start);
    const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material,name);
    m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  function pressureHull() {
    const stations=[[-8.0,.8,.03,-.52],[-6.3,2.4,.03,-1.0],[-1.2,2.4,.03,-1.0],[.1,2.65,2.15,-1.0],[6.1,2.55,1.9,-.9],[7.1,2.2,1.65,-.6]];
    const vertices=[];for(const [z,w,t,b] of stations) vertices.push(...[[-w*.8,b],[w*.8,b],[w,b+.2],[w,t-.18],[w*.8,t],[-w*.8,t],[-w,t-.18],[-w,b+.2]].flatMap(([x,y])=>[x,y,z]));
    const indices=[];for(let k=0;k<stations.length-1;k++)for(let j=0;j<8;j++){const a=k*8+j,b=k*8+(j+1)%8,c=b+8,d=a+8;indices.push(a,b,c,a,c,d);}
    for(let j=1;j<7;j++){indices.push(0,j+1,j);const last=(stations.length-1)*8;indices.push(last,last+j,last+j+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const hull=mesh(geo.toNonIndexed(),cream,'pressure-hull');hull.material=cream.clone();hull.material.flatShading=true;
  }
  pressureHull();
  box('belly-keel',1.9,.16,11.5,0,-1.02,.0,dark);
  box('nose-sensor',1.08,.34,.32,0,-.1,-8.02,dark);
  box('sensor-aperture',.42,.08,.03,0,-.04,-8.2,glow);

  // Enclosure: single floor, roof, rear wall, and shared panes seen by both cameras.
  box('cabin-deck',4.8,.18,5.05,0,.12,-3.78,dark);
  box('cabin-roof',4.96,.19,4.74,0,2.86,-3.54,cream);
  box('rear-bulkhead',4.8,2.72,.16,0,1.48,CABIN.rear,cream);
  box('cabin-door',1.1,2.1,.04,0,1.26,CABIN.rear-.10,dark);
  box('door-handle',.04,.24,.05,.42,1.2,CABIN.rear-.14,metal);
  box('front-sill',4.94,.18,.18,0,.83,CABIN.front,cream);
  box('front-brow',5.0,.20,.28,0,2.72,CABIN.front+.5,cream);
  for(const side of [-1,1]) {
    box(`lower-wall-${side}`,.16,.66,5.05,side*2.4,.50,-3.78,cream);
    box(`window-bottom-${side}`,.16,.11,5.05,side*2.4,.85,-3.78,metal);
    box(`window-top-${side}`,.16,.14,4.55,side*2.4,2.73,-3.53,cream);
    strut(`forward-frame-${side}`,[side*2.4,.85,CABIN.front],[side*2.4,2.73,CABIN.front+.5],.08,cream);
    for(const z of [-3.55,CABIN.rear])box(`window-post-${side}-${z}`,.13,1.88,.13,side*2.4,1.78,z,cream);
    panes.push(quad(`side-glass-${side}`,[[side*2.39,.88,CABIN.front],[side*2.39,.88,CABIN.rear],[side*2.39,2.65,CABIN.rear],[side*2.39,2.65,CABIN.front+.5]],glass));
    box(`ceiling-light-${side}`,.04,.025,3.8,side*1.75,2.74,-3.85,glow);
    const lamp=new THREE.PointLight('#ffd0a0',5,7,2);lamp.position.set(side*1.7,2.46,-4.3);root.add(lamp);cabinLights.push(lamp);
    box(`side-console-${side}`,.46,.34,2.1,side*1.98,.58,-4.40,dark);
    for(let j=0;j<6;j++)box(`switch-${side}-${j}`,.10,.06,.11,side*1.98,.79,-5.13+j*.28,j%3===0?glow:metal);
  }
  panes.push(quad('windshield',[[-2.36,.89,CABIN.front], [2.36,.89,CABIN.front],[2.36,2.64,CABIN.front+.5],[-2.36,2.64,CABIN.front+.5]],glass));
  for(const x of [-1.33,1.33])box(`front-post-${x}`,.055,1.84,.13,x,1.77,CABIN.front+.25,metal).rotation.x=.278;

  // Instruments are below the pilot's sight line; no opaque hull crosses the view.
  box('dashboard',4.42,.26,.92,0,.69,-5.66,dark);
  box('dash-trim',4.48,.045,.055,0,.83,-5.18,metal);
  box('pilot-seat',1.04,.22,.92,0,.40,-2.27,rubber);
  box('seat-back',1.04,1.14,.21,0,1.04,-1.72,rubber);
  box('headrest',.64,.31,.20,0,1.72,-1.73,rubber);
  for(const side of [-1,1])box(`armrest-${side}`,.15,.13,1.1,side*.66,.74,-2.48,dark);
  const lever=box('throttle-handle',.10,.30,.14,-.66,.94,-2.82,metal);
  box('throttle-cap',.19,.12,.18,-.66,1.10,-2.82,dark);
  cylinder('joystick',.05,.065,.36,.66,1.0,-2.90,metal,8).rotation.x=Math.PI/2;

  const displayCanvas=makeCanvas();displayCanvas.width=1024;displayCanvas.height=256;
  const ctx=displayCanvas.getContext('2d');
  const displayTexture=new THREE.CanvasTexture(displayCanvas);displayTexture.colorSpace=THREE.SRGBColorSpace;
  const screenMaterial=new THREE.MeshBasicMaterial({map:displayTexture,color:'#ffffff'});
  const screen=mesh(new THREE.PlaneGeometry(3.45,.86),screenMaterial,'flight-display',0,.83,-5.65);screen.rotation.x=-.40*Math.PI;
  function drawDisplay(throttle,lights,time=0){
    ctx.fillStyle=lights?'#111c16':'#080d0b';ctx.fillRect(0,0,1024,256);
    ctx.strokeStyle='#6f745040';ctx.lineWidth=1;for(let x=0;x<1024;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
    ctx.fillStyle=lights?'#ddb67a':'#625338';ctx.font='18px monospace';ctx.fillText('VIEN DU / 07',26,35);ctx.fillText('MAIN DRIVE',386,35);ctx.fillText('OXYTOCIN',778,35);
    ctx.font='62px monospace';ctx.fillText(String(Math.round(throttle*100)).padStart(2,'0')+'%',383,126);
    ctx.font='16px monospace';ctx.fillText('THRUST',388,155);ctx.fillText('MISSION ARCHIVE',775,82);ctx.fillText('VU VIET DUNG',775,113);ctx.fillText('SIGNAL STABLE',775,187);
    ctx.strokeStyle=lights?'#cca769':'#615239';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(150,140,91,49,-.32,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(150,140,30,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();for(let x=386;x<706;x+=3){const y=205+Math.sin(x*.075+time)*8*(.2+throttle);x===386?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
    ctx.fillStyle=lights?'#bba770':'#544c33';ctx.fillRect(780,211,198*throttle,4);
    displayTexture.needsUpdate=true;
  }
  drawDisplay(.28,true);

  // Service body and radiator booms, designed around the same pressure hull.
  box('dorsal-service-spine',1.3,.24,5.1,0,2.15,3.05,dark);
  for(const z of [.5,2.7,5.3])box(`service-strap-${z}`,5.2,.09,.17,0,2.04,z,metal);
  for(const side of [-1,1]) {
    box(`hull-stripe-${side}`,.018,.25,5.6,side*2.655,.60,2.6,orange);
    box(`engine-mount-${side}`,1.2,.46,4.8,side*2.7,-.2,4.6,metal);
    cylinder(`engine-case-${side}`,.77,.77,3.8,side*3.03,-.10,5.9,cream);
    cylinder(`engine-band-${side}`,.80,.80,.36,side*3.03,-.10,5.35,dark);
    cylinder(`engine-nozzle-${side}`,.66,.83,1.1,side*3.03,-.10,8.20,black);
    const ring=mesh(new THREE.TorusGeometry(.62,.055,6,20),metal,`nozzle-lip-${side}`,side*3.03,-.10,8.78);
    const nozzle=mesh(new THREE.CircleGeometry(.58,20),new THREE.MeshBasicMaterial({color:'#ffc18c'}),`engine-glow-${side}`,side*3.03,-.10,8.79);engineGlows.push(nozzle);
    const plumeMaterial=new THREE.MeshBasicMaterial({color:'#e5a56e',transparent:true,opacity:.08,depthWrite:false,side:THREE.DoubleSide});
    const plume=cylinder(`exhaust-${side}`,.82,.48,4.3,side*3.03,-.10,10.94,plumeMaterial,12);plumes.push(plume);
    box(`radiator-boom-${side}`,4.8,.16,.18,side*4.4,.16,2.15,metal);
    const radiator=box(`radiator-${side}`,4.8,.11,3.8,side*5.38,.18,2.25,black);radiator.rotation.z=side*.10;
    for(let j=0;j<13;j++)box(`radiator-fin-${side}-${j}`,.10,.16,3.86,side*(3.08+j*.38),.21,2.25,metal).rotation.z=side*.10;
    for(const z of [.26,4.23])box(`radiator-edge-${side}-${z}`,4.98,.12,.11,side*5.38,.26,z,cream);
    strut(`radiator-support-${side}`,[side*2.2,-.75,.4],[side*6.7,.12,2.7],.08);
    box(`rcs-pack-${side}`,.40,.42,.88,side*2.48,.35,-5.6,light);
    cylinder(`rcs-nozzle-${side}`,.085,.12,.10,side*2.49,.34,-6.1,black,8);
    box(`running-lamp-${side}`,.07,.055,.25,side*7.83,.32,1.0,glow);
  }
  strut('antenna-mast',[1.1,2.12,2.1],[1.1,3.85,2.1],.055);
  strut('antenna-yagi',[-.1,3.6,2.1],[2.2,3.6,2.1],.027);
  for(let i=0;i<4;i++)strut(`antenna-element-${i}`,[-.05+i*.62,3.6,1.73],[-.05+i*.62,3.6,2.47],.017);
  box('rear-service-door',1.6,1.3,.035,0,.5,7.12,dark);
  box('rear-service-handle',.45,.055,.08,0,.3,7.17,metal);
  // Readable identification, rendered once onto the hull.
  const decalCanvas=makeCanvas();decalCanvas.width=512;decalCanvas.height=256;const dc=decalCanvas.getContext('2d');
  dc.fillStyle='#bcb8a4';dc.fillRect(0,0,512,256);dc.fillStyle='#36403a';dc.font='bold 135px sans-serif';dc.fillText('07',34,143);dc.font='23px monospace';dc.fillText('VIEN DU / SURVEY',39,188);dc.fillStyle='#906336';dc.fillRect(38,215,410,7);
  const decalTexture=new THREE.CanvasTexture(decalCanvas);decalTexture.colorSpace=THREE.SRGBColorSpace;
  const decal=mesh(new THREE.PlaneGeometry(1.85,.93),new THREE.MeshBasicMaterial({map:decalTexture}),'registry',0,2.18,3.20);decal.rotation.x=-Math.PI/2;

  const pilot=new THREE.Object3D();pilot.name='pilot-eye';pilot.position.set(...CABIN.eye);root.add(pilot);
  function update(throttle,lights,t) {
    for(const lamp of cabinLights)lamp.intensity=lights?5:0;
    for(const m of engineGlows)m.material.color.setRGB(.28+.7*throttle,.13+.48*throttle,.045+.25*throttle);
    for(const m of plumes){m.scale.z=.35+throttle*1.35;m.position.z=8.79+2.15*m.scale.z;m.material.opacity=.025+.09*throttle;}
    lever.rotation.x=throttle*.4;
  }
  root.updateMatrixWorld(true);
  return {root, pilot, opaque, panes, cabinLights, update, drawDisplay};
}
