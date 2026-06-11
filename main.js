/* Hansei landing — motion + 3D assembly.
   GSAP + ScrollTrigger (globals), Lenis (global), three (importmap module). */

import * as THREE from "three";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => window.innerWidth >= 768;

gsap.registerPlugin(ScrollTrigger);

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
} else {
  document.documentElement.classList.add("reduced");
}

/* ---------- loader + hero intro ---------- */
const loader = document.getElementById("loader");
const heroIntro = () => {
  loader.classList.add("is-done");
  if (reduced) return;
  gsap.timeline({ delay: 0.15 })
    .fromTo("[data-hero-line]", { yPercent: 112 }, { yPercent: 0, duration: 1.25, ease: "expo.out", stagger: 0.12 })
    .fromTo("[data-hero-stagger]", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: "quart.out", stagger: 0.1 }, "-=0.7");
};
Promise.race([
  Promise.all([document.fonts.ready, new Promise((r) => (window.addEventListener("load", r, { once: true })))]),
  new Promise((r) => setTimeout(r, 2600)),
]).then(() => setTimeout(heroIntro, 120));

/* ---------- nav ---------- */
const nav = document.getElementById("nav");
ScrollTrigger.create({
  start: () => window.innerHeight * 0.82 + " top",
  end: "max",
  onToggle: (self) => nav.classList.toggle("is-solid", self.isActive),
});

/* ---------- hero parallax ---------- */
if (!reduced) {
  gsap.to(".hero__media", {
    yPercent: 14, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
}

/* ---------- generic reveals ---------- */
if (!reduced) {
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.05, ease: "quart.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });
  document.querySelectorAll("[data-line]").forEach((el, i) => {
    gsap.fromTo(el, { yPercent: 112 }, {
      yPercent: 0, duration: 1.15, ease: "expo.out", delay: (i % 2) * 0.1,
      scrollTrigger: { trigger: el.closest("h2"), start: "top 84%" },
    });
  });
  document.querySelectorAll("[data-parallax] img").forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 8, ease: "none",
      scrollTrigger: { trigger: img.closest("[data-parallax]"), start: "top bottom", end: "bottom top", scrub: true },
    });
  });
} else {
  gsap.set("[data-reveal]", { opacity: 1, y: 0 });
}

/* ---------- collection flow (desktop scroll-driven) ---------- */
const track = document.getElementById("flow-track");
let flowST = null;
const buildFlow = () => {
  if (flowST) { flowST.kill(); gsap.set(track, { x: 0 }); flowST = null; }
  if (reduced || !isDesktop()) return;
  const dist = track.scrollWidth - window.innerWidth;
  flowST = gsap.to(track, {
    x: -dist, ease: "none",
    scrollTrigger: {
      trigger: ".flow", start: "top 12%", end: () => "+=" + dist,
      pin: true, scrub: 1, invalidateOnRefresh: true,
    },
  }).scrollTrigger;
};

/* ---------- workshop videos ---------- */
const vids = document.querySelectorAll(".video video");
const vio = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) { v.play().catch(() => {}); } else { v.pause(); }
  });
}, { threshold: 0.35 });
vids.forEach((v) => vio.observe(v));

/* ============================================================
   3D — the round table, parametric, scroll-assembled
   ============================================================ */
const canvas = document.getElementById("table-canvas");
const hint = document.getElementById("three-hint");

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
camera.position.set(1.45, 0.72, 2.05);
camera.lookAt(0, 0.3, 0);

scene.add(new THREE.AmbientLight(0xfff6ea, 0.85));
const key = new THREE.DirectionalLight(0xfff2e0, 1.6);
key.position.set(2.4, 3.6, 2.6);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe8eef2, 0.5);
fill.position.set(-2.6, 1.4, -2.2);
scene.add(fill);

const faceMat = new THREE.MeshStandardMaterial({ color: 0x615c54, roughness: 0.93, metalness: 0 });
const coreMat = new THREE.MeshStandardMaterial({ color: 0x2e2b27, roughness: 0.82, metalness: 0 });

const group = new THREE.Group();
scene.add(group);

/* contact shadow */
const shTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  grd.addColorStop(0, "rgba(40,36,30,0.42)");
  grd.addColorStop(1, "rgba(40,36,30,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1.5, 1.5),
  new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.001;
scene.add(shadow);

/* geometry helpers */
const roundedRectShape = (w, h, r) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
};
const panel = (w, h, t, r = 0.018) => {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), { depth: t, bevelEnabled: false });
  geo.translate(0, 0, -t / 2);
  return new THREE.Mesh(geo, [faceMat, coreMat]);
};
const disc = (r, t) => {
  const geo = new THREE.CylinderGeometry(r, r, t, 72);
  return new THREE.Mesh(geo, [coreMat, faceMat, faceMat]);
};

/* the table */
const T = 0.022;            /* board thickness */
const LEG_H = 0.52, LEG_W = 0.17, LEG_R = 0.305;
const TOP_Y = 0.46, LOW_Y = 0.165;
const parts = [];           /* {obj, home:Vector3, out:Vector3} */
const addPart = (obj, home, out) => {
  obj.position.copy(out);
  group.add(obj);
  parts.push({ obj, home, out });
};

/* discs */
addPart(disc(0.43, T), new THREE.Vector3(0, TOP_Y, 0), new THREE.Vector3(0, TOP_Y + 0.34, 0));
addPart(disc(0.405, T), new THREE.Vector3(0, LOW_Y, 0), new THREE.Vector3(0, LOW_Y - 0.28, 0));

/* legs: 4, tangential, full height */
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const leg = panel(LEG_W, LEG_H, T, 0.022);
  leg.rotation.y = -a + Math.PI / 2;     /* face tangent to circle */
  const x = Math.cos(a) * LEG_R, z = Math.sin(a) * LEG_R;
  addPart(leg, new THREE.Vector3(x, LEG_H / 2, z), new THREE.Vector3(x, LEG_H / 2, z));
}

/* keys: batten + two hooks per joint, top of each leg + below lower disc */
const keyGroup = () => {
  const g = new THREE.Group();
  const batten = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.02, 0.027), [coreMat, coreMat, faceMat, faceMat, coreMat, coreMat]);
  g.add(batten);
  for (const dx of [-0.032, 0.032]) {
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.085, 0.02), [coreMat, coreMat, faceMat, faceMat, coreMat, coreMat]);
    hook.position.set(dx, -0.012, 0.0);
    g.add(hook);
  }
  return g;
};
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const x = Math.cos(a) * (LEG_R + T * 0.9), z = Math.sin(a) * (LEG_R + T * 0.9);
  const top = keyGroup();
  top.rotation.y = -a + Math.PI / 2;
  addPart(top, new THREE.Vector3(x, TOP_Y + 0.045, z), new THREE.Vector3(x, TOP_Y + 0.62, z));
  const bot = keyGroup();
  bot.rotation.y = -a + Math.PI / 2;
  addPart(bot, new THREE.Vector3(Math.cos(a) * (LEG_R + T * 0.9), LOW_Y - 0.045, Math.sin(a) * (LEG_R + T * 0.9)), new THREE.Vector3(Math.cos(a) * (LEG_R + T * 0.9), LOW_Y - 0.55, Math.sin(a) * (LEG_R + T * 0.9)));
}

/* assembly progress */
let assembly = reduced ? 1 : 0;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const applyAssembly = () => {
  const p = easeInOut(assembly);
  for (const { obj, home, out } of parts) obj.position.lerpVectors(out, home, p);
  shadow.material.opacity = 0.25 + p * 0.75;
};
applyAssembly();

if (!reduced) {
  ScrollTrigger.create({
    trigger: "#three-section", start: "top top", end: "+=170%",
    pin: ".three__sticky", scrub: 0.6,
    onUpdate: (self) => {
      assembly = self.progress;
      applyAssembly();
      hint.classList.toggle("is-hidden", self.progress > 0.92);
    },
  });
} else {
  hint.classList.add("is-hidden");
}

/* orbit: pointer drag, idle spin */
let targetRotY = -0.5, rotY = -0.5, tilt = 0, targetTilt = 0;
let dragging = false, px = 0, py = 0, idle = true;
canvas.style.cursor = "grab";
canvas.addEventListener("pointerdown", (e) => {
  dragging = true; idle = false; px = e.clientX; py = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  targetRotY += (e.clientX - px) * 0.0085;
  targetTilt = THREE.MathUtils.clamp(targetTilt + (e.clientY - py) * 0.003, -0.35, 0.45);
  px = e.clientX; py = e.clientY;
});
const endDrag = () => { dragging = false; canvas.style.cursor = "grab"; setTimeout(() => (idle = true), 4000); };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/* swatches */
document.querySelectorAll(".swatch").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelector(".swatch.is-active")?.classList.remove("is-active");
    btn.classList.add("is-active");
    const face = new THREE.Color(btn.dataset.c);
    const core = new THREE.Color(btn.dataset.core);
    gsap.to(faceMat.color, { r: face.r, g: face.g, b: face.b, duration: 0.6, ease: "quart.out" });
    gsap.to(coreMat.color, { r: core.r, g: core.g, b: core.b, duration: 0.6, ease: "quart.out" });
  });
});

/* render loop (only while section near viewport) */
let visible = false;
new IntersectionObserver((e) => (visible = e[0].isIntersecting), { rootMargin: "20%" }).observe(canvas);

const sizeCanvas = () => {
  const { clientWidth: w, clientHeight: h } = canvas;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
new ResizeObserver(sizeCanvas).observe(canvas);
sizeCanvas();

renderer.setAnimationLoop(() => {
  if (!visible) return;
  if (idle && !dragging && assembly > 0.9) targetRotY += 0.0018;
  rotY += (targetRotY - rotY) * 0.07;
  tilt += (targetTilt - tilt) * 0.07;
  group.rotation.y = rotY;
  group.rotation.x = tilt * 0.4;
  shadow.rotation.z = rotY;
  renderer.render(scene, camera);
});

/* rebuild flow on resize (debounced) */
let rT;
window.addEventListener("resize", () => {
  clearTimeout(rT);
  rT = setTimeout(() => { buildFlow(); ScrollTrigger.refresh(); }, 220);
});
buildFlow();
