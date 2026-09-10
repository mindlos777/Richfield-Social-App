import { Redirect } from "expo-router";

export default function BusinessIndex() {
  return <Redirect href="/(business-auth)/(tabs)/dashboard" />;
}