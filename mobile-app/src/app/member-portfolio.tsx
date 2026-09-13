import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

type RawPortfolioProject = {
  id: string;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  project_url?: string | null;
  skills?: string[] | null;
  created_at?: string | null;
};

type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  url: string | null;
  skills: string[];
  created_at: string | null;
};

export default function MemberPortfolioScreen() {
  const params =
    useLocalSearchParams<{
      userId?: string | string[];
      name?: string | string[];
    }>();

  const routeUserId =
    Array.isArray(params.userId)
      ? params.userId[0] || ""
      : params.userId || "";

  const routeName =
    Array.isArray(params.name)
      ? params.name[0] || ""
      : params.name || "";

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [targetUserId, setTargetUserId] =
    useState("");

  const [profileName, setProfileName] =
    useState(routeName);

  const [projects, setProjects] =
    useState<PortfolioProject[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [projectUrl, setProjectUrl] =
    useState("");

  const [skills, setSkills] =
    useState("");

  const isOwner =
    useMemo(() => {
      return (
        !!currentUserId &&
        !!targetUserId &&
        currentUserId ===
          targetUserId
      );
    }, [
      currentUserId,
      targetUserId,
    ]);

  const normalizeProject = (
    item: RawPortfolioProject
  ): PortfolioProject => ({
    id: item.id,
    title:
      item.title || "Untitled project",
    description:
      item.description || "",
    url:
      item.url ??
      item.project_url ??
      null,
    skills:
      Array.isArray(item.skills)
        ? item.skills
        : [],
    created_at:
      item.created_at || null,
  });

  const loadPortfolio =
    useCallback(async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            "You must be logged in."
          );
        }

        setCurrentUserId(
          user.id
        );

        const personId =
          routeUserId ||
          user.id;

        setTargetUserId(
          personId
        );

        const [
          profileResult,
          portfolioResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", personId)
            .maybeSingle(),

          supabase
            .from(
              "portfolio_items"
            )
            .select("*")
            .eq(
              "user_id",
              personId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),
        ]);

        if (
          profileResult.error
        ) {
          console.log(
            "Portfolio profile error:",
            profileResult.error
          );
        }

        if (
          portfolioResult.error
        ) {
          throw portfolioResult.error;
        }

        setProfileName(
          profileResult.data
            ?.full_name ||
            routeName ||
            ""
        );

        setProjects(
          (
            portfolioResult.data ||
            []
          ).map(
            normalizeProject
          )
        );
      } catch (error) {
        console.log(
          "Portfolio load error:",
          error
        );

        Alert.alert(
          "Portfolio",
          error instanceof Error
            ? error.message
            : "Unable to load this portfolio."
        );

        setProjects([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      routeUserId,
      routeName,
    ]);

  useFocusEffect(
    useCallback(() => {
      loadPortfolio();
    }, [loadPortfolio])
  );

  async function refreshPortfolio() {
    setRefreshing(true);
    await loadPortfolio();
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setProjectUrl("");
    setSkills("");
    setShowForm(false);
  }

  async function addProject() {
    if (!isOwner) {
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        "Project title required",
        "Please enter a project title."
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Description required",
        "Please describe your project."
      );
      return;
    }

    try {
      setSaving(true);

      const skillsArray =
        skills
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);

      const insertData: Record<
        string,
        unknown
      > = {
        user_id:
          currentUserId,
        title:
          title.trim(),
        description:
          description.trim(),
        skills:
          skillsArray,
      };

      if (
        projectUrl.trim()
      ) {
        insertData.url =
          projectUrl.trim();
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "portfolio_items"
          )
          .insert(insertData)
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      setProjects(
        (current) => [
          normalizeProject(
            data as RawPortfolioProject
          ),
          ...current,
        ]
      );

      resetForm();

      Alert.alert(
        "Project added",
        "Your project has been added to your portfolio."
      );
    } catch (error) {
      console.log(
        "Add project error:",
        error
      );

      Alert.alert(
        "Could not add project",
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(
    id: string
  ) {
    if (!isOwner) {
      return;
    }

    Alert.alert(
      "Delete project",
      "Are you sure you want to delete this project?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style:
            "destructive",
          onPress:
            async () => {
              try {
                const {
                  error,
                } =
                  await supabase
                    .from(
                      "portfolio_items"
                    )
                    .delete()
                    .eq(
                      "id",
                      id
                    )
                    .eq(
                      "user_id",
                      currentUserId
                    );

                if (error) {
                  throw error;
                }

                setProjects(
                  (
                    current
                  ) =>
                    current.filter(
                      (
                        project
                      ) =>
                        project.id !==
                        id
                    )
                );
              } catch (error) {
                console.log(
                  "Delete project error:",
                  error
                );

                Alert.alert(
                  "Error",
                  "Unable to delete this project."
                );
              }
            },
        },
      ]
    );
  }

  async function openProject(
    url: string
  ) {
    let value =
      url.trim();

    if (!value) {
      return;
    }

    if (
      !value.startsWith(
        "http://"
      ) &&
      !value.startsWith(
        "https://"
      )
    ) {
      value =
        `https://${value}`;
    }

    try {
      await Linking.openURL(
        value
      );
    } catch (error) {
      console.log(
        "Open project error:",
        error
      );

      Alert.alert(
        "Link error",
        "This project link could not be opened."
      );
    }
  }

  const screenTitle =
    isOwner
      ? "My Portfolio"
      : profileName
        ? `${profileName}'s Portfolio`
        : "Portfolio";

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View
        style={styles.topBar}
      >
        <Pressable
          style={
            styles.headerButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={25}
            color="#111"
          />
        </Pressable>

        <View
          style={
            styles.headerTitleWrap
          }
        >
          <Text
            style={
              styles.topTitle
            }
            numberOfLines={1}
          >
            {screenTitle}
          </Text>

          {!isOwner && (
            <Text
              style={
                styles.viewOnlyText
              }
            >
              View only
            </Text>
          )}
        </View>

        <View
          style={
            styles.headerButton
          }
        >
          {isOwner ? (
            <Pressable
              style={
                styles.headerButton
              }
              onPress={() =>
                setShowForm(
                  (current) =>
                    !current
                )
              }
            >
              <Ionicons
                name={
                  showForm
                    ? "close"
                    : "add"
                }
                size={27}
                color={PRIMARY}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isOwner &&
        showForm && (
          <View
            style={
              styles.projectForm
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Add project
            </Text>

            <TextInput
              placeholder="Project title *"
              placeholderTextColor="#999"
              value={title}
              onChangeText={
                setTitle
              }
              style={
                styles.input
              }
            />

            <TextInput
              placeholder="Description *"
              placeholderTextColor="#999"
              value={
                description
              }
              onChangeText={
                setDescription
              }
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
            />

            <TextInput
              placeholder="Project URL"
              placeholderTextColor="#999"
              value={
                projectUrl
              }
              onChangeText={
                setProjectUrl
              }
              autoCapitalize="none"
              keyboardType="url"
              style={
                styles.input
              }
            />

            <TextInput
              placeholder="Skills e.g. React, JavaScript, SQL"
              placeholderTextColor="#999"
              value={skills}
              onChangeText={
                setSkills
              }
              style={
                styles.input
              }
            />

            <Pressable
              style={[
                styles.primaryButton,
                saving &&
                  styles.disabledButton,
              ]}
              onPress={
                addProject
              }
              disabled={
                saving
              }
            >
              {saving ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Add project
                </Text>
              )}
            </Pressable>
          </View>
        )}

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
              refreshPortfolio
            }
            tintColor={PRIMARY}
          />
        }
        contentContainerStyle={
          styles.portfolioList
        }
      >
        {projects.length ===
        0 ? (
          <View
            style={
              styles.emptyState
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="briefcase-outline"
                size={31}
                color={PRIMARY}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {isOwner
                ? "Your portfolio is empty"
                : "No portfolio projects yet"}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {isOwner
                ? "Showcase your projects, skills and work to your professional network."
                : "This member has not added any portfolio projects yet."}
            </Text>

            {isOwner && (
              <Pressable
                style={
                  styles.emptyButton
                }
                onPress={() =>
                  setShowForm(
                    true
                  )
                }
              >
                <Ionicons
                  name="add"
                  size={18}
                  color="#fff"
                />

                <Text
                  style={
                    styles.emptyButtonText
                  }
                >
                  Add your first project
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          projects.map(
            (project) => (
              <View
                key={project.id}
                style={
                  styles.projectCard
                }
              >
                <View
                  style={
                    styles.projectTop
                  }
                >
                  <View
                    style={
                      styles.projectIcon
                    }
                  >
                    <Ionicons
                      name="code-slash-outline"
                      size={23}
                      color="#fff"
                    />
                  </View>

                  {isOwner && (
                    <Pressable
                      style={
                        styles.deleteButton
                      }
                      onPress={() =>
                        deleteProject(
                          project.id
                        )
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#D00000"
                      />
                    </Pressable>
                  )}
                </View>

                <Text
                  style={
                    styles.projectTitle
                  }
                >
                  {
                    project.title
                  }
                </Text>

                <Text
                  style={
                    styles.projectDescription
                  }
                >
                  {
                    project.description
                  }
                </Text>

                {project.skills
                  .length >
                  0 && (
                  <View
                    style={
                      styles.skillsContainer
                    }
                  >
                    {project.skills.map(
                      (
                        skill,
                        index
                      ) => (
                        <View
                          key={`${project.id}-${skill}-${index}`}
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
                )}

                {project.url && (
                  <Pressable
                    style={
                      styles.projectLink
                    }
                    onPress={() =>
                      openProject(
                        project.url!
                      )
                    }
                  >
                    <Ionicons
                      name="open-outline"
                      size={17}
                      color={PRIMARY}
                    />

                    <Text
                      style={
                        styles.projectLinkText
                      }
                    >
                      View project
                    </Text>
                  </Pressable>
                )}
              </View>
            )
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#fff",
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff",
    },

    topBar: {
      minHeight: 64,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#EEEEF2",
      backgroundColor: "#fff",
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },

    headerTitleWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    topTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
      maxWidth: "100%",
    },

    viewOnlyText: {
      marginTop: 1,
      fontSize: 10,
      color: "#888",
    },

    projectForm: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: "#F7F7FB",
      borderWidth: 1,
      borderColor: "#E8E8F3",
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
      marginBottom: 12,
    },

    input: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: "#E0E0E8",
      backgroundColor: "#fff",
      borderRadius: 11,
      paddingHorizontal: 13,
      fontSize: 14,
      color: "#111",
      marginBottom: 10,
    },

    descriptionInput: {
      minHeight: 90,
      paddingTop: 12,
      paddingBottom: 12,
    },

    primaryButton: {
      minHeight: 46,
      borderRadius: 11,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },

    disabledButton: {
      opacity: 0.55,
    },

    primaryButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "800",
    },

    portfolioList: {
      flexGrow: 1,
      padding: 16,
      paddingBottom: 35,
    },

    projectCard: {
      padding: 17,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#E8E8F0",
      backgroundColor: "#fff",
      marginBottom: 14,
    },

    projectTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 14,
    },

    projectIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },

    deleteButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "#FFF1F1",
      alignItems: "center",
      justifyContent: "center",
    },

    projectTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
    },

    projectDescription: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: "#555",
    },

    skillsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 14,
    },

    skill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#F0F0FF",
      borderWidth: 1,
      borderColor: "#DEDEFA",
    },

    skillText: {
      color: PRIMARY,
      fontSize: 11,
      fontWeight: "700",
    },

    projectLink: {
      marginTop: 15,
      minHeight: 40,
      alignSelf: "flex-start",
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: "#F1F1FF",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    projectLinkText: {
      color: PRIMARY,
      fontSize: 12,
      fontWeight: "800",
    },

    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingVertical: 65,
    },

    emptyIcon: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F1F1FF",
      marginBottom: 16,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 19,
      color: "#777",
      textAlign: "center",
    },

    emptyButton: {
      marginTop: 20,
      minHeight: 44,
      paddingHorizontal: 17,
      borderRadius: 10,
      backgroundColor: PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    emptyButtonText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "800",
    },
  });
