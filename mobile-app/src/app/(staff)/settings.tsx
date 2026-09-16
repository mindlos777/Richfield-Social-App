import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  supabase,
} from "../../lib/supabase";

const PRIMARY = "#0300cf";

type AdminAccount = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

export default function AdminSettingsScreen() {
  const [
    profile,
    setProfile,
  ] =
    useState<AdminAccount | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    working,
    setWorking,
  ] = useState(false);

  const loadAdmin =
    useCallback(async () => {
      try {
        setLoading(true);

        const {
          data: {
            user,
          },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          router.replace(
            "/(auth)/login"
          );

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            email,
            role,
            status
          `)
          .eq(
            "id",
            user.id
          )
          .single();

        if (error) {
          throw error;
        }

        if (
          data?.role !== "admin"
        ) {
          Alert.alert(
            "Access denied",
            "Administrator access is required."
          );

          return;
        }

        setProfile(
          data as AdminAccount
        );
      } catch (error: any) {
        console.log(
          "Admin settings error:",
          error
        );

        Alert.alert(
          "Settings",
          error?.message ||
            "Could not load administrator settings."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdmin();
    }, [loadAdmin])
  );

  async function sendPasswordReset() {
    try {
      setWorking(true);

      const {
        data: {
          user,
        },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user?.email) {
        throw new Error(
          "No email address was found for this account."
        );
      }

      const {
        error,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            user.email
          );

      if (error) {
        throw error;
      }

      Alert.alert(
        "Reset Email Sent",
        `A password reset link was sent to ${user.email}.`
      );
    } catch (error: any) {
      Alert.alert(
        "Password Reset",
        error?.message ||
          "Could not send the password reset email."
      );
    } finally {
      setWorking(false);
    }
  }

  function changePassword() {
    Alert.alert(
      "Change Password",
      "Send a secure password reset link to your administrator email?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Send Link",
          onPress:
            sendPasswordReset,
        },
      ]
    );
  }

  function showAccount() {
    const username =
      profile?.username
        ? `@${profile.username.replace(
            /^@/,
            ""
          )}`
        : "Not available";

    Alert.alert(
      "Administrator Account",
      [
        `Name: ${
          profile?.full_name ||
          "Richfield Administrator"
        }`,

        `Username: ${username}`,

        `Email: ${
          profile?.email ||
          "Not available"
        }`,

        "Role: Administrator",

        `Status: ${
          profile?.status ||
          "active"
        }`,
      ].join("\n")
    );
  }

  function showPermissions() {
    Alert.alert(
      "Administrator Permissions",
      "Administrator permissions are controlled by Richfield through the account role and database security policies. They cannot be changed from the mobile app."
    );
  }

  function showSecurity() {
    Alert.alert(
      "Security",
      "Administrator authentication is handled through Supabase Auth. Administrative access is protected by account roles and database security policies."
    );
  }

  function showNotifications() {
    Alert.alert(
      "Admin Notifications",
      "Important account reviews, reports, opportunities and platform activity can appear in the administrator workflow."
    );
  }

  function showPrivacy() {
    Alert.alert(
      "Privacy & Data",
      "Administrator access should only be used for legitimate Richfield platform administration. User and business information must be handled according to Richfield privacy requirements and applicable data protection rules."
    );
  }

  function showHelp() {
    Alert.alert(
      "Admin Support",
      "For administrator account or permission problems, contact the authorised Richfield system administrator."
    );
  }

  function showAbout() {
    Alert.alert(
      "About Richfield Social",
      "The administrator interface provides Richfield with tools to manage users, review organisations and opportunities, moderate platform activity and publish official events."
    );
  }

  function handleLogout() {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of the administrator account?",
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
              setWorking(true);

              const {
                error,
              } =
                await supabase.auth.signOut();

              if (error) {
                throw error;
              }

              router.replace(
                "/(auth)/login"
              );
            } catch (
              error: any
            ) {
              Alert.alert(
                "Logout Failed",
                error?.message ||
                  "Could not log out."
              );
            } finally {
              setWorking(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </SafeAreaView>
    );
  }

  const adminName =
    profile?.full_name ||
    "Richfield Administrator";

  const accountStatus =
    profile?.status ||
    "active";

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
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

        <View
          style={{ width: 40 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={styles.adminCard}
        >
          <View
            style={styles.adminIcon}
          >
            <Ionicons
              name="shield-checkmark"
              size={28}
              color={PRIMARY}
            />
          </View>

          <View
            style={
              styles.adminContent
            }
          >
            <Text
              style={styles.adminName}
              numberOfLines={1}
            >
              {adminName}
            </Text>

            <Text
              style={styles.adminEmail}
              numberOfLines={1}
            >
              {profile?.email ||
                "Administrator"}
            </Text>

            <View
              style={styles.badgeRow}
            >
              <View
                style={
                  styles.adminBadge
                }
              >
                <Text
                  style={
                    styles.adminBadgeText
                  }
                >
                  ADMIN
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,

                  accountStatus ===
                  "active"
                    ? styles.activeBadge
                    : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,

                    accountStatus ===
                    "active"
                      ? styles.activeText
                      : styles.inactiveText,
                  ]}
                >
                  {accountStatus.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Account
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="person-outline"
            title="Admin Account"
            subtitle="View administrator information"
            onPress={showAccount}
          />

          <SettingItem
            icon="mail-outline"
            title="Email Address"
            subtitle={
              profile?.email ||
              "Administrator email"
            }
            onPress={() =>
              Alert.alert(
                "Email Address",
                profile?.email
                  ? `Your administrator email is:\n\n${profile.email}`
                  : "No email address is available."
              )
            }
          />

          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Send a secure reset link"
            onPress={
              changePassword
            }
          />
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Administration
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="key-outline"
            title="Permissions"
            subtitle="Administrator access information"
            onPress={
              showPermissions
            }
          />

          <SettingItem
            icon="people-outline"
            title="Manage Users"
            subtitle="View platform users"
            onPress={() =>
              router.push(
                "/(admin)/(tabs)/users"
              )
            }
          />

          <SettingItem
            icon="shield-checkmark-outline"
            title="Reviews"
            subtitle="Businesses, opportunities and reports"
            onPress={() =>
              router.push(
                "/(admin)/(tabs)/review"
              )
            }
          />

          <SettingItem
            icon="briefcase-outline"
            title="Opportunities"
            subtitle="Manage career opportunities"
            onPress={() =>
              router.push(
                "/(admin)/(tabs)/opportunities"
              )
            }
          />

          <SettingItem
            icon="calendar-outline"
            title="Events"
            subtitle="Create and manage official events"
            onPress={() =>
              router.push(
                "/(admin)/(tabs)/events"
              )
            }
          />
        </View>

        <View
          style={
            styles.securityNotice
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={PRIMARY}
          />

          <Text
            style={
              styles.securityNoticeText
            }
          >
            Administrator roles and
            permissions cannot be changed
            from this app. They are
            controlled by Richfield's
            backend security.
          </Text>
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Preferences
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Administrative activity information"
            onPress={
              showNotifications
            }
          />

          <SettingItem
            icon="shield-outline"
            title="Privacy & Data"
            subtitle="Administrator data responsibilities"
            onPress={showPrivacy}
          />

          <SettingItem
            icon="finger-print-outline"
            title="Security"
            subtitle="Authentication and role protection"
            onPress={showSecurity}
          />
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Support
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="Admin Support"
            subtitle="Administrator account assistance"
            onPress={showHelp}
          />

          <SettingItem
            icon="information-circle-outline"
            title="About Richfield Social"
            subtitle="About the administration platform"
            onPress={showAbout}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,

            working &&
              styles.disabled,
          ]}
          disabled={working}
          onPress={handleLogout}
        >
          {working ? (
            <ActivityIndicator
              size="small"
              color="#D93025"
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#D93025"
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Log Out
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text
          style={styles.version}
        >
          Richfield Social • Admin
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  subtitle?: string;

  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={styles.itemLeft}
      >
        <View style={styles.icon}>
          <Ionicons
            name={icon}
            size={20}
            color={PRIMARY}
          />
        </View>

        <View
          style={
            styles.itemContent
          }
        >
          <Text
            style={styles.itemTitle}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={
                styles.itemSubtitle
              }
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#AAA"
        />
      ) : null}
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F7F7FA",
    },

    loading: {
      flex: 1,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },

    content: {
      paddingBottom: 35,
    },

    header: {
      height: 60,
      paddingHorizontal: 18,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#EEEEF2",
    },

    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
    },

    title: {
      fontSize: 19,
      fontWeight: "800",
      color: "#111",
    },

    adminCard: {
      marginHorizontal: 18,
      marginTop: 20,
      padding: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
    },

    adminIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: "#EEEEFF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    adminContent: {
      flex: 1,
    },

    adminName: {
      color: "#111",
      fontSize: 15,
      fontWeight: "800",
    },

    adminEmail: {
      color: "#777",
      fontSize: 11,
      marginTop: 3,
    },

    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 7,
      gap: 6,
    },

    adminBadge: {
      backgroundColor: "#EEEEFF",
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    adminBadgeText: {
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "900",
    },

    statusBadge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    activeBadge: {
      backgroundColor: "#E8F8EF",
    },

    inactiveBadge: {
      backgroundColor: "#FFEAEA",
    },

    statusText: {
      fontSize: 9,
      fontWeight: "900",
    },

    activeText: {
      color: "#168653",
    },

    inactiveText: {
      color: "#C62828",
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
      minHeight: 66,
      paddingHorizontal: 15,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#F1F1F1",
    },

    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "#EEEEFF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 11,
    },

    itemContent: {
      flex: 1,
      paddingVertical: 4,
    },

    itemTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
    },

    itemSubtitle: {
      fontSize: 11,
      color: "#888",
      marginTop: 2,
    },

    securityNotice: {
      marginHorizontal: 18,
      marginTop: 12,
      backgroundColor: "#EEEEFF",
      borderRadius: 14,
      padding: 13,
      flexDirection: "row",
      alignItems: "flex-start",
    },

    securityNoticeText: {
      flex: 1,
      marginLeft: 8,
      color: "#666",
      fontSize: 11,
      lineHeight: 17,
    },

    logoutButton: {
      marginHorizontal: 18,
      marginTop: 28,
      minHeight: 55,
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

    disabled: {
      opacity: 0.5,
    },

    version: {
      textAlign: "center",
      fontSize: 10,
      color: "#AAA",
      marginTop: 18,
    },
  });