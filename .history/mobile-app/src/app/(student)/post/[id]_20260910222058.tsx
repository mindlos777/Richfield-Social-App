import { Stack } from "expo-router";
import PostDetailScreen from "../../screens/PostDetailScreen";

export default function PostDetailRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <PostDetailScreen />
    </>
  );
}