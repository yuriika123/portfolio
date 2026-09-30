import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

// A browser adaptation of reference/oF/26-04-29_BreathingSphere.
// Keep the placement equations and periods; oF noise and random seeds differ.
const COUNT = 350;
const ALPHA = 120 / 255;
const DEG = Math.PI / 180;
const holder = document.querySelector('#artwork');
const canvas = document.querySelector('#sphere');
const toggle = document.querySelector('#motion-toggle');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0xf0f0f0, 1);
  // oF's unlit vertex colors are sRGB values, without cinematic tone mapping.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
  camera.position.z = 1000;
  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const geometry = new THREE.SphereGeometry(1, 24, 16);
  const noise = new ImprovedNoise();
  let seed = 20260429;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const hsv = (h, s) => {
    const sector = h * 6;
    const x = 1 - s * Math.abs(sector % 2 - 1);
    const low = 1 - s;
    const high = 1;
    const mid = x;
    const rgb = [[high, mid, low], [mid, high, low], [low, high, mid], [low, mid, high], [mid, low, high], [high, low, mid]][Math.floor(sector) % 6];
    return new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace);
  };
  const spheres = Array.from({ length: COUNT }, (_, i) => {
    const material = new THREE.MeshBasicMaterial({
      color: hsv((150 + random() * 105) / 255, (180 + random() * 75) / 255),
      transparent: true, opacity: ALPHA,
      depthTest: true, depthWrite: true,
      side: THREE.FrontSide,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.scale.setScalar(Math.floor(12 * i / 70));
    sphere.visible = i >= 6;
    // oF draws translucent geometry in index order with depth testing enabled.
    sphere.renderOrder = i;
    sculpture.add(sphere);
    return sphere;
  });
  const targetRotation = new THREE.Euler(28 * DEG, -32 * DEG, 12 * DEG, 'XYZ');
  const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
  const localRotation = new THREE.Matrix4();
  const rotationX = new THREE.Matrix4();
  const rotationZ = new THREE.Matrix4();
  const point = new THREE.Vector3();
  let width = 1;
  let height = 1;
  const frame = () => {
    const bounds = holder.getBoundingClientRect();
    width = Math.max(bounds.width, 1);
    height = Math.max(bounds.height, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    // Maximum spread: 35 * sqrt(349), plus the largest sphere and noise.
    // A constant fitting scale keeps the breathing motion visible at every size.
    const maxExtent = 35 * Math.sqrt(COUNT - 1) + 60 + Math.SQRT2 * 30;
    sculpture.scale.setScalar(Math.min(width, height) * (width < 600 ? .98 : .92) / (2 * maxExtent));
  };
  // Open on an expanded phase so the first frame reads as an exhibition.
  let elapsed = 5;
  let previous = null;
  let request = null;
  let visible = true;
  let paused = reduceMotion.matches;
  let error = false;
  const draw = (dt) => {
    const angle = (130 + 20 * Math.cos(elapsed * .05)) * DEG;
    const spread = 22.5 + 12.5 * Math.sin(elapsed * .8 + 3);
    for (let i = 0; i < COUNT; i++) {
      const phase = i * angle;
      const radius = spread * Math.sqrt(i);
      // Improved Perlin noise approximates ofNoise. It isn't a bit-exact port.
      const dx = Math.trunc(noise.noise(i * .1, elapsed * 2, 0) * 30);
      const dz = Math.trunc(noise.noise(i * .1 + 100, elapsed * 2, 0) * 30);
      point.set(radius * Math.cos(phase) + dx, radius * Math.sin(phase) + dz, 0);
      rotationX.makeRotationX(i * DEG);
      rotationZ.makeRotationZ((i + 50) * DEG);
      localRotation.multiplyMatrices(rotationX, rotationZ);
      point.applyMatrix4(localRotation);
      // Flip y to retain oF's downward screen coordinate convention.
      spheres[i].position.set(point.x, -point.y, point.z);
    }
    sculpture.quaternion.slerp(targetQuaternion, 1 - Math.pow(.95, dt * 60));
    renderer.render(scene, camera);
  };
  const animate = (now) => {
    request = null;
    if (paused || !visible || document.hidden || error) { previous = null; return; }
    const dt = previous === null ? 0 : Math.min((now - previous) / 1000, .05);
    previous = now;
    elapsed += dt;
    draw(dt);
    request = requestAnimationFrame(animate);
  };
  const schedule = () => {
    if (!paused && visible && !document.hidden && !error && request === null) request = requestAnimationFrame(animate);
  };
  const stop = () => { if (request !== null) cancelAnimationFrame(request); request = null; previous = null; };
  const updateControl = () => {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('.toggle-label').textContent = paused ? '動きを再生' : '動きを止める';
    toggle.querySelector('.toggle-icon').textContent = paused ? '▷' : 'Ⅱ';
  };
  frame();
  sculpture.quaternion.copy(targetQuaternion);
  draw(0);
  holder.classList.add('is-ready');
  holder.querySelector('.artwork-fallback').setAttribute('aria-hidden', 'true');
  canvas.removeAttribute('aria-hidden');
  toggle.hidden = false;
  updateControl();
  toggle.addEventListener('click', () => { paused = !paused; updateControl(); if (paused) stop(); else schedule(); });
  reduceMotion.addEventListener('change', () => { paused = reduceMotion.matches; updateControl(); if (paused) stop(); else schedule(); });
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else stop(); });
  observer.observe(holder);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else schedule(); });
  new ResizeObserver(() => { frame(); draw(0); }).observe(holder);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); error = true; stop(); holder.classList.remove('is-ready'); holder.querySelector('.artwork-fallback').removeAttribute('aria-hidden'); canvas.setAttribute('aria-hidden', 'true'); toggle.hidden = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    error = false; frame(); draw(0); holder.classList.add('is-ready'); holder.querySelector('.artwork-fallback').setAttribute('aria-hidden', 'true'); canvas.removeAttribute('aria-hidden'); toggle.hidden = false; schedule();
  });
  schedule();
} catch (error) {
  // Keep the supplied icon visible when WebGL is unavailable.
  console.warn('Breathing Sphere: using the still image.', error);
}
