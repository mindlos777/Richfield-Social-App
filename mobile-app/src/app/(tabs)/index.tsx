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
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  supabase,
} from "../../lib/supabase";

const PRIMARY = "#0300cf";

const COLORS = {
  background: "#F5F7F9",
  white: "#FFFFFF",
  textPrimary: "#111111",
  textSecondary: "#626C76",
  textMuted: "#939BA3",
  border: "#E4E8EC",
  brand: PRIMARY,
  brandLight: "#EEEEFF",
  success: "#287A52",
  successLight: "#EAF6EF",
};

type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

type HomeProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  headline: string | null;
  role: UserRole | null;
  avatar_url: string | null;
  bio: string | null;

  linkedin_url?: string | null;
  github_url?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
};

type SuggestedConnection = {
  id: string;
  full_name: string | null;
  username: string | null;
  headline: string | null;
  role: UserRole | null;
  avatar_url: string | null;
  bio: string | null;
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

type FeedPost = RawPost & {
  author: HomeProfile | null;

  likeCount: number;
  commentCount: number;
  shareCount: number;

  liked: boolean;

  rankingScore: number;
};

type Opportunity = {
  id: string;
  business_id: string;

  title: string;
  description: string;

  opportunity_type: string;

  location: string | null;
  work_mode: string | null;

  required_skills: string[];
  programme_keywords: string[];

  application_url: string | null;
  closing_date: string | null;

  status: string;
  created_at: string;

  company_name: string;
};

type EventItem = {
  id: string;
  created_by: string;

  title: string;
  description: string | null;

  event_type: string | null;

  location: string | null;

  starts_at: string;
  ends_at: string | null;

  registration_url: string | null;

  relevant_programmes: string[];
  relevant_roles: string[];

  image_url: string | null;

  status: string;

  created_at: string;
};

function getInitials(
  name: string | null
) {
  if (!name) {
    return "U";
  }

  const pieces =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (pieces.length === 0) {
    return "U";
  }

  if (pieces.length === 1) {
    return pieces[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    pieces[0]
      .charAt(0)
      .toUpperCase() +
    pieces[
      pieces.length - 1
    ]
      .charAt(0)
      .toUpperCase()
  );
}

function getRoleLabel(
  role: UserRole | null
) {
  switch (role) {
    case "student":
      return "Student";

    case "alumni":
      return "Alumni";

    case "business":
      return "Business";

    case "admin":
      return "Richfield";

    default:
      return "Member";
  }
}

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatRelativeTime(
  value: string
) {
  const created =
    new Date(value);

  const seconds =
    Math.floor(
      (Date.now() -
        created.getTime()) /
        1000
    );

  if (seconds < 60) {
    return "now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days}d`;
  }

  return created.toLocaleDateString(
    "en-ZA",
    {
      day: "numeric",
      month: "short",
    }
  );
}

function formatOpportunityType(
  value: string
) {
  switch (value) {
    case "internship":
      return "Internship";

    case "learnership":
      return "Learnership";

    case "part_time":
      return "Part-time";

    case "graduate":
      return "Graduate Programme";

    case "job":
      return "Job";

    default:
      return value;
  }
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "No closing date";
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

function getEventMonth(
  startsAt: string
) {
  return new Date(
    startsAt
  )
    .toLocaleDateString(
      "en-ZA",
      {
        month: "short",
      }
    )
    .toUpperCase();
}

function getEventDay(
  startsAt: string
) {
  return new Date(
    startsAt
  ).getDate();
}

function getEventTime(
  startsAt: string
) {
  return new Date(
    startsAt
  ).toLocaleTimeString(
    "en-ZA",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   HOME
   ========================================================= */

export default function HomeScreen() {
  const [
    profile,
    setProfile,
  ] =
    useState<HomeProfile | null>(
      null
    );

  const [
    posts,
    setPosts,
  ] =
    useState<FeedPost[]>([]);

  const [
    opportunities,
    setOpportunities,
  ] =
    useState<Opportunity[]>([]);

  const [
    events,
    setEvents,
  ] =
    useState<EventItem[]>([]);

  const [
    suggestions,
    setSuggestions,
  ] =
    useState<
      SuggestedConnection[]
    >([]);

  const [
    following,
    setFollowing,
  ] =
    useState<string[]>([]);

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
    followLoading,
    setFollowLoading,
  ] =
    useState<string[]>([]);

  const [
    likeLoading,
    setLikeLoading,
  ] =
    useState<string[]>([]);

  /* =========================================================
     PROFILE
     ========================================================= */

  const loadProfile =
    useCallback(
      async (
        userId: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select(
              `
              id,
              full_name,
              username,
              headline,
              role,
              avatar_url,
              bio,
              linkedin_url,
              github_url,
              instagram_url,
              website_url
              `
            )
            .eq(
              "id",
              userId
            )
            .single();

        if (error) {
          throw error;
        }

        const result =
          data as HomeProfile;

        setProfile(
          result
        );

        return result;
      },
      []
    );

  /* =========================================================
     FOLLOWING
     ========================================================= */

  const loadFollowing =
    useCallback(
      async (
        userId: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "follows"
            )
            .select(
              "following_id"
            )
            .eq(
              "follower_id",
              userId
            );

        if (error) {
          throw error;
        }

        const ids =
          (
            data || []
          ).map(
            item =>
              item.following_id
          );

        setFollowing(
          ids
        );

        return ids;
      },
      []
    );

  /* =========================================================
     PEOPLE
     ========================================================= */

  const loadSuggestions =
    useCallback(
      async (
        userId: string,
        followedIds:
          string[]
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select(
              `
              id,
              full_name,
              username,
              headline,
              role,
              avatar_url,
              bio
              `
            )
            .neq(
              "id",
              userId
            )
            .eq(
              "status",
              "active"
            )
            .in(
              "role",
              [
                "student",
                "alumni",
                "business",
              ]
            )
            .limit(30);

        if (error) {
          throw error;
        }

        const result =
          (
            data || []
          )
            .filter(
              item =>
                !followedIds.includes(
                  item.id
                )
            )
            .sort(
              () =>
                Math.random() -
                0.5
            )
            .slice(
              0,
              8
            ) as SuggestedConnection[];

        setSuggestions(
          result
        );
      },
      []
    );

  /* =========================================================
     FYP FEED
     ========================================================= */

  const loadFeed =
    useCallback(
      async (
        userId: string,
        followedIds:
          string[]
      ) => {
        const {
          data:
            postData,
          error:
            postError,
        } =
          await supabase
            .from(
              "posts"
            )
            .select(
              `
              id,
              user_id,
              content,
              image_url,
              media_type,
              visibility,
              created_at
              `
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(100);

        if (postError) {
          throw postError;
        }

        const rawPosts =
          (postData ||
            []) as RawPost[];

        if (
          rawPosts.length ===
          0
        ) {
          setPosts([]);
          return;
        }

        const authorIds =
          [
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

        const [
          profilesResult,
          likesResult,
          commentsResult,
          sharesResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "profiles"
              )
              .select(
                `
                id,
                full_name,
                username,
                headline,
                role,
                avatar_url,
                bio
                `
              )
              .in(
                "id",
                authorIds
              ),

            supabase
              .from(
                "post_likes"
              )
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
              .select(
                "post_id"
              )
              .in(
                "post_id",
                postIds
              ),

            supabase
              .from(
                "post_shares"
              )
              .select(
                "post_id"
              )
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

        const authorMap =
          new Map<
            string,
            HomeProfile
          >();

        (
          profilesResult.data ||
          []
        ).forEach(
          item => {
            authorMap.set(
              item.id,
              item as HomeProfile
            );
          }
        );

        const likes =
          likesResult.data ||
          [];

        const comments =
          commentsResult.data ||
          [];

        const shares =
          sharesResult.data ||
          [];

        const currentTime =
          Date.now();

        const feed =
          rawPosts.map(
            post => {
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
                    userId
                );

              const ageHours =
                Math.max(
                  0,
                  (
                    currentTime -
                    new Date(
                      post.created_at
                    ).getTime()
                  ) /
                    3600000
                );

              /*
               * Simple FYP ranking.
               *
               * Following:
               * +50
               *
               * Like:
               * +2
               *
               * Comment:
               * +4
               *
               * Share:
               * +5
               *
               * Newer posts:
               * ranked higher
               */

              let rankingScore =
                0;

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
                userId
              ) {
                rankingScore +=
                  8;
              }

              rankingScore +=
                likeCount * 2;

              rankingScore +=
                commentCount *
                4;

              rankingScore +=
                shareCount * 5;

              rankingScore +=
                Math.max(
                  0,
                  48 -
                    ageHours
                );

              return {
                ...post,

                author:
                  authorMap.get(
                    post.user_id
                  ) || null,

                likeCount,

                commentCount,

                shareCount,

                liked,

                rankingScore,
              };
            }
          );

        feed.sort(
          (a, b) =>
            b.rankingScore -
            a.rankingScore
        );

        setPosts(
          feed
        );
      },
      []
    );

  /* =========================================================
     OPPORTUNITIES
     ========================================================= */

  const loadOpportunities =
    useCallback(
      async () => {
        const today =
          new Date()
            .toISOString()
            .slice(
              0,
              10
            );

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
              required_skills,
              programme_keywords,
              application_url,
              closing_date,
              status,
              created_at
              `
            )
            .eq(
              "status",
              "approved"
            )
            .or(
              `closing_date.is.null,closing_date.gte.${today}`
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(10);

        if (error) {
          throw error;
        }

        const rows =
          data || [];

        if (
          rows.length ===
          0
        ) {
          setOpportunities(
            []
          );

          return;
        }

        const businessIds =
          [
            ...new Set(
              rows.map(
                item =>
                  item.business_id
              )
            ),
          ];

        const {
          data:
            businesses,
        } =
          await supabase
            .from(
              "business_profiles"
            )
            .select(
              `
              user_id,
              organisation_name
              `
            )
            .in(
              "user_id",
              businessIds
            );

        const businessMap =
          new Map<
            string,
            string
          >();

        (
          businesses || []
        ).forEach(
          business => {
            businessMap.set(
              business.user_id,
              business.organisation_name ||
                "Business"
            );
          }
        );

        setOpportunities(
          rows.map(
            item => ({
              ...item,

              required_skills:
                item.required_skills ||
                [],

              programme_keywords:
                item.programme_keywords ||
                [],

              company_name:
                businessMap.get(
                  item.business_id
                ) ||
                "Richfield Partner",
            })
          ) as Opportunity[]
        );
      },
      []
    );

  /* =========================================================
     EVENTS
     ========================================================= */

  const loadEvents =
    useCallback(
      async (
        currentProfile?:
          HomeProfile | null
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "events"
            )
            .select(
              `
              id,
              created_by,
              title,
              description,
              event_type,
              location,
              starts_at,
              ends_at,
              registration_url,
              relevant_programmes,
              relevant_roles,
              image_url,
              status,
              created_at
              `
            )
            .eq(
              "status",
              "published"
            )
            .gte(
              "starts_at",
              new Date()
                .toISOString()
            )
            .order(
              "starts_at",
              {
                ascending:
                  true,
              }
            )
            .limit(12);

        if (error) {
          throw error;
        }

        let result =
          (
            data || []
          ) as EventItem[];

        if (
          currentProfile
            ?.role
        ) {
          result =
            result.filter(
              event => {
                const roles =
                  event.relevant_roles ||
                  [];

                return (
                  roles.length ===
                    0 ||
                  roles.includes(
                    currentProfile.role!
                  )
                );
              }
            );
        }

        setEvents(
          result
        );
      },
      []
    );

  /* =========================================================
     LOAD EVERYTHING
     ========================================================= */

  const loadHome =
    useCallback(
      async (
        showLoader =
          false
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
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
            userError
          ) {
            throw userError;
          }

          if (!user) {
            return;
          }

          const currentProfile =
            await loadProfile(
              user.id
            );

          const followedIds =
            await loadFollowing(
              user.id
            );

          await Promise.all([
            loadFeed(
              user.id,
              followedIds
            ),

            loadSuggestions(
              user.id,
              followedIds
            ),

            loadOpportunities(),

            loadEvents(
              currentProfile
            ),
          ]);
        } catch (
          error: any
        ) {
          console.log(
            "Home loading error:",
            error
          );

          Alert.alert(
            "Home",
            error?.message ||
              "Could not load your feed."
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
      [
        loadProfile,
        loadFollowing,
        loadFeed,
        loadSuggestions,
        loadOpportunities,
        loadEvents,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        loadHome(
          true
        );
      },
      [
        loadHome,
      ]
    )
  );

  /* =========================================================
     REALTIME
     ========================================================= */

  useEffect(() => {
    if (
      !profile?.id
    ) {
      return;
    }

    const userId =
      profile.id;

    const channel =
      supabase
        .channel(
          `home-realtime-${userId}`
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "posts",
          },
          () => {
            loadHome(
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
              "post_likes",
          },
          () => {
            loadHome(
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
              "post_comments",
          },
          () => {
            loadHome(
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
              "post_shares",
          },
          () => {
            loadHome(
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
              "follows",
          },
          () => {
            loadHome(
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
              "opportunities",
          },
          () => {
            loadHome(
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
              "events",
          },
          () => {
            loadHome(
              false
            );
          }
        )

        .subscribe(
          status => {
            console.log(
              "Home realtime:",
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
    profile?.id,
    loadHome,
  ]);

  /* =========================================================
     FOLLOW
     ========================================================= */

  async function toggleFollow(
    profileId: string
  ) {
    if (
      !profile?.id
    ) {
      return;
    }

    if (
      followLoading.includes(
        profileId
      )
    ) {
      return;
    }

    const isFollowing =
      following.includes(
        profileId
      );

    setFollowLoading(
      current => [
        ...current,
        profileId,
      ]
    );

    try {
      if (
        isFollowing
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "follows"
            )
            .delete()
            .eq(
              "follower_id",
              profile.id
            )
            .eq(
              "following_id",
              profileId
            );

        if (error) {
          throw error;
        }

        setFollowing(
          current =>
            current.filter(
              id =>
                id !==
                profileId
            )
        );
      } else {
        const {
          error,
        } =
          await supabase
            .from(
              "follows"
            )
            .insert({
              follower_id:
                profile.id,

              following_id:
                profileId,
            });

        if (
          error &&
          error.code !==
            "23505"
        ) {
          throw error;
        }

        setFollowing(
          current =>
            current.includes(
              profileId
            )
              ? current
              : [
                  ...current,
                  profileId,
                ]
        );

        setSuggestions(
          current =>
            current.filter(
              item =>
                item.id !==
                profileId
            )
        );
      }
    } catch (
      error: any
    ) {
      Alert.alert(
        "Connection",
        error?.message ||
          "Could not update this connection."
      );

      loadHome(
        false
      );
    } finally {
      setFollowLoading(
        current =>
          current.filter(
            id =>
              id !==
              profileId
          )
      );
    }
  }

  /* =========================================================
     LIKE
     ========================================================= */

  async function toggleLike(
    post: FeedPost
  ) {
    if (
      !profile?.id
    ) {
      return;
    }

    if (
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

                  likeCount:
                    nextLiked
                      ? item.likeCount +
                        1
                      : Math.max(
                          0,
                          item.likeCount -
                            1
                        ),
                }
              : item
        )
    );

    try {
      if (
        post.liked
      ) {
        const {
          error,
        } =
          await supabase
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
              profile.id
            );

        if (error) {
          throw error;
        }
      } else {
        const {
          error,
        } =
          await supabase
            .from(
              "post_likes"
            )
            .insert({
              post_id:
                post.id,

              user_id:
                profile.id,
            });

        if (
          error &&
          error.code !==
            "23505"
        ) {
          throw error;
        }
      }
    } catch (
      error: any
    ) {
      console.log(
        "Like error:",
        error
      );

      loadHome(
        false
      );
    } finally {
      setLikeLoading(
        current =>
          current.filter(
            id =>
              id !==
              post.id
          )
      );
    }
  }

  /* =========================================================
     SHARE
     ========================================================= */

  async function sharePost(
    post: FeedPost
  ) {
    if (
      !profile?.id
    ) {
      return;
    }

    try {
      const author =
        post.author
          ?.full_name ||
        "a Richfield member";

      await Share.share({
        message:
          post.content
            ? `${author}: ${post.content}`
            : `View this post from ${author} on Richfield Connect.`,
      });

      await supabase
        .from(
          "post_shares"
        )
        .insert({
          post_id:
            post.id,

          user_id:
            profile.id,
        });
    } catch (
      error
    ) {
      console.log(
        "Share error:",
        error
      );
    }
  }

  const handleRefresh =
    async () => {
      setRefreshing(
        true
      );

      await loadHome(
        false
      );
    };

  const recommendedOpportunity =
    useMemo(
      () =>
        opportunities[0] ||
        null,
      [
        opportunities,
      ]
    );

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingScreen
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
          Loading your feed...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        "bottom",
      ]}
    >
      <FlatList
        data={
          posts
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
              handleRefresh
            }
          />
        }
        contentContainerStyle={
          styles.listContent
        }
        ListHeaderComponent={
          <HomeHeader
            profile={
              profile
            }
            opportunity={
              recommendedOpportunity
            }
            events={
              events
            }
            suggestions={
              suggestions
            }
            following={
              following
            }
            followLoading={
              followLoading
            }
            onFollow={
              toggleFollow
            }
          />
        }
        renderItem={({
          item,
        }) => (
          <FeedPostCard
            post={
              item
            }
            likeLoading={likeLoading.includes(
              item.id
            )}
            onLike={() =>
              toggleLike(
                item
              )
            }
            onShare={() =>
              sharePost(
                item
              )
            }
          />
        )}
        ListEmptyComponent={
          <View
            style={
              styles.emptyFeed
            }
          >
            <Ionicons
              name="newspaper-outline"
              size={40}
              color="#AAA"
            />

            <Text
              style={
                styles.emptyFeedTitle
              }
            >
              Your feed is quiet
            </Text>

            <Text
              style={
                styles.emptyFeedText
              }
            >
              Follow people or create a
              post to get your FYP
              started.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View
            style={{
              height: 80,
            }}
          />
        }
      />
    </SafeAreaView>
  );
}

/* =========================================================
   HOME HEADER
   ========================================================= */

function HomeHeader({
  profile,
  opportunity,
  events,
  suggestions,
  following,
  followLoading,
  onFollow,
}: {
  profile: HomeProfile | null;

  opportunity:
    | Opportunity
    | null;

  events: EventItem[];

  suggestions:
    SuggestedConnection[];

  following: string[];

  followLoading: string[];

  onFollow: (
    userId: string
  ) => void;
}) {
  const firstName =
    profile?.full_name
      ?.trim()
      .split(/\s+/)[0] ||
    "there";

  return (
    <View>
      <View
        style={
          styles.welcomeSection
        }
      >
        <Text
          style={
            styles.greeting
          }
        >
          {getGreeting()},{" "}
          {firstName}
        </Text>

        <Text
          style={
            styles.welcomeTitle
          }
        >
          Build your professional
          future.
        </Text>

        <Text
          style={
            styles.welcomeDescription
          }
        >
          Connect, learn, share and
          discover opportunities across
          the Richfield community.
        </Text>
      </View>

      <QuickActions />

      {opportunity ? (
        <>
          <SectionHeader
            title="Recommended for you"
            action="View all"
            onPress={() =>
              router.push(
                "/opportunities"
              )
            }
          />

          <OpportunityCard
            opportunity={
              opportunity
            }
          />
        </>
      ) : null}

      {events.length >
      0 ? (
        <>
          <SectionHeader
            title="Upcoming events"
          />

          <EventsSection
            events={
              events
            }
          />
        </>
      ) : null}

      {suggestions.length >
      0 ? (
        <>
          <SectionHeader
            title="People you may know"
            action="View network"
            onPress={() =>
              router.push(
                "/network"
              )
            }
          />

          <SuggestedConnections
            suggestions={
              suggestions
            }
            following={
              following
            }
            followLoading={
              followLoading
            }
            onFollow={
              onFollow
            }
          />
        </>
      ) : null}

      <View
        style={
          styles.feedHeader
        }
      >
        <View>
          <Text
            style={
              styles.feedTitle
            }
          >
            For you
          </Text>

          <Text
            style={
              styles.feedSubtitle
            }
          >
            Posts selected from your
            Richfield community
          </Text>
        </View>
      </View>

      <CreatePostCard
        profile={
          profile
        }
      />
    </View>
  );
}

/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function QuickActions() {
  const actions = [
    {
      label:
        "Opportunities",
      icon:
        "briefcase-outline" as const,
      route:
        "/opportunities",
    },

    {
      label:
        "Network",
      icon:
        "people-outline" as const,
      route:
        "/network",
    },

    {
      label:
        "AI Assistant",
      icon:
        "sparkles-outline" as const,
      route:
        "../ai-assistant",
    },

    {
      label:
        "Portfolio",
      icon:
        "folder-open-outline" as const,
      route:
        "../(student)/portfolio",
    },
  ];

  return (
    <View
      style={
        styles.quickSection
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        Quick actions
      </Text>

      <View
        style={
          styles.quickGrid
        }
      >
        {actions.map(
          action => (
            <Pressable
              key={
                action.label
              }
              style={
                styles.quickItem
              }
              onPress={() =>
                router.push(
                  action.route as never
                )
              }
            >
              <View
                style={
                  styles.quickIcon
                }
              >
                <Ionicons
                  name={
                    action.icon
                  }
                  size={21}
                  color={
                    PRIMARY
                  }
                />
              </View>

              <Text
                style={
                  styles.quickLabel
                }
              >
                {
                  action.label
                }
              </Text>
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

/* =========================================================
   HEADINGS
   ========================================================= */

function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
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
        {title}
      </Text>

      {action &&
      onPress ? (
        <Pressable
          onPress={
            onPress
          }
        >
          <Text
            style={
              styles.sectionAction
            }
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* =========================================================
   OPPORTUNITY
   ========================================================= */

function OpportunityCard({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const companyInitials =
    getInitials(
      opportunity.company_name
    );

  return (
    <Pressable
      style={
        styles.opportunityCard
      }
      onPress={() =>
        router.push(
          "/opportunities"
        )
      }
    >
      <View
        style={
          styles.opportunityTop
        }
      >
        <View
          style={
            styles.companyLogo
          }
        >
          <Text
            style={
              styles.companyLogoText
            }
          >
            {
              companyInitials
            }
          </Text>
        </View>

        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={
              styles.opportunityTitle
            }
            numberOfLines={
              2
            }
          >
            {
              opportunity.title
            }
          </Text>

          <Text
            style={
              styles.companyName
            }
          >
            {
              opportunity.company_name
            }
          </Text>

          <View
            style={
              styles.metaRow
            }
          >
            <Ionicons
              name="location-outline"
              size={14}
              color={
                COLORS.textMuted
              }
            />

            <Text
              style={
                styles.metaText
              }
            >
              {opportunity.location ||
                "Location not specified"}
            </Text>
          </View>
        </View>
      </View>

      {opportunity
        .required_skills
        .length >
      0 ? (
        <View
          style={
            styles.skillRow
          }
        >
          {opportunity.required_skills
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
      ) : null}

      <View
        style={
          styles.opportunityBottom
        }
      >
        <View>
          <Text
            style={
              styles.opportunityType
            }
          >
            {formatOpportunityType(
              opportunity.opportunity_type
            )}
          </Text>

          <Text
            style={
              styles.closingText
            }
          >
            Closes{" "}
            {formatDate(
              opportunity.closing_date
            )}
          </Text>
        </View>

        <View
          style={
            styles.viewOpportunity
          }
        >
          <Text
            style={
              styles.viewOpportunityText
            }
          >
            View
          </Text>

          <Ionicons
            name="arrow-forward"
            size={15}
            color="#FFF"
          />
        </View>
      </View>
    </Pressable>
  );
}

/* =========================================================
   EVENTS
   No onPress intentionally.
   ========================================================= */

function EventsSection({
  events,
}: {
  events: EventItem[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.horizontalContent
      }
    >
      {events.map(
        event => (
          <View
            key={
              event.id
            }
            style={
              styles.eventCard
            }
          >
            {event.image_url ? (
              <Image
                source={{
                  uri:
                    event.image_url,
                }}
                style={
                  styles.eventImage
                }
              />
            ) : (
              <View
                style={
                  styles.eventImageFallback
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={30}
                  color={
                    PRIMARY
                  }
                />
              </View>
            )}

            <View
              style={
                styles.eventBody
              }
            >
              <View
                style={
                  styles.eventDate
                }
              >
                <Text
                  style={
                    styles.eventMonth
                  }
                >
                  {getEventMonth(
                    event.starts_at
                  )}
                </Text>

                <Text
                  style={
                    styles.eventDay
                  }
                >
                  {getEventDay(
                    event.starts_at
                  )}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.eventCategory
                  }
                >
                  {event.event_type ||
                    "Richfield Event"}
                </Text>

                <Text
                  style={
                    styles.eventTitle
                  }
                  numberOfLines={
                    2
                  }
                >
                  {
                    event.title
                  }
                </Text>

                <View
                  style={
                    styles.eventMeta
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={
                      COLORS.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.eventMetaText
                    }
                  >
                    {getEventTime(
                      event.starts_at
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.eventMeta
                  }
                >
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={
                      COLORS.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.eventMetaText
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {event.location ||
                      "Location TBA"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )
      )}
    </ScrollView>
  );
}

/* =========================================================
   PEOPLE
   ========================================================= */

function SuggestedConnections({
  suggestions,
  following,
  followLoading,
  onFollow,
}: {
  suggestions:
    SuggestedConnection[];

  following: string[];

  followLoading:
    string[];

  onFollow: (
    userId: string
  ) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.horizontalContent
      }
    >
      {suggestions.map(
        person => {
          const isFollowing =
            following.includes(
              person.id
            );

          const updating =
            followLoading.includes(
              person.id
            );

          return (
            <Pressable
              key={
                person.id
              }
              style={
                styles.personCard
              }
              onPress={() =>
                router.push({
                  pathname:
                    "/(tabs)/profile",

                  params: {
                    userId:
                      person.id,
                  },
                })
              }
            >
              {person.avatar_url ? (
                <Image
                  source={{
                    uri:
                      person.avatar_url,
                  }}
                  style={
                    styles.personAvatar
                  }
                />
              ) : (
                <View
                  style={
                    styles.personFallback
                  }
                >
                  <Text
                    style={
                      styles.personInitials
                    }
                  >
                    {getInitials(
                      person.full_name
                    )}
                  </Text>
                </View>
              )}

              <Text
                numberOfLines={
                  1
                }
                style={
                  styles.personName
                }
              >
                {person.full_name ||
                  "Richfield Member"}
              </Text>

              <Text
                numberOfLines={
                  1
                }
                style={
                  styles.personRole
                }
              >
                {person.headline ||
                  getRoleLabel(
                    person.role
                  )}
              </Text>

              <Pressable
                disabled={
                  updating
                }
                style={[
                  styles.followButton,

                  isFollowing &&
                    styles.followingButton,
                ]}
                onPress={
                  event => {
                    event.stopPropagation();

                    onFollow(
                      person.id
                    );
                  }
                }
              >
                {updating ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      PRIMARY
                    }
                  />
                ) : (
                  <Text
                    style={
                      styles.followButtonText
                    }
                  >
                    {isFollowing
                      ? "Following"
                      : "Follow"}
                  </Text>
                )}
              </Pressable>
            </Pressable>
          );
        }
      )}
    </ScrollView>
  );
}

/* =========================================================
   CREATE POST
   ========================================================= */

function CreatePostCard({
  profile,
}: {
  profile:
    HomeProfile | null;
}) {
  return (
    <Pressable
      style={
        styles.createPost
      }
      onPress={() =>
        router.push(
          "/(student)/create-post"
        )
      }
    >
      {profile?.avatar_url ? (
        <Image
          source={{
            uri:
              profile.avatar_url,
          }}
          style={
            styles.createAvatar
          }
        />
      ) : (
        <View
          style={
            styles.createFallback
          }
        >
          <Text
            style={
              styles.createFallbackText
            }
          >
            {getInitials(
              profile?.full_name ||
                null
            )}
          </Text>
        </View>
      )}

      <View
        style={
          styles.createInput
        }
      >
        <Text
          style={
            styles.createPlaceholder
          }
        >
          Share something with your
          community...
        </Text>
      </View>

      <Ionicons
        name="images-outline"
        size={21}
        color={
          PRIMARY
        }
      />
    </Pressable>
  );
}

/* =========================================================
   FYP POST
   ========================================================= */

function FeedPostCard({
  post,
  likeLoading,
  onLike,
  onShare,
}: {
  post: FeedPost;

  likeLoading: boolean;

  onLike: () => void;

  onShare: () => void;
}) {
  const authorName =
    post.author
      ?.full_name ||
    "Richfield Member";

  const openAuthor =
    () => {
      router.push({
        pathname:
          "/(tabs)/profile",

        params: {
          userId:
            post.user_id,
        },
      });
    };

  const openPost =
    () => {
      router.push({
        pathname:
          "/(student)/post/[id]" as never,

        params: {
          id: post.id,
        },
      });
    };

  return (
    <View
      style={
        styles.postCard
      }
    >
      <View
        style={
          styles.postHeader
        }
      >
        <Pressable
          onPress={
            openAuthor
          }
        >
          {post.author
            ?.avatar_url ? (
            <Image
              source={{
                uri:
                  post.author
                    .avatar_url,
              }}
              style={
                styles.postAvatarImage
              }
            />
          ) : (
            <View
              style={
                styles.postAvatar
              }
            >
              <Text
                style={
                  styles.postAvatarText
                }
              >
                {getInitials(
                  authorName
                )}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={
            styles.postAuthorArea
          }
          onPress={
            openAuthor
          }
        >
          <Text
            style={
              styles.postAuthor
            }
          >
            {
              authorName
            }
          </Text>

          <Text
            style={
              styles.postHeadline
            }
            numberOfLines={
              1
            }
          >
            {post.author
              ?.headline ||
              getRoleLabel(
                post.author
                  ?.role ||
                  null
              )}
          </Text>

          <View
            style={
              styles.postTimeRow
            }
          >
            <Text
              style={
                styles.postTime
              }
            >
              {formatRelativeTime(
                post.created_at
              )}
            </Text>

            <Text
              style={
                styles.dot
              }
            >
              ·
            </Text>

            <Ionicons
              name={
                post.visibility
                  ?.toLowerCase() ===
                "connections"
                  ? "people-outline"
                  : "earth-outline"
              }
              size={12}
              color={
                COLORS.textMuted
              }
            />
          </View>
        </Pressable>

        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={
            COLORS.textMuted
          }
        />
      </View>

      {post.content ? (
        <Pressable
          onPress={
            openPost
          }
        >
          <Text
            style={
              styles.postContent
            }
          >
            {
              post.content
            }
          </Text>
        </Pressable>
      ) : null}

      {post.image_url &&
      post.media_type !==
        "video" ? (
        <Pressable
          onPress={
            openPost
          }
        >
          <Image
            source={{
              uri:
                post.image_url,
            }}
            style={
              styles.postImage
            }
            resizeMode="cover"
          />
        </Pressable>
      ) : null}

      {post.image_url &&
      post.media_type ===
        "video" ? (
        <Pressable
          style={
            styles.videoCard
          }
          onPress={
            openPost
          }
        >
          <Ionicons
            name="play-circle"
            size={54}
            color="#FFF"
          />

          <Text
            style={
              styles.videoLabel
            }
          >
            Video post
          </Text>
        </Pressable>
      ) : null}

      <View
        style={
          styles.engagement
        }
      >
        <View
          style={
            styles.likesSummary
          }
        >
          <View
            style={
              styles.likeBubble
            }
          >
            <Ionicons
              name="thumbs-up"
              size={10}
              color="#FFF"
            />
          </View>

          <Text
            style={
              styles.engagementText
            }
          >
            {
              post.likeCount
            }
          </Text>
        </View>

        <Text
          style={
            styles.engagementText
          }
        >
          {post.commentCount}{" "}
          comments ·{" "}
          {post.shareCount}{" "}
          shares
        </Text>
      </View>

      <View
        style={
          styles.divider
        }
      />

      <View
        style={
          styles.postActions
        }
      >
        <Pressable
          style={
            styles.postAction
          }
          disabled={
            likeLoading
          }
          onPress={
            onLike
          }
        >
          {likeLoading ? (
            <ActivityIndicator
              size="small"
              color={
                PRIMARY
              }
            />
          ) : (
            <Ionicons
              name={
                post.liked
                  ? "thumbs-up"
                  : "thumbs-up-outline"
              }
              size={19}
              color={
                post.liked
                  ? PRIMARY
                  : COLORS.textSecondary
              }
            />
          )}

          <Text
            style={[
              styles.postActionText,

              post.liked &&
                styles.activeActionText,
            ]}
          >
            Like
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.postAction
          }
          onPress={
            openPost
          }
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={
              styles.postActionText
            }
          >
            Comment
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.postAction
          }
          onPress={
            onShare
          }
        >
          <Ionicons
            name="share-social-outline"
            size={19}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={
              styles.postActionText
            }
          >
            Share
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    loadingScreen: {
      flex: 1,
      backgroundColor:
        COLORS.background,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingText: {
      marginTop: 10,
      color:
        COLORS.textSecondary,
      fontSize: 13,
    },

    listContent: {
      paddingBottom: 20,
    },

    welcomeSection: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },

    greeting: {
      fontSize: 14,
      color:
        COLORS.textSecondary,
      fontWeight: "600",
      marginBottom: 7,
    },

    welcomeTitle: {
      fontSize: 27,
      lineHeight: 33,
      fontWeight: "800",
      color:
        COLORS.textPrimary,
    },

    welcomeDescription: {
      color:
        COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
    },

    quickSection: {
      paddingHorizontal: 20,
      marginBottom: 25,
    },

    quickGrid: {
      flexDirection:
        "row",
      gap: 8,
      marginTop: 12,
    },

    quickItem: {
      flex: 1,
      minHeight: 86,
      backgroundColor:
        "#FFF",
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 7,
    },

    quickIcon: {
      width: 37,
      height: 37,
      borderRadius: 11,
      backgroundColor:
        COLORS.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    quickLabel: {
      fontSize: 10.5,
      fontWeight: "700",
      textAlign:
        "center",
      marginTop: 7,
      color:
        COLORS.textPrimary,
    },

    sectionHeader: {
      paddingHorizontal: 20,
      marginBottom: 11,
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color:
        COLORS.textPrimary,
    },

    sectionAction: {
      color: PRIMARY,
      fontSize: 12,
      fontWeight: "700",
    },

    opportunityCard: {
      marginHorizontal: 20,
      marginBottom: 26,
      borderRadius: 18,
      backgroundColor:
        "#FFF",
      padding: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    opportunityTop: {
      flexDirection:
        "row",
    },

    companyLogo: {
      width: 47,
      height: 47,
      borderRadius: 14,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    companyLogoText: {
      color: "#FFF",
      fontWeight: "900",
      fontSize: 14,
    },

    opportunityTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
      color:
        COLORS.textPrimary,
    },

    companyName: {
      fontSize: 12.5,
      color:
        COLORS.textSecondary,
      marginTop: 3,
    },

    metaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 6,
      gap: 4,
    },

    metaText: {
      fontSize: 11,
      color:
        COLORS.textMuted,
    },

    skillRow: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 15,
    },

    skill: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 9,
      backgroundColor:
        COLORS.brandLight,
    },

    skillText: {
      color: PRIMARY,
      fontWeight: "700",
      fontSize: 10.5,
    },

    opportunityBottom: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 15,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    opportunityType: {
      fontSize: 12,
      fontWeight: "700",
      color:
        COLORS.textPrimary,
    },

    closingText: {
      fontSize: 10.5,
      color:
        COLORS.textMuted,
      marginTop: 3,
    },

    viewOpportunity: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      backgroundColor:
        PRIMARY,
      borderRadius: 11,
      paddingVertical: 9,
      paddingHorizontal: 13,
    },

    viewOpportunityText: {
      color: "#FFF",
      fontSize: 11,
      fontWeight: "700",
    },

    horizontalContent: {
      paddingHorizontal: 20,
      paddingBottom: 25,
      gap: 11,
    },

    eventCard: {
      width: 285,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor:
        "#FFF",
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    eventImage: {
      width: "100%",
      height: 128,
      backgroundColor:
        "#EEE",
    },

    eventImageFallback: {
      width: "100%",
      height: 108,
      backgroundColor:
        COLORS.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    eventBody: {
      flexDirection:
        "row",
      padding: 14,
      gap: 12,
    },

    eventDate: {
      width: 45,
      height: 54,
      borderRadius: 12,
      backgroundColor:
        COLORS.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    eventMonth: {
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "800",
    },

    eventDay: {
      fontSize: 18,
      fontWeight: "900",
      color:
        COLORS.textPrimary,
    },

    eventCategory: {
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "800",
      textTransform:
        "uppercase",
    },

    eventTitle: {
      color:
        COLORS.textPrimary,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 18,
      marginTop: 3,
    },

    eventMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginTop: 6,
    },

    eventMetaText: {
      flex: 1,
      fontSize: 10.5,
      color:
        COLORS.textMuted,
    },

    personCard: {
      width: 150,
      borderRadius: 17,
      padding: 13,
      backgroundColor:
        "#FFF",
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems:
        "center",
    },

    personAvatar: {
      width: 57,
      height: 57,
      borderRadius: 29,
    },

    personFallback: {
      width: 57,
      height: 57,
      borderRadius: 29,
      backgroundColor:
        COLORS.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    personInitials: {
      color: PRIMARY,
      fontWeight: "900",
      fontSize: 17,
    },

    personName: {
      width: "100%",
      textAlign:
        "center",
      fontWeight: "800",
      color:
        COLORS.textPrimary,
      fontSize: 12,
      marginTop: 9,
    },

    personRole: {
      width: "100%",
      textAlign:
        "center",
      fontSize: 10,
      color:
        COLORS.textMuted,
      marginTop: 3,
    },

    followButton: {
      marginTop: 10,
      minWidth: 95,
      height: 32,
      borderRadius: 10,
      backgroundColor:
        COLORS.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    followingButton: {
      backgroundColor:
        "#F2F2F2",
    },

    followButtonText: {
      color: PRIMARY,
      fontSize: 10.5,
      fontWeight: "800",
    },

    feedHeader: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
    },

    feedTitle: {
      fontSize: 21,
      fontWeight: "900",
      color:
        COLORS.textPrimary,
    },

    feedSubtitle: {
      fontSize: 12,
      color:
        COLORS.textSecondary,
      marginTop: 3,
    },

    createPost: {
      marginHorizontal: 15,
      marginBottom: 11,
      padding: 12,
      borderRadius: 16,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
      backgroundColor:
        "#FFF",
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    createAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },

    createFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        COLORS.brandLight,
    },

    createFallbackText: {
      color: PRIMARY,
      fontWeight: "800",
    },

    createInput: {
      flex: 1,
      minHeight: 40,
      borderRadius: 21,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      paddingHorizontal: 14,
      justifyContent:
        "center",
    },

    createPlaceholder: {
      color:
        COLORS.textMuted,
      fontSize: 12,
    },

    postCard: {
      backgroundColor:
        "#FFF",
      marginBottom: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        COLORS.border,
    },

    postHeader: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      paddingHorizontal: 15,
      paddingTop: 14,
      paddingBottom: 10,
    },

    postAvatar: {
      width: 43,
      height: 43,
      borderRadius: 22,
      backgroundColor:
        COLORS.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    postAvatarImage: {
      width: 43,
      height: 43,
      borderRadius: 22,
      backgroundColor:
        "#EEE",
    },

    postAvatarText: {
      color: PRIMARY,
      fontSize: 13,
      fontWeight: "900",
    },

    postAuthorArea: {
      flex: 1,
      marginLeft: 10,
      paddingRight: 10,
    },

    postAuthor: {
      color:
        COLORS.textPrimary,
      fontSize: 13.5,
      fontWeight: "800",
    },

    postHeadline: {
      color:
        COLORS.textSecondary,
      fontSize: 10.5,
      marginTop: 2,
    },

    postTimeRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 3,
    },

    postTime: {
      fontSize: 9.5,
      color:
        COLORS.textMuted,
    },

    dot: {
      fontSize: 11,
      color:
        COLORS.textMuted,
      marginHorizontal: 4,
    },

    postContent: {
      paddingHorizontal: 15,
      paddingBottom: 14,
      color:
        COLORS.textPrimary,
      fontSize: 13.5,
      lineHeight: 20,
    },

    postImage: {
      width: "100%",
      height: 360,
      backgroundColor:
        "#ECECEC",
    },

    videoCard: {
      width: "100%",
      height: 340,
      backgroundColor:
        "#151515",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    videoLabel: {
      color: "#FFF",
      fontWeight: "700",
      marginTop: 7,
    },

    engagement: {
      minHeight: 41,
      paddingHorizontal: 15,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    likesSummary: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
    },

    likeBubble: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    engagementText: {
      fontSize: 10.5,
      color:
        COLORS.textMuted,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginHorizontal: 15,
    },

    postActions: {
      minHeight: 48,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 5,
    },

    postAction: {
      flex: 1,
      height: 46,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
    },

    postActionText: {
      fontSize: 11,
      color:
        COLORS.textSecondary,
      fontWeight: "600",
    },

    activeActionText: {
      color: PRIMARY,
      fontWeight: "800",
    },

    emptyFeed: {
      paddingHorizontal: 30,
      paddingVertical: 60,
      alignItems:
        "center",
    },

    emptyFeedTitle: {
      marginTop: 12,
      fontWeight: "800",
      color:
        COLORS.textPrimary,
      fontSize: 17,
    },

    emptyFeedText: {
      textAlign:
        "center",
      marginTop: 5,
      color:
        COLORS.textMuted,
      lineHeight: 19,
    },
  });