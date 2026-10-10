import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { COLORS, FONTS, Terminal, Card, GlowOrb, GridBg, SectionHeader, ScreenshotFrame, Badge } from "./DesignSystem";
import { Icon } from "./Icons";

export const SceneMonitor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const a1 = {
    x: interpolate(frame, [0.2 * fps, fps], [-40, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [0.2 * fps, 0.9 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };
  const a2 = {
    x: interpolate(frame, [0.6 * fps, 1.4 * fps], [40, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [0.6 * fps, 1.3 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  };

  const cronPulse = Math.sin((frame / fps) * 2.5) * 0.25 + 0.75;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.green} size={450} style={{ top: "8%", right: "3%", opacity: 0.1 }} />

      <div style={{ padding: "70px 110px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="04 / Vigilancia" title="Monitor autónomo con snapshots" subtitle="La batería de 31 puntos corre cada 15 minutos y compara hashes SHA-256." color={COLORS.green} />

        <div style={{ flex: 1, display: "flex", gap: 36 }}>
          {/* Terminal de la batería */}
          <div style={{ flex: 1, transform: `translateX(${a1.x}px)`, opacity: a1.o }}>
            <Terminal
              title="monitor/run — batería de 31 puntos"
              style={{ height: "100%" }}
              lines={[
                { text: "[monitor] Iniciando batería vs API oficial...", type: "output", color: COLORS.cyan },
                { text: "", type: "output" },
                { text: "✓ health check", type: "output", color: COLORS.green },
                { text: "✓ auth válido → 200", type: "output", color: COLORS.green },
                { text: "✓ auth inválido → 401 E001", type: "output", color: COLORS.green },
                { text: "✓ PING → {pong:true}", type: "output", color: COLORS.green },
                { text: "✓ ALTA → cuenta AC-XXXX", type: "output", color: COLORS.green },
                { text: "✓ DEPOSITO → saldo actualizado", type: "output", color: COLORS.green },
                { text: "✓ TRANSFER → operación creada", type: "output", color: COLORS.green },
                { text: "✓ CONSULTA → estado completo", type: "output", color: COLORS.green },
                { text: "✓ ANULA → reversión única", type: "output", color: COLORS.green },
                { text: "✓ E100..E510 verificados", type: "output", color: COLORS.green },
                { text: "", type: "output" },
                { text: "[31/31] PASS — snapshot guardado", type: "output", color: COLORS.greenBright },
                { text: "[NEON] hash SHA-256 ≠ anterior", type: "output", color: COLORS.yellow },
                { text: "[swarm] → trigger workflow", type: "output", color: COLORS.purple },
              ]}
            />
          </div>

          {/* Dashboard real */}
          <div style={{ flex: 1.1, transform: `translateX(${a2.x}px)`, opacity: a2.o, display: "flex", flexDirection: "column", gap: 20 }}>
            <ScreenshotFrame src="captures/monitor-dashboard.png" title="monitor — dashboard en vivo" />
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <Card padding="18px" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.purple, opacity: cronPulse, boxShadow: `0 0 12px ${COLORS.purple}` }} />
                  <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.purple, fontWeight: 700 }}>Cron cada 15 min</div>
                </Card>
              </div>
              <div style={{ flex: 1 }}>
                <Card padding="18px" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon name="database" size={24} color={COLORS.blue} />
                  <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.blue, fontWeight: 700 }}>Postgres JSONB</div>
                </Card>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Badge color="green">SELECT ... FOR UPDATE</Badge>
              <Badge color="cyan">Serializa escrituras</Badge>
              <Badge color="yellow">429/infra ignorado</Badge>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};