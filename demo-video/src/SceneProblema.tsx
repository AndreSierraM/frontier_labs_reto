import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, Card, Terminal, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";
import { Icon, IconName } from "./Icons";

export const SceneProblema: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const a1 = {
    y: interpolate(frame, [0.2 * fps, fps], [50, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };
  const a2 = {
    y: interpolate(frame, [0.6 * fps, 1.4 * fps], [50, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [0.6 * fps, 1.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };
  const a3 = {
    y: interpolate(frame, [1 * fps, 1.8 * fps], [50, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [1 * fps, 1.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.red} size={400} style={{ top: "8%", right: "5%", opacity: 0.1 }} />

      <div style={{ position: "relative", zIndex: 1, padding: "70px 110px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="01 / El reto" title="Recrear un servicio sin ver su código" subtitle="Descubrir su contrato HTTP, construir el reemplazo y detectar cambios de comportamiento." color={COLORS.red} />

        <div style={{ flex: 1, display: "flex", gap: 36 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ transform: `translateY(${a1.y}px)`, opacity: a1.o }}>
              <Card glow="red" padding="32px">
                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: `${COLORS.red}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${COLORS.red}25` }}><Icon name="dice" size={30} color={COLORS.red} /></div>
                  <div>
                    <h3 style={{ fontFamily: FONTS.sans, fontSize: 28, fontWeight: 700, color: COLORS.text, margin: "0 0 10px 0" }}>La Caja Negra</h3>
                    <p style={{ fontFamily: FONTS.sans, fontSize: 20, color: COLORS.textMuted, lineHeight: 1.55, margin: 0 }}>
                      Un servicio HTTP cuyo comportamiento solo se puede inferir observando entradas y salidas. Sin código fuente, sin documentación.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ transform: `translateY(${a2.y}px)`, opacity: a2.o }}>
              <Card glow="purple" padding="32px">
                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: `${COLORS.purple}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${COLORS.purple}25` }}><Icon name="target" size={30} color={COLORS.purple} /></div>
                  <div>
                    <h3 style={{ fontFamily: FONTS.sans, fontSize: 28, fontWeight: 700, color: COLORS.text, margin: "0 0 10px 0" }}>El Reto</h3>
                    <p style={{ fontFamily: FONTS.sans, fontSize: 20, color: COLORS.textMuted, lineHeight: 1.55, margin: 0 }}>
                      Reproducir respuestas y estado; detectar diferencias y proponer adaptaciones verificables mediante pull requests.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ transform: `translateY(${a3.y}px)`, opacity: a3.o }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { icon: "clipboard" as IconName, label: "Observaciones", value: "390", c: COLORS.cyan },
                  { icon: "flask" as IconName, label: "Validación", value: "116/116", c: COLORS.green },
                  { icon: "microscope" as IconName, label: "Experimentos", value: "JSONL log", c: COLORS.purple },
                ].map((item) => (
                  <Card key={item.label} padding="18px">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Icon name={item.icon} size={32} color={item.c} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: FONTS.sans, fontSize: 19, color: COLORS.textMuted, marginBottom: 5, whiteSpace: "nowrap" }}>{item.label}</div>
                        <div style={{ fontFamily: FONTS.mono, fontSize: 26, color: item.c, fontWeight: 700, whiteSpace: "nowrap" }}>{item.value}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1.1, opacity: a2.o }}>
            <Terminal
              title="Cambios registrados · bitácora del proyecto"
              style={{ height: "100%" }}
              lines={[
                { text: "ANTES → DESPUÉS", type: "comment", prefix: "#", color: COLORS.cyan },
                { text: "", type: "output" },
                { text: "Saldo: 100 → \"1.00\"", type: "output", color: COLORS.text },
                { text: "Evidencia: observaciones 370 y 372", type: "output" },
                { text: "", type: "output" },
                { text: "Límite TRANSFER: 100.000 → 50.000", type: "output", color: COLORS.text },
                { text: "Evidencia: observaciones 375 y 376", type: "output" },
                { text: "", type: "output" },
                { text: "E510: HTTP 409 → 423 + intentos", type: "output", color: COLORS.text },
                { text: "Evidencia: observaciones 380 y 381", type: "output" },
                { text: "", type: "output" },
                { text: "Adaptación registrada: ce7aba2", type: "output", color: COLORS.green },
                { text: "Fuente: reto2-investigacion/BITACORA.md", type: "output" },
              ]}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
