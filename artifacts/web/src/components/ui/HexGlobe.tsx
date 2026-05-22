import { useRef, useEffect } from "react";

interface HexGlobeProps {
  size?: number;
  className?: string;
}

export function HexGlobe({ size = 380, className = "" }: HexGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.40;

    let angle = 0;
    let animId: number;

    // Build hex grid points on a sphere using lat/lon tessellation
    const hexPoints: Array<{ lat: number; lon: number }> = [];
    const latSteps = 16;
    const lonBase = 26;

    for (let i = 0; i <= latSteps; i++) {
      const lat = (i / latSteps) * Math.PI - Math.PI / 2;
      const cosLat = Math.cos(lat);
      const actualLon = Math.max(4, Math.round(lonBase * cosLat));
      for (let j = 0; j < actualLon; j++) {
        const lon = (j / actualLon) * 2 * Math.PI;
        hexPoints.push({ lat, lon });
      }
    }

    const hexR = (R / lonBase) * 1.15;

    function drawHex(
      x: number, y: number,
      r: number, alpha: number, scale: number
    ) {
      const sides = 6;
      const scaledR = r * scale;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i * Math.PI * 2) / sides - Math.PI / 6;
        const px = x + scaledR * Math.cos(a);
        const py = y + scaledR * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = `rgba(180, 200, 255, ${alpha * 0.12})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(160, 190, 255, ${alpha * 0.75})`;
      ctx.lineWidth = Math.max(0.4, 0.7 * scale);
      ctx.stroke();
    }

    function render() {
      ctx.clearRect(0, 0, size, size);

      // Outer glow ring
      const glow = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.15);
      glow.addColorStop(0, "rgba(130, 120, 255, 0.06)");
      glow.addColorStop(1, "rgba(80, 60, 200, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Clip to sphere bounds (soft)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2);
      ctx.clip();

      const perspective = 2.6;

      const projected = hexPoints.map(({ lat, lon }) => {
        const rotLon = lon + angle;
        const x3 = Math.cos(lat) * Math.cos(rotLon);
        const y3 = Math.sin(lat);
        const z3 = Math.cos(lat) * Math.sin(rotLon);

        const zOff = perspective;
        const projX = cx + (R * x3 * zOff) / (zOff + z3);
        const projY = cy - (R * y3 * zOff) / (zOff + z3);
        const scl = zOff / (zOff + z3);
        const alpha = (z3 + 1) / 2;

        return { x: projX, y: projY, z: z3, alpha, scl };
      });

      projected.sort((a, b) => a.z - b.z);

      for (const { x, y, alpha, scl } of projected) {
        if (alpha > 0.04) drawHex(x, y, hexR, alpha, scl);
      }

      ctx.restore();

      // Equator accent ring (subtle)
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(160, 180, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Central shimmer dot
      const shimmer = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, 0, cx, cy, R);
      shimmer.addColorStop(0, "rgba(255, 255, 255, 0.07)");
      shimmer.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = shimmer;
      ctx.fill();

      angle += 0.005;
      animId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return <canvas ref={canvasRef} className={className} />;
}
