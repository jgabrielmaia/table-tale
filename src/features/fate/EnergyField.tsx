import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { CSSProperties } from 'react';

const PLANES = [
  { tilt: 68, z: 0, dur: 14 },
  { tilt: 74, z: 60, dur: 19 },
  { tilt: 58, z: -55, dur: 24 },
];

const DOTS = Array.from({ length: 27 }, (_, i) => ({
  plane: i % 3,
  angle: (i * 360) / 27,
  radius: 33 + ((i * 7) % 5) * 3.6,
  size: 3 + (i % 4),
}));

const GLYPHS = [
  <polygon key="a" points="12,3 22,20 2,20" />,
  <polygon key="b" points="12,21 22,4 2,4" />,
  <polygon key="c" points="12,2 21,7 21,17 12,22 3,17 3,7" />,
  <polygon key="d" points="12,2 22,12 12,22 2,12" />,
  <g key="e"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /></g>,
  <g key="f"><rect x="4" y="4" width="16" height="16" /><path d="M4 12h16M12 4v16" /></g>,
];

const STREAKS = Array.from({ length: 14 }, (_, i) => ({ angle: i * (360 / 14) + (i % 2) * 11, delay: (i % 7) * 0.22 }));

interface EnergyFieldProps {
  charge: MotionValue<number>;
}

export function EnergyField({ charge }: EnergyFieldProps) {
  const opacity = useTransform(charge, [0, 0.15, 1], [0, 0.6, 1]);
  const scale = useTransform(charge, [0, 1], [0.55, 1]);
  const auraScale = useTransform(charge, [0, 1], [0.5, 1.25]);

  return (
    <motion.div className="energy" style={{ opacity, scale }} aria-hidden>
      <motion.div className="energy__aura" style={{ scale: auraScale }} />
      {STREAKS.map((s, i) => (
        <div className="energy__streakwrap" key={i} style={{ transform: `rotate(${s.angle}deg)` }}>
          <i className="energy__streak" style={{ animationDelay: `${s.delay}s` }} />
        </div>
      ))}
      {PLANES.map((p, pi) => (
        <div className="energy__plane" key={pi} style={{ transform: `rotateX(${p.tilt}deg) rotateZ(${p.z}deg)` }}>
          <div className="energy__spin" style={{ animationDuration: `${p.dur}s`, animationDirection: pi === 1 ? 'reverse' : 'normal' }}>
            {DOTS.filter((d) => d.plane === pi).map((d, i) => (
              <i
                key={i}
                className="energy__dot"
                style={{ width: d.size, height: d.size, transform: `rotate(${d.angle}deg) translateX(${d.radius}cqw)` } as CSSProperties}
              />
            ))}
            {pi === 0 && <i className="energy__ring" />}
          </div>
        </div>
      ))}
      <div className="energy__glyphs">
        {GLYPHS.map((g, i) => (
          <div className="energy__glyphwrap" key={i} style={{ transform: `rotate(${i * 60}deg)` }}>
            <svg className="energy__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ animationDelay: `${-i * 1.3}s` }}>
              {g}
            </svg>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const SPARKS = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * Math.PI * 2 + (i % 3) * 0.07;
  const dist = 180 + ((i * 53) % 100) * 3.2;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 2 + (i % 4), delay: (i % 5) * 0.025 };
});

export function Burst() {
  return (
    <div className="burst" aria-hidden>
      {[0, 0.12, 0.26].map((d) => (
        <motion.i
          key={d}
          className="burst__ring"
          initial={{ scale: 0.3, opacity: 0.95 }}
          animate={{ scale: 3.6, opacity: 0 }}
          transition={{ duration: 1.4, delay: d, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {SPARKS.map((s, i) => (
        <motion.i
          key={i}
          className="burst__spark"
          style={{ width: s.size, height: s.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.x, y: s.y, opacity: 0, scale: 0.2 }}
          transition={{ duration: 1.3, delay: s.delay, ease: [0.12, 0.8, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
