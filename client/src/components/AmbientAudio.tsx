import { useEffect, useRef, useState } from "react";
import { FiVolume2, FiVolumeX } from "react-icons/fi";

// Accords joués en boucle (fréquences en Hz) : nappe douce générée en direct, aucun fichier audio
const CHORDS = [
  [130.81, 196.0, 261.63, 329.63],
  [110.0, 164.81, 220.0, 277.18],
  [146.83, 220.0, 293.66, 349.23],
  [123.47, 185.0, 246.94, 311.13],
];

const CHORD_INTERVAL = 6000;

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  start: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  dispose: () => void;
}

function createEngine(volume: number): Engine {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = volume;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1100;

  // Écho léger pour donner de l'espace
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  delay.connect(feedback).connect(delay);

  filter.connect(master);
  filter.connect(delay);
  delay.connect(master);
  master.connect(ctx.destination);

  let index = 0;
  const playChord = () => {
    const now = ctx.currentTime;
    CHORDS[index % CHORDS.length].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 2.2);
      gain.gain.linearRampToValueAtTime(0, now + 7.5);
      osc.connect(gain).connect(filter);
      osc.start(now + i * 0.12);
      osc.stop(now + 8);
    });
    index++;
  };

  let timer = 0;
  const start = () => {
    if (timer) return;
    playChord();
    timer = window.setInterval(playChord, CHORD_INTERVAL);
  };
  const stopTimer = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  return {
    ctx,
    master,
    start,
    // En pause, ctx.currentTime est figé : laisser la minuterie tourner empilait
    // des oscillateurs qui ne se terminaient jamais et repartaient tous ensemble
    // à la reprise (pic de volume et fuite mémoire).
    pause: async () => {
      stopTimer();
      await ctx.suspend();
    },
    resume: async () => {
      await ctx.resume();
      start();
    },
    dispose: () => {
      stopTimer();
      void ctx.close();
    },
  };
}

/** Widget « Ambiance » : musique d'ambiance générée par Web Audio, lancée à la demande */
export default function AmbientAudio() {
  const engine = useRef<Engine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => () => engine.current?.dispose(), []);

  useEffect(() => {
    if (engine.current) engine.current.master.gain.setTargetAtTime(volume, engine.current.ctx.currentTime, 0.1);
  }, [volume]);

  const toggle = async () => {
    if (!engine.current) {
      const created = createEngine(volume);
      engine.current = created;
      created.start();
      setPlaying(true);
      return;
    }
    if (playing) await engine.current.pause();
    else await engine.current.resume();
    setPlaying(!playing);
  };

  return (
    <div className={`ambient ${playing ? "ambient--on" : ""}`}>
      <span className="ambient__bars" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </span>
      <span className="ambient__label">
        <strong>Ambiance</strong>
        <small>{playing ? "En lecture" : "En pause"}</small>
      </span>
      <button className="icon-btn icon-btn--sm" onClick={toggle} aria-label={playing ? "Couper l'ambiance" : "Lancer l'ambiance"}>
        {playing ? <FiVolume2 /> : <FiVolumeX />}
      </button>
      <input
        className="ambient__volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volume"
      />
    </div>
  );
}
