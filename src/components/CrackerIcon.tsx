import type { ReactNode } from "react";
import type { CrackerId } from "@/crackers";

// Hand-drawn 48×48 cracker illustrations in one flat, glowing style.

const C = {
  marigold: "#ffb627",
  saffron: "#ff7a1a",
  rani: "#e8457a",
  cream: "#fff3d6",
  red: "#d6362f",
  deepRed: "#9e1f24",
  green: "#2fa86a",
  lime: "#6dff9e",
  blue: "#3d8bff",
  sky: "#5cd0ff",
  purple: "#8b5cf6",
  steel: "#9a93ad",
  ink: "#2a1d3d",
};

/** Radial rays from (cx, cy) between radii r1 and r2. */
function Rays({ cx = 24, cy = 24, r1, r2, n, color, width = 2, offset = 0, dots = false }: {
  cx?: number; cy?: number; r1: number; r2: number; n: number; color: string; width?: number; offset?: number; dots?: boolean;
}) {
  return (
    <g stroke={color} strokeWidth={width} strokeLinecap="round" fill={color}>
      {Array.from({ length: n }, (_, i) => {
        const a = offset + (i / n) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * r1;
        const y1 = cy + Math.sin(a) * r1;
        const x2 = cx + Math.cos(a) * r2;
        const y2 = cy + Math.sin(a) * r2;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            {dots && <circle cx={x2} cy={y2} r={width * 0.9} stroke="none" />}
          </g>
        );
      })}
    </g>
  );
}

/** Ring of dots. */
function DotRing({ cx = 24, cy = 24, r, n, color, size = 1.6, offset = 0 }: {
  cx?: number; cy?: number; r: number; n: number; color: string; size?: number; offset?: number;
}) {
  return (
    <g fill={color}>
      {Array.from({ length: n }, (_, i) => {
        const a = offset + (i / n) * Math.PI * 2;
        return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={size} />;
      })}
    </g>
  );
}

function Spark({ x, y, r = 4, color = C.marigold }: { x: number; y: number; r?: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 0.9} fill={color} opacity={0.35} />
      <path
        d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`}
        fill={C.cream}
      />
    </g>
  );
}

function SkyShot({ shots, wide }: { shots: number; wide: boolean }) {
  const w = wide ? 34 : 26;
  const x = 24 - w / 2;
  const tubes = wide ? 5 : 4;
  return (
    <g>
      <Rays cx={16} cy={11} r1={2} r2={7} n={8} color={C.rani} width={1.6} dots />
      <Rays cx={32} cy={9} r1={2} r2={6} n={8} color={C.marigold} width={1.6} dots offset={0.4} />
      <line x1={18} y1={22} x2={16} y2={16} stroke={C.marigold} strokeWidth={1.4} strokeDasharray="1.5 2" />
      <line x1={30} y1={22} x2={32} y2={14} stroke={C.marigold} strokeWidth={1.4} strokeDasharray="1.5 2" />
      <rect x={x} y={24} width={w} height={19} rx={2.5} fill={C.purple} />
      <rect x={x} y={30} width={w} height={3} fill={C.marigold} />
      {Array.from({ length: tubes }, (_, i) => (
        <ellipse key={i} cx={x + ((i + 0.5) / tubes) * w} cy={24.5} rx={w / tubes / 2 - 0.8} ry={1.6} fill={C.ink} />
      ))}
      <rect x={24 - (shots >= 100 ? 9.5 : 7.5)} y={34.5} width={shots >= 100 ? 19 : 15} height={8} rx={4} fill={C.cream} />
      <text x={24} y={40.8} textAnchor="middle" fontSize={7.5} fontWeight={800} fill={C.ink} fontFamily="system-ui, sans-serif">
        {shots}
      </text>
    </g>
  );
}

const ICONS: Record<CrackerId, ReactNode> = {
  sparkler: (
    <g>
      <line x1={12} y1={42} x2={29} y2={19} stroke={C.steel} strokeWidth={2.6} strokeLinecap="round" />
      <line x1={12} y1={42} x2={17} y2={35} stroke={C.ink} strokeWidth={3.2} strokeLinecap="round" />
      <Rays cx={31} cy={16} r1={3} r2={11} n={10} color={C.marigold} width={1.6} />
      <DotRing cx={31} cy={16} r={13.5} n={7} color={C.cream} size={1.1} offset={0.3} />
      <Spark x={31} y={16} r={4.5} />
    </g>
  ),
  anar: (
    <g>
      <path d="M24 22 C18 14 12 10 9 12" stroke={C.marigold} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M24 22 C30 14 36 10 39 12" stroke={C.marigold} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M24 22 C22 14 20 8 18 5" stroke={C.cream} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M24 22 C26 14 28 8 30 5" stroke={C.cream} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeDasharray="2 2" />
      <Spark x={24} y={21} r={4} />
      <path d="M14 43 L34 43 L28.5 24 L19.5 24 Z" fill={C.red} />
      <rect x={15.5} y={35} width={17} height={3} fill={C.marigold} />
      <rect x={18} y={28} width={12} height={2.4} fill={C.marigold} />
    </g>
  ),
  pencil: (
    <g>
      <path d="M24 4 C30 11 29 17 24 19 C19 17 18 11 24 4 Z" fill={C.lime} opacity={0.4} />
      <path d="M24 8 C27.5 12 27 16 24 17.5 C21 16 20.5 12 24 8 Z" fill={C.lime} />
      <circle cx={24} cy={15} r={2} fill={C.cream} />
      <rect x={21.5} y={19} width={5} height={25} rx={1} fill={C.green} />
      {[23, 29, 35, 41].map((y) => (
        <rect key={y} x={21.5} y={y} width={5} height={1.8} fill={C.cream} />
      ))}
    </g>
  ),
  chakkar: (
    <g>
      <Rays cx={24} cy={26} r1={15} r2={21} n={10} color={C.lime} width={1.5} offset={0.2} />
      <Rays cx={24} cy={26} r1={15} r2={19} n={10} color={C.rani} width={1.5} offset={0.5} />
      <circle cx={24} cy={26} r={12} fill={C.blue} />
      <circle cx={24} cy={26} r={12} fill="none" stroke={C.marigold} strokeWidth={2.2} />
      <path d="M24 26 C24 20 29 18 32 21 M24 26 C30 26 32 31 29 34 M24 26 C24 32 19 34 16 31 M24 26 C18 26 16 21 19 18" stroke={C.cream} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <circle cx={24} cy={26} r={2.5} fill={C.red} />
    </g>
  ),
  snake: (
    <g>
      <path d="M22 40 C14 36 16 28 23 28 C30 28 32 21 26 18 C20 15 21 9 27 8" stroke="#5a524c" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M22 40 C14 36 16 28 23 28 C30 28 32 21 26 18 C20 15 21 9 27 8" stroke="#8a8077" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <circle cx={27.5} cy={8} r={3} fill={C.saffron} opacity={0.5} />
      <circle cx={27.5} cy={8} r={1.5} fill={C.marigold} />
      <ellipse cx={24} cy={42} rx={10} ry={3.2} fill={C.ink} />
      <ellipse cx={24} cy={41} rx={8} ry={2.2} fill="#4a4258" />
    </g>
  ),
  bijli: (
    <g>
      <g transform="rotate(-20 24 30)">
        <rect x={20.5} y={18} width={7} height={24} rx={1.5} fill={C.red} />
        <rect x={20.5} y={28} width={7} height={2.6} fill={C.marigold} />
        <line x1={24} y1={18} x2={24} y2={12} stroke={C.steel} strokeWidth={1.4} />
      </g>
      <path d="M22 4 L17 13 L22 13 L18 21 L28 10 L23 10 L27 4 Z" fill={C.marigold} />
    </g>
  ),
  bomb: (
    <g>
      <path d="M30 18 C32 12 35 10 38 11" stroke={C.steel} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Spark x={38.5} y={10} r={5} />
      <circle cx={23} cy={29} r={14} fill={C.deepRed} />
      <circle cx={18} cy={24} r={4} fill="#c2414a" opacity={0.7} />
      <rect x={9} y={27} width={28} height={4.4} fill={C.marigold} />
      <rect x={27} y={15} width={6} height={5} rx={1} fill={C.ink} transform="rotate(35 30 17)" />
    </g>
  ),
  laxmi: (
    <g>
      <path d="M24 12 C25 8 28 6 31 7" stroke={C.steel} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Spark x={31.5} y={6.5} r={4.5} />
      <rect x={11} y={12} width={26} height={32} rx={3} fill={C.green} />
      <rect x={11} y={21} width={26} height={13} fill={C.red} />
      <circle cx={24} cy={27.5} r={5} fill={C.marigold} />
      <circle cx={24} cy={27.5} r={2.4} fill={C.red} />
      <rect x={11} y={38} width={26} height={2} fill={C.marigold} />
    </g>
  ),
  chain: (
    <g>
      <path d="M6 40 Q14 34 20 30 T34 18" stroke="#c9b48a" strokeWidth={1.2} fill="none" />
      {[
        [7, 39], [11, 36.5], [15, 33.5], [19, 31], [23, 28], [27, 25], [31, 21.5],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 1.6} y={y - 4} width={3.2} height={8} rx={0.8} fill={i % 2 ? C.red : C.deepRed} transform={`rotate(${i % 2 ? 25 : -20} ${x} ${y})`} />
      ))}
      <Rays cx={37} cy={14} r1={3} r2={10} n={9} color={C.marigold} width={1.6} />
      <Spark x={37} y={14} r={4.5} />
    </g>
  ),
  rocket: (
    <g transform="rotate(30 24 24)">
      <line x1={24} y1={30} x2={24} y2={46} stroke="#a1795f" strokeWidth={2} strokeLinecap="round" />
      <path d="M24 36 C21 40 22 44 24 47 C26 44 27 40 24 36 Z" fill={C.saffron} opacity={0.8} transform="translate(0 -6)" />
      <rect x={19.5} y={10} width={9} height={22} rx={1.5} fill={C.red} />
      <rect x={19.5} y={18} width={9} height={3} fill={C.marigold} />
      <path d="M18.5 10 L29.5 10 L24 1 Z" fill={C.marigold} />
      <path d="M19.5 28 L15 33 L19.5 32 Z M28.5 28 L33 33 L28.5 32 Z" fill={C.sky} />
    </g>
  ),
  skyshot12: <SkyShot shots={12} wide={false} />,
  skyshot30: <SkyShot shots={30} wide={false} />,
  skyshot60: <SkyShot shots={60} wide />,
  skyshot120: <SkyShot shots={120} wide />,
  peony: (
    <g>
      <DotRing r={16} n={14} color={C.rani} size={2} />
      <DotRing r={10} n={10} color={C.marigold} size={1.7} offset={0.3} />
      <DotRing r={4.5} n={6} color={C.cream} size={1.3} />
    </g>
  ),
  chrysanthemum: (
    <g>
      <Rays r1={5} r2={18} n={16} color={C.marigold} width={1.5} dots />
      <Rays r1={3} r2={9} n={8} color={C.sky} width={1.5} offset={0.2} />
      <circle cx={24} cy={24} r={2.4} fill={C.cream} />
    </g>
  ),
  willow: (
    <g stroke={C.marigold} strokeWidth={1.6} fill="none" strokeLinecap="round">
      {[-2.6, -1.9, -1.2, -0.55, 0.55, 1.2, 1.9, 2.6].map((a, i) => {
        const x = 24 + Math.sin(a) * 12;
        const y = 16 - Math.cos(a) * 6;
        const endX = 24 + Math.sin(a) * 17;
        return <path key={i} d={`M24 16 Q${x} ${y} ${endX} ${y + 8} T${endX + Math.sign(a) * 1} 44`} opacity={0.9 - Math.abs(a) * 0.1} />;
      })}
      <circle cx={24} cy={16} r={2.2} fill={C.cream} stroke="none" />
    </g>
  ),
  palm: (
    <g>
      <line x1={24} y1={20} x2={24} y2={46} stroke={C.marigold} strokeWidth={1.4} strokeDasharray="2 2.5" />
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((k) => {
        const ex = 24 + k * 7.5;
        return (
          <path key={k} d={`M24 18 Q${24 + k * 5} ${8 - Math.abs(k)} ${ex} ${18 + Math.abs(k) * 3}`} stroke={k % 2 ? C.saffron : C.marigold} strokeWidth={3} fill="none" strokeLinecap="round" />
        );
      })}
      <circle cx={24} cy={18} r={2.6} fill={C.cream} />
    </g>
  ),
  crossette: (
    <g stroke={C.sky} strokeWidth={1.8} strokeLinecap="round">
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const x = 24 + Math.cos(a) * 12;
        const y = 24 + Math.sin(a) * 12;
        return (
          <g key={i}>
            <line x1={24} y1={24} x2={x} y2={y} />
            <line x1={x - 5} y1={y} x2={x + 5} y2={y} />
            <line x1={x} y1={y - 5} x2={x} y2={y + 5} />
          </g>
        );
      })}
      <circle cx={24} cy={24} r={2.4} fill={C.cream} stroke="none" />
    </g>
  ),
  ring: (
    <g>
      <ellipse cx={24} cy={24} rx={18} ry={10} fill="none" stroke={C.purple} strokeWidth={2.6} strokeDasharray="0.1 4.2" strokeLinecap="round" transform="rotate(-20 24 24)" />
      <DotRing r={4} n={6} color={C.marigold} size={1.3} />
      <circle cx={24} cy={24} r={1.6} fill={C.cream} />
    </g>
  ),
  heart: (
    <g>
      <path
        d="M24 40 C10 30 6 22 10 15 C14 9 21 10 24 16 C27 10 34 9 38 15 C42 22 38 30 24 40 Z"
        fill="none"
        stroke={C.rani}
        strokeWidth={2.8}
        strokeDasharray="0.1 4"
        strokeLinecap="round"
      />
      <circle cx={24} cy={22} r={1.8} fill={C.cream} />
    </g>
  ),
  strobe: (
    <g>
      {[
        [24, 24, 6], [12, 14, 3.5], [36, 13, 4], [11, 33, 3], [37, 35, 3.5], [24, 8, 2.8], [25, 41, 3],
      ].map(([x, y, r], i) => (
        <Spark key={i} x={x} y={y} r={r} color="#c9d7ff" />
      ))}
    </g>
  ),
  multibreak: (
    <g>
      <Rays cx={24} cy={25} r1={2.5} r2={9} n={10} color={C.marigold} width={1.6} dots />
      <Rays cx={11} cy={12} r1={1.5} r2={6} n={8} color={C.rani} width={1.4} dots />
      <Rays cx={37} cy={11} r1={1.5} r2={6} n={8} color={C.sky} width={1.4} dots />
      <Rays cx={36} cy={38} r1={1.5} r2={5} n={8} color={C.lime} width={1.4} dots />
    </g>
  ),
  random: (
    <g>
      <DotRing r={17} n={16} color={C.purple} size={1.6} />
      <DotRing r={17} n={16} color={C.marigold} size={1.6} offset={Math.PI / 16} />
      <text x={24} y={30.5} textAnchor="middle" fontSize={18} fontWeight={800} fill={C.cream} fontFamily="system-ui, sans-serif">
        ?
      </text>
    </g>
  ),
};

export default function CrackerIcon({ id, size = 40, className = "" }: { id: CrackerId; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      {ICONS[id]}
    </svg>
  );
}
