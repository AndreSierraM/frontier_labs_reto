import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Card, COLORS, FONTS, GridBg, SectionHeader } from "./DesignSystem";

const EVIDENCE = [
  { title: "Observación 349", tag: "EXPERIMENTO", detail: "GET /health\nHTTP 200\n{ \"ok\": true }", note: "Petición y respuesta guardadas en experimentos.jsonl.", color: COLORS.cyan },
  { title: "Regla I-01", tag: "ESPECIFICACIÓN", detail: "Health con token\n→ 200 {ok:true}\nConfianza: confirmado", note: "El SPEC cita el ID exacto de la observación que respalda la regla.", color: COLORS.purple },
  { title: "Comprobación local", tag: "VALIDACIÓN", detail: "390 observaciones\n78 filas con evidencia\nEsquema: OK", note: "validar_spec.py comprueba IDs, esquema y correspondencia de evidencia.", color: COLORS.green },
];

export const SceneEvidencia: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg />
      <div style={{ position: "relative", zIndex: 1, height: "100%", padding: "54px 100px 90px", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="06 / Trazabilidad" title="Cada regla tiene una evidencia detrás" subtitle="Ejemplo real: del log de experimentos a la especificación y a su comprobación automática." color={COLORS.green} />
        <div style={{ display: "flex", gap: 22, alignItems: "stretch", marginTop: 36 }}>
          {EVIDENCE.map((item, i) => (
            <React.Fragment key={item.title}>
              {i > 0 && <div style={{ alignSelf: "center", fontSize: 38, color: COLORS.textDim }}>→</div>}
              <Card padding="30px" style={{ flex: 1, minWidth: 0, minHeight: 400, borderTop: `4px solid ${item.color}`, opacity: interpolate(frame, [i * 0.7 * fps, (i * 0.7 + 0.5) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 19, color: item.color, letterSpacing: "0.12em", marginBottom: 18 }}>{item.tag}</div>
                <h3 style={{ fontFamily: FONTS.sans, fontSize: 31, color: COLORS.text, margin: "0 0 28px" }}>{item.title}</h3>
                <div style={{ fontFamily: FONTS.mono, fontSize: 25, lineHeight: 1.7, whiteSpace: "pre-wrap", color: item.color }}>{item.detail}</div>
                <p style={{ fontFamily: FONTS.sans, fontSize: 23, lineHeight: 1.5, color: COLORS.textMuted, margin: "30px 0 0" }}>{item.note}</p>
              </Card>
            </React.Fragment>
          ))}
        </div>
        <Card padding="28px 34px" style={{ marginTop: 38, backgroundColor: "#e6efe9" }}>
          <div style={{ fontFamily: FONTS.sans, fontSize: 28, fontWeight: 600, color: COLORS.green }}>Una conclusión verificable, no solo una cifra en pantalla.</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 20, color: COLORS.textMuted, marginTop: 16 }}>python3 reto2-investigacion/scripts/validar_spec.py</div>
        </Card>
      </div>
    </AbsoluteFill>
  );
};
