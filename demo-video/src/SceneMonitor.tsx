/**
 * ESCENA 5: Monitor
 * API + Vigilancia con diseño de 3 columnas limpio
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

export const SceneMonitor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const getAnim = (delay: number) => ({
    y: interpolate(frame, [delay * fps, (delay + 0.6) * fps], [30, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    o: interpolate(frame, [delay * fps, (delay + 0.5) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  });

  const cronPulse = Math.sin((frame / fps) * 2.5) * 0.25 + 0.75;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: Math.min(fadeIn, fadeOut) }}>
      <GridBg opacity={0.02} />
      <GlowOrb color={COLORS.green} size={350} style={{ top: "10%", right: "5%", opacity: 0.08 }} />

      <div style={{ padding: "60px 100px", height: "100%", display: "flex", flexDirection: "column" }}>
        <SectionHeader label="04 / Vigilancia" title="Monitor autónomo con snapshots" subtitle="La batería de 31 puntos corre cada 15 minutos y compara hashes para detectar cambios." color={COLORS.green} />

        <div style={{ flex: 1, display: "flex", gap: 24 }}>
          {/* Col 1: API Routes */}
          <div style={{ flex: 0.9, transform: `translateY(${getAnim(0.2).y}px)`, opacity: getAnim(0.2).o }}>
            <Card glow="cyan" style={{ height: "100%" }}>
              <h3 style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700, color: COLORS.cyan, margin: "0 0 18px 0", paddingBottom: 12, borderBottom: `1px solid ${COLORS.border}` }}>
                Entrypoint API
              </h3>
              <div style={{ fontFamily: FONTS.mono, fontSize: 13, lineHeight: 2 }}>
                {[
                  { method: "GET", path: "/health", resp: "{ ok: true }", color: COLORS.greenBright },
                  { method: "POST", path: "/msg", resp: "protocolo mensajes", color: COLORS.yellow },
                  { method: "POST", path: "/__reset", resp: "estado inicial", color: COLORS.cyan },
                  { method: "POST", path: "/api/monitor/run", resp: "batería", color: COLORS.purple },
                  { method: "GET", path: "/api/monitor/status", resp: "snapshot", color: COLORS.blue },
                ].map((r) => (
                  <div key={r.path} style={{ marginBottom: 10, padding: "8px 12px", backgroundColor: COLORS.bgCode, borderRadius: 8 }}>
                    <div>
                      <span style={{ color: r.color, fontWeight: 700 }}>{r.method}</span>{" "}
                      <span style={{ color: COLORS.text }}>{r.path}</span>
                    </div>
                    <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 2 }}>→ {r.resp}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Col 2: Terminal */}
          <div style={{ flex: 1.2, transform: `translateY(${getAnim(0.6).y}px)`, opacity: getAnim(0.6).o }}>
            <Terminal
              title="monitor/run — batería de 31 puntos"
              style={{ height: "100%" }}
              lines={[
                { text: "[monitor] Iniciando batería...", type: "output", color: COLORS.cyan },
                { text: "", type: "output" },
                { text: "✓ health check", type: "output", color: COLORS.green },
                { text: "✓ auth válido → 200", type: "output", color: COLORS.green },
                { text: "✓ auth inválido → 401 E001", type: "output", color: COLORS.green },
                { text: "✓ PING → {ok:true}", type: "output", color: COLORS.green },
                { text: "✓ ALTA → cuenta AC-XXXX", type: "output", color: COLORS.green },
                { text: "✓ DEPOSITO → saldo updated", type: "output", color: COLORS.green },
                { text: "✓ TRANSFER → op creada", type: "output", color: COLORS.green },
                { text: "✓ CONSULTA → estado completo", type: "output", color: COLORS.green },
                { text: "✓ ANULA → op anulada", type: "output", color: COLORS.green },
                { text: "✓ E100..E510 verificados", type: "output", color: COLORS.green },
                { text: "", type: "output" },
                { text: "[31/31] PASS — snapshot guardado", type: "output", color: COLORS.greenBright },
                { text: "[NEON] INSERT INTO snapshots ...", type: "output", color: COLORS.purple },
              ]}
            />
          </div>

          {/* Col 3: Cron + Estado */}
          <div style={{ flex: 0.9, transform: `translateY(${getAnim(1).y}px)`, opacity: getAnim(1).o }}>
            <Card glow="purple" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700, color: COLORS.purple, margin: "0 0 18px 0", paddingBottom: 12, borderBottom: `1px solid ${COLORS.border}` }}>
                Cron + Estado
              </h3>

              <div style={{ padding: 14, borderRadius: 10, backgroundColor: `${COLORS.purple}08`, border: `1px solid ${COLORS.purple}20`, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.purple, opacity: cronPulse, boxShadow: `0 0 10px ${COLORS.purple}` }} />
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.purple, fontWeight: 600 }}>Cada 15 min</span>
              </div>

              <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, lineHeight: 2, flex: 1 }}>
                <div><span style={{ color: COLORS.cyan }}>snapshot.id</span> uuid</div>
                <div><span style={{ color: COLORS.cyan }}>snapshot.ts</span> ISO</div>
                <div><span style={{ color: COLORS.cyan }}>snapshot.results</span> JSONB</div>
                <div><span style={{ color: COLORS.cyan }}>snapshot.hash</span> SHA-256</div>
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: COLORS.green }}>▸</span> SELECT ... FOR UPDATE
                </div>
                <div>
                  <span style={{ color: COLORS.green }}>▸</span> Serialización garantizada
                </div>
              </div>

              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: `${COLORS.yellow}06`, border: `1px solid ${COLORS.yellow}18` }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.yellow }}>
                  ⚠ hash ≠ anterior → trigger swarm
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
