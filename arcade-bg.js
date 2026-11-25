/* Classic script (no ES module) so it also works when index.html is opened straight from disk. Needs the three.js r128 script tag before it. */
(function () {
if (typeof THREE === 'undefined') { console.warn('[arcade-bg] three.js not loaded'); return; }

// Drift cubes behind the Arcade launch panel. Same engine as the hero, but the cubes slowly cycle through soft rainbow colours.
const host = document.getElementById('arcade'), canvas = document.getElementById('arcade-drift');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = () => host.clientWidth, H = () => host.clientHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 1000);
camera.position.set(0, 0, 150);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(W(), H(), false);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;   // r128 defaults to linear output
renderer.toneMappingExposure = 0.95;   // calmer than the hero so the colours never glare

scene.add(new THREE.AmbientLight(0xffffff, 1.1 / Math.PI));
const key = new THREE.DirectionalLight(0xffffff, 1.7 / Math.PI); key.position.set(-10, 15, 20); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.5 / Math.PI); fill.position.set(10, -10, -10); scene.add(fill);

const rand = (a, b) => a + Math.random() * (b - a);
const cubes = [];

function boundsAt(z) {
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (camera.position.z - z);
  return { width: h * camera.aspect, height: h };
}
function cubeSize() {
  const r = Math.random();
  if (r < .28) return rand(.5, 3); if (r < .5) return rand(3, 7); if (r < .72) return rand(7, 14);
  if (r < .88) return rand(14, 23); if (r < .96) return rand(23, 32); return rand(32, 40);
}
function makeCube() {
  const size = cubeSize(), geo = new THREE.BoxGeometry(size, size, size);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: rand(.65, 1), metalness: 0 }));
  scene.add(mesh);
  const hue0 = Math.random(), sat0 = rand(.42, .58), lit0 = rand(.4, .54);
  mesh.material.color.setHSL(hue0, sat0, lit0);   // starting colour (also what reduced-motion users see)
  let edge = null;
  if (Math.random() < .85) {
    edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ transparent: true, opacity: rand(.2, .6) }));
    mesh.add(edge);
  }
  return { mesh, edge, hue: hue0, sat: sat0, lit: lit0, size, radius: size * Math.sqrt(3) / 2, position: new THREE.Vector3(),
    velocity: new THREE.Vector3(rand(-.15, .15), rand(-.15, .15), rand(-.1, .1)),
    kick: new THREE.Vector3(), target: new THREE.Vector3(), nextTarget: 0,
    spin: new THREE.Vector3(rand(-.12, .12), rand(-.12, .12), rand(-.12, .12)),
    phase: rand(0, 6.28), floatSpeed: rand(.15, .4) };
}
function place() {
  cubes.forEach((c, i) => {
    for (let n = 0; n < 500; n++) {
      const z = c.size > 23 ? rand(-100, -35) : rand(-100, 35), b = boundsAt(z);
      const p = new THREE.Vector3(rand(-b.width / 2 + c.size / 2, b.width / 2 - c.size / 2), rand(-b.height / 2 + c.size / 2, b.height / 2 - c.size / 2), z);
      if (cubes.slice(0, i).every(o => p.distanceTo(o.position) >= c.radius + o.radius + 2)) { c.position.copy(p); break; }
      if (n === 499) c.position.set(0, 0, rand(-100, -40));
    }
    c.mesh.position.copy(c.position);
  });
}
function retarget(c) {
  const b = boundsAt(c.position.z);
  c.target.set(rand(-b.width * .4, b.width * .4), rand(-b.height * .4, b.height * .4), rand(-100, 35));
  c.nextTarget = performance.now() + rand(8000, 18000);
}
for (let i = 0; i < 42; i++) cubes.push(makeCube());
place(); cubes.forEach(retarget);

// Cursor in hero-local normalized coords (-1..1)
const ptr = { x: 0, y: 0, on: false };
addEventListener('pointermove', e => {
  const r = host.getBoundingClientRect();
  ptr.on = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  ptr.x = (e.clientX - r.left) / r.width * 2 - 1;
  ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
});
host.addEventListener('pointerleave', () => { ptr.on = false; });

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);
const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  if (!visible || document.documentElement.classList.contains('arcade-open')) return;
  const dt = Math.min(clock.getDelta(), .035), time = clock.elapsedTime;

  for (const c of cubes) {
    if (performance.now() > c.nextTarget || c.position.distanceTo(c.target) < 2) retarget(c);
    const f = c.target.clone().sub(c.position).normalize().multiplyScalar(.24);
    f.x += Math.sin(time * c.floatSpeed + c.phase) * .012;
    f.y += Math.cos(time * c.floatSpeed + c.phase) * .012;
    f.z += Math.sin(time * .2 + c.phase) * .005;
    c.velocity.add(f.multiplyScalar(dt)).multiplyScalar(.99);
    if (c.velocity.length() > .64) c.velocity.setLength(.64);
    c.position.add(c.velocity.clone().multiplyScalar(dt * 5));

    // Cursor push: project the pointer to this cube's depth and shove it away
    if (ptr.on) {
      const b = boundsAt(c.position.z);
      const dx = c.position.x - ptr.x * b.width / 2, dy = c.position.y - ptr.y * b.height / 2;
      const d = Math.hypot(dx, dy), reach = c.size * .75 + 16;
      if (d < reach && d > .001) {
        const s = 1 - d / reach;
        c.kick.x += dx / d * s * 1; c.kick.y += dy / d * s * 1;
        c.mesh.rotation.x += s * dt * 4; c.mesh.rotation.y += s * dt * 4;
      }
    }
    c.position.addScaledVector(c.kick, dt * 30);
    c.kick.multiplyScalar(.93);

    // slow colour cycle (about 50s per full loop), soft saturation so it stays easy on the eyes
    const hue = (c.hue + time * .02) % 1;
    c.mesh.material.color.setHSL(hue, c.sat, c.lit);
    if (c.edge) c.edge.material.color.setHSL(hue, .5, .78);

    c.mesh.rotation.x += c.spin.x * dt; c.mesh.rotation.y += c.spin.y * dt; c.mesh.rotation.z += c.spin.z * dt;
  }

  for (let i = 0; i < cubes.length; i++) for (let j = i + 1; j < cubes.length; j++) {
    const a = cubes[i], b = cubes[j], diff = a.position.clone().sub(b.position), d = diff.length(), min = a.radius + b.radius + 2;
    if (d < min && d > .0001) {
      const n = diff.normalize(), pen = min - d;
      a.position.addScaledVector(n, pen * .5); b.position.addScaledVector(n, -pen * .5);
      const close = a.velocity.clone().sub(b.velocity).dot(n);
      if (close < 0) { const imp = n.clone().multiplyScalar(close * .4); a.velocity.sub(imp); b.velocity.add(imp); }
    }
  }

  for (const c of cubes) {
    const b = boundsAt(c.position.z), m = c.size / 2;
    for (const ax of ['x', 'y']) {
      const lim = (ax === 'x' ? b.width : b.height) / 2 - m;
      if (c.position[ax] > lim) { c.position[ax] = lim; c.velocity[ax] *= -.5; c.kick[ax] *= -.5; }
      if (c.position[ax] < -lim) { c.position[ax] = -lim; c.velocity[ax] *= -.5; c.kick[ax] *= -.5; }
    }
    c.mesh.position.copy(c.position);
  }
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = W() / H(); camera.updateProjectionMatrix();
  renderer.setSize(W(), H(), false); place();
});
if (reduced) renderer.render(scene, camera); else frame();
})();