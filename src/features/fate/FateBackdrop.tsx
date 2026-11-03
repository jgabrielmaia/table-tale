import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

function makeStars(count: number, seed: number, size: number): string {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const tints = ['#ffffff', '#bff6ff', '#e6c4ff', '#d8ffd6', '#ffe3c2'];
  return Array.from({ length: count }, () => {
    const c = tints[Math.floor(rnd() * tints.length)];
    return `${(rnd() * 100).toFixed(1)}vw ${(rnd() * 100).toFixed(1)}vh 0 ${(rnd() * size).toFixed(1)}px ${c}`;
  }).join(',');
}

const FAR = makeStars(90, 7, 0.2);
const NEAR = makeStars(36, 31, 0.8);

export function FateBackdrop() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });
  const farX = useTransform(sx, (n) => n * -14);
  const farY = useTransform(sy, (n) => n * -14);
  const nearX = useTransform(sx, (n) => n * -40);
  const nearY = useTransform(sy, (n) => n * -40);
  const geoX = useTransform(sx, (n) => n * 24);
  const geoY = useTransform(sy, (n) => n * 24);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [mx, my]);

  return (
    <div className="fate-backdrop" aria-hidden>
      <div className="fate-backdrop__nebula" />
      <motion.div className="fate-backdrop__layer" style={{ x: farX, y: farY }}>
        <i className="fate-stars" style={{ boxShadow: FAR }} />
      </motion.div>
      <motion.div className="fate-backdrop__layer" style={{ x: nearX, y: nearY }}>
        <i className="fate-stars fate-stars--near" style={{ boxShadow: NEAR }} />
      </motion.div>
      <motion.svg className="fate-backdrop__geometry" viewBox="-100 -100 200 200" style={{ x: geoX, y: geoY }}>
        <g className="fate-geo fate-geo--a">
          <circle r="92" />
          <polygon points="0,-92 79.7,46 -79.7,46" />
          <polygon points="0,92 79.7,-46 -79.7,-46" />
        </g>
        <g className="fate-geo fate-geo--b">
          <circle r="70" />
          <rect x="-49.5" y="-49.5" width="99" height="99" />
          <rect x="-49.5" y="-49.5" width="99" height="99" transform="rotate(45)" />
        </g>
      </motion.svg>
      <div className="fate-backdrop__vignette" />
    </div>
  );
}
