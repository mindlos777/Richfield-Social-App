import { Stack } from "expo-router";
import { ReportsProvider } from "../src/context/ReportsContext";

export default function RootLayout() {
  return (
    <ReportsProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
  );
}