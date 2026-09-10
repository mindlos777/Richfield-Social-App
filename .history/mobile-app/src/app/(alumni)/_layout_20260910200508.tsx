import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#0300cf";

export default function AlumniLayout() {
  return (
    <Tabs
      screenOptions={{
      headerShown: true,
      headerTitle: () => (
          <Image
                source={require("../../../assets/images/richfield_logo.png")}
                style={{
                    width: 140,
                    height: 40,
                    resizeMode: "contain"
                }}
            />
            ),

        headerTitleAlign: "left",
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#999",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="network"
        options={{
          title: "Network",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="people-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="opportunities"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="briefcase-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}