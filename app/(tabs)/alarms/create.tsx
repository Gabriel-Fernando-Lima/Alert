import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { scheduleAlarm, requestNotificationPermission } from "@/src/services/notifications";
import { useAlarmAudio } from "@/src/services/audio";
import { auth } from "@/src/services/firebase";
import { useAlarmStore } from "@/src/store/alarmStore";
import { useAlarmRinging } from "@/src/services/audio";
import { useSettingsStore } from "@/src/store/settingsStore";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SOUNDS = ["default", "beep", "digital", "nature"];

export default function CreateAlarmScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const { add, update, alarms } = useAlarmStore();
  const { playPreview } = useAlarmAudio();
  const uid = auth.currentUser?.uid ?? "";

  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedSound, setSelectedSound] = useState("default");

  const { setRinging } = useAlarmStore();
  const { gradualVolume } = useSettingsStore();
  const { startRinging, stopRinging } = useAlarmRinging();
  const [testingAlarm, setTestingAlarm] = useState(false);


  useEffect(() => {
    if (isEditing) {
      const alarm = alarms.find((a) => a.id === id);
      if (alarm) {
        const d = new Date();
        d.setHours(alarm.hour, alarm.minute, 0, 0);
        setTime(d);
        setLabel(alarm.label);
        setSelectedDays(alarm.days);
        setSelectedSound(alarm.sound);
      }
    }
  }, [id]);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleTestAlarm() {
    if (testingAlarm) {
      stopRinging();
      setRinging(null);
      setTestingAlarm(false);
      return;
    }

    const testAlarm = {
      id: "test",
      uid: "",
      label: label || "Teste de alarme",
      hour: time.getHours(),
      minute: time.getMinutes(),
      days: selectedDays,
      sound: selectedSound,
      active: true,
      created_at: Date.now(),
    };

    setTestingAlarm(true);
    setRinging(testAlarm);
  }

  async function handleSave() {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permissão negada", "Precisamos de permissão para notificações.");
      return;
    }

    const alarm = {
      id: isEditing ? id! : Date.now().toString(),
      uid,
      label,
      hour: time.getHours(),
      minute: time.getMinutes(),
      days: selectedDays.sort(),
      sound: selectedSound,
      active: true,
      created_at: isEditing
        ? alarms.find((a) => a.id === id)!.created_at
        : Date.now(),
    };

    if (isEditing) {
      update(alarm);
    } else {
      add(alarm);
    }

    await scheduleAlarm(alarm);
    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.header}>{isEditing ? "Editar Alarme" : "Novo Alarme"}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveBtn}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.timePicker} onPress={() => setShowPicker(true)}>
        <Text style={styles.timeText}>
          {`${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`}
        </Text>
        <Text style={styles.timeHint}>Toque para alterar</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setTime(date);
          }}
        />
      )}

      <Text style={styles.sectionTitle}>Nome do alarme</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Acordar para academia"
        placeholderTextColor="#555"
        value={label}
        onChangeText={setLabel}
      />

      <Text style={styles.sectionTitle}>Repetir</Text>
      <View style={styles.daysRow}>
        {DAYS.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dayBtn, selectedDays.includes(i) && styles.dayBtnActive]}
            onPress={() => toggleDay(i)}
          >
            <Text style={[styles.dayBtnText, selectedDays.includes(i) && styles.dayBtnTextActive]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Som</Text>
      <View style={styles.soundsRow}>
        {SOUNDS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.soundBtn, selectedSound === s && styles.soundBtnActive]}
            onPress={() => setSelectedSound(s)}
          >
            <Text style={[styles.soundBtnText, selectedSound === s && styles.soundBtnTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.previewBtn, testingAlarm && { borderColor: "#ff4444" }]}
        onPress={handleTestAlarm}
        accessibilityLabel="Testar alarme completo"
      >
        <Ionicons
          name={testingAlarm ? "stop-circle-outline" : "alarm-outline"}
          size={20}
          color={testingAlarm ? "#ff4444" : "#6C63FF"}
        />
        <Text style={[styles.previewText, testingAlarm && { color: "#ff4444" }]}>
          {testingAlarm ? "Parar teste" : "Testar alarme completo"}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.previewBtn} onPress={playPreview}>
        <Ionicons name="play-circle-outline" size={20} color="#6C63FF" />
        <Text style={styles.previewText}>Testar som</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 20, paddingTop: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  header: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  saveBtn: { fontSize: 16, color: "#6C63FF", fontWeight: "bold" },
  timePicker: { alignItems: "center", marginBottom: 32, gap: 4 },
  timeText: { fontSize: 72, fontWeight: "bold", color: "#fff", letterSpacing: 4 },
  timeHint: { fontSize: 12, color: "#555" },
  sectionTitle: { fontSize: 13, color: "#888", fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    backgroundColor: "#1a1a1a", borderRadius: 12, padding: 16,
    color: "#fff", fontSize: 16, borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 24,
  },
  daysRow: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  dayBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a" },
  dayBtnActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  dayBtnText: { color: "#888", fontSize: 13, fontWeight: "600" },
  dayBtnTextActive: { color: "#fff" },
  soundsRow: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  soundBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a" },
  soundBtnActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  soundBtnText: { color: "#888", fontSize: 13 },
  soundBtnTextActive: { color: "#fff" },
  previewBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#2a2a2a" },
  previewText: { color: "#6C63FF", fontSize: 15, fontWeight: "600" },
});