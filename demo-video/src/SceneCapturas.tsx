import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg, SectionHeader, ScreenshotFrame } from "./DesignSystem";

const CAPTURES = [
  { src: "captures/diseno.png", title: "01 · Diseño de Sistemas", tag: "Entregable oficial", color: COLORS.cyan, focusY: 18, scale: 1.55 },
  { src: "captures/arquitectura.png", title: "02 · Diagrama de Arquitectura", tag: "Entregable oficial", color: COLORS.purple, focusY: 12, scale: 1.65 },
  { src: "captures/entregables.png", title: "Índice de entregables", tag: "Documentación", color: COLORS.green, focusY: 8, scale: 1.5 },
];

export const SceneCapturas: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeIdx = Math.min(CAPTURES.length - 1, Math.floor(frame / (3.2 * fps)));
  const active = CAPTURES[activeIdx];

  const headerOp = interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoom = interpolate(frame, [0, 12 * fps], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={active.color} size={600} style={{ top: "30%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.1 }} />

      <div style={{ padding: "60px 110px", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ opacity: headerOp }}>
          <SectionHeader label="07 / Evidencia" title="Documentación y diagramas" subtitle="Entregables verificables: diseño, arquitectura y especificación completa." color={COLORS.cyan} />
        </div>

        <div style={{ flex: 1, display: "flex", gap: 40, alignItems: "center" }}>
          {/* Screenshot principal */}
          <div style={{ flex: 1.4, position: "relative", alignSelf: "stretch" }}>
            {CAPTURES.map((cap, i) => (
              <div
                key={cap.src}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: i === activeIdx ? interpolate(frame % (3.2 * fps), [0, 0.3 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0,
                }}
              >
                <ScreenshotFrame src={cap.src} title={`frontier-labs-reto.vercel.app/${cap.src}`} scale={cap.scale * zoom} focusY={cap.focusY} />
              </div>
            ))}
          </div>

          {/* Lista de capturas */}
          <div style={{ flex: 0.7, display: "flex", flexDirection: "column", gap: 16 }}>
            {CAPTURES.map((cap, i) => {
              const isActive = i === activeIdx;
              const op = interpolate(frame, [(0.3 + i * 0.3) * fps, (0.3 + i * 0.3 + 0.4) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={cap.src} style={{ opacity: op }}>
                  <div
                    style={{
                      backgroundColor: isActive ? `${cap.color}12` : COLORS.bgCard,
                      border: `2px solid ${isActive ? cap.color : COLORS.border}`,
                      borderRadius: 16,
                      padding: "22px 26px",
                      transform: `scale(${isActive ? 1.02 : 1})`,
                    }}
                  >
                    <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: cap.color, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 8 }}>
                      {cap.tag}
                    </div>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 24, fontWeight: 700, color: isActive ? COLORS.text : COLORS.textMuted, lineHeight: 1.25 }}>
                      {cap.title}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
              {CAPTURES.map((_, i) => (
                <div key={i} style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: i === activeIdx ? active.color : COLORS.border, opacity: i === activeIdx ? 1 : 0.5 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
