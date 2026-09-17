import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
} from "expo-router";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  supabase,
} from "../../../lib/supabase";

import {
  useAuth,
} from "../../../auth/AuthContext";

const PRIMARY = "#0300cf";

type StaffProfileData = {
  user_id: string;
  staff_number: string | null;
  department: string | null;
  job_title: string | null;
  campus: string | null;
  verified: boolean;
};

function getInitials(
  name?: string | null
) {
  if (!name) {
    return "S";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "S";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[1].charAt(0)
  ).toUpperCase();
}

export default function StaffProfileScreen() {
  const {
    user,
    profile,
    signOut,
    refreshProfile,
    isStaffVerified,
  } = useAuth();

  const [
    staffProfile,
    setStaffProfile,
  ] = useState<StaffProfileData | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const loadStaffProfile =
    useCallback(
      async (
        showLoader = false
      ) => {
        if (!user) {
          setLoading(false);
          setRefreshing(false);
          return;
        }

        try {
          if (showLoader) {
            setLoading(true);
          }

          setErrorMessage(null);

          const {
            data,
            error,
          } = await supabase
            .from("staff_profiles")
            .select(
              `
              user_id,
              staff_number,
              department,
              job_title,
              campus,
              verified
            `
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (!data) {
            setStaffProfile(null);

            setErrorMessage(
              "Your Staff profile could not be found."
            );

            return;
          }

          setStaffProfile({
            user_id:
              data.user_id,

            staff_number:
              data.staff_number ??
              null,

            department:
              data.department ??
              null,

            job_title:
              data.job_title ??
              null,

            campus:
              data.campus ??
              null,

            verified:
              data.verified === true,
          });
        } catch (
          error: any
        ) {
          console.log(
            "Staff profile error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Unable to load your Staff profile."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [user]
    );

  useEffect(() => {
    loadStaffProfile(true);
  }, [loadStaffProfile]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel =
      supabase.channel(
        `staff-profile-${user.id}`
      );

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        async () => {
          await refreshProfile();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "staff_profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadStaffProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    user,
    loadStaffProfile,
    refreshProfile,
  ]);

  const handleRefresh =
    async () => {
      setRefreshing(true);

      try {
        await Promise.all([
          refreshProfile(),
          loadStaffProfile(),
        ]);
      } finally {
        setRefreshing(false);
      }
    };

  const performSignOut =
    async () => {
      try {
        setSigningOut(true);

        await signOut();

        router.replace(
          "/login"
        );
      } catch (
        error: any
      ) {
        console.log(
          "Staff logout error:",
          error
        );

        Alert.alert(
          "Sign out failed",
          error?.message ||
            "Unable to sign out. Please try again."
        );
      } finally {
        setSigningOut(false);
      }
    };

  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress:
            performSignOut,
        },
      ]
    );
  };

  const handleSettings = () => {
    /*
     * We have not created a dedicated
     * Staff Settings route yet.
     *
     * For now we keep the button functional
     * by showing the available account action.
     */

    Alert.alert(
      "Staff Settings",
      "Staff account settings will be available here.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress:
            handleSignOut,
        },
      ]
    );
  };

  const fullName =
    profile?.full_name?.trim() ||
    "Richfield Staff";

  const email =
    profile?.email ||
    user?.email ||
    "Not available";

  const verified =
    staffProfile?.verified ===
      true &&
    isStaffVerified;

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={PRIMARY}
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading Staff profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <ScrollView
        style={
          styles.screen
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              PRIMARY
            }
            colors={[
              PRIMARY,
            ]}
          />
        }
      >
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <View>
            <Text
              style={
                styles.eyebrow
              }
            >
              RICHFIELD STAFF
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Profile
            </Text>
          </View>

          <Pressable
            style={({
              pressed,
            }) => [
              styles.settingsButton,

              pressed && {
                opacity: 0.65,
              },
            ]}
            onPress={
              handleSettings
            }
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color="#111"
            />
          </Pressable>
        </View>

        {/* ERROR */}

        {!!errorMessage && (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={21}
              color="#B91C1C"
            />

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Profile information
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {errorMessage}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                loadStaffProfile(
                  true
                )
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {/* PROFILE CARD */}

        <View
          style={
            styles.profileCard
          }
        >
          <View
            style={
              styles.avatarContainer
            }
          >
            {profile?.avatar_url ? (
              <Image
                source={{
                  uri:
                    profile.avatar_url,
                }}
                style={
                  styles.avatarImage
                }
              />
            ) : (
              <View
                style={
                  styles.avatar
                }
              >
                <Text
                  style={
                    styles.avatarInitials
                  }
                >
                  {getInitials(
                    fullName
                  )}
                </Text>
              </View>
            )}

            {verified && (
              <View
                style={
                  styles.avatarVerified
                }
              >
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="#FFFFFF"
                />
              </View>
            )}
          </View>

          <Text
            style={
              styles.profileName
            }
          >
            {fullName}
          </Text>

          {!!profile?.username && (
            <Text
              style={
                styles.username
              }
            >
              @{profile.username}
            </Text>
          )}

          {verified ? (
            <View
              style={
                styles.verifiedBadge
              }
            >
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={PRIMARY}
              />

              <Text
                style={
                  styles.verifiedText
                }
              >
                Verified Richfield Staff
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.pendingBadge
              }
            >
              <Ionicons
                name="time-outline"
                size={14}
                color="#92400E"
              />

              <Text
                style={
                  styles.pendingText
                }
              >
                Verification required
              </Text>
            </View>
          )}

          {!!staffProfile?.job_title && (
            <Text
              style={
                styles.headline
              }
            >
              {
                staffProfile.job_title
              }
            </Text>
          )}

          {!!profile?.bio && (
            <Text
              style={
                styles.bio
              }
            >
              {profile.bio}
            </Text>
          )}

          {!!staffProfile?.campus && (
            <View
              style={
                styles.campusPill
              }
            >
              <Ionicons
                name="location-outline"
                size={14}
                color="#555"
              />

              <Text
                style={
                  styles.campusPillText
                }
              >
                {
                  staffProfile.campus
                }
              </Text>
            </View>
          )}
        </View>

        {/* STAFF INFORMATION */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Staff information
        </Text>

        <View
          style={
            styles.infoCard
          }
        >
          <InfoRow
            icon="briefcase-outline"
            label="Job title"
            value={
              staffProfile?.job_title ||
              "Not provided"
            }
          />

          <InfoRow
            icon="business-outline"
            label="Department"
            value={
              staffProfile?.department ||
              "Not provided"
            }
          />

          <InfoRow
            icon="location-outline"
            label="Campus"
            value={
              staffProfile?.campus ||
              "Not assigned"
            }
          />

          <InfoRow
            icon="card-outline"
            label="Staff number"
            value={
              staffProfile?.staff_number ||
              "Not available"
            }
          />
        </View>

        {/* ACCOUNT */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Account
        </Text>

        <View
          style={
            styles.infoCard
          }
        >
          <InfoRow
            icon="mail-outline"
            label="Richfield email"
            value={email}
          />

          <InfoRow
            icon="shield-checkmark-outline"
            label="Account role"
            value="Staff"
          />

          <InfoRow
            icon="checkmark-circle-outline"
            label="Account status"
            value={
              profile?.status
                ? profile.status
                    .charAt(0)
                    .toUpperCase() +
                  profile.status.slice(
                    1
                  )
                : "Unknown"
            }
            last
          />
        </View>

        {/* STAFF ACCESS */}

        <View
          style={
            styles.accessCard
          }
        >
          <View
            style={
              styles.accessIcon
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={23}
              color={PRIMARY}
            />
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.accessTitle
              }
            >
              Staff access
            </Text>

            <Text
              style={
                styles.accessText
              }
            >
              Your Staff account can
              access the Richfield
              community and directly
              communicate with Students
              and Alumni.
            </Text>
          </View>
        </View>

        {/* SETTINGS */}

        <Pressable
          style={({
            pressed,
          }) => [
            styles.settingsRow,

            pressed && {
              opacity: 0.65,
            },
          ]}
          onPress={
            handleSettings
          }
        >
          <View
            style={
              styles.rowIcon
            }
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={PRIMARY}
            />
          </View>

          <Text
            style={
              styles.settingsText
            }
          >
            Staff settings
          </Text>

          <Ionicons
            name="chevron-forward"
            size={19}
            color="#999"
          />
        </Pressable>

        {/* LOGOUT */}

        <Pressable
          style={({
            pressed,
          }) => [
            styles.logoutButton,

            pressed && {
              opacity: 0.7,
            },

            signingOut &&
              styles.logoutDisabled,
          ]}
          onPress={
            handleSignOut
          }
          disabled={
            signingOut
          }
        >
          {signingOut ? (
            <ActivityIndicator
              size="small"
              color="#DC2626"
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#DC2626"
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Sign Out
              </Text>
            </>
          )}
        </Pressable>

        <Text
          style={
            styles.footer
          }
        >
          Richfield Social Staff
          Account
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;

  value: string;

  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,

        last &&
          styles.infoRowLast,
      ]}
    >
      <View
        style={
          styles.infoIcon
        }
      >
        <Ionicons
          name={icon}
          size={20}
          color={PRIMARY}
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.infoValue
          }
          numberOfLines={
            label ===
            "Richfield email"
              ? 2
              : 1
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    screen: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 110,
    },

    header: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    eyebrow: {
      color: PRIMARY,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
    },

    title: {
      fontSize: 28,
      fontWeight: "800",
      color: "#111",
      marginTop: 3,
    },

    settingsButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#F5F5F7",
      alignItems: "center",
      justifyContent:
        "center",
    },

    errorBox: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 9,
      padding: 13,
      borderRadius: 13,
      backgroundColor:
        "#FEF2F2",
      borderWidth: 1,
      borderColor:
        "#FECACA",
      marginTop: 18,
    },

    errorTitle: {
      color: "#991B1B",
      fontSize: 12,
      fontWeight: "800",
    },

    errorText: {
      color: "#B91C1C",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },

    retryText: {
      color: "#B91C1C",
      fontSize: 11,
      fontWeight: "800",
    },

    profileCard: {
      alignItems: "center",
      marginTop: 24,
      padding: 24,
      borderRadius: 18,
      backgroundColor:
        "#F8F8FF",
      borderWidth: 1,
      borderColor:
        "#E5E5FF",
    },

    avatarContainer: {
      position: "relative",
    },

    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    avatarImage: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor:
        "#E5E7EB",
    },

    avatarInitials: {
      color: "#FFFFFF",
      fontSize: 27,
      fontWeight: "800",
    },

    avatarVerified: {
      position: "absolute",
      right: 0,
      bottom: 1,
      width: 25,
      height: 25,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      borderWidth: 3,
      borderColor:
        "#F8F8FF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    profileName: {
      fontSize: 21,
      fontWeight: "800",
      color: "#111",
      marginTop: 13,
      textAlign: "center",
    },

    username: {
      color: "#777",
      fontSize: 12,
      marginTop: 3,
    },

    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor:
        "#EEEEFF",
      marginTop: 9,
    },

    verifiedText: {
      color: PRIMARY,
      fontSize: 11,
      fontWeight: "800",
      marginLeft: 5,
    },

    pendingBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor:
        "#FEF3C7",
      marginTop: 9,
    },

    pendingText: {
      color: "#92400E",
      fontSize: 11,
      fontWeight: "800",
      marginLeft: 5,
    },

    headline: {
      color: "#444",
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 11,
    },

    bio: {
      color: "#666",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 8,
    },

    campusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor:
        "#EEEEF0",
      marginTop: 11,
    },

    campusPillText: {
      color: "#555",
      fontSize: 11,
      fontWeight: "600",
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
      marginTop: 27,
      marginBottom: 10,
    },

    infoCard: {
      borderWidth: 1,
      borderColor:
        "#EEEEEE",
      borderRadius: 15,
      paddingHorizontal: 15,
      backgroundColor:
        "#FFFFFF",
    },

    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEEEEE",
      paddingVertical: 14,
    },

    infoRowLast: {
      borderBottomWidth: 0,
    },

    infoIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    infoLabel: {
      color: "#888",
      fontSize: 11,
    },

    infoValue: {
      color: "#222",
      fontSize: 14,
      fontWeight: "600",
      marginTop: 2,
    },

    accessCard: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      padding: 15,
      borderRadius: 14,
      backgroundColor:
        "#F3F3FF",
      marginTop: 22,
    },

    accessIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        "#E6E6FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    accessTitle: {
      color: "#222",
      fontSize: 13,
      fontWeight: "800",
    },

    accessText: {
      color: "#666",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 3,
    },

    settingsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 24,
      padding: 14,
      borderRadius: 13,
      backgroundColor:
        "#F7F7F8",
    },

    rowIcon: {
      width: 37,
      height: 37,
      borderRadius: 11,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    settingsText: {
      flex: 1,
      color: "#222",
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 10,
    },

    logoutButton: {
      height: 50,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        "#FECACA",
      backgroundColor:
        "#FFF7F7",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
      marginTop: 22,
    },

    logoutDisabled: {
      opacity: 0.55,
    },

    logoutText: {
      color: "#DC2626",
      fontSize: 14,
      fontWeight: "800",
    },

    footer: {
      color: "#AAAAAA",
      fontSize: 10,
      textAlign: "center",
      marginTop: 22,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    loadingText: {
      color: "#777",
      fontSize: 13,
      marginTop: 12,
    },
  });