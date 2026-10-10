import React from "react";
import { Composition, Sequence, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "./DesignSystem";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { SceneIntro } from "./SceneIntro";
import { SceneProblema } from "./SceneProblema";
import { SceneArquitectura } from "./SceneArquitectura";
import { SceneCodigo } from "./SceneCodigo";
import { SceneMonitor } from "./SceneMonitor";
import { SceneEnjambre } from "./SceneEnjambre";
import { SceneFlujo } from "./SceneFlujo";
import { SceneCapturas } from "./SceneCapturas";
import { SceneResultados } from "./SceneResultados";
import { SceneCierre } from "./SceneCierre";

loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
loadJetBrainsMono("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
loadSpaceGrotesk("normal", { weights: ["700"], subsets: ["latin"] });

const fps = 30;
const T = 15;

const DUR = {
  intro: 6 * fps,
  problema: 9 * fps,
  arquitectura: 10 * fps,
  codigo: 13 * fps,
  monitor: 11 * fps,
  enjambre: 12 * fps,
  flujo: 10 * fps,
  capturas: 10 * fps,
  resultados: 10 * fps,
  cierre: 7 * fps,
};

const totalFrames =
  DUR.intro + DUR.problema + DUR.arquitectura + DUR.codigo + DUR.monitor + DUR.enjambre + DUR.flujo + DUR.capturas + DUR.resultados + DUR.cierre - 9 * T;

const SCENES = [
  { id: "01-intro", Component: SceneIntro, duration: DUR.intro },
  { id: "02-problema", Component: SceneProblema, duration: DUR.problema },
  { id: "03-arquitectura", Component: SceneArquitectura, duration: DUR.arquitectura },
  { id: "04-codigo", Component: SceneCodigo, duration: DUR.codigo },
  { id: "05-monitor", Component: SceneMonitor, duration: DUR.monitor },
  { id: "06-enjambre", Component: SceneEnjambre, duration: DUR.enjambre },
  { id: "07-flujo", Component: SceneFlujo, duration: DUR.flujo },
  { id: "08-capturas", Component: SceneCapturas, duration: DUR.capturas },
  { id: "09-resultados", Component: SceneResultados, duration: DUR.resultados },
  { id: "10-cierre", Component: SceneCierre, duration: DUR.cierre },
];

const DEMO_SCENES = SCENES.map((scene, index) => ({
  ...scene,
  duration: index === SCENES.length - 1 ? scene.duration : scene.duration - T,
  from: SCENES.slice(0, index).reduce((total, preceding) => total + preceding.duration - T, 0),
}));

const CHAPTERS = [
  { label: "Descubrir", from: DEMO_SCENES[1].from, color: COLORS.orange },
  { label: "Construir", from: DEMO_SCENES[2].from, color: COLORS.cyan },
  { label: "Vigilar", from: DEMO_SCENES[4].from, color: COLORS.green },
  { label: "Adaptar", from: DEMO_SCENES[5].from, color: COLORS.purple },
  { label: "Demostrar", from: DEMO_SCENES[7].from, color: COLORS.blue },
];

const ChapterGuide: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < CHAPTERS[0].from || frame >= DEMO_SCENES[9].from) return null;
  return (
    <div style={{ position: "absolute", bottom: 16, left: 110, right: 110, display: "flex", gap: 24, pointerEvents: "none" }}>
      {CHAPTERS.map((chapter, index) => {
        const end = CHAPTERS[index + 1]?.from ?? DEMO_SCENES[9].from;
        const progress = Math.max(0, Math.min(1, (frame - chapter.from) / (end - chapter.from)));
        const active = frame >= chapter.from && frame < end;
        return (
          <div key={chapter.label} style={{ flex: 1 }}>
            <div style={{ height: 3, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, backgroundColor: chapter.color }} />
            </div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 17, fontWeight: active ? 700 : 500, color: active ? chapter.color : COLORS.textDim }}>
              {String(index + 1).padStart(2, "0")} · {chapter.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const LaCajaNegraDemo: React.FC = () => (
  <>
    {DEMO_SCENES.map(({ id, Component, duration, from }) => (
      <Sequence key={id} from={from} durationInFrames={duration}>
        <Component />
      </Sequence>
    ))}
    <ChapterGuide />
  </>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {SCENES.map(({ id, Component, duration }) => (
        <Composition key={id} id={id} component={Component} durationInFrames={duration} fps={fps} width={1920} height={1080} />
      ))}
      <Composition id="la-caja-negra-demo" component={LaCajaNegraDemo} durationInFrames={totalFrames} fps={fps} width={1920} height={1080} />
    </>
  );
};
