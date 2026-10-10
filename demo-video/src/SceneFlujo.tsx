/**
 * ESCENA 7: Flujo Completo
 * Diagrama end-to-end con fases bien definidas
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";

const PHASES = [
  {
    name: "Vigilancia",
    color: COLORS.cyan,
    steps: [
      { label: "Cron 15min", icon: "⏰", x: 0.12, y: 0.28 },
      { label: "Monitor /run", icon: "📊", x: 0.32, y: 0.28 },
      { label: "Batería 31pts", icon: "🔋", x: 0.52, y: 0.28 },
      { label: "Snapshot Neon", icon: "💾", x: 0.72, y: 0.28 },
    ],
  },
  {
    name: "Investigación",
    color: COLORS.purple,
    steps: [
      { label: "Scouts", icon: "🔍", x: 0.22, y: 0.52 },
      { label: "Analista", icon: "🧠", x: 0.42, y: 0.52 },
      { label: "Fixer", icon: "🔧", x: 0.62, y: 0.52 },
      { label: "Verificador", icon: "✅", x: 0.82, y: 0.52 },
    ],
  },
  {
    name: "Entrega",
    color: COLORS.green,
    steps: [
      { label: "Reporter", icon: "📝", x: 0.35, y: 0.76 },
      { label: "Pull Request", icon: "🔀", x: 0.55, y: 0.76 },
      { label: "Merge → Deploy", icon: "🚀", x: 0.78, y: 0.76 },
    ],
  },
];

export const SceneFlujo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const getNodeAnim = (phaseIdx: number, stepIdx: number) => {
    const d = 0.3 + phaseIdx * 0.5 + stepIdx * 0.15;
    const s = interpolate(frame, [d * fps, (d + 0.4) * fps], [0.85, 1], { easing: Easing.spring({ damping: 200 }), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const o = interpolate(frame, [d * fps, (d + 0.35) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { s, o };
  };

  // Particle following the flow

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: Math.min(fadeIn, fadeOut) }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.cyan} size={300} style={{ top: "30%", left: "10%", opacity: 0.08 }} />
      <GlowOrb color={COLORS.green} size={250} style={{ bottom: "20%", right: "10%", opacity: 0.06 }} />

      <div style={{ padding: "60px 100px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="06 / Flujo Completo" title="Detecta → Investiga → Parchea → Despliega" subtitle="Ciclo cerrado de adaptación autónoma sin intervención humana." color={COLORS.cyan} />

        <div style={{ flex: 1, position: "relative" }}>
          {PHASES.map((phase, pi) => (
            <div key={phase.name}>
              {/* Phase label */}
              <div
                style={{
                  position: "absolute",
                  left: "2%",
                  top: `${phase.steps[0].y * 100 - 8}%`,
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color: phase.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                  opacity: getNodeAnim(pi, 0).o,
                }}
              >
                {phase.name}
              </div>

              {/* Phase connector line */}
              <div
                style={{
                  position: "absolute",
                  left: "8%",
                  right: "5%",
                  top: `${phase.steps[0].y * 100}%`,
                  height: 1,
                  backgroundColor: `${phase.color}15`,
                  opacity: getNodeAnim(pi, 0).o,
                }}
              />

              {phase.steps.map((step, si) => {
                const anim = getNodeAnim(pi, si);
                return (
                  <div
                    key={step.label}
                    style={{
                      position: "absolute",
                      left: `${step.x * 100}%`,
                      top: `${step.y * 100}%`,
                      transform: `translate(-50%, -50%) scale(${anim.s})`,
                      opacity: anim.o,
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: `${phase.color}08`,
                        border: `1.5px solid ${phase.color}40`,
                        borderRadius: 14,
                        padding: "14px 20px",
                        textAlign: "center",
                        minWidth: 130,
                        boxShadow: `0 8px 32px ${phase.color}08`,
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{step.icon}</div>
                      <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: phase.color }}>{step.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Flow arrow between phases */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {/* Vigilancia → Investigación */}
            <path
              d="M 720 260 Q 900 380 440 520"
              stroke={COLORS.purple}
              strokeWidth={2}
              strokeDasharray="6,4"
              fill="none"
              opacity={interpolate(frame, [1.5 * fps, 2 * fps], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            />
            {/* Investigación → Entrega */}
            <path
              d="M 1100 520 Q 900 640 650 760"
              stroke={COLORS.green}
              strokeWidth={2}
              strokeDasharray="6,4"
              fill="none"
              opacity={interpolate(frame, [2.5 * fps, 3 * fps], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
