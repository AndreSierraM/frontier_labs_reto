import React from "react";
import { Img, staticFile } from "remotion";

export type LogoName = "node" | "postgres" | "vercel" | "gactions" | "github" | "neon" | "openrouter" | "lab" | "http" | "json" | "user" | "monitor" | "agents";

const LOGO_FILES: Partial<Record<LogoName, string>> = {
  node: "logos/nodedotjs.svg",
  postgres: "logos/postgresql.svg",
  vercel: "logos/vercel.svg",
  gactions: "logos/githubactions.svg",
  github: "logos/github.svg",
  neon: "logos/neon.svg",
  openrouter: "logos/openrouter.svg",
};

export const hasLogoFile = (name: LogoName): boolean => name in LOGO_FILES;

interface TechLogoProps {
  name: LogoName;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Renderiza un logo técnico real (SVG de simple-icons) o un glifo SVG inline
 * para los conceptos sin marca.
 */
export const TechLogo: React.FC<TechLogoProps> = ({ name, size = 40, color = "#fff", style }) => {
  if (LOGO_FILES[name]) {
    return (
      <Img
        src={staticFile(LOGO_FILES[name]!)}
        style={{ width: size, height: size, objectFit: "contain", ...style }}
      />
    );
  }

  // Glifos SVG inline para conceptos sin logo de marca
  const stroke = color;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, style };

  switch (name) {
    case "http":
      return (
        <svg {...common}>
          <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />
        </svg>
      );
    case "json":
      return (
        <svg {...common}>
          <path d="M8 4c-2 0-3 1-3 3v1c0 1-.8 2-2 2 1.2 0 2 1 2 2v3c0 2 1 3 3 3" />
          <path d="M16 4c2 0 3 1 3 3v1c0 1 .8 2 2 2-1.2 0-2 1-2 2v3c0 2-1 3-3 3" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        </svg>
      );
    case "lab":
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
          <path d="M7.5 15h9" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="M7 11l3 3 4-5 3 3" />
        </svg>
      );
    case "agents":
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="5" cy="18" r="2.5" />
          <circle cx="19" cy="18" r="2.5" />
          <path d="M12 7.5v3M10.5 12L6.5 16M13.5 12l4 4" />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Caja de nodo con logo + título + subtítulo. Usada en diagramas.
 */
interface LogoNodeProps {
  logo: LogoName;
  title: string;
  subtitle?: string;
  color: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  logoSize?: number;
  titleSize?: number;
  subSize?: number;
}

export const LogoNode: React.FC<LogoNodeProps> = ({ logo, title, subtitle, color, width = 200, height, style, logoSize = 40, titleSize = 17, subSize = 12 }) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "#11131f",
        border: `1.5px solid ${color}50`,
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxShadow: `0 10px 30px ${color}12`,
        ...style,
      }}
    >
      <TechLogo name={logo} size={logoSize} color={color} />
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: titleSize, fontWeight: 700, color: "#f8fafc", textAlign: "center", lineHeight: 1.2 }}>{title}</div>
      {subtitle && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: subSize, color: "#6b7a90", textAlign: "center", lineHeight: 1.3 }}>{subtitle}</div>}
    </div>
  );
};