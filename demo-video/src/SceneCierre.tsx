import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg } from "./DesignSystem";
import { Icon, IconName } from "./Icons";

export const SceneCierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = interpolate(frame, [0, 1.2 * fps], [50, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contentOp = interpolate(frame, [0.6 * fps, 1.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.03} />
      <GlowOrb color={COLORS.cyan} size={550} style={{ top: "5%", left: "18%", opacity: 0.15 }} />
      <GlowOrb color={COLORS.purple} size={480} style={{ bottom: "5%", right: "12%", opacity: 0.12 }} />

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", padding: "0 110px" }}>
        <div style={{ width: 96, height: 96, borderRadius: 24, background: `linear-gradient(135deg, ${COLORS.cyan}25, ${COLORS.purple}25)`, border: `2px solid ${COLORS.cyan}35`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36, boxShadow: `0 0 80px ${COLORS.cyan}20` }}>
          <Icon name="box" size={48} color={COLORS.cyan} strokeWidth={1.6} />
        </div>

        <div style={{ transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <h2 style={{ fontFamily: FONTS.display, fontSize: 96, fontWeight: 800, color: COLORS.text, margin: 0, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            La{" "}
            <span style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Caja Negra
            </span>
          </h2>
          <p style={{ fontFamily: FONTS.sans, fontSize: 30, color: COLORS.textMuted, marginTop: 18 }}>
            Reto 2 · Frontier Labs · 2024
          </p>
        </div>

        <div style={{ opacity: contentOp, marginTop: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 22, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.cyan }}>
            Ver código y demo
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "github.com/AndreSierraM/frontier_labs_reto", icon: "link" as IconName },
              { label: "frontier-labs-reto.vercel.app", icon: "rocket" as IconName },
            ].map((link) => (
              <div key={link.label} style={{ padding: "18px 30px", borderRadius: 12, backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.borderHighlight}`, display: "flex", alignItems: "center", gap: 14, color: COLORS.text, fontFamily: FONTS.mono, fontSize: 21 }}>
                <Icon name={link.icon} size={24} color={COLORS.cyan} />
                <span>{link.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, padding: "20px 40px", borderRadius: 14, background: `linear-gradient(135deg, ${COLORS.cyan}0c, ${COLORS.purple}0c)`, border: `1px solid ${COLORS.cyan}20`, textAlign: "center" }}>
            <p style={{ fontFamily: FONTS.sans, fontSize: 21, color: COLORS.textMuted, margin: 0 }}>
              Máquina de estados · Vigilancia autónoma · Enjambre de agentes
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
