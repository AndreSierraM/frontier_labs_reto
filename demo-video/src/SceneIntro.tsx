import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg } from "./DesignSystem";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", opacity: fadeOut }}>
      <GridBg opacity={0.025} />
      <GlowOrb color={COLORS.cyan} size={500} style={{ top: "5%", left: "15%", opacity: 0.15 }} />
      <GlowOrb color={COLORS.purple} size={450} style={{ bottom: "5%", right: "10%", opacity: 0.12 }} />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{
          opacity: interpolate(frame, [0, fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          marginBottom: 32,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: `linear-gradient(135deg, ${COLORS.cyan}20, ${COLORS.purple}20)`,
            border: `1.5px solid ${COLORS.cyan}30`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto", boxShadow: `0 0 80px ${COLORS.cyan}15`,
          }}>🔲</div>
        </div>

        <div style={{
          transform: `translateY(${interpolate(frame, [0, 1.5 * fps], [50, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          opacity: interpolate(frame, [0, fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 88, fontWeight: 800, color: COLORS.text, margin: 0, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            La <span style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Caja Negra</span>
          </h1>
        </div>

        <div style={{
          transform: `translateY(${interpolate(frame, [0.5 * fps, 1.5 * fps], [30, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          opacity: interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          marginTop: 20,
        }}>
          <p style={{ fontFamily: FONTS.sans, fontSize: 28, color: COLORS.textMuted, margin: 0 }}>Reto 2 · Frontier Labs</p>
        </div>

        <div style={{
          opacity: interpolate(frame, [1 * fps, 2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          marginTop: 48, display: "flex", gap: 12, justifyContent: "center",
        }}>
          {["Máquina de Estados", "Vigilancia Autónoma", "Enjambre de Agentes"].map((tag, i) => (
            <div key={tag} style={{
              padding: "10px 22px", borderRadius: 10,
              backgroundColor: i === 0 ? `${COLORS.cyan}08` : i === 1 ? `${COLORS.purple}08` : `${COLORS.green}08`,
              border: `1px solid ${i === 0 ? COLORS.cyan : i === 1 ? COLORS.purple : COLORS.green}22`,
              color: i === 0 ? COLORS.cyan : i === 1 ? COLORS.purple : COLORS.green,
              fontFamily: FONTS.mono, fontSize: 13, fontWeight: 600, letterSpacing: "0.03em",
            }}>{tag}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
