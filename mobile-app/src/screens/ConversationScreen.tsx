import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { supabase } from "../lib/supabase";

import {
  blockUser,
  getCurrentUser,
  labelMentor,
  loadMessages,
  markConversationRead,
  Message,
  removeMentorLabel,
  sendMessage,
  unblockUser,
} from "../services/ChatService";

import ConversationOptions from
  "../components/chat/ConversationOptions";

const PRIMARY = "#0300cf";

type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

type ParticipantProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
};

function getInitials(name: string) {
  const value = name.trim();

  if (!value) {
    return "U";
  }

  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const listRef =
    useRef<FlatList<Message>>(null);

  const conversationId = String(
    params.id || ""
  );

  const routeOtherUserId = String(
    params.otherUserId ||
      params.userId ||
      ""
  );

  const routeName = String(
    params.name || "Conversation"
  );

  const routeUsername = String(
    params.username || ""
  );

  const routeImage = String(
    params.image || ""
  );

  const routeRole = String(
    params.role || "student"
  ) as UserRole;

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [otherUserId, setOtherUserId] =
    useState(routeOtherUserId);

  const [name, setName] =
    useState(routeName);

  const [username, setUsername] =
    useState(routeUsername);

  const [image, setImage] =
    useState(routeImage);

  const [role, setRole] =
    useState<UserRole>(routeRole);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [optionsVisible, setOptionsVisible] =
    useState(false);

  const [blocked, setBlocked] =
    useState(
      params.blocked === "true"
    );

  const [isMentor, setIsMentor] =
    useState(
      params.isMentor === "true"
    );

  const displayUsername = useMemo(
    () =>
      username
        ? username.replace(/^@/, "")
        : "",
    [username]
  );

  const loadParticipant = useCallback(
    async (
      myUserId: string
    ) => {
      try {
        const {
          data: members,
          error: membersError,
        } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq(
            "conversation_id",
            conversationId
          );

        if (membersError) {
          throw membersError;
        }

        const memberIds =
          (members || []).map(
            item => item.user_id
          );

        const participantId =
          memberIds.find(
            id => id !== myUserId
          ) || routeOtherUserId;

        if (!participantId) {
          return;
        }

        setOtherUserId(
          participantId
        );

        const {
          data: profileRows,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            avatar_url,
            role
          `)
          .eq("id", participantId)
          .limit(1);

        if (profileError) {
          throw profileError;
        }

        const profile =
          profileRows?.[0] as
            | ParticipantProfile
            | undefined;

        if (!profile) {
          return;
        }

        setName(
          profile.full_name ||
            routeName
        );

        setUsername(
          profile.username ||
            routeUsername
        );

        setImage(
          profile.avatar_url ||
            routeImage
        );

        setRole(
          profile.role ||
            routeRole
        );
      } catch (error) {
        console.log(
          "Participant load error:",
          error
        );
      }
    },
    [
      conversationId,
      routeOtherUserId,
      routeName,
      routeUsername,
      routeImage,
      routeRole,
    ]
  );

  const loadConversation = useCallback(
    async () => {
      try {
        if (!conversationId) {
          throw new Error(
            "Conversation ID is missing."
          );
        }

        setLoading(true);

        const user =
          await getCurrentUser();

        setCurrentUserId(
          user.id
        );

        await loadParticipant(
          user.id
        );

        const data =
          await loadMessages(
            conversationId
          );

        setMessages(data);

        await markConversationRead(
          conversationId
        );
      } catch (error) {
        console.log(
          "Load conversation error:",
          error
        );

        Alert.alert(
          "Conversation error",
          error instanceof Error
            ? error.message
            : "Unable to load conversation."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      conversationId,
      loadParticipant,
    ]
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    loadConversation();
  }, [
    conversationId,
    loadConversation,
  ]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(
        `conversation-${conversationId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter:
            `conversation_id=eq.${conversationId}`,
        },
        async payload => {
          const newMessage =
            payload.new as Message;

          setMessages(
            current => {
              const exists =
                current.some(
                  message =>
                    message.id ===
                    newMessage.id
                );

              if (exists) {
                return current;
              }

              return [
                ...current,
                newMessage,
              ];
            }
          );

          if (
            newMessage.sender_id !==
            currentUserId
          ) {
            try {
              await markConversationRead(
                conversationId
              );
            } catch (error) {
              console.log(
                "Mark read error:",
                error
              );
            }
          }

          setTimeout(() => {
            listRef.current
              ?.scrollToEnd({
                animated: true,
              });
          }, 100);
        }
      )
      .subscribe(status => {
        console.log(
          "Realtime status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    conversationId,
    currentUserId,
  ]);

  async function handleSend() {
    const cleaned =
      text.trim();

    if (
      !cleaned ||
      sending ||
      blocked ||
      !conversationId
    ) {
      return;
    }

    try {
      setSending(true);
      setText("");

      await sendMessage(
        conversationId,
        cleaned
      );

      const {
        error: conversationError,
      } = await supabase
        .from("conversations")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          conversationId
        );

      if (conversationError) {
        console.log(
          "Conversation timestamp error:",
          conversationError
        );
      }
    } catch (error) {
      console.log(
        "Send error:",
        error
      );

      setText(cleaned);

      Alert.alert(
        "Message failed",
        error instanceof Error
          ? error.message
          : "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }

  async function handleBlock() {
    if (!otherUserId) {
      Alert.alert(
        "Block user",
        "Unable to identify this user."
      );
      return;
    }

    try {
      if (blocked) {
        await unblockUser(
          otherUserId
        );

        setBlocked(false);
        return;
      }

      await blockUser(
        otherUserId
      );

      setBlocked(true);
    } catch (error) {
      Alert.alert(
        "Block error",
        error instanceof Error
          ? error.message
          : "Unable to update block."
      );
    }
  }

  async function handleMentor() {
    if (!otherUserId) {
      Alert.alert(
        "Mentor",
        "Unable to identify this user."
      );
      return;
    }

    try {
      if (isMentor) {
        await removeMentorLabel(
          otherUserId
        );

        setIsMentor(false);
        return;
      }

      await labelMentor(
        otherUserId
      );

      setIsMentor(true);
    } catch (error) {
      Alert.alert(
        "Mentor error",
        error instanceof Error
          ? error.message
          : "Unable to update mentor."
      );
    }
  }

  function openProfile() {
    if (!otherUserId) {
      return;
    }

    router.push({
      pathname: "../member/[id]",
      params: {
        id: otherUserId,
      },
    });
  }

  function renderMessage({
    item,
  }: {
    item: Message;
  }) {
    const mine =
      item.sender_id ===
      currentUserId;

    return (
      <View
        style={[
          styles.messageRow,
          mine &&
            styles.myMessageRow,
        ]}
      >
        <View
          style={[
            styles.bubble,
            mine
              ? styles.myBubble
              : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              mine &&
                styles.myMessageText,
            ]}
          >
            {item.body}
          </Text>

          <Text
            style={[
              styles.messageTime,
              mine &&
                styles.myMessageTime,
            ]}
          >
            {new Date(
              item.created_at
            ).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </Text>
        </View>
      </View>
    );
  }

  const initials =
    getInitials(name);

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View
          style={styles.header}
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
              size={23}
              color="#111"
            />
          </Pressable>

          <Pressable
            style={
              styles.profileHeader
            }
            onPress={openProfile}
          >
            {image ? (
              <Image
                source={{
                  uri: image,
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
                    styles.avatarFallbackText
                  }
                >
                  {initials}
                </Text>
              </View>
            )}

            <View
              style={
                styles.headerInfo
              }
            >
              <View
                style={
                  styles.nameRow
                }
              >
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {name}
                </Text>

                {isMentor && (
                  <Ionicons
                    name="star"
                    size={14}
                    color="#E0A000"
                  />
                )}
              </View>

              <Text
                style={styles.role}
                numberOfLines={1}
              >
                {role
                  .charAt(0)
                  .toUpperCase() +
                  role.slice(1)}

                {displayUsername
                  ? ` · @${displayUsername}`
                  : ""}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              setOptionsVisible(
                true
              )
            }
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color="#222"
            />
          </Pressable>
        </View>

        <View
          style={
            styles.securityNotice
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={13}
            color="#777"
          />

          <Text
            style={
              styles.securityText
            }
          >
            Protected conversation
          </Text>
        </View>

        {loading ? (
          <View
            style={styles.loading}
          >
            <ActivityIndicator
              color={PRIMARY}
            />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={
              item => item.id
            }
            renderItem={
              renderMessage
            }
            contentContainerStyle={[
              styles.messages,
              messages.length === 0 &&
                styles.emptyMessages,
            ]}
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              listRef.current
                ?.scrollToEnd({
                  animated: false,
                })
            }
            ListEmptyComponent={
              <View
                style={
                  styles.emptyConversation
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={30}
                    color={PRIMARY}
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Start the conversation
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Send a message to begin chatting.
                </Text>
              </View>
            }
          />
        )}

        {blocked && (
          <View
            style={
              styles.blockedNotice
            }
          >
            <Ionicons
              name="ban-outline"
              size={18}
              color="#A33"
            />

            <Text
              style={
                styles.blockedText
              }
            >
              You blocked this user.
            </Text>
          </View>
        )}

        <View
          style={styles.composer}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            editable={!blocked}
            placeholder={
              blocked
                ? "Unblock to send a message"
                : "Message..."
            }
            placeholderTextColor="#999"
            multiline
            maxLength={3000}
            style={styles.input}
          />

          <Pressable
            style={[
              styles.sendButton,
              (!text.trim() ||
                blocked ||
                sending) &&
                styles.sendDisabled,
            ]}
            disabled={
              !text.trim() ||
              blocked ||
              sending
            }
            onPress={handleSend}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#fff"
              />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color="#fff"
              />
            )}
          </Pressable>
        </View>

        <ConversationOptions
          visible={
            optionsVisible
          }
          name={name}
          role={role}
          blocked={blocked}
          isMentor={isMentor}
          onClose={() =>
            setOptionsVisible(
              false
            )
          }
          onBlock={handleBlock}
          onToggleMentor={
            handleMentor
          }
        />
      </KeyboardAvoidingView>
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
    },

    header: {
      height: 67,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "#EFEFF2",
      backgroundColor: "#fff",
    },

    headerButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },

    profileHeader: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      marginLeft: 4,
    },

    avatarFallback: {
      width: 42,
      height: 42,
      borderRadius: 21,
      marginLeft: 4,
      backgroundColor: "#EEEEFF",
      alignItems: "center",
      justifyContent: "center",
    },

    avatarFallbackText: {
      color: PRIMARY,
      fontSize: 13,
      fontWeight: "900",
    },

    headerInfo: {
      flex: 1,
      marginLeft: 10,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    name: {
      maxWidth: "90%",
      fontSize: 15,
      fontWeight: "800",
      color: "#161616",
    },

    role: {
      marginTop: 2,
      fontSize: 11,
      color: "#888",
      textTransform: "capitalize",
    },

    securityNotice: {
      alignSelf: "center",
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 9,
      backgroundColor: "#F4F4F6",
      flexDirection: "row",
      gap: 5,
      alignItems: "center",
    },

    securityText: {
      fontSize: 10,
      color: "#777",
    },

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    messages: {
      paddingHorizontal: 14,
      paddingVertical: 15,
      flexGrow: 1,
    },

    emptyMessages: {
      justifyContent: "center",
    },

    emptyConversation: {
      alignItems: "center",
      paddingHorizontal: 28,
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
      fontSize: 17,
      fontWeight: "900",
      color: "#222",
    },

    emptyText: {
      marginTop: 6,
      fontSize: 12,
      color: "#888",
      textAlign: "center",
    },

    messageRow: {
      flexDirection: "row",
      marginVertical: 4,
      justifyContent: "flex-start",
    },

    myMessageRow: {
      justifyContent: "flex-end",
    },

    bubble: {
      maxWidth: "80%",
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 17,
    },

    otherBubble: {
      backgroundColor: "#F0F0F3",
      borderBottomLeftRadius: 5,
    },

    myBubble: {
      backgroundColor: PRIMARY,
      borderBottomRightRadius: 5,
    },

    messageText: {
      fontSize: 14,
      lineHeight: 20,
      color: "#222",
    },

    myMessageText: {
      color: "#fff",
    },

    messageTime: {
      marginTop: 4,
      fontSize: 9,
      alignSelf: "flex-end",
      color: "#888",
    },

    myMessageTime: {
      color:
        "rgba(255,255,255,0.72)",
    },

    blockedNotice: {
      marginHorizontal: 15,
      marginBottom: 7,
      borderRadius: 10,
      backgroundColor: "#FFF0F0",
      padding: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 7,
    },

    blockedText: {
      color: "#943535",
      fontSize: 12,
      fontWeight: "600",
    },

    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor:
        "#EFEFF2",
      backgroundColor: "#fff",
    },

    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 22,
      backgroundColor: "#F2F2F5",
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 11,
      fontSize: 14,
      color: "#222",
    },

    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },

    sendDisabled: {
      opacity: 0.35,
    },
  });
