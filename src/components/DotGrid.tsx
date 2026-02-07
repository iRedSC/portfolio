'use client';
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

let inertiaAvailable = false;
try {
  gsap.registerPlugin(InertiaPlugin);
  inertiaAvailable = true;
} catch {
  // InertiaPlugin may be premium or unavailable; use fallback tweens
}

const throttle = (func: (...args: any[]) => void, limit: number) => {
  let lastCall = 0;
  return function (this: any, ...args: any[]) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
}

export interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  className?: string;
  style?: React.CSSProperties;
}

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

/** Returns true if the element paints an opaque area (would block the grid from view). */
function isElementOpaque(el: Element): boolean {
  const s = getComputedStyle(el);
  const opacity = parseFloat(s.opacity);
  if (opacity < 0.99) return false;
  const bg = s.backgroundColor;
  const bgImage = s.backgroundImage;
  if (bgImage && bgImage !== 'none') return true;
  if (!bg || bg === 'transparent') return false;
  const rgba = bg.match(/rgba?\s*\(\s*([^)]+)\s*\)/);
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => p.trim());
    const a = parts.length === 4 ? parseFloat(parts[3]) : 1;
    if (a < 0.99) return false;
  }
  return true;
}

/** True if we should skip the grid effect: cursor is over an opaque element (not the grid). */
function isBlockedByOpaqueElement(hitEl: Element | null, gridRoot: Element | null): boolean {
  if (!hitEl || !gridRoot) return false;
  if (gridRoot.contains(hitEl)) return false;
  let el: Element | null = hitEl;
  while (el && el !== document.body) {
    if (gridRoot.contains(el)) return false;
    if (el !== document.body && el !== document.documentElement && isElementOpaque(el))
      return true;
    el = el.parentElement;
  }
  return false;
}

const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 16,
  gap = 32,
  baseColor = '#5227FF',
  activeColor = '#5227FF',
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className = '',
  style
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  });

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor]);

  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !window.Path2D) return null;

    const p = new Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;

    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;

    const extraX = width - gridW;
    const extraY = height - gridH;

    const startX = extraX / 2 + dotSize / 2;
    const startY = extraY / 2 + dotSize / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false });
      }
    }
    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    if (!circlePath) return;

    let rafId: number;
    const proxSq = proximity * proximity;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Clear entire backing store with identity transform so zoom/scale cannot
      // cause partial clear (frame stacking). Restore transform after.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const { x: px, y: py } = pointerRef.current;

      const displacementThreshold = 0.5;
      const fadeDistance = 7; // displacement (px) at which dot is fully opaque
      for (const dot of dotsRef.current) {
        const displacement = Math.hypot(dot.xOffset, dot.yOffset);
        if (displacement <= displacementThreshold) continue;

        const opacity = Math.min(1, displacement / fadeDistance);
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;

        let style = baseColor;
        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / proximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          style = `rgb(${r},${g},${b})`;
        }

        ctx.save();
        ctx.translate(ox, oy);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = style;
        ctx.fill(circlePath);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [proximity, baseColor, activeRgb, baseRgb, circlePath]);

  useEffect(() => {
    let cancelled = false;
    const runBuild = () => {
      if (!cancelled) buildGrid();
    };
    requestAnimationFrame(() => {
      if (!cancelled) runBuild();
    });
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(runBuild);
      if (wrapperRef.current) ro.observe(wrapperRef.current);
    } else {
      (window as Window).addEventListener('resize', runBuild);
    }
    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
      else (window as Window).removeEventListener('resize', runBuild);
    };
  }, [buildGrid]);

  const runPushFallback = useCallback((dot: Dot, pushX: number, pushY: number) => {
    const duration = Math.min(0.5, Math.hypot(pushX, pushY) / resistance);
    gsap.to(dot, {
      xOffset: pushX,
      yOffset: pushY,
      duration,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(dot, {
          xOffset: 0,
          yOffset: 0,
          duration: returnDuration,
          ease: 'elastic.out(1,0.75)'
        });
        dot._inertiaApplied = false;
      }
    });
  }, [resistance, returnDuration]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const root = wrapperRef.current?.closest('section');
      if (!root || isBlockedByOpaqueElement(el, root)) {
        pointerRef.current.x = -1e6;
        pointerRef.current.y = -1e6;
        return;
      }

      const now = performance.now();
      const pr = pointerRef.current;
      const dt = pr.lastTime ? now - pr.lastTime : 16;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;
      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        speed = maxSpeed;
      }
      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;
      pr.vx = vx;
      pr.vy = vy;
      pr.speed = speed;

      const rect = canvasRef.current!.getBoundingClientRect();
      pr.x = e.clientX - rect.left;
      pr.y = e.clientY - rect.top;

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
        if (speed > speedTrigger && dist < proximity && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          gsap.killTweensOf(dot);
          const pushX = dot.cx - pr.x + vx * 0.005;
          const pushY = dot.cy - pr.y + vy * 0.005;
          if (inertiaAvailable) {
            try {
              gsap.to(dot, {
                inertia: { xOffset: pushX, yOffset: pushY, resistance },
                onComplete: () => {
                  gsap.to(dot, {
                    xOffset: 0,
                    yOffset: 0,
                    duration: returnDuration,
                    ease: 'elastic.out(1,0.75)'
                  });
                  dot._inertiaApplied = false;
                }
              });
            } catch {
              inertiaAvailable = false;
              runPushFallback(dot, pushX, pushY);
            }
          } else {
            runPushFallback(dot, pushX, pushY);
          }
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const root = wrapperRef.current?.closest('section');
      if (!root || isBlockedByOpaqueElement(el, root)) return;

      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < shockRadius && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          gsap.killTweensOf(dot);
          const falloff = Math.max(0, 1 - dist / shockRadius);
          const pushX = (dot.cx - cx) * shockStrength * falloff;
          const pushY = (dot.cy - cy) * shockStrength * falloff;
          if (inertiaAvailable) {
            try {
              gsap.to(dot, {
                inertia: { xOffset: pushX, yOffset: pushY, resistance },
                onComplete: () => {
                  gsap.to(dot, {
                    xOffset: 0,
                    yOffset: 0,
                    duration: returnDuration,
                    ease: 'elastic.out(1,0.75)'
                  });
                  dot._inertiaApplied = false;
                }
              });
            } catch {
              inertiaAvailable = false;
              runPushFallback(dot, pushX, pushY);
            }
          } else {
            runPushFallback(dot, pushX, pushY);
          }
        }
      }
    };

    const throttledMove = throttle(onMove, 50);
    window.addEventListener('mousemove', throttledMove, { passive: true });
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('mousemove', throttledMove);
      window.removeEventListener('click', onClick);
    };
  }, [maxSpeed, speedTrigger, proximity, resistance, returnDuration, shockRadius, shockStrength, runPushFallback]);

  return (
    <section
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
        padding: 0,
        ...style,
      }}
    >
      <div
        ref={wrapperRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>
    </section>
  );
};

export default DotGrid;
