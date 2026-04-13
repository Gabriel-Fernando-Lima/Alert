import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const savedEmail = await AsyncStorage.getItem("@alert:last_email");
    setBiometricAvailable(compatible && enrolled && !!savedEmail);
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem("@alert:last_email", email);
      await AsyncStorage.setItem("@alert:last_password", password);
      router.replace("/(tabs)/alarms" as any);
    } catch (error: any) {
      const msg =
        error.code === "auth/invalid-credential"
          ? "E-mail ou senha incorretos."
          : "Erro ao fazer login. Tente novamente.";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Entre com sua biometria",
        fallbackLabel: "Usar senha",
        cancelLabel: "Cancelar",
      });

      if (!result.success) return;

      const savedEmail = await AsyncStorage.getItem("@alert:last_email");
      const savedPassword = await AsyncStorage.getItem("@alert:last_password");

      if (!savedEmail || !savedPassword) {
        Alert.alert("Atenção", "Faça login com e-mail e senha primeiro para habilitar a biometria.");
        return;
      }

      setLoading(true);
      await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
      router.replace("/(tabs)/alarms" as any);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível autenticar com biometria.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>ALERT</Text>
      <Text style={styles.subtitle}>Faça login para continuar</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Campo de e-mail"
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Campo de senha"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
        accessibilityLabel="Entrar"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      {biometricAvailable && (
        <TouchableOpacity
          style={styles.biometricBtn}
          onPress={handleBiometric}
          disabled={loading}
          accessibilityLabel="Entrar com biometria"
          accessibilityRole="button"
        >
          <Ionicons name="finger-print-outline" size={24} color="#6C63FF" />
          <Text style={styles.biometricText}>Entrar com biometria</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.push("/(auth)/register" as any)}
        accessibilityLabel="Criar conta"
      >
        <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  button: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  biometricText: {
    color: "#6C63FF",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    color: "#6C63FF",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
});