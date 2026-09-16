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

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
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

const PRIMARY = "#0300cf";

type Conversation = {
  conversation_id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  online: boolean;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number | string | null;
  is_mentor: boolean;
  blocked: boolean;
};

function getInitials(
  name?: string | null
) {
  if (!name) {
    return "?";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[1].charAt(0)
  ).toUpperCase();
}

function formatMessageTime(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const now = new Date();

  const today =
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate();

  if (today) {
    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  const yesterday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    );

  const isYesterday =
    date.getFullYear() ===
      yesterday.getFullYear() &&
    date.getMonth() ===
      yesterday.getMonth() &&
    date.getDate() ===
      yesterday.getDate();

  if (isYesterday) {
    return "Yesterday";
  }

  const difference =
    now.getTime() -
    date.getTime();

  const sevenDays =
    7 *
    24 *
    60 *
    60 *
    1000;

  if (difference < sevenDays) {
    return date.toLocaleDateString(
      [],
      {
        weekday: "short",
      }
    );
  }

  return date.toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short",
    }
  );
}

function getRoleLabel(
  role?: string
) {
  switch (
    role?.toLowerCase()
  ) {
    case "student":
      return "Student";

    case "alumni":
      return "Alumni";

    case "staff":
      return "Staff";

    case "admin":
      return "Admin";

    case "business":
      return "Business";

    default:
      return "Member";
  }
}

export default function StaffChatScreen() {
  const {
    user,
    profile,
    isStaffVerified,
  } = useAuth();

  const [
    conversations,
    setConversations,
  ] = useState<
    Conversation[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const loadConversations =
    useCallback(
      async (
        showLoader = false
      ) => {
        if (!user) {
          setConversations([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        try {
          if (showLoader) {
            setLoading(true);
          }

          setErrorMessage(null);

          const {
            data,
            error,
          } =
            await supabase.rpc(
              "get_my_conversations"
            );

          if (error) {
            throw error;
          }

          const result =
            (
              data || []
            ).map(
              (
                item: any
              ): Conversation => ({
                conversation_id:
                  item.conversation_id,

                user_id:
                  item.user_id,

                full_name:
                  item.full_name,

                username:
                  item.username,

                avatar_url:
                  item.avatar_url,

                role:
                  item.role,

                online:
                  item.online ===
                  true,

                last_message:
                  item.last_message,

                last_message_time:
                  item.last_message_time,

                unread_count:
                  item.unread_count,

                is_mentor:
                  item.is_mentor ===
                  true,

                blocked:
                  item.blocked ===
                  true,
              })
            );

          setConversations(
            result
          );
        } catch (
          error: any
        ) {
          console.log(
            "Staff conversations error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Unable to load conversations."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [user]
    );

  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  /*
   * REALTIME
   *
   * All callbacks are registered BEFORE
   * subscribe(), avoiding the Realtime error
   * we had previously.
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel =
      supabase.channel(
        `staff-chat-${user.id}`
      );

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "conversation_members",
        },
        () => {
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "blocked_users",
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    user,
    loadConversations,
  ]);

  const filteredConversations =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return conversations;
      }

      return conversations.filter(
        (conversation) => {
          const name =
            conversation.full_name
              ?.toLowerCase() ||
            "";

          const username =
            conversation.username
              ?.toLowerCase() ||
            "";

          const role =
            conversation.role
              ?.toLowerCase() ||
            "";

          return (
            name.includes(query) ||
            username.includes(
              query
            ) ||
            role.includes(query)
          );
        }
      );
    }, [
      conversations,
      search,
    ]);

  const unreadTotal =
    useMemo(() => {
      return conversations.reduce(
        (
          total,
          conversation
        ) =>
          total +
          Number(
            conversation.unread_count ||
              0
          ),
        0
      );
    }, [conversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const openConversation = (
    conversation: Conversation
  ) => {
    if (
      conversation.blocked
    ) {
      Alert.alert(
        "Conversation blocked",
        "Unblock this member before continuing the conversation."
      );

      return;
    }

    router.push({
      pathname:
        "/conversation",

      params: {
        conversationId:
          conversation.conversation_id,

        id:
          conversation.user_id,

        userId:
          conversation.user_id,

        name:
          conversation.full_name ||
          "Richfield Member",

        username:
          conversation.username ||
          "",

        image:
          conversation.avatar_url ||
          "",

        role:
          conversation.role ||
          "",

        online:
          conversation.online
            ? "true"
            : "false",
      },
    });
  };

  /*
   * We will connect this button to the
   * Staff Network screen. Staff can select
   * a Student/Alumni/Staff member there and
   * open_direct_conversation() will create
   * or return the conversation.
   */

  const startNewConversation =
    () => {
      router.push(
        "/(staff)/(tabs)/network"
      );
    };

  const renderConversation =
    ({
      item,
    }: {
      item: Conversation;
    }) => {
      const unread =
        Number(
          item.unread_count ||
            0
        );

      return (
        <Pressable
          style={({ pressed }) => [
            styles.chatItem,

            pressed &&
              styles.chatItemPressed,
          ]}
          onPress={() =>
            openConversation(
              item
            )
          }
        >
          <View
            style={
              styles.avatarWrapper
            }
          >
            {item.avatar_url ? (
              <Image
                source={{
                  uri:
                    item.avatar_url,
                }}
                style={
                  styles.avatar
                }
              />
            ) : (
              <View
                style={
                  styles.avatarFallback
                }
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {getInitials(
                    item.full_name
                  )}
                </Text>
              </View>
            )}

            {item.online &&
              !item.blocked && (
                <View
                  style={
                    styles.onlineDot
                  }
                />
              )}
          </View>

          <View
            style={
              styles.chatContent
            }
          >
            <View
              style={
                styles.chatTopRow
              }
            >
              <View
                style={
                  styles.nameRow
                }
              >
                <Text
                  style={[
                    styles.chatName,

                    unread > 0 &&
                      styles.chatNameUnread,
                  ]}
                  numberOfLines={
                    1
                  }
                >
                  {item.full_name ||
                    "Richfield Member"}
                </Text>

                {item.role ===
                  "staff" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={
                      PRIMARY
                    }
                  />
                )}
              </View>

              <Text
                style={[
                  styles.chatTime,

                  unread > 0 &&
                    styles.chatTimeUnread,
                ]}
              >
                {formatMessageTime(
                  item.last_message_time
                )}
              </Text>
            </View>

            <View
              style={
                styles.roleRow
              }
            >
              <Text
                style={
                  styles.roleText
                }
              >
                {getRoleLabel(
                  item.role
                )}
              </Text>

              {item.blocked && (
                <View
                  style={
                    styles.blockedBadge
                  }
                >
                  <Ionicons
                    name="ban-outline"
                    size={11}
                    color="#DC2626"
                  />

                  <Text
                    style={
                      styles.blockedText
                    }
                  >
                    Blocked
                  </Text>
                </View>
              )}
            </View>

            <View
              style={
                styles.messageRow
              }
            >
              <Text
                style={[
                  styles.lastMessage,

                  unread > 0 &&
                    styles.lastMessageUnread,
                ]}
                numberOfLines={
                  1
                }
              >
                {item.blocked
                  ? "Conversation blocked"
                  : item.last_message ||
                    "Start the conversation"}
              </Text>

              {unread > 0 && (
                <View
                  style={
                    styles.unreadBadge
                  }
                >
                  <Text
                    style={
                      styles.unreadText
                    }
                  >
                    {unread > 99
                      ? "99+"
                      : unread}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );
    };

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.loadingContainer
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
            Loading messages...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <View
        style={styles.screen}
      >
        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerTop
            }
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                RICHFIELD STAFF
              </Text>

              <View
                style={
                  styles.titleRow
                }
              >
                <Text
                  style={
                    styles.title
                  }
                >
                  Messages
                </Text>

                {unreadTotal >
                  0 && (
                  <View
                    style={
                      styles.headerUnreadBadge
                    }
                  >
                    <Text
                      style={
                        styles.headerUnreadText
                      }
                    >
                      {unreadTotal >
                      99
                        ? "99+"
                        : unreadTotal}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.newChatButton,

                pressed && {
                  opacity: 0.75,
                },
              ]}
              onPress={
                startNewConversation
              }
            >
              <Ionicons
                name="create-outline"
                size={22}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <Text
            style={
              styles.subtitle
            }
          >
            Communicate directly with
            members of the Richfield
            community.
          </Text>

          <View
            style={
              styles.permissionCard
            }
          >
            <View
              style={
                styles.permissionIcon
              }
            >
              <Ionicons
                name="chatbubbles"
                size={22}
                color="#FFFFFF"
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.permissionTitle
                }
              >
                Direct staff messaging
              </Text>

              <Text
                style={
                  styles.permissionText
                }
              >
                Verified Richfield Staff
                can directly message
                students and alumni.
              </Text>
            </View>

            {profile?.role ===
              "staff" &&
              isStaffVerified && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#16A34A"
                />
              )}
          </View>

          <View
            style={
              styles.searchContainer
            }
          >
            <Ionicons
              name="search-outline"
              size={20}
              color="#777"
            />

            <TextInput
              style={
                styles.searchInput
              }
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search messages"
              placeholderTextColor="#999"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {!!search && (
              <Pressable
                hitSlop={8}
                onPress={() =>
                  setSearch("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color="#AAA"
                />
              </Pressable>
            )}
          </View>
        </View>

        {errorMessage ? (
          <View
            style={
              styles.errorContainer
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={38}
              color="#DC2626"
            />

            <Text
              style={
                styles.errorTitle
              }
            >
              Could not load messages
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {errorMessage}
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={() =>
                loadConversations(
                  true
                )
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={
              filteredConversations
            }
            keyExtractor={(
              item
            ) =>
              item.conversation_id
            }
            renderItem={
              renderConversation
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              filteredConversations.length ===
              0
                ? styles.emptyList
                : styles.list
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  handleRefresh
                }
                tintColor={
                  PRIMARY
                }
                colors={[
                  PRIMARY,
                ]}
              />
            }
            ItemSeparatorComponent={() => (
              <View
                style={
                  styles.separator
                }
              />
            )}
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
                    name={
                      search
                        ? "search-outline"
                        : "chatbubble-ellipses-outline"
                    }
                    size={38}
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
                  {search
                    ? "No conversations found"
                    : "No conversations yet"}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {search
                    ? "Try searching for another name or role."
                    : "Start a conversation with a Student, Alumni or Staff member from your Network."}
                </Text>

                {!search && (
                  <Pressable
                    style={
                      styles.startButton
                    }
                    onPress={
                      startNewConversation
                    }
                  >
                    <Ionicons
                      name="people-outline"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.startButtonText
                      }
                    >
                      Open Network
                    </Text>
                  </Pressable>
                )}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    screen: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F0F0F0",
      backgroundColor:
        "#FFFFFF",
    },

    headerTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    eyebrow: {
      color: PRIMARY,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
    },

    title: {
      fontSize: 28,
      fontWeight: "800",
      color: "#111",
    },

    headerUnreadBadge: {
      minWidth: 24,
      height: 24,
      paddingHorizontal: 7,
      borderRadius: 12,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 9,
    },

    headerUnreadText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },

    subtitle: {
      color: "#666",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
    },

    newChatButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 12,
    },

    permissionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#F3F3FF",
      borderRadius: 15,
      padding: 14,
      marginTop: 18,
    },

    permissionIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    permissionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: "#222",
    },

    permissionText: {
      fontSize: 12,
      color: "#666",
      lineHeight: 17,
      marginTop: 3,
    },

    searchContainer: {
      height: 48,
      borderRadius: 14,
      backgroundColor:
        "#F5F5F7",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      marginTop: 16,
    },

    searchInput: {
      flex: 1,
      fontSize: 14,
      color: "#111",
      marginLeft: 9,
      height: "100%",
    },

    list: {
      paddingBottom: 100,
    },

    chatItem: {
      minHeight: 87,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 13,
      backgroundColor:
        "#FFFFFF",
    },

    chatItemPressed: {
      backgroundColor:
        "#F8F8FC",
    },

    avatarWrapper: {
      width: 56,
      height: 56,
      marginRight: 13,
      position: "relative",
    },

    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor:
        "#ECECEC",
    },

    avatarFallback: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor:
        "#E9E9FF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    avatarText: {
      color: PRIMARY,
      fontSize: 17,
      fontWeight: "800",
    },

    onlineDot: {
      position: "absolute",
      right: 1,
      bottom: 2,
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor:
        "#22C55E",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    chatContent: {
      flex: 1,
      minWidth: 0,
    },

    chatTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    nameRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginRight: 10,
      gap: 5,
    },

    chatName: {
      flexShrink: 1,
      color: "#222",
      fontSize: 15,
      fontWeight: "600",
    },

    chatNameUnread: {
      fontWeight: "800",
      color: "#111",
    },

    chatTime: {
      color: "#999",
      fontSize: 11,
    },

    chatTimeUnread: {
      color: PRIMARY,
      fontWeight: "700",
    },

    roleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },

    roleText: {
      color: PRIMARY,
      fontSize: 10,
      fontWeight: "700",
    },

    blockedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginLeft: 7,
    },

    blockedText: {
      color: "#DC2626",
      fontSize: 10,
      fontWeight: "700",
    },

    messageRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },

    lastMessage: {
      flex: 1,
      color: "#777",
      fontSize: 13,
      marginRight: 8,
    },

    lastMessageUnread: {
      color: "#333",
      fontWeight: "600",
    },

    unreadBadge: {
      minWidth: 21,
      height: 21,
      borderRadius: 11,
      paddingHorizontal: 5,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    unreadText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
    },

    separator: {
      height: 1,
      marginLeft: 89,
      backgroundColor:
        "#F1F1F1",
    },

    emptyList: {
      flexGrow: 1,
      paddingBottom: 100,
    },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 35,
      paddingBottom: 60,
    },

    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 24,
      backgroundColor:
        "#F1F1FF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#333",
      marginTop: 16,
    },

    emptyText: {
      color: "#777",
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginTop: 7,
      maxWidth: 300,
    },

    startButton: {
      height: 46,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 18,
      marginTop: 18,
      gap: 7,
    },

    startButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    loadingText: {
      color: "#777",
      fontSize: 13,
      marginTop: 12,
    },

    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 35,
    },

    errorTitle: {
      color: "#222",
      fontSize: 17,
      fontWeight: "800",
      marginTop: 12,
    },

    errorText: {
      color: "#777",
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginTop: 6,
    },

    retryButton: {
      marginTop: 18,
      paddingHorizontal: 20,
      height: 44,
      borderRadius: 12,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    retryText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
  });