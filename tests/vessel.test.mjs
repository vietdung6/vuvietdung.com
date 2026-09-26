import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVessel,CABIN} from '../js/vessel.js';
const canvas=()=>({width:1,height:1,getContext:()=>new Proxy({},{get:()=>()=>{}})});
const vessel=createVessel(canvas);
const eye=new THREE.Vector3(...CABIN.eye);
function cast(direction,objects,max=30,origin=eye){return new THREE.Raycaster(origin,new THREE.Vector3(...direction).normalize(),.001,max).intersectObjects(objects);}
test('pilot eye and all cabin panes belong to the one vessel',()=>{
 assert.equal(vessel.pilot.parent,vessel.root);
 assert.ok(eye.z>CABIN.front&&eye.z<CABIN.rear);
 assert.ok(eye.y>CABIN.floor&&eye.y<CABIN.roof);
 assert.equal(vessel.panes.length,3);
 for(const pane of vessel.panes)assert.equal(pane.parent,vessel.root);
});
test('pilot sees through windshield without an opaque wall in front',()=>{
 for(const dx of [-.16,0,.16]){
  assert.equal(cast([dx,0,-1],vessel.opaque).length,0);
  assert.equal(cast([dx,0,-1],vessel.panes)[0]?.object.name,'windshield');
 }
});
test('six principal directions are enclosed by a shared pane or pressure wall',()=>{
 for(const d of [[0,0,-1],[0,0,1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]])assert.ok(cast(d,[...vessel.opaque,...vessel.panes],8).length>0,`enclosure missing at ${d}`);
});
test('outside and inside cameras see the same windshield mesh',()=>{
 const inner=cast([0,0,-1],vessel.panes)[0];
 const outer=cast([0,0,1],vessel.panes,10,new THREE.Vector3(0,1.65,-10))[0];
 assert.equal(inner.object,outer.object);
 assert.equal(inner.object.material.side,THREE.DoubleSide);
});
test('throttle and cabin switch alter the physical ship',()=>{
 vessel.update(0,false,0);
 assert.ok(vessel.cabinLights.every(l=>l.intensity===0));
 const plume=vessel.root.getObjectByName('exhaust-1'),short=plume.scale.z;
 vessel.update(1,true,0);
 assert.ok(plume.scale.z>short*3);
 assert.ok(vessel.cabinLights.every(l=>l.intensity>0));
});
