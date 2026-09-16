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
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
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

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import {
  supabase,
} from "../lib/supabase";

import {
  Conversation,
  labelMentor,
  loadConversations,
  loadRequests,
  removeMentorLabel,
} from "../services/ChatService";

const PRIMARY = "#0300cf";

type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

function getRoleLabel(
  role: UserRole
) {
  switch (role) {
    case "student":
      return "Student";

    case "alumni":
      return "Alumni";

    case "business":
      return "Business";

    case "admin":
      return "Admin";

    default:
      return "";
  }
}

function getRoleIcon(
  role: UserRole
): keyof typeof Ionicons.glyphMap {
  switch (role) {
    case "student":
      return "school-outline";

    case "alumni":
      return "ribbon-outline";

    case "business":
      return "briefcase-outline";

    case "admin":
      return "shield-checkmark-outline";

    default:
      return "person-outline";
  }
}

function formatMessageTime(
  dateString:
    | string
    | null
) {
  if (!dateString) {
    return "";
  }

  const date =
    new Date(dateString);

  const now =
    new Date();

  const sameDay =
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  const yesterday =
    new Date(now);

  yesterday.setDate(
    now.getDate() - 1
  );

  const wasYesterday =
    date.getFullYear() ===
      yesterday.getFullYear() &&
    date.getMonth() ===
      yesterday.getMonth() &&
    date.getDate() ===
      yesterday.getDate();

  if (wasYesterday) {
    return "Yesterday";
  }

  const sameYear =
    date.getFullYear() ===
    now.getFullYear();

  if (sameYear) {
    return date.toLocaleDateString(
      [],
      {
        day: "numeric",
        month: "short",
      }
    );
  }

  return date.toLocaleDateString(
    [],
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "?";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0]
    .charAt(0)
    .toUpperCase()}${parts[
    parts.length - 1
  ]
    .charAt(0)
    .toUpperCase()}`;
}

function renderAIAssistant(
  router: ReturnType<typeof useRouter>
) {
  return (
    <Pressable
      style={
        styles.aiCard
      }
      onPress={() =>
        router.push(
          "/ai-assistant"
        )
      }
    >
      <View
        style={
          styles.aiCardIcon
        }
      >
        <Ionicons
          name="sparkles"
          size={23}
          color="#fff"
        />
      </View>

      <View
        style={
          styles.aiCardInfo
        }
      >
        <View
          style={
            styles.aiCardTitleRow
          }
        >
          <Text
            style={
              styles.aiCardTitle
            }
          >
            Richfield AI
          </Text>

          <View
            style={
              styles.aiCardBadge
            }
          >
            <Text
              style={
                styles.aiCardBadgeText
              }
            >
              AI
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.aiCardSubtitle
          }
          numberOfLines={1}
        >
          Career, profile and networking assistant
        </Text>

        <View
          style={
            styles.aiPrivateRow
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={10}
            color="#7A848D"
          />

          <Text
            style={
              styles.aiPrivateText
            }
          >
            Private conversation
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color="#89929B"
      />
    </Pressable>
  );
}
export default function ChatScreen() {
  const router =
    useRouter();

  const [search, setSearch] =
    useState("");

  const [
    chats,
    setChats,
  ] =
    useState<
      Conversation[]
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
    requestCount,
    setRequestCount,
  ] =
    useState(0);

  const [
    selectedChat,
    setSelectedChat,
  ] =
    useState<
      Conversation | null
    >(null);

  const [
    optionsVisible,
    setOptionsVisible,
  ] =
    useState(false);

  const [
    updatingMentor,
    setUpdatingMentor,
  ] =
    useState(false);

  const fetchChats =
    useCallback(
      async (
        showLoading = false
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          const data =
            await loadConversations();

          setChats(
            data || []
          );
        } catch (error) {
          console.log(
            "Chat load error:",
            error
          );

          if (showLoading) {
            Alert.alert(
              "Messages",
              error instanceof Error
                ? error.message
                : "Unable to load your conversations."
            );
          }
        } finally {
          if (showLoading) {
            setLoading(
              false
            );
          }
        }
      },
      []
    );

  const fetchRequestCount =
    useCallback(
      async () => {
        try {
          const requests =
            await loadRequests();

          setRequestCount(
            requests.length
          );
        } catch (error) {
          console.log(
            "Request count error:",
            error
          );
        }
      },
      []
    );

  const refreshEverything =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await Promise.all([
            fetchChats(false),
            fetchRequestCount(),
          ]);
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [
        fetchChats,
        fetchRequestCount,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      fetchChats(true);
      fetchRequestCount();

      return undefined;
    }, [
      fetchChats,
      fetchRequestCount,
    ])
  );

  useEffect(() => {
    /*
      IMPORTANT:

      These realtime subscriptions
      use Postgres Changes.

      For them to work, "messages"
      and "message_requests" must be
      included in the
      supabase_realtime publication.
    */

    const messagesChannel =
      supabase
        .channel(
          "chat-screen-messages"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          payload => {
            console.log(
              "Chat list realtime message:",
              payload.eventType
            );

            fetchChats(false);
          }
        )
        .subscribe(
          status => {
            console.log(
              "Chat messages realtime:",
              status
            );
          }
        );

    const requestsChannel =
      supabase
        .channel(
          "chat-screen-requests"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "message_requests",
          },
          payload => {
            console.log(
              "Requests realtime:",
              payload.eventType
            );

            fetchRequestCount();
          }
        )
        .subscribe(
          status => {
            console.log(
              "Chat requests realtime:",
              status
            );
          }
        );

    return () => {
      supabase.removeChannel(
        messagesChannel
      );

      supabase.removeChannel(
        requestsChannel
      );
    };
  }, [
    fetchChats,
    fetchRequestCount,
  ]);

  const filteredChats =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return chats;
      }

      return chats.filter(
        chat => {
          const name =
            chat.full_name
              ?.toLowerCase() ||
            "";

          const username =
            chat.username
              ?.toLowerCase() ||
            "";

          const role =
            chat.role
              ?.toLowerCase() ||
            "";

          const lastMessage =
            chat.last_message
              ?.toLowerCase() ||
            "";

          return (
            name.includes(
              value
            ) ||
            username.includes(
              value
            ) ||
            role.includes(
              value
            ) ||
            lastMessage.includes(
              value
            )
          );
        }
      );
    }, [
      search,
      chats,
    ]);

  function openConversation(
    chat: Conversation
  ) {
    setOptionsVisible(
      false
    );

    setSelectedChat(
      null
    );

    router.push({
      pathname:
        "/conversation",

      params: {
        id:
          chat.conversation_id,

        userId:
          chat.user_id,

        name:
          chat.full_name,

        username:
          chat.username ||
          "",

        image:
          chat.avatar_url ||
          "",

        online:
          chat.online
            ? "true"
            : "false",

        role:
          chat.role,

        isMentor:
          chat.is_mentor
            ? "true"
            : "false",

        blocked:
          chat.blocked
            ? "true"
            : "false",
      },
    });
  }

  function openRequests() {
    router.push(
      "/(student)/requests"
    );
  }

  function openChatOptions(
    chat: Conversation
  ) {
    setSelectedChat(
      chat
    );

    setOptionsVisible(
      true
    );
  }

  function closeOptions() {
    if (
      updatingMentor
    ) {
      return;
    }

    setOptionsVisible(
      false
    );

    setSelectedChat(
      null
    );
  }

  async function toggleMentor() {
    if (
      !selectedChat ||
      selectedChat.role !==
        "alumni" ||
      updatingMentor
    ) {
      return;
    }

    try {
      setUpdatingMentor(
        true
      );

      if (
        selectedChat.is_mentor
      ) {
        await removeMentorLabel(
          selectedChat.user_id
        );
      } else {
        await labelMentor(
          selectedChat.user_id
        );
      }

      const newValue =
        !selectedChat.is_mentor;

      setChats(
        currentChats =>
          currentChats.map(
            chat =>
              chat.conversation_id ===
              selectedChat.conversation_id
                ? {
                    ...chat,
                    is_mentor:
                      newValue,
                  }
                : chat
          )
      );

      setSelectedChat({
        ...selectedChat,
        is_mentor:
          newValue,
      });

      setOptionsVisible(
        false
      );

      setSelectedChat(
        null
      );
    } catch (error) {
      console.log(
        "Mentor update error:",
        error
      );

      Alert.alert(
        "Mentor",
        error instanceof Error
          ? error.message
          : "Unable to update mentor."
      );
    } finally {
      setUpdatingMentor(
        false
      );
    }
  }

  function renderAvatar(
    chat: Conversation
  ) {
    if (
      chat.avatar_url
    ) {
      return (
        <Image
          source={{
            uri:
              chat.avatar_url,
          }}
          style={
            styles.avatar
          }
        />
      );
    }

    return (
      <View
        style={[
          styles.avatar,
          styles.avatarFallback,
        ]}
      >
        <Text
          style={
            styles.avatarInitials
          }
        >
          {getInitials(
            chat.full_name
          )}
        </Text>
      </View>
    );
  }

  const renderChat = ({
    item,
  }: {
    item: Conversation;
  }) => {
    const unreadCount =
      Number(
        item.unread_count
      ) || 0;

    const hasUnread =
      unreadCount > 0;

    return (
      <TouchableOpacity
        style={
          styles.chatItem
        }
        activeOpacity={0.7}
        onPress={() =>
          openConversation(
            item
          )
        }
      >
        <View
          style={
            styles.avatarContainer
          }
        >
          {renderAvatar(
            item
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
                styles.nameSection
              }
            >
              <Text
                style={[
                  styles.chatName,

                  hasUnread &&
                    styles.unreadName,
                ]}
                numberOfLines={
                  1
                }
              >
                {
                  item.full_name
                }
              </Text>

              {item.is_mentor && (
                <Ionicons
                  name="star"
                  size={13}
                  color="#E5A500"
                />
              )}
            </View>

            <Text
              style={[
                styles.chatTime,

                hasUnread &&
                  styles.unreadTime,
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
            <View
              style={[
                styles.roleBadge,

                item.role ===
                  "alumni" &&
                  styles.alumniBadge,

                item.role ===
                  "business" &&
                  styles.businessBadge,

                item.role ===
                  "admin" &&
                  styles.adminBadge,
              ]}
            >
              <Ionicons
                name={
                  getRoleIcon(
                    item.role as UserRole
                  )
                }
                size={11}
                color="#555"
              />

              <Text
                style={
                  styles.roleText
                }
              >
                {getRoleLabel(
                  item.role as UserRole
                )}
              </Text>
            </View>

            {item.is_mentor && (
              <View
                style={
                  styles.mentorBadge
                }
              >
                <Text
                  style={
                    styles.mentorText
                  }
                >
                  Mentor
                </Text>
              </View>
            )}

            {item.blocked && (
              <View
                style={
                  styles.blockedBadge
                }
              >
                <Ionicons
                  name="ban-outline"
                  size={10}
                  color="#A33"
                />

                <Text
                  style={
                    styles.blockedBadgeText
                  }
                >
                  Blocked
                </Text>
              </View>
            )}
          </View>

          <View
            style={
              styles.chatBottomRow
            }
          >
            <Text
              style={[
                styles.lastMessage,

                hasUnread &&
                  styles.unreadMessage,

                item.blocked &&
                  styles.blockedMessage,
              ]}
              numberOfLines={
                1
              }
            >
              {item.blocked
                ? "You blocked this user"
                : item.last_message ||
                  "Start the conversation"}
            </Text>

            {hasUnread &&
              !item.blocked && (
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
                    {unreadCount >
                    99
                      ? "99+"
                      : unreadCount}
                  </Text>
                </View>
              )}

            <Pressable
              hitSlop={12}
              style={
                styles.moreButton
              }
              onPress={event => {
                event.stopPropagation();

                openChatOptions(
                  item
                );
              }}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={19}
                color="#8A8A94"
              />
            </Pressable>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="dark-content"
      />

      <View
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
              Messages
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Stay connected
            </Text>
          </View>

          <View
            style={
              styles.headerActions
            }
          >
            <TouchableOpacity
              style={
                styles.requestsButton
              }
              activeOpacity={0.7}
              onPress={
                openRequests
              }
            >
              <Ionicons
                name="people-outline"
                size={22}
                color="#222"
              />

              {requestCount >
                0 && (
                <View
                  style={
                    styles.requestBadge
                  }
                >
                  <Text
                    style={
                      styles.requestBadgeText
                    }
                  >
                    {requestCount >
                    99
                      ? "99+"
                      : requestCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.newButton
              }
              activeOpacity={0.8}
              onPress={() => {
                /*
                  We will connect this
                  to user discovery /
                  new message requests
                  next.
                */
                Alert.alert(
                  "New conversation",
                  "Student and alumni discovery will be connected here next."
                );
              }}
            >
              <Ionicons
                name="create-outline"
                size={21}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={
            styles.searchContainer
          }
        >
          <Ionicons
            name="search-outline"
            size={20}
            color="#777782"
          />

          <TextInput
            value={search}
            onChangeText={
              setSearch
            }
            placeholder="Search messages"
            placeholderTextColor="#8b8b96"
            style={
              styles.searchInput
            }
          />

          {search.length >
            0 && (
            <Pressable
              hitSlop={10}
              onPress={() =>
                setSearch("")
              }
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#A4A4AD"
              />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="small"
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
        ) : (
          <FlatList
            data={filteredChats}

            ListHeaderComponent={() =>
              renderAIAssistant(router)
            }
            keyExtractor={item =>
              item.conversation_id
            }
            renderItem={
              renderChat
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  refreshEverything
                }
                tintColor={
                  PRIMARY
                }
              />
            }
            contentContainerStyle={
              filteredChats.length ===
              0
                ? styles.emptyListContent
                : styles.listContent
            }
            ListEmptyComponent={
              <View
                style={
                  styles.emptyContainer
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
                        : "chatbubbles-outline"
                    }
                    size={35}
                    color={PRIMARY}
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  {search
                    ? "No results"
                    : "No conversations"}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {search
                    ? "No conversations match your search."
                    : "Accepted conversations with students and alumni will appear here."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <Modal
        visible={
          optionsVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeOptions
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={
            closeOptions
          }
        >
          <Pressable
            style={
              styles.optionsSheet
            }
            onPress={event =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.modalHandle
              }
            />

            {selectedChat && (
              <>
                <View
                  style={
                    styles.optionProfile
                  }
                >
                  {selectedChat.avatar_url ? (
                    <Image
                      source={{
                        uri:
                          selectedChat.avatar_url,
                      }}
                      style={
                        styles.optionAvatar
                      }
                    />
                  ) : (
                    <View
                      style={[
                        styles.optionAvatar,
                        styles.avatarFallback,
                      ]}
                    >
                      <Text
                        style={
                          styles.optionAvatarText
                        }
                      >
                        {getInitials(
                          selectedChat.full_name
                        )}
                      </Text>
                    </View>
                  )}

                  <View
                    style={
                      styles.optionProfileInfo
                    }
                  >
                    <Text
                      style={
                        styles.optionsTitle
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {
                        selectedChat.full_name
                      }
                    </Text>

                    <Text
                      style={
                        styles.optionsUsername
                      }
                    >
                      {selectedChat.username
                        ? `@${selectedChat.username}`
                        : getRoleLabel(
                            selectedChat.role as UserRole
                          )}
                    </Text>
                  </View>
                </View>

                {selectedChat.role ===
                  "alumni" && (
                  <Pressable
                    style={
                      styles.optionRow
                    }
                    disabled={
                      updatingMentor
                    }
                    onPress={
                      toggleMentor
                    }
                  >
                    {updatingMentor ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          PRIMARY
                        }
                      />
                    ) : (
                      <Ionicons
                        name={
                          selectedChat.is_mentor
                            ? "star"
                            : "star-outline"
                        }
                        size={22}
                        color={
                          PRIMARY
                        }
                      />
                    )}

                    <View
                      style={
                        styles.optionInfo
                      }
                    >
                      <Text
                        style={
                          styles.optionTitle
                        }
                      >
                        {selectedChat.is_mentor
                          ? "Remove mentor label"
                          : "Label as mentor"}
                      </Text>

                      <Text
                        style={
                          styles.optionSubtitle
                        }
                      >
                        {selectedChat.is_mentor
                          ? "Remove this alumni member from your mentors"
                          : "Mark this alumni member as one of your mentors"}
                      </Text>
                    </View>
                  </Pressable>
                )}

                <Pressable
                  style={
                    styles.optionRow
                  }
                  onPress={() =>
                    openConversation(
                      selectedChat
                    )
                  }
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={22}
                    color="#333"
                  />

                  <View
                    style={
                      styles.optionInfo
                    }
                  >
                    <Text
                      style={
                        styles.optionTitle
                      }
                    >
                      Open conversation
                    </Text>

                    <Text
                      style={
                        styles.optionSubtitle
                      }
                    >
                      View messages and conversation options
                    </Text>
                  </View>
                </Pressable>

                {selectedChat.blocked && (
                  <View
                    style={
                      styles.blockedInfo
                    }
                  >
                    <Ionicons
                      name="ban-outline"
                      size={17}
                      color="#A33"
                    />

                    <Text
                      style={
                        styles.blockedInfoText
                      }
                    >
                      You have blocked this user.
                      Open the conversation to unblock them.
                    </Text>
                  </View>
                )}
              </>
            )}

            <Pressable
              style={
                styles.cancelOption
              }
              onPress={
                closeOptions
              }
            >
              <Text
                style={
                  styles.cancelOptionText
                }
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#ffffff",
    },

    container: {
      flex: 1,
      backgroundColor:
        "#ffffff",
    },

    header: {
      paddingHorizontal:
        20,
      paddingTop: 10,
      paddingBottom: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    title: {
      fontSize: 28,
      fontWeight: "800",
      color: "#111111",
    },

    subtitle: {
      marginTop: 3,
      fontSize: 14,
      color: "#777782",
    },

    requestsButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#F2F2F5",
      alignItems: "center",
      justifyContent:
        "center",
      position: "relative",
    },

    requestBadge: {
      position: "absolute",
      right: -4,
      top: -4,
      minWidth: 19,
      height: 19,
      paddingHorizontal: 4,
      borderRadius: 10,
      backgroundColor:
        "#E53935",
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        "#fff",
    },

    requestBadgeText: {
      color: "#fff",
      fontSize: 9,
      fontWeight: "800",
    },

    newButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    searchContainer: {
      height: 48,
      marginHorizontal:
        20,
      marginBottom: 8,
      borderRadius: 14,
      backgroundColor:
        "#F3F3F6",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal:
        14,
      gap: 8,
    },

    searchInput: {
      flex: 1,
      fontSize: 15,
      color: "#111111",
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingBottom: 60,
    },

    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: "#85858E",
    },

    listContent: {
      paddingBottom: 30,
    },

    emptyListContent: {
      flexGrow: 1,
      paddingBottom: 30,
    },

    aiCard: {
      marginHorizontal: 16,
      marginTop: 6,
      marginBottom: 18,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#E3E6EA",
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",

      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 2,
    },

    aiCardIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    aiCardInfo: {
      flex: 1,
    },

    aiCardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    aiCardTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#17212B",
    },

    aiCardBadge: {
      marginLeft: 7,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor: "#EEF0FF",
    },

    aiCardBadgeText: {
      fontSize: 8,
      fontWeight: "800",
      color: PRIMARY,
    },

    aiCardSubtitle: {
      marginTop: 4,
      fontSize: 11,
      color: "#66717B",
    },

    aiPrivateRow: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
    },

    aiPrivateText: {
      marginLeft: 4,
      fontSize: 9.5,
      color: "#8A939C",
    },

    chatItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal:
        20,
      paddingVertical: 14,
    },

    avatarContainer: {
      position: "relative",
      marginRight: 13,
    },

    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor:
        "#EEEEEE",
    },

    avatarFallback: {
      backgroundColor:
        "#ECECFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    avatarInitials: {
      color: PRIMARY,
      fontSize: 17,
      fontWeight: "800",
    },

    onlineDot: {
      position: "absolute",
      right: 1,
      bottom: 1,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor:
        "#20C76B",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },
    aiIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: "#243447",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    aiTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    aiTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#17212B",
    },

    aiBadge: {
      marginLeft: 7,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor: "#EEF2F5",
    },

    aiBadgeText: {
      fontSize: 8,
      fontWeight: "800",
      color: "#243447",
    },

    aiSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: "#5F6B76",
    },

    localRow: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
    },

    localText: {
      marginLeft: 4,
      fontSize: 9.5,
      color: "#8A949E",
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
      marginBottom: 4,
    },

    nameSection: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginRight: 8,
    },

    chatName: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: "700",
      color: "#15151A",
    },

    unreadName: {
      fontWeight: "800",
    },

    chatTime: {
      fontSize: 12,
      color: "#92929B",
    },

    unreadTime: {
      color: PRIMARY,
      fontWeight: "700",
    },

    roleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
      gap: 5,
    },

    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor:
        "#F1F1F3",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },

    alumniBadge: {
      backgroundColor:
        "#FFF4DA",
    },

    businessBadge: {
      backgroundColor:
        "#EAF3FF",
    },

    adminBadge: {
      backgroundColor:
        "#EEEAFE",
    },

    roleText: {
      fontSize: 10,
      color: "#555",
      fontWeight: "700",
    },

    mentorBadge: {
      backgroundColor:
        "#FFF6DB",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },

    mentorText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#A26B00",
    },

    blockedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor:
        "#FFF0F0",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },

    blockedBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#A33",
    },

    chatBottomRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    lastMessage: {
      flex: 1,
      fontSize: 14,
      color: "#85858E",
    },

    unreadMessage: {
      color: "#22222A",
      fontWeight: "600",
    },

    blockedMessage: {
      fontStyle: "italic",
      color: "#A2A2AA",
    },

    unreadBadge: {
      minWidth: 21,
      height: 21,
      paddingHorizontal: 6,
      borderRadius: 11,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 8,
    },

    unreadText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },

    moreButton: {
      marginLeft: 8,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal:
        35,
      paddingBottom: 70,
    },

    emptyIcon: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      marginTop: 15,
      fontSize: 18,
      fontWeight: "800",
      color: "#222222",
    },

    emptyText: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 19,
      color: "#85858E",
      textAlign: "center",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.35)",
      justifyContent:
        "flex-end",
    },

    optionsSheet: {
      backgroundColor:
        "#FFFFFF",
      borderTopLeftRadius:
        24,
      borderTopRightRadius:
        24,
      paddingHorizontal:
        20,
      paddingTop: 12,
      paddingBottom: 32,
    },

    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor:
        "#D3D3D8",
      alignSelf: "center",
      borderRadius: 2,
      marginBottom: 20,
    },

    optionProfile: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },

    optionAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        "#EEEEEE",
    },

    optionAvatarText: {
      color: PRIMARY,
      fontSize: 15,
      fontWeight: "800",
    },

    optionProfileInfo: {
      flex: 1,
      marginLeft: 12,
    },

    optionsTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#171717",
    },

    optionsUsername: {
      marginTop: 2,
      fontSize: 12,
      color: "#888",
    },

    optionRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEEEF1",
    },

    optionInfo: {
      marginLeft: 14,
      flex: 1,
    },

    optionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
    },

    optionSubtitle: {
      fontSize: 11,
      color: "#888",
      marginTop: 3,
      lineHeight: 15,
    },

    blockedInfo: {
      marginTop: 14,
      borderRadius: 10,
      backgroundColor:
        "#FFF2F2",
      padding: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    blockedInfoText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: "#8D3B3B",
    },

    cancelOption: {
      marginTop: 16,
      height: 48,
      borderRadius: 12,
      backgroundColor:
        "#F3F3F5",
      alignItems: "center",
      justifyContent:
        "center",
    },

    cancelOptionText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#333",
    },
  });