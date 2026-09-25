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

/** Morceau servi depuis client/public/audio (le master .wav reste hors du dépôt) */
const TRACK = {
  title: "Tout va changer",
  artist: "Artiste inconnu",
  mp3: "/audio/tout-va-changer.mp3",
  ogg: "/audio/tout-va-changer.ogg",
};

type Mode = "ambiance" | "morceau";

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

/** Widget « Ambiance » : nappe générée en Web Audio, ou morceau enregistré, au choix */
export default function AmbientAudio() {
  const engine = useRef<Engine | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<Mode>("ambiance");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => () => engine.current?.dispose(), []);

  // Le volume pilote les deux sources, quelle que soit celle qui joue
  useEffect(() => {
    if (engine.current) engine.current.master.gain.setTargetAtTime(volume, engine.current.ctx.currentTime, 0.1);
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  /** Bascule de source : on arrête toujours l'autre avant de changer */
  const switchMode = async (next: Mode) => {
    if (next === mode) return;
    if (engine.current) await engine.current.pause();
    audio.current?.pause();
    setPlaying(false);
    setUnavailable(false);
    setMode(next);
  };

  const toggle = async () => {
    if (mode === "ambiance") {
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
      return;
    }

    const el = audio.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    try {
      el.volume = volume;
      await el.play();
      setUnavailable(false);
      setPlaying(true);
    } catch {
      // Fichier absent, format refusé, ou lecture bloquée par le navigateur
      setUnavailable(true);
      setPlaying(false);
    }
  };

  const isTrack = mode === "morceau";
  const status = unavailable ? "Indisponible" : playing ? "En lecture" : "En pause";

  return (
    <div className={`ambient ${playing ? "ambient--on" : ""}`}>
      <span className="ambient__bars" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </span>

      <div className="ambient__main">
        <div className="ambient__modes" role="group" aria-label="Source sonore">
          <button type="button" className={!isTrack ? "is-active" : ""} aria-pressed={!isTrack} onClick={() => switchMode("ambiance")}>
            Ambiance
          </button>
          <button type="button" className={isTrack ? "is-active" : ""} aria-pressed={isTrack} onClick={() => switchMode("morceau")}>
            Morceau
          </button>
        </div>
        <span className="ambient__label">
          <strong>{isTrack ? TRACK.title : "Ambiance"}</strong>
          <small>{isTrack && !unavailable && !playing ? TRACK.artist : status}</small>
        </span>
      </div>

      <button
        className="icon-btn icon-btn--sm"
        onClick={toggle}
        aria-label={playing ? "Couper le son" : isTrack ? `Écouter « ${TRACK.title} »` : "Lancer l'ambiance"}
      >
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

      {/* preload="none" : aucun octet téléchargé tant que le visiteur n'a pas demandé le morceau */}
      <audio ref={audio} loop preload="none" onEnded={() => setPlaying(false)}>
        <source src={TRACK.mp3} type="audio/mpeg" />
        <source src={TRACK.ogg} type="audio/ogg" />
      </audio>
    </div>
  );
}
