import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, Card, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";
import { CodeHighlight } from "./CodeHighlight";

const CODE = `function processMessage(state, m) {
  // 1 · separar cuerpo y dígito de control
  const idx = m.lastIndexOf(";");
  const body = m.slice(0, idx);
  const controlStr = m.slice(idx + 1);
  // 2 · guardas de forma
  const segs = m.split(";");
  if (segs.some((s) => s === "")) return { code: "E104" };
  const cmd = segs[0].toUpperCase();
  // 3 · verificar control ISO 7064 MOD 97-10
  if (cmd !== "PING") {
    if (!/^[0-9]{1,2}$/.test(controlStr)) return { code: "E201" };
    if (controlStr !== control(body)) return { code: "E202" };
  }
  // 4 · despachar y mutar el estado
  switch (cmd) {
    case "DEPOSITO": {
      const c = state.cuentas.get(segs[1]);
      if (!c) return { code: "E401" };
      c.saldo += Number(segs[2]);
      c.fallos = 0;
      return { ok: { status: "recieved" } };
    }
  }
}`;

const STAGES = [
  { lines: [1, 2, 3, 4], title: "Separar cuerpo y control", desc: "El último ; divide el mensaje en cuerpo y dígito verificador.", detail: "m.lastIndexOf(';')", color: COLORS.cyan },
  { lines: [5, 6, 7, 8], title: "Guardas de forma", desc: "Segmento vacío → E104. El comando se normaliza a mayúsculas.", detail: "segs.some(s => s === '')", color: COLORS.yellow },
  { lines: [9, 10, 11, 12, 13], title: "Verificar el control", desc: "RegEx → E201. Cálculo ISO 7064 MOD 97-10 → E202 si difiere.", detail: "control(body) === controlStr", color: COLORS.purple },
  { lines: [14, 15, 16, 17, 18, 19, 20, 21], title: "Despachar y mutar", desc: "Cada comando valida aridad, montos y cuentas, y muta el estado.", detail: "E401 · E506 · E507 · E510", color: COLORS.green },
];

export const SceneCodigo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stageDuration = 3.2 * fps;
  const stageIdx = Math.min(STAGES.length - 1, Math.floor(frame / stageDuration));
  const stage = STAGES[stageIdx];

  const codeOp = interpolate(frame, [0.1 * fps, 0.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const codeX = interpolate(frame, [0.1 * fps, 0.7 * fps], [-40, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sidebarOp = interpolate(frame, [0.4 * fps, 1 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.purple} size={550} style={{ top: "8%", left: "1%", opacity: 0.12 }} />
      <GlowOrb color={COLORS.cyan} size={450} style={{ bottom: "6%", right: "3%", opacity: 0.1 }} />

      <div style={{ position: "relative", zIndex: 1, padding: "48px 90px 84px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="03 / El Código" title="La máquina de estados, paso a paso" subtitle="domain.js es puro JavaScript: parseo, guardas y efectos. Sin HTTP, sin E/S." color={COLORS.purple} />

        <div style={{ flex: 1, display: "flex", gap: 30 }}>
          <div style={{ flex: 1.55, transform: `translateX(${codeX}px)`, opacity: codeOp }}>
            <CodeHighlight language="domain.js · processMessage" highlightLines={stage.lines} code={CODE} fontSize={20} lineHeight={26} />
          </div>

          <div style={{ flex: 0.85, display: "flex", flexDirection: "column", gap: 16, opacity: sidebarOp }}>
            <Card padding="26px">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {STAGES.map((s, i) => {
                  const isActive = i === stageIdx;
                  const isDone = i < stageIdx;
                  return (
                    <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 16, padding: "11px 0", opacity: isActive ? 1 : 0.65 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: i <= stageIdx ? `${s.color}1c` : "transparent",
                        border: `2px solid ${i <= stageIdx ? s.color : COLORS.border}`,
                        color: i <= stageIdx ? s.color : COLORS.textDark, fontFamily: FONTS.mono, fontSize: 19, fontWeight: 800, flexShrink: 0,
                      }}>{isDone ? "✓" : i + 1}</div>
                      <span style={{ fontFamily: FONTS.sans, fontSize: 21, fontWeight: isActive ? 700 : 600, color: isActive ? COLORS.text : COLORS.textMuted }}>{s.title}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card style={{ flex: 1, borderLeft: `5px solid ${stage.color}` }} padding="32px">
              <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: stage.color, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, marginBottom: 14 }}>
                Paso {stageIdx + 1} de 4
              </div>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 34, fontWeight: 700, color: COLORS.text, margin: "0 0 14px 0", lineHeight: 1.15 }}>{stage.title}</h3>
              <p style={{ fontFamily: FONTS.sans, fontSize: 21, color: COLORS.textMuted, lineHeight: 1.5, margin: "0 0 16px 0" }}>{stage.desc}</p>
              <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: stage.color, backgroundColor: `${stage.color}10`, border: `1px solid ${stage.color}30`, borderRadius: 9, padding: "10px 14px", display: "inline-block" }}>{stage.detail}</div>
            </Card>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
