import { useEffect, useRef } from "react";

// Brigade background: a radar sweep with concentric rings over a scattered field
// of particles - a tight coral cluster + loose cyan dots. Canvas-2D, rm-safe.
export function BgGeo() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, t = 0;
    const seed = (n: number) => { const x = Math.sin(n * 99.13) * 43758.5; return x - Math.floor(x); };
    const resize = () => { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.8, cy = H * 0.28;
      // concentric radar rings
      for (let r = 80; r < 520; r += 90) { ctx.strokeStyle = "rgba(34,211,238,0.05)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
      // sweep
      const a = t * 0.5; ctx.strokeStyle = "rgba(251,113,133,0.16)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 520, cy + Math.sin(a) * 520); ctx.stroke();
      // scattered cyan particles (organic field)
      for (let i = 0; i < 34; i++) { const px = seed(i) * W, py = seed(i + 50) * H; ctx.fillStyle = "rgba(34,211,238,0.18)"; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill(); }
      // tight coral cluster (the brigade) drifting
      for (let i = 0; i < 16; i++) { const px = W * 0.22 + (seed(i + 7) - 0.5) * 120 + Math.cos(t * 0.2) * 14; const py = H * 0.66 + (seed(i + 19) - 0.5) * 110; ctx.fillStyle = "rgba(251,113,133,0.20)"; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill(); }
      if (!reduce) { t += 0.02; raf = requestAnimationFrame(draw); }
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="bg-geo" aria-hidden="true" />;
}
