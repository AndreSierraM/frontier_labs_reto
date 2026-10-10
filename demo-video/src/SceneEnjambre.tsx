import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, Terminal, Card, GlowOrb, GridBg, SectionHeader } from "./DesignSystem";
import { Icon, IconName } from "./Icons";

const AGENTS = [
  { name: "Scouts", icon: "search" as IconName, color: COLORS.cyan, desc: "Investigan el original en paralelo", out: "scout-*.md" },
  { name: "Analista", icon: "brain" as IconName, color: COLORS.purple, desc: "Diagnóstico: PATCH yes | no", out: "diagnosis.md" },
  { name: "Fixer", icon: "wrench" as IconName, color: COLORS.yellow, desc: "Parche de código + tests + SPEC", out: "fixer-*.md" },
  { name: "Verificador", icon: "check-circle" as IconName, color: COLORS.green, desc: "Exige 0 divergencias reales", out: "verify.json" },
  { name: "Reporter", icon: "file" as IconName, color: COLORS.orange, desc: "Redacta el cuerpo del PR", out: "pr-body.md" },
];

export const SceneEnjambre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const getAnim = (idx: number) => ({
    x: interpolate(frame, [(0.2 + idx * 0.35) * fps, (0.2 + idx * 0.35 + 0.5) * fps], [idx % 2 === 0 ? -30 : 30, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [(0.2 + idx * 0.35) * fps, (0.2 + idx * 0.35 + 0.4) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });

  const prOp = interpolate(frame, [2.6 * fps, 3.2 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const termLines = [
    { text: "[swarm] Cambio detectado en monitor", color: COLORS.yellow },
    { text: "[swarm] Descargando logs de Vercel...", color: COLORS.cyan },
    { text: "", color: COLORS.textMuted },
    { text: "[scout-1] Probando PING, ALTA, DEPOSITO...", color: COLORS.cyan },
    { text: "[scout-2] Probando TRANSFER y límites...", color: COLORS.cyan },
    { text: "[scout-3] Probando ANULA y edge cases...", color: COLORS.cyan },
    { text: "", color: COLORS.textMuted },
    { text: "[analyst] Analizando 3 informes + logs...", color: COLORS.purple },
    { text: "[analyst] PATCH: yes", color: COLORS.greenBright },
    { text: "[analyst] E506 ahora usa |monto| ≤ 5000", color: COLORS.purple },
    { text: "", color: COLORS.textMuted },
    { text: "[fixer] Generando parche...", color: COLORS.yellow },
    { text: "[fixer] Modificando domain.js línea 312", color: COLORS.yellow },
    { text: "[fixer] Agregando test E506-limite-nuevo", color: COLORS.yellow },
    { text: "", color: COLORS.textMuted },
    { text: "[verify] Arrancando reemplazo local...", color: COLORS.green },
    { text: "[verify] Comparando vs snapshot original...", color: COLORS.green },
    { text: "[verify] 0 divergencias ✓", color: COLORS.greenBright },
    { text: "", color: COLORS.textMuted },
    { text: "[reporter] Generando PR body...", color: COLORS.orange },
    { text: "[pr] github.com/.../pull/42", color: COLORS.cyan },
  ];
  const visibleLines = Math.floor(frame / (fps * 0.13));

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.purple} size={550} style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.08 }} />

      <div style={{ padding: "70px 110px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="05 / Enjambre de Agentes" title="5 roles, 0 divergencias, 1 PR" subtitle="Pipeline autónomo: investiga, diagnostica, parchea, verifica y entrega." color={COLORS.purple} />

        <div style={{ flex: 1, display: "flex", gap: 32 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {AGENTS.map((agent, i) => {
              const anim = getAnim(i);
              return (
                <div key={agent.name} style={{ transform: `translateX(${anim.x}px)`, opacity: anim.o }}>
                  <Card style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 24px", borderLeft: `4px solid ${agent.color}80` }}>
                    <div style={{ width: 52, height: 52, borderRadius: 13, backgroundColor: `${agent.color}12`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${agent.color}25` }}>
                      <Icon name={agent.icon} size={28} color={agent.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONTS.sans, fontSize: 22, fontWeight: 700, color: agent.color }}>{agent.name}</div>
                      <div style={{ fontFamily: FONTS.sans, fontSize: 16, color: COLORS.textMuted, marginTop: 2 }}>{agent.desc}</div>
                    </div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.textDim, backgroundColor: `${agent.color}0c`, padding: "5px 12px", borderRadius: 7 }}>{agent.out}</div>
                  </Card>
                </div>
              );
            })}

            <div style={{ opacity: prOp }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, justifyContent: "center" }}>
                <div style={{ width: 60, height: 2, backgroundColor: COLORS.green, opacity: 0.5 }} />
                <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `9px solid ${COLORS.green}` }} />
                <div style={{ padding: "12px 22px", borderRadius: 10, backgroundColor: `${COLORS.green}12`, border: `1px solid ${COLORS.green}40`, color: COLORS.green, fontFamily: FONTS.mono, fontSize: 16, fontWeight: 700 }}>
                  Pull Request listo para revisión
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1.05 }}>
            <Terminal title="swarm.mjs — orquestador" lines={termLines.slice(0, Math.max(0, visibleLines))} style={{ height: "100%" }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
