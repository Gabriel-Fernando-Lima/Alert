import { useAudioPlayer } from "expo-audio";
import { useRef } from "react";

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
        try {
          player.pause();
        } catch (e) {
          // player já foi liberado, ignora
        }
      }, 3000);
    } catch (e) {
      console.warn("Erro ao tocar som:", e);
    }
  }

  return { playPreview };
}