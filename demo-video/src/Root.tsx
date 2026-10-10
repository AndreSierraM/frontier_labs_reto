import React from "react";
import { Composition, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { SceneIntro } from "./SceneIntro";
import { SceneProblema } from "./SceneProblema";
import { SceneArquitectura } from "./SceneArquitectura";
import { SceneMaquinaEstados } from "./SceneMaquinaEstados";
import { SceneMonitor } from "./SceneMonitor";
import { SceneEnjambre } from "./SceneEnjambre";
import { SceneFlujo } from "./SceneFlujo";
import { SceneResultados } from "./SceneResultados";
import { SceneCierre } from "./SceneCierre";

loadFont();
loadJetBrainsMono();
loadSpaceGrotesk();

const fps = 30;
const DURATIONS = {
  intro: 5,
  problema: 8,
  arquitectura: 9,
  maquina: 10,
  monitor: 10,
  enjambre: 12,
  flujo: 9,
  resultados: 10,
  cierre: 6,
};

const totalDuration = Object.values(DURATIONS).reduce((a, b) => a + b, 0);

const scenes = [
  { Component: SceneIntro, duration: DURATIONS.intro * fps },
  { Component: SceneProblema, duration: DURATIONS.problema * fps },
  { Component: SceneArquitectura, duration: DURATIONS.arquitectura * fps },
  { Component: SceneMaquinaEstados, duration: DURATIONS.maquina * fps },
  { Component: SceneMonitor, duration: DURATIONS.monitor * fps },
  { Component: SceneEnjambre, duration: DURATIONS.enjambre * fps },
  { Component: SceneFlujo, duration: DURATIONS.flujo * fps },
  { Component: SceneResultados, duration: DURATIONS.resultados * fps },
  { Component: SceneCierre, duration: DURATIONS.cierre * fps },
];

export const LaCajaNegraDemo: React.FC = () => {
  let currentFrame = 0;
  return (
    <>
      {scenes.map(({ Component, duration }, i) => {
        const from = currentFrame;
        currentFrame += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration} layout="absolute-fill">
            <Component />
          </Sequence>
        );
      })}
    </>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {scenes.map(({ Component, duration }, i) => (
        <Composition
          key={`scene-${i}`}
          id={`0${i + 1}-${["intro", "problema", "arquitectura", "maquina", "monitor", "enjambre", "flujo", "resultados", "cierre"][i]}`}
          component={Component}
          durationInFrames={duration}
          fps={fps}
          width={1920}
          height={1080}
        />
      ))}
      <Composition
        id="la-caja-negra-demo"
        component={LaCajaNegraDemo}
        durationInFrames={totalDuration * fps}
        fps={fps}
        width={1920}
        height={1080}
      />
    </>
  );
};
