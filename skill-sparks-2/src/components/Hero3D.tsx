import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Three.js hero: floating educational shapes + particles + mouse parallax.
// Graceful fallback: if WebGL is unavailable we simply hide the canvas
// (CSS floating shapes behind the hero still provide the look).
export default function Hero3D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch { canvas.style.display = 'none'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.PointLight(0xa855f7, 60); key.position.set(6, 6, 8); scene.add(key);
    const fill = new THREE.PointLight(0x00e5ff, 40); fill.position.set(-7, -4, 6); scene.add(fill);
    const rim = new THREE.PointLight(0x22ff88, 30); rim.position.set(0, 8, -4); scene.add(rim);

    const group = new THREE.Group(); scene.add(group);
    const shapes: { mesh: THREE.Mesh; speed: number; amp: number; phase: number; baseY: number }[] = [];

    const add = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, s = 1) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.35, emissive: color, emissiveIntensity: 0.25 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z); mesh.scale.setScalar(s);
      group.add(mesh);
      shapes.push({ mesh, speed: 0.4 + Math.random() * 0.8, amp: 0.4 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2, baseY: y });
    };

    // Neon palette objects orbiting the headline
    add(new THREE.TorusGeometry(0.7, 0.28, 16, 40), '#a855f7', -5.2, 2.2, -1, 1.1);
    add(new THREE.BoxGeometry(1, 1, 1), '#22ff88', 5.4, 2.4, -1, 1);
    add(new THREE.IcosahedronGeometry(0.7, 0), '#00e5ff', -6.2, -1.8, 0, 1.2);
    add(new THREE.OctahedronGeometry(0.65, 0), '#ffd21f', 6.4, -2.2, 0, 1.1);
    add(new THREE.TorusKnotGeometry(0.45, 0.16, 80, 12), '#ff4f7b', 4.6, -0.4, -2, 1);
    add(new THREE.SphereGeometry(0.55, 24, 24), '#ff8a00', -4.4, 0.4, -2, 1);
    add(new THREE.ConeGeometry(0.55, 1.1, 4), '#a855f7', 0, 3.4, -3, 0.9);
    add(new THREE.BoxGeometry(0.8, 0.8, 0.8), '#00e5ff', -1.5, -3.2, -1, 0.9);
    add(new THREE.TorusGeometry(0.5, 0.2, 12, 32), '#22ff88', 2.2, -3.4, -1, 0.9);

    // Particle field
    const N = 450;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = -Math.random() * 8 - 1;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.75 }));
    scene.add(particles);

    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize(); window.addEventListener('resize', resize);

    let raf = 0; const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      camera.position.x = mx * 1.6; camera.position.y = -my * 1.0;
      camera.lookAt(0, 0, 0);
      group.rotation.y = mx * 0.25;
      shapes.forEach(s => {
        s.mesh.rotation.x += 0.005 * s.speed; s.mesh.rotation.y += 0.007 * s.speed;
        s.mesh.position.y = s.baseY + Math.sin(t * s.speed + s.phase) * s.amp;
      });
      particles.rotation.y = t * 0.02;
      renderer.render(scene, camera);
    };
    if (reduced) { renderer.render(scene, camera); } else { tick(); }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="hero3d" aria-hidden="true" />;
}
