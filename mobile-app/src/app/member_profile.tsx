import React from "react";
import { Stack } from "expo-router";
import MemberProfileScreen from "../screens/MemberProfileScreen";

export default function MemberProfileRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Member Profile" }} />
      <MemberProfileScreen />
    </>
  );
}