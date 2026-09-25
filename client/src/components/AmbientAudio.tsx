import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiVolume2, FiVolumeX } from "react-icons/fi";
import {
  AMBIANCES,
  CATEGORIES,
  MORCEAUX,
  clampIndex,
  cycle,
  type Ambiance,
  type Category,
  type Track,
} from "../lib/playlist";

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  start: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  dispose: () => void;
}

/** Construit la chaîne Web Audio d'une ambiance : oscillateurs → filtre → écho → sortie */
function createEngine(volume: number, preset: Ambiance): Engine {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = volume;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = preset.filterHz;

  // Écho léger pour donner de l'espace
  const delay = ctx.createDelay(2);
  delay.delayTime.value = preset.delaySeconds;
  const feedback = ctx.createGain();
  feedback.gain.value = preset.feedback;
  delay.connect(feedback).connect(delay);

  filter.connect(master);
  filter.connect(delay);
  delay.connect(master);
  master.connect(ctx.destination);

  let index = 0;
  const playChord = () => {
    const now = ctx.currentTime;
    preset.chords[index % preset.chords.length].forEach((freq, i) => {
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
    timer = window.setInterval(playChord, preset.intervalMs);
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

/** Widget sonore : deux catégories (ambiances générées, morceaux enregistrés) parcourables */
export default function AmbientAudio() {
  const engine = useRef<Engine | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [category, setCategory] = useState<Category>("ambiances");
  // Une position par catégorie : revenir aux morceaux retrouve celui qu'on écoutait
  const [ambianceIndex, setAmbianceIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [unavailable, setUnavailable] = useState(false);

  const isTrack = category === "morceaux";
  const items = isTrack ? MORCEAUX : AMBIANCES;
  const index = clampIndex(isTrack ? trackIndex : ambianceIndex, items.length);
  const current = items[index];

  useEffect(() => () => engine.current?.dispose(), []);

  // Le volume pilote les deux sources, quelle que soit celle qui joue
  useEffect(() => {
    if (engine.current) engine.current.master.gain.setTargetAtTime(volume, engine.current.ctx.currentTime, 0.1);
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  /** Coupe tout : appelé avant chaque changement de catégorie ou d'élément */
  const stopAll = async () => {
    if (engine.current) await engine.current.pause();
    audio.current?.pause();
    setPlaying(false);
    setUnavailable(false);
  };

  const switchCategory = async (next: Category) => {
    if (next === category) return;
    await stopAll();
    setCategory(next);
  };

  /** Élément précédent / suivant dans la catégorie courante, en rebouclant aux extrémités */
  const step = async (direction: -1 | 1) => {
    if (items.length < 2) return;
    await stopAll();
    const next = cycle(index, items.length, direction);
    if (isTrack) {
      setTrackIndex(next);
      return;
    }
    // Chaque ambiance a sa propre chaîne audio : l'ancienne est libérée avant d'en créer une autre
    engine.current?.dispose();
    engine.current = null;
    setAmbianceIndex(next);
  };

  const toggle = async () => {
    if (!isTrack) {
      if (!engine.current) {
        const created = createEngine(volume, current as Ambiance);
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

  const status = unavailable ? "Indisponible" : playing ? "En lecture" : current.subtitle;
  const navigable = items.length > 1;
  const categoryLabel = isTrack ? "morceaux" : "ambiances";

  return (
    <div className={`ambient ${playing ? "ambient--on" : ""}`}>
      <span className="ambient__bars" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </span>

      <div className="ambient__main">
        <div className="ambient__modes" role="group" aria-label="Catégorie sonore">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={category === id ? "is-active" : ""}
              aria-pressed={category === id}
              onClick={() => switchCategory(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ambient__now">
          {navigable && (
            <button
              type="button"
              className="ambient__step"
              onClick={() => step(-1)}
              aria-label={"Élément précédent parmi les " + categoryLabel}
            >
              <FiChevronLeft />
            </button>
          )}
          <span className="ambient__label">
            <strong title={current.title}>{current.title}</strong>
            <small>
              {status}
              {navigable && <span className="ambient__count"> · {index + 1}/{items.length}</span>}
            </small>
          </span>
          {navigable && (
            <button
              type="button"
              className="ambient__step"
              onClick={() => step(1)}
              aria-label={"Élément suivant parmi les " + categoryLabel}
            >
              <FiChevronRight />
            </button>
          )}
        </div>
      </div>

      <button
        className="icon-btn icon-btn--sm"
        onClick={toggle}
        aria-label={playing ? "Couper le son" : "Écouter « " + current.title + " »"}
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

      {/*
        preload="none" : aucun octet téléchargé tant que le visiteur n'a rien demandé.
        La clé force React à remonter l'élément au changement de morceau — sans elle,
        le navigateur conserve la source déjà résolue et rejoue la précédente.
      */}
      {isTrack && (
        <audio key={current.id} ref={audio} loop preload="none" onEnded={() => setPlaying(false)}>
          {(current as Track).sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </audio>
      )}
    </div>
  );
}
