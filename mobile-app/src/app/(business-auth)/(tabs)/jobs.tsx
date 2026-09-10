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

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type JobStatus =
  | "draft"
  | "active"
  | "closed";

type EmploymentType =
  | "Full-time"
  | "Part-time"
  | "Internship"
  | "Graduate Programme"
  | "Contract";

type WorkplaceType =
  | "On-site"
  | "Hybrid"
  | "Remote";

interface Job {
  id: string;
  business_id: string;
  title: string;
  description: string;
  location: string;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  requirements: string[];
  skills: string[];
  application_deadline: string | null;
  status: JobStatus;
  created_at: string;
}

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "Full-time",
  "Part-time",
  "Internship",
  "Graduate Programme",
  "Contract",
];

const WORKPLACE_TYPES: WorkplaceType[] = [
  "On-site",
  "Hybrid",
  "Remote",
];

export default function BusinessJobsScreen() {
  const [jobs, setJobs] =
    useState<Job[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [
    employmentType,
    setEmploymentType,
  ] = useState<EmploymentType>(
    "Full-time"
  );

  const [
    workplaceType,
    setWorkplaceType,
  ] = useState<WorkplaceType>(
    "On-site"
  );

  const [
    experienceLevel,
    setExperienceLevel,
  ] = useState("");

  const [salaryMin, setSalaryMin] =
    useState("");

  const [salaryMax, setSalaryMax] =
    useState("");

  const [skills, setSkills] =
    useState("");

  const [requirements, setRequirements] =
    useState("");

  const [
    applicationDeadline,
    setApplicationDeadline,
  ] = useState("");

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const { data, error } =
        await supabase
          .from("jobs")
          .select("*")
          .eq("business_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw error;
      }

      setJobs((data || []) as Job[]);
    } catch (error: any) {
      console.log(
        "Load jobs error:",
        error
      );

      Alert.alert(
        "Unable to load jobs",
        error.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh =
    useCallback(() => {
      setRefreshing(true);
      loadJobs();
    }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");

    setEmploymentType(
      "Full-time"
    );

    setWorkplaceType(
      "On-site"
    );

    setExperienceLevel("");

    setSalaryMin("");
    setSalaryMax("");

    setSkills("");
    setRequirements("");

    setApplicationDeadline("");
  };

  const createJob = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Title required",
        "Please enter a job title."
      );

      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Description required",
        "Please add a job description."
      );

      return;
    }

    if (!location.trim()) {
      Alert.alert(
        "Location required",
        "Please add the job location."
      );

      return;
    }

    if (
      salaryMin &&
      salaryMax &&
      Number(salaryMax) <
        Number(salaryMin)
    ) {
      Alert.alert(
        "Invalid salary",
        "Maximum salary cannot be lower than minimum salary."
      );

      return;
    }

    if (
      applicationDeadline &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        applicationDeadline
      )
    ) {
      Alert.alert(
        "Invalid date",
        "Use YYYY-MM-DD for the application deadline."
      );

      return;
    }

    setCreating(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      const skillsArray = skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      const requirementsArray =
        requirements
          .split("\n")
          .map((requirement) =>
            requirement.trim()
          )
          .filter(Boolean);

      const { data, error } =
        await supabase
          .from("jobs")
          .insert({
            business_id: user.id,

            title: title.trim(),

            description:
              description.trim(),

            location:
              location.trim(),

            employment_type:
              employmentType,

            workplace_type:
              workplaceType,

            experience_level:
              experienceLevel.trim() ||
              null,

            salary_min:
              salaryMin
                ? Number(salaryMin)
                : null,

            salary_max:
              salaryMax
                ? Number(salaryMax)
                : null,

            currency: "ZAR",

            skills: skillsArray,

            requirements:
              requirementsArray,

            application_deadline:
              applicationDeadline ||
              null,

            status: "active",
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      setJobs((currentJobs) => [
        data as Job,
        ...currentJobs,
      ]);

      resetForm();

      setModalVisible(false);

      Alert.alert(
        "Job posted",
        "Your opportunity is now live."
      );
    } catch (error: any) {
      console.log(
        "Create job error:",
        error
      );

      Alert.alert(
        "Unable to create job",
        error.message ||
          "Something went wrong."
      );
    } finally {
      setCreating(false);
    }
  };

  const closeJob = (
    job: Job
  ) => {
    Alert.alert(
      "Close Job",
      `Close "${job.title}"? Students and alumni will no longer see it as an active opportunity.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Close Job",
          style: "destructive",

          onPress: async () => {
            try {
              const {
                data,
                error,
              } = await supabase
                .from("jobs")
                .update({
                  status: "closed",
                  updated_at:
                    new Date().toISOString(),
                })
                .eq("id", job.id)
                .select()
                .single();

              if (error) {
                throw error;
              }

              setJobs(
                (
                  currentJobs
                ) =>
                  currentJobs.map(
                    (currentJob) =>
                      currentJob.id ===
                      job.id
                        ? (data as Job)
                        : currentJob
                  )
              );

              Alert.alert(
                "Job closed",
                "The opportunity has been closed."
              );
            } catch (
              error: any
            ) {
              Alert.alert(
                "Error",
                error.message ||
                  "Unable to close the job."
              );
            }
          },
        },
      ]
    );
  };

  const reopenJob = async (
    job: Job
  ) => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("jobs")
        .update({
          status: "active",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", job.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setJobs((currentJobs) =>
        currentJobs.map(
          (currentJob) =>
            currentJob.id === job.id
              ? (data as Job)
              : currentJob
        )
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message ||
          "Unable to reopen the job."
      );
    }
  };

  const renderJob = ({
    item,
  }: {
    item: Job;
  }) => {
    return (
      <View style={styles.jobCard}>
        <View style={styles.jobTop}>
          <View style={{ flex: 1 }}>
            <Text
              style={styles.jobTitle}
            >
              {item.title}
            </Text>

            <Text
              style={
                styles.jobLocation
              }
            >
              {item.location}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,

              item.status ===
              "active"
                ? styles.activeBadge
                : styles.closedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,

                item.status ===
                "active"
                  ? styles.activeText
                  : styles.closedText,
              ]}
            >
              {item.status ===
              "active"
                ? "Active"
                : "Closed"}
            </Text>
          </View>
        </View>

        <View
          style={styles.tagsRow}
        >
          <View
            style={styles.tag}
          >
            <Ionicons
              name="briefcase-outline"
              size={14}
              color="#555"
            />

            <Text
              style={styles.tagText}
            >
              {
                item.employment_type
              }
            </Text>
          </View>

          <View
            style={styles.tag}
          >
            <Ionicons
              name="location-outline"
              size={14}
              color="#555"
            />

            <Text
              style={styles.tagText}
            >
              {
                item.workplace_type
              }
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.jobDescription
          }
          numberOfLines={3}
        >
          {item.description}
        </Text>

        {item.skills?.length >
          0 && (
          <View
            style={
              styles.skillsContainer
            }
          >
            {item.skills
              .slice(0, 4)
              .map((skill) => (
                <View
                  key={skill}
                  style={
                    styles.skillChip
                  }
                >
                  <Text
                    style={
                      styles.skillText
                    }
                  >
                    {skill}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {(item.salary_min ||
          item.salary_max) && (
          <Text
            style={
              styles.salaryText
            }
          >
            {item.currency}{" "}
            {item.salary_min
              ? Number(
                  item.salary_min
                ).toLocaleString()
              : "0"}
            {" - "}
            {item.salary_max
              ? Number(
                  item.salary_max
                ).toLocaleString()
              : "Negotiable"}
          </Text>
        )}

        {item.application_deadline && (
          <View
            style={styles.deadlineRow}
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
              {
                item.application_deadline
              }
            </Text>
          </View>
        )}

        <View
          style={styles.jobFooter}
        >
          <Text
            style={styles.dateText}
          >
            Posted{" "}
            {new Date(
              item.created_at
            ).toLocaleDateString()}
          </Text>

          {item.status ===
          "active" ? (
            <TouchableOpacity
              style={
                styles.closeButton
              }
              onPress={() =>
                closeJob(item)
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
          ) : (
            <TouchableOpacity
              style={
                styles.reopenButton
              }
              onPress={() =>
                reopenJob(item)
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
          )}
        </View>
      </View>
    );
  };

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

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Jobs
          </Text>

          <Text
            style={styles.subtitle}
          >
            Manage your opportunities
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            setModalVisible(true)
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
        data={jobs}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={renderJob}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={
          jobs.length === 0
            ? styles.emptyList
            : styles.list
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="briefcase-outline"
                size={40}
                color={PRIMARY}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No jobs posted yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Create your first
              opportunity and start
              connecting with Richfield
              students and alumni.
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
                Create Job
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setModalVisible(false)
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
              Create Job
            </Text>

            <TouchableOpacity
              disabled={creating}
              onPress={createJob}
            >
              {creating ? (
                <ActivityIndicator
                  size="small"
                  color={PRIMARY}
                />
              ) : (
                <Text
                  style={
                    styles.postText
                  }
                >
                  Post
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
            <FormLabel
              title="Job Title"
              required
            />

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Junior Software Developer"
              style={styles.input}
            />

            <FormLabel
              title="Description"
              required
            />

            <TextInput
              value={description}
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
              value={location}
              onChangeText={
                setLocation
              }
              placeholder="e.g. Sandton, Gauteng"
              style={styles.input}
            />

            <FormLabel
              title="Employment Type"
              required
            />

            <View
              style={
                styles.optionsWrap
              }
            >
              {EMPLOYMENT_TYPES.map(
                (type) => (
                  <OptionButton
                    key={type}
                    label={type}
                    selected={
                      employmentType ===
                      type
                    }
                    onPress={() =>
                      setEmploymentType(
                        type
                      )
                    }
                  />
                )
              )}
            </View>

            <FormLabel
              title="Workplace Type"
              required
            />

            <View
              style={
                styles.optionsWrap
              }
            >
              {WORKPLACE_TYPES.map(
                (type) => (
                  <OptionButton
                    key={type}
                    label={type}
                    selected={
                      workplaceType ===
                      type
                    }
                    onPress={() =>
                      setWorkplaceType(
                        type
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
              style={styles.input}
            />

            <FormLabel title="Salary" />

            <View
              style={
                styles.salaryRow
              }
            >
              <TextInput
                value={salaryMin}
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
                value={salaryMax}
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

            <FormLabel title="Skills" />

            <TextInput
              value={skills}
              onChangeText={setSkills}
              placeholder="React, JavaScript, SQL"
              style={styles.input}
            />

            <Text
              style={styles.helper}
            >
              Separate skills with
              commas.
            </Text>

            <FormLabel
              title="Requirements"
            />

            <TextInput
              value={requirements}
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
              style={styles.helper}
            >
              Put each requirement on
              a new line.
            </Text>

            <FormLabel
              title="Application Deadline"
            />

            <TextInput
              value={
                applicationDeadline
              }
              onChangeText={
                setApplicationDeadline
              }
              placeholder="2026-10-30"
              style={styles.input}
            />

            <Text
              style={styles.helper}
            >
              Format: YYYY-MM-DD
            </Text>

            <TouchableOpacity
              style={
                styles.fullPostButton
              }
              onPress={createJob}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="briefcase-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.fullPostText
                    }
                  >
                    Post Opportunity
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
    <Text style={styles.label}>
      {title}

      {required && (
        <Text
          style={styles.required}
        >
          {" "}
          *
        </Text>
      )}
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
      onPress={onPress}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F7FA",
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

    backgroundColor: PRIMARY,

    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  empty: {
    alignItems: "center",
    paddingHorizontal: 35,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 25,

    backgroundColor: "#EEEEFF",

    alignItems: "center",
    justifyContent: "center",
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

    backgroundColor: PRIMARY,

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
    backgroundColor: "#FFFFFF",

    padding: 17,

    borderRadius: 20,

    marginBottom: 13,
  },

  jobTop: {
    flexDirection: "row",
    alignItems: "flex-start",
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

  activeBadge: {
    backgroundColor: "#E7F8EF",
  },

  closedBadge: {
    backgroundColor: "#F3F3F3",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  activeText: {
    color: "#168653",
  },

  closedText: {
    color: "#777",
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

    backgroundColor: "#F4F4F6",

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
    backgroundColor: "#EEEEFF",

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
    borderTopColor: "#F0F0F0",

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

    backgroundColor: "#FFF0F0",
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

    backgroundColor: "#EEEEFF",
  },

  reopenText: {
    color: PRIMARY,

    fontWeight: "700",
    fontSize: 12,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },

  modalHeader: {
    height: 60,

    paddingHorizontal: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",

    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",

    backgroundColor: "#FFFFFF",
  },

  modalTitle: {
    fontSize: 18,
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

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#E1E1E6",

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

    backgroundColor: "#FFFFFF",
  },

  optionSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
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
  },

  fullPostButton: {
    minHeight: 52,

    backgroundColor: PRIMARY,

    borderRadius: 15,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    gap: 7,

    marginTop: 28,
  },

  fullPostText: {
    color: "#FFFFFF",

    fontSize: 15,
    fontWeight: "800",
  },
});