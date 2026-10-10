/**
 * ESCENA 9: Cierre
 * Logo, links y tagline final
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, FONTS, GlowOrb, GridBg } from "./DesignSystem";

export const SceneCierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleY = interpolate(frame, [0, 1.2 * fps], [40, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contentOp = interpolate(frame, [0.8 * fps, 1.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: fadeIn }}>
      <GridBg opacity={0.03} />
      <GlowOrb color={COLORS.cyan} size={400} style={{ top: "10%", left: "20%", opacity: 0.1 }} />
      <GlowOrb color={COLORS.purple} size={350} style={{ bottom: "10%", right: "15%", opacity: 0.08 }} />

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", padding: "0 100px" }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${COLORS.cyan}20, ${COLORS.purple}20)`, border: `1.5px solid ${COLORS.cyan}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 28, boxShadow: `0 0 60px ${COLORS.cyan}18` }}>
          🔲
        </div>

        <div style={{ transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <h2 style={{ fontFamily: FONTS.display, fontSize: 60, fontWeight: 700, color: COLORS.text, margin: 0, lineHeight: 1.15 }}>
            La{" "}
            <span style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Caja Negra
            </span>
          </h2>
          <p style={{ fontFamily: FONTS.sans, fontSize: 22, color: COLORS.textMuted, marginTop: 14 }}>
            Reto 2 · Frontier Labs · 2024
          </p>
        </div>

        <div style={{ opacity: contentOp, marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "github.com/AndreSierraM/frontier_labs_reto", icon: "🔗" },
              { label: "frontier-labs-reto.vercel.app", icon: "🚀" },
            ].map((link) => (
              <div key={link.label} style={{ padding: "12px 22px", borderRadius: 10, backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, fontSize: 13 }}>
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: "16px 32px", borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.cyan}08, ${COLORS.purple}08)`, border: `1px solid ${COLORS.cyan}15`, textAlign: "center" }}>
            <p style={{ fontFamily: FONTS.sans, fontSize: 16, color: COLORS.textMuted, margin: 0 }}>
              Máquina de estados · Vigilancia autónoma · Enjambre de agentes
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
