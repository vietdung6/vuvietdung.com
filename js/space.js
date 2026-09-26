// An orthographic ray-traced gas giant, rendered once, with real ring occlusion.
// This backdrop and the ship's Canvas renderer also work when WebGL is unavailable.
export function makePlanet(canvas) {
  const size=1024;canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'), img=ctx.createImageData(size,size),data=img.data;
  const R=.47, R2=R*R, N=[.30,.78,.55], L=[.954,.21,-.213];
  const nl=N[0]*L[0]+N[1]*L[1]+N[2]*L[2];
  for(let iy=0;iy<size;iy++)for(let ix=0;ix<size;ix++){
    const x=(ix/(size-1)-.5)*2.28,y=(.5-iy/(size-1))*2.28;
    const rr=x*x+y*y, sphere=rr<R2,z=sphere?Math.sqrt(R2-rr):-10;
    const rz=-(N[0]*x+N[1]*y)/N[2],r=Math.sqrt(rr+rz*rz),ring=r>.62&&r<1.08;
    let red=0,green=0,blue=0,alpha=0;
    if(sphere){
      const lat=y/R,lon=Math.atan2(x,z);
      const warp=lat+.009*Math.sin(lon*9+lat*13)+.004*Math.sin(lon*23-lat*28);
      const bands=.64+.12*Math.sin(warp*71)+.06*Math.sin(warp*193)+.045*Math.sin(warp*401);
      const grain=(Math.sin(ix*12.9898+iy*78.233)*43758.5453)%1;
      const lambert=Math.max(0,(x*L[0]+y*L[1]+z*L[2])/R);
      let light=.055+lambert*.96;
      const t=-(x*N[0]+y*N[1]+z*N[2])/nl;
      if(t>0){const sx=x+t*L[0],sy=y+t*L[1],sz=z+t*L[2],sr=Math.hypot(sx,sy,sz);if(sr>.62&&sr<1.08)light*=.25;}
      const rim=Math.pow(1-z/R,6)*Math.max(0,lambert)*.55;
      red=(185*bands+grain*2)*light+100*rim;
      green=(174*bands+grain*2)*light+113*rim;
      blue=(142*bands+grain*2)*light+112*rim;alpha=255;
    } else if(rr<R2*1.035){
      const limb=Math.exp(-(Math.sqrt(rr)-R)*230), lit=Math.max(.02,(x*L[0]+y*L[1])/R);
      red=151;green=164;blue=143;alpha=limb*lit*85;
    }
    if(ring&&(!sphere||rz>z)){
      const gap=r>.853&&r<.867;
      let intensity=(.38+.14*Math.sin(r*260)+.07*Math.sin(r*640))*(gap?.06:1);
      intensity*=Math.min(1,(r-.62)*35,(1.08-r)*30);
      const b=x*L[0]+y*L[1]+rz*L[2],disc=b*b-(r*r-R2);
      if(disc>0&&-b-Math.sqrt(disc)>0)intensity*=.07;
      const a=Math.min(.85,Math.max(.025,intensity));
      red=red*(1-a)+190*a;green=green*(1-a)+168*a;blue=blue*(1-a)+123*a;
      alpha=sphere?255:Math.max(alpha,a*235);
    }
    const i=(iy*size+ix)*4;data[i]=red;data[i+1]=green;data[i+2]=blue;data[i+3]=alpha;
  }
  ctx.putImageData(img,0,0);return canvas;
}
export function createSpace(canvas, makeCanvas=()=>document.createElement('canvas')) {
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  const planet=makePlanet(makeCanvas());let seed=173, travel=0,w=1,h=1,dpr=1;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const stars=Array.from({length:700},()=>({x:(random()-.5)*2400,y:(random()-.5)*1800,z:(random()-.5)*2400,r:.35+random()*.9,a:.13+random()*.5}));
  function resize(width,height,ratio){w=width;h=height;dpr=ratio;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  function project(x,y,z,m){const k=m[3]*x+m[7]*y+m[11]*z+m[15];if(k<=0)return null;return{x:(1+(m[0]*x+m[4]*y+m[8]*z+m[12])/k)*w/2,y:(1-(m[1]*x+m[5]*y+m[9]*z+m[13])/k)*h/2,k};}
  function render(camera,matrix,dt,throttle,reduced){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#080c0c';ctx.fillRect(0,0,w,h);
    if(!reduced)travel+=dt*(.7+throttle*8);
    const m=matrix.elements;
    for(const s of stars){const z=((s.z+travel+1200)%2400)-1200,p=project(s.x,s.y,z,m);if(!p||p.x<0||p.x>w||p.y<0||p.y>h)continue;
      ctx.fillStyle=`rgba(204,212,192,${s.a})`;ctx.fillRect(p.x,p.y,s.r,s.r*(1+throttle*.3));}
    const p=project(-50,2,-160,m);
    if(p){const radius=(h*.5/Math.tan(camera.fov*Math.PI/360))*64/p.k,size=radius*(2.28/.47);ctx.drawImage(planet,p.x-size/2,p.y-size/2,size,size);}
  }
  return{resize,render};
}
