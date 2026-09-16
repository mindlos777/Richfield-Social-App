import React, {
  useCallback,
  useEffect,
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

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import {
  supabase,
} from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type OpportunityStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "closed";

type OpportunityType =
  | "job"
  | "part_time"
  | "internship"
  | "graduate"
  | "learnership";

type WorkMode =
  | "onsite"
  | "hybrid"
  | "remote";

interface Opportunity {
  id: string;
  business_id: string;

  title: string;
  description: string;

  opportunity_type: OpportunityType;

  location: string | null;
  work_mode: WorkMode | null;

  experience_level: string | null;

  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;

  required_skills: string[];
  programme_keywords: string[];
  requirements: string[];

  application_url: string | null;
  closing_date: string | null;

  status: OpportunityStatus;

  created_at: string;
  updated_at: string | null;
}

type OpportunityOption = {
  label: string;
  value: OpportunityType;
};

type WorkModeOption = {
  label: string;
  value: WorkMode;
};

const OPPORTUNITY_TYPES: OpportunityOption[] = [
  {
    label: "Full-time Job",
    value: "job",
  },
  {
    label: "Part-time",
    value: "part_time",
  },
  {
    label: "Internship",
    value: "internship",
  },
  {
    label: "Graduate Programme",
    value: "graduate",
  },
  {
    label: "Learnership",
    value: "learnership",
  },
];

const WORK_MODES: WorkModeOption[] = [
  {
    label: "On-site",
    value: "onsite",
  },
  {
    label: "Hybrid",
    value: "hybrid",
  },
  {
    label: "Remote",
    value: "remote",
  },
];

function getOpportunityTypeLabel(
  type: OpportunityType
) {
  switch (type) {
    case "job":
      return "Full-time Job";

    case "part_time":
      return "Part-time";

    case "internship":
      return "Internship";

    case "graduate":
      return "Graduate Programme";

    case "learnership":
      return "Learnership";

    default:
      return type;
  }
}

function getWorkModeLabel(
  mode: WorkMode | null
) {
  if (mode === "onsite") {
    return "On-site";
  }

  if (mode === "hybrid") {
    return "Hybrid";
  }

  if (mode === "remote") {
    return "Remote";
  }

  return "Not specified";
}

function getStatusLabel(
  status: OpportunityStatus
) {
  switch (status) {
    case "pending":
      return "Pending Review";

    case "approved":
      return "Approved";

    case "rejected":
      return "Rejected";

    case "closed":
      return "Closed";

    default:
      return status;
  }
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-ZA",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

export default function BusinessJobsScreen() {
  const [
    opportunities,
    setOpportunities,
  ] =
    useState<
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
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    modalVisible,
    setModalVisible,
  ] =
    useState(false);

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    location,
    setLocation,
  ] =
    useState("");

  const [
    opportunityType,
    setOpportunityType,
  ] =
    useState<OpportunityType>(
      "job"
    );

  const [
    workMode,
    setWorkMode,
  ] =
    useState<WorkMode>(
      "onsite"
    );

  const [
    experienceLevel,
    setExperienceLevel,
  ] =
    useState("");

  const [
    salaryMin,
    setSalaryMin,
  ] =
    useState("");

  const [
    salaryMax,
    setSalaryMax,
  ] =
    useState("");

  const [
    skills,
    setSkills,
  ] =
    useState("");

  const [
    requirements,
    setRequirements,
  ] =
    useState("");

  const [
    programmeKeywords,
    setProgrammeKeywords,
  ] =
    useState("");

  const [
    applicationUrl,
    setApplicationUrl,
  ] =
    useState("");

  const [
    closingDate,
    setClosingDate,
  ] = useState<Date | null>(null);

  const [
    showClosingDatePicker,
    setShowClosingDatePicker,
  ] = useState(false);

  const loadOpportunities =
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

          if (userError) {
            throw userError;
          }

          if (!user) {
            throw new Error(
              "You must be logged in."
            );
          }

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "opportunities"
              )
              .select(
                `
                id,
                business_id,
                title,
                description,
                opportunity_type,
                location,
                work_mode,
                experience_level,
                salary_min,
                salary_max,
                currency,
                required_skills,
                programme_keywords,
                requirements,
                application_url,
                closing_date,
                status,
                created_at,
                updated_at
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

          if (error) {
            throw error;
          }

          setOpportunities(
            (data || []).map(
              item => ({
                ...item,

                required_skills:
                  item.required_skills ||
                  [],

                programme_keywords:
                  item.programme_keywords ||
                  [],

                requirements:
                  item.requirements ||
                  [],
              })
            ) as Opportunity[]
          );
        } catch (
          error: any
        ) {
          console.log(
            "Load opportunities error:",
            error
          );

          Alert.alert(
            "Unable to load opportunities",
            error?.message ||
              "Something went wrong."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadOpportunities();

    const channel =
      supabase
        .channel(
          "business-opportunities"
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
          payload => {
            console.log(
              "Business opportunity realtime:",
              payload.eventType
            );

            loadOpportunities(
              false
            );
          }
        )
        .subscribe(
          status => {
            console.log(
              "Business opportunities realtime:",
              status
            );
          }
        );

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    loadOpportunities,
  ]);

  const handleRefresh =
    useCallback(() => {
      setRefreshing(true);

      loadOpportunities(
        false
      );
    }, [
      loadOpportunities,
    ]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setLocation("");

    setOpportunityType(
      "job"
    );

    setWorkMode(
      "onsite"
    );

    setExperienceLevel("");

    setSalaryMin("");
    setSalaryMax("");

    setSkills("");
    setRequirements("");
    setProgrammeKeywords("");

    setApplicationUrl("");
    setClosingDate(null);
    setShowClosingDatePicker(false);
  }

  function formatClosingDate(value: Date | null) {
    if (!value) return "Select closing date";

    return value.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function toDatabaseDate(value: Date | null) {
    if (!value) return null;

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function handleClosingDateChange(
    event: DateTimePickerEvent,
    selected?: Date
  ) {
    setShowClosingDatePicker(false);

    if (event.type === "dismissed" || !selected) return;

    selected.setHours(12, 0, 0, 0);
    setClosingDate(selected);
  }

  async function createOpportunity() {
    if (!title.trim()) {
      Alert.alert(
        "Title required",
        "Please enter an opportunity title."
      );

      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Description required",
        "Please add an opportunity description."
      );

      return;
    }

    if (!location.trim()) {
      Alert.alert(
        "Location required",
        "Please add a location."
      );

      return;
    }

    if (
      salaryMin &&
      salaryMax &&
      Number(
        salaryMax
      ) <
        Number(
          salaryMin
        )
    ) {
      Alert.alert(
        "Invalid salary",
        "Maximum salary cannot be lower than minimum salary."
      );

      return;
    }

    setCreating(true);

    try {
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
          businessProfile,
        error:
          businessError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(
            `
            id,
            role,
            status
            `
          )
          .eq(
            "id",
            user.id
          )
          .single();

      if (
        businessError
      ) {
        throw businessError;
      }

      if (
        businessProfile
          ?.role !==
        "business"
      ) {
        throw new Error(
          "Only business accounts can create opportunities."
        );
      }

      if (
        businessProfile
          ?.status !==
        "active"
      ) {
        throw new Error(
          "Your business account must be approved before posting opportunities."
        );
      }

      const skillsArray =
        skills
          .split(",")
          .map(item =>
            item.trim()
          )
          .filter(Boolean);

      const requirementsArray =
        requirements
          .split("\n")
          .map(item =>
            item.trim()
          )
          .filter(Boolean);

      const programmeArray =
        programmeKeywords
          .split(",")
          .map(item =>
            item.trim()
          )
          .filter(Boolean);

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "opportunities"
          )
          .insert({
            business_id:
              user.id,

            title:
              title.trim(),

            description:
              description.trim(),

            opportunity_type:
              opportunityType,

            location:
              location.trim(),

            work_mode:
              workMode,

            experience_level:
              experienceLevel.trim() ||
              null,

            salary_min:
              salaryMin
                ? Number(
                    salaryMin
                  )
                : null,

            salary_max:
              salaryMax
                ? Number(
                    salaryMax
                  )
                : null,

            currency:
              "ZAR",

            required_skills:
              skillsArray,

            programme_keywords:
              programmeArray,

            requirements:
              requirementsArray,

            application_url:
              applicationUrl.trim() ||
              null,

            closing_date:
              toDatabaseDate(closingDate),

            status:
              "pending",
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      setOpportunities(
        current => [
          {
            ...data,

            required_skills:
              data.required_skills ||
              [],

            programme_keywords:
              data.programme_keywords ||
              [],

            requirements:
              data.requirements ||
              [],
          } as Opportunity,

          ...current,
        ]
      );

      resetForm();

      setModalVisible(
        false
      );

      Alert.alert(
        "Submitted for review",
        "Your opportunity was created successfully. It will appear to students after an admin approves it."
      );
    } catch (
      error: any
    ) {
      console.log(
        "Create opportunity error:",
        error
      );

      Alert.alert(
        "Unable to create opportunity",
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setCreating(false);
    }
  }

  function closeOpportunity(
    opportunity: Opportunity
  ) {
    Alert.alert(
      "Close Opportunity",
      `Close "${opportunity.title}"? Students will no longer see it.`,
      [
        {
          text:
            "Cancel",
          style:
            "cancel",
        },

        {
          text:
            "Close",
          style:
            "destructive",

          onPress:
            async () => {
              try {
                const {
                  data,
                  error,
                } =
                  await supabase
                    .from(
                      "opportunities"
                    )
                    .update({
                      status:
                        "closed",

                      updated_at:
                        new Date().toISOString(),
                    })
                    .eq(
                      "id",
                      opportunity.id
                    )
                    .select()
                    .single();

                if (
                  error
                ) {
                  throw error;
                }

                setOpportunities(
                  current =>
                    current.map(
                      item =>
                        item.id ===
                        opportunity.id
                          ? ({
                              ...item,
                              ...data,
                            } as Opportunity)
                          : item
                    )
                );
              } catch (
                error: any
              ) {
                Alert.alert(
                  "Error",
                  error?.message ||
                    "Unable to close the opportunity."
                );
              }
            },
        },
      ]
    );
  }

  async function reopenOpportunity(
    opportunity: Opportunity
  ) {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "opportunities"
          )
          .update({
            status:
              "pending",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            opportunity.id
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      setOpportunities(
        current =>
          current.map(
            item =>
              item.id ===
              opportunity.id
                ? ({
                    ...item,
                    ...data,
                  } as Opportunity)
                : item
          )
      );

      Alert.alert(
        "Submitted again",
        "The opportunity has been sent back for admin review."
      );
    } catch (
      error: any
    ) {
      Alert.alert(
        "Error",
        error?.message ||
          "Unable to reopen the opportunity."
      );
    }
  }

  function renderOpportunity({
    item,
  }: {
    item: Opportunity;
  }) {
    const statusStyle =
      item.status ===
      "approved"
        ? styles.approvedBadge
        : item.status ===
          "pending"
        ? styles.pendingBadge
        : item.status ===
          "rejected"
        ? styles.rejectedBadge
        : styles.closedBadge;

    const statusTextStyle =
      item.status ===
      "approved"
        ? styles.approvedText
        : item.status ===
          "pending"
        ? styles.pendingText
        : item.status ===
          "rejected"
        ? styles.rejectedText
        : styles.closedText;

    return (
      <View
        style={
          styles.jobCard
        }
      >
        <View
          style={
            styles.jobTop
          }
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.jobTitle
              }
            >
              {item.title}
            </Text>

            <Text
              style={
                styles.jobLocation
              }
            >
              {item.location ||
                "No location"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              statusStyle,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                statusTextStyle,
              ]}
            >
              {getStatusLabel(
                item.status
              )}
            </Text>
          </View>
        </View>

        {item.status ===
        "pending" ? (
          <View
            style={
              styles.noticeBox
            }
          >
            <Ionicons
              name="time-outline"
              size={17}
              color="#9A6700"
            />

            <Text
              style={
                styles.noticeText
              }
            >
              Waiting for admin
              approval. Students
              cannot see this yet.
            </Text>
          </View>
        ) : null}

        {item.status ===
        "approved" ? (
          <View
            style={[
              styles.noticeBox,
              styles.liveNotice,
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={17}
              color="#168653"
            />

            <Text
              style={[
                styles.noticeText,
                styles.liveNoticeText,
              ]}
            >
              Live to students and
              eligible for Career
              matching.
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.tagsRow
          }
        >
          <View
            style={
              styles.tag
            }
          >
            <Ionicons
              name="briefcase-outline"
              size={14}
              color="#555"
            />

            <Text
              style={
                styles.tagText
              }
            >
              {getOpportunityTypeLabel(
                item.opportunity_type
              )}
            </Text>
          </View>

          <View
            style={
              styles.tag
            }
          >
            <Ionicons
              name="business-outline"
              size={14}
              color="#555"
            />

            <Text
              style={
                styles.tagText
              }
            >
              {getWorkModeLabel(
                item.work_mode
              )}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.jobDescription
          }
          numberOfLines={
            3
          }
        >
          {item.description}
        </Text>

        {item.required_skills
          ?.length >
        0 ? (
          <View
            style={
              styles.skillsContainer
            }
          >
            {item.required_skills
              .slice(
                0,
                4
              )
              .map(
                skill => (
                  <View
                    key={
                      skill
                    }
                    style={
                      styles.skillChip
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
        ) : null}

        {(item.salary_min ||
          item.salary_max) ? (
          <Text
            style={
              styles.salaryText
            }
          >
            {item.currency ||
              "ZAR"}{" "}
            {item.salary_min
              ? Number(
                  item.salary_min
                ).toLocaleString(
                  "en-ZA"
                )
              : "0"}
            {" - "}
            {item.salary_max
              ? Number(
                  item.salary_max
                ).toLocaleString(
                  "en-ZA"
                )
              : "Negotiable"}
          </Text>
        ) : null}

        {item.closing_date ? (
          <View
            style={
              styles.deadlineRow
            }
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color="#777"
            />

            <Text
              style={
                styles.deadlineText
              }
            >
              Closes{" "}
              {formatDate(
                item.closing_date
              )}
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.jobFooter
          }
        >
          <Text
            style={
              styles.dateText
            }
          >
            Posted{" "}
            {formatDate(
              item.created_at
            )}
          </Text>

          {item.status !==
            "closed" &&
          item.status !==
            "rejected" ? (
            <TouchableOpacity
              style={
                styles.closeButton
              }
              onPress={() =>
                closeOpportunity(
                  item
                )
              }
            >
              <Text
                style={
                  styles.closeButtonText
                }
              >
                Close
              </Text>
            </TouchableOpacity>
          ) : item.status ===
            "closed" ? (
            <TouchableOpacity
              style={
                styles.reopenButton
              }
              onPress={() =>
                reopenOpportunity(
                  item
                )
              }
            >
              <Text
                style={
                  styles.reopenText
                }
              >
                Reopen
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
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
            Opportunities
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Create and manage career
            opportunities
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.addButton
          }
          onPress={() =>
            setModalVisible(
              true
            )
          }
        >
          <Ionicons
            name="add"
            size={26}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={
          opportunities
        }
        keyExtractor={item =>
          item.id
        }
        renderItem={
          renderOpportunity
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
          />
        }
        contentContainerStyle={
          opportunities.length ===
          0
            ? styles.emptyList
            : styles.list
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
                name="briefcase-outline"
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
              No opportunities yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Create an opportunity
              for Richfield students
              and alumni. It will be
              reviewed before going
              live.
            </Text>

            <TouchableOpacity
              style={
                styles.createButton
              }
              onPress={() =>
                setModalVisible(
                  true
                )
              }
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.createButtonText
                }
              >
                Create Opportunity
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={
          modalVisible
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setModalVisible(
            false
          )
        }
      >
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
              onPress={() =>
                setModalVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <Text
              style={
                styles.modalTitle
              }
            >
              Create Opportunity
            </Text>

            <TouchableOpacity
              disabled={
                creating
              }
              onPress={
                createOpportunity
              }
            >
              {creating ? (
                <ActivityIndicator
                  size="small"
                  color={
                    PRIMARY
                  }
                />
              ) : (
                <Text
                  style={
                    styles.postText
                  }
                >
                  Submit
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={
              styles.form
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={
                styles.reviewNotice
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={
                  PRIMARY
                }
              />

              <Text
                style={
                  styles.reviewNoticeText
                }
              >
                Opportunities are reviewed
                by an admin before students
                can see them.
              </Text>
            </View>

            <FormLabel
              title="Opportunity Title"
              required
            />

            <TextInput
              value={
                title
              }
              onChangeText={
                setTitle
              }
              placeholder="e.g. Junior Software Developer"
              style={
                styles.input
              }
            />

            <FormLabel
              title="Description"
              required
            />

            <TextInput
              value={
                description
              }
              onChangeText={
                setDescription
              }
              placeholder="Describe the role, responsibilities and opportunity..."
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
              ]}
            />

            <FormLabel
              title="Location"
              required
            />

            <TextInput
              value={
                location
              }
              onChangeText={
                setLocation
              }
              placeholder="e.g. Sandton, Gauteng"
              style={
                styles.input
              }
            />

            <FormLabel
              title="Opportunity Type"
              required
            />

            <View
              style={
                styles.optionsWrap
              }
            >
              {OPPORTUNITY_TYPES.map(
                option => (
                  <OptionButton
                    key={
                      option.value
                    }
                    label={
                      option.label
                    }
                    selected={
                      opportunityType ===
                      option.value
                    }
                    onPress={() =>
                      setOpportunityType(
                        option.value
                      )
                    }
                  />
                )
              )}
            </View>

            <FormLabel
              title="Work Style"
              required
            />

            <View
              style={
                styles.optionsWrap
              }
            >
              {WORK_MODES.map(
                option => (
                  <OptionButton
                    key={
                      option.value
                    }
                    label={
                      option.label
                    }
                    selected={
                      workMode ===
                      option.value
                    }
                    onPress={() =>
                      setWorkMode(
                        option.value
                      )
                    }
                  />
                )
              )}
            </View>

            <FormLabel
              title="Experience Level"
            />

            <TextInput
              value={
                experienceLevel
              }
              onChangeText={
                setExperienceLevel
              }
              placeholder="e.g. Entry Level"
              style={
                styles.input
              }
            />

            <FormLabel
              title="Salary"
            />

            <View
              style={
                styles.salaryRow
              }
            >
              <TextInput
                value={
                  salaryMin
                }
                onChangeText={
                  setSalaryMin
                }
                keyboardType="numeric"
                placeholder="Minimum"
                style={[
                  styles.input,
                  styles.salaryInput,
                ]}
              />

              <TextInput
                value={
                  salaryMax
                }
                onChangeText={
                  setSalaryMax
                }
                keyboardType="numeric"
                placeholder="Maximum"
                style={[
                  styles.input,
                  styles.salaryInput,
                ]}
              />
            </View>

            <FormLabel
              title="Required Skills"
            />

            <TextInput
              value={
                skills
              }
              onChangeText={
                setSkills
              }
              placeholder="React, JavaScript, SQL"
              style={
                styles.input
              }
            />

            <Text
              style={
                styles.helper
              }
            >
              Separate skills with commas.
              These are used for student
              matching.
            </Text>

            <FormLabel
              title="Relevant Programmes"
            />

            <TextInput
              value={
                programmeKeywords
              }
              onChangeText={
                setProgrammeKeywords
              }
              placeholder="Information Technology, Computer Science"
              style={
                styles.input
              }
            />

            <Text
              style={
                styles.helper
              }
            >
              Separate programmes with
              commas. This helps match the
              opportunity to the right
              students.
            </Text>

            <FormLabel
              title="Requirements"
            />

            <TextInput
              value={
                requirements
              }
              onChangeText={
                setRequirements
              }
              placeholder={
                "BSc IT or related qualification\nGood communication skills\nKnowledge of React"
              }
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
              ]}
            />

            <Text
              style={
                styles.helper
              }
            >
              Put each requirement on a new
              line.
            </Text>

            <FormLabel
              title="Application Link"
            />

            <TextInput
              value={
                applicationUrl
              }
              onChangeText={
                setApplicationUrl
              }
              placeholder="https://company.co.za/apply"
              autoCapitalize="none"
              keyboardType="url"
              style={
                styles.input
              }
            />

            <FormLabel
              title="Closing Date"
            />

            <TouchableOpacity
              style={styles.datePickerButton}
              activeOpacity={0.75}
              onPress={() => setShowClosingDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={PRIMARY}
              />

              <Text
                style={[
                  styles.datePickerText,
                  !closingDate && styles.datePickerPlaceholder,
                ]}
              >
                {formatClosingDate(closingDate)}
              </Text>

              <Ionicons
                name="chevron-down"
                size={18}
                color="#888"
              />
            </TouchableOpacity>

            {showClosingDatePicker && (
              <DateTimePicker
                value={closingDate || new Date()}
                mode="date"
                minimumDate={new Date()}
                onChange={handleClosingDateChange}
              />
            )}

            {closingDate ? (
              <TouchableOpacity
                onPress={() => setClosingDate(null)}
                style={styles.clearDateButton}
              >
                <Text style={styles.clearDateText}>
                  Clear closing date
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={
                styles.fullPostButton
              }
              onPress={
                createOpportunity
              }
              disabled={
                creating
              }
            >
              {creating ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="send-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.fullPostText
                    }
                  >
                    Submit for Review
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function FormLabel({
  title,
  required = false,
}: {
  title: string;
  required?: boolean;
}) {
  return (
    <Text
      style={
        styles.label
      }
    >
      {title}

      {required ? (
        <Text
          style={
            styles.required
          }
        >
          {" "}
          *
        </Text>
      ) : null}
    </Text>
  );
}

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.option,
        selected &&
          styles.optionSelected,
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.optionText,
          selected &&
            styles.optionTextSelected,
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
        "#F7F7FA",
    },

    loading: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        "#F7F7FA",
    },

    header: {
      paddingHorizontal: 18,
      paddingVertical: 16,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    title: {
      fontSize: 26,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      fontSize: 13,
      color: "#777",
      marginTop: 3,
    },

    addButton: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    list: {
      paddingHorizontal: 18,
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,
      justifyContent:
        "center",
    },

    empty: {
      alignItems: "center",
      paddingHorizontal: 35,
    },

    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 25,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      marginTop: 18,
      fontSize: 19,
      fontWeight: "800",
    },

    emptyText: {
      textAlign: "center",
      color: "#777",
      marginTop: 8,
      lineHeight: 20,
    },

    createButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor:
        PRIMARY,
      paddingVertical: 13,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginTop: 20,
    },

    createButtonText: {
      color: "#FFFFFF",
      fontWeight: "700",
    },

    jobCard: {
      backgroundColor:
        "#FFFFFF",
      padding: 17,
      borderRadius: 20,
      marginBottom: 13,
      borderWidth: 1,
      borderColor:
        "#EEEEF2",
    },

    jobTop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 10,
    },

    jobTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
    },

    jobLocation: {
      color: "#777",
      fontSize: 13,
      marginTop: 4,
    },

    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },

    approvedBadge: {
      backgroundColor:
        "#E7F8EF",
    },

    pendingBadge: {
      backgroundColor:
        "#FFF5D6",
    },

    rejectedBadge: {
      backgroundColor:
        "#FFE9E9",
    },

    closedBadge: {
      backgroundColor:
        "#F3F3F3",
    },

    statusText: {
      fontSize: 10,
      fontWeight: "800",
    },

    approvedText: {
      color: "#168653",
    },

    pendingText: {
      color: "#9A6700",
    },

    rejectedText: {
      color: "#C62828",
    },

    closedText: {
      color: "#777",
    },

    noticeBox: {
      marginTop: 13,
      backgroundColor:
        "#FFF9E7",
      padding: 10,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    noticeText: {
      flex: 1,
      color: "#765800",
      fontSize: 11,
      lineHeight: 16,
    },

    liveNotice: {
      backgroundColor:
        "#ECFAF2",
    },

    liveNoticeText: {
      color: "#168653",
    },

    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 14,
    },

    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor:
        "#F4F4F6",
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    tagText: {
      fontSize: 11,
      color: "#555",
      fontWeight: "600",
    },

    jobDescription: {
      marginTop: 14,
      color: "#666",
      fontSize: 13,
      lineHeight: 19,
    },

    skillsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 13,
    },

    skillChip: {
      backgroundColor:
        "#EEEEFF",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 9,
    },

    skillText: {
      color: PRIMARY,
      fontSize: 11,
      fontWeight: "700",
    },

    salaryText: {
      marginTop: 13,
      fontWeight: "700",
      color: "#333",
    },

    deadlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 12,
    },

    deadlineText: {
      color: "#777",
      fontSize: 12,
    },

    jobFooter: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor:
        "#F0F0F0",
      marginTop: 16,
      paddingTop: 13,
    },

    dateText: {
      fontSize: 11,
      color: "#999",
    },

    closeButton: {
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor:
        "#FFF0F0",
    },

    closeButtonText: {
      color: "#C62828",
      fontWeight: "700",
      fontSize: 12,
    },

    reopenButton: {
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor:
        "#EEEEFF",
    },

    reopenText: {
      color: PRIMARY,
      fontWeight: "700",
      fontSize: 12,
    },

    modalContainer: {
      flex: 1,
      backgroundColor:
        "#F7F7FA",
    },

    modalHeader: {
      minHeight: 60,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor:
        "#E8E8E8",
      backgroundColor:
        "#FFFFFF",
    },

    modalTitle: {
      fontSize: 17,
      fontWeight: "800",
    },

    cancelText: {
      color: "#666",
      fontSize: 15,
    },

    postText: {
      color: PRIMARY,
      fontWeight: "800",
      fontSize: 15,
    },

    form: {
      padding: 18,
      paddingBottom: 45,
    },

    reviewNotice: {
      backgroundColor:
        "#EEEEFF",
      borderRadius: 14,
      padding: 13,
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 9,
    },

    reviewNoticeText: {
      flex: 1,
      color: "#444",
      fontSize: 12,
      lineHeight: 18,
    },

    label: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
      marginTop: 15,
      marginBottom: 8,
    },

    required: {
      color: "#D93025",
    },

    input: {
      minHeight: 50,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E1E1E6",
      borderRadius: 14,
      paddingHorizontal: 14,
      fontSize: 14,
      color: "#111",
    },

    textArea: {
      minHeight: 120,
      paddingTop: 13,
      paddingBottom: 13,
    },

    optionsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    option: {
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 20,
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor:
        "#FFFFFF",
    },

    optionSelected: {
      backgroundColor:
        PRIMARY,
      borderColor:
        PRIMARY,
    },

    optionText: {
      color: "#555",
      fontSize: 12,
      fontWeight: "600",
    },

    optionTextSelected: {
      color: "#FFFFFF",
    },

    salaryRow: {
      flexDirection: "row",
      gap: 10,
    },

    salaryInput: {
      flex: 1,
    },

    helper: {
      marginTop: 6,
      color: "#999",
      fontSize: 11,
      lineHeight: 16,
    },

    fullPostButton: {
      minHeight: 52,
      backgroundColor:
        PRIMARY,
      borderRadius: 15,
      flexDirection: "row",
      justifyContent:
        "center",
      alignItems: "center",
      gap: 7,
      marginTop: 28,
    },

    fullPostText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },

    datePickerButton: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: "#DADAE0",
      borderRadius: 10,
      backgroundColor: "#FFF",
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    datePickerText: {
      flex: 1,
      color: "#222",
      fontSize: 14,
      fontWeight: "600",
    },

    datePickerPlaceholder: {
      color: "#999",
      fontWeight: "400",
    },

    clearDateButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      marginBottom: 4,
    },

    clearDateText: {
      color: PRIMARY,
      fontSize: 12,
      fontWeight: "700",
    },
  });