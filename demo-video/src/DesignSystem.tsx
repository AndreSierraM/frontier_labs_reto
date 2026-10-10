/**
 * Sistema de diseño premium — La Caja Negra
 * Tipografía grande, componentes y animaciones reutilizables
 */
import React, { useMemo } from "react";
import { Img, staticFile } from "remotion";

export const COLORS = {
  bg: "#f7f7f2",
  bgElevated: "#eeefe9",
  bgCard: "#ffffff",
  bgCode: "#f1f4f1",
  border: "#dde3dc",
  borderHighlight: "#c5d2ca",
  cyan: "#326c75",
  cyanBright: "#397582",
  purple: "#786493",
  purpleBright: "#806995",
  green: "#42745c",
  greenBright: "#3b725c",
  red: "#a35f65",
  redDim: "#a8666b",
  yellow: "#8b6c35",
  orange: "#9b654b",
  blue: "#536f96",
  pink: "#94667d",
  text: "#273a35",
  textMuted: "#52645e",
  textDim: "#62746c",
  textDark: "#7c8982",
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
      backgroundImage: `radial-gradient(ellipse at 4% 6%, #dceee780, transparent 55%), radial-gradient(ellipse at 96% 94%, #ede4f380, transparent 55%), linear-gradient(rgba(50,108,117,${opacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(50,108,117,${opacity}) 1px, transparent 1px)`,
      backgroundSize: "100% 100%, 100% 100%, 60px 60px, 60px 60px",
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
      background: `radial-gradient(circle, ${color}25 0%, transparent 65%)`,
      filter: "blur(70px)",
      pointerEvents: "none",
      ...style,
    }}
  />
);

export const SectionHeader: React.FC<{ label: string; title: string; subtitle?: string; color?: string }> = ({ label, title, subtitle, color = COLORS.cyan }) => (
  <div style={{ marginBottom: 32, flexShrink: 0 }}>
    <span style={{ fontFamily: FONTS.mono, fontSize: 17, color, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 18 }}>
      {label}
    </span>
    <h2 style={{ fontFamily: FONTS.display, fontSize: 60, fontWeight: 700, color: COLORS.text, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
      {title}
    </h2>
    {subtitle && <p style={{ fontFamily: FONTS.sans, fontSize: 25, color: COLORS.textMuted, margin: "12px 0 0", lineHeight: 1.5, maxWidth: 1600 }}>{subtitle}</p>}
  </div>
);

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: "cyan" | "purple" | "green" | "red" | "yellow" | "orange" | "blue" | "none";
  padding?: number | string;
}

export const Card: React.FC<CardProps> = ({ children, style, glow = "none", padding = 28 }) => {
  const glowMap: Record<string, string> = {
    cyan: `0 0 70px ${COLORS.cyan}18, inset 0 1px 0 ${COLORS.cyan}15`,
    purple: `0 0 70px ${COLORS.purple}18, inset 0 1px 0 ${COLORS.purple}15`,
    green: `0 0 70px ${COLORS.green}18, inset 0 1px 0 ${COLORS.green}15`,
    red: `0 0 70px ${COLORS.red}18, inset 0 1px 0 ${COLORS.red}15`,
    yellow: `0 0 70px ${COLORS.yellow}18, inset 0 1px 0 ${COLORS.yellow}15`,
    orange: `0 0 70px ${COLORS.orange}18, inset 0 1px 0 ${COLORS.orange}15`,
    blue: `0 0 70px ${COLORS.blue}18, inset 0 1px 0 ${COLORS.blue}15`,
    none: "none",
  };

  return (
    <div
      style={{
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        padding: typeof padding === "number" ? `${padding}px` : padding,
        boxShadow: glow === "none" ? "0 8px 24px #273a3506" : glowMap[glow],
        backgroundImage: glow === "none" ? undefined : `linear-gradient(125deg, ${COLORS[glow]}12, transparent 75%)`,
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
  from?: number;
  durationInFrames?: number;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = "js", style, highlightLines = [] }) => {
  const lines = useMemo(() => code.split("\n"), [code]);

  return (
    <div
      style={{
        backgroundColor: COLORS.bgCode,
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        ...style,
      }}
    >
      {language && (
        <div
          style={{
            padding: "12px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: COLORS.textDim, fontFamily: FONTS.mono, fontSize: 15, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
            {language}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.red, opacity: 0.6 }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.yellow, opacity: 0.6 }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.green, opacity: 0.6 }} />
          </div>
        </div>
      )}
      <div style={{ padding: "18px 0" }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              backgroundColor: highlightLines.includes(i) ? `${COLORS.cyan}12` : "transparent",
              borderLeft: highlightLines.includes(i) ? `3px solid ${COLORS.cyan}` : "3px solid transparent",
              padding: "0 24px",
            }}
          >
            <span style={{ color: COLORS.textDark, fontFamily: FONTS.mono, fontSize: 16, width: 40, flexShrink: 0, textAlign: "right", marginRight: 20, userSelect: "none" }}>
              {i + 1}
            </span>
            <span style={{ color: COLORS.textMuted, fontFamily: FONTS.mono, fontSize: 16, whiteSpace: "pre", lineHeight: "26px" }}>{line || " "}</span>
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
  const c = COLORS[color];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 16px",
        borderRadius: 10,
        backgroundColor: `${c}12`,
        color: c,
        border: `1px solid ${c}30`,
        fontFamily: FONTS.mono,
        fontSize: 15,
        fontWeight: 600,
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
        borderRadius: 16,
        overflow: "hidden",
        fontFamily: FONTS.mono,
        fontSize: 18,
        border: `1px solid ${COLORS.border}`,
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.bgElevated,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.red, opacity: 0.6 }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.yellow, opacity: 0.6 }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.green, opacity: 0.6 }} />
        </div>
        <span style={{ marginLeft: 10, color: COLORS.textDim, fontSize: 15 }}>{title}</span>
      </div>
      <div style={{ padding: "18px 24px" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ color: getColor(line.type, line.color), marginBottom: 4, display: "flex", gap: 10 }}>
            {line.prefix && <span style={{ color: COLORS.cyan, userSelect: "none", opacity: 0.8 }}>{line.prefix}</span>}
            <span style={{ lineHeight: "24px" }}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Ventana de captura de pantalla con marco de navegador
 */
interface ScreenshotFrameProps {
  src: string;
  title?: string;
  style?: React.CSSProperties;
  scale?: number;
  focusX?: number;
  focusY?: number;
}

export const ScreenshotFrame: React.FC<ScreenshotFrameProps> = ({ src, title = "localhost", style, scale = 1, focusX = 50, focusY = 0 }) => {
  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${COLORS.borderHighlight}`,
        backgroundColor: COLORS.bgCard,
        boxShadow: "0 14px 36px #273a3510",
        ...style,
      }}
    >
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.red, opacity: 0.7 }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.yellow, opacity: 0.7 }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.green, opacity: 0.7 }} />
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ backgroundColor: COLORS.bgCode, borderRadius: 6, padding: "4px 16px", fontFamily: FONTS.mono, fontSize: 13, color: COLORS.textDim }}>
            {title}
          </div>
        </div>
      </div>
      <div style={{ overflow: "hidden", position: "relative" }}>
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            display: "block",
            transform: `scale(${scale})`,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * Número grande animado con label
 */
export const BigMetric: React.FC<{ value: string; label: string; color: string; icon?: React.ReactNode }> = ({ value, label, color, icon }) => {
  return (
    <Card glow="none" padding="28px" style={{ textAlign: "center" }}>
      {icon && <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>{icon}</div>}
      <div style={{ fontFamily: FONTS.display, fontSize: 54, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontFamily: FONTS.sans, fontSize: 17, color: COLORS.textMuted, marginTop: 10 }}>{label}</div>
    </Card>
  );
};

/**
 * Línea de flujo horizontal con flecha
 */
export const FlowArrow: React.FC<{ color?: string; width?: number; label?: string; opacity?: number }> = ({ color = COLORS.textDim, width = 60, label, opacity = 0.6 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity }}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ width, height: 2, backgroundColor: color }} />
      <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `9px solid ${color}` }} />
    </div>
    {label && <span style={{ fontFamily: FONTS.mono, fontSize: 13, color }}>{label}</span>}
  </div>
);
