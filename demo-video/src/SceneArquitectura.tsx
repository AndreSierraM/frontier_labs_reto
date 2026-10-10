import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";
import { LogoNode, LogoName } from "./TechLogos";

// Canvas fijo del diagrama
const CW = 1740;
const CH = 760;
const NW = 290;
const NH = 160;

type N = { id: string; logo: LogoName; title: string; subtitle?: string; x: number; y: number; color: string };

const NODES: N[] = [
  { id: "cliente", logo: "user", title: "Cliente / Evaluador", subtitle: "100 tests · reset", x: 240, y: 100, color: COLORS.yellow },
  { id: "vercel", logo: "vercel", title: "API Entrypoint", subtitle: "/health · /msg · /__reset", x: 640, y: 100, color: COLORS.cyan },
  { id: "domain", logo: "node", title: "domain.js", subtitle: "máquina de estados", x: 1040, y: 100, color: COLORS.green },
  { id: "neon", logo: "neon", title: "Neon · PostgreSQL", subtitle: "JSONB · FOR UPDATE", x: 1440, y: 100, color: COLORS.purple },
  { id: "lab", logo: "lab", title: "Laboratorio", subtitle: "original falso · /api/lab", x: 640, y: 390, color: COLORS.orange },
  { id: "monitor", logo: "monitor", title: "Monitor", subtitle: "batería 31 puntos", x: 1040, y: 390, color: COLORS.greenBright },
  { id: "actions", logo: "gactions", title: "GitHub Actions", subtitle: "cron 10 min · workflow", x: 1440, y: 390, color: COLORS.blue },
  { id: "swarm", logo: "agents", title: "Enjambre", subtitle: "5 roles · 1 PR", x: 1440, y: 660, color: COLORS.pink },
];

type Edge = { from: string; to: string; label?: string; color: string; dashed?: boolean };

const EDGES: Edge[] = [
  { from: "cliente", to: "vercel", label: "HTTP + Bearer", color: COLORS.yellow },
  { from: "vercel", to: "domain", label: "m → {ok}", color: COLORS.cyan },
  { from: "domain", to: "neon", label: "estado", color: COLORS.purple },
  { from: "lab", to: "monitor", label: "compara", color: COLORS.green },
  { from: "monitor", to: "actions", label: "hash ≠", color: COLORS.blue },
  { from: "domain", to: "monitor", label: "probe", color: COLORS.orange, dashed: true },
  { from: "actions", to: "swarm", label: "trigger", color: COLORS.pink },
];

const EdgeLine: React.FC<{ edge: Edge; opacity: number; frame: number; fps: number; index: number }> = ({ edge, opacity, frame, fps, index }) => {
  const a = NODES.find((n) => n.id === edge.from)!;
  const b = NODES.find((n) => n.id === edge.to)!;
  const horizontal = Math.abs(b.y - a.y) < Math.abs(b.x - a.x);

  let x1: number, y1: number, x2: number, y2: number;
  if (horizontal) {
    const right = b.x > a.x;
    x1 = a.x + (right ? NW / 2 : -NW / 2);
    x2 = b.x - (right ? NW / 2 : -NW / 2);
    y1 = a.y;
    y2 = b.y;
  } else {
    const down = b.y > a.y;
    y1 = a.y + (down ? NH / 2 : -NH / 2);
    y2 = b.y + (down ? -NH / 2 : NH / 2);
    x1 = a.x;
    x2 = b.x;
  }

  const markerId = `mk-${edge.from}-${edge.to}`;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const labelW = edge.label ? edge.label.length * 9 + 24 : 0;
  const packetProgress = ((frame / (fps * 2.4) + index * 0.17) % 1 + 1) % 1;
  const packetX = x1 + (x2 - x1) * packetProgress;
  const packetY = y1 + (y2 - y1) * packetProgress;

  return (
    <g opacity={opacity}>
      <defs>
        <marker id={markerId} markerWidth="11" markerHeight="11" refX="8" refY="3.5" orient="auto">
          <path d="M0,0 L8,3.5 L0,7 Z" fill={edge.color} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={edge.color} strokeWidth={2.5} strokeDasharray={edge.dashed ? "9,6" : "none"} markerEnd={`url(#${markerId})`} opacity={0.85} />
      <circle cx={packetX} cy={packetY} r={13} fill={edge.color} opacity={0.12} />
      <circle cx={packetX} cy={packetY} r={6} fill={edge.color} opacity={0.95} />
      {edge.label && (
        <>
          <rect x={mx - labelW / 2} y={my - 15} width={labelW} height={30} rx={8} fill={COLORS.bg} stroke={`${edge.color}50`} strokeWidth={1} />
          <text x={mx} y={my + 6} fill={edge.color} fontSize={16} fontFamily={FONTS.mono} textAnchor="middle" fontWeight={700}>{edge.label}</text>
        </>
      )}
    </g>
  );
};

export const SceneArquitectura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nodeAnim = (idx: number) => ({
    s: interpolate(frame, [(0.25 + idx * 0.13) * fps, (0.25 + idx * 0.13 + 0.45) * fps], [0.8, 1], { easing: Easing.spring({ damping: 200 }), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [(0.25 + idx * 0.13) * fps, (0.25 + idx * 0.13 + 0.4) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });
  const edgeOp = (idx: number) => interpolate(frame, [(1.35 + idx * 0.12) * fps, (1.35 + idx * 0.12 + 0.35) * fps], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.025} />
      <GlowOrb color={COLORS.cyan} size={600} style={{ top: "15%", left: "4%", opacity: 0.1 }} />
      <GlowOrb color={COLORS.purple} size={500} style={{ bottom: "8%", right: "3%", opacity: 0.08 }} />

      <div style={{ position: "relative", zIndex: 1, padding: "50px 90px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="03 / La solución" title="Servicio, vigilancia y adaptación" subtitle="Reemplazo HTTP con persistencia; monitor de cambios y agentes que proponen un PR, sin merge automático." color={COLORS.cyan} />

        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <div style={{ position: "relative", width: CW, height: CH }}>
            {/* Etiquetas de capa */}
            <div style={{ position: "absolute", left: 0, top: 8, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 15, color: COLORS.cyan, textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>1 · Servicio</span>
              <div style={{ width: 320, height: 2, background: `linear-gradient(90deg, ${COLORS.cyan}55, transparent)` }} />
            </div>
            <div style={{ position: "absolute", left: 0, top: 298, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 15, color: COLORS.greenBright, textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>2 · Vigilancia</span>
              <div style={{ width: 320, height: 2, background: `linear-gradient(90deg, ${COLORS.greenBright}55, transparent)` }} />
            </div>
            <div style={{ position: "absolute", left: 0, top: 568, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 15, color: COLORS.pink, textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>3 · Adaptación</span>
              <div style={{ width: 320, height: 2, background: `linear-gradient(90deg, ${COLORS.pink}55, transparent)` }} />
            </div>

            <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ position: "absolute", inset: 0 }}>
              {EDGES.map((e, i) => <EdgeLine key={e.from + e.to} edge={e} opacity={edgeOp(i)} frame={frame} fps={fps} index={i} />)}
            </svg>

            {NODES.map((node, i) => {
              const anim = nodeAnim(i);
              return (
                <div key={node.id} style={{ position: "absolute", left: node.x, top: node.y, transform: `translate(-50%, -50%) scale(${anim.s})`, opacity: anim.o, zIndex: 3 }}>
                  <LogoNode logo={node.logo} title={node.title} subtitle={node.subtitle} color={node.color} width={NW} height={NH} logoSize={58} titleSize={22} subSize={15} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
