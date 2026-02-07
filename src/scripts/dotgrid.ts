/**
 * Vanilla dot grid background. Finds elements with data-dotgrid and draws
 * a grid that reacts to pointer proximity (no React island = no hydration script).
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
}

function run(container: HTMLElement) {
  const canvas = container.querySelector('canvas');
  if (!canvas || !window.Path2D) return;

  const dotSize = Number(container.dataset.dotSize) || 5;
  const gap = Number(container.dataset.gap) || 44;
  const baseColor = container.dataset.baseColor || '#3a2e23';
  const activeColor = container.dataset.activeColor || '#ff7b54';
  const proximity = Number(container.dataset.proximity) || 120;

  const baseRgb = hexToRgb(baseColor);
  const activeRgb = hexToRgb(activeColor);
  const circlePath = new Path2D();
  circlePath.arc(0, 0, dotSize / 2, 0, Math.PI * 2);

  let dots: Dot[] = [];
  let pointer = { x: -1e4, y: -1e4 };
  let rafId: number;

  function buildGrid() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;
    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;
    const startX = (width - gridW) / 2 + dotSize / 2;
    const startY = (height - gridH) / 2 + dotSize / 2;

    dots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
        });
      }
    }
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const px = pointer.x;
    const py = pointer.y;
    const proxSq = proximity * proximity;

    for (const dot of dots) {
      const ox = dot.cx + dot.xOffset;
      const oy = dot.cy + dot.yOffset;
      const dx = dot.cx - px;
      const dy = dot.cy - py;
      const dsq = dx * dx + dy * dy;

      let fillStyle = baseColor;
      if (dsq <= proxSq) {
        const dist = Math.sqrt(dsq);
        const t = 1 - dist / proximity;
        const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
        const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
        const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
        fillStyle = `rgb(${r},${g},${b})`;
      }

      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = fillStyle;
      ctx.fill(circlePath);
      ctx.restore();
    }

    ctx.restore();
    rafId = requestAnimationFrame(draw);
  }

  function onMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  }

  function onLeave() {
    pointer.x = -1e4;
    pointer.y = -1e4;
  }

  buildGrid();
  draw();

  const ro = new ResizeObserver(buildGrid);
  ro.observe(container);
  container.addEventListener('mousemove', onMove, { passive: true });
  container.addEventListener('mouseleave', onLeave);

  return () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    container.removeEventListener('mousemove', onMove);
    container.removeEventListener('mouseleave', onLeave);
  };
}

function init() {
  document.querySelectorAll<HTMLElement>('[data-dotgrid]').forEach((el) => {
    if ((el as any).__dotgrid_cleanup) return;
    (el as any).__dotgrid_cleanup = run(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
