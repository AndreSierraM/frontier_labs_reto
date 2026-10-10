import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg } from "./DesignSystem";
import { Icon } from "./Icons";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = interpolate(frame, [0, 1.5 * fps], [60, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [0, fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [0.5 * fps, 1.5 * fps], [40, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagAnim = (index: number) => ({
    y: interpolate(frame, [(1 + index * 0.18) * fps, (1.45 + index * 0.18) * fps], [20, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [(1 + index * 0.18) * fps, (1.35 + index * 0.18) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <GridBg opacity={0.03} />
      <GlowOrb color={COLORS.cyan} size={600} style={{ top: "2%", left: "18%", opacity: 0.18 }} />
      <GlowOrb color={COLORS.purple} size={520} style={{ bottom: "2%", right: "12%", opacity: 0.15 }} />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ opacity: titleOp, marginBottom: 36 }}>
          <div style={{
            width: 96, height: 96, borderRadius: 24,
            background: `linear-gradient(135deg, ${COLORS.cyan}25, ${COLORS.purple}25)`,
            border: `2px solid ${COLORS.cyan}35`, display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto", boxShadow: `0 0 100px ${COLORS.cyan}20`,
          }}><Icon name="box" size={48} color={COLORS.cyan} strokeWidth={1.6} /></div>
        </div>

        <div style={{ transform: `translateY(${titleY}px)`, opacity: titleOp }}>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 128, fontWeight: 800, color: COLORS.text, margin: 0, letterSpacing: "-0.04em", lineHeight: 1 }}>
            La <span style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Caja Negra</span>
          </h1>
        </div>

        <div style={{ transform: `translateY(${subY}px)`, opacity: subOp, marginTop: 28 }}>
          <p style={{ fontFamily: FONTS.sans, fontSize: 38, color: COLORS.textMuted, margin: 0, fontWeight: 400 }}>Reto 2 · Implementación y validación</p>
        </div>

        <div style={{ marginTop: 56, display: "flex", gap: 16, justifyContent: "center" }}>
          {[
            { t: "Reemplazo HTTP", c: COLORS.cyan },
            { t: "Pruebas y evidencia", c: COLORS.purple },
            { t: "Orquestación de agentes", c: COLORS.green },
          ].map((tag, index) => {
            const anim = tagAnim(index);
            return <div key={tag.t} style={{
              opacity: anim.o, transform: `translateY(${anim.y}px)`,
              padding: "14px 28px", borderRadius: 12,
              backgroundColor: `${tag.c}0e`, border: `1.5px solid ${tag.c}30`,
              color: tag.c, fontFamily: FONTS.mono, fontSize: 18, fontWeight: 700, letterSpacing: "0.02em",
            }}>{tag.t}</div>;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
