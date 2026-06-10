import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  depth: number;
  speed: number;
  size: number;
  color: string;
};

type FlowNode = {
  x: number;
  y: number;
};

const nodes: FlowNode[] = [
  { x: 0.18, y: 0.62 },
  { x: 0.34, y: 0.36 },
  { x: 0.52, y: 0.54 },
  { x: 0.71, y: 0.31 },
  { x: 0.82, y: 0.67 }
];

export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let time = 0;
    const pointer = { x: 0, y: 0 };
    const palette = ["#6ee7d8", "#8ab4ff", "#c4a7ff", "#f6c86b"];
    const particles: Particle[] = Array.from({ length: 130 }, () => ({
      x: Math.random(),
      y: Math.random(),
      depth: Math.random(),
      speed: 0.00035 + Math.random() * 0.00075,
      size: 0.8 + Math.random() * 1.9,
      color: palette[Math.floor(Math.random() * palette.length)]
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawFlow = (from: FlowNode, to: FlowNode, index: number) => {
      const startX = from.x * width + pointer.x * 12;
      const startY = from.y * height + pointer.y * 8;
      const endX = to.x * width - pointer.x * 10;
      const endY = to.y * height - pointer.y * 8;
      const controlX = (startX + endX) / 2 + Math.sin(time * 0.7 + index) * 56;
      const controlY = (startY + endY) / 2 - 92 + Math.cos(time * 0.5 + index) * 20;

      context.beginPath();
      context.moveTo(startX, startY);
      context.quadraticCurveTo(controlX, controlY, endX, endY);
      context.strokeStyle = index % 2 === 0 ? "rgba(110, 231, 216, 0.42)" : "rgba(196, 167, 255, 0.34)";
      context.lineWidth = 1.3;
      context.setLineDash([8, 14]);
      context.lineDashOffset = -time * 32 - index * 7;
      context.stroke();
      context.setLineDash([]);

      const progress = (Math.sin(time * 0.9 + index * 0.8) + 1) / 2;
      const dotX = (1 - progress) * (1 - progress) * startX + 2 * (1 - progress) * progress * controlX + progress * progress * endX;
      const dotY = (1 - progress) * (1 - progress) * startY + 2 * (1 - progress) * progress * controlY + progress * progress * endY;
      context.beginPath();
      context.arc(dotX, dotY, 3.2, 0, Math.PI * 2);
      context.fillStyle = "#f6c86b";
      context.shadowColor = "rgba(246, 200, 107, 0.8)";
      context.shadowBlur = 18;
      context.fill();
      context.shadowBlur = 0;
    };

    const draw = () => {
      time += 0.016;
      context.clearRect(0, 0, width, height);

      const backdrop = context.createLinearGradient(0, 0, width, height);
      backdrop.addColorStop(0, "rgba(7, 12, 16, 0.96)");
      backdrop.addColorStop(0.48, "rgba(13, 23, 27, 0.90)");
      backdrop.addColorStop(1, "rgba(19, 14, 31, 0.94)");
      context.fillStyle = backdrop;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(255, 255, 255, 0.055)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 72) {
        context.beginPath();
        context.moveTo(x + pointer.x * 10, 0);
        context.lineTo(x - pointer.x * 12, height);
        context.stroke();
      }
      for (let y = 0; y < height; y += 72) {
        context.beginPath();
        context.moveTo(0, y + pointer.y * 10);
        context.lineTo(width, y - pointer.y * 10);
        context.stroke();
      }

      particles.forEach((particle) => {
        particle.x += particle.speed;
        if (particle.x > 1.04) particle.x = -0.04;
        const x = particle.x * width + pointer.x * particle.depth * 38;
        const y = particle.y * height + pointer.y * particle.depth * 28;
        context.beginPath();
        context.arc(x, y, particle.size * (0.55 + particle.depth), 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.globalAlpha = 0.18 + particle.depth * 0.42;
        context.fill();
        context.globalAlpha = 1;
      });

      for (let i = 0; i < nodes.length - 1; i += 1) {
        drawFlow(nodes[i], nodes[i + 1], i);
      }
      drawFlow(nodes[0], nodes[3], 5);
      drawFlow(nodes[1], nodes[4], 6);

      nodes.forEach((node, index) => {
        const pulse = 5 + Math.sin(time * 1.4 + index) * 1.6;
        const x = node.x * width + pointer.x * 20;
        const y = node.y * height + pointer.y * 16;
        context.beginPath();
        context.arc(x, y, pulse + 12, 0, Math.PI * 2);
        context.fillStyle = "rgba(110, 231, 216, 0.08)";
        context.fill();
        context.beginPath();
        context.arc(x, y, pulse, 0, Math.PI * 2);
        context.fillStyle = index % 2 === 0 ? "#6ee7d8" : "#c4a7ff";
        context.fill();
      });

      frameId = window.requestAnimationFrame(draw);
    };

    const handlePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointer);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-field-canvas" aria-hidden="true" />;
}
