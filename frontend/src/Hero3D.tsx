import { useEffect, useRef } from "react";
import Zdog from "zdog";

// A 3D review swarm: a tight coordinated CORAL cluster (the brigade) next to a
// loose field of CYAN organic reviews, with a connecting raid line. Rotates on
// a turntable. Bleeds out of the hero, no box.
const CORAL = "#fb7185";
const CYAN = "#22d3ee";
const DIM = "#3b4654";

function rand(seed: number) { const x = Math.sin(seed * 99.13) * 43758.5; return x - Math.floor(x); }

export function Hero3D() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const illo = new Zdog.Illustration({ element: el, zoom: 1, resize: true });
    const cloud = new Zdog.Anchor({ addTo: illo, rotate: { x: -0.45 } });
    // coordinated cluster (coral) - tight around (-70, ...)
    for (let i = 0; i < 14; i++) {
      const cx = -78 + (rand(i) - 0.5) * 46, cy = (rand(i + 9) - 0.5) * 46, cz = (rand(i + 21) - 0.5) * 46;
      new Zdog.Shape({ addTo: cloud, path: [{}], stroke: 12, color: CORAL, translate: { x: cx, y: cy, z: cz } });
      if (i > 0 && i % 2 === 0) new Zdog.Shape({ addTo: cloud, path: [{ x: -78, y: 0, z: 0 }, { x: cx, y: cy, z: cz }], stroke: 1.5, color: DIM });
    }
    // organic field (cyan) - spread wide on the right
    for (let i = 0; i < 12; i++) {
      const ox = 50 + rand(i + 33) * 120, oy = (rand(i + 44) - 0.5) * 150, oz = (rand(i + 55) - 0.5) * 120;
      new Zdog.Shape({ addTo: cloud, path: [{}], stroke: 9, color: CYAN, translate: { x: ox, y: oy, z: oz } });
    }
    let raf = 0;
    const tick = () => { cloud.rotate.y += 0.01; illo.updateRenderGraph(); if (!reduce) raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="hero3d" aria-hidden="true" />;
}
