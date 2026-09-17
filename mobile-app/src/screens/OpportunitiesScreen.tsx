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
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  Opportunity,
  OpportunityType,
  WorkMode,
  getApprovedOpportunities,
  getStudentCareerProfile,
} from "../services/opportunityService";

import {
  supabase,
} from "../lib/supabase";

const PRIMARY = "#0300cf";

type TypeFilter =
  | "all"
  | OpportunityType;

type ModeFilter =
  | "all"
  | WorkMode;

type MatchFilter =
  | "all"
  | "recommended"
  | "strong";

type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "shortlisted"
  | "rejected"
  | "accepted";

const opportunityTypes: {
  label: string;
  value: TypeFilter;
}[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Internships",
    value: "internship",
  },
  {
    label: "Learnerships",
    value: "learnership",
  },
  {
    label: "Graduate",
    value: "graduate",
  },
  {
    label: "Jobs",
    value: "job",
  },
  {
    label: "Part-time",
    value: "part_time",
  },
];

const workModes: {
  label: string;
  value: ModeFilter;
  icon: any;
}[] = [
  {
    label: "All",
    value: "all",
    icon: "apps-outline",
  },
  {
    label: "On-site",
    value: "onsite",
    icon: "business-outline",
  },
  {
    label: "Hybrid",
    value: "hybrid",
    icon: "git-compare-outline",
  },
  {
    label: "Remote",
    value: "remote",
    icon: "home-outline",
  },
];

function formatType(
  type: string
) {
  switch (type) {
    case "part_time":
      return "Part-time";

    case "graduate":
      return "Graduate";

    case "internship":
      return "Internship";

    case "learnership":
      return "Learnership";

    case "job":
      return "Job";

    default:
      return type;
  }
}

function formatMode(
  mode?: string | null
) {
  if (!mode) {
    return "Not specified";
  }

  if (mode === "onsite") {
    return "On-site";
  }

  return (
    mode.charAt(0).toUpperCase() +
    mode.slice(1)
  );
}

function formatDate(
  date?: string | null
) {
  if (!date) {
    return "No closing date";
  }

  const parsedDate =
    new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "No closing date";
  }

  return parsedDate.toLocaleDateString(
    "en-ZA",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function getMatchLabel(
  score: number
) {
  if (score >= 80) {
    return "Excellent match";
  }

  if (score >= 65) {
    return "Good match";
  }

  if (score >= 45) {
    return "Possible match";
  }

  return "Explore";
}

export default function OpportunitiesScreen() {
  const [
    opportunities,
    setOpportunities,
  ] = useState<
    Opportunity[]
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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<TypeFilter>(
      "all"
    );

  const [
    modeFilter,
    setModeFilter,
  ] =
    useState<ModeFilter>(
      "all"
    );

  const [
    matchFilter,
    setMatchFilter,
  ] =
    useState<MatchFilter>(
      "all"
    );

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);

  const [
    selectedOpportunity,
    setSelectedOpportunity,
  ] =
    useState<
      Opportunity | null
    >(null);

  const loadOpportunities =
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

          setError(null);

          const student =
            await getStudentCareerProfile();

          const data =
            await getApprovedOpportunities(
              student
            );

          console.log(
            "Approved opportunities loaded:",
            data.length
          );

          setOpportunities(
            data
          );
        } catch (
          loadError: any
        ) {
          console.log(
            "Opportunities error:",
            loadError
          );

          setError(
            loadError?.message ||
              "Could not load opportunities."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  const [
    applying,
    setApplying,
  ] = useState(false);

  const [
    applicationStatuses,
    setApplicationStatuses,
  ] = useState<
    Record<
      string,
      ApplicationStatus
    >
  >({});

  const loadMyApplications =
    useCallback(
      async () => {
        try {
          const {
            data: { user },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (!user) {
            setApplicationStatuses(
              {}
            );

            return;
          }

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "opportunity_applications"
              )
              .select(
                "opportunity_id,status"
              )
              .eq(
                "applicant_id",
                user.id
              );

          if (error) {
            throw error;
          }

          const nextStatuses: Record<
            string,
            ApplicationStatus
          > = {};

          (data || []).forEach(
            item => {
              nextStatuses[
                item.opportunity_id
              ] =
                item.status as ApplicationStatus;
            }
          );

          setApplicationStatuses(
            nextStatuses
          );
        } catch (
          applicationError
        ) {
          console.log(
            "Applications load error:",
            applicationError
          );
        }
      },
      []
    );

  async function applyForOpportunity(
    opportunityId: string
  ) {
    if (
      applicationStatuses[
        opportunityId
      ]
    ) {
      return;
    }

    setApplying(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be signed in."
        );
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "opportunity_applications"
          )
          .insert({
            opportunity_id:
              opportunityId,

            applicant_id:
              user.id,

            status:
              "pending",
          })
          .select(
            "opportunity_id,status"
          )
          .single();

      if (error) {
        if (
          error.code ===
          "23505"
        ) {
          await loadMyApplications();

          Alert.alert(
            "Already applied",
            "You have already applied for this opportunity."
          );

          return;
        }

        throw error;
      }

      setApplicationStatuses(
        current => ({
          ...current,

          [data.opportunity_id]:
            data.status as ApplicationStatus,
        })
      );

      Alert.alert(
        "Application sent",
        "Your application has been sent to the business."
      );
    } catch (
      applyError: any
    ) {
      console.log(
        "Apply error:",
        applyError
      );

      Alert.alert(
        "Could not apply",
        applyError?.message ||
          "Something went wrong."
      );
    } finally {
      setApplying(false);
    }
  }

  useEffect(() => {
    loadOpportunities();
    loadMyApplications();

    const channelName =
      `student-opportunities-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opportunities",
        },
        () => {
          loadOpportunities(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opportunity_applications",
        },
        () => {
          loadMyApplications();
        }
      )
      .subscribe(status => {
        console.log(
          "Student career realtime:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    loadOpportunities,
    loadMyApplications,
  ]);

  const activeFilterCount =
    useMemo(() => {
      let count = 0;

      if (
        modeFilter !== "all"
      ) {
        count++;
      }

      if (
        matchFilter !== "all"
      ) {
        count++;
      }

      return count;
    }, [
      modeFilter,
      matchFilter,
    ]);

  const filtered =
    useMemo(() => {
      let list = [
        ...opportunities,
      ];

      const value =
        search
          .trim()
          .toLowerCase();

      if (value) {
        list =
          list.filter(
            opportunity => {
              const searchable =
                `
                ${opportunity.title}
                ${opportunity.description}
                ${opportunity.company_name}
                ${opportunity.location || ""}
                ${opportunity.work_mode || ""}
                ${opportunity.opportunity_type}
                ${opportunity.required_skills.join(
                  " "
                )}
                ${opportunity.programme_keywords.join(
                  " "
                )}
                `
                  .toLowerCase();

              return searchable.includes(
                value
              );
            }
          );
      }

      if (
        typeFilter !==
        "all"
      ) {
        list =
          list.filter(
            item =>
              item.opportunity_type ===
              typeFilter
          );
      }

      if (
        modeFilter !==
        "all"
      ) {
        list =
          list.filter(
            item =>
              item.work_mode ===
              modeFilter
          );
      }

      if (
        matchFilter ===
        "recommended"
      ) {
        list =
          list.filter(
            item =>
              item.matchScore >=
              50
          );
      }

      if (
        matchFilter ===
        "strong"
      ) {
        list =
          list.filter(
            item =>
              item.matchScore >=
              70
          );
      }

      return list.sort(
        (a, b) =>
          b.matchScore -
          a.matchScore
      );
    }, [
      opportunities,
      search,
      typeFilter,
      modeFilter,
      matchFilter,
    ]);

  function clearFilters() {
    setModeFilter(
      "all"
    );

    setMatchFilter(
      "all"
    );
  }

  async function refresh() {
    setRefreshing(
      true
    );

    await Promise.all([
      loadOpportunities(
        false
      ),

      loadMyApplications(),
    ]);

    setRefreshing(
      false
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
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
            Finding opportunities
            for you...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <FlatList
        data={
          filtered
        }
        keyExtractor={item =>
          item.id
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
              refresh
            }
          />
        }
        ListHeaderComponent={
          <>
            <View
              style={
                styles.header
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.title
                  }
                >
                  Career
                </Text>

                <Text
                  style={
                    styles.subtitle
                  }
                >
                  Opportunities
                  matched to your
                  profile
                </Text>
              </View>

              <View
                style={
                  styles.headerIcon
                }
              >
                <Ionicons
                  name="briefcase-outline"
                  size={22}
                  color={
                    PRIMARY
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.searchFilterRow
              }
            >
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
                  value={
                    search
                  }
                  onChangeText={
                    setSearch
                  }
                  placeholder="Search opportunities"
                  placeholderTextColor="#999"
                  style={
                    styles.searchInput
                  }
                />

                {search.length >
                0 ? (
                  <TouchableOpacity
                    onPress={() =>
                      setSearch("")
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color="#888"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                activeOpacity={
                  0.8
                }
                style={[
                  styles.filterButton,
                  filtersOpen &&
                    styles.filterButtonOpen,
                ]}
                onPress={() =>
                  setFiltersOpen(
                    current =>
                      !current
                  )
                }
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={
                    filtersOpen
                      ? "#fff"
                      : PRIMARY
                  }
                />

                {activeFilterCount >
                0 ? (
                  <View
                    style={
                      styles.filterCount
                    }
                  >
                    <Text
                      style={
                        styles.filterCountText
                      }
                    >
                      {
                        activeFilterCount
                      }
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            {filtersOpen ? (
              <View
                style={
                  styles.filterPanel
                }
              >
                <View
                  style={
                    styles.filterPanelHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.filterPanelTitle
                      }
                    >
                      Filters
                    </Text>

                    <Text
                      style={
                        styles.filterPanelSubtitle
                      }
                    >
                      Refine your
                      opportunities
                    </Text>
                  </View>

                  {activeFilterCount >
                  0 ? (
                    <TouchableOpacity
                      onPress={
                        clearFilters
                      }
                    >
                      <Text
                        style={
                          styles.clearText
                        }
                      >
                        Clear
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text
                  style={
                    styles.filterSectionTitle
                  }
                >
                  Work style
                </Text>

                <View
                  style={
                    styles.filterOptions
                  }
                >
                  {workModes.map(
                    item => {
                      const selected =
                        modeFilter ===
                        item.value;

                      return (
                        <TouchableOpacity
                          key={
                            item.value
                          }
                          activeOpacity={
                            0.8
                          }
                          style={[
                            styles.filterOption,
                            selected &&
                              styles.filterOptionSelected,
                          ]}
                          onPress={() =>
                            setModeFilter(
                              item.value
                            )
                          }
                        >
                          <View
                            style={[
                              styles.filterOptionIcon,
                              selected &&
                                styles.filterOptionIconSelected,
                            ]}
                          >
                            <Ionicons
                              name={
                                item.icon
                              }
                              size={
                                17
                              }
                              color={
                                selected
                                  ? PRIMARY
                                  : "#666"
                              }
                            />
                          </View>

                          <Text
                            style={[
                              styles.filterOptionText,
                              selected &&
                                styles.filterOptionTextSelected,
                            ]}
                          >
                            {
                              item.label
                            }
                          </Text>

                          <Ionicons
                            name={
                              selected
                                ? "radio-button-on"
                                : "radio-button-off"
                            }
                            size={
                              19
                            }
                            color={
                              selected
                                ? PRIMARY
                                : "#aaa"
                            }
                          />
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                <View
                  style={
                    styles.filterDivider
                  }
                />

                <Text
                  style={
                    styles.filterSectionTitle
                  }
                >
                  Match quality
                </Text>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    matchFilter ===
                      "all" &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setMatchFilter(
                      "all"
                    )
                  }
                >
                  <View
                    style={
                      styles.filterTextArea
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        matchFilter ===
                          "all" &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      All opportunities
                    </Text>

                    <Text
                      style={
                        styles.filterOptionDescription
                      }
                    >
                      Show every approved
                      opportunity
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      matchFilter ===
                      "all"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={19}
                    color={
                      matchFilter ===
                      "all"
                        ? PRIMARY
                        : "#aaa"
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    matchFilter ===
                      "recommended" &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setMatchFilter(
                      "recommended"
                    )
                  }
                >
                  <View
                    style={
                      styles.filterTextArea
                    }
                  >
                    <View
                      style={
                        styles.filterLabelRow
                      }
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={16}
                        color={
                          PRIMARY
                        }
                      />

                      <Text
                        style={[
                          styles.filterOptionText,
                          matchFilter ===
                            "recommended" &&
                            styles.filterOptionTextSelected,
                        ]}
                      >
                        Recommended
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.filterOptionDescription
                      }
                    >
                      Opportunities with
                      at least a 50% match
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      matchFilter ===
                      "recommended"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={19}
                    color={
                      matchFilter ===
                      "recommended"
                        ? PRIMARY
                        : "#aaa"
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    matchFilter ===
                      "strong" &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    setMatchFilter(
                      "strong"
                    )
                  }
                >
                  <View
                    style={
                      styles.filterTextArea
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        matchFilter ===
                          "strong" &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      70%+ Match
                    </Text>

                    <Text
                      style={
                        styles.filterOptionDescription
                      }
                    >
                      Only strong matches
                      for your profile
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      matchFilter ===
                      "strong"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={19}
                    color={
                      matchFilter ===
                      "strong"
                        ? PRIMARY
                        : "#aaa"
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.doneFilterButton
                  }
                  onPress={() =>
                    setFiltersOpen(
                      false
                    )
                  }
                >
                  <Text
                    style={
                      styles.doneFilterText
                    }
                  >
                    Show{" "}
                    {
                      filtered.length
                    }{" "}
                    opportunities
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View
              style={
                styles.typeHeader
              }
            >
              <Text
                style={
                  styles.filterTitle
                }
              >
                Opportunity type
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.chipRow
              }
            >
              {opportunityTypes.map(
                item => {
                  const active =
                    typeFilter ===
                    item.value;

                  return (
                    <TouchableOpacity
                      key={
                        item.value
                      }
                      activeOpacity={
                        0.8
                      }
                      style={[
                        styles.chip,
                        active &&
                          styles.activeChip,
                      ]}
                      onPress={() =>
                        setTypeFilter(
                          item.value
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active &&
                            styles.activeChipText,
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

            <View
              style={
                styles.resultsRow
              }
            >
              <Text
                style={
                  styles.resultsTitle
                }
              >
                Opportunities
              </Text>

              <Text
                style={
                  styles.resultsCount
                }
              >
                {
                  filtered.length
                }{" "}
                found
              </Text>
            </View>

            {error ? (
              <View
                style={
                  styles.errorBox
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#b42318"
                />

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({
          item,
        }) => (
          <TouchableOpacity
            activeOpacity={
              0.85
            }
            style={
              styles.card
            }
            onPress={() =>
              setSelectedOpportunity(
                item
              )
            }
          >
            <View
              style={
                styles.cardTop
              }
            >
              <View
                style={
                  styles.companyLogo
                }
              >
                <Text
                  style={
                    styles.companyInitial
                  }
                >
                  {item.company_name
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View
                style={
                  styles.cardHeading
                }
              >
                <Text
                  style={
                    styles.jobTitle
                  }
                  numberOfLines={
                    2
                  }
                >
                  {
                    item.title
                  }
                </Text>

                <Text
                  style={
                    styles.companyName
                  }
                >
                  {
                    item.company_name
                  }
                </Text>
              </View>

              <View
                style={
                  styles.scoreBox
                }
              >
                <Text
                  style={
                    styles.score
                  }
                >
                  {
                    item.matchScore
                  }
                  %
                </Text>

                <Text
                  style={
                    styles.scoreLabel
                  }
                >
                  match
                </Text>
              </View>
            </View>

            <View
              style={
                styles.metaRow
              }
            >
              <View
                style={
                  styles.metaItem
                }
              >
                <Ionicons
                  name="briefcase-outline"
                  size={15}
                  color="#666"
                />

                <Text
                  style={
                    styles.metaText
                  }
                >
                  {formatType(
                    item.opportunity_type
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.metaItem
                }
              >
                <Ionicons
                  name="location-outline"
                  size={15}
                  color="#666"
                />

                <Text
                  style={
                    styles.metaText
                  }
                  numberOfLines={
                    1
                  }
                >
                  {item.location ||
                    "Not specified"}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.metaRow
              }
            >
              <View
                style={
                  styles.metaItem
                }
              >
                <Ionicons
                  name="business-outline"
                  size={15}
                  color="#666"
                />

                <Text
                  style={
                    styles.metaText
                  }
                >
                  {formatMode(
                    item.work_mode
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.metaItem
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color="#666"
                />

                <Text
                  style={
                    styles.metaText
                  }
                  numberOfLines={
                    1
                  }
                >
                  {formatDate(
                    item.closing_date
                  )}
                </Text>
              </View>
            </View>

            {item.required_skills
              .length >
            0 ? (
              <View
                style={
                  styles.skillsRow
                }
              >
                {item.required_skills
                  .slice(
                    0,
                    3
                  )
                  .map(skill => (
                    <View
                      key={
                        skill
                      }
                      style={
                        styles.skillBadge
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
                  ))}

                {item.required_skills
                  .length >
                3 ? (
                  <View
                    style={
                      styles.skillBadge
                    }
                  >
                    <Text
                      style={
                        styles.skillText
                      }
                    >
                      +
                      {item
                        .required_skills
                        .length -
                        3}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View
              style={
                styles.matchFooter
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.matchLabel
                  }
                >
                  {getMatchLabel(
                    item.matchScore
                  )}
                </Text>

                <Text
                  style={
                    styles.matchReason
                  }
                  numberOfLines={
                    1
                  }
                >
                  {
                    item
                      .matchReasons[0]
                  }
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={
                  PRIMARY
                }
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View
            style={
              styles.emptyState
            }
          >
            <Ionicons
              name="briefcase-outline"
              size={50}
              color="#aaa"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No opportunities
              found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Try changing your
              search or filters.
            </Text>

            {activeFilterCount >
            0 ? (
              <TouchableOpacity
                style={
                  styles.emptyClearButton
                }
                onPress={
                  clearFilters
                }
              >
                <Text
                  style={
                    styles.emptyClearText
                  }
                >
                  Clear filters
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        contentContainerStyle={
          styles.listContent
        }
      />

      <Modal
        visible={
          !!selectedOpportunity
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setSelectedOpportunity(
            null
          )
        }
      >
        {selectedOpportunity ? (
          <SafeAreaView
            style={
              styles.modalContainer
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
                  setSelectedOpportunity(
                    null
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color="#222"
                />
              </TouchableOpacity>

              <Text
                style={
                  styles.modalHeaderTitle
                }
              >
                Opportunity
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
                  styles.detailCompanyIcon
                }
              >
                <Text
                  style={
                    styles.detailCompanyInitial
                  }
                >
                  {selectedOpportunity.company_name
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <Text
                style={
                  styles.detailTitle
                }
              >
                {
                  selectedOpportunity.title
                }
              </Text>

              <Text
                style={
                  styles.detailCompany
                }
              >
                {
                  selectedOpportunity.company_name
                }
              </Text>

              <View
                style={
                  styles.bigMatchCard
                }
              >
                <View>
                  <Text
                    style={
                      styles.bigMatchTitle
                    }
                  >
                    Your match
                  </Text>

                  <Text
                    style={
                      styles.bigMatchText
                    }
                  >
                    {getMatchLabel(
                      selectedOpportunity.matchScore
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.bigMatchScore
                  }
                >
                  {
                    selectedOpportunity.matchScore
                  }
                  %
                </Text>
              </View>

              <View
                style={
                  styles.detailInfoGrid
                }
              >
                <DetailInfo
                  icon="briefcase-outline"
                  label="Type"
                  value={formatType(
                    selectedOpportunity.opportunity_type
                  )}
                />

                <DetailInfo
                  icon="location-outline"
                  label="Location"
                  value={
                    selectedOpportunity.location ||
                    "Not specified"
                  }
                />

                <DetailInfo
                  icon="business-outline"
                  label="Work style"
                  value={formatMode(
                    selectedOpportunity.work_mode
                  )}
                />

                <DetailInfo
                  icon="calendar-outline"
                  label="Closes"
                  value={formatDate(
                    selectedOpportunity.closing_date
                  )}
                />
              </View>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                About this opportunity
              </Text>

              <Text
                style={
                  styles.description
                }
              >
                {
                  selectedOpportunity.description
                }
              </Text>

              {selectedOpportunity
                .required_skills
                .length >
              0 ? (
                <>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Skills they are
                    looking for
                  </Text>

                  <View
                    style={
                      styles.detailSkills
                    }
                  >
                    {selectedOpportunity.required_skills.map(
                      skill => {
                        const matched =
                          selectedOpportunity.matchedSkills.some(
                            item =>
                              item.toLowerCase() ===
                              skill.toLowerCase()
                          );

                        return (
                          <View
                            key={
                              skill
                            }
                            style={[
                              styles.detailSkillBadge,
                              matched &&
                                styles.matchedSkillBadge,
                            ]}
                          >
                            {matched ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={
                                  15
                                }
                                color={
                                  PRIMARY
                                }
                              />
                            ) : null}

                            <Text
                              style={[
                                styles.detailSkillText,
                                matched &&
                                  styles.matchedSkillText,
                              ]}
                            >
                              {
                                skill
                              }
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                </>
              ) : null}

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Why it matches you
              </Text>

              {selectedOpportunity
                .matchReasons
                .map(
                  (
                    reason,
                    index
                  ) => (
                    <View
                      key={`${reason}-${index}`}
                      style={
                        styles.reasonRow
                      }
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={18}
                        color={
                          PRIMARY
                        }
                      />

                      <Text
                        style={
                          styles.reasonText
                        }
                      >
                        {
                          reason
                        }
                      </Text>
                    </View>
                  )
                )}

              {(() => {
                const applicationStatus =
                  applicationStatuses[
                    selectedOpportunity.id
                  ];

                const alreadyApplied =
                  Boolean(
                    applicationStatus
                  );

                const statusLabel =
                  applicationStatus ===
                  "reviewing"
                    ? "Under review"
                    : applicationStatus ===
                      "shortlisted"
                    ? "Shortlisted"
                    : applicationStatus ===
                      "accepted"
                    ? "Accepted"
                    : applicationStatus ===
                      "rejected"
                    ? "Not selected"
                    : applicationStatus ===
                      "pending"
                    ? "Application sent"
                    : "Apply now";

                const statusIcon =
                  applicationStatus ===
                  "accepted"
                    ? "checkmark-circle"
                    : applicationStatus ===
                      "rejected"
                    ? "close-circle-outline"
                    : alreadyApplied
                    ? "time-outline"
                    : "send-outline";

                return (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={
                        applying ||
                        alreadyApplied
                      }
                      style={[
                        styles.applyButton,

                        alreadyApplied &&
                          styles.applyButtonDisabled,

                        applicationStatus ===
                          "accepted" &&
                          styles.applyButtonAccepted,

                        applicationStatus ===
                          "rejected" &&
                          styles.applyButtonRejected,
                      ]}
                      onPress={() =>
                        applyForOpportunity(
                          selectedOpportunity.id
                        )
                      }
                    >
                      {applying &&
                      !alreadyApplied ? (
                        <ActivityIndicator
                          size="small"
                          color="#fff"
                        />
                      ) : (
                        <Ionicons
                          name={
                            statusIcon as any
                          }
                          size={20}
                          color="#fff"
                        />
                      )}

                      <Text
                        style={
                          styles.applyButtonText
                        }
                      >
                        {applying &&
                        !alreadyApplied
                          ? "Sending application..."
                          : statusLabel}
                      </Text>
                    </TouchableOpacity>

                    {alreadyApplied ? (
                      <Text
                        style={
                          styles.applicationStatusHelp
                        }
                      >
                        {applicationStatus ===
                        "pending"
                          ? "The business has received your application."
                          : applicationStatus ===
                            "reviewing"
                          ? "The business is currently reviewing your application."
                          : applicationStatus ===
                            "shortlisted"
                          ? "You have been shortlisted for this opportunity."
                          : applicationStatus ===
                            "accepted"
                          ? "Congratulations. The business has accepted your application."
                          : "The business has completed its review of your application."}
                      </Text>
                    ) : (
                      <Text
                        style={
                          styles.applicationStatusHelp
                        }
                      >
                        Your Richfield profile will be shared with the business when you apply.
                      </Text>
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function DetailInfo({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.detailInfo
      }
    >
      <Ionicons
        name={icon}
        size={19}
        color={
          PRIMARY
        }
      />

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.detailInfoLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.detailInfoValue
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
    container: {
      flex: 1,
      backgroundColor:
        "#f7f7fb",
    },

    listContent: {
      paddingBottom: 110,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    loadingText: {
      marginTop: 12,
      color: "#666",
      fontSize: 14,
    },

    header: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 17,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    title: {
      fontSize: 30,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      fontSize: 14,
      color: "#777",
      marginTop: 3,
    },

    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor:
        "#ececff",
      alignItems: "center",
      justifyContent:
        "center",
    },

    searchFilterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      gap: 9,
    },

    searchBox: {
      flex: 1,
      height: 50,
      borderRadius: 15,
      backgroundColor: "#fff",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor:
        "#e8e8ee",
    },

    searchInput: {
      flex: 1,
      marginLeft: 9,
      fontSize: 14,
      color: "#111",
    },

    filterButton: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor:
        "#dddded",
      alignItems: "center",
      justifyContent:
        "center",
    },

    filterButtonOpen: {
      backgroundColor:
        PRIMARY,
      borderColor:
        PRIMARY,
    },

    filterCount: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor:
        "#ff3b30",
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        "#f7f7fb",
    },

    filterCountText: {
      color: "#fff",
      fontSize: 9,
      fontWeight: "800",
    },

    filterPanel: {
      marginHorizontal: 18,
      marginTop: 11,
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor:
        "#e8e8ef",
    },

    filterPanelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 18,
    },

    filterPanelTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#171717",
    },

    filterPanelSubtitle: {
      fontSize: 11,
      color: "#888",
      marginTop: 2,
    },

    clearText: {
      color: PRIMARY,
      fontSize: 13,
      fontWeight: "700",
    },

    filterSectionTitle: {
      fontSize: 12,
      color: "#777",
      fontWeight: "700",
      marginBottom: 9,
      textTransform:
        "uppercase",
    },

    filterOptions: {
      gap: 7,
    },

    filterOption: {
      minHeight: 53,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        "#ececf1",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      marginBottom: 7,
      backgroundColor:
        "#fafafd",
    },

    filterOptionSelected: {
      borderColor:
        "#c7c6ff",
      backgroundColor:
        "#f0f0ff",
    },

    filterOptionIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor:
        "#eeeeF3",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    filterOptionIconSelected: {
      backgroundColor:
        "#ddddff",
    },

    filterOptionText: {
      flex: 1,
      fontSize: 13,
      color: "#444",
      fontWeight: "600",
    },

    filterOptionTextSelected: {
      color: PRIMARY,
      fontWeight: "800",
    },

    filterTextArea: {
      flex: 1,
    },

    filterOptionDescription: {
      fontSize: 10,
      color: "#888",
      marginTop: 3,
    },

    filterLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    filterDivider: {
      height: 1,
      backgroundColor:
        "#eeeeF3",
      marginVertical: 14,
    },

    doneFilterButton: {
      marginTop: 10,
      height: 46,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    doneFilterText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "800",
    },

    typeHeader: {
      marginTop: 17,
    },

    filterTitle: {
      marginBottom: 9,
      marginHorizontal: 18,
      fontWeight: "700",
      color: "#333",
      fontSize: 13,
    },

    chipRow: {
      paddingHorizontal: 18,
      gap: 8,
    },

    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor:
        "#e2e2e8",
    },

    activeChip: {
      backgroundColor:
        PRIMARY,
      borderColor:
        PRIMARY,
    },

    chipText: {
      color: "#555",
      fontSize: 13,
      fontWeight: "600",
    },

    activeChipText: {
      color: "#fff",
    },

    resultsRow: {
      marginHorizontal: 18,
      marginTop: 25,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    resultsTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#171717",
    },

    resultsCount: {
      fontSize: 12,
      color: "#777",
    },

    errorBox: {
      marginHorizontal: 18,
      marginBottom: 12,
      backgroundColor:
        "#fff1f0",
      padding: 12,
      borderRadius: 12,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },

    errorText: {
      flex: 1,
      color: "#b42318",
      fontSize: 13,
    },

    card: {
      marginHorizontal: 18,
      marginBottom: 13,
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor:
        "#ededf2",
    },

    cardTop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
    },

    companyLogo: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        "#ededff",
      alignItems: "center",
      justifyContent:
        "center",
    },

    companyInitial: {
      fontSize: 20,
      fontWeight: "800",
      color: PRIMARY,
    },

    cardHeading: {
      flex: 1,
      marginHorizontal: 11,
    },

    jobTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
      color: "#151515",
    },

    companyName: {
      marginTop: 4,
      fontSize: 13,
      color: "#666",
    },

    scoreBox: {
      alignItems: "flex-end",
    },

    score: {
      color: PRIMARY,
      fontSize: 17,
      fontWeight: "800",
    },

    scoreLabel: {
      color: "#888",
      fontSize: 10,
    },

    metaRow: {
      flexDirection: "row",
      marginTop: 13,
      gap: 18,
    },

    metaItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    metaText: {
      flex: 1,
      fontSize: 12,
      color: "#666",
    },

    skillsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 15,
    },

    skillBadge: {
      backgroundColor:
        "#f1f1f6",
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },

    skillText: {
      fontSize: 11,
      color: "#555",
      fontWeight: "600",
    },

    matchFooter: {
      borderTopWidth: 1,
      borderTopColor:
        "#f0f0f4",
      marginTop: 15,
      paddingTop: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
    },

    matchLabel: {
      color: PRIMARY,
      fontSize: 13,
      fontWeight: "800",
    },

    matchReason: {
      marginTop: 2,
      color: "#888",
      fontSize: 11,
    },

    emptyState: {
      alignItems: "center",
      paddingVertical: 70,
      paddingHorizontal: 30,
    },

    emptyTitle: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: "800",
      color: "#333",
    },

    emptyText: {
      marginTop: 5,
      color: "#888",
      textAlign: "center",
    },

    emptyClearButton: {
      marginTop: 17,
      paddingHorizontal: 17,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor:
        "#ececff",
    },

    emptyClearText: {
      color: PRIMARY,
      fontSize: 12,
      fontWeight: "700",
    },

    modalContainer: {
      flex: 1,
      backgroundColor:
        "#fff",
    },

    modalHeader: {
      height: 60,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor:
        "#eeeeee",
    },

    closeButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent:
        "center",
    },

    modalHeaderTitle: {
      fontSize: 16,
      fontWeight: "800",
    },

    modalContent: {
      padding: 20,
      paddingBottom: 50,
    },

    detailCompanyIcon: {
      width: 65,
      height: 65,
      borderRadius: 19,
      backgroundColor:
        "#ececff",
      justifyContent:
        "center",
      alignItems: "center",
    },

    detailCompanyInitial: {
      fontSize: 27,
      color: PRIMARY,
      fontWeight: "900",
    },

    detailTitle: {
      fontSize: 25,
      lineHeight: 31,
      fontWeight: "900",
      marginTop: 18,
      color: "#111",
    },

    detailCompany: {
      fontSize: 15,
      color: "#666",
      marginTop: 7,
    },

    bigMatchCard: {
      marginTop: 22,
      backgroundColor:
        "#f1f1ff",
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    bigMatchTitle: {
      fontSize: 12,
      color: "#666",
      fontWeight: "600",
    },

    bigMatchText: {
      marginTop: 3,
      color: PRIMARY,
      fontWeight: "800",
      fontSize: 15,
    },

    bigMatchScore: {
      color: PRIMARY,
      fontSize: 27,
      fontWeight: "900",
    },

    detailInfoGrid: {
      marginTop: 20,
      gap: 10,
    },

    detailInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderRadius: 13,
      padding: 12,
      backgroundColor:
        "#f8f8fa",
    },

    detailInfoLabel: {
      fontSize: 10,
      color: "#888",
    },

    detailInfoValue: {
      fontSize: 13,
      color: "#333",
      fontWeight: "700",
      marginTop: 2,
    },

    sectionTitle: {
      marginTop: 25,
      marginBottom: 10,
      fontSize: 17,
      fontWeight: "800",
      color: "#181818",
    },

    description: {
      fontSize: 14,
      lineHeight: 22,
      color: "#555",
    },

    detailSkills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    detailSkillBadge: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      backgroundColor:
        "#f2f2f5",
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    matchedSkillBadge: {
      backgroundColor:
        "#ededff",
    },

    detailSkillText: {
      color: "#555",
      fontSize: 12,
      fontWeight: "600",
    },

    matchedSkillText: {
      color: PRIMARY,
    },

    reasonRow: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 9,
      marginBottom: 11,
    },

    reasonText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: "#555",
    },

    applyButton: {
      marginTop: 30,
      minHeight: 52,
      borderRadius: 14,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      paddingHorizontal: 16,
    },

    applyButtonDisabled: {
      backgroundColor:
        "#7776c9",
    },

    applyButtonAccepted: {
      backgroundColor:
        "#168653",
    },

    applyButtonRejected: {
      backgroundColor:
        "#8b8b93",
    },

    applyButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "800",
    },

    applicationStatusHelp: {
      marginTop: 9,
      color: "#777",
      fontSize: 11.5,
      lineHeight: 17,
      textAlign: "center",
    },
  });