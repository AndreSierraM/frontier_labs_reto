/**
 * ESCENA 8: Resultados
 * Métricas en grid limpio + terminal + stack
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, FONTS, Card, Terminal, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";

const METRICS = [
  { label: "Unitarios", value: "21", total: "/21", color: COLORS.green, icon: "✓" },
  { label: "E2E", value: "116", total: "/116", color: COLORS.greenBright, icon: "✓" },
  { label: "Ejemplos", value: "20", total: "/20", color: COLORS.cyan, icon: "▸" },
  { label: "Control", value: "34", total: "/34", color: COLORS.cyan, icon: "▸" },
  { label: "Batería", value: "62", total: "/62", color: COLORS.cyan, icon: "▸" },
  { label: "Experimentos", value: "366", total: "", color: COLORS.purple, icon: "🔬" },
  { label: "Observaciones", value: "Completas", total: "", color: COLORS.purple, icon: "📋" },
  { label: "Divergencias", value: "0", total: "", color: COLORS.green, icon: "🎯" },
];

export const SceneResultados: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const getAnim = (idx: number) => ({
    y: interpolate(frame, [(0.15 + idx * 0.1) * fps, (0.15 + idx * 0.1 + 0.4) * fps], [20, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [(0.15 + idx * 0.1) * fps, (0.15 + idx * 0.1 + 0.35) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    s: interpolate(frame, [(0.15 + idx * 0.1) * fps, (0.15 + idx * 0.1 + 0.4) * fps], [0.92, 1], { easing: Easing.spring({ damping: 200 }), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: Math.min(fadeIn, fadeOut) }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.green} size={400} style={{ top: "20%", left: "50%", transform: "translateX(-50%)", opacity: 0.1 }} />

      <div style={{ padding: "60px 100px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="07 / Resultados" title="Todo pasa. Todo verificado." subtitle="Métricas que demuestran compatibilidad total con el servicio original." color={COLORS.green} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {METRICS.map((m, i) => {
            const anim = getAnim(i);
            return (
              <div key={m.label} style={{ transform: `translateY(${anim.y}px) scale(${anim.s})`, opacity: anim.o }}>
                <Card glow={m.color === COLORS.green ? "green" : "none"} padding="20px" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontFamily: FONTS.display, fontSize: 36, fontWeight: 800, color: m.color, lineHeight: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                    {m.value}
                    {m.total && <span style={{ fontSize: 18, opacity: 0.5 }}>{m.total}</span>}
                  </div>
                  <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textMuted, marginTop: 6 }}>{m.label}</div>
                </Card>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, display: "flex", gap: 20 }}>
          <div style={{ flex: 1.2, opacity: interpolate(frame, [0.8 * fps, 1.4 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <Terminal
              title="npm test — salida final"
              lines={[
                { text: "npm --prefix reemplazo test", color: COLORS.cyan, prefix: "$", type: "cmd" },
                { text: "", type: "output" },
                { text: "PASS  tests/domain.test.js", type: "output", color: COLORS.green },
                { text: "  ✓ freshState inicializa", type: "output", color: COLORS.textDim },
                { text: "  ✓ control ISO 7064", type: "output", color: COLORS.textDim },
                { text: "  ✓ ALTA secuencial", type: "output", color: COLORS.textDim },
                { text: "  ✓ DEPOSITO saldo", type: "output", color: COLORS.textDim },
                { text: "  ✓ TRANSFER guardas", type: "output", color: COLORS.textDim },
                { text: "  ✓ ANULA marca op", type: "output", color: COLORS.textDim },
                { text: "  ✓ E506 límite", type: "output", color: COLORS.textDim },
                { text: "  ✓ E507 saldo insuf.", type: "output", color: COLORS.textDim },
                { text: "  ✓ E510 bloqueada", type: "output", color: COLORS.textDim },
                { text: "", type: "output" },
                { text: "Test Suites: 1 passed", type: "output", color: COLORS.greenBright },
                { text: "Tests:       21 passed", type: "output", color: COLORS.greenBright },
                { text: "Time:        0.842s", type: "output", color: COLORS.textDim },
              ]}
              style={{ height: "100%" }}
            />
          </div>

          <div style={{ flex: 0.6, opacity: interpolate(frame, [1 * fps, 1.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <Card style={{ height: "100%" }}>
              <h3 style={{ fontFamily: FONTS.sans, fontSize: 16, fontWeight: 700, color: COLORS.text, margin: "0 0 16px 0", paddingBottom: 12, borderBottom: `1px solid ${COLORS.border}` }}>
                Stack Técnico
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { name: "Node.js 18+", cat: "Runtime", color: COLORS.green },
                  { name: "PostgreSQL (Neon)", cat: "DB", color: COLORS.blue },
                  { name: "Vercel Edge", cat: "Hosting", color: COLORS.cyan },
                  { name: "GitHub Actions", cat: "CI/CD", color: COLORS.orange },
                  { name: "OpenRouter + LLM", cat: "AI", color: COLORS.purple },
                ].map((s) => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: COLORS.bgCode, borderRadius: 8 }}>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.text }}>{s.name}</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: s.color, backgroundColor: `${s.color}10`, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{s.cat}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
