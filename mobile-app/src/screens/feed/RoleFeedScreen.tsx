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
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";

import FeedPostCard, {
  FeedPostItem,
  UserRole,
} from "../../components/feed/FeedPostCard";

import {
  getProfileCompletion,
  ProfileCompletionResult,
} from "../../services/ProfileCompletionService";

const PRIMARY = "#0300cf";

type ScreenRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  headline: string | null;
  status?: string | null;
};

type StudentRow = {
  user_id: string;
  programme: string | null;
  campus: string | null;
  skills: string[] | null;
};

type RawPost = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  media_type: string | null;
  visibility: string | null;
  created_at: string;
};

type RankedFeedPost =
  FeedPostItem & {
    rankingScore: number;
  };

type Props = {
  mode: ScreenRole;
};

export default function RoleFeedScreen({
  mode,
}: Props) {
  const [profile, setProfile] =
    useState<ProfileRow | null>(
      null
    );

  const [posts, setPosts] =
    useState<RankedFeedPost[]>(
      []
    );

  const [following, setFollowing] =
    useState<string[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    personFilter,
    setPersonFilter,
  ] = useState<
    "all" | "students" | "alumni"
  >("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    likeLoading,
    setLikeLoading,
  ] = useState<string[]>([]);

  const [
    messageLoadingId,
    setMessageLoadingId,
  ] = useState<string | null>(
    null
  );

  const [
    deleteLoadingId,
    setDeleteLoadingId,
  ] = useState<string | null>(
    null
  );

  const [
    profileCompletion,
    setProfileCompletion,
  ] =
    useState<ProfileCompletionResult | null>(
      null
    );

  const isSocial =
    mode === "student" ||
    mode === "alumni";

  const isTalent =
    mode === "business";

  const isAdmin =
    mode === "admin";

  const loadProfileCompletion =
    useCallback(async () => {
      if (!isSocial) {
        setProfileCompletion(null);
        return;
      }

      try {
        const result =
          await getProfileCompletion();

        setProfileCompletion(
          result
        );
      } catch (error) {
        console.log(
          "Profile completion error:",
          error
        );
      }
    }, [isSocial]);

  const loadFeed = useCallback(
    async (
      showLoader = true
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

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
            "No signed-in user."
          );
        }

        const {
          data: me,
          error: meError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            avatar_url,
            role,
            headline,
            status
          `)
          .eq("id", user.id)
          .single();

        if (meError) {
          throw meError;
        }

        if (me.role !== mode) {
          throw new Error(
            `This account is ${
              me.role || "unknown"
            }, but this is the ${mode} feed.`
          );
        }

        setProfile(
          me as ProfileRow
        );

        let followedIds:
          string[] = [];

        if (isSocial) {
          const {
            data: followRows,
            error: followError,
          } = await supabase
            .from("follows")
            .select("following_id")
            .eq(
              "follower_id",
              user.id
            );

          if (followError) {
            throw followError;
          }

          followedIds =
            (followRows || []).map(
              row =>
                row.following_id
            );

          setFollowing(
            followedIds
          );
        } else {
          setFollowing([]);
        }

        const {
          data: postRows,
          error: postsError,
        } = await supabase
          .from("posts")
          .select(`
            id,
            user_id,
            content,
            image_url,
            media_type,
            visibility,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          })
          .limit(120);

        if (postsError) {
          throw postsError;
        }

        const rawPosts =
          (postRows ||
            []) as RawPost[];

        if (!rawPosts.length) {
          setPosts([]);
          return;
        }

        const authorIds = [
          ...new Set(
            rawPosts.map(
              post => post.user_id
            )
          ),
        ];

        const postIds =
          rawPosts.map(
            post => post.id
          );

        const requests:
          PromiseLike<any>[] = [
          supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              username,
              avatar_url,
              role,
              headline,
              status
            `)
            .in("id", authorIds),

          supabase
            .from("post_likes")
            .select(
              "post_id,user_id"
            )
            .in(
              "post_id",
              postIds
            ),

          supabase
            .from(
              "post_comments"
            )
            .select("post_id")
            .in(
              "post_id",
              postIds
            ),

          supabase
            .from("post_shares")
            .select("post_id")
            .in(
              "post_id",
              postIds
            ),
        ];

        if (isTalent) {
          requests.push(
            supabase
              .from(
                "student_profiles"
              )
              .select(
                "user_id,programme,campus,skills"
              )
              .in(
                "user_id",
                authorIds
              )
          );
        }

        const results =
          await Promise.all(
            requests
          );

        const profilesResult =
          results[0];

        const likesResult =
          results[1];

        const commentsResult =
          results[2];

        const sharesResult =
          results[3];

        const studentsResult =
          isTalent
            ? results[4]
            : null;

        if (
          profilesResult.error
        ) {
          throw profilesResult.error;
        }

        if (likesResult.error) {
          throw likesResult.error;
        }

        if (
          commentsResult.error
        ) {
          throw commentsResult.error;
        }

        if (sharesResult.error) {
          throw sharesResult.error;
        }

        if (
          studentsResult?.error
        ) {
          console.log(
            "Student profile feed data:",
            studentsResult.error
          );
        }

        const profileMap =
          new Map<
            string,
            ProfileRow
          >();

        (
          profilesResult.data || []
        ).forEach(
          (item: ProfileRow) => {
            profileMap.set(
              item.id,
              item
            );
          }
        );

        const studentMap =
          new Map<
            string,
            StudentRow
          >();

        (
          studentsResult?.data ||
          []
        ).forEach(
          (item: StudentRow) => {
            studentMap.set(
              item.user_id,
              item
            );
          }
        );

        const likes =
          likesResult.data || [];

        const comments =
          commentsResult.data || [];

        const shares =
          sharesResult.data || [];

        const now =
          Date.now();

        const merged:
          RankedFeedPost[] =
          rawPosts
            .map(post => {
              const author =
                profileMap.get(
                  post.user_id
                );

              if (
                !author &&
                !isAdmin
              ) {
                return null;
              }

              if (
                isTalent &&
                author &&
                author.role !==
                  "student" &&
                author.role !==
                  "alumni"
              ) {
                return null;
              }

              if (
                isTalent &&
                ![
                  "everyone",
                  "public",
                ].includes(
                  String(
                    post.visibility ||
                      "everyone"
                  ).toLowerCase()
                )
              ) {
                return null;
              }

              const postLikes =
                likes.filter(
                  (item: any) =>
                    item.post_id ===
                    post.id
                );

              const likeCount =
                postLikes.length;

              const commentCount =
                comments.filter(
                  (item: any) =>
                    item.post_id ===
                    post.id
                ).length;

              const shareCount =
                shares.filter(
                  (item: any) =>
                    item.post_id ===
                    post.id
                ).length;

              const liked =
                postLikes.some(
                  (item: any) =>
                    item.user_id ===
                    user.id
                );

              const ageHours =
                Math.max(
                  0,
                  (now -
                    new Date(
                      post.created_at
                    ).getTime()) /
                    3600000
                );

              let rankingScore =
                0;

              if (isSocial) {
                if (
                  followedIds.includes(
                    post.user_id
                  )
                ) {
                  rankingScore +=
                    50;
                }

                if (
                  post.user_id ===
                  user.id
                ) {
                  rankingScore +=
                    8;
                }

                if (
                  mode ===
                    "alumni" &&
                  author?.role ===
                    "alumni"
                ) {
                  rankingScore +=
                    10;
                }

                if (
                  mode ===
                    "student" &&
                  author?.role ===
                    "student"
                ) {
                  rankingScore +=
                    8;
                }

                rankingScore +=
                  likeCount * 2;

                rankingScore +=
                  commentCount * 4;

                rankingScore +=
                  shareCount * 5;

                rankingScore +=
                  Math.max(
                    0,
                    48 - ageHours
                  );
              } else {
                rankingScore =
                  new Date(
                    post.created_at
                  ).getTime();
              }

              const student =
                studentMap.get(
                  post.user_id
                );

              return {
                id: post.id,
                user_id:
                  post.user_id,
                content:
                  post.content,
                image_url:
                  post.image_url,
                media_type:
                  post.media_type,
                visibility:
                  post.visibility,
                created_at:
                  post.created_at,

                full_name:
                  author?.full_name ||
                  "Richfield Member",

                username:
                  author?.username ||
                  null,

                avatar_url:
                  author?.avatar_url ||
                  null,

                role:
                  author?.role ||
                  null,

                headline:
                  author?.headline ||
                  null,

                programme:
                  student?.programme ||
                  null,

                campus:
                  student?.campus ||
                  null,

                skills:
                  Array.isArray(
                    student?.skills
                  )
                    ? student?.skills ||
                      []
                    : [],

                likes: likeCount,
                comments:
                  commentCount,
                shares: shareCount,
                liked,
                rankingScore,
              } as RankedFeedPost;
            })
            .filter(
              Boolean
            ) as RankedFeedPost[];

        merged.sort(
          (a, b) =>
            b.rankingScore -
            a.rankingScore
        );

        setPosts(merged);
      } catch (error: any) {
        console.log(
          `${mode} feed error:`,
          error
        );

        Alert.alert(
          "Feed",
          error?.message ||
            "Could not load this feed."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      isAdmin,
      isSocial,
      isTalent,
      mode,
    ]
  );

  const loadScreen =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (isSocial) {
          await Promise.all([
            loadFeed(
              showLoader
            ),
            loadProfileCompletion(),
          ]);

          return;
        }

        await loadFeed(
          showLoader
        );
      },
      [
        isSocial,
        loadFeed,
        loadProfileCompletion,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      loadScreen(true);
    }, [loadScreen])
  );

  useEffect(() => {
    const channel = supabase
      .channel(
        `${mode}-feed-realtime`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () =>
          loadFeed(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_likes",
        },
        () =>
          loadFeed(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "post_comments",
        },
        () =>
          loadFeed(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "post_shares",
        },
        () =>
          loadFeed(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    loadFeed,
    mode,
  ]);

  const visiblePosts =
    useMemo(() => {
      let list = [...posts];

      if (
        personFilter ===
        "students"
      ) {
        list = list.filter(
          post =>
            post.role ===
            "student"
        );
      }

      if (
        personFilter ===
        "alumni"
      ) {
        list = list.filter(
          post =>
            post.role ===
            "alumni"
        );
      }

      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return list;
      }

      return list.filter(
        post => {
          const searchable = `
            ${post.full_name}
            ${post.username || ""}
            ${post.headline || ""}
            ${post.programme || ""}
            ${post.campus || ""}
            ${(post.skills || []).join(
              " "
            )}
            ${post.content || ""}
          `.toLowerCase();

          return searchable.includes(
            value
          );
        }
      );
    }, [
      personFilter,
      posts,
      search,
    ]);

  async function toggleLike(
    post: RankedFeedPost
  ) {
    if (
      !profile?.id ||
      likeLoading.includes(
        post.id
      )
    ) {
      return;
    }

    setLikeLoading(
      current => [
        ...current,
        post.id,
      ]
    );

    const nextLiked =
      !post.liked;

    setPosts(current =>
      current.map(item =>
        item.id === post.id
          ? {
              ...item,
              liked:
                nextLiked,
              likes: nextLiked
                ? item.likes + 1
                : Math.max(
                    0,
                    item.likes - 1
                  ),
            }
          : item
      )
    );

    try {
      if (post.liked) {
        const {
          error,
        } = await supabase
          .from("post_likes")
          .delete()
          .eq(
            "post_id",
            post.id
          )
          .eq(
            "user_id",
            profile.id
          );

        if (error) {
          throw error;
        }
      } else {
        const {
          error,
        } = await supabase
          .from("post_likes")
          .insert({
            post_id:
              post.id,
            user_id:
              profile.id,
          });

        if (
          error &&
          error.code !== "23505"
        ) {
          throw error;
        }
      }
    } catch (error: any) {
      console.log(
        "Like error:",
        error
      );

      await loadFeed(false);
    } finally {
      setLikeLoading(
        current =>
          current.filter(
            id =>
              id !== post.id
          )
      );
    }
  }

  async function sharePost(
    post: RankedFeedPost
  ) {
    if (!profile?.id) {
      return;
    }

    try {
      await Share.share({
        message: post.content
          ? `${post.full_name}: ${post.content}`
          : `View this post from ${post.full_name} on Richfield Connect.`,
      });

      const {
        error,
      } = await supabase
        .from("post_shares")
        .insert({
          post_id: post.id,
          user_id:
            profile.id,
        });

      if (
        error &&
        error.code !== "23505"
      ) {
        throw error;
      }
    } catch (error) {
      console.log(
        "Share post error:",
        error
      );
    }
  }

  function openProfile(
    post: RankedFeedPost
  ) {
    if (
      post.user_id ===
      profile?.id
    ) {
      if (
        mode === "admin"
      ) {
        router.push(
          "/(admin)/(tabs)/profile"
        );

        return;
      }

      if (
        mode === "student"
      ) {
        router.push(
          "/(tabs)/profile"
        );

        return;
      }

      if (
        mode === "alumni"
      ) {
        router.push(
          "/(alumni)/(tabs)/profile"
        );

        return;
      }
    }

    router.push({
      pathname:
        "/member-profile",

      params: {
        userId:
          post.user_id,

        id:
          post.user_id,

        name:
          post.full_name,

        username:
          post.username ||
          "",

        image:
          post.avatar_url ||
          "",

        role:
          post.role ||
          "student",
      },
    });
  }

  async function openMessage(
    post: RankedFeedPost
  ) {
    try {
      setMessageLoadingId(
        post.user_id
      );

      const {
        data,
        error,
      } = await supabase.rpc(
        "open_direct_conversation",
        {
          p_other_user_id:
            post.user_id,
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
        pathname:
          "/conversation",

        params: {
          id: String(data),

          otherUserId:
            post.user_id,

          userId:
            post.user_id,

          name:
            post.full_name,

          username:
            post.username ||
            "",

          image:
            post.avatar_url ||
            "",

          role:
            post.role ||
            "student",
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Message",
        error?.message ||
          "Could not open this conversation."
      );
    } finally {
      setMessageLoadingId(
        null
      );
    }
  }

  function openPost(
    post: RankedFeedPost
  ) {
    router.push({
      pathname:
        "/post/[id]" as never,

      params: {
        id: post.id,
      },
    });
  }

  async function removePost(
    post: RankedFeedPost
  ) {
    Alert.alert(
      "Remove post",
      "Remove this post from Richfield Connect?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style:
            "destructive",

          onPress:
            async () => {
              try {
                setDeleteLoadingId(
                  post.id
                );

                const {
                  error,
                } =
                  await supabase
                    .from(
                      "posts"
                    )
                    .delete()
                    .eq(
                      "id",
                      post.id
                    );

                if (error) {
                  throw error;
                }

                setPosts(
                  current =>
                    current.filter(
                      item =>
                        item.id !==
                        post.id
                    )
                );
              } catch (
                error: any
              ) {
                Alert.alert(
                  "Moderation",
                  error?.message ||
                    "Could not remove this post."
                );
              } finally {
                setDeleteLoadingId(
                  null
                );
              }
            },
        },
      ]
    );
  }

  async function refresh() {
    setRefreshing(true);

    try {
      await loadScreen(false);
    } finally {
      setRefreshing(false);
    }
  }

  function openProfileCompletion() {
    /*
     * Your existing Student and Alumni
     * profile editing currently uses the
     * student edit-profile route.
     *
     * The CV itself is available from
     * ProfileScreen.
     */
    router.push(
      "/(student)/edit-profile"
    );
  }

  function renderCompletionCard() {
    if (
      !isSocial ||
      !profileCompletion ||
      profileCompletion.isComplete
    ) {
      return null;
    }

    const missing =
      profileCompletion.missing;

    return (
      <View
        style={
          styles.completionWrapper
        }
      >
        <View
          style={
            styles.completionCard
          }
        >
          <View
            style={
              styles.completionTop
            }
          >
            <View
              style={
                styles.completionIcon
              }
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={PRIMARY}
              />
            </View>

            <View
              style={
                styles.completionInfo
              }
            >
              <Text
                style={
                  styles.completionTitle
                }
              >
                Complete your profile
              </Text>

              <Text
                style={
                  styles.completionSubtitle
                }
              >
                Build a stronger
                Richfield profile.
              </Text>
            </View>

            <Text
              style={
                styles.completionPercentage
              }
            >
              {
                profileCompletion.percentage
              }
              %
            </Text>
          </View>

          <View
            style={
              styles.progressBackground
            }
          >
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    `${profileCompletion.percentage}%`,
                },
              ]}
            />
          </View>

          <Text
            style={
              styles.missingTitle
            }
          >
            {missing.length}{" "}
            {missing.length === 1
              ? "thing"
              : "things"}{" "}
            left
          </Text>

          <Text
            style={
              styles.missingText
            }
            numberOfLines={2}
          >
            Add{" "}
            {missing
              .slice(0, 3)
              .join(", ")}
            {missing.length > 3
              ? ` +${
                  missing.length -
                  3
                } more`
              : ""}
          </Text>

          <Pressable
            style={
              styles.completeProfileButton
            }
            onPress={
              openProfileCompletion
            }
          >
            <Text
              style={
                styles.completeProfileButtonText
              }
            >
              Complete profile
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color="#fff"
            />
          </Pressable>
        </View>
      </View>
    );
  }

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

  const title =
    mode === "student"
      ? "For you"
      : mode === "alumni"
      ? "Alumni feed"
      : mode === "business"
      ? "Talent"
      : "Content moderation";

  const subtitle =
    mode === "student"
      ? "Posts selected for your Richfield community"
      : mode === "alumni"
      ? "Professional updates and your Richfield network"
      : mode === "business"
      ? "Discover student and alumni talent"
      : "Review posts across Richfield Connect";

  const variant =
    mode === "business"
      ? "talent"
      : mode === "admin"
      ? "admin"
      : "social";

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View
        style={styles.header}
      >
        <View
          style={{ flex: 1 }}
        >
          <Text
            style={styles.title}
          >
            {title}
          </Text>

          <Text
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        </View>

        {mode === "student" ||
        mode === "alumni" ? (
          <Pressable
            style={
              styles.createButton
            }
            onPress={() =>
              router.push(
                "/(student)/create-post"
              )
            }
          >
            <Ionicons
              name="add"
              size={22}
              color="#fff"
            />
          </Pressable>
        ) : null}
      </View>

      {(isTalent ||
        isAdmin) && (
        <>
          <View
            style={styles.search}
          >
            <Ionicons
              name="search-outline"
              size={19}
              color="#777"
            />

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder={
                isTalent
                  ? "Search people, skills or posts"
                  : "Search posts or members"
              }
              placeholderTextColor="#999"
              style={
                styles.searchInput
              }
            />

            {search.length >
            0 ? (
              <Pressable
                onPress={() =>
                  setSearch("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color="#999"
                />
              </Pressable>
            ) : null}
          </View>

          <View
            style={styles.filters}
          >
            <FilterButton
              label="All"
              active={
                personFilter ===
                "all"
              }
              onPress={() =>
                setPersonFilter(
                  "all"
                )
              }
            />

            <FilterButton
              label="Students"
              active={
                personFilter ===
                "students"
              }
              onPress={() =>
                setPersonFilter(
                  "students"
                )
              }
            />

            <FilterButton
              label="Alumni"
              active={
                personFilter ===
                "alumni"
              }
              onPress={() =>
                setPersonFilter(
                  "alumni"
                )
              }
            />
          </View>
        </>
      )}

      <FlatList
        data={visiblePosts}
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
            onRefresh={refresh}
            tintColor={PRIMARY}
          />
        }
        contentContainerStyle={
          visiblePosts.length
            ? styles.list
            : styles.emptyList
        }
        ListHeaderComponent={
          renderCompletionCard
        }
        ListEmptyComponent={
          <View
            style={styles.empty}
          >
            <Ionicons
              name="newspaper-outline"
              size={36}
              color="#999"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              Nothing to show yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Posts you are allowed
              to see will appear
              here.
            </Text>
          </View>
        }
        renderItem={({
          item,
        }) => (
          <FeedPostCard
            post={item}
            variant={variant}
            onProfilePress={() =>
              openProfile(item)
            }
            onLikePress={
              (isSocial ||
                isAdmin) &&
              !likeLoading.includes(
                item.id
              )
                ? () =>
                    toggleLike(
                      item
                    )
                : undefined
            }
            onCommentPress={
              isSocial ||
              isAdmin
                ? () =>
                    openPost(
                      item
                    )
                : undefined
            }
            onSharePress={
              isSocial ||
              isAdmin
                ? () =>
                    sharePost(
                      item
                    )
                : undefined
            }
            onMessagePress={
              isTalent
                ? () =>
                    openMessage(
                      item
                    )
                : undefined
            }
            messageLoading={
              messageLoadingId ===
              item.user_id
            }
            onDeletePress={
              isAdmin
                ? () =>
                    removePost(
                      item
                    )
                : undefined
            }
            deleteLoading={
              deleteLoadingId ===
              item.id
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterButton,
        active &&
          styles.filterButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F5F5F7",
    },

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#fff",
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 13,
      backgroundColor: "#fff",
      borderBottomWidth: 1,
      borderBottomColor:
        "#ECECEE",
    },

    title: {
      color: "#111",
      fontSize: 25,
      fontWeight: "800",
      letterSpacing: -0.4,
    },

    subtitle: {
      marginTop: 3,
      color: "#777",
      fontSize: 12,
    },

    createButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: PRIMARY,
    },

    completionWrapper: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },

    completionCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor:
        "#F8F8FF",
      borderWidth: 1,
      borderColor: "#E2E2FF",
    },

    completionTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    completionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    completionInfo: {
      flex: 1,
    },

    completionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: "#161616",
    },

    completionSubtitle: {
      marginTop: 2,
      fontSize: 11,
      color: "#777",
    },

    completionPercentage: {
      marginLeft: 10,
      fontSize: 17,
      fontWeight: "900",
      color: PRIMARY,
    },

    progressBackground: {
      height: 7,
      marginTop: 15,
      borderRadius: 20,
      backgroundColor:
        "#E1E1EC",
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      borderRadius: 20,
      backgroundColor: PRIMARY,
    },

    missingTitle: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "800",
      color: "#333",
    },

    missingText: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color: "#777",
    },

    completeProfileButton: {
      alignSelf:
        "flex-start",
      marginTop: 13,
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 6,
    },

    completeProfileButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },

    search: {
      minHeight: 44,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: "#E1E1E5",
      borderRadius: 10,
      backgroundColor: "#fff",
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    searchInput: {
      flex: 1,
      color: "#111",
      fontSize: 14,
    },

    filters: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    filterButton: {
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: "#DDDEE2",
      borderRadius: 8,
      backgroundColor: "#fff",
    },

    filterButtonActive: {
      borderColor: "#171717",
      backgroundColor: "#171717",
    },

    filterText: {
      color: "#555",
      fontSize: 12,
      fontWeight: "700",
    },

    filterTextActive: {
      color: "#fff",
    },

    list: {
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,
      paddingBottom: 30,
    },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
      paddingBottom: 80,
      paddingTop: 50,
    },

    emptyTitle: {
      marginTop: 12,
      color: "#222",
      fontSize: 16,
      fontWeight: "800",
    },

    emptyText: {
      marginTop: 6,
      maxWidth: 280,
      color: "#777",
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
    },
  });