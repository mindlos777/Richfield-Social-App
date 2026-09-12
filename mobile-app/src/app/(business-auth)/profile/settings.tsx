import React from "react";

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useRouter,
} from "expo-router";

import { useAuth } from "../../../auth/AuthContext";

const PRIMARY = "#0300cf";

export default function BusinessSettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();

              router.replace(
                "/(auth)/login"
              );
            } catch {
              Alert.alert(
                "Error",
                "Unable to log out."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111"
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          Settings
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        <Text style={styles.sectionLabel}>
          Account
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="business-outline"
            title="Edit Company Profile"
          />

          <SettingItem
            icon="mail-outline"
            title="Email Address"
          />

          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
          />
        </View>

        <Text style={styles.sectionLabel}>
          Preferences
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
          />

          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy"
          />
        </View>

        <Text style={styles.sectionLabel}>
          Support
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
          />

          <SettingItem
            icon="document-text-outline"
            title="Terms & Conditions"
          />

          <SettingItem
            icon="information-circle-outline"
            title="About Richfield Connect"
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color="#D93025"
          />

          <Text style={styles.logoutText}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <View style={styles.icon}>
          <Ionicons
            name={icon}
            size={20}
            color={PRIMARY}
          />
        </View>

        <Text style={styles.itemTitle}>
          {title}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#AAA"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },

  header: {
    height: 60,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  title: {
    fontSize: 19,
    fontWeight: "800",
  },

  sectionLabel: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 9,
    fontSize: 13,
    fontWeight: "700",
    color: "#777",
  },

  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    borderRadius: 18,
    overflow: "hidden",
  },

  item: {
    minHeight: 62,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEEEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  logoutButton: {
    margin: 18,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutText: {
    color: "#D93025",
    fontWeight: "700",
  },
});