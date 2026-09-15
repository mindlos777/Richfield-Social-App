import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
} from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type AdminProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  role: string | null;
  status: string | null;
};

export default function AdminProfileScreen() {
  const [
    profile,
    setProfile,
  ] =
    useState<AdminProfile | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const loadProfile =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const {
            data: {
              user,
            },
            error:
              authError,
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
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(`
                id,
                full_name,
                username,
                email,
                avatar_url,
                headline,
                bio,
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
            data?.role !==
            "admin"
          ) {
            Alert.alert(
              "Access denied",
              "Administrator access is required."
            );

            router.replace(
              "/(auth)/login"
            );

            return;
          }

          setProfile(
            data as AdminProfile
          );
        } catch (
          error: any
        ) {
          console.log(
            "Admin profile error:",
            error
          );

          Alert.alert(
            "Profile",
            error?.message ||
              "Could not load your profile."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(
      () => {
        loadProfile();
      },
      [
        loadProfile,
      ]
    )
  );

  function logout() {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        {
          text:
            "Cancel",
          style:
            "cancel",
        },

        {
          text:
            "Log out",
          style:
            "destructive",

          onPress:
            async () => {
              try {
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
                  "Logout failed",
                  error?.message ||
                    "Could not log out."
                );
              }
            },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={
            PRIMARY
          }
        />
      </SafeAreaView>
    );
  }

  const name =
    profile?.full_name ||
    "Richfield Administrator";

  return (
    <SafeAreaView
      style={
        styles.screen
      }
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={
            styles.header
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            Profile
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Richfield administration
          </Text>
        </View>

        <View
          style={
            styles.profileCard
          }
        >
          {profile?.avatar_url ? (
            <Image
              source={{
                uri:
                  profile.avatar_url,
              }}
              style={
                styles.avatar
              }
            />
          ) : (
            <View
              style={
                styles.avatarFallback
              }
            >
              <Text
                style={
                  styles.avatarText
                }
              >
                {getInitials(
                  name
                )}
              </Text>
            </View>
          )}

          <Text
            style={
              styles.name
            }
          >
            {name}
          </Text>

          {profile?.username ? (
            <Text
              style={
                styles.username
              }
            >
              @
              {profile.username.replace(
                /^@/,
                ""
              )}
            </Text>
          ) : null}

          <View
            style={
              styles.adminBadge
            }
          >
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={
                PRIMARY
              }
            />

            <Text
              style={
                styles.adminBadgeText
              }
            >
              Richfield Admin
            </Text>
          </View>

          {profile?.headline ? (
            <Text
              style={
                styles.headline
              }
            >
              {
                profile.headline
              }
            </Text>
          ) : null}

          {profile?.bio ? (
            <Text
              style={
                styles.bio
              }
            >
              {profile.bio}
            </Text>
          ) : null}
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Account
        </Text>

        <View
          style={
            styles.settingsCard
          }
        >
          <InfoRow
            icon="mail-outline"
            title="Email"
            value={
              profile?.email ||
              "Not available"
            }
          />

          <InfoRow
            icon="shield-outline"
            title="Role"
            value="Administrator"
          />

          <InfoRow
            icon="checkmark-circle-outline"
            title="Account status"
            value={
              profile?.status ||
              "active"
            }
            last
          />
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Administration
        </Text>

        <View
          style={
            styles.settingsCard
          }
        >
          <MenuRow
            icon="people-outline"
            title="Manage users"
            onPress={() =>
              router.push(
                "/(admin)/(tabs)/users"
              )
            }
          />

          <MenuRow
            icon="briefcase-outline"
            title="Manage opportunities"
            onPress={() =>
              router.push(
                "/(admin)/(tabs)/opportunities"
              )
            }
          />

          <MenuRow
            icon="calendar-outline"
            title="Manage content"
            onPress={() =>
              router.push(
                "/(admin)/(tabs)/events"
              )
            }
          />

          <MenuRow
            icon="settings-outline"
            title="Settings"
            onPress={() =>
              router.push(
                "/(admin)/settings"
              )
            }
            last
          />
        </View>

        <Pressable
          style={
            styles.logoutButton
          }
          onPress={
            logout
          }
        >
          <Ionicons
            name="log-out-outline"
            size={19}
            color="#B42318"
          />

          <Text
            style={
              styles.logoutText
            }
          >
            Log out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  title,
  value,
  last = false,
}: {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];

  title: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last &&
          styles.lastRow,
      ]}
    >
      <View
        style={
          styles.rowIcon
        }
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            PRIMARY
          }
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.infoTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.infoValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  onPress,
  last = false,
}: {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];

  title: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.infoRow,
        last &&
          styles.lastRow,
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.rowIcon
        }
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            PRIMARY
          }
        />
      </View>

      <Text
        style={
          styles.menuTitle
        }
      >
        {title}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#AAA"
      />
    </Pressable>
  );
}

function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(
        Boolean
      );

  if (
    parts.length === 0
  ) {
    return "R";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0]
      .charAt(0)
      .toUpperCase() +
    parts[
      parts.length - 1
    ]
      .charAt(0)
      .toUpperCase()
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F5F5F7",
    },

    loading: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#fff",
    },

    content: {
      paddingBottom: 100,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 18,
      backgroundColor:
        "#fff",
    },

    headerTitle: {
      color: "#111",
      fontSize: 25,
      fontWeight: "800",
    },

    headerSubtitle: {
      marginTop: 3,
      color: "#777",
      fontSize: 12,
    },

    profileCard: {
      alignItems:
        "center",
      backgroundColor:
        "#fff",
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 25,
      marginBottom: 20,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        "#ECECEE",
    },

    avatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor:
        "#eee",
    },

    avatarFallback: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
    },

    avatarText: {
      color: PRIMARY,
      fontSize: 28,
      fontWeight: "900",
    },

    name: {
      marginTop: 15,
      color: "#171717",
      fontSize: 21,
      fontWeight: "800",
      textAlign:
        "center",
    },

    username: {
      marginTop: 3,
      color: "#777",
      fontSize: 12,
    },

    adminBadge: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      backgroundColor:
        "#EEEEFF",
    },

    adminBadgeText: {
      color: PRIMARY,
      fontSize: 10,
      fontWeight: "800",
    },

    headline: {
      marginTop: 13,
      color: "#333",
      fontSize: 13,
      fontWeight: "600",
      textAlign:
        "center",
    },

    bio: {
      marginTop: 9,
      maxWidth: 330,
      color: "#666",
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        "center",
    },

    sectionTitle: {
      marginHorizontal: 18,
      marginBottom: 8,
      color: "#666",
      fontSize: 11,
      fontWeight: "800",
      textTransform:
        "uppercase",
    },

    settingsCard: {
      marginHorizontal: 16,
      marginBottom: 22,
      borderRadius: 12,
      backgroundColor:
        "#fff",
      overflow:
        "hidden",
    },

    infoRow: {
      minHeight: 64,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEEEF1",
    },

    lastRow: {
      borderBottomWidth: 0,
    },

    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
      backgroundColor:
        "#EEEEFF",
    },

    infoTitle: {
      color: "#333",
      fontSize: 12,
      fontWeight: "700",
    },

    infoValue: {
      marginTop: 2,
      color: "#777",
      fontSize: 11,
      textTransform:
        "capitalize",
    },

    menuTitle: {
      flex: 1,
      color: "#292929",
      fontSize: 13,
      fontWeight: "700",
    },

    logoutButton: {
      minHeight: 52,
      marginHorizontal: 16,
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor:
        "#F1C7C4",
      backgroundColor:
        "#FFF7F6",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    logoutText: {
      color: "#B42318",
      fontSize: 13,
      fontWeight: "800",
    },
  });