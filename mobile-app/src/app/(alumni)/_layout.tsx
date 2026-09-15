import { Tabs } from "expo-router";
import { Image, StyleSheet } from "react-native";
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
            style={styles.logo}
          />
        ),

        headerTitleAlign: "left",

        headerStyle: {
          backgroundColor: "#FFFFFF",
        },

        headerShadowVisible: false,

        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#8E8E93",

        tabBarStyle: {
          height: 66,
          paddingTop: 6,
          paddingBottom: 7,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8E8EC",
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "home"
                  : "home-outline"
              }
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

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "people"
                  : "people-outline"
              }
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

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "briefcase"
                  : "briefcase-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "chatbubble"
                  : "chatbubble-outline"
              }
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

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "person"
                  : "person-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Settings still exists, but is not shown in bottom navigation */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 140,
    height: 40,
    resizeMode: "contain",
  },
});