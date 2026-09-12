import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
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
  loadAIConversation,
  sendAIMessageWithStreaming,
} from "../ai/api/AIService";

import type {
  AIMessage,
  AIRole,
  AIUsage,
} from "../ai/types/ai";

import {
  setSpeechEnabled,
  speakText,
  stopSpeaking,
} from "../ai/voice/TextToSpeech";

import AIVoiceButton
  from "../components/ai/AIVoiceButton";

/* =========================================================
   COLORS
========================================================= */

const PRIMARY =
  "#0300CF";

const BACKGROUND =
  "#F6F7F9";

const TEXT =
  "#16181D";

const MUTED =
  "#727983";

const BORDER =
  "#E6E8EC";


function cleanAIText(
  text: string
) {
  if (!text) {
    return "";
  }

  return text
    // Remove markdown headings
    .replace(
      /^#{1,6}\s+/gm,
      ""
    )

    // Remove bold/italic markers
    .replace(
      /\*\*(.*?)\*\*/g,
      "$1"
    )
    .replace(
      /__(.*?)__/g,
      "$1"
    )
    .replace(
      /\*(.*?)\*/g,
      "$1"
    )

    // Convert markdown star bullets
    .replace(
      /^\s*\*\s+/gm,
      "• "
    )

    // Convert markdown dash bullets
    .replace(
      /^\s*-\s+/gm,
      "• "
    )

    // Remove horizontal rules
    .replace(
      /^\s*---+\s*$/gm,
      ""
    )

    // Remove backticks
    .replace(
      /`([^`]+)`/g,
      "$1"
    )

    // Remove leftover markdown characters
    .replace(
      /[*#`]/g,
      ""
    )

    // Stop huge empty gaps
    .replace(
      /\n{3,}/g,
      "\n\n"
    )

    .trim();
}

/* =========================================================
   QUICK ACTIONS
========================================================= */

const QUICK_ACTIONS: Record<
  AIRole,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    prompt: string;
  }[]
> = {
  student: [
    {
      label:
        "Improve profile",
      icon:
        "person-outline",
      prompt:
        "Help me improve my Richfield professional profile. Tell me what sections I should focus on first.",
    },

    {
      label:
        "Career advice",
      icon:
        "briefcase-outline",
      prompt:
        "Help me think about career paths that match an Information Technology student.",
    },

    {
      label:
        "CV help",
      icon:
        "document-text-outline",
      prompt:
        "Help me improve my CV for internships and graduate opportunities.",
    },

    {
      label:
        "Networking",
      icon:
        "people-outline",
      prompt:
        "Give me practical advice for networking professionally with alumni and recruiters.",
    },
  ],

  alumni: [
    {
      label:
        "Improve profile",
      icon:
        "person-outline",
      prompt:
        "Help me improve my alumni professional profile.",
    },

    {
      label:
        "Career growth",
      icon:
        "trending-up-outline",
      prompt:
        "Help me think through my next professional career step.",
    },

    {
      label:
        "Mentoring",
      icon:
        "people-outline",
      prompt:
        "Give me practical advice for mentoring Richfield students.",
    },

    {
      label:
        "Create a post",
      icon:
        "create-outline",
      prompt:
        "Help me write a useful professional post for students and alumni.",
    },
  ],

  business: [
    {
      label:
        "Company profile",
      icon:
        "business-outline",
      prompt:
        "Help me improve our business profile so it is clear and attractive to students and graduates.",
    },

    {
      label:
        "Create opportunity",
      icon:
        "briefcase-outline",
      prompt:
        "Help me draft a professional internship or graduate opportunity.",
    },

    {
      label:
        "Find talent",
      icon:
        "search-outline",
      prompt:
        "Help me define the skills I should look for when recruiting junior technology talent.",
    },

    {
      label:
        "Recruitment advice",
      icon:
        "people-outline",
      prompt:
        "Give me practical recruitment advice for attracting graduate talent.",
    },
  ],

  admin: [
    {
      label:
        "Announcement",
      icon:
        "megaphone-outline",
      prompt:
        "Help me draft a professional platform announcement.",
    },

    {
      label:
        "Create event",
      icon:
        "calendar-outline",
      prompt:
        "Help me draft a professional student or alumni event description.",
    },

    {
      label:
        "Moderation",
      icon:
        "shield-checkmark-outline",
      prompt:
        "Give me general guidance for handling content moderation fairly and consistently.",
    },

    {
      label:
        "Analytics",
      icon:
        "stats-chart-outline",
      prompt:
        "Explain which platform engagement metrics would be useful for an administrator to monitor.",
    },
  ],
};

/* =========================================================
   COMPONENT
========================================================= */

export default function AIAssistantScreen() {
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
    conversationId,
    setConversationId,
  ] =
    useState<
      string | null
    >(null);

  const [
    firstName,
    setFirstName,
  ] =
    useState(
      "there"
    );

  const [
    role,
    setRole,
  ] =
    useState<AIRole>(
      "student"
    );

  const [
    usage,
    setUsage,
  ] =
    useState<AIUsage>({
      used:
        0,

      limit:
        10,

      remaining:
        10,
    });

  const [
    input,
    setInput,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    sending,
    setSending,
  ] =
    useState(
      false
    );

  const [
    streaming,
    setStreaming,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    speechEnabled,
    setSpeechEnabledState,
  ] =
    useState(false);

  const [
    lastInputWasVoice,
    setLastInputWasVoice,
  ] =
    useState(false);

  /* =======================================================
     QUICK ACTIONS
  ======================================================= */

  const quickActions =
    useMemo(
      () =>
        QUICK_ACTIONS[
          role
        ] ||
        QUICK_ACTIONS
          .student,
      [
        role,
      ]
    );

  /* =======================================================
     BOOTSTRAP
  ======================================================= */

  useEffect(
    () => {
      setSpeechEnabled(false);
      setSpeechEnabledState(false);

      loadConversation();

      return () => {
        stopSpeaking();
      };
    },
    []
  );

  async function loadConversation() {
    try {
      setLoading(
        true
      );

      setError(
        null
      );

      const data =
        await loadAIConversation();

      setRole(
        data.role
      );

      setFirstName(
        data.firstName ||
          "there"
      );

      setConversationId(
        data
          .conversationId
      );

      setMessages(
        data.messages ||
          []
      );

      setUsage(
        data.usage
      );

      setTimeout(
        () => {
          listRef
            .current
            ?.scrollToEnd({
              animated:
                false,
            });
        },
        100
      );
    } catch (
      loadError:
        any
    ) {
      console.log(
        "AI bootstrap error:",
        loadError
      );

      setError(
        loadError
          ?.message ||
          "Could not load Richfield AI."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     SCROLL
  ======================================================= */

  function scrollToBottom() {
    requestAnimationFrame(
      () => {
        listRef
          .current
          ?.scrollToEnd({
            animated:
              true,
          });
      }
    );
  }

  /* =======================================================
     SEND
  ======================================================= */

  async function submitMessage(
    overrideMessage?: string,
    fromVoice: boolean = false
  ) {
    const messageText =
      (
        overrideMessage ??
        input
      ).trim();

    if (
      !messageText ||
      sending
    ) {
      return;
    }

    if (
      usage.remaining <=
      0
    ) {
      setError(
        "You have used today's Richfield AI allowance."
      );

      return;
    }

    stopSpeaking();

    setLastInputWasVoice(
      fromVoice
    );

    setInput(
      ""
    );

    setError(
      null
    );

    setSending(
      true
    );

    setStreaming(
      false
    );

    const userMessageId =
      `user-${Date.now()}`;

    const assistantMessageId =
      `assistant-${Date.now()}`;

    const optimisticUserMessage:
      AIMessage = {
        id:
          userMessageId,

        role:
          "user",

        content:
          messageText,

        created_at:
          new Date()
            .toISOString(),
      };

    const emptyAssistantMessage:
      AIMessage = {
        id:
          assistantMessageId,

        role:
          "assistant",

        content:
          "",

        created_at:
          new Date()
            .toISOString(),
      };

    setMessages(
      current => [
        ...current,
        optimisticUserMessage,
        emptyAssistantMessage,
      ]
    );

    setTimeout(
      scrollToBottom,
      50
    );

    let finalAssistantText =
      "";

    try {
      const result =
        await sendAIMessageWithStreaming(
          messageText,
          conversationId,
          {
            onStart:
              newConversationId => {
                setConversationId(
                  newConversationId
                );

                setStreaming(
                  true
                );
              },

            onDelta:
              delta => {
                finalAssistantText +=
                  delta;

                setStreaming(
                  true
                );

                setMessages(
                  current =>
                    current.map(
                      item =>
                        item.id ===
                        assistantMessageId
                          ? {
                              ...item,

                              content:
                                item.content +
                                delta,
                            }
                          : item
                    )
                );

                scrollToBottom();
              },

            onDone:
              (
                newUsage,
                newConversationId
              ) => {
                setUsage(
                  newUsage
                );

                setConversationId(
                  newConversationId
                );
              },
          }
        );

      setConversationId(
        result
          .conversationId
      );

      setUsage(
        result.usage
      );

      if (
        finalAssistantText.trim() &&
        (
          speechEnabled ||
          fromVoice
        )
      ) {
        speakText(
          cleanAIText(
            finalAssistantText
          )
        );
      }
    }catch (
      sendError: any
    ) {
      console.log(
        "AI send error:",
        sendError
      );

      setMessages(
        current =>
          current.filter(
            item =>
              item.id !==
                assistantMessageId &&
              item.id !==
                userMessageId
          )
      );

      setError(
        sendError?.message ||
        "Richfield AI could not respond."
      );

      setInput(
        messageText
      );

    } finally {
      setSending(
        false
      );

      setStreaming(
        false
      );
    }
  }

  /* =======================================================
     SPEECH
  ======================================================= */

  function toggleSpeech() {
    const next =
      !speechEnabled;

    setSpeechEnabledState(
      next
    );

    setSpeechEnabled(
      next
    );

    if (!next) {
      stopSpeaking();
    }
  }

  function listenToMessage(
    content:
      string
  ) {
    if (
      !content.trim()
    ) {
      return;
    }

    speakText(
      cleanAIText(
        content
      )
    );
  }

  /* =======================================================
     MESSAGE
  ======================================================= */

  function renderMessage({
    item,
  }: {
    item:
      AIMessage;
  }) {
    const isUser =
      item.role ===
      "user";

    const isStreamingMessage =
      !isUser &&
      sending &&
      item ===
        messages[
          messages.length -
            1
        ];

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
              styles.smallAIIcon
            }
          >
            <Ionicons
              name="sparkles"
              size={15}
              color="#FFFFFF"
            />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,

            isUser
              ? styles.userBubble
              : styles.aiBubble,
          ]}
        >
          {!isUser &&
          !item.content &&
          sending ? (
            <View
              style={
                styles.thinkingRow
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
                  styles.thinkingText
                }
              >
                Thinking...
              </Text>
            </View>
          ) : (
            <Text
              selectable
              style={[
                styles.messageText,

                isUser
                  ? styles.userMessageText
                  : styles.aiMessageText,
              ]}
            >
              {isUser
                ? item.content
                : cleanAIText(
                    item.content
                  )}

              {isStreamingMessage &&
              item.content ? (
                <Text
                  style={
                    styles.cursor
                  }
                >
                  ▌
                </Text>
              ) : null}
            </Text>
          )}

          {!isUser &&
          item.content &&
          !isStreamingMessage ? (
            <Pressable
              style={
                styles.listenButton
              }
              onPress={() =>
                listenToMessage(
                  item.content
                )
              }
            >
              <Ionicons
                name="volume-medium-outline"
                size={15}
                color={
                  MUTED
                }
              />

              <Text
                style={
                  styles.listenText
                }
              >
                Listen
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  function renderEmptyState() {
    if (
      loading
    ) {
      return null;
    }

    return (
      <View
        style={
          styles.emptyContainer
        }
      >
        <View
          style={
            styles.largeAIIcon
          }
        >
          <Ionicons
            name="sparkles"
            size={31}
            color="#FFFFFF"
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          Hi {firstName}
        </Text>

        <Text
          style={
            styles.emptySubtitle
          }
        >
          I'm Richfield AI. I can help with your profile, career, networking and professional growth.
        </Text>

        <Text
          style={
            styles.tryText
          }
        >
          Try asking
        </Text>

        <View
          style={
            styles.quickActions
          }
        >
          {quickActions.map(
            action => (
              <Pressable
                key={
                  action.label
                }
                style={
                  styles.quickAction
                }
                onPress={() =>
                  submitMessage(
                    action.prompt
                  )
                }
              >
                <Ionicons
                  name={
                    action.icon
                  }
                  size={18}
                  color={
                    PRIMARY
                  }
                />

                <Text
                  style={
                    styles.quickActionText
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

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
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
          <View
            style={
              styles.largeAIIcon
            }
          >
            <Ionicons
              name="sparkles"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <ActivityIndicator
            size="small"
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
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={[
        "top",
        "bottom",
      ]}
    >
      <KeyboardAvoidingView
        style={
          styles.container
        }
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
        keyboardVerticalOffset={
          0
        }
      >
        {/* HEADER */}

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
              color={
                TEXT
              }
            />
          </Pressable>

          <View
            style={
              styles.headerCenter
            }
          >
            <View
              style={
                styles.headerAIIcon
              }
            >
              <Ionicons
                name="sparkles"
                size={17}
                color="#FFFFFF"
              />
            </View>

            <View>
              <View
                style={
                  styles.headerTitleRow
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
                {streaming
                  ? "Responding..."
                  : "Career & profile assistant"}
              </Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.headerButton,

              speechEnabled &&
                styles.headerButtonActive,
            ]}
            onPress={
              toggleSpeech
            }
          >
            <Ionicons
              name={
                speechEnabled
                  ? "volume-high"
                  : "volume-mute-outline"
              }
              size={21}
              color={
                speechEnabled
                  ? PRIMARY
                  : MUTED
              }
            />
          </Pressable>
        </View>

        {/* USAGE */}

        <View
          style={
            styles.usageContainer
          }
        >
          <View
            style={
              styles.usageTopRow
            }
          >
            <Text
              style={
                styles.usageLabel
              }
            >
              Daily AI usage
            </Text>

            <Text
              style={
                styles.usageValue
              }
            >
              {usage.used}/{usage.limit}
            </Text>
          </View>

          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressFill,

                {
                  width:
                    `${
                      usage.limit >
                      0
                        ? Math.min(
                            (
                              usage.used /
                              usage.limit
                            ) *
                              100,
                            100
                          )
                        : 0
                    }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* ERROR */}

        {error ? (
          <Pressable
            style={
              styles.errorBox
            }
            onPress={() =>
              setError(
                null
              )
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color="#B42318"
            />

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>

            <Ionicons
              name="close"
              size={16}
              color="#B42318"
            />
          </Pressable>
        ) : null}

        {/* CHAT */}

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
          contentContainerStyle={[
            styles.messageList,

            messages.length ===
              0 &&
              styles.emptyList,
          ]}
          ListEmptyComponent={
            renderEmptyState
          }
          onContentSizeChange={
            () => {
              if (
                messages.length >
                0
              ) {
                scrollToBottom();
              }
            }
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        />

        {/* INPUT */}

        <View
          style={
            styles.inputSection
          }
        >
          <View
            style={
              styles.inputContainer
            }
          >
            <TextInput
              style={
                styles.input
              }
              value={
                input
              }
              onChangeText={
                setInput
              }
              placeholder={
                usage.remaining >
                0
                  ? "Message Richfield AI..."
                  : "Daily AI limit reached"
              }
              placeholderTextColor="#969DA5"
              multiline
              maxLength={
                4000
              }
              editable={
                !sending &&
                usage.remaining >
                  0
              }
              onFocus={
                scrollToBottom
              }
            />

            {!input.trim() ? (
              <AIVoiceButton
                disabled={
                  sending ||
                  usage.remaining <= 0
                }
                onTranscript={
                  transcript => {
                    setError(null);

                    setSpeechEnabledState(
                      true
                    );

                    setSpeechEnabled(
                      true
                    );

                    submitMessage(
                      transcript,
                      true
                    );
                  }
                }
                onError={
                  message =>
                    setError(
                      message
                    )
                }
              />
            ) : null}

            <Pressable
              style={[
                styles.sendButton,

                (
                  !input.trim() ||
                  sending ||
                  usage.remaining <=
                    0
                ) &&
                  styles.sendButtonDisabled,
              ]}
              disabled={
                !input.trim() ||
                sending ||
                usage.remaining <=
                  0
              }
              onPress={() =>
                submitMessage()
              }
            >
              {sending &&
              !streaming ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={21}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          </View>

          <View
            style={
              styles.inputFooter
            }
          >
            <Ionicons
              name="lock-closed-outline"
              size={11}
              color="#8B929A"
            />

            <Text
              style={
                styles.inputFooterText
              }
            >
              Private AI conversation
            </Text>

            <Text
              style={
                styles.inputFooterDot
              }
            >
              •
            </Text>

            <Text
              style={
                styles.inputFooterText
              }
            >
              {usage.remaining} messages left today
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
        "#FFFFFF",
    },

    container: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },

    header: {
      height: 66,
      backgroundColor:
        "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor:
        BORDER,
      paddingHorizontal: 12,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    headerButtonActive: {
      backgroundColor:
        "#EEEEFF",
    },

    headerCenter: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginHorizontal: 4,
    },

    headerAIIcon: {
      width: 39,
      height: 39,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    headerTitleRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerTitle: {
      fontSize: 16,
      fontWeight:
        "700",
      color:
        TEXT,
    },

    aiBadge: {
      backgroundColor:
        "#EEEEFF",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      marginLeft: 6,
    },

    aiBadgeText: {
      color:
        PRIMARY,
      fontSize: 9,
      fontWeight:
        "800",
    },

    headerSubtitle: {
      fontSize: 11,
      color:
        MUTED,
      marginTop: 2,
    },

    usageContainer: {
      paddingHorizontal: 18,
      paddingVertical: 9,
      backgroundColor:
        "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor:
        "#F0F1F3",
    },

    usageTopRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      marginBottom: 6,
    },

    usageLabel: {
      color:
        MUTED,
      fontSize: 11,
    },

    usageValue: {
      color:
        TEXT,
      fontSize: 11,
      fontWeight:
        "600",
    },

    progressTrack: {
      height: 3,
      backgroundColor:
        "#ECEEF1",
      borderRadius: 2,
      overflow:
        "hidden",
    },

    progressFill: {
      height: 3,
      backgroundColor:
        PRIMARY,
      borderRadius: 2,
    },

    errorBox: {
      marginHorizontal: 14,
      marginTop: 10,
      padding: 10,
      backgroundColor:
        "#FEF3F2",
      borderWidth: 1,
      borderColor:
        "#FECDCA",
      borderRadius: 10,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
    },

    errorText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color:
        "#B42318",
    },

    messageList: {
      paddingHorizontal: 14,
      paddingTop: 18,
      paddingBottom: 22,
    },

    emptyList: {
      flexGrow: 1,
    },

    messageRow: {
      flexDirection:
        "row",
      marginBottom: 15,
      alignItems:
        "flex-end",
    },

    userMessageRow: {
      justifyContent:
        "flex-end",
    },

    aiMessageRow: {
      justifyContent:
        "flex-start",
    },

    smallAIIcon: {
      width: 27,
      height: 27,
      borderRadius: 9,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 8,
      marginBottom: 2,
    },

    messageBubble: {
      maxWidth:
        "82%",
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },

    userBubble: {
      backgroundColor:
        PRIMARY,
      borderBottomRightRadius:
        5,
    },

    aiBubble: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        BORDER,
      borderBottomLeftRadius:
        5,
    },

    messageText: {
      fontSize: 14,
      lineHeight: 21,
    },

    userMessageText: {
      color:
        "#FFFFFF",
    },

    aiMessageText: {
      color:
        TEXT,
    },

    cursor: {
      color:
        PRIMARY,
      fontWeight:
        "700",
    },

    thinkingRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
    },

    thinkingText: {
      color:
        MUTED,
      fontSize: 13,
    },

    listenButton: {
      flexDirection:
        "row",
      alignItems:
        "center",
      alignSelf:
        "flex-start",
      marginTop: 9,
      gap: 4,
    },

    listenText: {
      fontSize: 11,
      color:
        MUTED,
      fontWeight:
        "500",
    },

    emptyContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 26,
      paddingBottom: 20,
    },

    largeAIIcon: {
      width: 62,
      height: 62,
      borderRadius: 20,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 16,
    },

    emptyTitle: {
      fontSize: 24,
      fontWeight:
        "700",
      color:
        TEXT,
      textAlign:
        "center",
    },

    emptySubtitle: {
      maxWidth: 340,
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color:
        MUTED,
      textAlign:
        "center",
    },

    tryText: {
      marginTop: 24,
      marginBottom: 10,
      fontSize: 12,
      color:
        MUTED,
      fontWeight:
        "600",
    },

    quickActions: {
      width:
        "100%",
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      justifyContent:
        "center",
      gap: 8,
    },

    quickAction: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        BORDER,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },

    quickActionText: {
      color:
        TEXT,
      fontSize: 12,
      fontWeight:
        "600",
    },

    loadingContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        BACKGROUND,
      gap: 11,
    },

    loadingText: {
      fontSize: 13,
      color:
        MUTED,
    },

    inputSection: {
      backgroundColor:
        "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor:
        BORDER,
      paddingHorizontal: 12,
      paddingTop: 9,
      paddingBottom: 5,
    },

    inputContainer: {
      minHeight: 48,
      maxHeight: 135,
      backgroundColor:
        "#F5F6F8",
      borderWidth: 1,
      borderColor:
        "#E2E4E8",
      borderRadius: 24,
      paddingLeft: 15,
      paddingRight: 5,
      flexDirection:
        "row",
      alignItems:
        "flex-end",
    },

    input: {
      flex: 1,
      minHeight: 45,
      maxHeight: 120,
      paddingTop: 12,
      paddingBottom: 11,
      paddingRight: 8,
      fontSize: 14,
      lineHeight: 19,
      color:
        TEXT,
    },

    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 4,
    },

    sendButtonDisabled: {
      opacity:
        0.35,
    },

    inputFooter: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingTop: 6,
      paddingBottom: 2,
      gap: 4,
    },

    inputFooterText: {
      color:
        "#8B929A",
      fontSize: 9,
    },

    inputFooterDot: {
      color:
        "#B5BAC0",
      fontSize: 9,
    },
  });