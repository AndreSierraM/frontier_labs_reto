import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, Card, GlowOrb, GridBg, SectionHeader, BigMetric } from "./DesignSystem";
import { Icon } from "./Icons";

const METRICS = [
  { value: "21/21", label: "Tests unitarios", color: COLORS.green, icon: "check-circle" as const },
  { value: "116/116", label: "Validación E2E", color: COLORS.greenBright, icon: "check-circle" as const },
  { value: "366", label: "Observaciones", color: COLORS.purple, icon: "microscope" as const },
  { value: "0", label: "Divergencias", color: COLORS.cyan, icon: "target" as const },
];

const STACK = [
  { name: "Node.js 18+", cat: "Runtime", color: COLORS.green },
  { name: "PostgreSQL (Neon)", cat: "DB", color: COLORS.blue },
  { name: "Vercel Edge", cat: "Hosting", color: COLORS.cyan },
  { name: "GitHub Actions", cat: "CI/CD", color: COLORS.orange },
  { name: "OpenRouter + LLM", cat: "AI", color: COLORS.purple },
  { name: "JSONB + FOR UPDATE", cat: "Persist.", color: COLORS.pink },
  { name: "Docker", cat: "Packaging", color: COLORS.greenBright },
];

const TESTS = [
  { text: "npm --prefix reemplazo test", color: COLORS.cyan, prefix: "$" },
  { text: "" },
  { text: "PASS  tests/domain.test.js", color: COLORS.green },
  { text: "  ✓ freshState inicializa", color: COLORS.textDim },
  { text: "  ✓ control ISO 7064 MOD 97-10", color: COLORS.textDim },
  { text: "  ✓ ALTA secuencial AC-XXXX", color: COLORS.textDim },
  { text: "  ✓ DEPOSITO actualiza saldo", color: COLORS.textDim },
  { text: "  ✓ TRANSFER con guardas", color: COLORS.textDim },
  { text: "  ✓ ANULA reversión única", color: COLORS.textDim },
  { text: "  ✓ E506 límite excedido", color: COLORS.textDim },
  { text: "  ✓ E507 saldo insuficiente", color: COLORS.textDim },
  { text: "  ✓ E510 cuenta bloqueada", color: COLORS.textDim },
  { text: "" },
  { text: "Test Suites: 1 passed, 1 total", color: COLORS.greenBright },
  { text: "Tests:       21 passed, 21 total", color: COLORS.greenBright },
  { text: "Time:        0.842 s", color: COLORS.textDim },
];

export const SceneResultados: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const metricAnim = (idx: number) => ({
    y: interpolate(frame, [(0.1 + idx * 0.1) * fps, (0.1 + idx * 0.1 + 0.4) * fps], [30, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [(0.1 + idx * 0.1) * fps, (0.1 + idx * 0.1 + 0.35) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    s: interpolate(frame, [(0.1 + idx * 0.1) * fps, (0.1 + idx * 0.1 + 0.4) * fps], [0.92, 1], { easing: Easing.spring({ damping: 200 }), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });

  const bottomOp = interpolate(frame, [0.7 * fps, 1.3 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bottomY = interpolate(frame, [0.7 * fps, 1.3 * fps], [30, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const visibleTests = Math.floor(Math.max(0, (frame - 0.8 * fps) / (fps * 0.11)));

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.green} size={550} style={{ top: "12%", left: "50%", transform: "translateX(-50%)", opacity: 0.11 }} />

      <div style={{ padding: "54px 90px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="08 / Resultados" title="Todo pasa. Todo verificado." subtitle="Métricas que demuestran compatibilidad total con el servicio original." color={COLORS.green} />

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22, marginBottom: 28 }}>
          {METRICS.map((m, i) => {
            const a = metricAnim(i);
            return (
              <div key={m.label} style={{ transform: `translateY(${a.y}px) scale(${a.s})`, opacity: a.o }}>
                <BigMetric value={m.value} label={m.label} color={m.color} icon={<Icon name={m.icon} size={40} color={m.color} />} />
              </div>
            );
          })}
        </div>

        {/* Detalle */}
        <div style={{ flex: 1, display: "flex", gap: 24, transform: `translateY(${bottomY}px)`, opacity: bottomOp }}>
          {/* Terminal */}
          <div style={{ flex: 1.35, display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", border: `1px solid ${COLORS.border}`, backgroundColor: "#0b0d14" }}>
            <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}`, backgroundColor: "#0e1017" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.red, opacity: 0.7 }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.yellow, opacity: 0.7 }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.green, opacity: 0.7 }} />
              </div>
              <span style={{ color: COLORS.textDim, fontFamily: FONTS.mono, fontSize: 15 }}>npm test — salida final</span>
            </div>
            <div style={{ padding: "18px 24px" }}>
              {TESTS.slice(0, visibleTests).map((l, i) => (
                <div key={i} style={{ fontFamily: FONTS.mono, fontSize: 17, lineHeight: "26px", color: l.color || COLORS.textMuted, display: "flex", gap: 10 }}>
                  {l.prefix && <span style={{ color: COLORS.cyan }}>{l.prefix}</span>}
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stack */}
          <div style={{ flex: 0.95 }}>
            <Card style={{ height: "100%" }} padding="28px">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
                <Icon name="layers" size={26} color={COLORS.cyan} />
                <h3 style={{ fontFamily: FONTS.sans, fontSize: 24, fontWeight: 700, color: COLORS.text, margin: 0 }}>Stack Técnico</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {STACK.map((s) => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", backgroundColor: COLORS.bgCode, borderRadius: 10 }}>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 17, color: COLORS.text }}>{s.name}</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: s.color, backgroundColor: `${s.color}14`, padding: "4px 11px", borderRadius: 6, fontWeight: 700 }}>{s.cat}</span>
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