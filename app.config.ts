import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ALERT",
  slug: "alert",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "alert",
  userInterfaceStyle: "automatic",
  android: {
    package: "com.alert.app",
    permissions: [
      "RECORD_AUDIO",
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE",
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
    ],
  },
  plugins: [
    "expo-router",
    "expo-local-authentication",
    [
    "expo-notifications",
    {
      icon: "./assets/images/icon.png",
      color: "#6C63FF",
      sounds: ["./assets/sounds/alarm_default.mp3"], // ← adiciona aqui
    },
  ],
],
  extra: {
    eas: {
      projectId: "alert-app-3c556",
    },
  },
});