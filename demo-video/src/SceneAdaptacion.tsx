import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Card, COLORS, FONTS, GridBg, SectionHeader } from "./DesignSystem";

const CHANGES = [
  { title: "Serialización del saldo", before: '{ "saldo": 100 }', after: '{ "saldo": "1.00" }', note: "Cambio de tipo: entero en centavos → cadena decimal con dos posiciones.", ids: "370 y 372", commit: "ce7aba2", label: "Saldo decimal" },
  { title: "Respuesta de cuenta bloqueada", before: "HTTP 409 · E510", after: "HTTP 423 · E510\n+ intentos: N", note: "Cambio del código HTTP e incorporación del contador de intentos.", ids: "380 y 381", commit: "ce7aba2", label: "Cuenta bloqueada" },
  { title: "Transición al estado de apagado", before: "HTTP 409 · E520\nSiempre", after: "HALT;1 → HTTP 503 · E599\nHasta ejecutar __reset", note: "Los mensajes posteriores reciben E599 hasta restablecer el estado con __reset.", ids: "387–390", commit: "46fa1fc", label: "Servicio detenido" },
];

export const SceneAdaptacion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = Math.min(CHANGES.length - 1, Math.floor(frame / (6 * fps)));
  const change = CHANGES[active];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg />
      <div style={{ position: "relative", zIndex: 1, padding: "54px 100px 90px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="06 / Cambios registrados" title="Ajustes del contrato observado" subtitle="Tres cambios documentados en la bitácora, vinculados a observaciones y commits del reemplazo." color={COLORS.purple} />
        <div style={{ display: "flex", gap: 18, marginBottom: 32 }}>
          {CHANGES.map((item, i) => (
            <div key={item.label} style={{ flex: 1, padding: "17px 24px", borderRadius: 12, border: `1px solid ${i === active ? COLORS.purple : COLORS.border}`, backgroundColor: i === active ? "#ece5f1" : COLORS.bgCard, fontFamily: FONTS.sans, fontSize: 25, fontWeight: i === active ? 700 : 500, color: COLORS.text }}>
              {String(i + 1).padStart(2, "0")} · {item.label}
            </div>
          ))}
        </div>
        <h3 style={{ fontFamily: FONTS.display, fontSize: 39, color: COLORS.text, margin: "0 0 24px" }}>{change.title}</h3>
        <div style={{ display: "flex", alignItems: "stretch", gap: 26, minHeight: 260 }}>
          <Card padding="30px 36px" style={{ flex: 1, backgroundColor: "#f3e9e5" }}>
            <div style={{ fontFamily: FONTS.sans, fontSize: 23, color: COLORS.orange, marginBottom: 26 }}>Antes · contrato anterior</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 33, lineHeight: 1.6, whiteSpace: "pre-wrap", color: COLORS.text }}>{change.before}</div>
          </Card>
          <div style={{ alignSelf: "center", fontSize: 48, color: COLORS.purple }}>→</div>
          <Card padding="30px 36px" style={{ flex: 1, backgroundColor: "#e5efe8" }}>
            <div style={{ fontFamily: FONTS.sans, fontSize: 23, color: COLORS.green, marginBottom: 26 }}>Después · cambio observado</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 33, lineHeight: 1.6, whiteSpace: "pre-wrap", color: COLORS.text }}>{change.after}</div>
          </Card>
        </div>
        <p style={{ fontFamily: FONTS.sans, fontSize: 29, lineHeight: 1.5, color: COLORS.text, margin: "28px 0" }}>{change.note}</p>
        <Card padding="25px 32px" style={{ marginTop: "auto", opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.mono, fontSize: 23, color: COLORS.purple }}>
            <span>Observaciones {change.ids}</span><span>Adaptación: {change.commit}</span>
          </div>
          <div style={{ fontFamily: FONTS.sans, fontSize: 20, color: COLORS.textMuted, marginTop: 14 }}>Fuente: reto2-investigacion/BITACORA.md · Registro del proyecto, no ejecución en vivo.</div>
        </Card>
      </div>
    </AbsoluteFill>
  );
};
