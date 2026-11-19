import { useEffect, useRef } from 'react';

export default function FloodlightAtmosphere() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext('2d');
    if (!node || !ctx) return;
    const clouds = Array.from({ length: 12 }, (_, i) => ({
      x: (i * .37) % 1, y: .22 + (i * .17) % .49, size: .075 + (i * .03) % .14,
    }));
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const { width, height } = node;
      ctx.clearRect(0, 0, width, height);
      if (t >= 4.6 || document.hidden) return;
      const light = Math.min(1, Math.max(0, (t - .6) * 2)) * Math.min(1, (4.6 - t) * .8);
      for (const cloud of clouds) {
        const x = ((cloud.x + t * .045) % 1) * width;
        const y = cloud.y * height;
        const radius = cloud.size * width;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgb(218 238 188 / ${light * .13})`);
        gradient.addColorStop(1, 'rgb(218 238 188 / 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} className="concept-atmosphere" width="560" height="320" aria-hidden="true" />;
}
