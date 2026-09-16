import React, {
  useEffect,
} from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Redirect,
  Tabs,
} from "expo-router";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useAuth,
} from "../../../auth/AuthContext";

const PRIMARY = "#0300cf";

export default function StaffTabsLayout() {
  const {
    user,
    profile,
    loading,
    isStaffVerified,
    staffVerificationLoading,
  } = useAuth();

  /*
   * LOADING
   */

  if (
    loading ||
    staffVerificationLoading
  ) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />

        <Text style={styles.loadingText}>
          Loading Staff account...
        </Text>
      </View>
    );
  }

  /*
   * NOT LOGGED IN
   */

  if (!user || !profile) {
    return (
      <Redirect
        href="/login"
      />
    );
  }

  /*
   * WRONG ROLE
   *
   * Student, Alumni, Business and other
   * account types cannot enter Staff tabs.
   */

  if (profile.role !== "staff") {
    if (
      profile.role === "admin"
    ) {
      return (
        <Redirect
          href="/(admin)/(tabs)/feed"
        />
      );
    }

    if (
      profile.role === "business"
    ) {
      return (
        <Redirect
          href="/(business-auth)/(tabs)/dashboard"
        />
      );
    }

    return (
      <Redirect
        href="/(tabs)"
      />
    );
  }

  /*
   * SUSPENDED STAFF
   */

  if (
    profile.status === "suspended"
  ) {
    return (
      <Redirect
        href="/login?error=suspended"
      />
    );
  }

  /*
   * PENDING / REJECTED STAFF
   */

  if (
    profile.status === "pending" ||
    profile.status === "rejected"
  ) {
    return (
      <Redirect
        href="/(staff)/pending"
      />
    );
  }

  /*
   * STAFF MUST BE ACTIVE
   */

  if (
    profile.status !== "active"
  ) {
    return (
      <Redirect
        href="/login?error=staff"
      />
    );
  }

  /*
   * ACTIVE BUT NOT VERIFIED
   *
   * This protects against someone manually
   * changing only profiles.status.
   */

  if (!isStaffVerified) {
    return (
      <Redirect
        href="/(staff)/pending"
      />
    );
  }

  /*
   * VERIFIED + ACTIVE STAFF
   */

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          PRIMARY,

        tabBarInactiveTintColor:
          "#8A8A8A",

        tabBarHideOnKeyboard:
          true,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },

        tabBarStyle: {
          height: 67,
          paddingTop: 6,
          backgroundColor:
            "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor:
            "#ECECEC",
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",

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
    </Tabs>
  );
}

const styles =
  StyleSheet.create({
    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "#FFFFFF",
    },

    loadingText: {
      marginTop: 12,
      color: "#6B7280",
      fontSize: 14,
    },
  });