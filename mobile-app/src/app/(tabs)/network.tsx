import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
  useFocusEffect,
} from "expo-router";

import type {
  User,
} from "@supabase/supabase-js";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  supabase,
} from "../../lib/supabase";

const PRIMARY = "#0300cf";

type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: UserRole | null;
  avatar_url: string | null;
  bio: string | null;
};

type RoleFilter =
  | "all"
  | "student"
  | "alumni"
  | "business";

const roleFilters: {
  id: RoleFilter;
  label: string;
}[] = [
  {
    id: "all",
    label: "Everyone",
  },
  {
    id: "student",
    label: "Students",
  },
  {
    id: "alumni",
    label: "Alumni",
  },
  {
    id: "business",
    label: "Businesses",
  },
];

function getInitials(
  name: string | null
) {
  if (!name) {
    return "U";
  }

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "U";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0]
    .charAt(0)
    .toUpperCase()}${parts[
    parts.length - 1
  ]
    .charAt(0)
    .toUpperCase()}`;
}

function getRoleLabel(
  role: UserRole | null
) {
  switch (role) {
    case "student":
      return "Student";

    case "alumni":
      return "Alumni";

    case "business":
      return "Business";

    case "admin":
      return "Admin";

    default:
      return "Member";
  }
}

function getRoleIcon(
  role: UserRole | null
): keyof typeof Ionicons.glyphMap {
  switch (role) {
    case "student":
      return "school-outline";

    case "alumni":
      return "ribbon-outline";

    case "business":
      return "briefcase-outline";

    case "admin":
      return "shield-checkmark-outline";

    default:
      return "person-outline";
  }
}

export default function NetworkScreen() {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    profiles,
    setProfiles,
  ] =
    useState<Profile[]>(
      []
    );

  const [
    following,
    setFollowing,
  ] =
    useState<string[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState<RoleFilter>(
      "all"
    );

  const [
    followLoading,
    setFollowLoading,
  ] =
    useState<string[]>(
      []
    );

  const loadProfiles =
    useCallback(
      async (
        userId: string
      ) => {
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
              role,
              avatar_url,
              bio
            `)
            .neq(
              "id",
              userId
            )
            .eq(
              "status",
              "active"
            )
            .in(
              "role",
              [
                "student",
                "alumni",
                "business",
              ]
            )
            .order(
              "full_name",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          throw error;
        }

        setProfiles(
          (data || []) as Profile[]
        );
      },
      []
    );

  const loadFollowing =
    useCallback(
      async (
        userId: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "follows"
            )
            .select(
              "following_id"
            )
            .eq(
              "follower_id",
              userId
            );

        if (error) {
          throw error;
        }

        setFollowing(
          (
            data || []
          ).map(
            item =>
              item.following_id
          )
        );
      },
      []
    );

  const loadNetwork =
    useCallback(
      async (
        showLoader = false
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (
            userError
          ) {
            throw userError;
          }

          if (!user) {
            setCurrentUser(
              null
            );

            setProfiles(
              []
            );

            setFollowing(
              []
            );

            return;
          }

          setCurrentUser(
            user
          );

          await Promise.all([
            loadProfiles(
              user.id
            ),

            loadFollowing(
              user.id
            ),
          ]);
        } catch (
          error: any
        ) {
          console.log(
            "Network error:",
            error
          );

          Alert.alert(
            "Network error",
            error?.message ||
              "Could not load the network."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        loadFollowing,
        loadProfiles,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      loadNetwork(
        true
      );
    }, [
      loadNetwork,
    ])
  );

  useEffect(() => {
    if (
      !currentUser
    ) {
      return;
    }

    /*
      Hackathon realtime:

      We are using Supabase
      Postgres Changes.

      "profiles" and "follows"
      must be included in the
      supabase_realtime publication.
    */

    const profilesChannel =
      supabase
        .channel(
          "network-profiles"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "profiles",
          },
          async payload => {
            console.log(
              "Network profile change:",
              payload.eventType
            );

            await loadProfiles(
              currentUser.id
            );
          }
        )
        .subscribe(
          status => {
            console.log(
              "Network profiles realtime:",
              status
            );
          }
        );

    const followsChannel =
      supabase
        .channel(
          `network-follows-${currentUser.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "follows",

            filter:
              `follower_id=eq.${currentUser.id}`,
          },
          async payload => {
            console.log(
              "Network follow change:",
              payload.eventType
            );

            await loadFollowing(
              currentUser.id
            );
          }
        )
        .subscribe(
          status => {
            console.log(
              "Network follows realtime:",
              status
            );
          }
        );

    return () => {
      supabase.removeChannel(
        profilesChannel
      );

      supabase.removeChannel(
        followsChannel
      );
    };
  }, [
    currentUser,
    loadFollowing,
    loadProfiles,
  ]);

  const refresh =
    useCallback(
      async () => {
        setRefreshing(
          true
        );

        await loadNetwork(
          false
        );
      },
      [
        loadNetwork,
      ]
    );

  const toggleFollow =
    async (
      profileId: string
    ) => {
      if (
        !currentUser
      ) {
        return;
      }

      if (
        followLoading.includes(
          profileId
        )
      ) {
        return;
      }

      const isFollowing =
        following.includes(
          profileId
        );

      setFollowLoading(
        previous => [
          ...previous,
          profileId,
        ]
      );

      try {
        /*
          Optimistic UI update.

          The button changes immediately,
          then Supabase saves the change.
        */

        if (
          isFollowing
        ) {
          setFollowing(
            previous =>
              previous.filter(
                id =>
                  id !==
                  profileId
              )
          );

          const {
            error,
          } =
            await supabase
              .from(
                "follows"
              )
              .delete()
              .eq(
                "follower_id",
                currentUser.id
              )
              .eq(
                "following_id",
                profileId
              );

          if (error) {
            throw error;
          }
        } else {
          setFollowing(
            previous =>
              previous.includes(
                profileId
              )
                ? previous
                : [
                    ...previous,
                    profileId,
                  ]
          );

          const {
            error,
          } =
            await supabase
              .from(
                "follows"
              )
              .insert({
                follower_id:
                  currentUser.id,

                following_id:
                  profileId,
              });

          if (error) {
            /*
              23505 means duplicate row.

              If the relationship already
              exists in Supabase, we can
              safely treat it as followed.
            */

            if (
              error.code !==
              "23505"
            ) {
              throw error;
            }
          }
        }
      } catch (
        error: any
      ) {
        console.log(
          "Follow error:",
          error
        );

        /*
          Restore the actual backend state
          if the optimistic update failed.
        */

        await loadFollowing(
          currentUser.id
        );

        Alert.alert(
          "Unable to update",
          error?.message ||
            "Something went wrong."
        );
      } finally {
        setFollowLoading(
          previous =>
            previous.filter(
              id =>
                id !==
                profileId
            )
        );
      }
    };

  const openProfile =
    (
      profile: Profile
    ) => {
      router.push({
        pathname:
          "/(tabs)/profile",

        params: {
          userId:
            profile.id,
        },
      });
    };

  const filteredProfiles =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return profiles.filter(
        profile => {
          const name =
            profile.full_name
              ?.toLowerCase() ||
            "";

          const username =
            profile.username
              ?.toLowerCase() ||
            "";

          const bio =
            profile.bio
              ?.toLowerCase() ||
            "";

          const role =
            profile.role
              ?.toLowerCase() ||
            "";

          const matchesSearch =
            !searchValue ||
            name.includes(
              searchValue
            ) ||
            username.includes(
              searchValue
            ) ||
            bio.includes(
              searchValue
            ) ||
            role.includes(
              searchValue
            );

          const matchesRole =
            roleFilter ===
              "all" ||
            profile.role ===
              roleFilter;

          return (
            matchesSearch &&
            matchesRole
          );
        }
      );
    }, [
      profiles,
      search,
      roleFilter,
    ]);

  const renderProfile =
    ({
      item,
    }: {
      item: Profile;
    }) => {
      const isFollowing =
        following.includes(
          item.id
        );

      const isUpdating =
        followLoading.includes(
          item.id
        );

      return (
        <TouchableOpacity
          style={
            styles.card
          }
          onPress={() =>
            openProfile(
              item
            )
          }
          activeOpacity={
            0.8
          }
        >
          <View
            style={
              styles.avatarContainer
            }
          >
            {item.avatar_url ? (
              <Image
                source={{
                  uri:
                    item.avatar_url,
                }}
                style={
                  styles.avatar
                }
              />
            ) : (
              <View
                style={
                  styles.avatarPlaceholder
                }
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {getInitials(
                    item.full_name
                  )}
                </Text>
              </View>
            )}
          </View>

          <View
            style={
              styles.profileInfo
            }
          >
            <Text
              style={
                styles.name
              }
              numberOfLines={
                1
              }
            >
              {item.full_name ||
                "Richfield Member"}
            </Text>

            {item.username ? (
              <Text
                style={
                  styles.username
                }
                numberOfLines={
                  1
                }
              >
                @
                {
                  item.username
                }
              </Text>
            ) : null}

            <View
              style={
                styles.roleContainer
              }
            >
              <Ionicons
                name={
                  getRoleIcon(
                    item.role
                  )
                }
                size={11}
                color={
                  PRIMARY
                }
              />

              <Text
                style={
                  styles.role
                }
              >
                {getRoleLabel(
                  item.role
                )}
              </Text>
            </View>

            {item.bio ? (
              <Text
                style={
                  styles.bio
                }
                numberOfLines={
                  2
                }
              >
                {item.bio}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.followButton,

              isFollowing &&
                styles.followingButton,

              isUpdating &&
                styles.followButtonDisabled,
            ]}
            disabled={
              isUpdating
            }
            onPress={
              event => {
                event.stopPropagation();

                toggleFollow(
                  item.id
                );
              }
            }
          >
            {isUpdating ? (
              <ActivityIndicator
                size="small"
                color={
                  isFollowing
                    ? PRIMARY
                    : "#FFFFFF"
                }
              />
            ) : (
              <>
                <Ionicons
                  name={
                    isFollowing
                      ? "checkmark"
                      : "person-add-outline"
                  }
                  size={16}
                  color={
                    isFollowing
                      ? PRIMARY
                      : "#FFFFFF"
                  }
                />

                <Text
                  style={[
                    styles.followText,

                    isFollowing &&
                      styles.followingText,
                  ]}
                >
                  {isFollowing
                    ? "Following"
                    : "Follow"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      );
    };

  if (
    loading
  ) {
    return (
      <SafeAreaView
        style={
          styles.center
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
          Loading your network...
        </Text>
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
      ]}
    >
      <View
        style={
          styles.container
        }
      >
        <View
          style={
            styles.header
          }
        >
          <View>
            <Text
              style={
                styles.title
              }
            >
              Network
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Connect with people at Richfield
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.iconButton
            }
            onPress={
              refresh
            }
            activeOpacity={
              0.7
            }
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={
                  PRIMARY
                }
              />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={22}
                color={
                  PRIMARY
                }
              />
            )}
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.searchContainer
          }
        >
          <Ionicons
            name="search-outline"
            size={21}
            color="#777"
          />

          <TextInput
            value={
              search
            }
            onChangeText={
              setSearch
            }
            placeholder="Search people..."
            placeholderTextColor="#999"
            style={
              styles.searchInput
            }
            autoCapitalize="none"
            autoCorrect={
              false
            }
          />

          {search.length >
            0 && (
            <Pressable
              hitSlop={
                10
              }
              onPress={() =>
                setSearch("")
              }
            >
              <Ionicons
                name="close-circle"
                size={19}
                color="#AAAAAF"
              />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          data={
            roleFilters
          }
          keyExtractor={
            item =>
              item.id
          }
          contentContainerStyle={
            styles.filters
          }
          renderItem={({
            item,
          }) => (
            <TouchableOpacity
              style={[
                styles.filter,

                roleFilter ===
                  item.id &&
                  styles.activeFilter,
              ]}
              onPress={() =>
                setRoleFilter(
                  item.id
                )
              }
            >
              <Text
                style={[
                  styles.filterText,

                  roleFilter ===
                    item.id &&
                    styles.activeFilterText,
                ]}
              >
                {
                  item.label
                }
              </Text>
            </TouchableOpacity>
          )}
        />

        <View
          style={
            styles.resultHeader
          }
        >
          <Text
            style={
              styles.resultCount
            }
          >
            {
              filteredProfiles.length
            }{" "}
            {filteredProfiles.length ===
            1
              ? "person"
              : "people"}
          </Text>

          <Text
            style={
              styles.followingCount
            }
          >
            {
              following.length
            }{" "}
            following
          </Text>
        </View>

        <FlatList
          data={
            filteredProfiles
          }
          keyExtractor={
            item =>
              item.id
          }
          renderItem={
            renderProfile
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
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
          contentContainerStyle={[
            styles.list,

            filteredProfiles.length ===
              0 &&
              styles.emptyList,
          ]}
          ListEmptyComponent={
            <View
              style={
                styles.empty
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name={
                    search
                      ? "search-outline"
                      : "people-outline"
                  }
                  size={35}
                  color={
                    PRIMARY
                  }
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {search
                  ? "No matches"
                  : "No people found"}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {search
                  ? "Try another name or change your filter."
                  : "Other active Richfield members will appear here."}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#F7F8FC",
    },

    container: {
      flex: 1,
      backgroundColor:
        "#F7F8FC",
    },

    header: {
      paddingHorizontal:
        20,
      paddingTop: 12,
      paddingBottom: 14,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    title: {
      fontSize: 28,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      marginTop: 4,
      color: "#777",
      fontSize: 14,
    },

    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#FFFFFF",
      justifyContent:
        "center",
      alignItems:
        "center",
      elevation: 2,
      shadowColor:
        "#000",
      shadowOpacity:
        0.05,
      shadowRadius: 4,
      shadowOffset: {
        width: 0,
        height: 2,
      },
    },

    searchContainer: {
      marginHorizontal:
        20,
      height: 50,
      borderRadius: 14,
      backgroundColor:
        "#FFFFFF",
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        15,
      elevation: 1,
      shadowColor:
        "#000",
      shadowOpacity:
        0.03,
      shadowRadius: 3,
      shadowOffset: {
        width: 0,
        height: 1,
      },
    },

    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 15,
      color: "#111",
    },

    filters: {
      paddingHorizontal:
        20,
      paddingVertical:
        15,
      gap: 8,
    },

    filter: {
      paddingHorizontal:
        16,
      paddingVertical:
        9,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "#E3E3E3",
    },

    activeFilter: {
      backgroundColor:
        PRIMARY,
      borderColor:
        PRIMARY,
    },

    filterText: {
      color: "#555",
      fontWeight: "600",
      fontSize: 13,
    },

    activeFilterText: {
      color: "#FFFFFF",
    },

    resultHeader: {
      paddingHorizontal:
        20,
      paddingBottom: 10,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    resultCount: {
      color: "#777",
      fontSize: 13,
      fontWeight: "600",
    },

    followingCount: {
      color:
        PRIMARY,
      fontSize: 12,
      fontWeight: "700",
    },

    list: {
      paddingHorizontal:
        20,
      paddingBottom: 35,
    },

    card: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
      flexDirection:
        "row",
      alignItems:
        "center",
      elevation: 2,
      shadowColor:
        "#000",
      shadowOpacity:
        0.04,
      shadowRadius: 5,
      shadowOffset: {
        width: 0,
        height: 2,
      },
    },

    avatarContainer: {
      marginRight: 12,
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        "#EEEEEE",
    },

    avatarPlaceholder: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        "#ECECFF",
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    avatarText: {
      color:
        PRIMARY,
      fontSize: 18,
      fontWeight: "800",
    },

    profileInfo: {
      flex: 1,
      marginRight: 8,
    },

    name: {
      fontSize: 16,
      fontWeight: "800",
      color: "#111",
    },

    username: {
      color: "#777",
      fontSize: 12,
      marginTop: 2,
    },

    roleContainer: {
      alignSelf:
        "flex-start",
      backgroundColor:
        "#EEF0FF",
      paddingHorizontal:
        8,
      paddingVertical:
        4,
      borderRadius: 8,
      marginTop: 5,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
    },

    role: {
      color:
        PRIMARY,
      fontSize: 10,
      fontWeight: "700",
    },

    bio: {
      color: "#777",
      fontSize: 12,
      marginTop: 6,
      lineHeight: 17,
    },

    followButton: {
      minWidth: 84,
      height: 38,
      backgroundColor:
        PRIMARY,
      paddingHorizontal:
        10,
      borderRadius: 11,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 4,
    },

    followingButton: {
      backgroundColor:
        "#EEF0FF",
      borderWidth: 1,
      borderColor:
        PRIMARY,
    },

    followButtonDisabled: {
      opacity: 0.65,
    },

    followText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },

    followingText: {
      color:
        PRIMARY,
    },

    center: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        "#F7F8FC",
    },

    loadingText: {
      marginTop: 10,
      color: "#777",
    },

    emptyList: {
      flexGrow: 1,
    },

    empty: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      paddingHorizontal:
        40,
      paddingBottom:
        80,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor:
        "#EEEEFF",
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    emptyTitle: {
      marginTop: 15,
      fontSize: 18,
      fontWeight: "800",
      color: "#222",
    },

    emptyText: {
      marginTop: 6,
      color: "#777",
      textAlign:
        "center",
      fontSize: 13,
      lineHeight: 19,
    },
  });