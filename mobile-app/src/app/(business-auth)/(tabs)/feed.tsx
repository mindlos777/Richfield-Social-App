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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useVideoPlayer,
  VideoView,
} from "expo-video";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type FeedPost = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  media_type: string | null;
  visibility: string | null;
  created_at: string;

  full_name: string;
  username: string;
  avatar_url: string | null;
  role: string;
  headline: string | null;

  programme: string | null;
  campus: string | null;
  skills: string[];
};

type FilterMode =
  | "all"
  | "students"
  | "alumni";

export default function BusinessFeedScreen() {
  const [posts, setPosts] =
    useState<FeedPost[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<FilterMode>("all");

  const [messageLoadingId, setMessageLoadingId] =
    useState<string | null>(null);

  const loadFeed =
    useCallback(async (
      showLoader = true
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
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
          .limit(100);

        if (postsError) {
          throw postsError;
        }

        const rows = postRows || [];

        if (rows.length === 0) {
          setPosts([]);
          return;
        }

        const userIds = [
          ...new Set(
            rows.map(
              (post) =>
                post.user_id
            )
          ),
        ];

        const [
          profilesResult,
          studentsResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              username,
              avatar_url,
              role,
              headline
            `)
            .in("id", userIds),

          supabase
            .from("student_profiles")
            .select(`
              user_id,
              programme,
              campus,
              skills
            `)
            .in(
              "user_id",
              userIds
            ),
        ]);

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        if (studentsResult.error) {
          console.log(
            "Business feed student profile error:",
            studentsResult.error
          );
        }

        const profileMap =
          new Map<string, any>();

        (
          profilesResult.data || []
        ).forEach((item) => {
          profileMap.set(
            item.id,
            item
          );
        });

        const studentMap =
          new Map<string, any>();

        (
          studentsResult.data || []
        ).forEach((item) => {
          studentMap.set(
            item.user_id,
            item
          );
        });

        const merged: FeedPost[] =
          rows
            .map((post) => {
              const userProfile =
                profileMap.get(
                  post.user_id
                );

              const role =
                String(
                  userProfile?.role ||
                    "student"
                );

              if (
                userProfile &&
                role !== "student" &&
                role !== "alumni"
              ) {
                return null;
              }

              const studentProfile =
                studentMap.get(
                  post.user_id
                );

              return {
                ...post,
                full_name:
                  userProfile?.full_name ||
                  "Richfield Member",
                username:
                  userProfile?.username ||
                  "",
                avatar_url:
                  userProfile?.avatar_url ||
                  null,
                role,
                headline:
                  userProfile?.headline ||
                  null,
                programme:
                  studentProfile
                    ?.programme ||
                  null,
                campus:
                  studentProfile
                    ?.campus ||
                  null,
                skills:
                  Array.isArray(
                    studentProfile?.skills
                  )
                    ? studentProfile.skills
                    : [],
              } as FeedPost;
            })
            .filter(
              Boolean
            ) as FeedPost[];

        setPosts(merged);
      } catch (error: any) {
        console.log(
          "Business feed error:",
          error
        );

        Alert.alert(
          "Feed",
          error?.message ||
            "Could not load the talent feed."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    loadFeed();

    const channel = supabase
      .channel(
        "business-talent-feed"
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
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [loadFeed]);

  const filtered = useMemo(() => {
    let list = [...posts];

    if (filter === "students") {
      list = list.filter(
        (item) =>
          item.role === "student"
      );
    }

    if (filter === "alumni") {
      list = list.filter(
        (item) =>
          item.role === "alumni"
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
      (item) => {
        const searchable = `
          ${item.full_name}
          ${item.username}
          ${item.headline || ""}
          ${item.content || ""}
          ${item.programme || ""}
          ${item.campus || ""}
          ${item.skills.join(" ")}
        `.toLowerCase();

        return searchable.includes(
          value
        );
      }
    );
  }, [
    posts,
    search,
    filter,
  ]);

  function openProfile(
    item: FeedPost
  ) {
    router.push({
      pathname: "/member-profile",
      params: {
        userId: item.user_id,
        id: item.user_id,
        name: item.full_name,
        username:
          item.username,
        image:
          item.avatar_url || "",
        role: item.role,
      },
    });
  }

  async function contactTalent(
    item: FeedPost
  ) {
    try {
      setMessageLoadingId(
        item.user_id
      );

      const {
        data,
        error,
      } = await supabase.rpc(
        "open_direct_conversation",
        {
          p_other_user_id:
            item.user_id,
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
          otherUserId:
            item.user_id,
          userId:
            item.user_id,
          name:
            item.full_name,
          username:
            item.username,
          image:
            item.avatar_url || "",
          role:
            item.role,
        },
      });
    } catch (error: any) {
      console.log(
        "Contact talent error:",
        error
      );

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

  async function refresh() {
    setRefreshing(true);
    await loadFeed(false);
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

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <View>
          <Text
            style={styles.title}
          >
            Talent Feed
          </Text>

          <Text
            style={styles.subtitle}
          >
            Discover student and alumni
            posts
          </Text>
        </View>

        <View
          style={styles.headerIcon}
        >
          <Ionicons
            name="sparkles-outline"
            size={22}
            color={PRIMARY}
          />
        </View>
      </View>

      <View
        style={styles.searchWrap}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color="#777"
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search skills, people, posts..."
          placeholderTextColor="#999"
          style={styles.searchInput}
        />

        {search.length > 0 && (
          <Pressable
            onPress={() =>
              setSearch("")
            }
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#999"
            />
          </Pressable>
        )}
      </View>

      <View
        style={styles.filters}
      >
        <FilterButton
          label="All"
          active={
            filter === "all"
          }
          onPress={() =>
            setFilter("all")
          }
        />

        <FilterButton
          label="Students"
          active={
            filter === "students"
          }
          onPress={() =>
            setFilter(
              "students"
            )
          }
        />

        <FilterButton
          label="Alumni"
          active={
            filter === "alumni"
          }
          onPress={() =>
            setFilter("alumni")
          }
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) =>
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
          filtered.length === 0
            ? styles.emptyList
            : styles.list
        }
        ListEmptyComponent={
          <View
            style={styles.empty}
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="people-outline"
                size={30}
                color={PRIMARY}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No talent posts yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Posts shared with Everyone by students and alumni will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <FeedCard
            item={item}
            messageLoading={
              messageLoadingId ===
              item.user_id
            }
            onProfile={() =>
              openProfile(item)
            }
            onMessage={() =>
              contactTalent(item)
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

function FeedCard({
  item,
  onProfile,
  onMessage,
  messageLoading,
}: {
  item: FeedPost;
  onProfile: () => void;
  onMessage: () => void;
  messageLoading: boolean;
}) {
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.authorRow}
        onPress={onProfile}
      >
        {item.avatar_url ? (
          <Image
            source={{
              uri: item.avatar_url,
            }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={
              styles.avatarFallback
            }
          >
            <Text
              style={
                styles.avatarLetter
              }
            >
              {item.full_name
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
        )}

        <View
          style={styles.authorInfo}
        >
          <View
            style={styles.nameRow}
          >
            <Text
              style={
                styles.authorName
              }
            >
              {item.full_name}
            </Text>

            <View
              style={styles.roleBadge}
            >
              <Text
                style={
                  styles.roleText
                }
              >
                {item.role}
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.authorMeta
            }
            numberOfLines={1}
          >
            {item.headline ||
              item.programme ||
              item.campus ||
              `@${item.username}`}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color="#aaa"
        />
      </Pressable>

      {item.content ? (
        <Text
          style={styles.content}
        >
          {item.content}
        </Text>
      ) : null}

      {item.image_url ? (
        item.media_type ===
        "video" ? (
          <FeedVideo
            uri={item.image_url}
          />
        ) : (
          <Image
            source={{
              uri: item.image_url,
            }}
            style={styles.media}
            resizeMode="cover"
          />
        )
      ) : null}

      {item.skills.length > 0 && (
        <View
          style={styles.skills}
        >
          {item.skills
            .slice(0, 5)
            .map(
              (
                skill,
                index
              ) => (
                <View
                  key={`${item.id}-${skill}-${index}`}
                  style={
                    styles.skill
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
              )
            )}
        </View>
      )}

      <View
        style={styles.cardFooter}
      >
        <Text
          style={styles.dateText}
        >
          {formatDate(
            item.created_at
          )}
        </Text>

        <View
          style={styles.actions}
        >
          <Pressable
            style={
              styles.profileButton
            }
            onPress={onProfile}
          >
            <Ionicons
              name="person-outline"
              size={16}
              color={PRIMARY}
            />
            <Text
              style={
                styles.profileButtonText
              }
            >
              Profile
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.messageButton
            }
            onPress={onMessage}
            disabled={
              messageLoading
            }
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
                  size={16}
                  color="#fff"
                />
                <Text
                  style={
                    styles.messageButtonText
                  }
                >
                  Contact
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function FeedVideo({
  uri,
}: {
  uri: string;
}) {
  const player =
    useVideoPlayer(
      uri,
      (player) => {
        player.loop = false;
      }
    );

  return (
    <VideoView
      player={player}
      style={styles.media}
      nativeControls
      contentFit="cover"
    />
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
        styles.filter,
        active &&
          styles.activeFilter,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.activeFilterText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(
  value: string
) {
  const date = new Date(value);

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F7F7FA",
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff",
    },
    header: {
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 12,
      backgroundColor: "#fff",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },
    title: {
      fontSize: 24,
      fontWeight: "900",
      color: "#111",
    },
    subtitle: {
      marginTop: 3,
      fontSize: 12,
      color: "#777",
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: "#F0F0FF",
      alignItems: "center",
      justifyContent: "center",
    },
    searchWrap: {
      marginHorizontal: 16,
      marginTop: 12,
      minHeight: 46,
      paddingHorizontal: 13,
      borderRadius: 13,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#E8E8EF",
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
    filter: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#E0E0E8",
    },
    activeFilter: {
      backgroundColor: PRIMARY,
      borderColor: PRIMARY,
    },
    filterText: {
      color: "#555",
      fontSize: 12,
      fontWeight: "700",
    },
    activeFilterText: {
      color: "#fff",
    },
    list: {
      paddingHorizontal: 14,
      paddingBottom: 30,
    },
    emptyList: {
      flexGrow: 1,
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: 18,
      marginBottom: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#ECECF2",
    },
    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      marginRight: 11,
    },
    avatarFallback: {
      width: 46,
      height: 46,
      borderRadius: 23,
      marginRight: 11,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "900",
    },
    authorInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 7,
    },
    authorName: {
      fontSize: 14,
      fontWeight: "900",
      color: "#111",
    },
    roleBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: "#F0F0FF",
    },
    roleText: {
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "800",
      textTransform: "capitalize",
    },
    authorMeta: {
      marginTop: 3,
      fontSize: 11,
      color: "#777",
      maxWidth: "95%",
    },
    content: {
      paddingHorizontal: 14,
      paddingBottom: 13,
      fontSize: 14,
      lineHeight: 20,
      color: "#292929",
    },
    media: {
      width: "100%",
      aspectRatio: 1.15,
      backgroundColor: "#111",
    },
    skills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      paddingHorizontal: 14,
      paddingTop: 12,
    },
    skill: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: "#F3F3FF",
    },
    skillText: {
      color: PRIMARY,
      fontSize: 10,
      fontWeight: "700",
    },
    cardFooter: {
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
    },
    dateText: {
      flex: 1,
      color: "#999",
      fontSize: 10,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    profileButton: {
      minHeight: 37,
      paddingHorizontal: 11,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: "#DCDCFA",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    profileButtonText: {
      color: PRIMARY,
      fontSize: 11,
      fontWeight: "800",
    },
    messageButton: {
      minWidth: 92,
      minHeight: 37,
      paddingHorizontal: 11,
      borderRadius: 9,
      backgroundColor: PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    messageButtonText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "800",
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 80,
    },
    emptyIcon: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: "#F0F0FF",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 15,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: "#111",
    },
    emptyText: {
      marginTop: 6,
      color: "#777",
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 260,
    },
  });
