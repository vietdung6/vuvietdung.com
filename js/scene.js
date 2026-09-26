import * as THREE from 'three';
import { createVessel } from './vessel.js';
import { createSpace } from './space.js';
import { createSoftwareRenderer } from './software-renderer.js';

export function createExperience(initial) {
  const state={...initial},scene=new THREE.Scene(),vessel=createVessel();scene.add(vessel.root);
  const camera=new THREE.PerspectiveCamera(40,1,.06,3000),projection=new THREE.Matrix4();
  let canvas=document.getElementById('vessel'),renderer,w=1,h=1,mobile=false,pixelRatio=1,dirty=true,raf=0,last=0,time=0,lastDraw=0,lastDisplay=-1;
  const orbit={yaw:.45,pitch:.20,distance:32,targetYaw:.45,targetPitch:.20,targetDistance:32};
  const head={x:0,y:0,targetX:0,targetY:0};
  scene.add(new THREE.HemisphereLight('#cad9cb','#152522',1.25));
  const sun=new THREE.DirectionalLight('#ffe5b3',3.2);sun.position.set(-10,16,12);scene.add(sun);
  const rim=new THREE.DirectionalLight('#adc3c1',1.15);rim.position.set(5,8,-16);scene.add(rim);
  const space=createSpace(document.getElementById('space'));
  const eye=new THREE.Vector3(),look=new THREE.Vector3();
  function makeRenderer(){
    let context=null;
    try{context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'default'});}catch{/* Canvas fallback below. */}
    if(context){
      try{
        const gl=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});gl.setClearColor(0,0);gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.02;
        renderer={kind:'webgl',resize(width,height,ratio){gl.setPixelRatio(ratio);gl.setSize(width,height,false);},render(){gl.render(scene,camera);},dispose(){gl.dispose();}};
        return;
      }catch{const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;}
    }
    renderer=createSoftwareRenderer(canvas,vessel.root);
  }
  makeRenderer();
  function resize(){
    w=window.innerWidth;h=window.innerHeight;const wasMobile=mobile;mobile=w<=760;
    if(mobile!==wasMobile){orbit.distance=orbit.targetDistance=mobile?40:32;}
    pixelRatio=Math.min(window.devicePixelRatio||1,renderer.kind==='canvas'?1.25:1.6);
    renderer.resize(w,h,pixelRatio);space.resize(w,h,Math.min(pixelRatio,1.5));
    camera.aspect=w/h;camera.fov=state.view==='cockpit'?(mobile?76:65):(mobile?55:40);
    camera.clearViewOffset();
    if(state.view==='exterior')camera.setViewOffset(w,h,mobile?0:-w*.17,-h*(mobile?.16:.04),w,h);
    camera.updateProjectionMatrix();dirty=true;
  }
  const pointers=new Map();let pinch=0;
  function bindCanvas(){
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);e.preventDefault();});
    canvas.addEventListener('pointermove',e=>{
      const prev=pointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch&&state.view==='exterior')orbit.targetDistance=THREE.MathUtils.clamp(orbit.targetDistance*pinch/distance,mobile?28:23,65);pinch=distance;}
      else if(state.view==='exterior'){orbit.targetYaw-=dx*.006;orbit.targetPitch=THREE.MathUtils.clamp(orbit.targetPitch+dy*.005,-.22,1.15);}
      else{head.targetX=THREE.MathUtils.clamp(head.targetX-dx*.0035,-.62,.62);head.targetY=THREE.MathUtils.clamp(head.targetY+dy*.0035,-.36,.29);}
      dirty=true;
    });
    const release=e=>{pointers.delete(e.pointerId);pinch=0;};
    for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
    canvas.addEventListener('wheel',e=>{if(state.view!=='exterior')return;e.preventDefault();orbit.targetDistance=THREE.MathUtils.clamp(orbit.targetDistance+e.deltaY*.025,mobile?28:23,65);dirty=true;},{passive:false});
    canvas.addEventListener('webglcontextlost',e=>{
      e.preventDefault();pointers.clear();const next=canvas.cloneNode();canvas.replaceWith(next);canvas=next;
      renderer.dispose();renderer=createSoftwareRenderer(canvas,vessel.root);document.body.dataset.renderer=renderer.kind;bindCanvas();resize();
    });
  }
  bindCanvas();
  function positionCamera(dt){
    const ease=state.reduced?1:1-Math.exp(-dt*12);
    if(state.view==='exterior'){
      orbit.yaw+=(orbit.targetYaw-orbit.yaw)*ease;orbit.pitch+=(orbit.targetPitch-orbit.pitch)*ease;orbit.distance+=(orbit.targetDistance-orbit.distance)*ease;
      camera.position.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*orbit.distance,Math.sin(orbit.pitch)*orbit.distance+.7,Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*orbit.distance);
      camera.lookAt(0,.7,0);
    }else{
      head.x+=(head.targetX-head.x)*ease;head.y+=(head.targetY-head.y)*ease;
      vessel.pilot.getWorldPosition(eye);camera.position.copy(eye);
      look.set(Math.sin(head.x)*8,Math.sin(head.y)*8-.15,-Math.cos(head.x)*8).applyQuaternion(vessel.root.quaternion).add(eye);camera.lookAt(look);
    }
    camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  }
  let renderedFrames=0,frameCost=0;
  function frame(now){
    raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||.016,.05);last=now;
    if(!state.reduced)time+=dt;
    const settling=Math.abs(orbit.targetYaw-orbit.yaw)+Math.abs(orbit.targetPitch-orbit.pitch)+Math.abs(orbit.targetDistance-orbit.distance)+Math.abs(head.x-head.targetX)+Math.abs(head.y-head.targetY)>.001;
    if(state.reduced&&!dirty&&!settling)return;
    if(renderer.kind==='canvas'&&now-lastDraw<32&&!dirty)return;
    const drawDt=Math.min((now-lastDraw)/1000||.033,.08);lastDraw=now;const start=performance.now();
    vessel.root.position.y=state.reduced?0:Math.sin(time*.25)*.045;
    vessel.root.rotation.z=state.reduced?0:Math.sin(time*.21)*.006;
    vessel.update(state.throttle,state.light,time);vessel.root.updateMatrixWorld(true);
    positionCamera(dt);
    if(dirty||time-lastDisplay>.5){vessel.drawDisplay(state.throttle,state.light,state.reduced?0:time);lastDisplay=time;}
    space.render(camera,projection,drawDt,state.throttle,state.reduced);
    renderer.render(camera,state.view==='cockpit',state.light);
    dirty=false;
    if(renderer.kind==='webgl'){
      frameCost+=performance.now()-start;renderedFrames++;
      if(renderedFrames===120){if(frameCost/renderedFrames>22&&pixelRatio>1){pixelRatio=1;renderer.resize(w,h,pixelRatio);space.resize(w,h,pixelRatio);}frameCost=0;renderedFrames=0;}
    }
  }
  function start(){if(raf)return;last=performance.now();dirty=true;raf=requestAnimationFrame(frame);}
  function pause(){cancelAnimationFrame(raf);raf=0;}
  document.addEventListener('visibilitychange',()=>document.hidden?pause():start());
  window.addEventListener('resize',resize);
  resize();positionCamera(.016);start();
  return{
    get kind(){return renderer.kind;},
    setView(view){state.view=view;head.x=head.y=head.targetX=head.targetY=0;pointers.clear();pinch=0;resize();positionCamera(1);},
    setThrottle(value){state.throttle=value;dirty=true;},
    setLight(on){state.light=on;dirty=true;},
    setReduced(value){state.reduced=value;dirty=true;}
  };
}
