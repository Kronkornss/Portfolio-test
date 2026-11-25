/* Event Horizon shader background for #home (WebGL, no dependencies) */
(function () {
const host = document.getElementById('home-bg'), section = document.getElementById('home');
if (!host || !section) return;

const cfg = {
  colors: ['#e04a0b', '#ffe2a0', '#ffe2a0'],
  speed: .45, density: 18, lineWidth: .9, brightness: 1, viewAngle: 40, focusX: 0, focusY: 0,
  sphereSize: .47, interaction: .7, seed: 31, cameraDistance: 3.2, rimGlow: 1.25, rimFlow: .75,
  diskThickness: .55, lensing: .8, diskRotation: -8,
  cameraZoom: 1, cameraRotation: 0, cameraX: 0, cameraY: 0, maxPixels: 450000
};

const FRAG = `precision highp float;
uniform float u_cameraRotation,u_cameraZoom,u_cameraX,u_cameraY;
uniform vec2 u_resolution,u_pointer;
uniform vec3 u_c0,u_c1,u_c2;
uniform float u_time,u_cameraDistance,u_rimGlow,u_rimFlow,u_density,u_lineWidth,u_brightness,u_viewAngle,u_focusX,u_focusY,u_sphereSize,u_interaction,u_presence,u_seed,u_diskThickness,u_lensing,u_diskRotation;
const float TAU=6.2831853;
float hash(float n){return fract(sin(n*127.1+u_seed*13.17)*43758.5453);}
float noise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(hash(dot(i,vec2(41.,289.))),hash(dot(i+vec2(1.,0.),vec2(41.,289.))),f.x),mix(hash(dot(i+vec2(0.,1.),vec2(41.,289.))),hash(dot(i+1.,vec2(41.,289.))),f.x),f.y);
}
float fluid(float a,float radial,float t){
 vec2 orbit=vec2(cos(a-t*.20),sin(a-t*.20));
 vec2 p=orbit*2.1+vec2(radial*1.7,-radial*.8);
 float broad=noise(p);
 return broad*.80+noise(p*2.0+vec2(broad*.9,t*.065))*.20;
}
vec3 diskEmission(float radius,float theta,float time){
 float peak=u_sphereSize*1.75;
 float width=u_sphereSize*(.16+u_diskThickness*.40);
 float liquid=fluid(theta,radius/u_sphereSize,time);
 float rr=radius+(liquid-.5)*width*.32;
 float inner=smoothstep(u_sphereSize*1.02,u_sphereSize*1.25,radius);
 float band=exp(-pow((rr-peak)/width,2.))*inner;
 float strands=.5+.5*sin(rr*45.-theta*2.+liquid*2.4-time*.8);
 float silk=(.50+.65*liquid)*(.84+.16*strands);
 float beaming=pow(1./(1.-.19*cos(theta)),2.4)*.82;
 float core=band*silk*3.5*beaming;
 float source=silk*3.5*beaming*u_rimGlow;
 float bloomGate=smoothstep(.9,2.6,source);
 float halo=exp(-pow((rr-peak)/(width*2.15),2.))*.23*bloomGate*inner;
 float wisps=pow(max(0.,liquid-.26),1.5)*exp(-pow((rr-peak)/(width*1.8),2.))*.35*inner;
 vec3 tint=mix(u_c0,u_c1,smoothstep(peak-width*.65,peak+width*.85,rr));
 return tint*(core+halo+wisps*beaming)*u_rimGlow;
}
float dustHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
mat2 rotation(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec2 screen(vec2 uv,float aspect){return rotation(radians(u_diskRotation+u_cameraRotation))*((uv-.5-vec2(u_focusX,u_focusY))*vec2(aspect,1.))/u_cameraZoom+vec2(u_cameraX,u_cameraY);}
vec3 rayFor(vec2 uv,vec3 forward,vec3 up,float aspect){
 vec2 p=screen(uv,aspect);return normalize(forward+(vec3(1.,0.,0.)*p.x+up*p.y)*.95);
}
vec2 plane(vec3 origin,vec3 ray){return (origin+ray*(-origin.y/min(-.0001,ray.y))).xz;}
vec2 project(vec2 point,vec3 camera,vec3 forward,vec3 up,float aspect){
 vec3 q=vec3(point.x,0.,point.y)-camera;float z=max(.01,dot(q,forward));
 vec2 p=vec2(q.x,dot(q,up))/(z*.95);
 p=rotation(-radians(u_diskRotation+u_cameraRotation))*(p-vec2(u_cameraX,u_cameraY))*u_cameraZoom;
 return .5+vec2(u_focusX,u_focusY)+p/vec2(aspect,1.);
}
void main(){
 vec2 uv=gl_FragCoord.xy/u_resolution;float aspect=u_resolution.x/u_resolution.y;
 vec2 p=screen(uv,aspect);
 float elevation=radians(u_viewAngle);
 vec3 camera=vec3(0.,sin(elevation)*u_cameraDistance,cos(elevation)*u_cameraDistance);
 vec3 forward=normalize(-camera),up=normalize(cross(vec3(1.,0.,0.),forward));
 vec3 ray=rayFor(uv,forward,up,aspect);
 float R=u_sphereSize/(u_cameraDistance*.95),r=length(p),angle=atan(p.y,p.x);
 float pixel=1./u_resolution.y;
 float shadow=smoothstep(R-pixel,R+pixel,r);
 float time=u_time*(.5+u_rimFlow);
 vec3 radiance=vec3(0.),foreground=vec3(0.);
 if(ray.y<-.005){
  vec2 q=plane(camera,ray),pointer=plane(camera,rayFor(u_pointer,forward,up,aspect));
  float radius=length(q),theta=atan(q.y,q.x)/TAU;
  float planeT=-camera.y/ray.y,b=dot(camera,ray);
  float disc=b*b-dot(camera,camera)+u_sphereSize*u_sphereSize;
  float sphereT=-b-sqrt(max(0.,disc));
  float inFront=disc>0.&&planeT<sphereT?1.:0.;
  float diskVisible=mix(shadow,1.,inFront);
  vec2 delta=q-pointer;
  float pull=exp(-dot(delta,delta)*1.2)*u_presence*u_interaction;
  float thetaOffset=pull*.035;
  float track=floor(radius*u_density);
  vec3 particles=vec3(0.);
  for(int i=-1;i<=1;i++){
   float id=track+float(i),nominal=(id+.5)/u_density;
   float sectors=max(16.,floor(nominal*38.));
   float orbit=time*(.085+.025*hash(id+19.))/sqrt(max(.3,nominal));
   float angularCell=floor((theta-orbit-thetaOffset)*sectors);
   for(int j=-1;j<=1;j++){
    float cell=angularCell+float(j),wrapped=mod(cell,sectors);
    float key=id*317.+wrapped*17.;
    float rr=(id+.16+hash(key+4.)*.68)/u_density;
    float a=((cell+.15+hash(key+7.)*.7)/sectors+orbit+thetaOffset)*TAU;
    vec2 point=vec2(cos(a),sin(a))*rr;
    vec2 spot=project(point,camera,forward,up,aspect);
    vec2 dp=(uv-spot)*u_resolution;
    float size=(.48+hash(key+11.)*.75)*u_lineWidth;
    float core=exp(-dot(dp,dp)/max(.15,size*size));
    float halo=exp(-dot(dp,dp)/max(.3,size*size*7.))*.10;
    float weight=.12+pow(hash(key+13.),3.)*1.5;
    particles+=u_c2*(core+halo)*weight*exp(-rr*.16)*smoothstep(u_sphereSize*1.1,u_sphereSize*1.7,rr);
   }
  }
  float fade=1.-smoothstep(7.,12.,radius);
  radiance+=particles*fade*diskVisible*u_brightness*1.2;
  float inner=smoothstep(u_sphereSize*1.02,u_sphereSize*1.25,radius);
  float heat=exp(-pow((radius-u_sphereSize*1.7)/(u_sphereSize*.85),2.))*inner;
  float turbulence=.65+.35*sin(radius*67.+sin(theta*TAU*7.-time)*1.8-time*2.);
  radiance+=u_c0*heat*turbulence*.22*u_rimGlow*diskVisible;
  float peak=u_sphereSize*1.75;
  float width=u_sphereSize*(.16+u_diskThickness*.40);
  float sideWeight=pow(abs(cos(theta*TAU)),6.);
  float sideStretch=1.+.55*sideWeight*smoothstep(peak-width*2.,peak+width*3.,radius);
  float glowRadius=radius/sideStretch;
  float outer=smoothstep(peak-width*.12,peak+width*.75,glowRadius);
  float dissolve=smoothstep(peak-width*.55,peak+width*.65,glowRadius);
  float dustEnvelope=exp(-pow((glowRadius-peak-width*.60)/(width*1.05),2.))*dissolve;
  float dust=0.;
  if(dustEnvelope>.002){
   float packing=max(36.,u_density*3.);
   float travel=time*.055;
   float row=floor((radius+travel)*packing);
   float sectors=max(32.,floor((peak+width*.7)*130.));
   for(int i=-1;i<=1;i++){
    float id=row+float(i),rr0=max(.05,(id+.5)/packing-travel);
    float orbit=time*.035-log(rr0/peak)*.50;
    float cell0=floor((theta-orbit-thetaOffset)*sectors);
    for(int j=-1;j<=1;j++){
     float cell=cell0+float(j);
     vec2 key=vec2(id,mod(cell,sectors));
     float rr=max(.05,(id+.1+dustHash(key)*.8)/packing-travel);
     float particleOrbit=time*.035-log(rr/peak)*.50;
     float a=((cell+.1+dustHash(key+1.)*.8)/sectors+particleOrbit+thetaOffset)*TAU;
     vec2 spot=project(vec2(cos(a),sin(a))*rr,camera,forward,up,aspect);
     vec2 dp=(uv-spot)*u_resolution;
     float size=(.35+dustHash(key+2.)*.35)*u_lineWidth*(1.+(1.-dissolve)*.55);
     float d2=dot(dp,dp)/max(.14,size*size);
     dust+=(exp(-d2)+exp(-d2/5.)*.065)*(.4+dustHash(key+3.)*1.2);
    }
   }
  }
  foreground=(diskEmission(glowRadius,theta*TAU,time)*(1.-outer*.93)
   +u_c2*dust*dustEnvelope*2.8*u_rimGlow*u_brightness)*diskVisible;
 }
 float lensRadius=R*(1.14+u_lensing*.10);
 float thickness=R*(.09+u_diskThickness*.14);
 float upper=smoothstep(-.2,.35,sin(angle));
 float lensWidth=thickness*mix(.78,1.,upper);
 float edge=r-lensRadius;
 float peak=u_sphereSize*1.75;
 float width=u_sphereSize*(.16+u_diskThickness*.40);
 float sourceRadius=max(u_sphereSize*1.02,peak+edge/lensWidth*width);
 float sourceAngle=atan(.65+abs(sin(angle))*.55,cos(angle));
 vec3 bent=diskEmission(sourceRadius,sourceAngle,time);
 float lensEnvelope=exp(-pow(edge/(lensWidth*2.8),4.));
 float lensStrength=mix(.36,.68,upper)*mix(.65,1.,clamp(u_lensing,0.,1.));
 float photon=exp(-pow((r-R*1.025)/max(pixel*.8,R*.012),2.));
 radiance+=(bent*lensStrength*lensEnvelope+u_c0*photon*.38*u_rimGlow)*shadow;
 radiance+=foreground;
 vec3 color=vec3(1.)-exp(-radiance);
 gl_FragColor=vec4(clamp(color,0.,1.),1.);
}`;

const canvas = document.createElement('canvas');
host.appendChild(canvas);
const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
if (!gl) { console.warn('[hero-bg] WebGL unavailable'); return; }

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
  return s;
}
let prog;
try {
  prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}'));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, 'a_position');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(prog));
} catch (e) { console.error('[hero-bg]', e.message); return; }

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

const locs = {};
for (let i = 0; i < gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i++) {
  const info = gl.getActiveUniform(prog, i);
  locs[info.name] = gl.getUniformLocation(prog, info.name);
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);

const mobile = () => innerWidth <= 600 || matchMedia('(pointer: coarse)').matches;
function size() {
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
  const ratio = Math.min(devicePixelRatio || 1, Math.sqrt(Math.min(cfg.maxPixels, mobile() ? 180000 : 750000) / (w * h)));
  canvas.width = Math.max(1, Math.floor(w * ratio));
  canvas.height = Math.max(1, Math.floor(h * ratio));
}

const pointer = [.5, .5], target = [.5, .5];
let presence = 0, targetPresence = 0, elapsed = 0, last = 0, frame = 0, visible = true;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  for (const name in locs) {
    const k = name.replace(/^u_/, ''), l = locs[name];
    if (k === 'resolution') gl.uniform2f(l, canvas.width, canvas.height);
    else if (k === 'pointer') gl.uniform2f(l, pointer[0], pointer[1]);
    else if (/^c[0-2]$/.test(k)) gl.uniform3f(l, ...rgb(cfg.colors[+k[1]]));
    else gl.uniform1f(l, k === 'time' ? elapsed : k === 'presence' ? presence : (typeof cfg[k] === 'number' ? cfg[k] : 0));
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function tick(now) {
  frame = 0;
  if (!visible || document.hidden) return;
  const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
  last = now;
  if (!reduced.matches) elapsed += dt * cfg.speed;
  const ease = 1 - Math.exp(-dt * 5);
  pointer[0] += (target[0] - pointer[0]) * ease;
  pointer[1] += (target[1] - pointer[1]) * ease;
  presence += (targetPresence - presence) * ease;
  render();
  if (!reduced.matches) frame = requestAnimationFrame(tick);
}
function wake() { if (!frame && visible && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); } }

section.addEventListener('pointermove', e => {
  const r = host.getBoundingClientRect();
  target[0] = (e.clientX - r.left) / r.width;
  target[1] = 1 - (e.clientY - r.top) / r.height;
  targetPresence = 1; wake();
});
section.addEventListener('pointerleave', () => { targetPresence = 0; wake(); });
document.addEventListener('visibilitychange', wake);
new ResizeObserver(() => { size(); render(); wake(); }).observe(host);
new IntersectionObserver(([e]) => {
  visible = e.isIntersecting;
  if (visible) wake(); else { cancelAnimationFrame(frame); frame = 0; }
}).observe(host);
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(frame); frame = 0; });

size(); render(); wake();
})();
