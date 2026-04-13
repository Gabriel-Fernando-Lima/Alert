import { Slot } from "expo-router";
import { setupAlarmListener } from "@/src/services/notifications";
import { useEffect } from "react";

export default function RootLayout() {
  useEffect(() => {
    setupAlarmListener();
  }, []);
  return <Slot />;

}

