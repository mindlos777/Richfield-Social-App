import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import {
  useVideoPlayer,
  VideoView,
} from "expo-video";

import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");
const PRIMARY = "#0300cf";

type ProfilePost = {
  id: string;
  user_id: string;
  image_url: string | null;
  content: string | null;
  media_type: string | null;
  visibility: string | null;
  created_at: string;
};

type MemberProfile = {
  id: string;
  fullName: string;
  username: string;
  bio: string;
  avatar: string | null;
  role: string;
  headline: string;
  programme: string;
  campus: string;
  yearOfStudy: number | null;
  skills: string[];
  careerInterests: string[];
  linkedin: string | null;
  github: string | null;
  instagram: string | null;
  website: string | null;
};

function firstParam(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export default function MemberProfileScreen() {
  const params = useLocalSearchParams<{
    userId?: string | string[];
    id?: string | string[];
    name?: string | string[];
    username?: string | string[];
    image?: string | string[];
    role?: string | string[];
  }>();

  const memberId =
    firstParam(params.userId) ||
    firstParam(params.id);

  const fallbackName =
    firstParam(params.name) || "Member";

  const fallbackUsername =
    firstParam(params.username);

  const fallbackImage =
    firstParam(params.image);

  const fallbackRole =
    firstParam(params.role) || "student";

  const [profile, setProfile] =
    useState<MemberProfile>({
      id: memberId,
      fullName: fallbackName,
      username: fallbackUsername
        ? fallbackUsername.startsWith("@")
          ? fallbackUsername
          : `@${fallbackUsername}`
        : "@member",
      bio: "",
      avatar: fallbackImage || null,
      role: fallbackRole,
      headline: "",
      programme: "",
      campus: "",
      yearOfStudy: null,
      skills: [],
      careerInterests: [],
      linkedin: null,
      github: null,
      instagram: null,
      website: null,
    });

  const [stats, setStats] = useState({
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

  const [messageLoading, setMessageLoading] =
    useState(false);

  const loadMember = useCallback(async () => {
    if (!memberId) {
      console.log(
        "Member profile route missing userId/id:",
        params
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      console.log(
        "Loading member profile for:",
        memberId
      );

      const [
        profileResult,
        studentResult,
        postCountResult,
        followerResult,
        followingResult,
        postsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            bio,
            avatar_url,
            headline,
            role,
            linkedin_url,
            github_url,
            instagram_url,
            website_url
          `)
          .eq("id", memberId)
          .limit(1),

        supabase
          .from("student_profiles")
          .select(`
            user_id,
            programme,
            campus,
            year_of_study,
            skills,
            career_interests
          `)
          .eq("user_id", memberId)
          .limit(1),

        supabase
          .from("posts")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("user_id", memberId),

        supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("following_id", memberId),

        supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("follower_id", memberId),

        supabase
          .from("posts")
          .select(`
            id,
            user_id,
            image_url,
            content,
            media_type,
            visibility,
            created_at
          `)
          .eq("user_id", memberId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (profileResult.error) {
        console.log(
          "Member profile query error:",
          profileResult.error
        );
      }

      if (studentResult.error) {
        console.log(
          "Member student profile error:",
          studentResult.error
        );
      }

      if (postCountResult.error) {
        console.log(
          "Member post count error:",
          postCountResult.error
        );
      }

      if (followerResult.error) {
        console.log(
          "Member followers error:",
          followerResult.error
        );
      }

      if (followingResult.error) {
        console.log(
          "Member following error:",
          followingResult.error
        );
      }

      if (postsResult.error) {
        console.log(
          "Member posts error:",
          postsResult.error
        );
      }

      const profileData =
        profileResult.data?.[0] || null;

      const studentData =
        studentResult.data?.[0] || null;

      const name =
        profileData?.full_name ||
        fallbackName ||
        "Member";

      const usernameValue =
        profileData?.username ||
        fallbackUsername ||
        name
          .toLowerCase()
          .replace(/\s+/g, "");

      setProfile({
        id: memberId,
        fullName: name,
        username: usernameValue.startsWith("@")
          ? usernameValue
          : `@${usernameValue}`,
        bio: profileData?.bio || "",
        avatar:
          profileData?.avatar_url ||
          fallbackImage ||
          null,
        role: String(
          profileData?.role ||
            fallbackRole ||
            "student"
        ),
        headline:
          profileData?.headline || "",
        programme:
          studentData?.programme || "",
        campus:
          studentData?.campus || "",
        yearOfStudy:
          studentData?.year_of_study || null,
        skills: Array.isArray(
          studentData?.skills
        )
          ? studentData.skills
          : [],
        careerInterests: Array.isArray(
          studentData?.career_interests
        )
          ? studentData.career_interests
          : [],
        linkedin:
          profileData?.linkedin_url || null,
        github:
          profileData?.github_url || null,
        instagram:
          profileData?.instagram_url || null,
        website:
          profileData?.website_url || null,
      });

      setStats({
        posts: postCountResult.count || 0,
        followers: followerResult.count || 0,
        following: followingResult.count || 0,
      });

      setPosts(
        (postsResult.data || []) as ProfilePost[]
      );
    } catch (error) {
      console.log(
        "Member profile loading error:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    memberId,
    fallbackName,
    fallbackUsername,
    fallbackImage,
    fallbackRole,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember])
  );

  async function refreshProfile() {
    setRefreshing(true);
    await loadMember();
  }

  async function openMessage() {
    if (!memberId || messageLoading) {
      return;
    }

    try {
      setMessageLoading(true);

      const { data, error } =
        await supabase.rpc(
          "open_direct_conversation",
          {
            p_other_user_id: memberId,
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

      router.push({
        pathname: "/conversation",
        params: {
          id: String(data),
          otherUserId: memberId,
          userId: memberId,
          name: profile.fullName,
          username:
            profile.username.replace("@", ""),
          image: profile.avatar || "",
          role: profile.role,
        },
      });
    } catch (error) {
      console.log(
        "Open message error:",
        error
      );
    } finally {
      setMessageLoading(false);
    }
  }

  function openPortfolio() {
    router.push({
      pathname: "/member-portfolio",
      params: {
        userId: memberId,
        name: profile.fullName,
      },
    });
  }

  function openPost(post: ProfilePost) {
    router.push({
      pathname:
        "/(student)/post/[id]" as never,
      params: {
        id: post.id,
      },
    });
  }

  async function openLink(
    value: string | null
  ) {
    if (!value) {
      return;
    }

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

  const hasSocials =
    Boolean(profile.linkedin) ||
    Boolean(profile.github) ||
    Boolean(profile.instagram) ||
    Boolean(profile.website);

  const roleLabel = useMemo(() => {
    if (!profile.role) {
      return "Member";
    }

    return (
      profile.role.charAt(0).toUpperCase() +
      profile.role.slice(1)
    );
  }, [profile.role]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </View>
    );
  }

  if (!memberId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>
          Profile unavailable
        </Text>

        <Text style={styles.emptyText}>
          No member ID was passed to this
          screen.
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProfile}
            tintColor={PRIMARY}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons
              name="arrow-back"
              size={25}
              color="#111"
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <View style={styles.headerButton} />
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileTop}>
            <View
              style={styles.avatarContainer}
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
                    style={styles.avatarText}
                  >
                    {profile.fullName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={styles.statsContainer}
            >
              <View style={styles.stat}>
                <Text
                  style={styles.statNumber}
                >
                  {stats.posts}
                </Text>
                <Text
                  style={styles.statLabel}
                >
                  Posts
                </Text>
              </View>

              <View style={styles.stat}>
                <Text
                  style={styles.statNumber}
                >
                  {stats.followers}
                </Text>
                <Text
                  style={styles.statLabel}
                >
                  Followers
                </Text>
              </View>

              <View style={styles.stat}>
                <Text
                  style={styles.statNumber}
                >
                  {stats.following}
                </Text>
                <Text
                  style={styles.statLabel}
                >
                  Following
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {profile.fullName}
              </Text>

              <View
                style={styles.roleBadge}
              >
                <Text
                  style={styles.roleText}
                >
                  {roleLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.username}>
              {profile.username}
            </Text>

            {profile.headline ? (
              <Text style={styles.headline}>
                {profile.headline}
              </Text>
            ) : null}

            {profile.bio ? (
              <Text style={styles.bio}>
                {profile.bio}
              </Text>
            ) : null}

            {(profile.programme ||
              profile.campus) && (
              <View
                style={styles.educationInfo}
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
                      {profile.yearOfStudy
                        ? ` · Year ${profile.yearOfStudy}`
                        : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {profile.skills.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>
                  Skills
                </Text>
                <View
                  style={styles.chipContainer}
                >
                  {profile.skills.map(
                    (skill, index) => (
                      <View
                        key={`${skill}-${index}`}
                        style={styles.chip}
                      >
                        <Text
                          style={
                            styles.chipText
                          }
                        >
                          {skill}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

            {profile.careerInterests
              .length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>
                  Career interests
                </Text>
                <View
                  style={styles.chipContainer}
                >
                  {profile.careerInterests.map(
                    (interest, index) => (
                      <View
                        key={`${interest}-${index}`}
                        style={
                          styles.interestChip
                        }
                      >
                        <Text
                          style={
                            styles.interestChipText
                          }
                        >
                          {interest}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

            {hasSocials && (
              <View style={styles.socialRow}>
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
                      openLink(profile.github)
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
                      openLink(profile.website)
                    }
                  />
                )}
              </View>
            )}

            <Pressable
              style={styles.messageButton}
              onPress={openMessage}
              disabled={messageLoading}
            >
              {messageLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <>
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text
                    style={
                      styles.messageButtonText
                    }
                  >
                    Message
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.portfolioCard}
          onPress={openPortfolio}
        >
          <View
            style={styles.portfolioIcon}
          >
            <Ionicons
              name="folder-open-outline"
              size={23}
              color="#fff"
            />
          </View>

          <View
            style={styles.portfolioContent}
          >
            <Text
              style={styles.portfolioTitle}
            >
              Portfolio
            </Text>
            <Text
              style={
                styles.portfolioSubtitle
              }
            >
              Projects, skills and
              professional work
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#777"
          />
        </Pressable>

        <View style={styles.postsHeader}>
          <Ionicons
            name="grid-outline"
            size={21}
            color="#111"
          />
          <Text style={styles.postsTitle}>
            Posts
          </Text>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="camera-outline"
                size={30}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No visible posts
            </Text>

            <Text style={styles.emptyText}>
              This member has no posts that
              your account can currently view.
            </Text>
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
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
                      uri={post.image_url}
                    />
                  ) : (
                    <Image
                      source={{
                        uri: post.image_url,
                      }}
                      style={styles.postMedia}
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

function PostVideo({
  uri,
}: {
  uri: string;
}) {
  const player = useVideoPlayer(
    uri,
    (player) => {
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },
  header: {
    height: 62,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    justifyContent: "space-between",
  },
  stat: {
    alignItems: "center",
    minWidth: 58,
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
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111",
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F0F0FF",
  },
  roleText: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: "800",
  },
  username: {
    color: PRIMARY,
    fontSize: 14,
    marginTop: 3,
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
  infoSection: {
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F0F0FF",
  },
  chipText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "700",
  },
  interestChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F4F4F4",
  },
  interestChipText: {
    color: "#444",
    fontSize: 11,
    fontWeight: "700",
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
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
  messageButton: {
    minHeight: 43,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
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
  postMedia: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
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
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  backButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
