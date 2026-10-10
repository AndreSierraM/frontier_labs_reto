import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Card, COLORS, FONTS, GridBg, SectionHeader } from "./DesignSystem";
import steps from "./demo-evidence.json";

const LABELS = ["Crear cuenta de Lucia", "Crear cuenta de Mateo", "Depositar 250,00", "Transferir 40,00", "Consultar el saldo", "Anular la transferencia"];
const NOTES = [
  "Cada alta recibe un identificador secuencial.",
  "Dos cuentas independientes, ambas con saldo inicial cero.",
  "El depósito registra una operación y actualiza el saldo.",
  "La transferencia descuenta al origen y abona al destino.",
  "La consulta devuelve el saldo como cadena decimal.",
  "La anulación restaura los saldos anteriores a la transferencia.",
];

export const SceneDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = Math.min(steps.length - 1, Math.floor(frame / (20 * fps / steps.length)));
  const step = steps[active];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg />
      <div style={{ position: "relative", zIndex: 1, height: "100%", padding: "54px 100px 90px", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="02 / Demostración" title="De una entrada a un cambio de estado" subtitle="Secuencia ejecutada en el dominio local. Reproducimos sus respuestas y saldos; no es una sesión en vivo." />
        <div style={{ display: "flex", gap: 32, flex: 1, minHeight: 0 }}>
          <div style={{ width: 470, display: "flex", flexDirection: "column", gap: 14 }}>
            {LABELS.map((label, i) => (
              <Card key={label} padding="22px 24px" style={{ borderColor: i === active ? COLORS.cyan : COLORS.border, backgroundColor: i === active ? "#e4efea" : COLORS.bgCard }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 24, color: i < active ? COLORS.green : COLORS.cyan }}>{i < active ? "✓" : String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: FONTS.sans, fontSize: 25, fontWeight: i === active ? 700 : 500, color: COLORS.text }}>{label}</span>
                </div>
              </Card>
            ))}
            <p style={{ fontFamily: FONTS.sans, fontSize: 23, lineHeight: 1.5, color: COLORS.textMuted, margin: "12px 0 0" }}>{NOTES[active]}</p>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
            <Card padding="26px 32px" glow="cyan">
              <div style={{ fontFamily: FONTS.sans, fontSize: 21, color: COLORS.cyan, marginBottom: 16 }}>Mensaje de entrada · campo m</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 29, color: COLORS.text, overflowWrap: "anywhere" }}>{step.m}</div>
            </Card>
            <Card padding="26px 32px" style={{ flex: 1 }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 21, color: COLORS.green }}>Respuesta del dominio</div>
              <pre style={{ fontFamily: FONTS.mono, fontSize: 28, lineHeight: 1.5, color: COLORS.text, margin: "20px 0 0" }}>{JSON.stringify(step.response, null, 2)}</pre>
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              {["AC-0001", "AC-0002"].map((id, i) => {
                const account = step.accounts.find((a) => a.id === id);
                return (
                  <Card key={id} padding="22px 28px" style={{ backgroundColor: i === 0 ? "#e7f0e9" : "#eee8f3", opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }) }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 22, color: COLORS.textMuted }}>{account?.name ?? "Mateo"} · {id}</div>
                    <div style={{ fontFamily: FONTS.display, fontSize: 58, fontWeight: 700, color: i === 0 ? COLORS.green : COLORS.purple, marginTop: 8 }}>{account?.balance ?? "—"}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
