import PostDetailScreen from "../../../screens/PostDetailScreen";

export default PostDetailScreen;

import { Stack } from "expo-router";
import CreatePostScreen from "../../screens/P";

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