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

type NetworkRole =
  | "student"
  | "alumni"
  | "staff";

type NetworkMember = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
  role: NetworkRole;
  campus: string | null;
  programme: string | null;
  department: string | null;
  job_title: string | null;
  verified: boolean;
};

type StaffData = {
  campus: string | null;
  department: string | null;
  job_title: string | null;
  verified: boolean;
};

type FilterType =
  | "all"
  | "student"
  | "alumni"
  | "staff";

function getInitials(
  name?: string | null
) {
  if (!name) {
    return "?";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
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

function getRoleLabel(
  role: NetworkRole
) {
  switch (role) {
    case "student":
      return "Student";

    case "alumni":
      return "Alumni";

    case "staff":
      return "Staff";

    default:
      return "Member";
  }
}

function normalize(
  value?: string | null
) {
  return (
    value
      ?.trim()
      .toLowerCase() || ""
  );
}

export default function StaffNetworkScreen() {
  const {
    user,
    profile,
    isStaffVerified,
  } = useAuth();

  const [
    members,
    setMembers,
  ] = useState<
    NetworkMember[]
  >([]);

  const [
    staffData,
    setStaffData,
  ] = useState<
    StaffData | null
  >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<FilterType>(
    "all"
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
    openingUserId,
    setOpeningUserId,
  ] = useState<
    string | null
  >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const loadNetwork =
    useCallback(
      async (
        showLoader = false
      ) => {
        if (!user) {
          setMembers([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        try {
          if (showLoader) {
            setLoading(true);
          }

          setErrorMessage(null);

          /*
           * LOAD CURRENT STAFF PROFILE
           */

          const {
            data:
              currentStaff,
            error:
              staffError,
          } =
            await supabase
              .from(
                "staff_profiles"
              )
              .select(
                `
                campus,
                department,
                job_title,
                verified
              `
              )
              .eq(
                "user_id",
                user.id
              )
              .maybeSingle();

          if (staffError) {
            throw staffError;
          }

          const currentStaffData: StaffData =
            {
              campus:
                currentStaff?.campus ??
                null,

              department:
                currentStaff?.department ??
                null,

              job_title:
                currentStaff?.job_title ??
                null,

              verified:
                currentStaff?.verified ===
                true,
            };

          setStaffData(
            currentStaffData
          );

          /*
           * LOAD ACTIVE COMMUNITY MEMBERS
           */

          const {
            data:
              profileRows,
            error:
              profilesError,
          } =
            await supabase
              .from("profiles")
              .select(
                `
                id,
                full_name,
                username,
                avatar_url,
                headline,
                role,
                status
              `
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
                  "staff",
                ]
              )
              .neq(
                "id",
                user.id
              )
              .order(
                "full_name",
                {
                  ascending: true,
                }
              );

          if (profilesError) {
            throw profilesError;
          }

          const profiles =
            profileRows || [];

          if (
            profiles.length ===
            0
          ) {
            setMembers([]);
            return;
          }

          const studentIds =
            profiles
              .filter(
                (item) =>
                  item.role ===
                  "student"
              )
              .map(
                (item) =>
                  item.id
              );

          const alumniIds =
            profiles
              .filter(
                (item) =>
                  item.role ===
                  "alumni"
              )
              .map(
                (item) =>
                  item.id
              );

          const staffIds =
            profiles
              .filter(
                (item) =>
                  item.role ===
                  "staff"
              )
              .map(
                (item) =>
                  item.id
              );

          let studentMap =
            new Map<
              string,
              {
                campus:
                  | string
                  | null;
                programme:
                  | string
                  | null;
              }
            >();

          let alumniMap =
            new Map<
              string,
              {
                campus:
                  | string
                  | null;
                programme:
                  | string
                  | null;
                verified: boolean;
              }
            >();

          let staffMap =
            new Map<
              string,
              {
                campus:
                  | string
                  | null;
                department:
                  | string
                  | null;
                job_title:
                  | string
                  | null;
                verified: boolean;
              }
            >();

          /*
           * STUDENTS
           */

          if (
            studentIds.length >
            0
          ) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "student_profiles"
                )
                .select(
                  `
                  user_id,
                  campus,
                  programme
                `
                )
                .in(
                  "user_id",
                  studentIds
                );

            if (error) {
              throw error;
            }

            studentMap =
              new Map(
                (
                  data || []
                ).map(
                  (item) => [
                    item.user_id,
                    {
                      campus:
                        item.campus ??
                        null,

                      programme:
                        item.programme ??
                        null,
                    },
                  ]
                )
              );
          }

          /*
           * ALUMNI
           */

          if (
            alumniIds.length >
            0
          ) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "alumni_profiles"
                )
                .select(
                  `
                  user_id,
                  campus,
                  programme,
                  verified
                `
                )
                .in(
                  "user_id",
                  alumniIds
                );

            if (error) {
              throw error;
            }

            alumniMap =
              new Map(
                (
                  data || []
                ).map(
                  (item) => [
                    item.user_id,
                    {
                      campus:
                        item.campus ??
                        null,

                      programme:
                        item.programme ??
                        null,

                      verified:
                        item.verified ===
                        true,
                    },
                  ]
                )
              );
          }

          /*
           * STAFF
           *
           * Only verified Staff should be
           * discoverable as Staff members.
           */

          if (
            staffIds.length >
            0
          ) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "staff_profiles"
                )
                .select(
                  `
                  user_id,
                  campus,
                  department,
                  job_title,
                  verified
                `
                )
                .in(
                  "user_id",
                  staffIds
                )
                .eq(
                  "verified",
                  true
                );

            if (error) {
              throw error;
            }

            staffMap =
              new Map(
                (
                  data || []
                ).map(
                  (item) => [
                    item.user_id,
                    {
                      campus:
                        item.campus ??
                        null,

                      department:
                        item.department ??
                        null,

                      job_title:
                        item.job_title ??
                        null,

                      verified:
                        item.verified ===
                        true,
                    },
                  ]
                )
              );
          }

          /*
           * COMBINE PROFILE DATA
           */

          const combined: NetworkMember[] =
            profiles
              .map(
                (
                  item
                ):
                  | NetworkMember
                  | null => {
                  if (
                    item.role ===
                    "student"
                  ) {
                    const extra =
                      studentMap.get(
                        item.id
                      );

                    return {
                      id:
                        item.id,

                      full_name:
                        item.full_name,

                      username:
                        item.username,

                      avatar_url:
                        item.avatar_url,

                      headline:
                        item.headline,

                      role:
                        "student",

                      campus:
                        extra?.campus ??
                        null,

                      programme:
                        extra?.programme ??
                        null,

                      department:
                        null,

                      job_title:
                        null,

                      verified:
                        true,
                    };
                  }

                  if (
                    item.role ===
                    "alumni"
                  ) {
                    const extra =
                      alumniMap.get(
                        item.id
                      );

                    if (
                      !extra?.verified
                    ) {
                      return null;
                    }

                    return {
                      id:
                        item.id,

                      full_name:
                        item.full_name,

                      username:
                        item.username,

                      avatar_url:
                        item.avatar_url,

                      headline:
                        item.headline,

                      role:
                        "alumni",

                      campus:
                        extra.campus,

                      programme:
                        extra.programme,

                      department:
                        null,

                      job_title:
                        null,

                      verified:
                        true,
                    };
                  }

                  if (
                    item.role ===
                    "staff"
                  ) {
                    const extra =
                      staffMap.get(
                        item.id
                      );

                    if (
                      !extra?.verified
                    ) {
                      return null;
                    }

                    return {
                      id:
                        item.id,

                      full_name:
                        item.full_name,

                      username:
                        item.username,

                      avatar_url:
                        item.avatar_url,

                      headline:
                        item.headline,

                      role:
                        "staff",

                      campus:
                        extra.campus,

                      programme:
                        null,

                      department:
                        extra.department,

                      job_title:
                        extra.job_title,

                      verified:
                        true,
                    };
                  }

                  return null;
                }
              )
              .filter(
                (
                  item
                ): item is NetworkMember =>
                  item !==
                  null
              );

          /*
           * CAMPUS PRIORITY
           *
           * Same-campus members appear
           * first. Other campuses are still
           * discoverable.
           */

          const myCampus =
            normalize(
              currentStaffData.campus
            );

          combined.sort(
            (a, b) => {
              const aSameCampus =
                !!myCampus &&
                normalize(
                  a.campus
                ) ===
                  myCampus;

              const bSameCampus =
                !!myCampus &&
                normalize(
                  b.campus
                ) ===
                  myCampus;

              if (
                aSameCampus &&
                !bSameCampus
              ) {
                return -1;
              }

              if (
                !aSameCampus &&
                bSameCampus
              ) {
                return 1;
              }

              return (
                a.full_name ||
                ""
              ).localeCompare(
                b.full_name ||
                  ""
              );
            }
          );

          setMembers(
            combined
          );
        } catch (
          error: any
        ) {
          console.log(
            "Staff network error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Unable to load the Richfield network."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [user]
    );

  useEffect(() => {
    loadNetwork(true);
  }, [loadNetwork]);

  /*
   * REFRESH NETWORK WHEN IMPORTANT
   * PROFILE RECORDS CHANGE.
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel =
      supabase.channel(
        `staff-network-${user.id}`
      );

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          loadNetwork();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "student_profiles",
        },
        () => {
          loadNetwork();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "alumni_profiles",
        },
        () => {
          loadNetwork();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "staff_profiles",
        },
        () => {
          loadNetwork();
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
    loadNetwork,
  ]);

  const filteredMembers =
    useMemo(() => {
      const query =
        normalize(search);

      return members.filter(
        (member) => {
          if (
            filter !== "all" &&
            member.role !==
              filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable =
            [
              member.full_name,
              member.username,
              member.role,
              member.campus,
              member.programme,
              member.department,
              member.job_title,
              member.headline,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      members,
      search,
      filter,
    ]);

  const sameCampusCount =
    useMemo(() => {
      const myCampus =
        normalize(
          staffData?.campus
        );

      if (!myCampus) {
        return 0;
      }

      return members.filter(
        (member) =>
          normalize(
            member.campus
          ) === myCampus
      ).length;
    }, [
      members,
      staffData,
    ]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNetwork();
  };

  const openProfile = (
    member: NetworkMember
  ) => {
    /*
     * Change this pathname only if your
     * existing MemberProfile route uses a
     * different route name.
     */

    router.push({
      pathname:
        "/member-profile",
      params: {
        userId:
          member.id,
        id:
          member.id,
      },
    });
  };

  const startConversation =
    async (
      member: NetworkMember
    ) => {
      if (!user) {
        Alert.alert(
          "Not signed in",
          "Please sign in again."
        );

        return;
      }

      if (
        profile?.role !==
          "staff" ||
        profile.status !==
          "active" ||
        !isStaffVerified
      ) {
        Alert.alert(
          "Staff verification required",
          "Only active verified Richfield Staff can start direct conversations."
        );

        return;
      }

      try {
        setOpeningUserId(
          member.id
        );

        /*
         * Staff direct messaging RPC.
         *
         * This must enforce permissions in
         * PostgreSQL as well. The UI check
         * above is not the security layer.
         */

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "open_direct_conversation",
            {
              p_other_user_id:
                member.id,
            }
          );

        if (error) {
          throw error;
        }

        /*
         * Depending on the PostgreSQL return
         * type, Supabase may return the UUID
         * directly or an object/array.
         */

        let conversationId:
          | string
          | null = null;

        if (
          typeof data ===
          "string"
        ) {
          conversationId =
            data;
        } else if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          const first =
            data[0];

          conversationId =
            typeof first ===
            "string"
              ? first
              : first
                  ?.conversation_id ||
                first?.id ||
                null;
        } else if (
          data &&
          typeof data ===
            "object"
        ) {
          conversationId =
            (data as any)
              .conversation_id ||
            (data as any).id ||
            null;
        }

        if (!conversationId) {
          throw new Error(
            "The conversation could not be opened."
          );
        }

        router.push({
          pathname:
            "/conversation",

          params: {
            conversationId,

            id:
              member.id,

            userId:
              member.id,

            name:
              member.full_name ||
              "Richfield Member",

            username:
              member.username ||
              "",

            image:
              member.avatar_url ||
              "",

            role:
              member.role,
          },
        });
      } catch (
        error: any
      ) {
        console.log(
          "Start Staff conversation error:",
          error
        );

        Alert.alert(
          "Could not start chat",
          error?.message ||
            "The conversation could not be started."
        );
      } finally {
        setOpeningUserId(
          null
        );
      }
    };

  const renderMember =
    ({
      item,
    }: {
      item: NetworkMember;
    }) => {
      const sameCampus =
        !!staffData?.campus &&
        normalize(
          item.campus
        ) ===
          normalize(
            staffData.campus
          );

      const secondaryText =
        item.role ===
        "staff"
          ? item.job_title ||
            item.department ||
            item.headline ||
            "Richfield Staff"
          : item.programme ||
            item.headline ||
            getRoleLabel(
              item.role
            );

      const opening =
        openingUserId ===
        item.id;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.memberCard,

            pressed &&
              styles.memberCardPressed,
          ]}
          onPress={() =>
            openProfile(item)
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
                  styles.avatarFallback
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

            {item.role ===
              "staff" && (
              <View
                style={
                  styles.verifiedDot
                }
              >
                <Ionicons
                  name="checkmark"
                  size={10}
                  color="#FFFFFF"
                />
              </View>
            )}
          </View>

          <View
            style={
              styles.memberContent
            }
          >
            <View
              style={
                styles.nameRow
              }
            >
              <Text
                style={
                  styles.memberName
                }
                numberOfLines={
                  1
                }
              >
                {item.full_name ||
                  "Richfield Member"}
              </Text>

              {item.verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={
                    PRIMARY
                  }
                />
              )}
            </View>

            <View
              style={
                styles.badgeRow
              }
            >
              <View
                style={
                  styles.roleBadge
                }
              >
                <Text
                  style={
                    styles.roleBadgeText
                  }
                >
                  {getRoleLabel(
                    item.role
                  )}
                </Text>
              </View>

              {sameCampus && (
                <View
                  style={
                    styles.campusBadge
                  }
                >
                  <Ionicons
                    name="location"
                    size={10}
                    color="#166534"
                  />

                  <Text
                    style={
                      styles.campusBadgeText
                    }
                  >
                    Same campus
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={
                styles.memberDetail
              }
              numberOfLines={
                1
              }
            >
              {secondaryText}
            </Text>

            {!!item.campus && (
              <View
                style={
                  styles.locationRow
                }
              >
                <Ionicons
                  name="location-outline"
                  size={12}
                  color="#888"
                />

                <Text
                  style={
                    styles.locationText
                  }
                  numberOfLines={
                    1
                  }
                >
                  {item.campus}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={[
              styles.messageButton,

              opening &&
                styles.messageButtonDisabled,
            ]}
            disabled={opening}
            onPress={(
              event
            ) => {
              event.stopPropagation();

              startConversation(
                item
              );
            }}
          >
            {opening ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color="#FFFFFF"
              />
            )}
          </Pressable>
        </Pressable>
      );
    };

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
            Loading network...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <View
        style={
          styles.screen
        }
      >
        <View
          style={
            styles.header
          }
        >
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
            Network
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Find students, alumni and
            other Richfield Staff
            members.
          </Text>

          <View
            style={
              styles.searchBox
            }
          >
            <Ionicons
              name="search-outline"
              size={20}
              color="#777"
            />

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search people, campus or programme"
              placeholderTextColor="#999"
              style={
                styles.searchInput
              }
              autoCorrect={
                false
              }
              autoCapitalize="none"
              returnKeyType="search"
            />

            {!!search && (
              <Pressable
                hitSlop={8}
                onPress={() =>
                  setSearch("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color="#AAA"
                />
              </Pressable>
            )}
          </View>

          <View
            style={
              styles.filters
            }
          >
            {(
              [
                {
                  key: "all",
                  label: "All",
                },
                {
                  key: "student",
                  label:
                    "Students",
                },
                {
                  key: "alumni",
                  label:
                    "Alumni",
                },
                {
                  key: "staff",
                  label:
                    "Staff",
                },
              ] as {
                key: FilterType;
                label: string;
              }[]
            ).map(
              (option) => (
                <Pressable
                  key={
                    option.key
                  }
                  style={[
                    styles.filterButton,

                    filter ===
                      option.key &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() =>
                    setFilter(
                      option.key
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterText,

                      filter ===
                        option.key &&
                        styles.filterTextActive,
                    ]}
                  >
                    {
                      option.label
                    }
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <View
            style={
              styles.infoBox
            }
          >
            <Ionicons
              name="location-outline"
              size={21}
              color={PRIMARY}
            />

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
                Campus-aware network
              </Text>

              <Text
                style={
                  styles.infoText
                }
              >
                {staffData?.campus
                  ? `${staffData.campus} members are prioritised. ${sameCampusCount} same-campus member${
                      sameCampusCount ===
                      1
                        ? ""
                        : "s"
                    } currently found.`
                  : "Members from your assigned campus will be prioritised once your campus is available."}
              </Text>
            </View>
          </View>
        </View>

        {errorMessage ? (
          <View
            style={
              styles.errorContainer
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color="#DC2626"
            />

            <Text
              style={
                styles.errorTitle
              }
            >
              Could not load network
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {errorMessage}
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={() =>
                loadNetwork(
                  true
                )
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={
              filteredMembers
            }
            keyExtractor={(
              item
            ) => item.id}
            renderItem={
              renderMember
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              filteredMembers.length ===
              0
                ? styles.emptyList
                : styles.list
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
            ListHeaderComponent={
              filteredMembers.length >
              0 ? (
                <View
                  style={
                    styles.resultsHeader
                  }
                >
                  <Text
                    style={
                      styles.resultsText
                    }
                  >
                    {
                      filteredMembers.length
                    }{" "}
                    member
                    {filteredMembers.length ===
                    1
                      ? ""
                      : "s"}
                  </Text>
                </View>
              ) : null
            }
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
                    size={40}
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
                    ? "No members found"
                    : "No network members yet"}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {search
                    ? "Try another name, campus, programme or role."
                    : "Active Richfield Students, verified Alumni and verified Staff will appear here."}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
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

    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F1F1F1",
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

    subtitle: {
      fontSize: 14,
      color: "#666",
      lineHeight: 20,
      marginTop: 6,
    },

    searchBox: {
      height: 50,
      borderRadius: 13,
      backgroundColor:
        "#F5F5F7",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginTop: 20,
    },

    searchInput: {
      flex: 1,
      height: "100%",
      fontSize: 14,
      color: "#111",
      marginLeft: 8,
    },

    filters: {
      flexDirection: "row",
      marginTop: 13,
      gap: 7,
    },

    filterButton: {
      flex: 1,
      minHeight: 36,
      paddingHorizontal: 8,
      borderRadius: 11,
      borderWidth: 1,
      borderColor:
        "#E4E4E7",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
    },

    filterButtonActive: {
      backgroundColor:
        PRIMARY,
      borderColor:
        PRIMARY,
    },

    filterText: {
      color: "#666",
      fontSize: 11,
      fontWeight: "700",
    },

    filterTextActive: {
      color: "#FFFFFF",
    },

    infoBox: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      padding: 14,
      backgroundColor:
        "#F3F3FF",
      borderRadius: 13,
      marginTop: 14,
      gap: 8,
    },

    infoTitle: {
      color: "#222",
      fontSize: 12,
      fontWeight: "800",
    },

    infoText: {
      color: "#666",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 3,
    },

    list: {
      paddingHorizontal: 20,
      paddingBottom: 100,
    },

    resultsHeader: {
      paddingTop: 15,
      paddingBottom: 8,
    },

    resultsText: {
      color: "#888",
      fontSize: 11,
      fontWeight: "700",
      textTransform:
        "uppercase",
      letterSpacing: 0.5,
    },

    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 100,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F0F0F0",
    },

    memberCardPressed: {
      opacity: 0.7,
    },

    avatarContainer: {
      width: 58,
      height: 58,
      marginRight: 12,
      position: "relative",
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        "#EEEEEE",
    },

    avatarFallback: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        "#EAEAFC",
      alignItems: "center",
      justifyContent:
        "center",
    },

    avatarText: {
      color: PRIMARY,
      fontSize: 17,
      fontWeight: "800",
    },

    verifiedDot: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor:
        PRIMARY,
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    memberContent: {
      flex: 1,
      minWidth: 0,
      marginRight: 9,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    memberName: {
      flexShrink: 1,
      color: "#222",
      fontSize: 15,
      fontWeight: "800",
    },

    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 5,
      gap: 5,
    },

    roleBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor:
        "#EEEEFF",
    },

    roleBadgeText: {
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "800",
    },

    campusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor:
        "#DCFCE7",
    },

    campusBadgeText: {
      color: "#166534",
      fontSize: 9,
      fontWeight: "800",
    },

    memberDetail: {
      color: "#555",
      fontSize: 12,
      marginTop: 5,
    },

    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      gap: 3,
    },

    locationText: {
      flexShrink: 1,
      color: "#888",
      fontSize: 10,
    },

    messageButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    messageButtonDisabled: {
      opacity: 0.6,
    },

    emptyList: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: 100,
    },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
      paddingBottom: 60,
    },

    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 25,
      backgroundColor:
        "#F1F1FF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      color: "#333",
      fontSize: 17,
      fontWeight: "800",
      marginTop: 15,
    },

    emptyText: {
      color: "#777",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 6,
      maxWidth: 300,
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

    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 35,
    },

    errorTitle: {
      color: "#222",
      fontSize: 17,
      fontWeight: "800",
      marginTop: 12,
    },

    errorText: {
      color: "#777",
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginTop: 6,
    },

    retryButton: {
      marginTop: 18,
      paddingHorizontal: 20,
      height: 44,
      borderRadius: 12,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    retryText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
  });