
(() => {
'use strict';
const root = document.getElementById('crimson-bg');
const canvas = document.getElementById('crimson-bg-canvas');
const home = document.getElementById('home');
if (!root || !canvas || !home || !window.THREE) {
  console.warn('[red-hero] Background markup or Three.js is unavailable.');
  return;
}
const THREE = window.THREE;

/* ---------- config ---------- */
const mq = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = mq.matches;
const small = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
const FOV = 48, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2)), R = 3.15;
const N_SPHERE = small ? 7000 : 15000, N_STARS = small ? 450 : 1000, N_ROCKS = small ? 5 : 9; // rocks per variant
let pr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2);

/* seeded random so the composition is always the same */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rand = mulberry32(61126), rr = (a, b) => a + (b - a) * rand();

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false }); } catch (e) { return; }
renderer.setClearColor(0x000000, 1);   // black

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 250);
const rig = new THREE.Group(); scene.add(rig);

/* ---------- particle sphere ---------- */
function dens(x, y, z) { // organic, uneven surface density
  const v = Math.sin(x*2.6+1.1)*Math.sin(y*3.1+2.3) + 0.7*Math.sin(z*2.2-0.7+x*1.3) + 0.35*Math.sin((x+y+z)*4.1);
  return 0.35 + 0.65 * Math.min(1, Math.max(0, 0.5 + v * 0.35));
}
function buildSphere(n) {
  const pos = new Float32Array(n*3), col = new Float32Array(n*3);
  const size = new Float32Array(n), alpha = new Float32Array(n), seed = new Float32Array(n);
  const pal = [[.78,.05,.10],[.88,.13,.15],[.50,.03,.07],[.96,.42,.42]]; // red, bright scarlet, deep red, soft rose
  for (let i = 0; i < n; i++) {
    let x, y, z;
    do { z = rand()*2-1; const a = rand()*6.2831853, s = Math.sqrt(1-z*z); x = s*Math.cos(a); y = s*Math.sin(a); }
    while (rand() > dens(x, y, z));
    let r = R * (1 + (rand()-0.5) * 0.035);
    if (rand() < 0.035) r += R * rr(0.02, 0.14);        // a few strays drifting off the shell
    pos.set([x*r, y*r, z*r], i*3);
    const k = rand(), c = k < .45 ? pal[0] : k < .78 ? pal[1] : k < .96 ? pal[2] : pal[3], b = rr(.7, 1.1);
    col.set([c[0]*b, c[1]*b, c[2]*b], i*3);
    size[i] = rr(0.014, 0.03) + Math.pow(rand(), 5) * 0.05;
    alpha[i] = 0.25 + 0.75 * Math.pow(rand(), 1.4);
    seed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  return g;
}
const sphereMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uScale: { value: 1000 }, uMouse: { value: new THREE.Vector2() } },
  transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  vertexShader: `
    uniform float uTime, uScale; uniform vec2 uMouse;
    attribute vec3 aColor; attribute float aSize, aAlpha, aSeed;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vec3 n = normalize(wp.xyz);
      wp.xyz += n * sin(dot(n, vec3(.62,.41,.67))*4.0 + uTime*.28) * 0.04;      // slow surface swell
      vec2 dm = wp.xy - uMouse;
      float f = exp(-dot(dm,dm)*.35) * smoothstep(-.3, 1., n.z);                   // cursor distortion
      wp.xyz += n * f * 0.20;
      vec4 mv = viewMatrix * wp;
      gl_Position = projectionMatrix * mv;
      float tw = .62 + .38*sin(uTime*(.5+aSeed*1.3) + aSeed*47.0);                 // shimmer
      vec3 nv = normalize(mat3(viewMatrix) * n);
      float rim = 1.0 - abs(nv.z);
      vAlpha = aAlpha * tw * mix(.38, 1., nv.z*.5+.5) * mix(1., .62, rim*rim);
      vColor = aColor * (1. + f*.3);
      gl_PointSize = max(aSize * uScale / -mv.z, 1.4);
    }`,
  fragmentShader: `
    varying vec3 vColor; varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - .5);
      if (d > .5) discard;
      float core = smoothstep(.22, 0., d), glow = pow(smoothstep(.5, 0., d), 2.2);
      gl_FragColor = vec4(vColor, min(1., (core*.95 + glow*.3) * vAlpha * 1.35));
    }`
});
const sphere = new THREE.Points(buildSphere(N_SPHERE), sphereMat);
sphere.frustumCulled = false;
rig.add(sphere);

/* ---------- atmospheric halo ---------- */
const halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `
    varying vec2 vUv; uniform float uTime;
    void main(){
      float r = length(vUv*2.-1.);
      float rim = exp(-pow((r-.37)/.10, 2.)) * .22;
      float inner = smoothstep(.37, 0., r) * .05;
      float outer = exp(-max(r-.37, 0.)*5.5) * .16 * step(.37, r);
      float a = (rim + inner + outer) * smoothstep(1., .55, r) * (.95 + .05*sin(uTime*.4));
      a += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453) - .5) / 400.;  // anti-banding
      gl_FragColor = vec4(.86, .10, .14, max(a * .75, 0.));
    }`
}));
halo.position.z = -2; scene.add(halo);

/* ---------- procedural rocky comets (instanced) ---------- */
function hash3(x,y,z){ const h = Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453; return h - Math.floor(h); }
function vnoise(x,y,z){
  const xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z);
  let u=x-xi, v=y-yi, w=z-zi; u=u*u*(3-2*u); v=v*v*(3-2*v); w=w*w*(3-2*w);
  const L=(a,b,t)=>a+(b-a)*t, h=(i,j,k)=>hash3(xi+i,yi+j,zi+k);
  return L(L(L(h(0,0,0),h(1,0,0),u),L(h(0,1,0),h(1,1,0),u),v), L(L(h(0,0,1),h(1,0,1),u),L(h(0,1,1),h(1,1,1),u),v), w);
}
function fbm(x,y,z){ let a=.5,s=0; for(let i=0;i<4;i++){ s+=a*vnoise(x,y,z); x*=2.03; y*=2.03; z*=2.03; a*=.5; } return s; }
function makeRock(seed) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, v = new THREE.Vector3();
  const sx = rr(.85,1.35), sy = rr(.6,1), sz = rr(.7,1.1);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 0.7 + fbm(v.x*1.4+seed, v.y*1.4+seed*.7, v.z*1.4-seed*.3)*0.7 + fbm(v.x*4+seed, v.y*4, v.z*4)*0.12;
    p.setXYZ(i, v.x*d*sx, v.y*d*sy, v.z*d*sz);
  }
  g.computeVertexNormals();               // non-indexed => flat, faceted rock
  return g;
}
const rockMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float aSeed; varying vec3 vN, vW, vLocal;
    void main(){
      vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.);
      vW = wp.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
      vLocal = position + aSeed * 10.;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    varying vec3 vN, vW, vLocal;
    float h31(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
      return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }
    void main(){
      vec3 N = normalize(vN), V = normalize(cameraPosition - vW), L = normalize(-vW);   // lit by the sphere
      float ndl = max(dot(N, L), 0.);
      float fr = pow(1. - max(dot(N, V), 0.), 2.4);
      float tex = vn(vLocal*3.)*.6 + vn(vLocal*9.)*.4;
      vec3 base = mix(vec3(.80,.76,.76), vec3(.96,.93,.93), tex);
      vec3 c = base*(.62 + .38*ndl) + vec3(.80,.08,.12)*ndl*.14*(.5+tex) + vec3(.85,.10,.14)*fr*(.25+.75*ndl)*.55;
      c = mix(c, vec3(.02,.01,.01), .65*smoothstep(12., 48., length(vW - cameraPosition)));
      gl_FragColor = vec4(c, 1.);
    }`
});
const rockSets = [], dummy = new THREE.Object3D(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
for (let v = 0; v < 3; v++) {
  const geo = makeRock(v * 7.3 + 1.7), seeds = new Float32Array(N_ROCKS), data = [];
  for (let i = 0; i < N_ROCKS; i++) {
    const z = -rr(7, 34), speed = rr(.004, .011) * (1.8 - (-z - 7) / 27 * 1.2), ang = rr(-.5, .5) + (rand() < .7 ? Math.PI : 0);
    seeds[i] = rand();
    data.push({
      z, nx: rr(-1.3, 1.3), ny: rr(-1.2, 1.2), vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed*.6,
      frac: rr(.012, .04) * (rand() < .12 ? 2.6 : 1),
      ax: new THREE.Vector3(rr(-1,1), rr(-1,1), rr(-1,1)).normalize(), ax2: new THREE.Vector3(rr(-1,1), rr(-1,1), rr(-1,1)).normalize(),
      a0: rr(0, 6.28), s1: rr(.02, .1) * (rand() < .5 ? -1 : 1), s2: rr(.01, .05)
    });
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const mesh = new THREE.InstancedMesh(geo, rockMat, N_ROCKS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
  scene.add(mesh); rockSets.push({ mesh, data });
}
const wrap = (v, l) => (((v + l) % (2*l)) + 2*l) % (2*l) - l;
function updateRocks(t) {
  for (const { mesh, data } of rockSets) {
    data.forEach((c, i) => {
      const hh = TAN * (camZ - c.z), hw = hh * aspect;
      dummy.position.set(wrap(c.nx + c.vx*t, 1.35) * hw, wrap(c.ny + c.vy*t, 1.3) * hh, c.z);
      q1.setFromAxisAngle(c.ax, c.a0 + c.s1*t); q2.setFromAxisAngle(c.ax2, c.s2*t);
      dummy.quaternion.multiplyQuaternions(q1, q2);
      dummy.scale.setScalar(c.frac * hh);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- sparse distant dust & stars ---------- */
function buildStars(n) {
  const pos = new Float32Array(n*3), col = new Float32Array(n*3), size = new Float32Array(n), alpha = new Float32Array(n), seed = new Float32Array(n), spd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const z = -rr(10, 75);
    pos.set([rr(-100, 100), rr(-55, 55), z], i*3);
    const c = rand() < .6 ? [.72,.62,.63] : [.85,.14,.18];
    col.set(c, i*3);
    size[i] = .8 + Math.pow(rand(), 6) * 1.8;
    alpha[i] = rr(.2, .65); seed[i] = rand();
    spd[i] = rr(.002, .006) * (12 - z) * .83;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
  return g;
}
const starMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uPR: { value: 1 } },
  transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  vertexShader: `
    uniform float uTime, uPR; attribute vec3 aColor; attribute float aSize, aAlpha, aSeed, aSpeed;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      vec3 p = position; p.x = mod(p.x + 100. - uTime*aSpeed, 200.) - 100.;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      gl_PointSize = aSize * uPR;
      vAlpha = aAlpha * (.75 + .25*sin(uTime*(.3+aSeed) + aSeed*60.)); vColor = aColor;
    }`,
  fragmentShader: `
    varying vec3 vColor; varying float vAlpha;
    void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vColor, smoothstep(.5, 0., d) * vAlpha); }`
});
const stars = new THREE.Points(buildStars(N_STARS), starMat);
stars.frustumCulled = false; scene.add(stars);

/* ---------- sizing ---------- */
let W = 0, H = 0, aspect = 1, camZ = 12, lastPR = 0;
function resize() {
  const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
  if (w === W && h === H && pr === lastPR) return;
  W = w; H = h; lastPR = pr; aspect = w / h;
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  camera.aspect = aspect; camera.updateProjectionMatrix();
  camZ = Math.max(12, R * 1.3 / (TAN * aspect));                 // keeps the sphere inside portrait screens
  sphereMat.uniforms.uScale.value = h * pr / (2 * TAN);
  starMat.uniforms.uPR.value = pr;
  const rim = (camZ + 2) * R / Math.sqrt(camZ*camZ - R*R);       // halo ring follows the sphere's silhouette
  halo.scale.set(rim / .37, rim / .37, 1);
}

/* ---------- input ---------- */
const target = { x: 0, y: 0 }, mouse = { x: 0, y: 0 };
home.addEventListener('pointermove', e => {
  const bounds = root.getBoundingClientRect();
  target.x = (e.clientX - bounds.left) / bounds.width * 2 - 1;
  target.y = -((e.clientY - bounds.top) / bounds.height * 2 - 1);
}, { passive: true });
home.addEventListener('pointerleave', () => { target.x = target.y = 0; });

/* ---------- render loop ---------- */
let t = reduced ? 14 : 0, raf = 0, last = performance.now(), acc = 0, frames = 0, ready = false, visible = true;
function render() {
  const sway = reduced ? 0 : 1;
  sphereMat.uniforms.uTime.value = halo.material.uniforms.uTime.value = starMat.uniforms.uTime.value = t;
  sphere.rotation.y = t * 0.045;                                   // calm rotation
  sphere.rotation.x = 0.28 + Math.sin(t * 0.07) * 0.05;
  rig.rotation.y = mouse.x * 0.10; rig.rotation.x = -mouse.y * 0.07;
  const pd = camZ - R;
  sphereMat.uniforms.uMouse.value.set(mouse.x * TAN * aspect * pd, mouse.y * TAN * pd);
  camera.position.set(mouse.x * 0.45 + Math.sin(t * .05) * .25 * sway, mouse.y * 0.3 + Math.cos(t * .04) * .15 * sway, camZ);
  camera.lookAt(0, 0, 0);
  updateRocks(t);
  renderer.render(scene, camera);
  if (!ready) { ready = true; root.classList.add('is-ready'); }
}
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(raw, 0.05); last = now;
  t += dt;
  const k = 1 - Math.exp(-dt * 2.2);
  mouse.x += (target.x - mouse.x) * k; mouse.y += (target.y - mouse.y) * k;
  render();
  if (++frames > 30) {                                              // adaptive quality
    acc += raw;
    if (frames === 120) { if (acc / 90 > 0.026 && pr > 1) { pr = Math.max(1, pr - .25); resize(); } acc = 0; frames = 30; }
  }
  raf = requestAnimationFrame(frame);
}
function active() { return visible && !document.hidden && document.documentElement.dataset.theme === 'red'; }
function start() { if (!raf && !reduced && active()) { last = performance.now(); raf = requestAnimationFrame(frame); } }
function stop() { cancelAnimationFrame(raf); raf = 0; }
function refresh() {
  if (!active()) { stop(); return; }
  resize();
  if (reduced) { stop(); render(); }
  else start();
}

let rz = 0;
addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(refresh); }, { passive: true });
document.addEventListener('visibilitychange', refresh);
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); }).observe(root);
new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
const onMotion = e => { reduced = e.matches; if (reduced) mouse.x = mouse.y = 0; refresh(); };
mq.addEventListener ? mq.addEventListener('change', onMotion) : mq.addListener(onMotion);

refresh();
})();
