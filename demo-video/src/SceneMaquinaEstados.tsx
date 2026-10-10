import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONTS, CodeBlock, Card, Badge, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";

export const SceneMaquinaEstados: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phase = Math.floor(frame / (fps * 2.2));
  const highlightMap: Record<number, number[]> = { 0: [0, 1, 2, 3], 1: [6, 7, 8, 9, 10], 2: [13, 14, 15, 16, 17], 3: [19, 20, 21, 22] };
  const hl = highlightMap[phase % 4] || [];

  const c1op = interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const c2op = interpolate(frame, [1 * fps, 1.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sidebarOp = interpolate(frame, [1.5 * fps, 2.5 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: Math.min(fadeIn, fadeOut) }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.purple} size={400} style={{ top: "20%", left: "5%", opacity: 0.1 }} />

      <div style={{ padding: "60px 100px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="03 / Dominio Puro" title="Máquina de estados sin E/S" subtitle="Todo el comportamiento en domain.js — testeable, portable y puramente funcional." color={COLORS.purple} />

        <div style={{ flex: 1, display: "flex", gap: 28 }}>
          <div style={{ flex: 1.3, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ opacity: c1op }}>
              <CodeBlock
                language="domain.js"
                highlightLines={hl}
                code={`function freshState() {
  return {
    cuentas: new Map(),
    operaciones: new Map(),
    nextCuenta: 1,
    nextOperacion: 1,
  };
}

function control(cuerpo) {
  // ISO 7064 MOD 97-10
  let r = 0;
  for (const d of digitos(cuerpo))
    r = (r * 10 + Number(d)) % 97;
  return String(98 - ((r * 100) % 97));
}

function processMessage(state, msg) {
  const [cmd, ...args] = msg.split("|");
  const guard = checkArity(cmd, args) 
    || checkMonto(args) 
    || checkCuenta(state, args);
  if (guard) return guard;
  return ejecutar(state, cmd, args);
}`}
              />
            </div>
            <div style={{ opacity: c2op }}>
              <CodeBlock
                language="protocolo"
                code={`// Mensajes (m)
"PING"                    → { ok: true }
"ALTA|{nombre}"           → { cuenta: "AC-0001" }
"CONSULTA|{id}"           → { saldo, ops[] }
"DEPOSITO|{id}|{monto}"   → { saldo }
"TRANSFER|{o}|{d}|{m}"    → { id: "OP-0001" }
"ANULA|{opId}"            → { anulada: true }

// Errores: 23 códigos documentados
E100 json·inválido    E101 body·grande    E506 límite·excedido
E301 comando·desc.    E304 orig=dst        E507 saldo·insuf.
E401 cuenta·no·ex.    E510 bloqueada       ...`}
              />
            </div>
          </div>

          <div style={{ flex: 0.7, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ opacity: sidebarOp }}>
              <Card>
                <h3 style={{ fontFamily: FONTS.sans, fontSize: 16, fontWeight: 700, color: COLORS.text, margin: "0 0 14px 0", paddingBottom: 12, borderBottom: `1px solid ${COLORS.border}` }}>Principios</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Badge color="cyan">Sin dependencias HTTP</Badge>
                  <Badge color="purple">100% testeable en proceso</Badge>
                  <Badge color="green">Reutilizable por adaptador</Badge>
                  <Badge color="yellow">ISO 7064 MOD 97-10</Badge>
                  <Badge color="cyan">Levenshtein sugerencias</Badge>
                </div>
              </Card>
            </div>

            <div style={{ opacity: sidebarOp }}>
              <Card>
                <h3 style={{ fontFamily: FONTS.sans, fontSize: 16, fontWeight: 700, color: COLORS.text, margin: "0 0 14px 0", paddingBottom: 12, borderBottom: `1px solid ${COLORS.border}` }}>Estado</h3>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.9 }}>
                  <div><span style={{ color: COLORS.cyan }}>cuentas</span>: Map&lt;id, …&gt;</div>
                  <div><span style={{ color: COLORS.purple }}>operaciones</span>: Map&lt;id, …&gt;</div>
                  <div><span style={{ color: COLORS.green }}>nextCuenta</span>: 1, 2, 3…</div>
                  <div><span style={{ color: COLORS.yellow }}>nextOperacion</span>: 1, 2, 3…</div>
                </div>
              </Card>
            </div>

            <div style={{ opacity: sidebarOp, marginTop: "auto" }}>
              <Card glow="green" padding="18px">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 28 }}>✅</div>
                  <div>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700, color: COLORS.green }}>21 tests · 116 validaciones</div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>100% cobertura del dominio</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
