import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack>
      <Stack.Screen name="activity" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="followers" />
    </Stack>
  );
}