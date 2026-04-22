import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/src/services/firebase";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(true);

  const user = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      loadBiometricStatus();
    }, [])
  );

  async function loadBiometricStatus() {
    try {
      setCheckingBiometric(true);
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(compatible && enrolled);

      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      setBiometricEnabled(snap.exists() && snap.data()?.biometricEnabled === true);
    } catch (e) {
      console.warn("Erro ao carregar biometria:", e);
    } finally {
      setCheckingBiometric(false);
    }
  }

  async function handleEnableBiometric() {
    if (!user) return;

    // Verifica se já existe biometria vinculada a outro perfil
    const savedUid = await AsyncStorage.getItem("@alert:last_uid");
    if (savedUid && savedUid !== user.uid) {
      Alert.alert(
        "Biometria em uso",
        "Esta digital já está vinculada a outra conta. Desvincule primeiro na outra conta.",
        [{ text: "Ok" }]
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme sua digital para vincular",
      cancelLabel: "Cancelar",
    });

    if (!result.success) return;

    try {
      setLoading(true);
      await setDoc(doc(db, "users", user.uid), { biometricEnabled: true }, { merge: true });
      await AsyncStorage.setItem("@alert:last_uid", user.uid);
      setBiometricEnabled(true);
      Alert.alert("✅ Biometria vinculada!", "Você pode entrar com a digital nas próximas vezes.");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível vincular a biometria.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisableBiometric() {
    if (!user) return;

    Alert.alert(
      "Desvincular biometria",
      "Tem certeza que deseja remover a biometria desta conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await setDoc(doc(db, "users", user.uid), { biometricEnabled: false }, { merge: true });
              await AsyncStorage.removeItem("@alert:last_uid");
              setBiometricEnabled(false);
              Alert.alert("Biometria removida", "Sua digital foi desvinculada desta conta.");
            } catch (e) {
              Alert.alert("Erro", "Não foi possível desvincular a biometria.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleLogout() {
    Alert.alert(
      "Sair",
      "Deseja sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await signOut(auth);
            router.replace("/(auth)/login" as any);
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Perfil</Text>

      {/* Info da conta */}
      <View style={styles.card}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={36} color="#6C63FF" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardLabel}>E-mail</Text>
          <Text style={styles.cardValue} numberOfLines={1}>{user?.email ?? "—"}</Text>
        </View>
      </View>

      {/* Biometria */}
      <Text style={styles.sectionTitle}>Segurança</Text>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardRowLeft}>
            <Ionicons
              name="finger-print-outline"
              size={24}
              color={biometricEnabled ? "#6C63FF" : "#888"}
            />
            <View>
              <Text style={styles.cardValue}>Biometria</Text>
              <Text style={styles.cardLabel}>
                {checkingBiometric
                  ? "Verificando..."
                  : !biometricSupported
                  ? "Não suportado neste dispositivo"
                  : biometricEnabled
                  ? "Vinculada a esta conta"
                  : "Não vinculada"}
              </Text>
            </View>
          </View>

          {checkingBiometric ? (
            <ActivityIndicator color="#6C63FF" />
          ) : biometricSupported && (
            <TouchableOpacity
              style={[styles.toggleBtn, biometricEnabled && styles.toggleBtnDanger]}
              onPress={biometricEnabled ? handleDisableBiometric : handleEnableBiometric}
              disabled={loading}
              accessibilityLabel={biometricEnabled ? "Desvincular biometria" : "Vincular biometria"}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.toggleBtnText}>
                  {biometricEnabled ? "Desvincular" : "Vincular"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Logout */}
      <Text style={styles.sectionTitle}>Conta</Text>
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        accessibilityLabel="Sair da conta"
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    color: "#888",
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: "#888",
  },
  cardValue: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "500",
  },
  toggleBtn: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleBtnDanger: {
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  toggleBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  logoutText: {
    color: "#ff4444",
    fontSize: 15,
    fontWeight: "600",
  },
});