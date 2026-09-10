import PostDetailScreen from "../../../screens/PostDetailScreen";

export default PostDetailScreen;

import { Stack } from "expo-router";
import PostDetailScreen from "../../screens/PostDetailScreen";

export default function PostDetailScreen() {
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