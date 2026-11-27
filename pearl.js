(() => {
const scene = document.querySelector(".scene");
const home = document.getElementById("home");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (!scene || !home) return;

let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;
let frame = null;

// Smoothly ease towards the pointer; the loop stops itself once settled.
function tick() {
  if (document.documentElement.dataset.theme !== "light" || document.hidden) {
    frame = null;
    return;
  }
  currentX += (targetX - currentX) * 0.05;
  currentY += (targetY - currentY) * 0.05;

  scene.style.setProperty("--px", (currentX * 10).toFixed(2));
  scene.style.setProperty("--py", (currentY * 7).toFixed(2));
  scene.style.setProperty("--lx", (currentX * -6).toFixed(2)); // light glides opposite

  const settled =
    Math.abs(targetX - currentX) < 0.001 && Math.abs(targetY - currentY) < 0.001;
  frame = settled ? null : requestAnimationFrame(tick);
}

function follow(event) {
  if (reduceMotion.matches || document.documentElement.dataset.theme !== "light") return;
  targetX = (event.clientX / window.innerWidth - 0.5) * 2;
  targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  if (!frame) frame = requestAnimationFrame(tick);
}

home.addEventListener("pointermove", follow, { passive: true });

home.addEventListener("pointerleave", () => {
  if (document.documentElement.dataset.theme !== "light" || reduceMotion.matches) return;
  targetX = 0;
  targetY = 0;
  if (!frame) frame = requestAnimationFrame(tick);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && document.documentElement.dataset.theme === "light" && !reduceMotion.matches &&
      (targetX !== currentX || targetY !== currentY) && !frame) frame = requestAnimationFrame(tick);
});
new MutationObserver(() => {
  if (document.documentElement.dataset.theme === "light") return;
  targetX = targetY = currentX = currentY = 0;
  if (frame) cancelAnimationFrame(frame);
  frame = null;
  scene.style.setProperty("--px", 0);
  scene.style.setProperty("--py", 0);
  scene.style.setProperty("--lx", 0);
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();