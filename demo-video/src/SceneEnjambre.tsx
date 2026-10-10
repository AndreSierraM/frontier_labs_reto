import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, Card, GridBg, SectionHeader } from "./DesignSystem";
import { Icon, IconName } from "./Icons";

const AGENTS = [
  { name: "Scout", icon: "search" as IconName, color: COLORS.cyan, desc: "Investiga una etiqueta del original.", out: "Hasta 2 en paralelo" },
  { name: "Analyst", icon: "brain" as IconName, color: COLORS.purple, desc: "Integra informes y decide si requiere parche.", out: "diagnosis.md" },
  { name: "Fixer", icon: "wrench" as IconName, color: COLORS.yellow, desc: "Modifica código, pruebas y especificación.", out: "fixer.patch" },
  { name: "Reviewer", icon: "check-circle" as IconName, color: COLORS.green, desc: "Revisa el diff y la evidencia de verificación.", out: "review.md" },
  { name: "Reporter", icon: "file" as IconName, color: COLORS.orange, desc: "Redacta el informe del parche aprobado.", out: "pr-body.md" },
];

export const SceneEnjambre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stage = Math.min(2, Math.floor(frame / (6 * fps)));
  const heading = { fontFamily: FONTS.display, fontSize: 35, color: COLORS.text, margin: "0 0 22px" };
  const paragraph = { fontFamily: FONTS.sans, fontSize: 25, lineHeight: 1.5, color: COLORS.textMuted, margin: "22px 0 0" };

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg />
      <div style={{ position: "relative", zIndex: 1, padding: "54px 100px 90px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="05 / Agentes" title="Activación y orden de ejecución" subtitle="Cinco roles en el pipeline. Solo los scouts se ejecutan en paralelo; la verificación es código determinista." color={COLORS.purple} />
        <div style={{ display: "flex", gap: 32, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            {AGENTS.map((agent, i) => (
              <Card key={agent.name} padding="20px 24px" style={{ display: "flex", alignItems: "center", gap: 18, borderLeft: `4px solid ${agent.color}`, backgroundColor: stage === 1 && i === 0 ? "#e5efec" : COLORS.bgCard }}>
                <Icon name={agent.icon} size={30} color={agent.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONTS.sans, fontSize: 25, fontWeight: 700, color: agent.color }}>{String(i + 1).padStart(2, "0")} · {agent.name}</div>
                  <div style={{ fontFamily: FONTS.sans, fontSize: 20, lineHeight: 1.4, color: COLORS.textMuted, marginTop: 6 }}>{agent.desc}</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: agent.color, marginTop: 8 }}>{agent.out}</div>
                </div>
              </Card>
            ))}
          </div>
          <Card padding="30px 34px" style={{ flex: 1.05, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              {["Activación", "Paralelismo", "Verificación"].map((label, i) => (
                <div key={label} style={{ flex: 1, padding: "13px 8px", textAlign: "center", borderRadius: 10, backgroundColor: stage === i ? "#ece5f1" : COLORS.bgCode, fontFamily: FONTS.sans, fontSize: 20, color: stage === i ? COLORS.purple : COLORS.textMuted, fontWeight: stage === i ? 700 : 500 }}>{label}</div>
              ))}
            </div>
            {stage === 0 && <>
              <h3 style={heading}>Evento de cambio pendiente</h3>
              {["Monitor / recon", "changed = 1", "workflow_call → swarm"].map((label, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <div style={{ textAlign: "center", color: COLORS.purple, fontSize: 28 }}>↓</div>}
                  <div style={{ backgroundColor: "#ece5f1", borderRadius: 12, padding: "14px", textAlign: "center", fontFamily: FONTS.mono, fontSize: 27, color: COLORS.purple }}>{label}</div>
                </React.Fragment>
              ))}
              <p style={paragraph}>Otras entradas: manual o evento <span style={{ fontFamily: FONTS.mono, fontSize: 22 }}>original-changed</span>.</p>
              <p style={{ ...paragraph, fontSize: 23, color: COLORS.text }}>Sin cambios pendientes, no se invocan agentes.</p>
            </>}
            {stage === 1 && <>
              <h3 style={heading}>Exploración concurrente</h3>
              <div style={{ display: "flex", gap: 20 }}>
                {["Scout A", "Scout B"].map((label, i) => <div key={label} style={{ flex: 1, padding: "28px 16px", textAlign: "center", borderRadius: 12, backgroundColor: "#e5efec", fontFamily: FONTS.sans, fontSize: 28, color: COLORS.cyan }}><strong>{label}</strong><div style={{ fontSize: 21, marginTop: 14 }}>Etiqueta {i + 1}</div></div>)}
              </div>
              <div style={{ textAlign: "center", fontFamily: FONTS.mono, fontSize: 25, color: COLORS.cyan, padding: "26px 0" }}>↓ Promise.all ↓</div>
              <div style={{ padding: "24px", textAlign: "center", borderRadius: 12, backgroundColor: "#ece5f1", fontFamily: FONTS.sans, fontSize: 28, fontWeight: 700, color: COLORS.purple }}>Analyst integra los informes</div>
              <p style={paragraph}>Límite configurado: 2 scouts. El resto de las fases se espera en secuencia.</p>
              <p style={{ fontFamily: FONTS.mono, fontSize: 22, lineHeight: 1.6, color: COLORS.text }}>analyst → fixer → reviewer → reporter</p>
            </>}
            {stage === 2 && <>
              <h3 style={heading}>Control del parche</h3>
              <div style={{ padding: "28px", borderRadius: 12, backgroundColor: "#e5efec", fontFamily: FONTS.mono, fontSize: 26, lineHeight: 1.8, color: COLORS.green }}>fixer → tests<br />→ comparación con referencia<br />→ reviewer</div>
              <p style={paragraph}>Hasta 2 rondas de ajuste. Reporter se ejecuta tras aprobar el parche en el pipeline.</p>
              <div style={{ marginTop: 22, padding: "22px 24px", borderRadius: 12, backgroundColor: "#f3e9e5", fontFamily: FONTS.sans, fontSize: 23, lineHeight: 1.5, color: COLORS.orange }}>Pendientes de CI: condición del cron y control de apertura del PR.</div>
              <p style={{ ...paragraph, fontSize: 23, color: COLORS.text }}>No hay merge automático.</p>
            </>}
            <div style={{ marginTop: "auto", paddingTop: 24, borderTop: `1px solid ${COLORS.border}`, fontFamily: FONTS.sans, fontSize: 19, lineHeight: 1.5, color: COLORS.textMuted }}>Fuente: agent/pipeline.mjs y workflows de GitHub.<br />Descripción del código; ejecución end-to-end no validada.</div>
          </Card>
        </div>
      </div>
    </AbsoluteFill>
  );
};
