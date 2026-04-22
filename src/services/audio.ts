import { useAudioPlayer } from "expo-audio";
import { useRef } from "react";

// Player global para o alarme (fora do hook para persistir)
let globalStop: (() => void) | null = null;

export function getGlobalStop() { return globalStop; }
export function setGlobalStop(fn: (() => void) | null) { globalStop = fn; }

export function useAlarmAudio() {
  const player = useAudioPlayer(
    require("../../assets/sounds/alarm_default.mp3")
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function playPreview() {
    try {
      if (timerRef.current) clearTimeout(timerRef.current);
      player.seekTo(0);
      player.play();
      timerRef.current = setTimeout(() => {
        try { player.pause(); } catch (e) {}
      }, 3000);
    } catch (e) {
      console.warn("Erro ao tocar som:", e);
    }
  }

  return { playPreview };
}

export function useAlarmRinging() {
  const player = useAudioPlayer(
    require("../../assets/sounds/alarm_default.mp3")
  );

  function startRinging() {
    try {
      player.seekTo(0);
      player.loop = true;
      player.play();
      setGlobalStop(() => stopRinging);
    } catch (e) {
      console.warn("Erro ao iniciar alarme:", e);
    }
  }

  function stopRinging() {
    try {
      player.loop = false;
      player.pause();
      setGlobalStop(null);
    } catch (e) {}
  }

  return { startRinging, stopRinging };
}