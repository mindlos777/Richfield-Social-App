import React from "react";
import { Stack } from "expo-router";

export default function StaffLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="pending" />

      <Stack.Screen name="(tabs)" />

      <Stack.Screen name="events" />

      <Stack.Screen name="announcements" />

      <Stack.Screen name="notifications" />

      <Stack.Screen name="analytics" />
    </Stack>
  );
}