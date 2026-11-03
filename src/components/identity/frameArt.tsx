import type { Ornament, FrameTheme } from './frameThemes';

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, d: number): [number, number] => [+(r * Math.sin(rad(d))).toFixed(2), +(-r * Math.cos(rad(d))).toFixed(2)];
const arc = (r: number, from: number, to: number) => {
  const [x1, y1] = pt(r, from);
  const [x2, y2] = pt(r, to);
  return `M${x1} ${y1}A${r} ${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};
const poly = (points: Array<[number, number]>) => points.map(([x, y]) => `${x},${y}`).join(' ');
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const wave = (base: number, amp: number, lobes: number, phase: number) =>
  range(121).map((i) => {
    const d = i * 3;
    const [x, y] = pt(base + amp * Math.sin(rad(d * lobes + phase)), d);
    return `${i ? 'L' : 'M'}${x} ${y}`;
  }).join('') + 'Z';

/** Decorations live between r=55 and r=66; the avatar itself (r<=50) is never covered. */
function OrnamentArt({ kind }: { kind: Ornament }) {
  switch (kind) {
    case 'diamonds':
      return (
        <g>
          {[45, 135, 225, 315].map((d) => (
            <polygon key={d} points={poly([pt(66, d), pt(60.5, d + 5), pt(55.5, d), pt(60.5, d - 5)])} fill="var(--a)" />
          ))}
          {[0, 90, 180, 270].map((d) => <circle key={d} cx={pt(60, d)[0]} cy={pt(60, d)[1]} r="1.8" fill="var(--b)" />)}
        </g>
      );
    case 'crescents':
      return (
        <g fill="none" strokeLinecap="round">
          <path d={arc(61, -78, -22)} stroke="var(--b)" strokeWidth="3.2" />
          <path d={arc(61, 22, 78)} stroke="var(--b)" strokeWidth="3.2" />
          <path d={arc(61, 112, 158)} stroke="var(--a)" strokeWidth="1.6" />
          <path d={arc(61, 202, 248)} stroke="var(--a)" strokeWidth="1.6" />
          <circle cx="0" cy="-61" r="2.4" fill="var(--a)" stroke="none" />
        </g>
      );
    case 'rays':
      return (
        <g stroke="var(--a)" strokeLinecap="round">
          {range(8).map((k) => {
            const d = k * 45;
            const [x1, y1] = pt(57, d);
            const [x2, y2] = pt(k % 2 ? 62.5 : 67, d);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={k % 2 ? 1.3 : 2.2} />;
          })}
          {range(8).map((k) => <circle key={`s${k}`} cx={pt(60, k * 45 + 22.5)[0]} cy={pt(60, k * 45 + 22.5)[1]} r="0.9" fill="var(--b)" stroke="none" />)}
        </g>
      );
    case 'orbit':
      return (
        <g>
          <circle r="62" fill="none" stroke="var(--b)" strokeWidth="1" strokeDasharray="2.5 3.5" />
          {[0, 120, 240].map((d) => <circle key={d} cx={pt(62, d)[0]} cy={pt(62, d)[1]} r="2.6" fill="var(--a)" />)}
        </g>
      );
    case 'twin':
      return (
        <g fill="none" strokeLinecap="round" strokeWidth="2.8">
          <path d={arc(61, 12, 168)} stroke="var(--a)" />
          <path d={arc(61, 192, 348)} stroke="var(--b)" />
          <circle cx="0" cy="-61" r="1.8" fill="var(--b)" stroke="none" />
          <circle cx="0" cy="61" r="1.8" fill="var(--a)" stroke="none" />
        </g>
      );
    case 'leaves':
      return (
        <g>
          {range(10).map((k) => {
            const d = k * 36 + (k % 2 ? 7 : 0);
            const [x, y] = pt(61, d);
            return <ellipse key={k} cx={x} cy={y} rx="2.5" ry={k % 2 ? 4.6 : 6} transform={`rotate(${d} ${x} ${y})`} fill={k % 2 ? 'var(--b)' : 'var(--a)'} />;
          })}
        </g>
      );
    case 'waves':
      return (
        <g fill="none" strokeLinejoin="round">
          <path d={wave(60.5, 3, 12, 0)} stroke="var(--a)" strokeWidth="1.8" />
          <path d={wave(58, 2.2, 12, 90)} stroke="var(--b)" strokeWidth="1.1" opacity=".8" />
        </g>
      );
    case 'flames':
      return (
        <g>
          {range(12).map((k) => {
            const d = k * 30;
            const tall = k % 2 === 0;
            return <polygon key={k} points={poly([pt(55.5, d - 10), pt(tall ? 68 : 63, d + 3), pt(55.5, d + 10)])} fill={tall ? 'var(--a)' : 'var(--b)'} />;
          })}
        </g>
      );
    case 'wind':
      return (
        <g fill="none" strokeLinecap="round">
          <path d={arc(59.5, 15, 150)} stroke="var(--a)" strokeWidth="1.5" />
          <path d={arc(62.5, 170, 262)} stroke="var(--b)" strokeWidth="1.2" />
          <path d={arc(65.5, 282, 352)} stroke="var(--a)" strokeWidth="0.9" />
          <circle cx={pt(59.5, 150)[0]} cy={pt(59.5, 150)[1]} r="1.4" fill="var(--a)" stroke="none" />
          <circle cx={pt(62.5, 262)[0]} cy={pt(62.5, 262)[1]} r="1.2" fill="var(--b)" stroke="none" />
        </g>
      );
  }
}

/** Ring and ornaments around a 100-unit avatar (viewBox -66..66). Colours come from `--a` / `--b`. */
export function FrameArt({ theme, className }: { theme: FrameTheme; className?: string }) {
  return (
    <svg className={className} viewBox="-66 -66 132 132" aria-hidden="true" focusable="false">
      <circle r="54" fill="none" stroke="var(--a)" strokeWidth="2.4" />
      <circle r="51.4" fill="none" stroke="var(--b)" strokeWidth="1" opacity=".75" />
      <g className={`idf__motion idf__motion--${theme.motion}`}>
        <OrnamentArt kind={theme.ornament} />
      </g>
    </svg>
  );
}
