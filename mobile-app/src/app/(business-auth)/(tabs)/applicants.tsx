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
  Modal,
  RefreshControl,
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
} from "expo-router";

import {
  supabase,
} from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "shortlisted"
  | "accepted"
  | "rejected";

type Applicant = {
  id: string;

  opportunity_id: string;
  applicant_id: string;

  status: ApplicationStatus;

  cover_note:
    | string
    | null;

  created_at: string;

  full_name:
    | string
    | null;

  username:
    | string
    | null;

  avatar_url:
    | string
    | null;

  headline:
    | string
    | null;

  role:
    | string
    | null;

  programme:
    | string
    | null;

  campus:
    | string
    | null;

  skills: string[];

  opportunity_title: string;
};

const FILTERS: {
  label: string;
  value:
    | "all"
    | ApplicationStatus;
}[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Reviewing",
    value: "reviewing",
  },
  {
    label: "Shortlisted",
    value: "shortlisted",
  },
  {
    label: "Accepted",
    value: "accepted",
  },
  {
    label: "Rejected",
    value: "rejected",
  },
];

function getInitials(
  name:
    | string
    | null
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

function getStatusLabel(
  status:
    ApplicationStatus
) {
  switch (status) {
    case "pending":
      return "Pending";

    case "reviewing":
      return "Reviewing";

    case "shortlisted":
      return "Shortlisted";

    case "accepted":
      return "Accepted";

    case "rejected":
      return "Rejected";

    default:
      return status;
  }
}

function getStatusIcon(
  status:
    ApplicationStatus
) {
  switch (status) {
    case "accepted":
      return "checkmark-circle";

    case "rejected":
      return "close-circle";

    case "shortlisted":
      return "star";

    case "reviewing":
      return "eye";

    default:
      return "time";
  }
}

export default function ApplicantsScreen() {
  const [
    applicants,
    setApplicants,
  ] =
    useState<
      Applicant[]
    >([]);

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
    filter,
    setFilter,
  ] =
    useState<
      | "all"
      | ApplicationStatus
    >("all");

  const [
    selected,
    setSelected,
  ] =
    useState<
      Applicant | null
    >(null);

  const [
    updating,
    setUpdating,
  ] =
    useState(false);

  const [
    chatOpening,
    setChatOpening,
  ] =
    useState(false);

  const loadApplicants =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(true);
          }

          const {
            data: {
              user,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (!user) {
            throw new Error(
              "You must be logged in."
            );
          }

          const {
            data:
              opportunities,
            error:
              opportunityError,
          } =
            await supabase
              .from(
                "opportunities"
              )
              .select(
                "id,title"
              )
              .eq(
                "business_id",
                user.id
              );

          if (
            opportunityError
          ) {
            throw opportunityError;
          }

          const ownOpportunities =
            opportunities ||
            [];

          if (
            ownOpportunities.length ===
            0
          ) {
            setApplicants([]);
            return;
          }

          const opportunityIds =
            ownOpportunities.map(
              item => item.id
            );

          const titleMap =
            new Map<
              string,
              string
            >();

          ownOpportunities.forEach(
            item => {
              titleMap.set(
                item.id,
                item.title
              );
            }
          );

          const {
            data:
              applications,
            error:
              applicationError,
          } =
            await supabase
              .from(
                "opportunity_applications"
              )
              .select(`
                id,
                opportunity_id,
                applicant_id,
                status,
                cover_note,
                created_at
              `)
              .in(
                "opportunity_id",
                opportunityIds
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );

          if (
            applicationError
          ) {
            throw applicationError;
          }

          const rows =
            applications ||
            [];

          if (
            rows.length ===
            0
          ) {
            setApplicants([]);
            return;
          }

          const applicantIds =
            [
              ...new Set(
                rows.map(
                  item =>
                    item.applicant_id
                )
              ),
            ];

          const [
            profileResult,
            studentResult,
          ] =
            await Promise.all([
              supabase
                .from(
                  "profiles"
                )
                .select(`
                  id,
                  full_name,
                  username,
                  avatar_url,
                  headline,
                  role
                `)
                .in(
                  "id",
                  applicantIds
                ),

              supabase
                .from(
                  "student_profiles"
                )
                .select(`
                  user_id,
                  programme,
                  campus,
                  skills
                `)
                .in(
                  "user_id",
                  applicantIds
                ),
            ]);

          if (
            profileResult.error
          ) {
            throw profileResult.error;
          }

          /*
           * If your student privacy policy blocks
           * some student_profiles fields for businesses,
           * studentResult may contain fewer records.
           * That is okay.
           */

          const profileMap =
            new Map<
              string,
              any
            >();

          (
            profileResult.data ||
            []
          ).forEach(
            item => {
              profileMap.set(
                item.id,
                item
              );
            }
          );

          const studentMap =
            new Map<
              string,
              any
            >();

          (
            studentResult.data ||
            []
          ).forEach(
            item => {
              studentMap.set(
                item.user_id,
                item
              );
            }
          );

          const result =
            rows.map(
              row => {
                const userProfile =
                  profileMap.get(
                    row.applicant_id
                  );

                const studentProfile =
                  studentMap.get(
                    row.applicant_id
                  );

                return {
                  ...row,

                  full_name:
                    userProfile
                      ?.full_name ||
                    null,

                  username:
                    userProfile
                      ?.username ||
                    null,

                  avatar_url:
                    userProfile
                      ?.avatar_url ||
                    null,

                  headline:
                    userProfile
                      ?.headline ||
                    null,

                  role:
                    userProfile
                      ?.role ||
                    null,

                  programme:
                    studentProfile
                      ?.programme ||
                    null,

                  campus:
                    studentProfile
                      ?.campus ||
                    null,

                  skills:
                    studentProfile
                      ?.skills ||
                    [],

                  opportunity_title:
                    titleMap.get(
                      row.opportunity_id
                    ) ||
                    "Opportunity",
                } as Applicant;
              }
            );

          setApplicants(
            result
          );

          setSelected(
            current => {
              if (!current) {
                return null;
              }

              return (
                result.find(
                  item =>
                    item.id ===
                    current.id
                ) ||
                null
              );
            }
          );
        } catch (
          error: any
        ) {
          console.log(
            "Applicants error:",
            error
          );

          Alert.alert(
            "Applicants",
            error?.message ||
              "Could not load applicants."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadApplicants();

    const channel =
      supabase
        .channel(
          "business-applicants"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "opportunity_applications",
          },
          () => {
            loadApplicants(
              false
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    loadApplicants,
  ]);

  const filtered =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return applicants;
      }

      return applicants.filter(
        item =>
          item.status ===
          filter
      );
    }, [
      applicants,
      filter,
    ]);

  async function updateStatus(
    status:
      ApplicationStatus
  ) {
    if (!selected) {
      return;
    }

    if (
      selected.status ===
      status
    ) {
      return;
    }

    const applicantName =
      selected.full_name ||
      "this applicant";

    const action =
      getStatusLabel(
        status
      );

    Alert.alert(
      `${action} applicant`,
      `Change ${applicantName}'s application status to ${action}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: action,
          onPress:
            async () => {
              try {
                setUpdating(
                  true
                );

                const {
                  data,
                  error,
                } =
                  await supabase
                    .from(
                      "opportunity_applications"
                    )
                    .update({
                      status,

                      updated_at:
                        new Date()
                          .toISOString(),
                    })
                    .eq(
                      "id",
                      selected.id
                    )
                    .select()
                    .single();

                if (error) {
                  throw error;
                }

                /*
                 * Supabase trigger sends the chat
                 * message automatically for:
                 *
                 * shortlisted
                 * accepted
                 * rejected
                 */

                setApplicants(
                  current =>
                    current.map(
                      item =>
                        item.id ===
                        selected.id
                          ? {
                              ...item,
                              status:
                                data.status,
                            }
                          : item
                    )
                );

                setSelected(
                  current =>
                    current
                      ? {
                          ...current,
                          status:
                            data.status,
                        }
                      : null
                );

                if (
                  [
                    "shortlisted",
                    "accepted",
                    "rejected",
                  ].includes(
                    status
                  )
                ) {
                  Alert.alert(
                    "Status updated",
                    "The applicant has been updated and a professional message was automatically sent to their chat."
                  );
                }
              } catch (
                error: any
              ) {
                console.log(
                  "Application update error:",
                  error
                );

                Alert.alert(
                  "Update failed",
                  error?.message ||
                    "Could not update this application."
                );
              } finally {
                setUpdating(
                  false
                );
              }
            },
        },
      ]
    );
  }

  function viewProfile() {
    if (!selected) {
      return;
    }

    const applicant = selected;

    setSelected(null);

    router.push({
      pathname: "/member-profile",

      params: {
        userId:
          applicant.applicant_id,

        id:
          applicant.applicant_id,

        name:
          applicant.full_name ||
          "",

        username:
          applicant.username ||
          "",

        image:
          applicant.avatar_url ||
          "",

        role:
          applicant.role ||
          "student",
      },
    });
  }

  function viewPortfolio() {
    if (!selected) {
      return;
    }

    setSelected(null);

    router.push({
      pathname:
        "/member-portfolio",

      params: {
        userId:
          selected.applicant_id,
        name:
          selected.full_name ||
          "Applicant",
      },
    });
  }

  async function openChat() {
    if (!selected) {
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
              selected.applicant_id,
          }
        );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Conversation could not be opened."
        );
      }

      setSelected(null);

      router.push({
        pathname:
          "../../conversation",

        params: {
          id: data,

          otherUserId:
            selected.applicant_id,

          userId:
            selected.applicant_id,

          name:
            selected.full_name ||
            "Applicant",

          username:
            selected.username ||
            "",

          image:
            selected.avatar_url ||
            "",

          role:
            selected.role ||
            "student",

          online:
            "false",

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

  return (
    <SafeAreaView
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
            Applicants
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Manage your recruitment
            pipeline
          </Text>
        </View>

        <View
          style={
            styles.headerIcon
          }
        >
          <Ionicons
            name="people-outline"
            size={23}
            color={
              PRIMARY
            }
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filters
        }
      >
        {FILTERS.map(
          item => {
            const active =
              filter ===
              item.value;

            return (
              <TouchableOpacity
                key={
                  item.value
                }
                style={[
                  styles.filter,
                  active &&
                    styles.activeFilter,
                ]}
                onPress={() =>
                  setFilter(
                    item.value
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.activeFilterText,
                  ]}
                >
                  {
                    item.label
                  }
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </ScrollView>

      <FlatList
        data={
          filtered
        }
        keyExtractor={
          item =>
            item.id
        }
        contentContainerStyle={
          styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(
                true
              );

              loadApplicants(
                false
              );
            }}
          />
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
                name="people-outline"
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
              No applicants
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Students who apply to
              your opportunities will
              appear here.
            </Text>
          </View>
        }
        renderItem={({
          item,
        }) => (
          <TouchableOpacity
            activeOpacity={
              0.8
            }
            style={
              styles.card
            }
            onPress={() =>
              setSelected(
                item
              )
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

            <View
              style={
                styles.cardBody
              }
            >
              <Text
                style={
                  styles.name
                }
              >
                {item.full_name ||
                  "Applicant"}
              </Text>

              <Text
                style={
                  styles.headline
                }
                numberOfLines={
                  1
                }
              >
                {item.headline ||
                  item.programme ||
                  "Richfield Student"}
              </Text>

              <Text
                style={
                  styles.opportunity
                }
                numberOfLines={
                  1
                }
              >
                {
                  item.opportunity_title
                }
              </Text>
            </View>

            <View
              style={
                styles.statusBadge
              }
            >
              <Ionicons
                name={
                  getStatusIcon(
                    item.status
                  ) as any
                }
                size={13}
                color={
                  PRIMARY
                }
              />

              <Text
                style={
                  styles.statusText
                }
              >
                {getStatusLabel(
                  item.status
                )}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={
          !!selected
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setSelected(null)
        }
      >
        {selected ? (
          <SafeAreaView
            style={
              styles.modal
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={() =>
                  setSelected(null)
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color="#111"
                />
              </TouchableOpacity>

              <Text
                style={
                  styles.modalTitle
                }
              >
                Applicant
              </Text>

              <View
                style={{
                  width: 42,
                }}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.modalContent
              }
            >
              <View
                style={
                  styles.profileTop
                }
              >
                {selected.avatar_url ? (
                  <Image
                    source={{
                      uri:
                        selected.avatar_url,
                    }}
                    style={
                      styles.largeAvatar
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.largeAvatarFallback
                    }
                  >
                    <Text
                      style={
                        styles.largeAvatarText
                      }
                    >
                      {getInitials(
                        selected.full_name
                      )}
                    </Text>
                  </View>
                )}

                <Text
                  style={
                    styles.detailName
                  }
                >
                  {selected.full_name ||
                    "Applicant"}
                </Text>

                <Text
                  style={
                    styles.detailHeadline
                  }
                >
                  {selected.headline ||
                    selected.programme ||
                    "Richfield Student"}
                </Text>

                {selected.campus ? (
                  <Text
                    style={
                      styles.detailCampus
                    }
                  >
                    {
                      selected.campus
                    }
                  </Text>
                ) : null}
              </View>

              <View
                style={
                  styles.profileActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.primaryProfileButton
                  }
                  onPress={
                    viewProfile
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.primaryProfileButtonText
                    }
                  >
                    View profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.secondaryProfileButton
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
                      size="small"
                      color={
                        PRIMARY
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={18}
                        color={
                          PRIMARY
                        }
                      />

                      <Text
                        style={
                          styles.secondaryProfileButtonText
                        }
                      >
                        Message
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={
                  styles.portfolioButton
                }
                onPress={
                  viewPortfolio
                }
              >
                <View
                  style={
                    styles.portfolioIcon
                  }
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={20}
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
                      styles.portfolioTitle
                    }
                  >
                    View portfolio
                  </Text>

                  <Text
                    style={
                      styles.portfolioSubtitle
                    }
                  >
                    Projects, achievements,
                    experience and skills
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#777"
                />
              </TouchableOpacity>

              <View
                style={
                  styles.infoCard
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Applied for
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {
                    selected.opportunity_title
                  }
                </Text>
              </View>

              {selected.skills.length >
              0 ? (
                <>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Skills
                  </Text>

                  <View
                    style={
                      styles.skills
                    }
                  >
                    {selected.skills.map(
                      skill => (
                        <View
                          key={
                            skill
                          }
                          style={
                            styles.skill
                          }
                        >
                          <Text
                            style={
                              styles.skillText
                            }
                          >
                            {
                              skill
                            }
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                </>
              ) : null}

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Application status
              </Text>

              {updating ? (
                <ActivityIndicator
                  size="large"
                  color={
                    PRIMARY
                  }
                  style={{
                    marginTop: 20,
                  }}
                />
              ) : (
                <View
                  style={
                    styles.statusActions
                  }
                >
                  <StatusButton
                    label="Reviewing"
                    icon="eye-outline"
                    active={
                      selected.status ===
                      "reviewing"
                    }
                    onPress={() =>
                      updateStatus(
                        "reviewing"
                      )
                    }
                  />

                  <StatusButton
                    label="Shortlist"
                    icon="star-outline"
                    active={
                      selected.status ===
                      "shortlisted"
                    }
                    onPress={() =>
                      updateStatus(
                        "shortlisted"
                      )
                    }
                  />

                  <StatusButton
                    label="Accept"
                    icon="checkmark-circle-outline"
                    active={
                      selected.status ===
                      "accepted"
                    }
                    onPress={() =>
                      updateStatus(
                        "accepted"
                      )
                    }
                  />

                  <StatusButton
                    label="Reject"
                    icon="close-circle-outline"
                    danger
                    active={
                      selected.status ===
                      "rejected"
                    }
                    onPress={() =>
                      updateStatus(
                        "rejected"
                      )
                    }
                  />
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function StatusButton({
  label,
  icon,
  active,
  danger = false,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statusActionButton,

        active &&
          styles.statusActionActive,

        danger &&
          styles.statusActionDanger,
      ]}
      onPress={
        onPress
      }
    >
      <Ionicons
        name={icon}
        size={19}
        color={
          active
            ? "#fff"
            : danger
              ? "#c62828"
              : PRIMARY
        }
      />

      <Text
        style={[
          styles.statusActionText,

          active &&
            styles.statusActionTextActive,

          danger &&
            !active &&
            styles.statusActionDangerText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F7F7FB",
    },

    loading: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F7F7FB",
    },

    header: {
      paddingHorizontal: 18,
      paddingTop: 12,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    title: {
      fontSize: 28,
      fontWeight: "900",
      color: "#111",
    },

    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: "#777",
    },

    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        "#ECECFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    filters: {
      paddingHorizontal: 18,
      paddingVertical: 16,
      gap: 8,
    },

    filter: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "#E3E3EA",
      backgroundColor:
        "#fff",
    },

    activeFilter: {
      backgroundColor:
        PRIMARY,
      borderColor:
        PRIMARY,
    },

    filterText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#555",
    },

    activeFilterText: {
      color: "#fff",
    },

    list: {
      paddingHorizontal: 18,
      paddingBottom: 100,
    },

    card: {
      backgroundColor:
        "#fff",
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        "#ECECF1",
      padding: 14,
      marginBottom: 11,
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 53,
      height: 53,
      borderRadius: 27,
    },

    avatarFallback: {
      width: 53,
      height: 53,
      borderRadius: 27,
      backgroundColor:
        "#EEEEFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    avatarText: {
      color: PRIMARY,
      fontWeight: "900",
      fontSize: 16,
    },

    cardBody: {
      flex: 1,
      marginLeft: 11,
      marginRight: 7,
    },

    name: {
      fontSize: 14,
      fontWeight: "800",
      color: "#111",
    },

    headline: {
      marginTop: 2,
      fontSize: 11,
      color: "#777",
    },

    opportunity: {
      marginTop: 5,
      color: PRIMARY,
      fontSize: 10.5,
      fontWeight: "700",
    },

    statusBadge: {
      backgroundColor:
        "#F0F0FF",
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 9,
      alignItems:
        "center",
      gap: 2,
    },

    statusText: {
      fontSize: 8.5,
      color: PRIMARY,
      fontWeight: "800",
    },

    empty: {
      alignItems:
        "center",
      paddingTop: 85,
      paddingHorizontal: 35,
    },

    emptyIcon: {
      width: 75,
      height: 75,
      borderRadius: 38,
      backgroundColor:
        "#EEEEFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      marginTop: 15,
      fontSize: 19,
      fontWeight: "900",
      color: "#222",
    },

    emptyText: {
      marginTop: 6,
      textAlign: "center",
      lineHeight: 19,
      color: "#888",
    },

    modal: {
      flex: 1,
      backgroundColor:
        "#fff",
    },

    modalHeader: {
      height: 61,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor:
        "#ECECEC",
    },

    closeButton: {
      width: 42,
      height: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    modalTitle: {
      fontSize: 16,
      fontWeight: "800",
    },

    modalContent: {
      padding: 20,
      paddingBottom: 60,
    },

    profileTop: {
      alignItems:
        "center",
    },

    largeAvatar: {
      width: 91,
      height: 91,
      borderRadius: 46,
    },

    largeAvatarFallback: {
      width: 91,
      height: 91,
      borderRadius: 46,
      backgroundColor:
        "#EEEEFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    largeAvatarText: {
      fontSize: 28,
      fontWeight: "900",
      color: PRIMARY,
    },

    detailName: {
      marginTop: 14,
      fontSize: 22,
      fontWeight: "900",
      color: "#111",
    },

    detailHeadline: {
      marginTop: 5,
      color: "#666",
      fontSize: 13,
      textAlign: "center",
    },

    detailCampus: {
      marginTop: 4,
      color: "#999",
      fontSize: 11,
    },

    profileActions: {
      marginTop: 21,
      flexDirection: "row",
      gap: 9,
    },

    primaryProfileButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
    },

    primaryProfileButtonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 13,
    },

    secondaryProfileButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 13,
      backgroundColor:
        "#EEEEFF",
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
    },

    secondaryProfileButtonText: {
      color: PRIMARY,
      fontWeight: "800",
      fontSize: 13,
    },

    portfolioButton: {
      marginTop: 12,
      minHeight: 75,
      padding: 13,
      borderWidth: 1,
      borderColor:
        "#ECECF1",
      borderRadius: 15,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    portfolioIcon: {
      width: 43,
      height: 43,
      borderRadius: 12,
      backgroundColor:
        "#EEEEFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    portfolioTitle: {
      fontWeight: "800",
      color: "#222",
      fontSize: 13,
    },

    portfolioSubtitle: {
      marginTop: 3,
      color: "#888",
      fontSize: 10.5,
    },

    infoCard: {
      marginTop: 21,
      padding: 15,
      borderRadius: 14,
      backgroundColor:
        "#F6F6FA",
    },

    infoLabel: {
      color: "#888",
      fontSize: 10,
      textTransform:
        "uppercase",
      fontWeight: "700",
    },

    infoValue: {
      marginTop: 5,
      color: "#222",
      fontSize: 15,
      fontWeight: "800",
    },

    sectionTitle: {
      marginTop: 25,
      marginBottom: 11,
      fontSize: 16,
      fontWeight: "800",
      color: "#222",
    },

    skills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },

    skill: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor:
        "#F0F0FF",
    },

    skillText: {
      color: PRIMARY,
      fontWeight: "700",
      fontSize: 11,
    },

    statusActions: {
      gap: 9,
    },

    statusActionButton: {
      minHeight: 50,
      borderRadius: 13,
      backgroundColor:
        "#F5F5FA",
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    statusActionActive: {
      backgroundColor:
        PRIMARY,
    },

    statusActionDanger: {
      borderWidth: 1,
      borderColor:
        "#FFD6D6",
    },

    statusActionText: {
      fontWeight: "800",
      color: PRIMARY,
    },

    statusActionTextActive: {
      color: "#fff",
    },

    statusActionDangerText: {
      color: "#C62828",
    },
  });