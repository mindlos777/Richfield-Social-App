import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="student-signup" />
      <Stack.Screen name="alumni-verification" />
      <Stack.Screen name="business-verification" />
      <Stack.Screen name="verification-pending" />
    </Stack>
  );
}