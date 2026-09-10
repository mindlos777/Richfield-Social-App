import { Stack } from "expo-router";
import CreatePostScreen from "../../screens/CreatePostScreen";

export default function CreatePostRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <CreatePostScreen />
    </>
  );
}