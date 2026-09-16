import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
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
  useLocalSearchParams,
} from "expo-router";

import {
  supabase,
} from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type ProfileData = {
  id: string;
  full_name: string | null;
  username: string | null;
  headline: string | null;
  avatar_url: string | null;
  role: string | null;
  status: string | null;
};

type BusinessData = {
  user_id: string;
  organisation_name: string | null;
  industry: string | null;
  company_description: string | null;
  location: string | null;
  company_website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  talent_interests: string[];
};

function getInitials(
  value: string | null
) {
  if (!value) {
    return "CO";
  }

  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "CO";
  }

  if (words.length === 1) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    words[0]
      .charAt(0)
      .toUpperCase() +
    words[
      words.length - 1
    ]
      .charAt(0)
      .toUpperCase()
  );
}

export default function BusinessProfileScreen() {
  const params =
    useLocalSearchParams<{
      id?: string;
      userId?: string;
    }>();

  const [
    profile,
    setProfile,
  ] =
    useState<
      ProfileData | null
    >(null);

  const [
    business,
    setBusiness,
  ] =
    useState<
      BusinessData | null
    >(null);

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    chatOpening,
    setChatOpening,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    stats,
    setStats,
  ] =
    useState({
      opportunities: 0,
      followers: 0,
    });

  const loadProfile =
    useCallback(
      async () => {
        try {
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
              "/login"
            );

            return;
          }

          setCurrentUserId(
            user.id
          );

          const requestedId =
            typeof params.id ===
            "string"
              ? params.id
              : typeof params.userId ===
                  "string"
                ? params.userId
                : user.id;

          const {
            data:
              profileData,
            error:
              profileError,
          } =
            await supabase
              .from(
                "profiles"
              )
              .select(`
                id,
                full_name,
                username,
                headline,
                avatar_url,
                role,
                status
              `)
              .eq(
                "id",
                requestedId
              )
              .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (!profileData) {
            throw new Error(
              "Business account could not be found."
            );
          }

          if (
            profileData.role !==
            "business"
          ) {
            throw new Error(
              "This is not a business profile."
            );
          }

          setProfile(
            profileData as ProfileData
          );

          const {
            data:
              businessData,
            error:
              businessError,
          } =
            await supabase
              .from(
                "business_profiles"
              )
              .select(`
                user_id,
                organisation_name,
                industry,
                company_description,
                location,
                company_website,
                contact_email,
                contact_phone,
                talent_interests
              `)
              .eq(
                "user_id",
                requestedId
              )
              .maybeSingle();

          if (businessError) {
            throw businessError;
          }

          if (businessData) {
            setBusiness({
              ...businessData,

              talent_interests:
                businessData
                  .talent_interests ||
                [],
            } as BusinessData);
          } else {
            setBusiness({
              user_id:
                requestedId,

              organisation_name:
                profileData.full_name ||
                "Organisation",

              industry:
                null,

              company_description:
                null,

              location:
                null,

              company_website:
                null,

              contact_email:
                null,

              contact_phone:
                null,

              talent_interests:
                [],
            });
          }

          const [
            opportunityResult,
            followerResult,
          ] =
            await Promise.all([
              supabase
                .from(
                  "opportunities"
                )
                .select(
                  "id",
                  {
                    count:
                      "exact",
                    head:
                      true,
                  }
                )
                .eq(
                  "business_id",
                  requestedId
                )
                .eq(
                  "status",
                  "approved"
                ),

              supabase
                .from(
                  "follows"
                )
                .select(
                  "id",
                  {
                    count:
                      "exact",
                    head:
                      true,
                  }
                )
                .eq(
                  "following_id",
                  requestedId
                ),
            ]);

          setStats({
            opportunities:
              opportunityResult.count ||
              0,

            followers:
              followerResult.count ||
              0,
          });
        } catch (
          error: any
        ) {
          console.log(
            "Business profile error:",
            error
          );

          Alert.alert(
            "Business profile",
            error?.message ||
              "Could not load the business profile."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        params.id,
        params.userId,
      ]
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

  async function refresh() {
    setRefreshing(true);

    await loadProfile();
  }

  async function openWebsite() {
    if (
      !business
        ?.company_website
    ) {
      return;
    }

    let url =
      business
        .company_website
        .trim();

    if (
      !url.startsWith(
        "http://"
      ) &&
      !url.startsWith(
        "https://"
      )
    ) {
      url =
        `https://${url}`;
    }

    try {
      await Linking.openURL(
        url
      );
    } catch {
      Alert.alert(
        "Website",
        "Could not open this website."
      );
    }
  }

  async function openEmail() {
    if (
      !business
        ?.contact_email
    ) {
      return;
    }

    try {
      await Linking.openURL(
        `mailto:${business.contact_email}`
      );
    } catch {
      Alert.alert(
        "Email",
        "Could not open the email application."
      );
    }
  }

  async function openPhone() {
    if (
      !business
        ?.contact_phone
    ) {
      return;
    }

    try {
      await Linking.openURL(
        `tel:${business.contact_phone}`
      );
    } catch {
      Alert.alert(
        "Phone",
        "Could not open the phone application."
      );
    }
  }

  async function openChat() {
    if (
      !profile ||
      currentUserId ===
        profile.id
    ) {
      return;
    }

    try {
      setChatOpening(
        true
      );

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "open_direct_conversation",
          {
            p_other_user_id:
              profile.id,
          }
        );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Conversation could not be created."
        );
      }

      router.push({
        pathname:
          "/conversation",

        params: {
          id: data,

          name:
            business
              ?.organisation_name ||
            profile.full_name ||
            "Business",

          username:
            profile.username ||
            "",

          image:
            profile.avatar_url ||
            "",

          online:
            "false",

          role:
            "business",

          isMentor:
            "false",

          blocked:
            "false",
        },
      });
    } catch (
      error: any
    ) {
      Alert.alert(
        "Chat",
        error?.message ||
          "Could not open this conversation."
      );
    } finally {
      setChatOpening(
        false
      );
    }
  }

  function handleLogout() {
    if (loggingOut) {
      return;
    }

    Alert.alert(
      "Log out",
      "Are you sure you want to log out of your business account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style:
            "destructive",

          onPress:
            performLogout,
        },
      ]
    );
  }

  async function performLogout() {
    try {
      setLoggingOut(
        true
      );

      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace(
        "/login"
      );
    } catch (
      error: any
    ) {
      console.log(
        "Logout error:",
        error
      );

      Alert.alert(
        "Log out failed",
        error?.message ||
          "Could not log out. Please try again."
      );
    } finally {
      setLoggingOut(
        false
      );
    }
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

        <Text
          style={
            styles.loadingText
          }
        >
          Loading company profile...
        </Text>
      </SafeAreaView>
    );
  }

  if (
    !profile ||
    !business
  ) {
    return (
      <SafeAreaView
        style={
          styles.loading
        }
      >
        <Ionicons
          name="business-outline"
          size={45}
          color="#aaa"
        />

        <Text
          style={
            styles.notFoundTitle
          }
        >
          Business profile unavailable
        </Text>
      </SafeAreaView>
    );
  }

  const isOwnProfile =
    profile.id ===
    currentUserId;

  const organisation =
    business
      .organisation_name ||
    profile.full_name ||
    "Organisation";

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        "bottom",
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              refresh
            }
            tintColor={
              PRIMARY
            }
          />
        }
      >
        <View
          style={
            styles.cover
          }
        >
          <View
            style={
              styles.circleOne
            }
          />

          <View
            style={
              styles.circleTwo
            }
          />
        </View>

        <View
          style={
            styles.logoContainer
          }
        >
          {profile.avatar_url ? (
            <Image
              source={{
                uri:
                  profile.avatar_url,
              }}
              style={
                styles.logo
              }
            />
          ) : (
            <View
              style={
                styles.logoFallback
              }
            >
              <Text
                style={
                  styles.logoText
                }
              >
                {getInitials(
                  organisation
                )}
              </Text>
            </View>
          )}

          {profile.status ===
          "active" ? (
            <View
              style={
                styles.verified
              }
            >
              <Ionicons
                name="checkmark"
                size={13}
                color="#fff"
              />
            </View>
          ) : null}
        </View>

        <View
          style={
            styles.content
          }
        >
          <View
            style={
              styles.nameRow
            }
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.organisation
                }
              >
                {
                  organisation
                }
              </Text>

              <Text
                style={
                  styles.industry
                }
              >
                {business.industry ||
                  "Industry Partner"}
              </Text>
            </View>

            {isOwnProfile ? (
              <Pressable
                style={
                  styles.editIcon
                }
                onPress={() =>
                  router.push(
                    "/edit-profile"
                  )
                }
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={
                    PRIMARY
                  }
                />
              </Pressable>
            ) : null}
          </View>

          {business.location ? (
            <View
              style={
                styles.locationRow
              }
            >
              <Ionicons
                name="location-outline"
                size={16}
                color="#777"
              />

              <Text
                style={
                  styles.locationText
                }
              >
                {
                  business.location
                }
              </Text>
            </View>
          ) : null}

          <View
            style={
              styles.stats
            }
          >
            <View
              style={
                styles.stat
              }
            >
              <Text
                style={
                  styles.statValue
                }
              >
                {
                  stats.opportunities
                }
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Opportunities
              </Text>
            </View>

            <View
              style={
                styles.divider
              }
            />

            <View
              style={
                styles.stat
              }
            >
              <Text
                style={
                  styles.statValue
                }
              >
                {
                  stats.followers
                }
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Followers
              </Text>
            </View>

            <View
              style={
                styles.divider
              }
            />

            <View
              style={
                styles.stat
              }
            >
              <Ionicons
                name="shield-checkmark"
                size={21}
                color={
                  PRIMARY
                }
              />

              <Text
                style={
                  styles.statLabel
                }
              >
                Business
              </Text>
            </View>
          </View>

          {isOwnProfile ? (
            <Pressable
              style={
                styles.primaryButton
              }
              onPress={() =>
                router.push(
                  "/edit-profile"
                )
              }
            >
              <Ionicons
                name="create-outline"
                size={19}
                color="#fff"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Edit company profile
              </Text>
            </Pressable>
          ) : (
            <View
              style={
                styles.actionRow
              }
            >
              <Pressable
                style={
                  styles.messageButton
                }
                onPress={
                  openChat
                }
                disabled={
                  chatOpening
                }
              >
                {chatOpening ? (
                  <ActivityIndicator
                    color="#fff"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={19}
                      color="#fff"
                    />

                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Message
                    </Text>
                  </>
                )}
              </Pressable>

              {business.company_website ? (
                <Pressable
                  style={
                    styles.websiteButton
                  }
                  onPress={
                    openWebsite
                  }
                >
                  <Ionicons
                    name="globe-outline"
                    size={19}
                    color={
                      PRIMARY
                    }
                  />

                  <Text
                    style={
                      styles.websiteText
                    }
                  >
                    Website
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              About
            </Text>

            <Text
              style={
                styles.description
              }
            >
              {business.company_description ||
                "This organisation has not added a company description yet."}
            </Text>
          </View>

          {business
            .talent_interests
            .length >
          0 ? (
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Talent we're looking for
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Skills and graduate
                talent this organisation
                is interested in.
              </Text>

              <View
                style={
                  styles.tags
                }
              >
                {business
                  .talent_interests
                  .map(
                    item => (
                      <View
                        key={
                          item
                        }
                        style={
                          styles.tag
                        }
                      >
                        <Text
                          style={
                            styles.tagText
                          }
                        >
                          {
                            item
                          }
                        </Text>
                      </View>
                    )
                  )}
              </View>
            </View>
          ) : null}

          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Contact
            </Text>

            {business.contact_email ? (
              <ContactRow
                icon="mail-outline"
                label="Email"
                value={
                  business.contact_email
                }
                onPress={
                  openEmail
                }
              />
            ) : null}

            {business.contact_phone ? (
              <ContactRow
                icon="call-outline"
                label="Phone"
                value={
                  business.contact_phone
                }
                onPress={
                  openPhone
                }
              />
            ) : null}

            {business.company_website ? (
              <ContactRow
                icon="globe-outline"
                label="Website"
                value={
                  business.company_website
                }
                onPress={
                  openWebsite
                }
              />
            ) : null}

            {business.location ? (
              <ContactRow
                icon="location-outline"
                label="Location"
                value={
                  business.location
                }
              />
            ) : null}
          </View>

          {isOwnProfile ? (
            <View
              style={
                styles.accountSection
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Account
              </Text>

              <Pressable
                style={
                  styles.logoutButton
                }
                onPress={
                  handleLogout
                }
                disabled={
                  loggingOut
                }
              >
                <View
                  style={
                    styles.logoutIcon
                  }
                >
                  {loggingOut ? (
                    <ActivityIndicator
                      size="small"
                      color="#D32F2F"
                    />
                  ) : (
                    <Ionicons
                      name="log-out-outline"
                      size={21}
                      color="#D32F2F"
                    />
                  )}
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.logoutTitle
                    }
                  >
                    {loggingOut
                      ? "Logging out..."
                      : "Log out"}
                  </Text>

                  <Text
                    style={
                      styles.logoutDescription
                    }
                  >
                    Sign out of your
                    business account
                  </Text>
                </View>

                {!loggingOut ? (
                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color="#D32F2F"
                  />
                ) : null}
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: any;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={
        !onPress
      }
      onPress={
        onPress
      }
      style={
        styles.contactRow
      }
    >
      <View
        style={
          styles.contactIcon
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
            styles.contactLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.contactValue
          }
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>

      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#999"
        />
      ) : null}
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F6F7FA",
    },

    loading: {
      flex: 1,
      backgroundColor:
        "#F6F7FA",
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 30,
    },

    loadingText: {
      marginTop: 10,
      color: "#777",
    },

    notFoundTitle: {
      marginTop: 12,
      fontWeight: "800",
      fontSize: 17,
    },

    cover: {
      height: 150,
      backgroundColor:
        PRIMARY,
      overflow: "hidden",
    },

    circleOne: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      right: -50,
      top: -70,
      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    circleTwo: {
      position: "absolute",
      width: 130,
      height: 130,
      borderRadius: 65,
      left: -50,
      bottom: -70,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    logoContainer: {
      width: 104,
      height: 104,
      marginLeft: 20,
      marginTop: -50,
    },

    logo: {
      width: 104,
      height: 104,
      borderRadius: 24,
      borderWidth: 5,
      borderColor:
        "#F6F7FA",
      backgroundColor:
        "#fff",
    },

    logoFallback: {
      width: 104,
      height: 104,
      borderRadius: 24,
      borderWidth: 5,
      borderColor:
        "#F6F7FA",
      backgroundColor:
        "#fff",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    logoText: {
      fontWeight: "900",
      fontSize: 28,
      color: PRIMARY,
    },

    verified: {
      position: "absolute",
      right: -2,
      bottom: 2,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      borderWidth: 3,
      borderColor:
        "#F6F7FA",
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    content: {
      paddingHorizontal: 20,
      paddingBottom: 110,
    },

    nameRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems:
        "flex-start",
    },

    organisation: {
      fontSize: 25,
      fontWeight: "900",
      color: "#111",
    },

    industry: {
      fontSize: 13,
      color: "#666",
      marginTop: 4,
    },

    editIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        "#ECECFF",
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    locationRow: {
      flexDirection: "row",
      alignItems:
        "center",
      gap: 5,
      marginTop: 9,
    },

    locationText: {
      color: "#777",
      fontSize: 12,
    },

    stats: {
      marginTop: 20,
      minHeight: 79,
      borderRadius: 16,
      backgroundColor:
        "#fff",
      borderWidth: 1,
      borderColor:
        "#E9E9EF",
      flexDirection: "row",
      alignItems:
        "center",
    },

    stat: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    statValue: {
      fontSize: 19,
      fontWeight: "900",
      color: "#111",
    },

    statLabel: {
      marginTop: 3,
      fontSize: 10,
      color: "#777",
      fontWeight: "600",
    },

    divider: {
      width: 1,
      height: 38,
      backgroundColor:
        "#E7E7ED",
    },

    primaryButton: {
      minHeight: 51,
      marginTop: 15,
      borderRadius: 14,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    messageButton: {
      flex: 1,
      minHeight: 51,
      borderRadius: 14,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    primaryButtonText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "800",
    },

    actionRow: {
      flexDirection: "row",
      gap: 9,
      marginTop: 15,
    },

    websiteButton: {
      flex: 1,
      minHeight: 51,
      borderRadius: 14,
      backgroundColor:
        "#ECECFF",
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
    },

    websiteText: {
      color: PRIMARY,
      fontWeight: "800",
      fontSize: 13,
    },

    section: {
      marginTop: 27,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: "#171717",
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 11,
      color: "#888",
    },

    description: {
      marginTop: 10,
      color: "#555",
      lineHeight: 21,
      fontSize: 13.5,
    },

    tags: {
      marginTop: 13,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },

    tag: {
      backgroundColor:
        "#EEEEFF",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },

    tagText: {
      color: PRIMARY,
      fontWeight: "700",
      fontSize: 11,
    },

    contactRow: {
      minHeight: 61,
      marginTop: 9,
      paddingHorizontal: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        "#ECECF1",
      backgroundColor:
        "#fff",
      flexDirection: "row",
      alignItems:
        "center",
      gap: 10,
    },

    contactIcon: {
      width: 37,
      height: 37,
      borderRadius: 11,
      backgroundColor:
        "#EEEEFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    contactLabel: {
      fontSize: 9,
      color: "#999",
      textTransform:
        "uppercase",
      fontWeight: "700",
    },

    contactValue: {
      marginTop: 2,
      fontSize: 12,
      color: "#333",
      fontWeight: "600",
    },

    accountSection: {
      marginTop: 32,
      paddingTop: 5,
    },

    logoutButton: {
      minHeight: 68,
      marginTop: 11,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#FFD4D4",
      backgroundColor: "#FFF8F8",
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },

    logoutIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "#FFE8E8",
      alignItems: "center",
      justifyContent: "center",
    },

    logoutTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: "#D32F2F",
    },

    logoutDescription: {
      marginTop: 2,
      fontSize: 10.5,
      color: "#888",
    },
  });