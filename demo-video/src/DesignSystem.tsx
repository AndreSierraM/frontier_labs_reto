/**
 * Sistema de diseño premium — La Caja Negra
 */
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const COLORS = {
  bg: "#080a0f",
  bgElevated: "#0f111a",
  bgCard: "#131520",
  bgCode: "#0d0f16",
  border: "#1e2130",
  borderHighlight: "#2a2e45",
  cyan: "#00d4ff",
  cyanBright: "#4de8ff",
  purple: "#a855f7",
  purpleBright: "#c084fc",
  green: "#10b981",
  greenBright: "#34d399",
  red: "#ef4444",
  redDim: "#f87171",
  yellow: "#f59e0b",
  orange: "#f97316",
  blue: "#3b82f6",
  pink: "#ec4899",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  textDark: "#475569",
};

export const FONTS = {
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  sans: "'Inter', system-ui, sans-serif",
  display: "'Space Grotesk', 'Inter', sans-serif",
};

export const GridBg: React.FC<{ opacity?: number }> = ({ opacity = 0.03 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `linear-gradient(rgba(0,212,255,${opacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,${opacity}) 1px, transparent 1px)`,
      backgroundSize: "50px 50px",
      pointerEvents: "none",
    }}
  />
);

export const GlowOrb: React.FC<{ color?: string; size?: number; style?: React.CSSProperties }> = ({ color = COLORS.cyan, size = 400, style }) => (
  <div
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color}20 0%, transparent 65%)`,
      filter: "blur(60px)",
      pointerEvents: "none",
      ...style,
    }}
  />
);

export const SectionHeader: React.FC<{ label: string; title: string; subtitle?: string; color?: string }> = ({ label, title, subtitle, color = COLORS.cyan }) => (
  <div style={{ marginBottom: 40 }}>
    <span style={{ fontFamily: FONTS.mono, fontSize: 13, color, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 16 }}>
      {label}
    </span>
    <h2 style={{ fontFamily: FONTS.display, fontSize: 52, fontWeight: 700, color: COLORS.text, margin: 0, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
      {title}
    </h2>
    {subtitle && <p style={{ fontFamily: FONTS.sans, fontSize: 20, color: COLORS.textMuted, marginTop: 12, lineHeight: 1.6 }}>{subtitle}</p>}
  </div>
);

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: "cyan" | "purple" | "green" | "red" | "yellow" | "orange" | "blue" | "none";
  padding?: number | string;
}

export const Card: React.FC<CardProps> = ({ children, style, glow = "none", padding = 24 }) => {
  const glowMap: Record<string, string> = {
    cyan: `0 0 60px ${COLORS.cyan}15, inset 0 1px 0 ${COLORS.cyan}15`,
    purple: `0 0 60px ${COLORS.purple}15, inset 0 1px 0 ${COLORS.purple}15`,
    green: `0 0 60px ${COLORS.green}15, inset 0 1px 0 ${COLORS.green}15`,
    red: `0 0 60px ${COLORS.red}15, inset 0 1px 0 ${COLORS.red}15`,
    yellow: `0 0 60px ${COLORS.yellow}15, inset 0 1px 0 ${COLORS.yellow}15`,
    orange: `0 0 60px ${COLORS.orange}15, inset 0 1px 0 ${COLORS.orange}15`,
    blue: `0 0 60px ${COLORS.blue}15, inset 0 1px 0 ${COLORS.blue}15`,
    none: "none",
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: typeof padding === "number" ? `${padding}px` : padding,
        boxShadow: glowMap[glow],
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface CodeBlockProps {
  code: string;
  language?: string;
  style?: React.CSSProperties;
  highlightLines?: number[];
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = "js", style, highlightLines = [] }) => {
  const lines = useMemo(() => code.split("\n"), [code]);

  return (
    <div
      style={{
        backgroundColor: COLORS.bgCode,
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        ...style,
      }}
    >
      {language && (
        <div
          style={{
            padding: "10px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: COLORS.textDim, fontFamily: FONTS.mono, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            {language}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.red, opacity: 0.5 }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.yellow, opacity: 0.5 }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.green, opacity: 0.5 }} />
          </div>
        </div>
      )}
      <div style={{ padding: "16px 0" }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              backgroundColor: highlightLines.includes(i) ? "rgba(0,212,255,0.06)" : "transparent",
              padding: "0 20px",
            }}
          >
            <span style={{ color: COLORS.textDark, fontFamily: FONTS.mono, fontSize: 13, width: 36, flexShrink: 0, textAlign: "right", marginRight: 16, userSelect: "none" }}>
              {i + 1}
            </span>
            <span style={{ color: COLORS.textMuted, fontFamily: FONTS.mono, fontSize: 13, whiteSpace: "pre", lineHeight: "22px" }}>{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  color?: "cyan" | "purple" | "green" | "red" | "yellow" | "orange" | "blue" | "pink";
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ children, color = "cyan", style }) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    cyan: { bg: "rgba(0,212,255,0.08)", text: COLORS.cyan, border: "rgba(0,212,255,0.2)" },
    purple: { bg: "rgba(168,85,247,0.08)", text: COLORS.purple, border: "rgba(168,85,247,0.2)" },
    green: { bg: "rgba(16,185,129,0.08)", text: COLORS.green, border: "rgba(16,185,129,0.2)" },
    red: { bg: "rgba(239,68,68,0.08)", text: COLORS.red, border: "rgba(239,68,68,0.2)" },
    yellow: { bg: "rgba(245,158,11,0.08)", text: COLORS.yellow, border: "rgba(245,158,11,0.2)" },
    orange: { bg: "rgba(249,115,22,0.08)", text: COLORS.orange, border: "rgba(249,115,22,0.2)" },
    blue: { bg: "rgba(59,130,246,0.08)", text: COLORS.blue, border: "rgba(59,130,246,0.2)" },
    pink: { bg: "rgba(236,72,153,0.08)", text: COLORS.pink, border: "rgba(236,72,153,0.2)" },
  };
  const c = colorMap[color];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 8,
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontFamily: FONTS.mono,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

interface TerminalProps {
  lines: { text: string; color?: string; prefix?: string; type?: "cmd" | "output" | "comment" | "error" }[];
  style?: React.CSSProperties;
  title?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ lines, style, title = "bash" }) => {
  const getColor = (type?: string, color?: string) => {
    if (color) return color;
    switch (type) {
      case "cmd": return COLORS.cyan;
      case "error": return COLORS.red;
      case "comment": return COLORS.textDim;
      case "output": return COLORS.textMuted;
      default: return COLORS.textMuted;
    }
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.bgCode,
        borderRadius: 14,
        overflow: "hidden",
        fontFamily: FONTS.mono,
        fontSize: 13,
        border: `1px solid ${COLORS.border}`,
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: "#11131f",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.red, opacity: 0.5 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.yellow, opacity: 0.5 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.green, opacity: 0.5 }} />
        </div>
        <span style={{ marginLeft: 8, color: COLORS.textDim, fontSize: 12 }}>{title}</span>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ color: getColor(line.type, line.color), marginBottom: 3, display: "flex", gap: 8 }}>
            {line.prefix && <span style={{ color: COLORS.cyan, userSelect: "none", opacity: 0.7 }}>{line.prefix}</span>}
            <span style={{ lineHeight: "20px" }}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
