import { useEffect, useRef } from "react";
import * as THREE from "three";

const EARTH_TEXTURE = "/assets/earth/blue-marble-2048.jpg";

function createStars(count: number) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 5 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x5a6f85,
    size: 0.018,
    transparent: true,
    opacity: 0.32
  });

  return { points: new THREE.Points(geometry, material), geometry, material };
}

function createOrbit(radius: number, color: number, rotation: [number, number, number]) {
  const geometry = new THREE.TorusGeometry(radius, 0.0028, 8, 180);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2
  });
  const orbit = new THREE.Mesh(geometry, material);
  orbit.rotation.set(...rotation);
  return { orbit, geometry, material };
}

export default function HeroEarthField() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      mount.classList.add("is-fallback");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const globe = new THREE.Group();
    globe.rotation.set(0.18, -0.62, -0.08);
    scene.add(globe);

    const texture = new THREE.TextureLoader().load(
      EARTH_TEXTURE,
      () => mount.classList.add("is-loaded"),
      undefined,
      () => mount.classList.add("is-fallback")
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

    const earthGeometry = new THREE.SphereGeometry(1.22, 128, 128);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.92,
      metalness: 0,
      emissive: new THREE.Color(0x0b1f2a),
      emissiveIntensity: 0.08
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    globe.add(earth);

    const atmosphereGeometry = new THREE.SphereGeometry(1.255, 128, 128);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x72dbe3,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globe.add(atmosphere);

    const orbitA = createOrbit(1.48, 0x087c76, [1.2, 0.1, 0.45]);
    const orbitB = createOrbit(1.64, 0x6d4acb, [1.05, -0.3, -0.28]);
    globe.add(orbitA.orbit, orbitB.orbit);

    const stars = createStars(700);
    scene.add(stars.points);

    scene.add(new THREE.AmbientLight(0xd7f4ff, 1.15));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(4, 2.3, 4.8);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9fc5ff, 1.15);
    rimLight.position.set(-3.4, 0.4, -2.6);
    scene.add(rimLight);

    const pointer = { x: 0, y: 0 };

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);

      const isMobile = width < 760;
      globe.scale.setScalar(isMobile ? 0.52 : 0.94);
      globe.position.set(isMobile ? 1.18 : 2.26, isMobile ? -1.16 : -0.04, isMobile ? -0.2 : 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
    };

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      if (!reducedMotion) {
        globe.rotation.y += 0.001;
        orbitA.orbit.rotation.z += 0.0006;
        orbitB.orbit.rotation.z -= 0.00045;
        stars.points.rotation.y += 0.00008;
      }

      globe.position.x += ((window.innerWidth < 760 ? 1.18 : 2.26) + pointer.x * 0.08 - globe.position.x) * 0.04;
      globe.position.y += ((window.innerWidth < 760 ? -1.16 : -0.04) - pointer.y * 0.05 - globe.position.y) * 0.04;
      renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      earthGeometry.dispose();
      earthMaterial.dispose();
      texture.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      orbitA.geometry.dispose();
      orbitA.material.dispose();
      orbitB.geometry.dispose();
      orbitB.material.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={mountRef} className="hero-earth-field" aria-hidden="true">
      <div className="hero-earth-fallback" />
    </div>
  );
}
