import React from "react";
import { COLORS, FONTS } from "./DesignSystem";

const KEYWORDS = new Set([
  "function", "const", "let", "var", "return", "if", "else", "switch", "case", "break",
  "default", "new", "for", "of", "in", "async", "await", "throw", "try", "catch",
  "typeof", "instanceof", "class", "extends", "null", "undefined", "true", "false", "this",
]);

const GLOBALS = new Set(["Map", "String", "Number", "Array", "Object", "JSON", "Boolean", "Promise", "RegExp", "Buffer", "Math", "process"]);

const TOKEN_COLORS: Record<string, string> = {
  comment: "#5b6b82",
  string: "#34d399",
  keyword: "#c084fc",
  number: "#f59e0b",
  global: "#60a5fa",
  method: "#4de8ff",
  fncall: "#fbbf24",
  property: "#93b4d4",
  plain: "#cbd5e1",
  punctuation: "#64748b",
};

type Token = { text: string; type: keyof typeof TOKEN_COLORS };

// Tokenizer simple de JavaScript suficiente para resaltar el código del proyecto.
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const push = (text: string, type: Token["type"]) => {
    if (text) tokens.push({ text, type });
  };

  while (i < line.length) {
    const rest = line.slice(i);

    // Comentario de línea
    if (rest.startsWith("//")) {
      push(rest, "comment");
      break;
    }

    // String
    const strMatch = rest.match(/^("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)/);
    if (strMatch) {
      push(strMatch[0], "string");
      i += strMatch[0].length;
      continue;
    }

    // Número
    const numMatch = rest.match(/^\d+(\.\d+)?/);
    if (numMatch) {
      push(numMatch[0], "number");
      i += numMatch[0].length;
      continue;
    }

    // Identificador
    const idMatch = rest.match(/^[A-Za-z_$][\w$]*/);
    if (idMatch) {
      const word = idMatch[0];
      const after = line.slice(i + word.length);
      const before = line.slice(0, i).trimEnd();

      let type: Token["type"] = "plain";
      if (KEYWORDS.has(word)) type = "keyword";
      else if (GLOBALS.has(word)) type = "global";
      else if (/^\s*\(/.test(after)) type = "fncall";
      else if (before.endsWith(".")) type = "method";
      else if (/^\s*:/.test(after)) type = "property";

      push(word, type);
      i += word.length;
      continue;
    }

    // Punctuation
    const punctMatch = rest.match(/^[{}()[\];,.=<>+\-*/%!&|?:]+/);
    if (punctMatch) {
      push(punctMatch[0], "punctuation");
      i += punctMatch[0].length;
      continue;
    }

    // Espacios u otros
    const otherMatch = rest.match(/^\s+/);
    if (otherMatch) {
      push(otherMatch[0], "plain");
      i += otherMatch[0].length;
      continue;
    }

    push(rest[0], "plain");
    i += 1;
  }

  return tokens;
}

interface CodeHighlightProps {
  code: string;
  language?: string;
  highlightLines?: number[];
  fontSize?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
}

/**
 * Bloque de código con resaltado de sintaxis real (tokenizer JS) y líneas resaltadas.
 */
export const CodeHighlight: React.FC<CodeHighlightProps> = ({ code, language = "js", highlightLines = [], fontSize = 17, lineHeight = 27, style }) => {
  const lines = code.split("\n");

  return (
    <div
      style={{
        backgroundColor: "#0b0d14",
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${COLORS.borderHighlight}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        ...style,
      }}
    >
      <div style={{ padding: "13px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0e1017" }}>
        <span style={{ color: COLORS.textDim, fontFamily: FONTS.mono, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>{language}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ef4444", opacity: 0.7 }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#f59e0b", opacity: 0.7 }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#10b981", opacity: 0.7 }} />
        </div>
      </div>
      <div style={{ padding: "16px 0" }}>
        {lines.map((line, idx) => {
          const isHl = highlightLines.includes(idx);
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                backgroundColor: isHl ? "rgba(0,212,255,0.07)" : "transparent",
                borderLeft: `3px solid ${isHl ? COLORS.cyan : "transparent"}`,
                paddingRight: 24,
              }}
            >
              <span style={{ color: "#3a4459", fontFamily: FONTS.mono, fontSize: fontSize - 2, width: 46, flexShrink: 0, textAlign: "right", marginRight: 18, lineHeight: `${lineHeight}px`, userSelect: "none" }}>
                {idx + 1}
              </span>
              <span style={{ fontFamily: FONTS.mono, fontSize, lineHeight: `${lineHeight}px`, whiteSpace: "pre" }}>
                {tokenizeLine(line).map((tok, ti) => (
                  <span key={ti} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
                ))}
                {line === "" ? " " : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};