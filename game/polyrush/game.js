'use strict';
(()=>{
/* ---------- setup ---------- */
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),sst=t=>t*t*(3-2*t);
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v)};
const Z0=8,TP=.88,ZP=Z0*(1/TP-1),TMIN=.035,STEP=2,MAXV=70,CS=.0016,SEG=500,MP=2000,LANES=[-.75,-.25,.25,.75],MAXREL=Z0*(1/TMIN-1);
const COLORS=[[210,70,48],[48,90,52],[140,50,38],[275,50,45],[18,85,52],[190,70,42],[210,10,82],[330,65,52],[300,80,48],[175,90,40]];
const T0=Math.max(0,+new URLSearchParams(location.search).get('t')||0); // ?t=50 starts a run at score 50 (testing only, best time is not saved)
/* ---------- day/night system: driven by score (seconds survived) ----------
   keyframes at score 0 / 15 / 30 / 45 / 60+ ->
   skyTop(0) skyBottom(3) fog(6) ground(9) asphalt(12) buildings(15) tint(18) ambient(21) darkness(22) */
const KF=[
 [48,128,208, 186,226,245, 196,228,245, 88,110,108, 88,94,106, 92,120,150, 1,1,1, 1,0],
 [70,124,196, 255,222,170, 255,214,170, 112,110,100, 102,100,106, 118,120,148, 1,.95,.88, .9,.08],
 [96,64,150, 255,132,86, 255,140,100, 92,70,84, 86,74,92, 96,72,112, 1,.8,.78, .72,.35],
 [30,28,78, 170,62,118, 150,60,120, 30,28,52, 52,48,68, 44,40,76, .8,.78,1, .5,.7],
 [8,28,40, 74,36,92, 74,36,92, 10,14,30, 30,32,48, 18,26,48, .62,.72,1.1, .3,1]];
const PT=[0,15,30,45,60],PH=['Day','Afternoon','Sunset','Dusk','Night'],PAL=new Float32Array(23),LT=[1,1,1];
const NEON=[[255,45,149],[34,230,255],[255,70,60],[255,170,60]],GI=[2,3,1,4];
let AM=1,D=0,NL=0,HL=0,LC=[];   // ambient light, darkness, neon/lamp level, headlight level
function env(){let i=0;const t=G.t;while(i<3&&t>=PT[i+1])i++;
 const u=sst(clamp((t-PT[i])/(PT[i+1]-PT[i]),0,1)),a=KF[i],b=KF[i+1];for(let j=0;j<23;j++)PAL[j]=lerp(a[j],b[j],u);
 AM=PAL[21];D=PAL[22];NL=sst(clamp((D-.1)/.7,0,1));HL=sst(clamp((t-48)/12,0,1))}   // headlights fade in 48-60, full at night (60+)
const rgb=(o,k=1)=>`rgb(${PAL[o]*k|0},${PAL[o+1]*k|0},${PAL[o+2]*k|0})`,rga=(o,a)=>`rgba(${PAL[o]|0},${PAL[o+1]|0},${PAL[o+2]|0},${a})`;
const setLit=l=>{LT[0]=PAL[18]*l;LT[1]=PAL[19]*l;LT[2]=PAL[20]*l},sc=(r,g,b)=>`rgb(${clamp(r*LT[0],0,255)|0},${clamp(g*LT[1],0,255)|0},${clamp(b*LT[2],0,255)|0})`;
const hsl=(h,s,l)=>{s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return(l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255};return[f(0),f(8),f(4)]};
/* headlight beam strength at a world distance ahead of the player and a lateral lane position */
const beam=(dist,lat)=>{if(HL<=0||dist<-1)return 0;const u=G.x+G.vx*.012*dist,hw=clamp(.2+.009*dist,.2,.75);return HL*Math.exp(-dist/55)*clamp(1-Math.abs(lat-u)/hw,0,1)};
/* soft glow sprites: warm, red, magenta, cyan, amber */
const GLW=[[255,214,140],[255,40,36],[255,45,149],[34,230,255],[255,170,60]].map(([r,g,b])=>{const e=document.createElement('canvas');e.width=e.height=64;const x=e.getContext('2d'),q=x.createRadialGradient(32,32,0,32,32,32);
 q.addColorStop(0,`rgba(${r},${g},${b},1)`);q.addColorStop(.35,`rgba(${r},${g},${b},.4)`);q.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=q;x.fillRect(0,0,64,64);return e});
function glow(k,x,y,rx,ry,a){const c=ctx,ga=c.globalAlpha,op=c.globalCompositeOperation;c.globalCompositeOperation='lighter';c.globalAlpha=ga*clamp(a,0,1);c.drawImage(GLW[k],x-rx,y-ry,rx*2,ry*2);c.globalAlpha=ga;c.globalCompositeOperation=op}

/* ---------- neon city skyline (3 parallax layers) ---------- */
function genMtn(){return[0,1,2].map(L=>{const a=[],wr=[[40,90],[60,120],[80,170]][L],hr=[[.1,.3],[.14,.38],[.18,.4]][L];let x=0;
 while(x<MP){const w=rnd(wr[0],wr[1]);a.push({x:x+w/2,w,h:rnd(hr[0],hr[1]),vi:(Math.random()*3)|0,sp:Math.random()<.18?rnd(.03,.08):0,s:(Math.random()*999)|0});x+=w*rnd(.75,1)}return a})}
/* window lights + neon trim are pre-rendered once per layer, then blended additively by NL each frame */
function buildLights(){const NS=NEON.map(n=>n.join(','));
 LC=G.mt.map((layer,k)=>{const e=document.createElement('canvas');e.width=MP;e.height=Math.max(1,HY);const x=e.getContext('2d'),cs=[4,6,9][k];if(k)x.shadowBlur=3;
  for(const p of layer)for(const o of[0,-MP]){const L0=p.x-p.w/2+o,top=HY-p.h*H,cols=[['255,214,140','255,120,70'],['120,230,255','60,160,255'],['255,110,180','190,90,255']][p.s%3],nc=NS[(p.s>>2)%4];
   for(let r=0;top+4+r*cs*1.5<HY-cs;r++)for(let c=0;c<Math.floor(p.w/cs)-1;c++){const hv=hash(p.s*13+r*7.3+c*1.7+k);if(hv<.5)continue;x.fillStyle=x.shadowColor=`rgba(${cols[hv>.82?1:0]},${.3+hv*.55})`;x.fillRect(L0+cs*.5+c*cs,top+4+r*cs*1.5,cs*.55,cs*.8)}
   if(p.s%3){x.fillStyle=x.shadowColor=`rgba(${nc},.9)`;x.fillRect(L0,top,2,HY-top);x.fillRect(L0,top,p.w,2)}
   if(p.s%4===1){x.fillStyle=`rgba(${nc},.75)`;x.fillRect(L0+p.w*.2,top+(HY-top)*.2,p.w*.18,(HY-top)*.35)}
   if(p.sp){x.fillStyle='rgba(255,70,60,.95)';x.fillRect(L0+p.w/2-1.5,top-p.sp*H,3,3)}}
  return e})}

const LINES=Array.from({length:26},()=>{let a;do a=rnd(.04,.96)*Math.PI;while(Math.abs(a-Math.PI/2)<.4);return{a,p:Math.random()}});
let W,H,DPR,HY,ROAD,skyG,fogG,NR=0,RX,RW,RZ,RD,G,state='menu',best=loadBest(),last=performance.now();
const keys={},touch={};
function loadBest(){try{return parseFloat(localStorage.getItem('polyrush.best'))||0}catch(e){return 0}}
function resize(){
 DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
 HY=Math.round(H*.4);ROAD=Math.min(W*.46,H*.85);
 NR=Math.floor((H-(HY+TMIN*(H-HY)))/STEP);RX=new Float32Array(NR);RW=new Float32Array(NR);RZ=new Float32Array(NR);RD=new Float32Array(NR);
 if(G)buildLights();
}

/* ---------- game state ---------- */
function reset(){G={clock:0,t:T0,z:100,speed:45,x:.25,vx:0,tilt:0,traffic:[],parts:[],spawn:2.2,shake:0,dead:false,deadT:0,flash:0,rot:0,spin:0,hop:0,hv:0,bg:0,ctrl:[0,0,0],base:0,last:0,q:[],brake:false,newBest:false,mt:genMtn()};buildLights();env()}

/* ---------- road generation ---------- */
function pushCtrl(){
 const d=sst(clamp(G.t/120,0,1));let v;
 if(G.q.length)v=G.q.shift();
 else{const r=Math.random();
  if(r<.2)v=0;
  else{v=(Math.random()<.5?-1:1)*(.3+.7*Math.random())*(.5+.5*d);
   if(G.last*v<-.35)v=0;                      // never snap straight from a hard left to a hard right
   else if(Math.random()<.22)G.q.push(v*rnd(.8,1),v*rnd(.6,1));} // long sweeping turn
 }
 G.last=v;G.ctrl.push(v);
}
function curve(z){const k=Math.floor(z/SEG),i=k-G.base;while(G.ctrl.length<i+2)pushCtrl();return lerp(G.ctrl[i],G.ctrl[i+1],sst(z/SEG-k))}

/* ---------- particles ---------- */
function emit(x,y,vx,vy,life,size,col){const p=G.parts;if(p.length>90)p.shift();p.push({x,y,vx,vy,life,max:life,size,col})}
const pPos=()=>[W/2+G.x*.28*TP*ROAD,HY+TP*(H-HY)];

/* ---------- traffic ---------- */
function spawn(d){
 const z=G.z+MAXREL+12,lane=(Math.random()*4)|0,near=new Set();
 for(const c of G.traffic)if(Math.abs(c.z-z)<50)near.add(c.lane);
 if(near.has(lane)||near.size>=2)return;          // always leave at least two free lanes
 const m=pickModel();let spd=rnd(18,lerp(32,56,d));if(m.truck)spd=rnd(16,28);
 G.traffic.push({z,x:LANES[lane],lane,spd,m,col:COLORS[(Math.random()*COLORS.length)|0],pd:z-G.z});
}
function crash(){
 AU.crash();const g=G;g.dead=true;g.shake=1;g.flash=1;g.spin=(Math.random()<.5?-1:1)*rnd(3,5);g.hv=280;g.vx=rnd(-.5,.5);
 const[px,py]=pPos();for(let i=0;i<28;i++){const a=rnd(0,6.28),s=rnd(40,220);emit(px,py-20,Math.cos(a)*s,Math.sin(a)*s-90,rnd(.5,1.1),rnd(4,11),i%3?'90,90,96':'255,150,40')}
 if(!T0&&g.t>best){best=g.t;g.newBest=true;try{localStorage.setItem('polyrush.best',best)}catch(e){}}
 setBest();
}

/* ---------- update ---------- */
function update(dt){
 const g=G;g.clock+=dt;
 const play=state==='play'&&!g.dead,d=sst(clamp(g.t/120,0,1));
 let steer=0,up=0,dn=0,dr=0;
 if(play){steer=(keys.r||touch.r?1:0)-(keys.l||touch.l?1:0);up=keys.up||touch.up;dn=keys.dn||touch.dn;dr=keys.dr}
 if(state==='menu'){g.speed=48;g.x=.25+Math.sin(g.clock*.4)*.3;g.vx=Math.cos(g.clock*.4)*.12;g.tilt=g.vx/1.9}
 else if(g.dead){g.speed=Math.max(0,g.speed-70*dt);g.rot+=g.spin*dt*(g.speed>3?1:.2);g.x+=g.vx*dt*.5;g.vx*=.97;
  g.hop+=g.hv*dt;g.hv-=900*dt;if(g.hop<0){g.hop=0;g.hv=g.hv<-80?-g.hv*.35:0}
  g.deadT+=dt;if(g.deadT>1.3&&state==='play')gameOver()}
 else{
  const s0=g.speed/MAXV;
  if(up)g.speed+=26*clamp(1.08-s0,0,1)*dt*1.4;else if(dn)g.speed-=60*dt;else g.speed+=(36-g.speed)*dt*.4;
  g.speed=clamp(g.speed,12,MAXV);
  const sr=g.speed/MAXV,drift=dr&&sr>.5,c=curve(g.z);
  g.vx+=(steer*1.9*clamp(.25+sr*1.1,0,1.05)-g.vx)*Math.min(1,dt*(drift?3.5:9));
  g.x+=(g.vx-c*sr*sr*(drift?.8:.6))*dt;           // curves push the car outward
  const ax=Math.abs(g.x);
  if(ax>.9){g.speed=Math.max(22,g.speed-40*dt);g.shake=Math.max(g.shake,.12)}
  if(ax>1.03){g.x=Math.sign(g.x)*1.03;g.vx*=.3;g.shake=Math.max(g.shake,.3)}
  g.tilt+=(clamp(g.vx/1.9,-1,1)-g.tilt)*Math.min(1,dt*8);g.brake=!!dn;
  if(((drift&&Math.abs(g.vx)>.7)||ax>.9)&&Math.random()<.7){const[px,py]=pPos(),dust=ax>.9;emit(px+rnd(-30,30),py-4,rnd(-30,30),rnd(-40,-5),rnd(.4,.8),rnd(8,16),dust?'120,150,70':'235,235,240')}
  if(play)g.t+=dt;
 }
 for(const c of g.traffic)c.pd=c.z-g.z;
 g.z+=g.speed*dt;g.bg+=curve(g.z)*g.speed*dt*8;
 while(Math.floor((g.z-ZP)/SEG)-g.base>3){g.ctrl.shift();g.base++}
 if(play&&(g.spawn-=dt)<=0){g.spawn=lerp(1.5,.55,d)*rnd(.8,1.25);spawn(d)}
 const T=g.traffic;
 for(const c of T)c.z+=c.spd*dt;
 for(const a of T)for(const b of T)if(a!==b&&a.lane===b.lane&&b.z>a.z&&b.z-a.z<14){a.spd=Math.min(a.spd,b.spd);a.z=Math.min(a.z,b.z-12)}
 if(play)for(const c of T){const dz=c.z-g.z,m=c.m;
  if(Math.abs(c.x-g.x)<.12+.14*m.wf){const f=.9+m.l*.3;
   if((dz<f&&dz>-.6)||(c.pd>-.6&&dz<=-.6)||(c.pd<=-.6&&dz>=f)){crash();break}}}
 for(let i=T.length-1;i>=0;i--)if(T[i].z<g.z-16||T[i].z>g.z+300)T.splice(i,1);
 const P=g.parts;for(let i=P.length-1;i>=0;i--){const p=P[i];p.life-=dt;if(p.life<=0){P.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=60*dt}
 g.shake=Math.max(0,g.shake-dt*1.6);g.flash=Math.max(0,g.flash-dt*2.5);
 AU.update(dt);env();hud();
}

/* ---------- rendering ---------- */
function P(p,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();ctx.fill()}
const rr=(x,y,w,h,r)=>{ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)};
const mixs=(a,b,u,k=1)=>`rgb(${lerp(PAL[a],PAL[b],u)*k|0},${lerp(PAL[a+1],PAL[b+1],u)*k|0},${lerp(PAL[a+2],PAL[b+2],u)*k|0})`;
/* ---------- 3D car meshes: models.js (baked from the .fbx files by convert.mjs) -> cached rear-view sprites ---------- */
const b2a=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer)};
const MESH={};for(const id in CARS){const d=CARS[id];MESH[id]={d,paint:d.mt.some(q=>q[3]===1),V:b2a(d.v,Int16Array),F:b2a(d.f,Uint16Array),M:b2a(d.m,Uint8Array)}}
const SPECIAL=new Set(['Ambulance','Bus','Firetruck','Monster_Truck','Police_Muscle','Police_SUV','Police_Sedan','Police_Sports']),SLOW=new Set(['Bus','Firetruck']);
/* wf = body width vs the player's (Sports = 1.04), l = length for collisions, wt = how often it spawns */
const MODELS=Object.keys(CARS).filter(k=>k!=='Sports').map(id=>{const d=CARS[id];return{id,wf:1.04*clamp(d.w/263,.95,1.3),l:clamp(1.3*d.l/573,1.2,2.6),truck:SLOW.has(id),wt:SPECIAL.has(id)?.3:1}}),
 PM={id:'Sports',wf:1.04,l:1.3},PCOL=[356,82,50],MW=MODELS.reduce((a,m)=>a+m.wt,0);
const pickModel=()=>{let r=Math.random()*MW;for(const m of MODELS)if((r-=m.wt)<=0)return m;return MODELS[0]};
const SPR=new Map(),LIGHTC={2:'rgb(255,66,52)',5:'rgb(255,40,36)',6:'rgb(70,120,255)'},LD=(()=>{const x=-.3,y=.85,z=-.4,l=Math.hypot(x,y,z);return[x/l,y/l,z/l]})();
const SCR=document.createElement('canvas'),SX=SCR.getContext('2d');
/* renders one mesh from behind and slightly above (painter's algorithm, flat shaded). yi = steering yaw step -4..4 */
function bake(id,col,yi,big){
 const{d,V,F,M}=MESH[id],PW=big?340:220,Wu=d.w*2,Hu=d.h*2,Lu=d.l*2,pz=Lu*.2,CD=Lu*2.2,CH=Hu*1.3,th=Math.atan2(CH-Hu*.4,CD),ct=Math.cos(th),st=Math.sin(th),S=PW*(CD-pz)*ct/Wu,
  yw=-yi*.065,cy=Math.cos(yw),sy=Math.sin(yw),n=V.length/3,WX=new Float32Array(n),WY=new Float32Array(n),WZ=new Float32Array(n),PX=new Float32Array(n),PY=new Float32Array(n),PD=new Float32Array(n);
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(let i=0;i<n;i++){const x=V[i*3],y=V[i*3+1],z=V[i*3+2]-pz,wx=x*cy+z*sy,wz=-x*sy+z*cy,dy=y-CH,dz=wz+CD,zc=-dy*st+dz*ct,yc=dy*ct+dz*st;
  WX[i]=wx;WY[i]=y;WZ[i]=wz;PD[i]=zc;PX[i]=-S*wx/zc;PY[i]=-S*yc/zc;x0=Math.min(x0,PX[i]);x1=Math.max(x1,PX[i]);y0=Math.min(y0,PY[i]);y1=Math.max(y1,PY[i])}
 const mg=3,cw=Math.ceil(x1-x0+mg*2),ch=Math.ceil(y1-y0+mg*2),mk=()=>{const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');x.lineJoin='round';return[c,x]};
 const[cv0,c]=mk(),ov={},gl={},order=[],tn=M.length,TD=new Float32Array(tn),TL=new Float32Array(tn);
 for(let t=0;t<tn;t++){const a=F[t*3],b=F[t*3+1],e=F[t*3+2],
   ux=WX[b]-WX[a],uy=WY[b]-WY[a],uz=WZ[b]-WZ[a],vx=WX[e]-WX[a],vy=WY[e]-WY[a],vz=WZ[e]-WZ[a],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,nl=Math.hypot(nx,ny,nz)||1,
   cxm=(WX[a]+WX[b]+WX[e])/3,cym=(WY[a]+WY[b]+WY[e])/3,czm=(WZ[a]+WZ[b]+WZ[e])/3;
  if(nx*(0-cxm)+ny*(CH-cym)+nz*(-CD-czm)<=0)continue;                      // back face
  TD[t]=(PD[a]+PD[b]+PD[e])/3;TL[t]=(nx*LD[0]+ny*LD[1]+nz*LD[2])/nl;order.push(t)}
 order.sort((p,q)=>TD[q]-TD[p]);
 const ox=-x0+mg,oy=-y0+mg;
 for(const t of order){const a=F[t*3],b=F[t*3+1],e=F[t*3+2],mt=d.mt[M[t]],k=mt[3];let r=mt[0],g=mt[1],bl=mt[2];
  if(k===1&&col)[r,g,bl]=hsl(col[0],col[1],col[2]);else if(r+g+bl<30&&k!==2&&k!==3){r=40;g=42;bl=52}   // pure-black parts: lift slightly so shading still reads
  const sh=.42+.8*Math.max(0,TL[t]);if(k===3){r+=30*Math.max(0,TL[t]);g+=44*Math.max(0,TL[t]);bl+=66*Math.max(0,TL[t])}
  const path=q=>{q.beginPath();q.moveTo(PX[a]+ox,PY[a]+oy);q.lineTo(PX[b]+ox,PY[b]+oy);q.lineTo(PX[e]+ox,PY[e]+oy);q.closePath()};
  const col2=k===2?`rgb(${70+60*sh|0},12,16)`:`rgb(${Math.min(255,r*sh)|0},${Math.min(255,g*sh)|0},${Math.min(255,bl*sh)|0})`;
  c.fillStyle=c.strokeStyle=col2;c.lineWidth=.8;path(c);c.fill();c.stroke();
  if(k===2||k===5||k===6){if(!ov[k])ov[k]=mk();const q=ov[k][1];q.fillStyle=q.strokeStyle=LIGHTC[k];q.lineWidth=.8;path(q);q.fill();q.stroke();
   const side=(PX[a]+PX[b]+PX[e])<0?0:1,id2=k*2+side,G2=gl[id2]||(gl[id2]={k,x0:1e9,y0:1e9,x1:-1e9,y1:-1e9});
   for(const i of[a,b,e]){G2.x0=Math.min(G2.x0,PX[i]+ox);G2.x1=Math.max(G2.x1,PX[i]+ox);G2.y0=Math.min(G2.y0,PY[i]+oy);G2.y1=Math.max(G2.y1,PY[i]+oy)}}}
 const wc=-S*0/1,zg=CH*st+CD*ct,yg=-CH*ct+CD*st;
 return{c:cv0,pw:PW,ax:ox+wc,ay:oy-S*yg/zg,L:Object.fromEntries(Object.entries(ov).map(([k,v])=>[k,v[0]])),G:Object.values(gl).map(o=>({k:o.k,x:(o.x0+o.x1)/2,y:(o.y0+o.y1)/2,r:Math.max(o.x1-o.x0,o.y1-o.y0)/2}))}}
function sprite(m,col,tilt,big){const M2=MESH[m.id],yi=big?Math.round(clamp(tilt,-1,1)*4):0,key=m.id+(M2.paint?col.join():'')+(big?'p'+yi:'');let s=SPR.get(key);if(!s){s=bake(m.id,M2.paint?col:null,yi,big);SPR.set(key,s)}return s}
function warm(){const q=[];for(let i=-4;i<=4;i++)q.push(()=>sprite(PM,PCOL,i/4,1));
 for(const m of MODELS)if(MESH[m.id].paint)for(const c of COLORS)q.push(()=>sprite(m,c,0));else q.push(()=>sprite(m,null,0));
 const step=()=>{const f=q.shift();if(f){f();setTimeout(step,0)}};setTimeout(step,0)}
function drawCar(x,y,w,m,col,tilt,brake,rot,lit){
 const c=ctx,sp=sprite(m,col,tilt,m===PM),s=w*m.wf*1.12/sp.pw,cw=sp.c.width,ch=sp.c.height,dx=-sp.ax*s,dy=-sp.ay*s,dw=cw*s,dh=ch*s;
 c.save();c.translate(x,y);setLit(lit);
 c.fillStyle='rgba(0,0,0,.16)';c.beginPath();c.ellipse(0,0,w*.76*m.wf,w*.14,0,0,7);c.fill();c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(0,0,w*.6*m.wf,w*.085,0,0,7);c.fill();
 if(rot){c.translate(0,-w*.25);c.rotate(rot);c.translate(0,w*.25)}
 c.rotate(tilt*.02);c.imageSmoothingQuality='high';
 if(LT[0]<.985||LT[1]<.985||LT[2]<.985){                                   // ambient / headlight tint: multiply the sprite, keep its alpha
  if(SCR.width<cw||SCR.height<ch){SCR.width=Math.max(SCR.width,cw);SCR.height=Math.max(SCR.height,ch)}
  SX.globalCompositeOperation='source-over';SX.clearRect(0,0,SCR.width,SCR.height);SX.drawImage(sp.c,0,0);
  SX.globalCompositeOperation='multiply';SX.fillStyle=`rgb(${Math.min(255,LT[0]*255)|0},${Math.min(255,LT[1]*255)|0},${Math.min(255,LT[2]*255)|0})`;SX.fillRect(0,0,cw,ch);
  SX.globalCompositeOperation='destination-in';SX.drawImage(sp.c,0,0);c.drawImage(SCR,0,0,cw,ch,dx,dy,dw,dh)
 }else c.drawImage(sp.c,dx,dy,dw,dh);
 const ga0=c.globalAlpha,tl=clamp(.15+NL*.75+(brake?.6:0),0,1),fp=(G.clock*4|0)&1;
 c.globalCompositeOperation='lighter';                                      // tail lights / sirens
 for(const k in sp.L){const a=k==2?tl:k==5?(fp?0:.9):(fp?.9:0);if(a>.01){c.globalAlpha=ga0*a;c.drawImage(sp.L[k],dx,dy,dw,dh)}}
 c.globalAlpha=ga0;c.globalCompositeOperation='source-over';
 for(const o of sp.G){const gx=dx+o.x*s,gy=dy+o.y*s;
  if(o.k===2)glow(1,gx,gy,Math.max(o.r*s*2.2,4.5)*(brake?1.4:1),Math.max(o.r*s*2.2,4.5)*(brake?1.4:1),tl*(.25+.55*NL)+(brake?.25:0));
  else glow(o.k===5?1:3,gx,gy,Math.max(o.r*s*2.4,5),Math.max(o.r*s*2.4,5),(o.k===5?!fp:!!fp)?.55+.3*NL:0)}
 c.restore();
}
/* ---------- audio: everything is synthesised with WebAudio (no sound files) ---------- */
const SIR={Ambulance:[960,770,.55],Police_Muscle:[860,640,.4],Police_SUV:[860,640,.4],Police_Sedan:[860,640,.4],Police_Sports:[860,640,.4],Firetruck:[520,410,.8]};   // hi, lo, seconds per tone
const AU=(()=>{
 const AC=window.AudioContext||window.webkitAudioContext;
 let ac,mg,mus,musF,sfx,arpB,dly,padF,bassF,nb,eng,skid,rum,wind,sir=[],muted=false,step=0,nextT=0,th=0,wasUp=false;
 try{muted=localStorage.getItem('polyrush.mute')==='1'}catch(e){}
 const mf=n=>440*Math.pow(2,(n-69)/12),SP=60/116/4,CH=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],AR=[0,1,2,1,2,1,0,2];   // Am F C G, 116 bpm
 const flt=(type,f,q,to)=>{const b=ac.createBiquadFilter();b.type=type;b.frequency.value=f;if(q)b.Q.value=q;if(to)b.connect(to);return b};
 const gn=(v,to)=>{const g=ac.createGain();g.gain.value=v;if(to)g.connect(to);return g};
 const noise=loop=>{const s=ac.createBufferSource();s.buffer=nb;s.loop=loop;return s};
 const env=(g,t,a,pk,d)=>{const p=g.gain;p.cancelScheduledValues(t);p.setValueAtTime(.0001,t);p.linearRampToValueAtTime(pk,t+a);p.exponentialRampToValueAtTime(.0001,t+a+d)};
 function tone(type,f,t,dur,vol,dest,a=.005){const o=ac.createOscillator(),g=gn(0);o.type=type;o.frequency.value=f;env(g,t,a,vol,dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+a+dur+.05)}
 function burst(t,type,f,q,vol,dur,dest,f2){const s=noise(false),b=flt(type,f,q),g=gn(0);if(f2){b.frequency.setValueAtTime(f,t);b.frequency.exponentialRampToValueAtTime(f2,t+dur)}env(g,t,.004,vol,dur);s.connect(b);b.connect(g);g.connect(dest);s.start(t,Math.random()*1.5);s.stop(t+dur+.05)}
 function sched(s,t){const bar=(s>>4)&3,st=s&15,ch=CH[bar];
  if(st%4===0){const o=ac.createOscillator(),g=gn(0);o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);env(g,t,.003,.8,.22);o.connect(g);g.connect(mus);o.start(t);o.stop(t+.3)}   // kick
  if(st%4===2)burst(t,'highpass',7500,0,.09,.05,mus);                                                                                                        // hat
  if(st===4||st===12)burst(t,'bandpass',1800,.8,.22,.14,mus);                                                                                              // clap
  if(st%2===0)tone('sawtooth',mf(ch[0]-12+(st%4===2?12:0)),t,SP*1.6,.2,bassF);                                                                              // bass
  tone('square',mf(ch[AR[st&7]]+12*(1+((st>>3)&1))),t,.11,.07,arpB);                                                                                      // arp
  if(st===0)for(const n of ch)tone('sawtooth',mf(n),t,SP*15,.03,padF,.5)}                                                                                  // pad
 function tick(){if(!ac||ac.state!=='running')return;while(nextT<ac.currentTime+.2){sched(step,nextT);nextT+=SP;step++}}
 function init(){
  if(ac||!AC)return;try{ac=new AC()}catch(e){return}
  const cp=ac.createDynamicsCompressor();cp.connect(ac.destination);mg=gn(muted?0:.9,cp);sfx=gn(.9,mg);
  musF=flt('lowpass',16000,0,mg);mus=gn(.5,musF);padF=flt('lowpass',900,0,mus);bassF=flt('lowpass',520,0,mus);arpB=gn(1,mus);dly=ac.createDelay(1);dly.delayTime.value=SP*3;const fb=gn(.32,dly);dly.connect(fb);arpB.connect(dly);dly.connect(gn(.35,mus));
  const n=Math.max(1,ac.sampleRate*2|0);nb=ac.createBuffer(1,n,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  const eg=gn(0,sfx),lp=flt('lowpass',600,1,eg),o1=ac.createOscillator(),o2=ac.createOscillator();o1.type='sawtooth';o2.type='square';o1.connect(lp);o2.connect(gn(.6,lp));o1.start();o2.start();eng={o1,o2,lp,eg};
  const mk=(type,f,q)=>{const s=noise(true),b=flt(type,f,q),g=gn(0,sfx);s.connect(b);b.connect(g);s.start();return{b,g}};
  skid=mk('bandpass',1400,5);rum=mk('lowpass',240,0);wind=mk('bandpass',900,.5);
  for(let i=0;i<2;i++){const o=ac.createOscillator(),f=flt('lowpass',1800),g=gn(0),p=ac.createStereoPanner?ac.createStereoPanner():null;o.type='square';o.connect(f);f.connect(g);if(p){g.connect(p);p.connect(sfx)}else g.connect(sfx);o.start();sir.push({o,g,p})}
  nextT=ac.currentTime+.1;setInterval(tick,25);ui()}
 function ui(){const b=$('mute');if(b)b.classList.toggle('off',muted)}
 function toggle(){muted=!muted;try{localStorage.setItem('polyrush.mute',muted?'1':'0')}catch(e){}if(ac)mg.gain.setTargetAtTime(muted?0:.9,ac.currentTime,.03);ui()}
 function update(dt){if(!ac||ac.state!=='running')return;
  const t=ac.currentTime,g=G,live=state==='play',play=live&&!g.dead,up=play&&(keys.up||touch.up),dn=play&&(keys.dn||touch.dn),dr=play&&keys.dr,sr=g.speed/MAXV;
  th+=((up?1:.25)-th)*Math.min(1,dt*5);const f=46+sr*175+th*12;                                              // engine: pitch follows speed, brighter on gas
  eng.o1.frequency.setTargetAtTime(f,t,.05);eng.o2.frequency.setTargetAtTime(f*.5,t,.05);eng.lp.frequency.setTargetAtTime(380+sr*900+th*650,t,.08);eng.eg.gain.setTargetAtTime(play?.05+.045*th+.02*sr:0,t,.1);
  if(up&&!wasUp&&sr<.9)burst(t,'bandpass',500,1.2,.08,.4,sfx,1800);wasUp=!!up;                                    // gas: little intake whoosh when you hit the pedal
  const brk=dn&&g.speed>24?.35+.65*sr:0,dft=dr&&sr>.5&&Math.abs(g.vx)>.7?.8:0;                                // brake / drift: tyre screech
  skid.g.gain.setTargetAtTime(Math.min(.14,Math.max(brk,dft)*.15),t,.04);skid.b.frequency.setTargetAtTime(1100+sr*1100,t,.1);
  rum.g.gain.setTargetAtTime(play&&Math.abs(g.x)>.9?.2*sr:0,t,.05);wind.g.gain.setTargetAtTime(play?.1*sr*sr:0,t,.2);
  const cand=[];if(live)for(const c of g.traffic){const P=SIR[c.m.id],dz=c.z-g.z;if(P&&dz>-14&&dz<190)cand.push({c,P,dz})}
  cand.sort((a,b)=>Math.abs(a.dz)-Math.abs(b.dz));
  sir.forEach((v,i)=>{const s=cand[i];if(!s){v.g.gain.setTargetAtTime(0,t,.05);return}
   const{c,P,dz}=s;if(c.sp===undefined)c.sp=Math.random()*3;
   const dop=1+(dz>=0?1:-1)*clamp((g.speed-c.spd)*.005,-.12,.12);                                              // doppler: higher while closing in, lower once passed
   v.o.frequency.setTargetAtTime(P[(Math.floor((t+c.sp)/P[2])&1)?1:0]*dop,t,.012);
   v.g.gain.setTargetAtTime(.17*Math.pow(clamp(1-Math.abs(dz)/190,0,1),1.7),t,.06);if(v.p)v.p.pan.setTargetAtTime(clamp((c.x-g.x)*1.2,-1,1),t,.1)});
  const low=(live&&g.dead)||state==='over';mus.gain.setTargetAtTime(low?.18:.5,t,.2);musF.frequency.setTargetAtTime(low?600:16000,t,.15)}
 function crash(){if(!ac||ac.state!=='running')return;const t=ac.currentTime;burst(t,'lowpass',2200,0,.7,.8,sfx,180);
  const o=ac.createOscillator(),g=gn(0,sfx);o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(35,t+.5);env(g,t,.005,.8,.6);o.connect(g);o.start(t);o.stop(t+.7)}
 return{init,update,crash,toggle,ui,suspend(){if(ac&&ac.state==='running')ac.suspend()},resume(){if(ac&&ac.state!=='running')ac.resume()}}
})();
/* ---------- roadside props ---------- */
function lamp(x,y,s,sd){setLit(AM);const c=ctx,ph=s*2.1,pw=Math.max(1,s*.07),ax=x-sd*s*.95;
 c.strokeStyle=sc(44,50,66);c.lineWidth=pw;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x,y-ph);c.quadraticCurveTo(x,y-ph-s*.18,x-sd*s*.4,y-ph-s*.12);c.quadraticCurveTo(x-sd*s*.75,y-ph-s*.06,ax,y-ph+pw*.3);c.stroke();
 c.fillStyle=`rgb(${120+135*NL|0},${125+105*NL|0},${130+40*NL|0})`;rr(ax-s*.17,y-ph+pw*.3,s*.34,Math.max(2,s*.08),s*.04);c.fill();
 if(NL>.02){glow(0,ax,y-ph+pw,s*.8,s*.8,.8*NL);glow(0,ax,y-s*.02,s*1.5,s*.3,.5*NL)}}
function sign(x,y,s,sd){setLit(AM);const c=ctx,ci=sd%4,n=NEON[ci];
 c.fillStyle=sc(36,40,56);c.fillRect(x-s*.42,y-s*1.4,Math.max(1,s*.06),s*1.4);c.fillRect(x+s*.36,y-s*1.4,Math.max(1,s*.06),s*1.4);rr(x-s*.55,y-s*2.5,s*1.1,s*1.3,s*.08);c.fill();
 const k=.4+.6*NL,gq=c.createLinearGradient(0,y-s*2.42,0,y-s*1.28);gq.addColorStop(0,`rgb(${n[0]*k|0},${n[1]*k|0},${n[2]*k|0})`);gq.addColorStop(1,`rgb(${n[0]*k*.7|0},${n[1]*k*.7|0},${n[2]*k*.7|0})`);
 c.fillStyle=gq;rr(x-s*.48,y-s*2.42,s*.96,s*1.14,s*.05);c.fill();
 c.fillStyle='rgba(8,10,22,.5)';for(let j=0;j<3;j++){rr(x-s*.36,y-s*2.3+j*s*.3,s*(.7-j*.15),s*.1,s*.05);c.fill()}
 glow(GI[ci],x,y-s*1.85,s*1.3,s*1.1,.12+.55*NL)}
function block(x,y,s,sd){setLit(AM);const c=ctx,bw=s*1.3,bh=s*(1.6+(sd%5)*.4),n=NEON[sd%4],gq=c.createLinearGradient(x-bw/2,0,x+bw/2,0);
 gq.addColorStop(0,rgb(15,1));gq.addColorStop(.6,rgb(15,.9));gq.addColorStop(1,rgb(15,.65));c.fillStyle=gq;rr(x-bw/2,y-bh,bw,bh,[s*.08,s*.08,0,0]);c.fill();
 for(let r=0;r<4;r++)for(let q=0;q<2;q++){const hv=hash(sd+r*3+q);c.fillStyle=hv>.45?`rgba(${hv>.8?'255,110,180':'255,214,140'},${.25+.65*NL})`:'rgba(0,0,0,.15)';rr(x-bw*.38+q*bw*.3,y-bh+bh*.12+r*bh*.22,bw*.18,bh*.12,bw*.03);c.fill()}
 c.fillStyle=`rgba(${n.join(',')},.9)`;c.fillRect(x-bw/2,y-bh,Math.max(1,s*.04),bh);glow(GI[sd%4],x-bw/2,y-bh*.5,s*.5,bh*.5,.3*NL)}
function rowIdx(rel){if(rel<.05)return-1;const y=HY+Z0/(Z0+rel)*(H-HY),i=Math.round((H-y)/STEP);return i<0||i>=NR?-1:i}

function render(){
 const g=G,sr=g.speed/MAXV,sh=g.shake*16,camZ=g.z-ZP,camX=g.x*.72;
 ctx.save();ctx.translate((Math.random()-.5)*sh-g.tilt*10,(Math.random()-.5)*sh);
 // sky, sun (sinks as the score rises), neon haze
 let q=ctx.createLinearGradient(0,0,0,HY);q.addColorStop(0,rgb(0));q.addColorStop(1,rgb(3));ctx.fillStyle=q;ctx.fillRect(-40,-40,W+80,HY+40);
 {const pr=sst(clamp(g.t/46,0,1)),sx=(((W*.72-g.bg*.05)%(W+200))+W+200)%(W+200)-100,sy=lerp(HY*.38,HY*1.1,pr),r=H*.05*(1+pr*.5),sf=clamp(1-Math.abs(g.t-34)/22,0,1);
  glow(4,sx,sy,r*6,r*6,.6*sf+.25*(1-pr));
  if(sy<HY+r){ctx.fillStyle=`rgba(255,${246-pr*100|0},${205-pr*115|0},${.95*(1-NL)})`;ctx.beginPath();ctx.arc(sx,sy,r,0,7);ctx.fill()}}
 if(NL>.02){glow(2,W*.2,HY*.85,W*.6,HY*.55,.3*NL);glow(3,W*.85,HY*.8,W*.5,HY*.5,.26*NL)}
 const FS=[.04,.1,.22],U=[.62,.34,0];
 for(let k=0;k<3;k++){const bc=v=>`rgb(${lerp(PAL[15],PAL[6],U[k])*v|0},${lerp(PAL[16],PAL[7],U[k])*v|0},${lerp(PAL[17],PAL[8],U[k])*v|0})`,B=[1.1,.95,.8].map(bc),S=[.77,.66,.56].map(bc),off=((g.bg*FS[k])%MP+MP)%MP;
  for(let ox=-off-MP;ox<W;ox+=MP){
   for(const p of g.mt[k]){const px=ox+p.x;if(px+p.w<0||px-p.w>W)continue;const top=HY-p.h*H;
    const gq=ctx.createLinearGradient(px-p.w/2,0,px+p.w/2,0);gq.addColorStop(0,B[p.vi]);gq.addColorStop(.6,B[p.vi]);gq.addColorStop(1,S[p.vi]);ctx.fillStyle=gq;rr(px-p.w/2,top,p.w,HY-top+1,[Math.min(6,p.w*.1),Math.min(6,p.w*.1),0,0]);ctx.fill();
    if(p.sp){ctx.fillStyle=B[p.vi];ctx.beginPath();ctx.moveTo(px-p.w*.06,top);ctx.lineTo(px,top-p.sp*H);ctx.lineTo(px+p.w*.06,top);ctx.fill()}}
   if(ox+MP>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.1+.9*NL;ctx.drawImage(LC[k],ox,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}}}
 q=ctx.createLinearGradient(0,HY-H*.12,0,HY);q.addColorStop(0,rga(6,0));q.addColorStop(1,rga(6,.75));ctx.fillStyle=q;ctx.fillRect(-40,HY-H*.12,W+80,H*.12);
 q=ctx.createLinearGradient(0,HY,0,H);q.addColorStop(0,mixs(9,6,.5));q.addColorStop(.5,rgb(9));q.addColorStop(1,rgb(9,.8));ctx.fillStyle=q;ctx.fillRect(-40,HY,W+80,H-HY+40);
 // project road rows (near -> far)
 let lat=0,slope=0,pz=0;
 for(let i=0;i<NR;i++){const t=(H-i*STEP-HY)/(H-HY),z=Z0*(1/t-1),dz=z-pz,wz=camZ+z;pz=z;
  slope+=curve(wz)*CS*dz;lat+=slope*dz;RX[i]=W/2+(lat-camX)*t*ROAD;RW[i]=t*ROAD;RZ[i]=wz;RD[i]=dz}

 const N1=NR-1,ip=Math.round((H-(HY+TP*(H-HY)))/STEP);
 const seg=(i0,i1,l0,l1,h0,h1)=>{for(let i=i0;i<=i1;i++)ctx[i===i0?'moveTo':'lineTo'](RX[i]+l0*RW[i],H-i*STEP-h0*RW[i]);for(let i=i1;i>=i0;i--)ctx.lineTo(RX[i]+l1*RW[i],H-i*STEP-h1*RW[i]);ctx.closePath()},
  strip=(l0,l1,h0=0,h1=0)=>{ctx.beginPath();seg(0,N1,l0,l1,h0,h1);ctx.fill()};
 q=ctx.createLinearGradient(0,HY,0,H);q.addColorStop(0,mixs(12,6,.55));q.addColorStop(.55,rgb(12));q.addColorStop(1,rgb(12,.92));ctx.fillStyle=q;strip(-1,1);   // wet asphalt
 ctx.fillStyle='rgba(0,0,0,.1)';strip(-.97,-.87);strip(.87,.97);
 setLit(Math.max(AM,.6));ctx.fillStyle=sc(242,242,242);strip(-.96,-.93);strip(.93,.96);                                   // reflective edge lines
 const runs=[];let st=-1;for(let i=0;i<NR;i++){const on=RD[i]<4&&(Math.floor(RZ[i]/3)&1);if(on&&st<0)st=i;if(!on&&st>=0){runs.push([st,i-1]);st=-1}}if(st>=0)runs.push([st,N1]);
 for(const l of[-.5,0,.5]){ctx.beginPath();for(const r of runs)seg(r[0],r[1],l-.012,l+.012,0,0);ctx.fill()}              // lane dashes
 setLit(AM);ctx.fillStyle=sc(44,50,66);for(const sd of[-1,1]){ctx.beginPath();seg(0,N1,sd*1.02,sd*1.02,0,.1);ctx.fill()}   // guard rail wall
 ctx.fillStyle=`rgba(255,178,64,${.55+.45*NL})`;strip(1.02,1.08,.1,.1);strip(-1.08,-1.02,.1,.1);                         // LED strip
 // additive light pass: rail glow, wet-road reflections, headlight beam
 ctx.globalCompositeOperation='lighter';
 if(NL>.02){ctx.fillStyle=`rgba(255,170,60,${.3*NL})`;strip(1,1.1,.12,.06);strip(-1.1,-1,.12,.06);
  ctx.fillStyle=`rgba(255,160,60,${.14*NL})`;strip(.84,.98);strip(-.98,-.84);
  ctx.fillStyle=`rgba(255,45,149,${.07*NL})`;strip(-.62,-.22);ctx.fillStyle=`rgba(34,230,255,${.07*NL})`;strip(.22,.62)}
 if(HL>0){const yN=H-ip*STEP,yF=H-N1*STEP,gs=ctx.createLinearGradient(0,yN,0,yF);
  for(const f of[0,.1,.25,.5,1]){const i=Math.round(ip+f*(N1-ip)),dd=Math.max(0,RZ[i]-g.z);gs.addColorStop(f,`rgba(255,238,200,${HL*Math.exp(-dd/55)*.3})`)}
  ctx.fillStyle=gs;const bp=(i,n,sg)=>{const dd=Math.max(0,RZ[i]-g.z),u=g.x+g.vx*.012*dd,hw=clamp(.2+.009*dd,.2,.75);return RX[i]+(u+sg*hw*n)*RW[i]};
  for(const n of[1,.66,.36]){ctx.beginPath();for(let i=ip;i<=N1;i++)ctx[i===ip?'moveTo':'lineTo'](bp(i,n,-1),H-i*STEP);for(let i=N1;i>=ip;i--)ctx.lineTo(bp(i,n,1),H-i*STEP);ctx.closePath();ctx.fill()}}
 ctx.globalCompositeOperation='source-over';
 q=ctx.createLinearGradient(0,HY,0,HY+H*.22);q.addColorStop(0,rga(6,.95));q.addColorStop(1,rga(6,0));ctx.fillStyle=q;ctx.fillRect(-40,HY,W+80,H*.22);
 // sprites: scenery + traffic + player, far -> near
 const L=[],k0=Math.floor((camZ+MAXREL)/9),k1=Math.ceil((camZ+.5)/9);
 for(let k=k0;k>=k1;k--)for(let s=0;s<2;s++){
  if(k%3===0){L.push({z:k*9,k:0,lat:s?1.2:-1.2,sz:1});continue}
  const h=hash(k*2+s);if(h<.5)continue;const h2=hash(k*7+s+.5);L.push({z:k*9,k:h<.78?1:2,lat:(s?1:-1)*(1.7+h2*2.4),sz:.7+h2*.6,sd:(h2*997)|0})}
 for(const c of g.traffic)L.push({z:c.z,c});
 L.push({z:g.z,pl:1});
 L.sort((a,b)=>b.z-a.z);
 for(const o of L){
  let x,y,rw;const rel=o.z-camZ;
  if(o.pl){const ip2=Math.round((H-(HY+TP*(H-HY)))/STEP);x=RX[ip2]+g.x*RW[ip2];rw=TP*ROAD;y=HY+TP*(H-HY)-g.hop}
  else{const i=rowIdx(rel);if(i<0)continue;x=RX[i];y=H-i*STEP;rw=RW[i]}
  ctx.globalAlpha=clamp((MAXREL-rel)/70,0,1);
  if(o.pl){const w=.3*rw*1.02,br=g.brake&&!g.dead;drawCar(x,y,w,PM,PCOL,g.tilt,br,g.rot,clamp(AM+.4,0,1));
   if(NL>.1&&!g.dead)glow(1,x,y+w*.1,w*.7,w*.2,.35*NL*(br?1.5:1))}   // taillight reflection on the wet road
  else if(o.c){const w=.3*rw,cx=x+o.c.x*rw,lit=AM+(1-AM)*beam(o.z-g.z,o.c.x);
   if(NL>.05)glow(0,cx,y-w*.35,w*.9,w*.3,.3*NL);                     // traffic headlight spill on the road ahead of it
   drawCar(cx,y,w,o.c.m,o.c.col,0,false,0,lit)}
  else{const sx=x+o.lat*rw;if(sx<-200||sx>W+200){ctx.globalAlpha=1;continue}const s=rw*.5*o.sz;(o.k===0?lamp(sx,y,s,Math.sign(o.lat)):o.k===1?sign(sx,y,s,o.sd):block(sx,y,s,o.sd))}
  ctx.globalAlpha=1;
 }
 // speed lines keep their original shape while following the player's projected turn
 if(sr>.72){const carX=RX[ip]+g.x*RW[ip],windX=lerp(W/2,carX,.5)+g.tilt*TP*ROAD*.12;
  ctx.strokeStyle=`rgba(255,255,255,${(sr-.72)*1.1})`;ctx.lineWidth=2;ctx.beginPath();
  for(const l of LINES){const p=(g.z*.03+l.p)%1,r1=40+p*p*H*.9,r2=r1+20+p*80;ctx.moveTo(windX+Math.cos(l.a)*r1*1.3,HY+Math.sin(l.a)*r1*.8);ctx.lineTo(windX+Math.cos(l.a)*r2*1.3,HY+Math.sin(l.a)*r2*.8)}ctx.stroke()}
 // particles
 for(const p of g.parts){ctx.fillStyle=`rgba(${p.col},${(p.life/p.max)*.6})`;const s=p.size*(1.6-p.life/p.max);ctx.beginPath();ctx.arc(p.x,p.y,s,0,7);ctx.fill()}
 ctx.restore();
 if(g.flash>0){ctx.fillStyle=`rgba(255,255,255,${g.flash*.6})`;ctx.fillRect(0,0,W,H)}
}

/* ---------- UI / flow ---------- */
const show=(id,on)=>$(id).classList.toggle('show',!!on);
function setBest(){const b=best.toFixed(1);$('hbest').textContent=b;$('mbest').textContent=b}
function hud(){const h=hud,t=G.t.toFixed(1),k=Math.round(G.speed*4),m=Math.max(0,Math.round((G.z-100)*1.1))+' m';
 if(t!==h.t)$('time').textContent=h.t=t;
 if(k!==h.k){$('kph').textContent=h.k=k;$('bar').style.width=(G.speed/MAXV*100)+'%'}
 if(m!==h.m)$('dist').textContent=h.m=m;
 const ph=PH[G.t>=60?4:(G.t/15)|0]+(HL>.5?' · lights':'');if(ph!==h.p)$('phase').textContent=h.p=ph}
function startGame(){AU.init();AU.resume();reset();state='play';['menu','over','pausescr'].forEach(i=>show(i,0));show('hud',1);document.body.classList.add('playing');setBest();if(document.activeElement)document.activeElement.blur()}
function toMenu(){AU.resume();reset();state='menu';['over','pausescr','hud'].forEach(i=>show(i,0));show('menu',1);document.body.classList.remove('playing');setBest();if(document.activeElement)document.activeElement.blur()}
function pause(){if(state==='play'&&!G.dead){state='paused';AU.suspend();show('pausescr',1)}}
function resume(){if(state==='paused'){state='play';AU.resume();show('pausescr',0);last=performance.now()}}
function gameOver(){state='over';$('ftime').textContent=G.t.toFixed(1);$('fbest').textContent=best.toFixed(1);$('nb').style.display=G.newBest?'block':'none';show('hud',0);show('over',1);document.body.classList.remove('playing');if(window.parent!==window)window.parent.postMessage({type:'polyrush-run-ended',seconds:G.t},location.origin)}

const KM={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'up',KeyW:'up',ArrowDown:'dn',KeyS:'dn',Space:'dr'};
addEventListener('keydown',e=>{if(e.code==='Escape'&&window.parent!==window){window.parent.postMessage({type:'polyrush-close'},location.origin);return}if(e.code==='KeyM'&&!e.repeat)AU.toggle();const k=KM[e.code];if(k){keys[k]=1;e.preventDefault()}
 if(!e.repeat&&(e.code==='Escape'||e.code==='KeyP'))state==='play'?pause():resume();
 if(e.code==='Enter'&&(state==='menu'||state==='over')){e.preventDefault();startGame()}});
addEventListener('keyup',e=>{const k=KM[e.code];if(k)keys[k]=0});
addEventListener('blur',()=>{for(const k in keys)keys[k]=0;pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();AU.suspend()}else if(state!=='paused')AU.resume()});
document.querySelectorAll('#touch button').forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();touch[k]=1;try{b.setPointerCapture(e.pointerId)}catch(_){}},off=e=>{touch[k]=0};
 b.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,off));b.addEventListener('contextmenu',e=>e.preventDefault())});
$('start').onclick=startGame;$('restart').onclick=startGame;$('omenu').onclick=toMenu;$('pmenu').onclick=toMenu;$('resume').onclick=resume;$('pause').onclick=pause;$('mute').onclick=()=>AU.toggle();AU.ui();
addEventListener('resize',resize);

function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(state!=='paused')update(dt);render();requestAnimationFrame(frame)}
resize();reset();setBest();warm();requestAnimationFrame(frame);
})();