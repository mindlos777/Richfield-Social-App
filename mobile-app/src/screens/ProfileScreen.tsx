import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import {
  useVideoPlayer,
  VideoView,
} from "expo-video";

import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

const PRIMARY = "#0300cf";
const DRAWER_WIDTH = width * 0.75;

type CommunityRole =
  | "student"
  | "alumni";

type ProfilePost = {
  id: string;
  image_url: string | null;
  content: string | null;
  media_type: string | null;
  visibility: string;
  created_at: string;
};

type UserProfile = {
  role: CommunityRole;

  fullName: string;
  username: string;
  headline: string;
  bio: string;
  avatar: string | null;

  programme: string;
  campus: string;

  yearOfStudy: number | null;

  graduationYear: number | null;
  currentCompany: string;
  currentJobTitle: string;
  alumniVerified: boolean;

  linkedin: string | null;
  github: string | null;
  instagram: string | null;
  website: string | null;
};

const EMPTY_PROFILE: UserProfile = {
  role: "student",

  fullName: "Your Name",
  username: "@yourusername",
  headline: "",
  bio: "",
  avatar: null,

  programme: "",
  campus: "",

  yearOfStudy: null,

  graduationYear: null,
  currentCompany: "",
  currentJobTitle: "",
  alumniVerified: false,

  linkedin: null,
  github: null,
  instagram: null,
  website: null,
};

export default function ProfileScreen() {
  const [menuVisible, setMenuVisible] =
    useState(false);

  const [profile, setProfile] =
    useState<UserProfile>(
      EMPTY_PROFILE
    );

  const [stats, setStats] =
    useState({
      posts: 0,
      followers: 0,
      following: 0,
    });

  const [posts, setPosts] =
    useState<ProfilePost[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    try {
      setLoading(true);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      /*
       * First load the main profile.
       *
       * We need the role before deciding whether
       * to query student_profiles or alumni_profiles.
       */
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          full_name,
          username,
          role,
          headline,
          bio,
          avatar_url,
          linkedin_url,
          github_url,
          instagram_url,
          website_url
        `)
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const role =
        String(
          profileData.role || "student"
        ).toLowerCase();

      if (
        role !== "student" &&
        role !== "alumni"
      ) {
        throw new Error(
          "This profile screen is only available to students and alumni."
        );
      }

      /*
       * Shared data.
       */
      const [
        postCountResult,
        followerResult,
        followingResult,
        postsResult,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id),

        supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "following_id",
            user.id
          ),

        supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "follower_id",
            user.id
          ),

        supabase
          .from("posts")
          .select(`
            id,
            image_url,
            content,
            media_type,
            visibility,
            created_at
          `)
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      /*
       * Student / Alumni specific data.
       */
      let programme = "";
      let campus = "";

      let yearOfStudy:
        | number
        | null = null;

      let graduationYear:
        | number
        | null = null;

      let currentCompany = "";
      let currentJobTitle = "";

      let alumniLinkedin:
        | string
        | null = null;

      let alumniVerified = false;

      if (role === "student") {
        const {
          data: studentData,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(`
            programme,
            campus,
            year_of_study
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (studentError) {
          console.log(
            "Student profile error:",
            studentError
          );
        }

        programme =
          studentData?.programme || "";

        campus =
          studentData?.campus || "";

        yearOfStudy =
          studentData?.year_of_study ??
          null;
      }

      if (role === "alumni") {
        const {
          data: alumniData,
          error: alumniError,
        } = await supabase
          .from("alumni_profiles")
          .select(`
            graduation_year,
            programme,
            campus,
            current_company,
            current_job_title,
            linkedin_url,
            verified
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (alumniError) {
          console.log(
            "Alumni profile error:",
            alumniError
          );
        }

        programme =
          alumniData?.programme || "";

        campus =
          alumniData?.campus || "";

        graduationYear =
          alumniData?.graduation_year ??
          null;

        currentCompany =
          alumniData?.current_company ||
          "";

        currentJobTitle =
          alumniData?.current_job_title ||
          "";

        alumniLinkedin =
          alumniData?.linkedin_url ||
          null;

        alumniVerified =
          alumniData?.verified === true;
      }

      const fallbackUsername =
        profileData.full_name
          ?.toLowerCase()
          .replace(/\s+/g, "") ||
        role;

      const username =
        profileData.username ||
        `@${fallbackUsername}`;

      setProfile({
        role:
          role as CommunityRole,

        fullName:
          profileData.full_name ||
          "Your Name",

        username:
          username.startsWith("@")
            ? username
            : `@${username}`,

        headline:
          profileData.headline || "",

        bio:
          profileData.bio || "",

        avatar:
          profileData.avatar_url ||
          null,

        programme,
        campus,

        yearOfStudy,

        graduationYear,
        currentCompany,
        currentJobTitle,
        alumniVerified,

        /*
         * Alumni-specific LinkedIn takes
         * priority when it exists.
         */
        linkedin:
          alumniLinkedin ||
          profileData.linkedin_url ||
          null,

        github:
          profileData.github_url ||
          null,

        instagram:
          profileData.instagram_url ||
          null,

        website:
          profileData.website_url ||
          null,
      });

      setStats({
        posts:
          postCountResult.count || 0,

        followers:
          followerResult.count || 0,

        following:
          followingResult.count || 0,
      });

      setPosts(
        postsResult.data || []
      );

      if (postsResult.error) {
        console.log(
          "Posts error:",
          postsResult.error
        );
      }
    } catch (error) {
      console.log(
        "Profile loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    setRefreshing(true);

    await loadProfile();

    setRefreshing(false);
  }

  function openFollowers() {
    router.push(
      "/(student)/followers"
    );
  }

  function openFollowing() {
    router.push(
      "/(student)/following"
    );
  }

  function openSettings() {
    setMenuVisible(false);

    router.push(
      "/(student)/settings"
    );
  }

  function openActivity() {
    setMenuVisible(false);

    router.push(
      "/(student)/activity"
    );
  }

  function openPortfolio() {
    setMenuVisible(false);

    router.push(
      "/member-portfolio"
    );
  }

  function createPost() {
    router.push(
      "/(student)/create-post"
    );
  }

  function editProfile() {
    router.push(
      "/(student)/edit-profile"
    );
  }

  function openPost(
    post: ProfilePost
  ) {
    router.push({
      pathname:
        "/post/[id]" as never,

      params: {
        id: post.id,
      },
    });
  }

  async function openLink(
    value: string | null
  ) {
    if (!value) return;

    let url = value.trim();

    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://")
    ) {
      url = `https://${url}`;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log(
        "Could not open link:",
        error
      );
    }
  }

  const isAlumni =
    profile.role === "alumni";

  const hasSocials =
    Boolean(profile.linkedin) ||
    Boolean(profile.github) ||
    Boolean(profile.instagram) ||
    Boolean(profile.website);

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
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              refreshProfile
            }
            tintColor={PRIMARY}
          />
        }
      >
        <View style={styles.header}>
          <Text
            style={styles.headerTitle}
          >
            Profile
          </Text>

          <Pressable
            onPress={() =>
              setMenuVisible(true)
            }
            style={
              styles.headerButton
            }
          >
            <Ionicons
              name="menu-outline"
              size={29}
              color="#111"
            />
          </Pressable>
        </View>

        <View
          style={
            styles.profileSection
          }
        >
          <View
            style={styles.profileTop}
          >
            <View
              style={
                styles.avatarContainer
              }
            >
              {profile.avatar ? (
                <Image
                  source={{
                    uri: profile.avatar,
                  }}
                  style={styles.avatar}
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
                    {profile.fullName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={
                styles.statsContainer
              }
            >
              <View style={styles.stat}>
                <Text
                  style={
                    styles.statNumber
                  }
                >
                  {stats.posts}
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Posts
                </Text>
              </View>

              <Pressable
                style={styles.stat}
                onPress={
                  openFollowers
                }
              >
                <Text
                  style={
                    styles.statNumber
                  }
                >
                  {stats.followers}
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Followers
                </Text>
              </Pressable>

              <Pressable
                style={styles.stat}
                onPress={
                  openFollowing
                }
              >
                <Text
                  style={
                    styles.statNumber
                  }
                >
                  {stats.following}
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            style={styles.profileInfo}
          >
            <View
              style={styles.nameRow}
            >
              <Text style={styles.name}>
                {profile.fullName}
              </Text>

              {isAlumni &&
                profile.alumniVerified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={PRIMARY}
                  />
                )}
            </View>

            <Text
              style={styles.username}
            >
              {profile.username}
            </Text>

            <View
              style={styles.roleRow}
            >
              <View
                style={[
                  styles.roleBadge,

                  isAlumni &&
                    styles.alumniBadge,
                ]}
              >
                <Ionicons
                  name={
                    isAlumni
                      ? "ribbon"
                      : "school"
                  }
                  size={14}
                  color={
                    isAlumni
                      ? "#FFFFFF"
                      : PRIMARY
                  }
                />

                <Text
                  style={[
                    styles.roleBadgeText,

                    isAlumni &&
                      styles.alumniBadgeText,
                  ]}
                >
                  {isAlumni
                    ? "Richfield Alumni"
                    : "Richfield Student"}
                </Text>
              </View>
            </View>

            {profile.headline ? (
              <Text
                style={styles.headline}
              >
                {profile.headline}
              </Text>
            ) : null}

            {profile.bio ? (
              <Text style={styles.bio}>
                {profile.bio}
              </Text>
            ) : null}

            {(profile.programme ||
              profile.campus ||
              profile.yearOfStudy ||
              profile.graduationYear) && (
              <View
                style={
                  styles.educationInfo
                }
              >
                {profile.programme ? (
                  <View
                    style={
                      styles.educationRow
                    }
                  >
                    <Ionicons
                      name="school-outline"
                      size={17}
                      color="#555"
                    />

                    <Text
                      style={
                        styles.educationText
                      }
                    >
                      {profile.programme}
                    </Text>
                  </View>
                ) : null}

                {profile.campus ? (
                  <View
                    style={
                      styles.educationRow
                    }
                  >
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color="#555"
                    />

                    <Text
                      style={
                        styles.educationText
                      }
                    >
                      {profile.campus}

                      {!isAlumni &&
                      profile.yearOfStudy
                        ? ` · Year ${profile.yearOfStudy}`
                        : ""}
                    </Text>
                  </View>
                ) : null}

                {isAlumni &&
                profile.graduationYear ? (
                  <View
                    style={
                      styles.educationRow
                    }
                  >
                    <Ionicons
                      name="ribbon-outline"
                      size={17}
                      color="#555"
                    />

                    <Text
                      style={
                        styles.educationText
                      }
                    >
                      Graduated{" "}
                      {
                        profile.graduationYear
                      }
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {isAlumni &&
              (profile.currentJobTitle ||
                profile.currentCompany) && (
                <View
                  style={
                    styles.careerCard
                  }
                >
                  <View
                    style={
                      styles.careerIcon
                    }
                  >
                    <Ionicons
                      name="briefcase-outline"
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
                        styles.careerLabel
                      }
                    >
                      CURRENT ROLE
                    </Text>

                    {profile.currentJobTitle ? (
                      <Text
                        style={
                          styles.careerTitle
                        }
                      >
                        {
                          profile.currentJobTitle
                        }
                      </Text>
                    ) : null}

                    {profile.currentCompany ? (
                      <Text
                        style={
                          styles.careerCompany
                        }
                      >
                        {
                          profile.currentCompany
                        }
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

            {hasSocials && (
              <View
                style={styles.socialRow}
              >
                {profile.linkedin && (
                  <SocialButton
                    icon="logo-linkedin"
                    onPress={() =>
                      openLink(
                        profile.linkedin
                      )
                    }
                  />
                )}

                {profile.github && (
                  <SocialButton
                    icon="logo-github"
                    onPress={() =>
                      openLink(
                        profile.github
                      )
                    }
                  />
                )}

                {profile.instagram && (
                  <SocialButton
                    icon="logo-instagram"
                    onPress={() =>
                      openLink(
                        profile.instagram
                      )
                    }
                  />
                )}

                {profile.website && (
                  <SocialButton
                    icon="globe-outline"
                    onPress={() =>
                      openLink(
                        profile.website
                      )
                    }
                  />
                )}
              </View>
            )}
          </View>

          <Pressable
            style={styles.editButton}
            onPress={editProfile}
          >
            <Text
              style={
                styles.editButtonText
              }
            >
              Edit profile
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.portfolioCard}
          onPress={openPortfolio}
        >
          <View
            style={
              styles.portfolioIcon
            }
          >
            <Ionicons
              name="folder-open-outline"
              size={23}
              color="#fff"
            />
          </View>

          <View
            style={
              styles.portfolioContent
            }
          >
            <Text
              style={
                styles.portfolioTitle
              }
            >
              My Portfolio
            </Text>

            <Text
              style={
                styles.portfolioSubtitle
              }
            >
              Projects, skills,
              achievements and experience
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#777"
          />
        </Pressable>

        <View
          style={styles.postsHeader}
        >
          <Ionicons
            name="grid-outline"
            size={21}
            color="#111"
          />

          <Text
            style={styles.postsTitle}
          >
            Posts
          </Text>
        </View>

        {posts.length === 0 ? (
          <View
            style={styles.emptyPosts}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="camera-outline"
                size={30}
                color={PRIMARY}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No posts yet
            </Text>

            <Text
              style={styles.emptyText}
            >
              {isAlumni
                ? "Share your career journey, achievements and experiences with the Richfield community."
                : "Share your projects, achievements and student journey."}
            </Text>

            <Pressable
              style={
                styles.firstPostButton
              }
              onPress={createPost}
            >
              <Text
                style={
                  styles.firstPostButtonText
                }
              >
                Create your first post
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={styles.postsGrid}
          >
            {posts.map(post => (
              <Pressable
                key={post.id}
                style={styles.post}
                onPress={() =>
                  openPost(post)
                }
              >
                {post.image_url ? (
                  post.media_type ===
                  "video" ? (
                    <PostVideo
                      uri={
                        post.image_url
                      }
                    />
                  ) : (
                    <Image
                      source={{
                        uri:
                          post.image_url,
                      }}
                      style={
                        styles.postMedia
                      }
                      resizeMode="cover"
                    />
                  )
                ) : (
                  <View
                    style={
                      styles.textPostPreview
                    }
                  >
                    <Text
                      style={
                        styles.textPostPreviewText
                      }
                      numberOfLines={6}
                    >
                      {post.content ||
                        "Post"}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={styles.floatingButton}
        onPress={createPost}
      >
        <Ionicons
          name="add"
          size={30}
          color="#fff"
        />
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setMenuVisible(false)
        }
      >
        <View
          style={styles.menuOverlay}
        >
          <Pressable
            style={styles.blurArea}
            onPress={() =>
              setMenuVisible(false)
            }
          />

          <View
            style={styles.sideMenu}
          >
            <View
              style={styles.menuHeader}
            >
              <Text
                style={styles.menuTitle}
              >
                Account
              </Text>

              <Pressable
                onPress={() =>
                  setMenuVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={26}
                  color="#111"
                />
              </Pressable>
            </View>

            <View
              style={
                styles.menuProfile
              }
            >
              {profile.avatar ? (
                <Image
                  source={{
                    uri: profile.avatar,
                  }}
                  style={
                    styles.menuAvatar
                  }
                />
              ) : (
                <View
                  style={
                    styles.menuAvatarPlaceholder
                  }
                >
                  <Text
                    style={
                      styles.menuAvatarText
                    }
                  >
                    {profile.fullName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text
                  style={styles.menuName}
                >
                  {profile.fullName}
                </Text>

                <Text
                  style={
                    styles.menuUsername
                  }
                >
                  {profile.username}
                </Text>

                <Text
                  style={
                    styles.menuRole
                  }
                >
                  {isAlumni
                    ? "Richfield Alumni"
                    : "Richfield Student"}
                </Text>

                {profile.programme ? (
                  <Text
                    style={
                      styles.menuProgramme
                    }
                    numberOfLines={1}
                  >
                    {profile.programme}
                  </Text>
                ) : null}
              </View>
            </View>

            <View
              style={
                styles.menuDivider
              }
            />

            <MenuItem
              icon="settings-outline"
              title="Settings"
              onPress={openSettings}
            />

            <MenuItem
              icon="time-outline"
              title="Activity"
              onPress={openActivity}
            />

            <MenuItem
              icon="briefcase-outline"
              title="Portfolio"
              onPress={openPortfolio}
            />

            <MenuItem
              icon="people-outline"
              title="Followers"
              value={stats.followers}
              onPress={() => {
                setMenuVisible(false);
                openFollowers();
              }}
            />

            <MenuItem
              icon="person-add-outline"
              title="Following"
              value={stats.following}
              onPress={() => {
                setMenuVisible(false);
                openFollowing();
              }}
            />

            <View
              style={styles.menuBottom}
            >
              <Text
                style={
                  styles.menuVersion
                }
              >
                Richfield Social
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SocialButton({
  icon,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.socialButton}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color="#222"
      />
    </Pressable>
  );
}

function MenuItem({
  icon,
  title,
  value,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  value?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.menuItem}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={23}
        color="#222"
      />

      <Text
        style={styles.menuItemText}
      >
        {title}
      </Text>

      {value !== undefined ? (
        <Text
          style={styles.menuCount}
        >
          {value}
        </Text>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={19}
          color="#999"
        />
      )}
    </Pressable>
  );
}

function PostVideo({
  uri,
}: {
  uri: string;
}) {
  const player =
    useVideoPlayer(
      uri,
      player => {
        player.loop = false;
      }
    );

  return (
    <VideoView
      player={player}
      style={styles.postMedia}
      nativeControls
      contentFit="cover"
    />
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

    header: {
      height: 62,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#111",
    },

    profileSection: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },

    profileTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    avatarContainer: {
      width: 92,
      height: 92,
      borderRadius: 46,
      overflow: "hidden",
      marginRight: 24,
    },

    avatar: {
      width: "100%",
      height: "100%",
    },

    avatarPlaceholder: {
      width: "100%",
      height: "100%",
      borderRadius: 46,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },

    avatarText: {
      color: "#fff",
      fontSize: 34,
      fontWeight: "800",
    },

    statsContainer: {
      flex: 1,
      flexDirection: "row",
      justifyContent:
        "space-between",
    },

    stat: {
      alignItems: "center",
      minWidth: 60,
    },

    statNumber: {
      fontSize: 19,
      fontWeight: "800",
      color: "#111",
    },

    statLabel: {
      fontSize: 12,
      color: "#666",
      marginTop: 4,
    },

    profileInfo: {
      marginTop: 17,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    name: {
      fontSize: 19,
      fontWeight: "800",
      color: "#111",
    },

    username: {
      color: PRIMARY,
      fontSize: 14,
      marginTop: 2,
    },

    roleRow: {
      flexDirection: "row",
      marginTop: 9,
    },

    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: "#F1F1FF",
      borderWidth: 1,
      borderColor: "#DCDCFF",
    },

    alumniBadge: {
      backgroundColor: PRIMARY,
      borderColor: PRIMARY,
    },

    roleBadgeText: {
      color: PRIMARY,
      fontSize: 12,
      fontWeight: "700",
    },

    alumniBadgeText: {
      color: "#FFFFFF",
    },

    headline: {
      color: "#222",
      fontSize: 14,
      fontWeight: "700",
      marginTop: 10,
    },

    bio: {
      color: "#444",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
    },

    educationInfo: {
      marginTop: 12,
      gap: 7,
    },

    educationRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    educationText: {
      color: "#555",
      fontSize: 13,
      marginLeft: 7,
      flex: 1,
    },

    careerCard: {
      marginTop: 15,
      padding: 13,
      borderRadius: 12,
      backgroundColor: "#F7F7FC",
      borderWidth: 1,
      borderColor: "#E8E8F2",
      flexDirection: "row",
      alignItems: "center",
    },

    careerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#EEEEFF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    careerLabel: {
      color: "#888",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.7,
    },

    careerTitle: {
      color: "#111",
      fontSize: 14,
      fontWeight: "800",
      marginTop: 2,
    },

    careerCompany: {
      color: "#666",
      fontSize: 13,
      marginTop: 2,
    },

    socialRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
    },

    socialButton: {
      width: 37,
      height: 37,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: "#E5E5EA",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff",
    },

    editButton: {
      height: 40,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
    },

    editButtonText: {
      fontWeight: "700",
      fontSize: 14,
      color: "#222",
    },

    portfolioCard: {
      marginHorizontal: 20,
      marginBottom: 22,
      padding: 16,
      borderRadius: 14,
      backgroundColor: "#f6f6fb",
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#e7e7f3",
    },

    portfolioIcon: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },

    portfolioContent: {
      flex: 1,
    },

    portfolioTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#111",
    },

    portfolioSubtitle: {
      fontSize: 12,
      color: "#666",
      marginTop: 3,
      lineHeight: 17,
    },

    postsHeader: {
      height: 50,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#eee",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },

    postsTitle: {
      fontSize: 14,
      fontWeight: "700",
    },

    postsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },

    post: {
      width: width / 3,
      height: width / 3,
      padding: 1,
      backgroundColor: "#eee",
    },

    textPostPreview: {
      flex: 1,
      backgroundColor: "#F5F5FA",
      padding: 12,
      justifyContent: "center",
    },

    textPostPreviewText: {
      color: "#222",
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },

    postMedia: {
      width: "100%",
      height: "100%",
      backgroundColor: "#000",
    },

    emptyPosts: {
      alignItems: "center",
      paddingHorizontal: 35,
      paddingVertical: 45,
    },

    emptyIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      borderWidth: 1,
      borderColor: "#ddd",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 15,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111",
    },

    emptyText: {
      textAlign: "center",
      color: "#777",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 7,
    },

    firstPostButton: {
      backgroundColor: PRIMARY,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 9,
      marginTop: 18,
    },

    firstPostButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 13,
    },

    floatingButton: {
      position: "absolute",
      right: 20,
      bottom: 25,
      width: 57,
      height: 57,
      borderRadius: 29,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      elevation: 7,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    menuOverlay: {
      flex: 1,
      flexDirection: "row",
    },

    blurArea: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.55)",
    },

    sideMenu: {
      width: DRAWER_WIDTH,
      height: "100%",
      backgroundColor: "#fff",
      paddingTop:
        Platform.OS === "ios"
          ? 55
          : 35,
      paddingHorizontal: 20,
      elevation: 20,
    },

    menuHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 25,
    },

    menuTitle: {
      fontSize: 25,
      fontWeight: "800",
      color: "#111",
    },

    menuProfile: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 22,
    },

    menuAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12,
    },

    menuAvatarPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    menuAvatarText: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "800",
    },

    menuName: {
      fontSize: 15,
      fontWeight: "800",
    },

    menuUsername: {
      color: "#777",
      fontSize: 12,
      marginTop: 2,
    },

    menuRole: {
      color: PRIMARY,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },

    menuProgramme: {
      color: "#999",
      fontSize: 11,
      marginTop: 3,
    },

    menuDivider: {
      height: 1,
      backgroundColor: "#eee",
      marginBottom: 10,
    },

    menuItem: {
      height: 58,
      flexDirection: "row",
      alignItems: "center",
    },

    menuItemText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      marginLeft: 15,
      color: "#222",
    },

    menuCount: {
      color: "#888",
      fontSize: 13,
      fontWeight: "600",
    },

    menuBottom: {
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: 30,
    },

    menuVersion: {
      color: "#aaa",
      fontSize: 12,
    },
  });