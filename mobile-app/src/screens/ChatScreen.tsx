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

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { supabase } from "../lib/supabase";

import {
  archiveConversation,
  Conversation,
  hideConversation,
  labelMentor,
  loadConversations,
  loadRequests,
  removeMentorLabel,
  unarchiveConversation,
} from "../services/ChatService";

const PRIMARY = "#0300cf";

type UserRole =
  | "student"
  | "alumni"
  | "staff"
  | "business"
  | "admin";

type FilterType =
  | "active"
  | "archived";

function getRoleLabel(
  role: UserRole
) {
  switch (role) {
    case "student":
      return "Student";

    case "alumni":
      return "Alumni";

    case "staff":
      return "Staff";

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

    case "staff":
      return "people-outline";

    case "business":
      return "briefcase-outline";

    case "admin":
      return "shield-checkmark-outline";

    default:
      return "person-outline";
  }
}

function formatMessageTime(
  dateString: string | null
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

  if (
    date.getFullYear() ===
    now.getFullYear()
  ) {
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
  name: string | null
) {
  const value =
    name?.trim() || "";

  if (!value) {
    return "?";
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase()
    )
    .join("");
}

export default function ChatScreen() {
  const router =
    useRouter();

  const [search, setSearch] =
    useState("");

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<FilterType>(
      "active"
    );

  const [chats, setChats] =
    useState<Conversation[]>(
      []
    );

  const [loading, setLoading] =
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
    useState<Conversation | null>(
      null
    );

  const [
    optionsVisible,
    setOptionsVisible,
  ] =
    useState(false);

  const [
    processingOption,
    setProcessingOption,
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
            setLoading(false);
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
            requests?.length ||
              0
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
          setRefreshing(true);

          await Promise.all([
            fetchChats(false),
            fetchRequestCount(),
          ]);
        } finally {
          setRefreshing(false);
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
          () => {
            fetchChats(false);
          }
        )
        .subscribe();

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
          () => {
            fetchRequestCount();
          }
        )
        .subscribe();

    const membersChannel =
      supabase
        .channel(
          "chat-screen-members"
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
            fetchChats(false);
          }
        )
        .subscribe();

    const settingsChannel =
      supabase
        .channel(
          "chat-screen-settings"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "conversation_user_settings",
          },
          () => {
            fetchChats(false);
          }
        )
        .subscribe();

    const blockChannel =
      supabase
        .channel(
          "chat-screen-blocks"
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
            fetchChats(false);
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        messagesChannel
      );

      supabase.removeChannel(
        requestsChannel
      );

      supabase.removeChannel(
        membersChannel
      );

      supabase.removeChannel(
        settingsChannel
      );

      supabase.removeChannel(
        blockChannel
      );
    };
  }, [
    fetchChats,
    fetchRequestCount,
  ]);

  const activeCount =
    useMemo(
      () =>
        chats.filter(
          (chat) =>
            !chat.archived
        ).length,
      [chats]
    );

  const archivedCount =
    useMemo(
      () =>
        chats.filter(
          (chat) =>
            chat.archived
        ).length,
      [chats]
    );

  const filteredChats =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return chats.filter(
        (chat) => {
          const correctFolder =
            selectedFilter ===
            "archived"
              ? chat.archived
              : !chat.archived;

          if (!correctFolder) {
            return false;
          }

          if (!value) {
            return true;
          }

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

          const message =
            chat.last_message
              ?.toLowerCase() ||
            "";

          return (
            name.includes(value) ||
            username.includes(
              value
            ) ||
            role.includes(value) ||
            message.includes(
              value
            )
          );
        }
      );
    }, [
      chats,
      search,
      selectedFilter,
    ]);

  function openConversation(
    chat: Conversation
  ) {
    setOptionsVisible(false);
    setSelectedChat(null);

    router.push({
      pathname:
        "/conversation",

      params: {
        id:
          chat.conversation_id,

        conversationId:
          chat.conversation_id,

        userId:
          chat.user_id,

        otherUserId:
          chat.user_id,

        name:
          chat.full_name ||
          "Richfield Member",

        username:
          chat.username || "",

        image:
          chat.avatar_url || "",

        role:
          chat.role ||
          "student",

        online:
          chat.online
            ? "true"
            : "false",

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
      "/requests"
    );
  }

  function openOptions(
    chat: Conversation
  ) {
    setSelectedChat(chat);
    setOptionsVisible(true);
  }

  function closeOptions() {
    if (processingOption) {
      return;
    }

    setOptionsVisible(false);
    setSelectedChat(null);
  }

  async function handleArchive() {
    if (
      !selectedChat ||
      processingOption
    ) {
      return;
    }

    try {
      setProcessingOption(true);

      if (
        selectedChat.archived
      ) {
        await unarchiveConversation(
          selectedChat.conversation_id
        );
      } else {
        await archiveConversation(
          selectedChat.conversation_id
        );
      }

      const conversationId =
        selectedChat.conversation_id;

      const newArchived =
        !selectedChat.archived;

      setChats(
        (current) =>
          current.map(
            (chat) =>
              chat.conversation_id ===
              conversationId
                ? {
                    ...chat,
                    archived:
                      newArchived,
                  }
                : chat
          )
      );

      setOptionsVisible(false);
      setSelectedChat(null);
    } catch (error) {
      console.log(
        "Archive error:",
        error
      );

      Alert.alert(
        "Conversation",
        error instanceof Error
          ? error.message
          : "Unable to update this conversation."
      );
    } finally {
      setProcessingOption(false);
    }
  }

  function handleDeleteFromChats() {
    if (
      !selectedChat ||
      processingOption
    ) {
      return;
    }

    const chat =
      selectedChat;

    Alert.alert(
      "Delete from my chats?",
      `This will remove your conversation with ${
        chat.full_name ||
        "this member"
      } from your chat list. It will not delete it for the other person.`,
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
                setProcessingOption(
                  true
                );

                await hideConversation(
                  chat.conversation_id
                );

                setChats(
                  (current) =>
                    current.filter(
                      (item) =>
                        item.conversation_id !==
                        chat.conversation_id
                    )
                );

                setOptionsVisible(
                  false
                );

                setSelectedChat(
                  null
                );
              } catch (error) {
                console.log(
                  "Hide conversation error:",
                  error
                );

                Alert.alert(
                  "Delete chat",
                  error instanceof Error
                    ? error.message
                    : "Unable to remove this conversation."
                );
              } finally {
                setProcessingOption(
                  false
                );
              }
            },
        },
      ]
    );
  }

  async function toggleMentor() {
    if (
      !selectedChat ||
      selectedChat.role !==
        "alumni" ||
      processingOption
    ) {
      return;
    }

    try {
      setProcessingOption(
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

      const conversationId =
        selectedChat.conversation_id;

      setChats(
        (current) =>
          current.map(
            (chat) =>
              chat.conversation_id ===
              conversationId
                ? {
                    ...chat,
                    is_mentor:
                      newValue,
                  }
                : chat
          )
      );

      setOptionsVisible(false);
      setSelectedChat(null);
    } catch (error) {
      console.log(
        "Mentor error:",
        error
      );

      Alert.alert(
        "Mentor",
        error instanceof Error
          ? error.message
          : "Unable to update mentor."
      );
    } finally {
      setProcessingOption(
        false
      );
    }
  }

  function renderAvatar(
    chat: Conversation
  ) {
    if (chat.avatar_url) {
      return (
        <Image
          source={{
            uri:
              chat.avatar_url,
          }}
          style={styles.avatar}
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
    const unread =
      Number(
        item.unread_count
      ) || 0;

    const hasUnread =
      unread > 0;

    const role =
      (item.role ||
        "student") as UserRole;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() =>
          openConversation(item)
        }
        onLongPress={() =>
          openOptions(item)
        }
      >
        <View
          style={
            styles.avatarContainer
          }
        >
          {renderAvatar(item)}

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
                numberOfLines={1}
              >
                {item.full_name ||
                  "Richfield Member"}
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
              style={
                styles.roleBadge
              }
            >
              <Ionicons
                name={
                  getRoleIcon(role)
                }
                size={11}
                color="#555"
              />

              <Text
                style={
                  styles.roleText
                }
              >
                {getRoleLabel(role)}
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
              styles.chatBottomRow
            }
          >
            <Text
              style={[
                styles.lastMessage,

                hasUnread &&
                  styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.blocked
                ? "Messaging unavailable"
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
                    {unread > 99
                      ? "99+"
                      : unread}
                  </Text>
                </View>
              )}

            <Pressable
              hitSlop={12}
              style={
                styles.moreButton
              }
              onPress={(event) => {
                event.stopPropagation();
                openOptions(item);
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
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
      />

      <View
        style={styles.container}
      >
        <View
          style={styles.header}
        >
          <View>
            <Text
              style={styles.title}
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
              onPress={() =>
                Alert.alert(
                  "New conversation",
                  "Open a member profile to send a connection request."
                )
              }
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
            placeholderTextColor="#8B8B96"
            style={
              styles.searchInput
            }
          />

          {search.length >
            0 && (
            <Pressable
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

        <View
          style={
            styles.filters
          }
        >
          <Pressable
            style={[
              styles.filterButton,

              selectedFilter ===
                "active" &&
                styles.activeFilter,
            ]}
            onPress={() =>
              setSelectedFilter(
                "active"
              )
            }
          >
            <Ionicons
              name="chatbubbles-outline"
              size={15}
              color={
                selectedFilter ===
                "active"
                  ? "#fff"
                  : "#555"
              }
            />

            <Text
              style={[
                styles.filterText,

                selectedFilter ===
                  "active" &&
                  styles.activeFilterText,
              ]}
            >
              Chats {activeCount}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,

              selectedFilter ===
                "archived" &&
                styles.activeFilter,
            ]}
            onPress={() =>
              setSelectedFilter(
                "archived"
              )
            }
          >
            <Ionicons
              name="archive-outline"
              size={15}
              color={
                selectedFilter ===
                "archived"
                  ? "#fff"
                  : "#555"
              }
            />

            <Text
              style={[
                styles.filterText,

                selectedFilter ===
                  "archived" &&
                  styles.activeFilterText,
              ]}
            >
              Archived {archivedCount}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
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
            data={
              filteredChats
            }
            keyExtractor={(
              item
            ) =>
              item.conversation_id
            }
            renderItem={
              renderChat
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
                ? styles.emptyList
                : styles.list
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
                      selectedFilter ===
                      "archived"
                        ? "archive-outline"
                        : "chatbubbles-outline"
                    }
                    size={34}
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
                    : selectedFilter ===
                      "archived"
                    ? "No archived chats"
                    : "No conversations"}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {search
                    ? "No conversations match your search."
                    : selectedFilter ===
                      "archived"
                    ? "Chats you archive will appear here."
                    : "Accepted conversations will appear here."}
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
              styles.sheet
            }
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.handle
              }
            />

            {selectedChat && (
              <>
                <View
                  style={
                    styles.sheetProfile
                  }
                >
                  {selectedChat.avatar_url ? (
                    <Image
                      source={{
                        uri:
                          selectedChat.avatar_url,
                      }}
                      style={
                        styles.sheetAvatar
                      }
                    />
                  ) : (
                    <View
                      style={[
                        styles.sheetAvatar,
                        styles.avatarFallback,
                      ]}
                    >
                      <Text
                        style={
                          styles.avatarInitials
                        }
                      >
                        {getInitials(
                          selectedChat.full_name
                        )}
                      </Text>
                    </View>
                  )}

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.sheetName
                      }
                    >
                      {selectedChat.full_name ||
                        "Richfield Member"}
                    </Text>

                    <Text
                      style={
                        styles.sheetRole
                      }
                    >
                      {getRoleLabel(
                        selectedChat.role
                      )}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={
                    styles.optionRow
                  }
                  disabled={
                    processingOption
                  }
                  onPress={() =>
                    openConversation(
                      selectedChat
                    )
                  }
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={21}
                    color="#333"
                  />

                  <Text
                    style={
                      styles.optionText
                    }
                  >
                    Open conversation
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.optionRow
                  }
                  disabled={
                    processingOption
                  }
                  onPress={
                    handleArchive
                  }
                >
                  <Ionicons
                    name={
                      selectedChat.archived
                        ? "arrow-undo-outline"
                        : "archive-outline"
                    }
                    size={21}
                    color="#333"
                  />

                  <Text
                    style={
                      styles.optionText
                    }
                  >
                    {selectedChat.archived
                      ? "Unarchive chat"
                      : "Archive chat"}
                  </Text>
                </Pressable>

                {selectedChat.role ===
                  "alumni" && (
                  <Pressable
                    style={
                      styles.optionRow
                    }
                    disabled={
                      processingOption
                    }
                    onPress={
                      toggleMentor
                    }
                  >
                    <Ionicons
                      name={
                        selectedChat.is_mentor
                          ? "star"
                          : "star-outline"
                      }
                      size={21}
                      color="#333"
                    />

                    <Text
                      style={
                        styles.optionText
                      }
                    >
                      {selectedChat.is_mentor
                        ? "Remove mentor label"
                        : "Label as mentor"}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.optionRow,
                    styles.deleteRow,
                  ]}
                  disabled={
                    processingOption
                  }
                  onPress={
                    handleDeleteFromChats
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={21}
                    color="#D53535"
                  />

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.deleteText
                      }
                    >
                      Delete from my chats
                    </Text>

                    <Text
                      style={
                        styles.deleteDescription
                      }
                    >
                      Only removes it from your chat list
                    </Text>
                  </View>
                </Pressable>

                {processingOption && (
                  <ActivityIndicator
                    style={{
                      marginTop: 14,
                    }}
                    color={PRIMARY}
                  />
                )}
              </>
            )}

            <Pressable
              style={
                styles.cancelButton
              }
              disabled={
                processingOption
              }
              onPress={
                closeOptions
              }
            >
              <Text
                style={
                  styles.cancelText
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
      backgroundColor: "#fff",
    },

    container: {
      flex: 1,
      backgroundColor: "#fff",
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    title: {
      fontSize: 28,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      marginTop: 3,
      color: "#777",
      fontSize: 13,
    },

    headerActions: {
      flexDirection: "row",
      gap: 9,
    },

    requestsButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#F2F2F5",
      alignItems: "center",
      justifyContent: "center",
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
      backgroundColor: "#E53935",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#fff",
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
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },

    searchContainer: {
      marginHorizontal: 20,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#F3F3F6",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: 8,
    },

    searchInput: {
      flex: 1,
      fontSize: 15,
      color: "#111",
    },

    filters: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 8,
    },

    filterButton: {
      height: 35,
      paddingHorizontal: 13,
      borderRadius: 18,
      backgroundColor: "#F1F1F4",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    activeFilter: {
      backgroundColor: PRIMARY,
    },

    filterText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#555",
    },

    activeFilterText: {
      color: "#fff",
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      marginTop: 9,
      fontSize: 12,
      color: "#888",
    },

    list: {
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,
    },

    chatItem: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 14,
      alignItems: "center",
    },

    avatarContainer: {
      position: "relative",
      marginRight: 13,
    },

    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#eee",
    },

    avatarFallback: {
      backgroundColor: "#ECECFF",
      alignItems: "center",
      justifyContent: "center",
    },

    avatarInitials: {
      color: PRIMARY,
      fontWeight: "800",
      fontSize: 16,
    },

    onlineDot: {
      position: "absolute",
      right: 1,
      bottom: 1,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#20C76B",
      borderWidth: 2,
      borderColor: "#fff",
    },

    chatContent: {
      flex: 1,
    },

    chatTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
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
      fontWeight: "900",
    },

    chatTime: {
      fontSize: 11,
      color: "#92929B",
    },

    unreadTime: {
      color: PRIMARY,
      fontWeight: "700",
    },

    roleRow: {
      flexDirection: "row",
      gap: 5,
      marginTop: 4,
      marginBottom: 6,
    },

    roleBadge: {
      flexDirection: "row",
      gap: 3,
      alignItems: "center",
      backgroundColor: "#F1F1F3",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },

    roleText: {
      fontSize: 9,
      color: "#555",
      fontWeight: "700",
    },

    mentorBadge: {
      backgroundColor: "#FFF6DB",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },

    mentorText: {
      fontSize: 9,
      color: "#A26B00",
      fontWeight: "700",
    },

    blockedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "#FFF0F0",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },

    blockedText: {
      color: "#A33",
      fontSize: 9,
      fontWeight: "700",
    },

    chatBottomRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    lastMessage: {
      flex: 1,
      fontSize: 13,
      color: "#85858E",
    },

    unreadMessage: {
      color: "#222",
      fontWeight: "600",
    },

    unreadBadge: {
      minWidth: 21,
      height: 21,
      paddingHorizontal: 5,
      borderRadius: 11,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 7,
    },

    unreadText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "800",
    },

    moreButton: {
      width: 30,
      height: 30,
      marginLeft: 5,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 35,
      paddingBottom: 70,
    },

    emptyIcon: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: "#EEEEFF",
      alignItems: "center",
      justifyContent: "center",
    },

    emptyTitle: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: "800",
      color: "#222",
    },

    emptyText: {
      marginTop: 6,
      fontSize: 12,
      color: "#888",
      textAlign: "center",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },

    sheet: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 30,
    },

    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#D4D4D9",
      alignSelf: "center",
      marginBottom: 18,
    },

    sheetProfile: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },

    sheetAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      marginRight: 12,
    },

    sheetName: {
      fontSize: 17,
      fontWeight: "800",
      color: "#171717",
    },

    sheetRole: {
      marginTop: 3,
      fontSize: 11,
      color: "#888",
    },

    optionRow: {
      minHeight: 58,
      borderBottomWidth: 1,
      borderBottomColor: "#EEEEF1",
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },

    optionText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
    },

    deleteRow: {
      borderBottomWidth: 0,
    },

    deleteText: {
      color: "#D53535",
      fontSize: 14,
      fontWeight: "700",
    },

    deleteDescription: {
      marginTop: 2,
      color: "#999",
      fontSize: 10,
    },

    cancelButton: {
      marginTop: 14,
      height: 47,
      borderRadius: 12,
      backgroundColor: "#F3F3F5",
      alignItems: "center",
      justifyContent: "center",
    },

    cancelText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#333",
    },
  });