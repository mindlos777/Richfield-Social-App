import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

type Role =
  | "student"
  | "alumni"
  | "business"
  | "admin";

export default function SettingsScreen() {
  const [loading, setLoading] =
    useState(true);

  const [role, setRole] =
    useState<Role>("student");

  const [notifications, setNotifications] =
    useState(true);

  const [profileVisible, setProfileVisible] =
    useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (error) {
        throw error;
      }

      setRole(
        (data?.role || "student") as Role
      );
    } catch (error: any) {
      Alert.alert(
        "Settings",
        error?.message ||
          "Could not load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function changePassword() {
    Alert.alert(
      "Change password",
      "We will send a secure password reset link to your account email.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send link",
          onPress: sendPasswordReset,
        },
      ]
    );
  }

  async function sendPasswordReset() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error(
          "No account email was found."
        );
      }

      const { error } =
        await supabase.auth
          .resetPasswordForEmail(
            user.email
          );

      if (error) {
        throw error;
      }

      Alert.alert(
        "Email sent",
        "Check your email for the password reset link."
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ||
          "Could not send reset email."
      );
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  }

  async function logout() {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/login");
    } catch (error: any) {
      Alert.alert(
        "Logout failed",
        error?.message ||
          "Could not log out."
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </SafeAreaView>
    );
  }

  const isCommunity =
    role === "student" ||
    role === "alumni";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Settings
        </Text>

        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.roleCard}>
          <View style={styles.roleIcon}>
            <Ionicons
              name={
                role === "business"
                  ? "business"
                  : role === "admin"
                  ? "shield-checkmark"
                  : role === "alumni"
                  ? "school"
                  : "person"
              }
              size={23}
              color={PRIMARY}
            />
          </View>

          <View>
            <Text style={styles.roleLabel}>
              Account type
            </Text>

            <Text style={styles.role}>
              {role.charAt(0).toUpperCase() +
                role.slice(1)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Preferences
        </Text>

        <SettingSwitch
          icon="notifications-outline"
          title="Notifications"
          subtitle="Receive important activity updates"
          value={notifications}
          onChange={setNotifications}
        />

        {isCommunity && (
          <SettingSwitch
            icon="eye-outline"
            title="Profile visibility"
            subtitle="Allow other members to discover your profile"
            value={profileVisible}
            onChange={setProfileVisible}
          />
        )}

        <Text style={styles.sectionTitle}>
          Security
        </Text>

        <SettingButton
          icon="lock-closed-outline"
          title="Change password"
          subtitle="Reset your account password"
          onPress={changePassword}
        />

        <Text style={styles.sectionTitle}>
          Account
        </Text>

        {role === "business" && (
          <SettingButton
            icon="business-outline"
            title="Business account"
            subtitle="Company and verification information"
            onPress={() =>
              Alert.alert(
                "Business account",
                "Business verification information is managed by Richfield."
              )
            }
          />
        )}

        {role === "admin" && (
          <SettingButton
            icon="shield-outline"
            title="Administrator account"
            subtitle="Richfield administrator access"
            onPress={() =>
              Alert.alert(
                "Administrator",
                "Administrator permissions are controlled by Richfield."
              )
            }
          />
        )}

        <SettingButton
          icon="information-circle-outline"
          title="About Richfield Social"
          subtitle="Platform information"
          onPress={() =>
            Alert.alert(
              "Richfield Social",
              "A professional community connecting Richfield students, alumni and industry."
            )
          }
        />

        <Pressable
          style={styles.logout}
          onPress={confirmLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={21}
            color="#D00000"
          />

          <Text style={styles.logoutText}>
            Log out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingButton({
  icon,
  title,
  subtitle,
  onPress,
}: any) {
  return (
    <Pressable
      style={styles.setting}
      onPress={onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={21}
          color="#333"
        />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color="#AAA"
      />
    </Pressable>
  );
}

function SettingSwitch({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: any) {
  return (
    <View style={styles.setting}>
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={21}
          color="#333"
        />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: "#DDD",
          true: "#B8B7FF",
        }}
        thumbColor={
          value ? PRIMARY : "#FFF"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  container: {
    padding: 20,
    paddingBottom: 50,
  },

  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#F6F6FF",
    marginBottom: 28,
  },

  roleIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: "#E7E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  roleLabel: {
    color: "#777",
    fontSize: 12,
  },

  role: {
    color: "#111",
    fontWeight: "800",
    fontSize: 16,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#777",
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 8,
  },

  setting: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  settingIcon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  settingContent: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },

  settingSubtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  logout: {
    height: 55,
    borderRadius: 12,
    backgroundColor: "#FFF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 35,
  },

  logoutText: {
    color: "#D00000",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
});