import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const initialRotation = { x: 0.22, y: 0.58, z: 0 };

function point(lng: number, lat: number, width: number, height: number): [number, number] {
  return [((lng + 180) / 360) * width, ((90 - lat) / 180) * height];
}

function drawLand(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  coordinates: Array<[number, number]>,
  color: string
) {
  context.beginPath();
  coordinates.forEach(([lng, lat], index) => {
    const [x, y] = point(lng, lat, width, height);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = color;
  context.shadowColor = "rgba(0, 0, 0, 0.22)";
  context.shadowBlur = 9;
  context.fill();
  context.shadowBlur = 0;
}

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context is unavailable.");

  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, "#183d54");
  ocean.addColorStop(0.45, "#0f6170");
  ocean.addColorStop(1, "#132a43");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.22;
  context.strokeStyle = "#d7f6ff";
  context.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = point(0, lat, canvas.width, canvas.height);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  for (let lng = -150; lng <= 180; lng += 30) {
    const [x] = point(lng, 0, canvas.width, canvas.height);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  context.globalAlpha = 1;

  const land = "#5d8d57";
  const landDark = "#3f704d";
  drawLand(context, canvas.width, canvas.height, [
    [-168, 68],
    [-140, 58],
    [-126, 47],
    [-111, 52],
    [-96, 42],
    [-82, 25],
    [-92, 12],
    [-112, 24],
    [-128, 32],
    [-151, 44]
  ], land);
  drawLand(context, canvas.width, canvas.height, [
    [-82, 12],
    [-68, 4],
    [-58, -12],
    [-61, -34],
    [-72, -54],
    [-80, -38],
    [-76, -18],
    [-88, 0]
  ], landDark);
  drawLand(context, canvas.width, canvas.height, [
    [-18, 66],
    [28, 58],
    [68, 57],
    [112, 49],
    [146, 42],
    [158, 18],
    [116, 8],
    [82, 22],
    [42, 18],
    [18, 34],
    [-8, 38],
    [-28, 51]
  ], land);
  drawLand(context, canvas.width, canvas.height, [
    [-18, 36],
    [12, 32],
    [34, 12],
    [31, -20],
    [18, -35],
    [0, -31],
    [-12, -8],
    [-18, 14]
  ], landDark);
  drawLand(context, canvas.width, canvas.height, [
    [112, -12],
    [154, -20],
    [150, -38],
    [119, -44],
    [107, -28]
  ], "#6b8e53");
  drawLand(context, canvas.width, canvas.height, [
    [-46, 72],
    [-18, 78],
    [-20, 62],
    [-42, 58]
  ], "#86a76c");

  context.globalAlpha = 0.18;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 8;
  for (let i = 0; i < 20; i += 1) {
    const y = 120 + i * 43 + Math.sin(i) * 22;
    context.beginPath();
    context.moveTo(-80, y);
    context.bezierCurveTo(420, y - 60, 820, y + 58, 1280, y - 18);
    context.bezierCurveTo(1560, y - 54, 1780, y + 30, 2140, y - 24);
    context.stroke();
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function latLngVector(lat: number, lng: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createArc(start: [number, number], end: [number, number], color: number) {
  const startVector = latLngVector(start[0], start[1], 1.018);
  const endVector = latLngVector(end[0], end[1], 1.018);
  const middle = startVector.clone().add(endVector).normalize().multiplyScalar(1.34);
  const curve = new THREE.QuadraticBezierCurve3(startVector, middle, endVector);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(72));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72 });
  return new THREE.Line(geometry, material);
}

export default function EarthViewer() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const autoSpinRef = useRef(true);
  const draggingRef = useRef(false);
  const previousPointerRef = useRef({ x: 0, y: 0 });
  const [autoSpin, setAutoSpin] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 1000);
    camera.position.set(0, 0, 3.05);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const globe = new THREE.Group();
    globe.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
    globeRef.current = globe;
    scene.add(globe);

    const earthGeometry = new THREE.SphereGeometry(1, 96, 96);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: createEarthTexture(),
      shininess: 18,
      specular: new THREE.Color(0x1e3a4a)
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    globe.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.035, 96, 96),
      new THREE.MeshBasicMaterial({
        color: 0x65e6d8,
        transparent: true,
        opacity: 0.09,
        side: THREE.BackSide
      })
    );
    globe.add(atmosphere);

    const nodeGeometry = new THREE.SphereGeometry(0.014, 12, 12);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xf6c86b });
    [
      [39.9, 116.4],
      [31.2, 121.5],
      [37.8, -122.4],
      [51.5, -0.1],
      [35.7, 139.7]
    ].forEach(([lat, lng]) => {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.copy(latLngVector(lat, lng, 1.035));
      globe.add(node);
    });

    [
      createArc([39.9, 116.4], [37.8, -122.4], 0x6ee7d8),
      createArc([31.2, 121.5], [51.5, -0.1], 0xc4a7ff),
      createArc([35.7, 139.7], [39.9, 116.4], 0xf6c86b)
    ].forEach((arc) => globe.add(arc));

    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      const radius = 8 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0.68
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    scene.add(new THREE.AmbientLight(0x9fc9d5, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9b7dff, 0.7);
    rimLight.position.set(-4, -1, -2);
    scene.add(rimLight);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const onPointerDown = (event: PointerEvent) => {
      draggingRef.current = true;
      previousPointerRef.current = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current || !globeRef.current) return;
      const previous = previousPointerRef.current;
      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;
      globeRef.current.rotation.y += deltaX * 0.008;
      globeRef.current.rotation.x += deltaY * 0.008;
      previousPointerRef.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent) => {
      draggingRef.current = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("resize", resize);
    resize();

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      if (!draggingRef.current && autoSpinRef.current) globe.rotation.y += 0.0015;
      stars.rotation.y += 0.00018;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      earthGeometry.dispose();
      earthMaterial.map?.dispose();
      earthMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      globeRef.current = null;
    };
  }, []);

  const resetView = () => {
    globeRef.current?.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
  };

  const toggleSpin = () => {
    autoSpinRef.current = !autoSpinRef.current;
    setAutoSpin(autoSpinRef.current);
  };

  return (
    <main className="earth-stage">
      <div ref={mountRef} className="earth-canvas" aria-label="Interactive 3D Earth viewer" />
      <section className="earth-hud" aria-labelledby="earth-title">
        <p className="section-label">Spatial Demo</p>
        <h1 id="earth-title">Interactive Earth Viewer</h1>
        <p>
          A componentized Three.js demo for spatial identity. Drag to rotate the globe, inspect
          cross-region flows, and use this page as the base for future OD arcs, trajectory flow,
          and spatio-temporal research showcases.
        </p>
        <div className="earth-actions">
          <a className="button button-primary" href="/">
            Back to Homepage
          </a>
          <button className="button" type="button" onClick={resetView}>
            Reset View
          </button>
          <button className="button" type="button" onClick={toggleSpin}>
            {autoSpin ? "Pause Rotation" : "Resume Rotation"}
          </button>
        </div>
      </section>
      <p className="earth-note">Drag to rotate · Procedural texture · React island powered by Three.js</p>
    </main>
  );
}
