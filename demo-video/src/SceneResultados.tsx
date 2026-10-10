import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, Card, GlowOrb, GridBg, SectionHeader, BigMetric } from "./DesignSystem";
import { Icon } from "./Icons";

const METRICS = [
  { value: "21/21", label: "Pruebas de dominio", color: COLORS.green, icon: "check-circle" as const },
  { value: "118/126", label: "Validación registrada", color: COLORS.blue, icon: "flask" as const },
  { value: "394", label: "Observaciones al corte", color: COLORS.purple, icon: "microscope" as const },
  { value: "82", label: "Filas SPEC con evidencia", color: COLORS.cyan, icon: "target" as const },
];

const DELIVERABLES = [
  { name: "Reemplazo del servicio HTTP", cat: "API", color: COLORS.green },
  { name: "Estado persistente en PostgreSQL", cat: "Datos", color: COLORS.blue },
  { name: "Monitor de cambios", cat: "Monitor", color: COLORS.cyan },
  { name: "Pipeline de cinco roles", cat: "Agentes", color: COLORS.purple },
  { name: "SPEC y log de experimentos", cat: "Evidencia", color: COLORS.orange },
];

const TESTS = [
  { text: "COMPROBACIÓN DE ESTA REVISIÓN", color: COLORS.cyan },
  { text: "" },
  { text: "✓ Dominio: 21 pruebas OK", color: COLORS.green },
  { text: "✓ HTTP y aislamiento: 5 pruebas OK", color: COLORS.green },
  { text: "✓ Log: 394 observaciones, IDs 1..394", color: COLORS.green },
  { text: "✓ SPEC: 82 filas con evidencia", color: COLORS.green },
  { text: "" },
  { text: "VALIDACIÓN REGISTRADA · localhost:3111", color: COLORS.cyan },
  { text: "Control: 34/34 · Batería v2: 72/72", color: COLORS.green },
  { text: "Ejemplos v1: 12/20 · 8 diferencias registradas", color: COLORS.orange },
  { text: "Total: 118/126 · logs/validacion.json", color: COLORS.textMuted },
  { text: "", color: COLORS.textMuted },
  { text: "Corte de revisión: 10 oct 2026 · no es una sesión en vivo.", color: COLORS.textDim },
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

      <div style={{ position: "relative", zIndex: 1, padding: "54px 90px 84px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="03 / Validación" title="Pruebas y evidencia registrada" subtitle="Pruebas de esta revisión y validación local registrada. Se conservan las diferencias frente a los ejemplos v1." color={COLORS.green} />

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
          <div style={{ flex: 1.35, display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgCard }}>
            <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgElevated }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.red, opacity: 0.7 }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.yellow, opacity: 0.7 }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.green, opacity: 0.7 }} />
              </div>
              <span style={{ color: COLORS.textDim, fontFamily: FONTS.mono, fontSize: 15 }}>Resumen de pruebas y evidencia</span>
            </div>
            <div style={{ padding: "18px 24px" }}>
              {TESTS.slice(0, visibleTests).map((l, i) => (
                <div key={i} style={{ fontFamily: FONTS.mono, fontSize: 19, lineHeight: "28px", color: l.color || COLORS.textMuted, display: "flex", gap: 10 }}>
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
                <h3 style={{ fontFamily: FONTS.sans, fontSize: 24, fontWeight: 700, color: COLORS.text, margin: 0 }}>Componentes implementados</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {DELIVERABLES.map((s) => (
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
