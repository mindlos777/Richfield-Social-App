import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#0300cf";

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#777",

        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
        },

        tabBarStyle: {
          height: 66,
          paddingBottom: 7,
          paddingTop: 6,
          borderTopColor: "#E8E8EC",
        },
      }}
    >
      {/* FEED */}
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
                  ? "newspaper"
                  : "newspaper-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* REVIEW */}
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "checkmark-done"
                  : "checkmark-done-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* EVENTS */}
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "calendar"
                  : "calendar-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* USERS */}
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",

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

      {/* ANALYTICS */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "bar-chart"
                  : "bar-chart-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* PROFILE */}
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
                  ? "person-circle"
                  : "person-circle-outline"
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* HIDDEN OPPORTUNITIES ROUTE */}
      <Tabs.Screen
        name="opportunities"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}