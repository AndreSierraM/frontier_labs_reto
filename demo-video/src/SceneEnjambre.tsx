/**
 * ESCENA 6: Enjambre de Agentes
 * Pipeline visual limpio con cards y terminal
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, FONTS, Terminal, Card, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";

const AGENTS = [
  { name: "Scouts", icon: "🔍", color: COLORS.cyan, desc: "Investigan el original en paralelo", out: "scout-*.md" },
  { name: "Analista", icon: "🧠", color: COLORS.purple, desc: "Diagnóstico: PATCH yes/no", out: "diagnosis.md" },
  { name: "Fixer", icon: "🔧", color: COLORS.yellow, desc: "Parche + tests + SPEC", out: "fixer-*.md" },
  { name: "Verificador", icon: "✅", color: COLORS.green, desc: "0 divergencias exigidas", out: "verify.json" },
  { name: "Reporter", icon: "📝", color: COLORS.orange, desc: "Cuerpo del PR", out: "pr-body.md" },
];

export const SceneEnjambre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const getAnim = (idx: number) => ({
    x: interpolate(frame, [(0.2 + idx * 0.35) * fps, (0.2 + idx * 0.35 + 0.5) * fps], [idx % 2 === 0 ? -20 : 20, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [(0.2 + idx * 0.35) * fps, (0.2 + idx * 0.35 + 0.4) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });

  const prOp = interpolate(frame, [2.5 * fps, 3 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const termLines = [
    { text: "[swarm] Cambio detectado en monitor", color: COLORS.yellow },
    { text: "[swarm] Descargando logs de Vercel...", color: COLORS.cyan },
    { text: "", color: COLORS.textMuted },
    { text: "[scout-1] Probando PING, ALTA, DEPOSITO...", color: COLORS.cyan },
    { text: "[scout-2] Probando TRANSFER límites...", color: COLORS.cyan },
    { text: "[scout-3] Probando ANULA edge cases...", color: COLORS.cyan },
    { text: "", color: COLORS.textMuted },
    { text: "[analyst] Analizando 3 informes...", color: COLORS.purple },
    { text: "[analyst] PATCH: yes", color: COLORS.greenBright },
    { text: "[analyst] Cambio: E506 ahora usa |monto| ≤ 5000", color: COLORS.purple },
    { text: "", color: COLORS.textMuted },
    { text: "[fixer] Generando parche...", color: COLORS.yellow },
    { text: "[fixer] Modificando domain.js línea 312", color: COLORS.yellow },
    { text: "[fixer] Agregando test E506-limite-nuevo", color: COLORS.yellow },
    { text: "", color: COLORS.textMuted },
    { text: "[verify] Arrancando reemplazo local...", color: COLORS.green },
    { text: "[verify] Comparando vs snapshot...", color: COLORS.green },
    { text: "[verify] 0 divergencias ✓", color: COLORS.greenBright },
    { text: "", color: COLORS.textMuted },
    { text: "[reporter] Generando PR body...", color: COLORS.orange },
    { text: "[pr] https://github.com/.../pull/42", color: COLORS.cyan },
  ];
  const visibleLines = Math.floor(frame / (fps * 0.12));

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: Math.min(fadeIn, fadeOut) }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.purple} size={500} style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.06 }} />

      <div style={{ padding: "60px 100px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="05 / Enjambre de Agentes" title="5 roles, 0 divergencias, 1 PR" subtitle="Pipeline autónomo de investigación, parcheo y entrega." color={COLORS.purple} />

        <div style={{ flex: 1, display: "flex", gap: 24 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {AGENTS.map((agent, i) => {
              const anim = getAnim(i);
              return (
                <div key={agent.name} style={{ transform: `translateX(${anim.x}px)`, opacity: anim.o }}>
                  <Card style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderLeft: `3px solid ${agent.color}66` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${agent.color}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: `1px solid ${agent.color}20` }}>
                      {agent.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700, color: agent.color }}>{agent.name}</div>
                      <div style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{agent.desc}</div>
                    </div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, backgroundColor: `${agent.color}08`, padding: "3px 8px", borderRadius: 5 }}>{agent.out}</div>
                  </Card>
                </div>
              );
            })}

            <div style={{ opacity: prOp }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, justifyContent: "center" }}>
                <div style={{ width: 40, height: 2, backgroundColor: COLORS.green, opacity: 0.4 }} />
                <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: `6px solid ${COLORS.green}` }} />
                <div style={{ padding: "8px 16px", borderRadius: 8, backgroundColor: `${COLORS.green}10`, border: `1px solid ${COLORS.green}33`, color: COLORS.green, fontFamily: FONTS.mono, fontSize: 12, fontWeight: 700 }}>
                  Pull Request → Merge → Deploy
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1.1 }}>
            <Terminal title="swarm.mjs — orquestador" lines={termLines.slice(0, Math.max(0, visibleLines))} style={{ height: "100%" }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
