import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";
import { TechLogo, LogoName } from "./TechLogos";

const CW = 1740;
const CH = 770;
const NW = 300;
const NH = 175;

type Step = { n: number; logo: LogoName; title: string; sub: string; x: number; y: number };

const P = {
  vig: COLORS.cyan,
  inv: COLORS.purple,
  ent: COLORS.green,
};

// Serpentina: fila 1 de izq→der, fila 2 de der→izq, fila 3 de izq→der
const STEPS: (Step & { color: string; phase: string })[] = [
  { n: 1, logo: "gactions", title: "Cron", sub: "cada 10 min", x: 210, y: 100, color: P.vig, phase: "Vigilancia" },
  { n: 2, logo: "vercel", title: "Monitor /run", sub: "ejecuta batería", x: 550, y: 100, color: P.vig, phase: "Vigilancia" },
  { n: 3, logo: "monitor", title: "31 puntos", sub: "vs original", x: 890, y: 100, color: P.vig, phase: "Vigilancia" },
  { n: 4, logo: "neon", title: "Snapshot", sub: "hash SHA-256", x: 1230, y: 100, color: P.vig, phase: "Vigilancia" },
  { n: 5, logo: "json", title: "¿Cambió?", sub: "hash ≠ anterior", x: 1570, y: 100, color: P.vig, phase: "Vigilancia" },

  { n: 6, logo: "agents", title: "Scouts", sub: "investigan en paralelo", x: 1570, y: 400, color: P.inv, phase: "Investigación" },
  { n: 7, logo: "agents", title: "Analista", sub: "PATCH: sí / no", x: 1180, y: 400, color: P.inv, phase: "Investigación" },
  { n: 8, logo: "node", title: "Fixer", sub: "parche + test", x: 790, y: 400, color: P.inv, phase: "Investigación" },
  { n: 9, logo: "postgres", title: "Verificador", sub: "0 divergencias", x: 400, y: 400, color: P.inv, phase: "Investigación" },

  { n: 10, logo: "github", title: "Reporter", sub: "redacta el PR", x: 400, y: 680, color: P.ent, phase: "Entrega" },
  { n: 11, logo: "github", title: "Pull Request", sub: "no toca main", x: 870, y: 680, color: P.ent, phase: "Entrega" },
  { n: 12, logo: "vercel", title: "Merge → Deploy", sub: "a producción", x: 1340, y: 680, color: P.ent, phase: "Entrega" },
];

const StepNode: React.FC<{ s: Step & { color: string }; opacity: number; scale: number; active: boolean }> = ({ s, opacity, scale, active }) => (
  <div style={{ position: "absolute", left: s.x, top: s.y, transform: `translate(-50%, -50%) scale(${scale})`, opacity, zIndex: 3 }}>
    <div
      style={{
        width: NW,
        height: NH,
        backgroundColor: COLORS.bgCard,
        backgroundImage: `linear-gradient(140deg, ${s.color}${active ? "24" : "10"}, transparent)`,
        border: `2px solid ${active ? s.color : s.color + "50"}`,
        borderRadius: 18,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxShadow: active ? `0 6px 24px ${s.color}20` : `0 6px 16px ${s.color}08`,
      }}
    >
      <div style={{ position: "absolute", top: -14, left: 14, width: 34, height: 34, borderRadius: 10, backgroundColor: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.mono, fontSize: 18, fontWeight: 800, color: COLORS.bgCard }}>
        {s.n}
      </div>
      <TechLogo name={s.logo} size={52} color={s.color} />
      <div style={{ fontFamily: FONTS.sans, fontSize: 22, fontWeight: 700, color: COLORS.text, textAlign: "center", lineHeight: 1.15 }}>{s.title}</div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: COLORS.textDim, textAlign: "center" }}>{s.sub}</div>
    </div>
  </div>
);

// Flecha horizontal entre dos pasos (detecta dirección)
const HArrow: React.FC<{ from: Step; to: Step; color: string; opacity: number }> = ({ from, to, color, opacity }) => {
  const right = to.x > from.x;
  const x1 = from.x + (right ? NW / 2 : -NW / 2);
  const x2 = to.x + (right ? -NW / 2 : NW / 2);
  const id = `h-${from.n}-${to.n}`;
  return (
    <g opacity={opacity}>
      <defs>
        <marker id={id} markerWidth="12" markerHeight="12" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L9,3.5 L0,7 Z" fill={color} />
        </marker>
      </defs>
      <line x1={x1} y1={from.y} x2={x2} y2={to.y} stroke={color} strokeWidth={3} markerEnd={`url(#${id})`} />
    </g>
  );
};

// Flecha vertical entre fases (con etiqueta)
const VArrow: React.FC<{ x: number; y1: number; y2: number; color: string; label: string; opacity: number }> = ({ x, y1, y2, color, label, opacity }) => {
  const id = `v-${x}-${y1}`;
  const my = (y1 + y2) / 2;
  const lw = label.length * 10 + 28;
  return (
    <g opacity={opacity}>
      <defs>
        <marker id={id} markerWidth="12" markerHeight="12" refX="3.5" refY="9" orient="0">
          <path d="M0,0 L3.5,9 L7,0 Z" fill={color} />
        </marker>
      </defs>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={3} strokeDasharray="10,6" markerEnd={`url(#${id})`} />
      <rect x={x - lw / 2} y={my - 17} width={lw} height={34} rx={9} fill={COLORS.bg} stroke={color} strokeWidth={1.5} />
      <text x={x} y={my + 7} fill={color} fontSize={17} fontFamily={FONTS.mono} textAnchor="middle" fontWeight={700}>{label}</text>
    </g>
  );
};

export const SceneFlujo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const perStep = 0.4;
  const activeStep = Math.min(12, Math.floor(frame / fps / perStep) + 1);

  const stepAnim = (n: number) => {
    const d = 0.15 + (n - 1) * perStep;
    return {
      s: interpolate(frame, [d * fps, (d + 0.4) * fps], [0.8, 1], { easing: Easing.spring({ damping: 200 }), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      o: interpolate(frame, [d * fps, (d + 0.3) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    };
  };

  const hOp = (n: number) => interpolate(frame, [(0.55 + (n - 1) * perStep) * fps, (0.55 + (n - 1) * perStep + 0.3) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.cyan} size={450} style={{ top: "8%", left: "6%", opacity: 0.08 }} />
      <GlowOrb color={COLORS.green} size={450} style={{ bottom: "6%", right: "6%", opacity: 0.08 }} />

      <div style={{ position: "relative", zIndex: 1, padding: "46px 90px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="06 / Flujo Completo" title="Pipeline autónomo · 12 pasos" subtitle="Detecta → investiga → parchea → verifica → entrega. Sin intervención humana hasta el PR." color={COLORS.cyan} />

        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <div style={{ position: "relative", width: CW, height: CH }}>
            {/* etiquetas de fase */}
            {[
              { name: "Vigilancia", note: "cada 10 min", y: 100, color: P.vig },
              { name: "Investigación", note: "si cambió", y: 400, color: P.inv },
              { name: "Entrega", note: "PR + deploy", y: 680, color: P.ent },
            ].map((ph) => (
              <div key={ph.name} style={{ position: "absolute", left: 0, top: ph.y === 100 ? ph.y + NH / 2 + 16 : ph.y - NH / 2 + 20, display: "flex", flexDirection: "column", gap: 2, opacity: interpolate(frame, [(0.1 + ph.y / 400) * fps, (0.1 + ph.y / 400 + 0.3) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 5, height: 22, borderRadius: 3, backgroundColor: ph.color }} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 14, color: ph.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em" }}>{ph.name}</span>
                </div>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textDim, marginLeft: 13 }}>{ph.note}</span>
              </div>
            ))}

            <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              {/* horizontales fase 1 (der) */}
              <HArrow from={STEPS[0]} to={STEPS[1]} color={P.vig} opacity={hOp(1)} />
              <HArrow from={STEPS[1]} to={STEPS[2]} color={P.vig} opacity={hOp(2)} />
              <HArrow from={STEPS[2]} to={STEPS[3]} color={P.vig} opacity={hOp(3)} />
              <HArrow from={STEPS[3]} to={STEPS[4]} color={P.vig} opacity={hOp(4)} />
              {/* vertical fase 1 → 2 */}
              <VArrow x={1570} y1={100 + NH / 2} y2={400 - NH / 2} color={P.inv} label="si cambió" opacity={hOp(5)} />
              {/* horizontales fase 2 (izq) */}
              <HArrow from={STEPS[5]} to={STEPS[6]} color={P.inv} opacity={hOp(6)} />
              <HArrow from={STEPS[6]} to={STEPS[7]} color={P.inv} opacity={hOp(7)} />
              <HArrow from={STEPS[7]} to={STEPS[8]} color={P.inv} opacity={hOp(8)} />
              {/* vertical fase 2 → 3 */}
              <VArrow x={400} y1={400 + NH / 2} y2={680 - NH / 2} color={P.ent} label="0 divergencias" opacity={hOp(9)} />
              {/* horizontales fase 3 (der) */}
              <HArrow from={STEPS[9]} to={STEPS[10]} color={P.ent} opacity={hOp(10)} />
              <HArrow from={STEPS[10]} to={STEPS[11]} color={P.ent} opacity={hOp(11)} />
            </svg>

            {STEPS.map((s) => {
              const a = stepAnim(s.n);
              return <StepNode key={s.n} s={s} opacity={a.o} scale={a.s} active={s.n === activeStep} />;
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
