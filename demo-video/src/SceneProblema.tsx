import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, Card, Terminal, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";

export const SceneProblema: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const a1 = {
    y: interpolate(frame, [0.2 * fps, fps], [40, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };
  const a2 = {
    y: interpolate(frame, [0.6 * fps, 1.4 * fps], [40, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [0.6 * fps, 1.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: Math.min(fadeIn, fadeOut) }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.red} size={350} style={{ top: "10%", right: "5%", opacity: 0.08 }} />

      <div style={{ padding: "60px 100px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="01 / El Problema" title="Un servicio sin especificación" subtitle="Solo hay una forma de descubrirlo: observar, experimentar y modelar." color={COLORS.red} />

        <div style={{ flex: 1, display: "flex", gap: 32 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ transform: `translateY(${a1.y}px)`, opacity: a1.o }}>
              <Card glow="red" padding="28px">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${COLORS.red}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1px solid ${COLORS.red}20` }}>🎲</div>
                  <div>
                    <h3 style={{ fontFamily: FONTS.sans, fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px 0" }}>La Caja Negra</h3>
                    <p style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textMuted, lineHeight: 1.7, margin: 0 }}>
                      Un servicio HTTP cuyo comportamiento solo se puede inferir observando entradas y salidas. Sin código fuente, sin documentación.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ transform: `translateY(${a2.y}px)`, opacity: a2.o }}>
              <Card glow="purple" padding="28px">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${COLORS.purple}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1px solid ${COLORS.purple}20` }}>🎯</div>
                  <div>
                    <h3 style={{ fontFamily: FONTS.sans, fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 8px 0" }}>El Reto</h3>
                    <p style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textMuted, lineHeight: 1.7, margin: 0 }}>
                      Construir un reemplazo 100% compatible, modelado como máquina de estados, con vigilancia autónoma que detecta cambios y se auto-adapta.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ flex: 1 }} />
            <div style={{ opacity: a2.o, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "16px 0", borderTop: `1px solid ${COLORS.border}` }}>
              {[{ icon: "🔄", label: "HTTP Entrypoint", value: "/msg" }, { icon: "🔐", label: "Auth", value: "Bearer" }, { icon: "📡", label: "Protocolo", value: "JSON" }].map((item) => (
                <div key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textDim, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1.1, opacity: a2.o }}>
            <Terminal
              title="curl — explorando el original"
              lines={[
                { text: "curl -X POST https://api.servicio/m/msg", type: "cmd", prefix: "$" },
                { text: "-H 'Authorization: Bearer ***'", type: "output" },
                { text: "-d '{\"m\":\"PING\"}'", type: "output" },
                { text: "", type: "output" },
                { text: '{"ok": true}', type: "output", color: COLORS.green },
                { text: "", type: "output" },
                { text: "curl -X POST ... -d '{\"m\":\"ALTA|Test\"}'", type: "cmd", prefix: "$" },
                { text: '{"cuenta": "AC-0001"}', type: "output", color: COLORS.green },
                { text: "", type: "output" },
                { text: "# ¿Cuál es el límite exacto?", color: COLORS.yellow, type: "comment", prefix: "#" },
                { text: "# ¿Cómo se calcula el control?", color: COLORS.yellow, type: "comment", prefix: "#" },
                { text: "# 366 experimentos para descifrarlo...", color: COLORS.yellow, type: "comment", prefix: "#" },
              ]}
              style={{ height: "100%" }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
