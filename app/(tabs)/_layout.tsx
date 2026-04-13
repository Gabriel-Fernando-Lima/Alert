import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#2a2a2a" },
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#888",
      }}
    >
      <Tabs.Screen
        name="alarms"
        options={{
          title: "Alarmes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alarm-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}