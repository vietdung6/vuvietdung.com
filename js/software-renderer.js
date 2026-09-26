import * as THREE from 'three';
// Rasterises the exact same meshes with a depth buffer when WebGL is unavailable.
// Perspective-correct textures and near-plane clipping keep the cabin enclosed.
export function createSoftwareRenderer(canvas,root) {
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas renderer unavailable');
  const items=[];root.traverse(mesh=>{if(mesh.isMesh)items.push({mesh,position:mesh.geometry.attributes.position,uv:mesh.geometry.attributes.uv,index:mesh.geometry.index});});
  const view=new THREE.Matrix4(), normalMatrix=new THREE.Matrix3(), color=new THREE.Color(), light=new THREE.Vector3(-.35,.75,.55).normalize(),textureCache=new WeakMap();
  let w=1,h=1,buffer,depth;
  function resize(width,height){const scale=Math.min(1,1080/width);w=Math.max(1,Math.round(width*scale));h=Math.max(1,Math.round(height*scale));canvas.width=w;canvas.height=h;buffer=ctx.createImageData(w,h);depth=new Float32Array(w*h);}
  function clip(poly,near){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=a.z<=-near,bi=b.z<=-near;if(ai)out.push(a);if(ai!==bi){const t=(-near-a.z)/(b.z-a.z);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:-near,u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});}}return out;}
  function texture(map){if(!map?.image)return null;let t=textureCache.get(map);if(!t||t.version!==map.version){const image=map.image;t={width:image.width,height:image.height,data:image.getContext('2d').getImageData(0,0,image.width,image.height).data,version:map.version};textureCache.set(map,t);}return t;}
  function render(camera,inside,lights){
    const pixels=buffer.data;pixels.fill(0);depth.fill(0);const transparent=[],pe=camera.projectionMatrix.elements;
    function raster(points,rgb,opacity,map){
      const [a,b,c]=points,area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(area)<.0001)return;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(w-1,Math.ceil(Math.max(a.x,b.x,c.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(h-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      const az=1/-a.z,bz=1/-b.z,cz=1/-c.z;
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const px=x+.5,py=y+.5,wa=((b.x-px)*(c.y-py)-(b.y-py)*(c.x-px))/area,wb=((c.x-px)*(a.y-py)-(c.y-py)*(a.x-px))/area,wc=1-wa-wb;
        if(wa<-.00001||wb<-.00001||wc<-.00001)continue;
        const iz=wa*az+wb*bz+wc*cz,j=y*w+x;if(iz<depth[j]-1e-7)continue;
        let r=rgb[0],g=rgb[1],bcolor=rgb[2],alpha=opacity;
        if(map){const u=(wa*a.u*az+wb*b.u*bz+wc*c.u*cz)/iz,v=(wa*a.v*az+wb*b.v*bz+wc*c.v*cz)/iz,tx=Math.max(0,Math.min(map.width-1,Math.round(u*(map.width-1)))),ty=Math.max(0,Math.min(map.height-1,Math.round((1-v)*(map.height-1)))),k=(ty*map.width+tx)*4;r=map.data[k];g=map.data[k+1];bcolor=map.data[k+2];alpha*=map.data[k+3]/255;}
        const k=j*4;if(alpha>=.999){pixels[k]=r;pixels[k+1]=g;pixels[k+2]=bcolor;pixels[k+3]=255;depth[j]=iz;}
        else if(alpha>0){const da=pixels[k+3]/255,outA=alpha+da*(1-alpha);pixels[k]=(r*alpha+pixels[k]*da*(1-alpha))/outA;pixels[k+1]=(g*alpha+pixels[k+1]*da*(1-alpha))/outA;pixels[k+2]=(bcolor*alpha+pixels[k+2]*da*(1-alpha))/outA;pixels[k+3]=outA*255;}
      }
    }
    for(const {mesh,position,index,uv} of items){
      if(!mesh.visible)continue;const material=mesh.material;if(material.opacity<.001)continue;
      view.multiplyMatrices(camera.matrixWorldInverse,mesh.matrixWorld);normalMatrix.getNormalMatrix(mesh.matrixWorld);
      const ve=view.elements,count=index?index.count:position.count,map=texture(material.map);
      for(let k=0;k<count;k+=3){
        const ids=index?[index.getX(k),index.getX(k+1),index.getX(k+2)]:[k,k+1,k+2],local=ids.map(i=>({x:position.getX(i),y:position.getY(i),z:position.getZ(i),u:uv?uv.getX(i):0,v:uv?uv.getY(i):0}));
        const [a,b,c]=local,normal=new THREE.Vector3().crossVectors(new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z),new THREE.Vector3(c.x-a.x,c.y-a.y,c.z-a.z)).applyMatrix3(normalMatrix).normalize();
        const poly=clip(local.map(v=>({x:ve[0]*v.x+ve[4]*v.y+ve[8]*v.z+ve[12],y:ve[1]*v.x+ve[5]*v.y+ve[9]*v.z+ve[13],z:ve[2]*v.x+ve[6]*v.y+ve[10]*v.z+ve[14],u:v.u,v:v.v})),camera.near);if(poly.length<3)continue;
        const projected=poly.map(p=>({...p,x:(1+(pe[0]*p.x+pe[8]*p.z)/-p.z)*w/2,y:(1-(pe[5]*p.y+pe[9]*p.z)/-p.z)*h/2}));
        const strength=material.isMeshBasicMaterial?1:(inside?(lights?.46:.12):.24)+Math.max(0,normal.dot(light))*.64;
        color.copy(material.color).multiplyScalar(strength).convertLinearToSRGB();const rgb=[color.r*255,color.g*255,color.b*255];
        for(let i=1;i<projected.length-1;i++){
          const points=[projected[0],projected[i],projected[i+1]],[pa,pb,pc]=points,area=(pb.x-pa.x)*(pc.y-pa.y)-(pb.y-pa.y)*(pc.x-pa.x);
          if(material.side!==THREE.DoubleSide&&area>=0)continue;
          if(material.transparent)transparent.push({points,rgb,opacity:material.opacity,map,z:pa.z+pb.z+pc.z});else raster(points,rgb,1,map);
        }
      }
    }
    transparent.sort((a,b)=>a.z-b.z);for(const t of transparent)raster(t.points,t.rgb,t.opacity,t.map);
    ctx.putImageData(buffer,0,0);
  }
  return{kind:'canvas',resize,render,dispose(){}};
}
