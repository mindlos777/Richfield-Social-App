import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
        11
        height: 70,
        12
        paddingBottom: 10,
        13
        paddingTop: 10,
        14
        },
        15
         
        16
        tabBarActiveTintColor: "#fff",
        17
        tabBarInactiveTintColor: "#64748b"
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="home" size={size} color={focused ? "#fff" : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="post"
        options={{
          title: "Create Post",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="add" size={size} color={focused ? "#fff" : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="opportunities"
        options={{
          title: "Opportunities",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="briefcase" size={size} color={focused ? "#fff" : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name="person" size={size} color={focused ? "#fff" : color} />
          ),
        }}
      />
    </Tabs>
  );
}