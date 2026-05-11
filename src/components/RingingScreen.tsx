import { View, Text, TouchableOpacity, StyleSheet, Vibration } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAlarmStore, Alarm } from "@/src/store/alarmStore";
import { useAlarmRinging } from "@/src/services/audio";
import { scheduleSnooze } from "@/src/services/notifications";
import { useVoiceCommand } from "@/src/hooks/useVoiceCommand";
import { Accelerometer } from "expo-sensors";
import * as Torch from "expo-torch";
import { useSettingsStore } from "@/src/store/settingsStore";

type Props = { alarm: Alarm };

export function RingingScreen({ alarm }: Props) {
  const setRinging = useAlarmStore((s) => s.setRinging);
  const { startRinging, stopRinging } = useAlarmRinging();
  const { snoozeMinutes, flashEnabled, gradualVolume, autoVoice } = useSettingsStore();
  const flashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const stoppedRef = useRef(false);

  const { startListening, stopListening } = useVoiceCommand({
    onStop: handleStop,
    onSnooze: handleSnooze,
    continuous: true,
    onBeforeListen: () => {
      // Para o flash antes do intent abrir
      stopFlash();
    },
    onAfterListen: () => {
      // Retoma o flash após o intent fechar
      if (flashEnabled && !stoppedRef.current) startFlash();
    },
  });

  useEffect(() => {
    console.log("🔔 RingingScreen montado, flashEnabled:", flashEnabled);
    stoppedRef.current = false;
    startRinging(gradualVolume);
    // Vibração em loop sincronizada com o flash
    Vibration.vibrate([300, 200, 300, 200], true);
    startShakeDetection();
    if (flashEnabled) {
      console.log("🔦 Iniciando flash...");
      startFlash();
    } else {
      console.log("🔦 Flash desabilitado nas configs");
    }
    if (autoVoice) {
      setTimeout(() => {
        if (!stoppedRef.current) startListening();
      }, 5000);
    }

    return () => {
      stopRinging();
      stopListening();
      Vibration.cancel();
      stopFlash();
      Accelerometer.removeAllListeners();
    };
  }, []);

  function startFlash() {
    console.log("🔦 startFlash chamado, flashEnabled:", flashEnabled);
    let on = false;
    flashRef.current = setInterval(async () => {
      try {
        await Torch.setStateAsync(on ? Torch.ON : Torch.OFF);
        console.log("🔦 Torch:", on ? "ON" : "OFF");
        on = !on;
      } catch (e: any) {
        console.log("🔦 Erro no flash:", e.message);
      }
    }, 500);
  }

  function stopFlash() {
    if (flashRef.current) {
      clearInterval(flashRef.current);
      flashRef.current = null;
    }
    try { Torch.setStateAsync(Torch.OFF); } catch (e) { }
  }

  function startShakeDetection() {
    Accelerometer.setUpdateInterval(200);
    Accelerometer.addListener((data) => {
      if (stoppedRef.current) return;
      if (shakeRef.current) {
        const delta =
          Math.abs(data.x - shakeRef.current.x) +
          Math.abs(data.y - shakeRef.current.y) +
          Math.abs(data.z - shakeRef.current.z);
        if (delta > 3) handleStop();
      }
      shakeRef.current = data;
    });
  }

  function handleStop() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopRinging();
    stopFlash();
    Vibration.cancel();
    Accelerometer.removeAllListeners();
    setRinging(null);
  }

  async function handleSnooze() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopRinging();
    stopFlash();
    Vibration.cancel();
    Accelerometer.removeAllListeners();
    await scheduleSnooze(alarm, snoozeMinutes);
    setRinging(null);
  }

  function formatTime(hour: number, minute: number) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return (
    <View style={styles.overlay}>
      <Ionicons name="alarm" size={80} color="#6C63FF" />
      <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
      {alarm.label ? <Text style={styles.label}>{alarm.label}</Text> : null}
      <Text style={styles.hint}>Agite o celular ou diga "parar"</Text>

      <TouchableOpacity
        style={styles.micBtn}
        onPress={startListening}
        accessibilityLabel="Parar por voz"
      >
        <Ionicons name="mic-outline" size={24} color="#6C63FF" />
        <Text style={styles.micText}>Comando de voz</Text>
      </TouchableOpacity>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.snoozeBtn}
          onPress={handleSnooze}
          accessibilityLabel="Soneca por 5 minutos"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={24} color="#fff" />
          <Text style={styles.snoozeText}>Soneca ({snoozeMinutes} min)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stopBtn}
          onPress={handleStop}
          accessibilityLabel="Parar alarme"
          accessibilityRole="button"
        >
          <Ionicons name="stop-circle" size={28} color="#fff" />
          <Text style={styles.stopText}>Parar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    zIndex: 999,
  },
  time: { fontSize: 80, fontWeight: "bold", color: "#fff", letterSpacing: 4 },
  label: { fontSize: 20, color: "#888" },
  hint: { fontSize: 13, color: "#555", marginTop: 8 },
  micBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 20, borderWidth: 1, borderColor: "#6C63FF",
  },
  micText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
  buttons: { gap: 16, marginTop: 24, width: "100%", paddingHorizontal: 32 },
  snoozeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#333", paddingHorizontal: 40, paddingVertical: 18, borderRadius: 50,
  },
  snoozeText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  stopBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#ff4444", paddingHorizontal: 40, paddingVertical: 18, borderRadius: 50,
  },
  stopText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
});