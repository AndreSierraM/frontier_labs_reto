import React from "react";
import { Composition, Sequence } from "remotion";
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

loadFont();
loadJetBrainsMono();
loadSpaceGrotesk();

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
}));

export const LaCajaNegraDemo: React.FC = () => (
  <>
    {DEMO_SCENES.map(({ id, Component, duration }, index) => (
      <Sequence key={id} from={DEMO_SCENES.slice(0, index).reduce((total, scene) => total + scene.duration, 0)} durationInFrames={duration}>
        <Component />
      </Sequence>
    ))}
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
