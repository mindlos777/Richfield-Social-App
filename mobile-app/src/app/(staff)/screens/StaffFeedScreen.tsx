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
import {
  router,
  useFocusEffect,
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

import FeedPostCard, {
  FeedPostItem,
  UserRole,
} from "../../../components/feed/FeedPostCard";

const PRIMARY = "#0300cf";

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  headline: string | null;
  status?: string | null;
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

type StaffFeedPost = FeedPostItem & {
  rankingScore: number;
};

export default function StaffFeedScreen() {
  const {
    user,
    profile: authProfile,
    isStaffVerified,
  } = useAuth();

  const [
    profile,
    setProfile,
  ] = useState<ProfileRow | null>(null);

  const [
    posts,
    setPosts,
  ] = useState<StaffFeedPost[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    personFilter,
    setPersonFilter,
  ] = useState<
    "all" | "students" | "alumni" | "staff"
  >("all");

  const [
    likeLoading,
    setLikeLoading,
  ] = useState<string[]>([]);

  const [
    messageLoadingId,
    setMessageLoadingId,
  ] = useState<string | null>(null);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  /*
   * ========================================================
   * LOAD FEED
   * ========================================================
   */

  const loadFeed = useCallback(
    async (
      showLoader = true
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        if (!user) {
          setPosts([]);
          return;
        }

        /*
         * LOAD STAFF PROFILE
         */

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

        if (
          me.role !== "staff"
        ) {
          throw new Error(
            "This account is not a Staff account."
          );
        }

        setProfile(
          me as ProfileRow
        );

        /*
         * LOAD POSTS
         */

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
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(120);

        if (postsError) {
          throw postsError;
        }

        const rawPosts =
          (postRows || []) as RawPost[];

        if (
          rawPosts.length === 0
        ) {
          setPosts([]);
          return;
        }

        const authorIds = [
          ...new Set(
            rawPosts.map(
              post =>
                post.user_id
            )
          ),
        ];

        const postIds =
          rawPosts.map(
            post =>
              post.id
          );

        /*
         * LOAD RELATED DATA
         */

        const [
          profilesResult,
          likesResult,
          commentsResult,
          sharesResult,
        ] = await Promise.all([
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
            .in(
              "id",
              authorIds
            ),

          supabase
            .from("post_likes")
            .select(`
              post_id,
              user_id
            `)
            .in(
              "post_id",
              postIds
            ),

          supabase
            .from("post_comments")
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
        ]);

        if (
          profilesResult.error
        ) {
          throw profilesResult.error;
        }

        if (
          likesResult.error
        ) {
          throw likesResult.error;
        }

        if (
          commentsResult.error
        ) {
          throw commentsResult.error;
        }

        if (
          sharesResult.error
        ) {
          throw sharesResult.error;
        }

        const profileMap =
          new Map<
            string,
            ProfileRow
          >();

        (
          profilesResult.data ||
          []
        ).forEach(
          (
            item: ProfileRow
          ) => {
            profileMap.set(
              item.id,
              item
            );
          }
        );

        const likes =
          likesResult.data || [];

        const comments =
          commentsResult.data ||
          [];

        const shares =
          sharesResult.data || [];

        const now =
          Date.now();

        const merged:
          StaffFeedPost[] =
          rawPosts
            .map(post => {
              const author =
                profileMap.get(
                  post.user_id
                );

              /*
               * Hide users that do not
               * have an active profile.
               */

              if (
                !author ||
                author.status !==
                  "active"
              ) {
                return null;
              }

              const postLikes =
                likes.filter(
                  item =>
                    item.post_id ===
                    post.id
                );

              const likeCount =
                postLikes.length;

              const commentCount =
                comments.filter(
                  item =>
                    item.post_id ===
                    post.id
                ).length;

              const shareCount =
                shares.filter(
                  item =>
                    item.post_id ===
                    post.id
                ).length;

              const liked =
                postLikes.some(
                  item =>
                    item.user_id ===
                    user.id
                );

              const ageHours =
                Math.max(
                  0,
                  (
                    now -
                    new Date(
                      post.created_at
                    ).getTime()
                  ) /
                    3600000
                );

              /*
               * Staff feed ranking:
               *
               * recent posts first,
               * then engagement.
               */

              let rankingScore =
                Math.max(
                  0,
                  72 - ageHours
                );

              rankingScore +=
                likeCount * 2;

              rankingScore +=
                commentCount * 4;

              rankingScore +=
                shareCount * 5;

              if (
                String(author.role) ===
                "staff"
              ) {
                rankingScore += 5;
              }

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
                  author.full_name ||
                  "Richfield Member",

                username:
                  author.username ||
                  null,

                avatar_url:
                  author.avatar_url ||
                  null,

                role:
                  author.role ||
                  null,

                headline:
                  author.headline ||
                  null,

                programme: null,

                campus: null,

                skills: [],

                likes:
                  likeCount,

                comments:
                  commentCount,

                shares:
                  shareCount,

                liked,

                rankingScore,
              } as StaffFeedPost;
            })
            .filter(
              Boolean
            ) as StaffFeedPost[];

        merged.sort(
          (a, b) =>
            b.rankingScore -
            a.rankingScore
        );

        setPosts(
          merged
        );
      } catch (
        error: any
      ) {
        console.log(
          "Staff feed error:",
          error
        );

        Alert.alert(
          "Staff Feed",
          error?.message ||
            "Could not load the community feed."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  /*
   * ========================================================
   * NOTIFICATION COUNT
   * ========================================================
   */

  const loadUnreadCount =
    useCallback(
      async () => {
        if (!user) {
          setUnreadCount(0);
          return;
        }

        const {
          count,
          error,
        } = await supabase
          .from(
            "notifications"
          )
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "user_id",
            user.id
          )
          .is(
            "read_at",
            null
          );

        if (error) {
          console.log(
            "Notification count:",
            error
          );

          return;
        }

        setUnreadCount(
          count || 0
        );
      },
      [user]
    );

  /*
   * ========================================================
   * INITIAL LOAD
   * ========================================================
   */

  useFocusEffect(
    useCallback(() => {
      loadFeed(true);
      loadUnreadCount();
    }, [
      loadFeed,
      loadUnreadCount,
    ])
  );

  /*
   * ========================================================
   * REALTIME
   * ========================================================
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    const feedChannel =
      supabase
        .channel(
          `staff-feed-${user.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "posts",
          },
          () => {
            loadFeed(false);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "post_likes",
          },
          () => {
            loadFeed(false);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "post_comments",
          },
          () => {
            loadFeed(false);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "post_shares",
          },
          () => {
            loadFeed(false);
          }
        )
        .subscribe();

    const notificationChannel =
      supabase
        .channel(
          `staff-feed-notifications-${user.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "notifications",

            filter:
              `user_id=eq.${user.id}`,
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        feedChannel
      );

      supabase.removeChannel(
        notificationChannel
      );
    };
  }, [
    user,
    loadFeed,
    loadUnreadCount,
  ]);

  /*
   * ========================================================
   * FILTER POSTS
   * ========================================================
   */

  const visiblePosts =
    useMemo(() => {
      let list = [
        ...posts,
      ];

      if (
        personFilter ===
        "students"
      ) {
        list =
          list.filter(
            post =>
              post.role ===
              "student"
          );
      }

      if (
        personFilter ===
        "alumni"
      ) {
        list =
          list.filter(
            post =>
              post.role ===
              "alumni"
          );
      }

      if (
        personFilter ===
        "staff"
      ) {
        list =
          list.filter(
            post =>
              String(post.role) ===
              "staff"
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
            ${post.content || ""}
            ${post.role || ""}
          `.toLowerCase();

          return searchable.includes(
            value
          );
        }
      );
    }, [
      posts,
      search,
      personFilter,
    ]);

  /*
   * ========================================================
   * LIKE
   * ========================================================
   */

  async function toggleLike(
    post: StaffFeedPost
  ) {
    if (
      !user ||
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

    /*
     * Optimistic update
     */

    setPosts(
      current =>
        current.map(
          item =>
            item.id ===
            post.id
              ? {
                  ...item,

                  liked:
                    nextLiked,

                  likes:
                    nextLiked
                      ? item.likes +
                        1
                      : Math.max(
                          0,
                          item.likes -
                            1
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
          .from(
            "post_likes"
          )
          .delete()
          .eq(
            "post_id",
            post.id
          )
          .eq(
            "user_id",
            user.id
          );

        if (error) {
          throw error;
        }
      } else {
        const {
          error,
        } = await supabase
          .from(
            "post_likes"
          )
          .insert({
            post_id:
              post.id,

            user_id:
              user.id,
          });

        if (
          error &&
          error.code !==
            "23505"
        ) {
          throw error;
        }
      }
    } catch (error) {
      console.log(
        "Staff like error:",
        error
      );

      await loadFeed(
        false
      );
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

  /*
   * ========================================================
   * SHARE
   * ========================================================
   */

  async function sharePost(
    post: StaffFeedPost
  ) {
    if (!user) {
      return;
    }

    try {
      await Share.share({
        message:
          post.content
            ? `${post.full_name}: ${post.content}`
            : `View this post from ${post.full_name} on Richfield Social.`,
      });

      const {
        error,
      } = await supabase
        .from(
          "post_shares"
        )
        .insert({
          post_id:
            post.id,

          user_id:
            user.id,
        });

      if (
        error &&
        error.code !==
          "23505"
      ) {
        throw error;
      }
    } catch (error) {
      console.log(
        "Staff share error:",
        error
      );
    }
  }

  /*
   * ========================================================
   * PROFILE
   * ========================================================
   */

  function openProfile(
    post: StaffFeedPost
  ) {
    if (
      post.user_id ===
      user?.id
    ) {
      router.push(
        "/(staff)/(tabs)/profile"
      );

      return;
    }

    router.push({
      pathname:
        "/member-profile",

      params: {
        id:
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
  }

  /*
   * ========================================================
   * POST
   * ========================================================
   */

  function openPost(
    post: StaffFeedPost
  ) {
    router.push({
      pathname:
        "/post/[id]" as never,

      params: {
        id: post.id,
      },
    });
  }

  /*
   * ========================================================
   * STAFF DIRECT MESSAGE
   * ========================================================
   */

  async function openMessage(
    post: StaffFeedPost
  ) {
    if (
      post.user_id ===
      user?.id
    ) {
      return;
    }

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
          id:
            String(data),

          conversationId:
            String(data),

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
    } catch (
      error: any
    ) {
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

  /*
   * ========================================================
   * STAFF TOOLS
   * ========================================================
   */

  function openNotifications() {
    router.push(
      "/(staff)/notifications"
    );
  }

  function openAnnouncements() {
    router.push(
      "/(staff)/announcements"
    );
  }

  function openEvents() {
    router.push(
      "/(staff)/events"
    );
  }

  function openAnalytics() {
    router.push(
      "/(staff)/analytics"
    );
  }

  /*
   * ========================================================
   * REFRESH
   * ========================================================
   */

  async function refresh() {
    setRefreshing(
      true
    );

    await Promise.all([
      loadFeed(false),
      loadUnreadCount(),
    ]);

    setRefreshing(
      false
    );
  }

  /*
   * ========================================================
   * LOADING
   * ========================================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loading
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
          Loading Staff feed...
        </Text>
      </SafeAreaView>
    );
  }

  /*
   * ========================================================
   * SCREEN
   * ========================================================
   */

  return (
    <SafeAreaView
      style={
        styles.screen
      }
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <FlatList
        data={
          visiblePosts
        }
        keyExtractor={
          item =>
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
            tintColor={
              PRIMARY
            }
            colors={[
              PRIMARY,
            ]}
          />
        }
        contentContainerStyle={
          visiblePosts.length
            ? styles.list
            : styles.emptyList
        }

        /*
         * ==================================================
         * HEADER
         * ==================================================
         */

        ListHeaderComponent={
          <View>
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
                    styles.brand
                  }
                >
                  RICHFIELD SOCIAL
                </Text>

                <Text
                  style={
                    styles.title
                  }
                >
                  Staff Feed
                </Text>

                <Text
                  style={
                    styles.subtitle
                  }
                >
                  Welcome{" "}
                  {authProfile
                    ?.full_name
                    ?.trim()
                    .split(
                      /\s+/
                    )[0] ||
                    "Staff"}
                </Text>
              </View>

              <Pressable
                style={
                  styles.notificationButton
                }
                onPress={
                  openNotifications
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color="#111"
                />

                {unreadCount >
                  0 && (
                  <View
                    style={
                      styles.notificationBadge
                    }
                  >
                    <Text
                      style={
                        styles.notificationBadgeText
                      }
                    >
                      {unreadCount >
                      9
                        ? "9+"
                        : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* VERIFIED STAFF */}

            <View
              style={
                styles.staffCard
              }
            >
              <View
                style={
                  styles.staffIcon
                }
              >
                <Ionicons
                  name="school-outline"
                  size={24}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <View
                  style={
                    styles.staffNameRow
                  }
                >
                  <Text
                    style={
                      styles.staffTitle
                    }
                  >
                    Richfield Staff
                  </Text>

                  {isStaffVerified && (
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={
                        PRIMARY
                      }
                    />
                  )}
                </View>

                <Text
                  style={
                    styles.staffDescription
                  }
                >
                  Connect with
                  students, alumni and
                  other Richfield staff.
                </Text>
              </View>
            </View>

            {/* STAFF TOOLS */}

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
                Staff tools
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Manage your campus
                community
              </Text>
            </View>

            <View
              style={
                styles.toolGrid
              }
            >
              <StaffTool
                icon="megaphone-outline"
                title="Announcements"
                text="Create and manage announcements"
                onPress={
                  openAnnouncements
                }
              />

              <StaffTool
                icon="calendar-outline"
                title="Events"
                text="Create and manage campus events"
                onPress={
                  openEvents
                }
              />

              <StaffTool
                icon="stats-chart-outline"
                title="Analytics"
                text="View activity and engagement"
                onPress={
                  openAnalytics
                }
              />

              <StaffTool
                icon="notifications-outline"
                title="Notifications"
                text={
                  unreadCount
                    ? `${unreadCount} unread notification${
                        unreadCount ===
                        1
                          ? ""
                          : "s"
                      }`
                    : "You're all caught up"
                }
                onPress={
                  openNotifications
                }
              />
            </View>

            {/* COMMUNITY */}

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
                Community feed
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Updates from the
                Richfield community
              </Text>
            </View>

            {/* SEARCH */}

            <View
              style={
                styles.search
              }
            >
              <Ionicons
                name="search-outline"
                size={19}
                color="#777"
              />

              <TextInput
                value={
                  search
                }
                onChangeText={
                  setSearch
                }
                placeholder="Search posts or members"
                placeholderTextColor="#999"
                style={
                  styles.searchInput
                }
              />

              {search.length >
                0 && (
                <Pressable
                  onPress={() =>
                    setSearch(
                      ""
                    )
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color="#999"
                  />
                </Pressable>
              )}
            </View>

            {/* FILTERS */}

            <View
              style={
                styles.filters
              }
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

              <FilterButton
                label="Staff"
                active={
                  personFilter ===
                  "staff"
                }
                onPress={() =>
                  setPersonFilter(
                    "staff"
                  )
                }
              />
            </View>
          </View>
        }

        /*
         * ==================================================
         * POSTS
         * ==================================================
         */

        renderItem={({
          item,
        }) => (
          <FeedPostCard
            post={
              item
            }
            variant="social"

            onProfilePress={() =>
              openProfile(
                item
              )
            }

            onLikePress={
              !likeLoading.includes(
                item.id
              )
                ? () =>
                    toggleLike(
                      item
                    )
                : undefined
            }

            onCommentPress={() =>
              openPost(
                item
              )
            }

            onSharePress={() =>
              sharePost(
                item
              )
            }

            onMessagePress={
              item.user_id !==
              user?.id
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
          />
        )}

        /*
         * ==================================================
         * EMPTY
         * ==================================================
         */

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
                name="newspaper-outline"
                size={34}
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
              No posts found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Community posts
              matching your filters
              will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/*
 * ==========================================================
 * STAFF TOOL
 * ==========================================================
 */

function StaffTool({
  icon,
  title,
  text,
  onPress,
}: {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];

  title: string;

  text: string;

  onPress:
    () => void;
}) {
  return (
    <Pressable
      style={({
        pressed,
      }) => [
        styles.toolCard,

        pressed &&
          styles.pressed,
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.toolIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={22}
          color={
            PRIMARY
          }
        />
      </View>

      <Text
        style={
          styles.toolTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.toolText
        }
        numberOfLines={
          2
        }
      >
        {text}
      </Text>
    </Pressable>
  );
}

/*
 * ==========================================================
 * FILTER BUTTON
 * ==========================================================
 */

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;

  active: boolean;

  onPress:
    () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterButton,

        active &&
          styles.filterButtonActive,
      ]}
      onPress={
        onPress
      }
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

/*
 * ==========================================================
 * STYLES
 * ==========================================================
 */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F5F5F7",
    },

    loading: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: "#777",
    },

    list: {
      paddingBottom: 100,
    },

    emptyList: {
      flexGrow: 1,
      paddingBottom: 100,
    },

    /*
     * HEADER
     */

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 17,
      backgroundColor:
        "#FFFFFF",
    },

    brand: {
      color: PRIMARY,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.1,
    },

    title: {
      marginTop: 3,
      color: "#111",
      fontSize: 27,
      fontWeight: "800",
      letterSpacing: -0.5,
    },

    subtitle: {
      marginTop: 3,
      color: "#777",
      fontSize: 12,
    },

    notificationButton: {
      width: 43,
      height: 43,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F4F4F6",
      position:
        "relative",
    },

    notificationBadge: {
      position:
        "absolute",
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#E53935",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 8,
      fontWeight: "800",
    },

    /*
     * STAFF CARD
     */

    staffCard: {
      marginHorizontal: 18,
      marginTop: 3,
      padding: 15,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderRadius: 16,
      backgroundColor:
        "#F0F0FF",
      borderWidth: 1,
      borderColor:
        "#DDDDFB",
    },

    staffIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      marginRight: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        PRIMARY,
    },

    staffNameRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
    },

    staffTitle: {
      color: "#111",
      fontSize: 15,
      fontWeight: "800",
    },

    staffDescription: {
      marginTop: 3,
      color: "#666",
      fontSize: 11,
      lineHeight: 16,
    },

    /*
     * SECTION
     */

    sectionHeader: {
      marginTop: 24,
      paddingHorizontal: 18,
    },

    sectionTitle: {
      color: "#111",
      fontSize: 18,
      fontWeight: "800",
    },

    sectionSubtitle: {
      marginTop: 3,
      color: "#888",
      fontSize: 11,
    },

    /*
     * TOOLS
     */

    toolGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 10,
      paddingHorizontal: 18,
      marginTop: 12,
    },

    toolCard: {
      width: "48%",
      minHeight: 128,
      padding: 14,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        "#E6E6E9",
      backgroundColor:
        "#FFFFFF",
    },

    pressed: {
      opacity: 0.65,
    },

    toolIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
    },

    toolTitle: {
      marginTop: 10,
      color: "#222",
      fontSize: 13,
      fontWeight: "800",
    },

    toolText: {
      marginTop: 4,
      color: "#777",
      fontSize: 10,
      lineHeight: 15,
    },

    /*
     * SEARCH
     */

    search: {
      minHeight: 44,
      marginHorizontal: 18,
      marginTop: 14,
      paddingHorizontal: 13,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      borderWidth: 1,
      borderColor:
        "#E1E1E5",
      borderRadius: 11,
      backgroundColor:
        "#FFFFFF",
    },

    searchInput: {
      flex: 1,
      color: "#111",
      fontSize: 13,
    },

    /*
     * FILTERS
     */

    filters: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 7,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },

    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor:
        "#DDDEE2",
      borderRadius: 9,
      backgroundColor:
        "#FFFFFF",
    },

    filterButtonActive: {
      borderColor:
        "#171717",
      backgroundColor:
        "#171717",
    },

    filterText: {
      color: "#555",
      fontSize: 11,
      fontWeight: "700",
    },

    filterTextActive: {
      color: "#FFFFFF",
    },

    /*
     * EMPTY
     */

    empty: {
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
      paddingVertical: 70,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
    },

    emptyTitle: {
      marginTop: 14,
      color: "#222",
      fontSize: 16,
      fontWeight: "800",
    },

    emptyText: {
      marginTop: 6,
      maxWidth: 270,
      color: "#777",
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        "center",
    },
  });