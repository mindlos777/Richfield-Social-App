import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="activity"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="followers"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="following"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="portfolio"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}