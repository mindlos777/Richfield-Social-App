import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
            },
        tabBarActiveTintColor: "#0300cf",
        tabBarInactiveTintColor: "#64748b"
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "CivicFix",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="home" size={size} color={focused ? "#0300cf" : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="post"
        options={{
          title: "Create Post",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="add" size={size} color={focused ? "#0300cf" : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="opportunities"
        options={{
          title: "Opportunities",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="briefcase" size={size} color={focused ? "#0300cf" : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="person" size={size} color={focused ? "#0300cf" : color} />
          ),
        }}
      />
    </Tabs>
  );
}