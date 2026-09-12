import { Tabs } from "expo-router";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#0300cf";

export default function BusinessTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => (
            <Image
                source={require("../../../../assets/images/richfield_logo.png")}
                style={{
                    width: 140,
                    height: 40,
                    resizeMode: "contain"
                }}
            />
            ),

        headerTitleAlign: "left",

        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#8A8A8A",

        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 7,
          borderTopWidth: 1,
          borderTopColor: "#E8E8E8",
          backgroundColor: "#FFFFFF",
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
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
        name="jobs"
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
        name="applicants"
        options={{
          title: "Applicants",
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
    </Tabs>
  );
}