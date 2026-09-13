import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
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
  useFocusEffect,
  useRouter,
} from "expo-router";

import {
  supabase,
} from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type Opportunity = {
  id: string;
  title: string;
  status: string | null;
  opportunity_type: string | null;
  closing_date: string | null;
  created_at: string;
};

type Application = {
  id: string;
  opportunity_id: string;
  status: string | null;
  created_at: string;
};

type DashboardStats = {
  activeJobs: number;
  applicants: number;
  reviewing: number;
  shortlisted: number;
  accepted: number;
};

export default function BusinessDashboard() {
  const router = useRouter();

  const [
    companyName,
    setCompanyName,
  ] = useState("Your business");

  const [
    stats,
    setStats,
  ] = useState<DashboardStats>({
    activeJobs: 0,
    applicants: 0,
    reviewing: 0,
    shortlisted: 0,
    accepted: 0,
  });

  const [
    opportunities,
    setOpportunities,
  ] = useState<Opportunity[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const loadDashboard =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
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

          if (
            userError ||
            !user
          ) {
            throw new Error(
              "Business account could not be found."
            );
          }

          /*
           * COMPANY DETAILS
           */

          const {
            data:
              businessProfile,
            error:
              businessError,
          } =
            await supabase
              .from(
                "business_profiles"
              )
              .select(
                `
                organisation_name
              `
              )
              .eq(
                "user_id",
                user.id
              )
              .maybeSingle();

          if (
            businessError
          ) {
            console.log(
              "Dashboard business profile error:",
              businessError
            );
          }

          if (
            businessProfile
              ?.organisation_name
          ) {
            setCompanyName(
              businessProfile
                .organisation_name
            );
          }

          /*
           * BUSINESS OPPORTUNITIES
           */

          const {
            data:
              opportunityRows,
            error:
              opportunityError,
          } =
            await supabase
              .from(
                "opportunities"
              )
              .select(
                `
                id,
                title,
                status,
                opportunity_type,
                closing_date,
                created_at
              `
              )
              .eq(
                "business_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );

          if (
            opportunityError
          ) {
            throw opportunityError;
          }

          const jobs =
            (
              opportunityRows ||
              []
            ) as Opportunity[];

          setOpportunities(
            jobs.slice(
              0,
              4
            )
          );

          /*
           * ACTIVE JOB COUNT
           */

          const now =
            new Date();

          const activeJobs =
            jobs.filter(
              job => {
                if (
                  job.status !==
                  "approved"
                ) {
                  return false;
                }

                if (
                  !job.closing_date
                ) {
                  return true;
                }

                return (
                  new Date(
                    job.closing_date
                  ) >= now
                );
              }
            ).length;

          /*
           * APPLICATIONS
           */

          if (
            jobs.length ===
            0
          ) {
            setStats({
              activeJobs,
              applicants: 0,
              reviewing: 0,
              shortlisted: 0,
              accepted: 0,
            });

            return;
          }

          const opportunityIds =
            jobs.map(
              item =>
                item.id
            );

          const {
            data:
              applicationRows,
            error:
              applicationError,
          } =
            await supabase
              .from(
                "opportunity_applications"
              )
              .select(
                `
                id,
                opportunity_id,
                status,
                created_at
              `
              )
              .in(
                "opportunity_id",
                opportunityIds
              );

          if (
            applicationError
          ) {
            throw applicationError;
          }

          const applications =
            (
              applicationRows ||
              []
            ) as Application[];

          setStats({
            activeJobs,

            applicants:
              applications.length,

            reviewing:
              applications.filter(
                item =>
                  item.status ===
                    "reviewing" ||
                  item.status ===
                    "pending"
              ).length,

            shortlisted:
              applications.filter(
                item =>
                  item.status ===
                  "shortlisted"
              ).length,

            accepted:
              applications.filter(
                item =>
                  item.status ===
                  "accepted"
              ).length,
          });
        } catch (
          error: any
        ) {
          console.log(
            "Business dashboard error:",
            error
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
      []
    );

  /*
   * Reload when returning
   * to dashboard.
   */

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [
      loadDashboard,
    ])
  );

  /*
   * REALTIME
   */

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "business-dashboard"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "opportunities",
          },
          () => {
            loadDashboard(
              false
            );
          }
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
            loadDashboard(
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
    loadDashboard,
  ]);

  async function refresh() {
    setRefreshing(
      true
    );

    await loadDashboard(
      false
    );
  }

  function openJobs() {
    router.push(
      "/(business-auth)/(tabs)/jobs"
    );
  }

  function openApplicants() {
    router.push(
      "/(business-auth)/(tabs)/applicants"
    );
  }

  function openProfile() {
    router.push(
      "/(business-auth)/profile"
    );
  }

  function openFeed() {
    router.push(
      "/(business-auth)/(tabs)/feed"
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
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
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={
                styles.greeting
              }
            >
              Dashboard
            </Text>

            <Text
              style={
                styles.companyName
              }
              numberOfLines={
                1
              }
            >
              {companyName}
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.notificationButton
            }
            activeOpacity={
              0.7
            }
          >
            <Ionicons
              name="notifications-outline"
              size={23}
              color="#111"
            />
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Hiring overview
          </Text>

          <TouchableOpacity
            onPress={
              openApplicants
            }
          >
            <Text
              style={
                styles.sectionLink
              }
            >
              View applicants
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={
            styles.primaryStats
          }
        >
          <View
            style={
              styles.mainStat
            }
          >
            <Text
              style={
                styles.mainStatValue
              }
            >
              {
                stats.activeJobs
              }
            </Text>

            <Text
              style={
                styles.mainStatLabel
              }
            >
              Active jobs
            </Text>
          </View>

          <View
            style={
              styles.statDivider
            }
          />

          <View
            style={
              styles.mainStat
            }
          >
            <Text
              style={
                styles.mainStatValue
              }
            >
              {
                stats.applicants
              }
            </Text>

            <Text
              style={
                styles.mainStatLabel
              }
            >
              Applicants
            </Text>
          </View>
        </View>

        {/* PIPELINE */}

        <View
          style={
            styles.pipeline
          }
        >
          <PipelineItem
            label="Pending"
            value={
              stats.reviewing
            }
          />

          <PipelineItem
            label="Shortlisted"
            value={
              stats.shortlisted
            }
          />

          <PipelineItem
            label="Accepted"
            value={
              stats.accepted
            }
          />
        </View>

        {/* QUICK ACTIONS */}

        <Text
          style={[
            styles.sectionTitle,
            styles.actionsHeading,
          ]}
        >
          Quick actions
        </Text>

        <View
          style={
            styles.actionsContainer
          }
        >
          <QuickAction
            icon="add-outline"
            title="Post an opportunity"
            onPress={
              openJobs
            }
          />

          <QuickAction
            icon="people-outline"
            title="Review applicants"
            onPress={
              openApplicants
            }
          />

          <QuickAction
            icon="search-outline"
            title="Discover talent"
            onPress={
              openFeed
            }
          />

          <QuickAction
            icon="business-outline"
            title="Company profile"
            onPress={
              openProfile
            }
          />
        </View>

        {/* RECENT OPPORTUNITIES */}

        <View
          style={[
            styles.sectionHeader,
            styles.jobsHeader,
          ]}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Recent opportunities
          </Text>

          <TouchableOpacity
            onPress={
              openJobs
            }
          >
            <Text
              style={
                styles.sectionLink
              }
            >
              See all
            </Text>
          </TouchableOpacity>
        </View>

        {opportunities.length ===
        0 ? (
          <View
            style={
              styles.emptyState
            }
          >
            <Ionicons
              name="briefcase-outline"
              size={29}
              color="#777"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No opportunities yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Create your first
              opportunity to start
              receiving applications.
            </Text>

            <TouchableOpacity
              onPress={
                openJobs
              }
              style={
                styles.emptyButton
              }
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Create opportunity
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={
              styles.jobsList
            }
          >
            {opportunities.map(
              job => (
                <OpportunityRow
                  key={
                    job.id
                  }
                  job={
                    job
                  }
                  onPress={
                    openJobs
                  }
                />
              )
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   PIPELINE
========================================================= */

function PipelineItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View
      style={
        styles.pipelineItem
      }
    >
      <Text
        style={
          styles.pipelineValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.pipelineLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={
        styles.actionRow
      }
      activeOpacity={
        0.65
      }
      onPress={
        onPress
      }
    >
      <Ionicons
        name={icon}
        size={21}
        color="#222"
      />

      <Text
        style={
          styles.actionTitle
        }
      >
        {title}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#aaa"
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   OPPORTUNITY
========================================================= */

function OpportunityRow({
  job,
  onPress,
}: {
  job: Opportunity;
  onPress: () => void;
}) {
  const status =
    getStatusInfo(
      job.status
    );

  return (
    <TouchableOpacity
      style={
        styles.jobRow
      }
      activeOpacity={
        0.7
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.jobInfo
        }
      >
        <Text
          style={
            styles.jobTitle
          }
          numberOfLines={
            1
          }
        >
          {job.title}
        </Text>

        <View
          style={
            styles.jobMetaRow
          }
        >
          <Text
            style={
              styles.jobMeta
            }
          >
            {formatType(
              job.opportunity_type
            )}
          </Text>

          {job.closing_date && (
            <>
              <Text
                style={
                  styles.metaDot
                }
              >
                •
              </Text>

              <Text
                style={
                  styles.jobMeta
                }
              >
                Closes{" "}
                {formatDate(
                  job.closing_date
                )}
              </Text>
            </>
          )}
        </View>
      </View>

      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              status.background,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            {
              color:
                status.color,
            },
          ]}
        >
          {status.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatType(
  value: string | null
) {
  if (!value) {
    return "Opportunity";
  }

  return value
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      char =>
        char.toUpperCase()
    );
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
    }
  );
}

function getStatusInfo(
  status: string | null
) {
  switch (status) {
    case "approved":
      return {
        label: "Live",
        color: "#157347",
        background:
          "#E9F7EF",
      };

    case "pending":
      return {
        label: "Pending",
        color: "#8A6116",
        background:
          "#FFF5DA",
      };

    case "rejected":
      return {
        label: "Rejected",
        color: "#B42318",
        background:
          "#FDECEC",
      };

    case "closed":
      return {
        label: "Closed",
        color: "#666",
        background:
          "#EEEEF1",
      };

    default:
      return {
        label:
          status ||
          "Draft",
        color: "#666",
        background:
          "#EEEEF1",
      };
  }
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    loadingContainer: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    content: {
      paddingHorizontal:
        20,
      paddingTop: 8,
      paddingBottom:
        40,
    },

    /*
     * Header
     */

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingVertical:
        12,
      marginBottom:
        28,
    },

    headerText: {
      flex: 1,
      paddingRight:
        16,
    },

    greeting: {
      fontSize: 26,
      fontWeight:
        "800",
      color: "#111",
      letterSpacing:
        -0.5,
    },

    companyName: {
      marginTop: 4,
      color: "#6B6B72",
      fontSize: 14,
    },

    notificationButton: {
      width: 42,
      height: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "#E6E6E8",
      borderRadius: 21,
    },

    /*
     * Sections
     */

    sectionHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom:
        14,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#171717",
    },

    sectionLink: {
      color: PRIMARY,
      fontSize: 12,
      fontWeight:
        "700",
    },

    /*
     * Stats
     */

    primaryStats: {
      flexDirection:
        "row",
      borderWidth: 1,
      borderColor:
        "#E8E8EA",
      borderRadius: 12,
      minHeight: 104,
      backgroundColor:
        "#FFFFFF",
    },

    mainStat: {
      flex: 1,
      justifyContent:
        "center",
      paddingHorizontal:
        18,
    },

    statDivider: {
      width: 1,
      backgroundColor:
        "#E8E8EA",
      marginVertical:
        18,
    },

    mainStatValue: {
      color: "#111",
      fontSize: 28,
      fontWeight:
        "800",
    },

    mainStatLabel: {
      color: "#73737A",
      fontSize: 12,
      marginTop: 3,
    },

    /*
     * Pipeline
     */

    pipeline: {
      flexDirection:
        "row",
      paddingVertical:
        18,
      borderBottomWidth:
        1,
      borderBottomColor:
        "#ECECEE",
    },

    pipelineItem: {
      flex: 1,
    },

    pipelineValue: {
      fontSize: 17,
      fontWeight:"700",
      color: "#222",
    },

    pipelineLabel: {
      marginTop: 3,
      color: "#85858B",
      fontSize: 11,
    },

    /*
     * Actions
     */

    actionsHeading: {
      marginTop: 28,
      marginBottom:
        10,
    },

    actionsContainer: {
      borderTopWidth: 1,
      borderTopColor:
        "#EBEBED",
    },

    actionRow: {
      minHeight: 57,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderBottomWidth:
        1,
      borderBottomColor:
        "#EBEBED",
    },

    actionTitle: {
      flex: 1,
      marginLeft: 13,
      fontSize: 14,
      color: "#242424",
      fontWeight:
        "600",
    },

    /*
     * Opportunities
     */

    jobsHeader: {
      marginTop: 30,
    },

    jobsList: {
      borderTopWidth: 1,
      borderTopColor:
        "#EBEBED",
    },

    jobRow: {
      minHeight: 76,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderBottomWidth:
        1,
      borderBottomColor:
        "#EBEBED",
      paddingVertical:
        12,
    },

    jobInfo: {
      flex: 1,
      paddingRight:
        12,
    },

    jobTitle: {
      fontSize: 14,
      color: "#171717",
      fontWeight:
        "700",
    },

    jobMetaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 6,
      flexWrap:
        "wrap",
    },

    jobMeta: {
      color: "#77777E",
      fontSize: 11,
    },

    metaDot: {
      color: "#B0B0B5",
      fontSize: 10,
      marginHorizontal:
        6,
    },

    statusBadge: {
      paddingHorizontal:
        10,
      paddingVertical:
        5,
      borderRadius: 20,
    },

    statusText: {
      fontSize: 10,
      fontWeight:
        "700",
    },

    /*
     * Empty
     */

    emptyState: {
      alignItems:
        "flex-start",
      paddingVertical:
        24,
      borderTopWidth: 1,
      borderTopColor:
        "#EBEBED",
    },

    emptyTitle: {
      marginTop: 12,
      fontSize: 15,
      fontWeight:
        "700",
      color: "#222",
    },

    emptyText: {
      marginTop: 5,
      color: "#777",
      fontSize: 12,
      lineHeight: 18,
      maxWidth: 290,
    },

    emptyButton: {
      marginTop: 15,
      paddingVertical:
        10,
      paddingHorizontal:
        14,
      borderRadius: 7,
      backgroundColor:
        PRIMARY,
    },

    emptyButtonText: {
      color: "#FFF",
      fontSize: 12,
      fontWeight:
        "700",
    },
  }) as any;