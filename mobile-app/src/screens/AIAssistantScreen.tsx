import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
} from "expo-router";

import {
  bootstrapAI,
  streamAIMessage,
} from "../ai/api/AIService";

import type {
  AIMessage,
  AIRole,
  AIUsage,
} from "../ai/types/ai";

import AIVoiceButton from "../components/ai/AIVoiceButton";

import {
  getSpeechEnabled,
  setSpeechEnabled,
  speakText,
  stopSpeaking,
} from "../ai/voice/TextToSpeech";

const PRIMARY =
  "#0300cf";

function createLocalId(
  prefix:
    string
) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export default function AIChatScreen() {
  const listRef =
    useRef<
      FlatList<AIMessage>
    >(null);

  const [
    messages,
    setMessages,
  ] =
    useState<
      AIMessage[]
    >([]);

  const [
    input,
    setInput,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    firstName,
    setFirstName,
  ] =
    useState(
      "User"
    );

  const [
    role,
    setRole,
  ] =
    useState<
      AIRole | null
    >(null);

  const [
    conversationId,
    setConversationId,
  ] =
    useState<
      string | null
    >(null);

  const [
    usage,
    setUsage,
  ] =
    useState<
      AIUsage
    >({
      used: 0,
      limit: 0,
      remaining: 0,
    });

  const [
    speechOn,
    setSpeechOn,
  ] =
    useState(
      getSpeechEnabled()
    );

  const loadAssistant =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          const data =
            await bootstrapAI();

          setRole(
            data.role
          );

          setFirstName(
            data.firstName ||
              "User"
          );

          setConversationId(
            data.conversationId
          );

          setMessages(
            data.messages ||
              []
          );

          setUsage(
            data.usage
          );
        } catch (
          error: any
        ) {
          console.log(
            "AI bootstrap error:",
            error
          );

          Alert.alert(
            "Richfield AI",
            error?.message ||
              "Could not load Richfield AI."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(
    () => {
      void loadAssistant();

      return () => {
        void stopSpeaking();
      };
    },
    [
      loadAssistant,
    ]
  );

  useEffect(
    () => {
      if (
        messages.length ===
        0
      ) {
        return;
      }

      const timer =
        setTimeout(
          () => {
            listRef.current
              ?.scrollToEnd({
                animated:
                  true,
              });
          },
          80
        );

      return () =>
        clearTimeout(
          timer
        );
    },
    [
      messages,
    ]
  );

  function toggleSpeech() {
    const next =
      !speechOn;

    setSpeechOn(
      next
    );

    setSpeechEnabled(
      next
    );

    if (!next) {
      void stopSpeaking();
    }
  }

  async function sendMessage(
    value?:
      string
  ) {
    const message =
      (
        value ??
        input
      ).trim();

    if (
      !message ||
      sending
    ) {
      return;
    }

    if (
      usage.limit >
        0 &&
      usage.remaining <=
        0
    ) {
      Alert.alert(
        "Daily limit reached",
        `You've used today's ${usage.limit} Richfield AI messages.`
      );

      return;
    }

    const userMessage:
      AIMessage = {
      id:
        createLocalId(
          "user"
        ),

      role:
        "user",

      content:
        message,

      created_at:
        new Date()
          .toISOString(),
    };

    const assistantId =
      createLocalId(
        "assistant"
      );

    const assistantMessage:
      AIMessage = {
      id:
        assistantId,

      role:
        "assistant",

      content:
        "",

      created_at:
        new Date()
          .toISOString(),
    };

    setInput(
      ""
    );

    setSending(
      true
    );

    setMessages(
      current => [
        ...current,
        userMessage,
        assistantMessage,
      ]
    );

    let fullResponse =
      "";

    try {
      await streamAIMessage({
        message,

        conversationId,

        onStart:
          newConversationId => {
            setConversationId(
              newConversationId
            );
          },

        onDelta:
          delta => {
            fullResponse +=
              delta;

            setMessages(
              current =>
                current.map(
                  item =>
                    item.id ===
                    assistantId
                      ? {
                          ...item,

                          content:
                            item.content +
                            delta,
                        }
                      : item
                )
            );
          },

        onDone:
          event => {
            setConversationId(
              event.conversationId
            );

            setUsage(
              event.usage
            );
          },
      });

      if (
        speechOn &&
        fullResponse.trim()
      ) {
        await speakText(
          fullResponse
        );
      }
    } catch (
      error: any
    ) {
      console.log(
        "AI message error:",
        error
      );

      setMessages(
        current =>
          current.filter(
            item =>
              item.id !==
              assistantId
          )
      );

      Alert.alert(
        "Richfield AI",
        error?.message ||
          "Richfield AI could not respond."
      );
    } finally {
      setSending(
        false
      );
    }
  }

  function handleTranscript(
    transcript:
      string
  ) {
    const clean =
      transcript.trim();

    if (!clean) {
      return;
    }

    setInput(
      clean
    );
  }

  function renderMessage({
    item,
  }: {
    item:
      AIMessage;
  }) {
    const isUser =
      item.role ===
      "user";

    return (
      <View
        style={[
          styles.messageRow,

          isUser
            ? styles.userMessageRow
            : styles.aiMessageRow,
        ]}
      >
        {!isUser && (
          <View
            style={
              styles.aiAvatar
            }
          >
            <Ionicons
              name="sparkles"
              size={15}
              color="#fff"
            />
          </View>
        )}

        <View
          style={[
            styles.bubble,

            isUser
              ? styles.userBubble
              : styles.aiBubble,
          ]}
        >
          {!isUser && (
            <Text
              style={
                styles.aiName
              }
            >
              Richfield AI
            </Text>
          )}

          {item.content ? (
            <Text
              style={[
                styles.messageText,

                isUser
                  ? styles.userMessageText
                  : styles.aiMessageText,
              ]}
            >
              {
                item.content
              }
            </Text>
          ) : (
            <View
              style={
                styles.typingRow
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  PRIMARY
                }
              />

              <Text
                style={
                  styles.typingText
                }
              >
                Thinking...
              </Text>
            </View>
          )}

          {!isUser &&
            item.content && (
              <Pressable
                style={
                  styles.speakButton
                }
                onPress={() =>
                  void speakText(
                    item.content
                  )
                }
              >
                <Ionicons
                  name="volume-medium-outline"
                  size={16}
                  color={
                    PRIMARY
                  }
                />

                <Text
                  style={
                    styles.speakText
                  }
                >
                  Listen
                </Text>
              </Pressable>
            )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingScreen
        }
      >
        <View
          style={
            styles.loadingLogo
          }
        >
          <Ionicons
            name="sparkles"
            size={29}
            color="#fff"
          />
        </View>

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
          Loading Richfield AI...
        </Text>
      </SafeAreaView>
    );
  }

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
      <KeyboardAvoidingView
        style={{
          flex: 1,
        }}
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
      >
        <View
          style={
            styles.header
          }
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
              name="chevron-back"
              size={25}
              color="#15151A"
            />
          </Pressable>

          <View
            style={
              styles.headerAvatar
            }
          >
            <Ionicons
              name="sparkles"
              size={19}
              color="#fff"
            />
          </View>

          <View
            style={
              styles.headerContent
            }
          >
            <View
              style={
                styles.headerNameRow
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                Richfield AI
              </Text>

              <View
                style={
                  styles.aiBadge
                }
              >
                <Text
                  style={
                    styles.aiBadgeText
                  }
                >
                  AI
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {role
                ? `${
                    role
                      .charAt(0)
                      .toUpperCase() +
                    role.slice(
                      1
                    )
                  } assistant`
                : "Campus assistant"}
            </Text>
          </View>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={
              toggleSpeech
            }
          >
            <Ionicons
              name={
                speechOn
                  ? "volume-high-outline"
                  : "volume-mute-outline"
              }
              size={21}
              color={
                speechOn
                  ? PRIMARY
                  : "#777"
              }
            />
          </Pressable>
        </View>

        <View
          style={
            styles.usageBar
          }
        >
          <View>
            <Text
              style={
                styles.welcomeText
              }
            >
              Hi {firstName} 👋
            </Text>

            <Text
              style={
                styles.usageDescription
              }
            >
              Ask about careers, your profile,
              opportunities or Richfield Connect.
            </Text>
          </View>

          {usage.limit >
            0 && (
            <View
              style={
                styles.usageBadge
              }
            >
              <Text
                style={
                  styles.usageBadgeText
                }
              >
                {
                  usage.remaining
                }
                /
                {
                  usage.limit
                }
              </Text>
            </View>
          )}
        </View>

        <FlatList
          ref={
            listRef
          }
          data={
            messages
          }
          keyExtractor={
            item =>
              item.id
          }
          renderItem={
            renderMessage
          }
          contentContainerStyle={
            messages.length ===
            0
              ? styles.emptyList
              : styles.messageList
          }
          showsVerticalScrollIndicator={
            false
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
                  name="sparkles"
                  size={31}
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
                How can I help?
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                I can help with your career,
                professional profile, opportunities
                and the Richfield Connect platform.
              </Text>

              <View
                style={
                  styles.suggestions
                }
              >
                <Suggestion
                  text="Improve my profile"
                  onPress={() =>
                    void sendMessage(
                      "How can I improve my professional profile?"
                    )
                  }
                />

                <Suggestion
                  text="Career advice"
                  onPress={() =>
                    void sendMessage(
                      "Can you help me with my career direction?"
                    )
                  }
                />

                <Suggestion
                  text="Find opportunities"
                  onPress={() =>
                    void sendMessage(
                      "Can you find opportunities that match my profile?"
                    )
                  }
                />
              </View>
            </View>
          }
        />

        <View
          style={
            styles.composerArea
          }
        >
          <View
            style={
              styles.composer
            }
          >
            <AIVoiceButton
              disabled={
                sending
              }
              onTranscript={
                handleTranscript
              }
              onError={
                message =>
                  Alert.alert(
                    "Voice input",
                    message
                  )
              }
            />

            <TextInput
              value={
                input
              }
              onChangeText={
                setInput
              }
              placeholder="Message Richfield AI..."
              placeholderTextColor="#92929B"
              multiline
              maxLength={
                4000
              }
              editable={
                !sending
              }
              style={
                styles.input
              }
              onSubmitEditing={() =>
                void sendMessage()
              }
              blurOnSubmit={
                false
              }
            />

            <Pressable
              style={[
                styles.sendButton,

                (!input.trim() ||
                  sending) &&
                  styles.sendButtonDisabled,
              ]}
              disabled={
                !input.trim() ||
                sending
              }
              onPress={() =>
                void sendMessage()
              }
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color="#fff"
                />
              )}
            </Pressable>
          </View>

          <Text
            style={
              styles.disclaimer
            }
          >
            Richfield AI can make mistakes. Check
            important information before acting on it.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Suggestion({
  text,
  onPress,
}: {
  text:
    string;

  onPress:
    () => void;
}) {
  return (
    <Pressable
      style={
        styles.suggestion
      }
      onPress={
        onPress
      }
    >
      <Text
        style={
          styles.suggestionText
        }
      >
        {text}
      </Text>

      <Ionicons
        name="arrow-forward"
        size={15}
        color={
          PRIMARY
        }
      />
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    loadingScreen: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
      gap: 14,
    },

    loadingLogo: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        PRIMARY,
      marginBottom: 4,
    },

    loadingText: {
      color: "#777",
      fontSize: 13,
    },

    header: {
      minHeight: 68,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEEEF2",
      backgroundColor:
        "#FFFFFF",
    },

    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    headerAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        PRIMARY,
      marginLeft: 2,
      marginRight: 10,
    },

    headerContent: {
      flex: 1,
    },

    headerNameRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
    },

    headerTitle: {
      color: "#15151A",
      fontSize: 16,
      fontWeight: "800",
    },

    headerSubtitle: {
      marginTop: 2,
      color: "#777782",
      fontSize: 10,
      fontWeight: "600",
    },

    aiBadge: {
      borderRadius: 5,
      backgroundColor:
        "#E9E8FF",
      paddingHorizontal: 6,
      paddingVertical: 2,
    },

    aiBadgeText: {
      color: PRIMARY,
      fontSize: 8,
      fontWeight: "900",
    },

    usageBar: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor:
        "#F8F8FF",
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEEEF5",
    },

    welcomeText: {
      color: "#26262C",
      fontSize: 12,
      fontWeight: "800",
    },

    usageDescription: {
      maxWidth: 290,
      marginTop: 2,
      color: "#777782",
      fontSize: 9,
      lineHeight: 13,
    },

    usageBadge: {
      minWidth: 48,
      height: 27,
      paddingHorizontal: 8,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#E9E8FF",
    },

    usageBadgeText: {
      color: PRIMARY,
      fontSize: 10,
      fontWeight: "900",
    },

    messageList: {
      paddingHorizontal: 14,
      paddingTop: 18,
      paddingBottom: 20,
    },

    emptyList: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
      paddingBottom: 20,
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
    },

    emptyTitle: {
      marginTop: 16,
      color: "#17171B",
      fontSize: 21,
      fontWeight: "900",
    },

    emptyText: {
      marginTop: 8,
      maxWidth: 310,
      color: "#777782",
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        "center",
    },

    suggestions: {
      width: "100%",
      marginTop: 22,
      gap: 8,
    },

    suggestion: {
      minHeight: 48,
      borderWidth: 1,
      borderColor:
        "#E6E6EE",
      borderRadius: 13,
      paddingHorizontal: 15,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      backgroundColor:
        "#FFFFFF",
    },

    suggestionText: {
      color: "#36363D",
      fontSize: 12,
      fontWeight: "700",
    },

    messageRow: {
      width: "100%",
      marginBottom: 14,
    },

    userMessageRow: {
      alignItems:
        "flex-end",
    },

    aiMessageRow: {
      alignItems:
        "flex-start",
      flexDirection:
        "row",
    },

    aiAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        PRIMARY,
      marginRight: 7,
      marginTop: 2,
    },

    bubble: {
      maxWidth: "82%",
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },

    userBubble: {
      backgroundColor:
        PRIMARY,
      borderBottomRightRadius: 5,
    },

    aiBubble: {
      backgroundColor:
        "#F2F2F5",
      borderBottomLeftRadius: 5,
    },

    aiName: {
      marginBottom: 5,
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "900",
    },

    messageText: {
      fontSize: 14,
      lineHeight: 20,
    },

    userMessageText: {
      color: "#FFFFFF",
    },

    aiMessageText: {
      color: "#242429",
    },

    typingRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      paddingVertical: 2,
    },

    typingText: {
      color: "#777",
      fontSize: 11,
    },

    speakButton: {
      marginTop: 8,
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
    },

    speakText: {
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "800",
    },

    composerArea: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom:
        Platform.OS ===
        "ios"
          ? 10
          : 8,
      borderTopWidth: 1,
      borderTopColor:
        "#EEEEF2",
      backgroundColor:
        "#FFFFFF",
    },

    composer: {
      minHeight: 48,
      maxHeight: 130,
      borderWidth: 1,
      borderColor:
        "#E1E1E6",
      borderRadius: 24,
      backgroundColor:
        "#F8F8FA",
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      paddingLeft: 5,
      paddingRight: 5,
      paddingVertical: 4,
    },

    input: {
      flex: 1,
      maxHeight: 110,
      minHeight: 38,
      paddingHorizontal: 7,
      paddingTop: 9,
      paddingBottom: 8,
      color: "#202025",
      fontSize: 14,
      lineHeight: 19,
    },

    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        PRIMARY,
    },

    sendButtonDisabled: {
      opacity: 0.35,
    },

    disclaimer: {
      marginTop: 5,
      color: "#A0A0A7",
      fontSize: 8,
      textAlign:
        "center",
    },
  });