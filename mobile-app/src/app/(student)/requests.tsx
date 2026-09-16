import React from "react";
import { Stack } from "expo-router";
import ChatRequestsScreen from "../../screens/ChatRequestScreen";

export default function RequestsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ChatRequestsScreen />
    </>
  );
}