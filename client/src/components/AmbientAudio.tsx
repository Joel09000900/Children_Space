import { useEffect, useRef, useState } from "react";
import { FiVolume2, FiVolumeX } from "react-icons/fi";

// Accords joués en boucle (fréquences en Hz) : nappe douce générée en direct, aucun fichier audio
const CHORDS = [
  [130.81, 196.0, 261.63, 329.63],
  [110.0, 164.81, 220.0, 277.18],
  [146.83, 220.0, 293.66, 349.23],
  [123.47, 185.0, 246.94, 311.13],
];

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  timer: number;
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

  playChord();
  const timer = window.setInterval(playChord, 6000);
  return { ctx, master, timer };
}

/** Widget « Ambiance » : musique d'ambiance générée par Web Audio, lancée à la demande */
export default function AmbientAudio() {
  const engine = useRef<Engine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => () => {
    if (engine.current) {
      window.clearInterval(engine.current.timer);
      engine.current.ctx.close();
    }
  }, []);

  useEffect(() => {
    if (engine.current) engine.current.master.gain.setTargetAtTime(volume, engine.current.ctx.currentTime, 0.1);
  }, [volume]);

  const toggle = async () => {
    if (!engine.current) {
      engine.current = createEngine(volume);
      setPlaying(true);
      return;
    }
    if (playing) await engine.current.ctx.suspend();
    else await engine.current.ctx.resume();
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
