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
  Modal,
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

import * as Clipboard from "expo-clipboard";

import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

import { supabase } from "../lib/supabase";

import {
  archiveConversation,
  blockUser,
  deleteMessage,
  editMessage,
  getCurrentUser,
  hideConversation,
  labelMentor,
  loadMessages,
  markConversationRead,
  Message,
  removeMentorLabel,
  sendMessage,
  sendVoiceMessage,
  touchConversation,
  unblockUser,
} from "../services/ChatService";

import ConversationOptions from
  "../components/chat/ConversationOptions";

const PRIMARY = "#0300cf";

type UserRole =
  | "student"
  | "alumni"
  | "staff"
  | "business"
  | "admin";

type ParticipantProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
};

function getParam(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function getInitials(name: string) {
  const value = name.trim();

  if (!value) {
    return "U";
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function formatMessageTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "";
  }
}

function formatDuration(seconds: number) {
  const safe =
    Math.max(
      0,
      Math.floor(seconds || 0)
    );

  const minutes =
    Math.floor(safe / 60);

  const remaining =
    safe % 60;

  return `${minutes}:${String(
    remaining
  ).padStart(2, "0")}`;
}


/* =========================================================
   VOICE BUBBLE
========================================================= */

function VoiceBubble({
  message,
  mine,
}: {
  message: Message;
  mine: boolean;
}) {
  const [
    signedUrl,
    setSignedUrl,
  ] = useState<string | null>(
    null
  );

  const [
    loadingAudio,
    setLoadingAudio,
  ] = useState(true);

  const player =
    useAudioPlayer(
      signedUrl || null
    );

  const status =
    useAudioPlayerStatus(
      player
    );

  useEffect(() => {
    let active = true;

    async function loadUrl() {
      if (
        !message.media_path ||
        message.deleted_at
      ) {
        setLoadingAudio(false);
        return;
      }

      try {
        setLoadingAudio(true);

        const {
          data,
          error,
        } = await supabase.storage
          .from("chat-media")
          .createSignedUrl(
            message.media_path,
            60 * 60
          );

        if (error) {
          throw error;
        }

        if (active) {
          setSignedUrl(
            data.signedUrl
          );
        }
      } catch (error) {
        console.log(
          "Voice URL error:",
          error
        );
      } finally {
        if (active) {
          setLoadingAudio(false);
        }
      }
    }

    loadUrl();

    return () => {
      active = false;
    };
  }, [
    message.media_path,
    message.deleted_at,
  ]);

  async function togglePlay() {
    if (
      !signedUrl ||
      loadingAudio
    ) {
      return;
    }

    try {
      if (status.playing) {
        player.pause();
        return;
      }

      if (
        status.duration > 0 &&
        status.currentTime >=
          status.duration - 0.2
      ) {
        await player.seekTo(0);
      }

      player.play();
    } catch (error) {
      console.log(
        "Voice playback error:",
        error
      );
    }
  }

  const duration =
    status.duration > 0
      ? status.duration
      : message.voice_duration ||
        0;

  const progress =
    status.duration > 0
      ? Math.min(
          1,
          status.currentTime /
            status.duration
        )
      : 0;

  return (
    <View
      style={
        styles.voiceContainer
      }
    >
      <Pressable
        style={[
          styles.voicePlayButton,

          mine &&
            styles.myVoicePlayButton,
        ]}
        onPress={togglePlay}
        disabled={
          loadingAudio ||
          !signedUrl
        }
      >
        {loadingAudio ? (
          <ActivityIndicator
            size="small"
            color={
              mine
                ? PRIMARY
                : "#555"
            }
          />
        ) : (
          <Ionicons
            name={
              status.playing
                ? "pause"
                : "play"
            }
            size={17}
            color={
              mine
                ? PRIMARY
                : "#555"
            }
          />
        )}
      </Pressable>

      <View
        style={
          styles.voiceContent
        }
      >
        <View
          style={
            styles.waveform
          }
        >
          {Array.from({
            length: 22,
          }).map((_, index) => {
            const active =
              index / 22 <=
              progress;

            const height =
              7 +
              ((index * 7) %
                14);

            return (
              <View
                key={index}
                style={[
                  styles.waveBar,

                  {
                    height,
                  },

                  mine
                    ? active
                      ? styles.myWaveActive
                      : styles.myWaveInactive
                    : active
                    ? styles.waveActive
                    : styles.waveInactive,
                ]}
              />
            );
          })}
        </View>

        <Text
          style={[
            styles.voiceDuration,

            mine &&
              styles.myVoiceDuration,
          ]}
        >
          {formatDuration(
            duration
          )}
        </Text>
      </View>
    </View>
  );
}


/* =========================================================
   SCREEN
========================================================= */

export default function ConversationScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      id?: string | string[];
      conversationId?:
        | string
        | string[];
      userId?:
        | string
        | string[];
      otherUserId?:
        | string
        | string[];
      name?:
        | string
        | string[];
      username?:
        | string
        | string[];
      image?:
        | string
        | string[];
      role?:
        | string
        | string[];
      blocked?:
        | string
        | string[];
      isMentor?:
        | string
        | string[];
    }>();

  const listRef =
    useRef<FlatList<Message>>(
      null
    );

  const conversationId =
    getParam(
      params.conversationId
    ) ||
    getParam(params.id);

  const routeOtherUserId =
    getParam(
      params.otherUserId
    ) ||
    getParam(params.userId);

  const routeName =
    getParam(params.name) ||
    "Conversation";

  const routeUsername =
    getParam(
      params.username
    );

  const routeImage =
    getParam(params.image);

  const rawRole =
    getParam(params.role);

  const routeRole: UserRole =
    rawRole === "alumni" ||
    rawRole === "staff" ||
    rawRole === "business" ||
    rawRole === "admin"
      ? rawRole
      : "student";

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    otherUserId,
    setOtherUserId,
  ] = useState(
    routeOtherUserId
  );

  const [name, setName] =
    useState(routeName);

  const [
    username,
    setUsername,
  ] = useState(
    routeUsername
  );

  const [image, setImage] =
    useState(routeImage);

  const [role, setRole] =
    useState<UserRole>(
      routeRole
    );

  const [
    messages,
    setMessages,
  ] =
    useState<Message[]>([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [
    optionsVisible,
    setOptionsVisible,
  ] = useState(false);

  const [blocked, setBlocked] =
    useState(
      getParam(
        params.blocked
      ) === "true"
    );

  const [
    isMentor,
    setIsMentor,
  ] = useState(
    getParam(
      params.isMentor
    ) === "true"
  );

  /*
   * Message options.
   */
  const [
    selectedMessage,
    setSelectedMessage,
  ] =
    useState<Message | null>(
      null
    );

  const [
    messageOptionsVisible,
    setMessageOptionsVisible,
  ] = useState(false);

  const [
    editingMessage,
    setEditingMessage,
  ] =
    useState<Message | null>(
      null
    );

  const [
    editText,
    setEditText,
  ] = useState("");

  const [
    editModalVisible,
    setEditModalVisible,
  ] = useState(false);

  const [
    messageActionLoading,
    setMessageActionLoading,
  ] = useState(false);

  /*
   * Voice recording.
   */
  const audioRecorder =
    useAudioRecorder(
      RecordingPresets.HIGH_QUALITY
    );

  const recorderState =
    useAudioRecorderState(
      audioRecorder
    );

  const [
    recording,
    setRecording,
  ] = useState(false);

  const [
    sendingVoice,
    setSendingVoice,
  ] = useState(false);

  const displayUsername =
    useMemo(() => {
      if (!username) {
        return "";
      }

      return username.replace(
        /^@/,
        ""
      );
    }, [username]);


  /* =======================================================
     AUDIO CONFIG
  ======================================================= */

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    }).catch((error) => {
      console.log(
        "Audio mode error:",
        error
      );
    });
  }, []);


  /* =======================================================
     PARTICIPANT
  ======================================================= */

  const loadParticipant =
    useCallback(
      async (
        myUserId: string
      ) => {
        if (!conversationId) {
          return;
        }

        try {
          const {
            data: members,
            error:
              membersError,
          } = await supabase
            .from(
              "conversation_members"
            )
            .select("user_id")
            .eq(
              "conversation_id",
              conversationId
            );

          if (membersError) {
            throw membersError;
          }

          const participantId =
            (
              members || []
            ).find(
              (member) =>
                member.user_id !==
                myUserId
            )?.user_id ||
            routeOtherUserId;

          if (!participantId) {
            return;
          }

          setOtherUserId(
            participantId
          );

          const {
            data: profile,
            error:
              profileError,
          } = await supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              username,
              avatar_url,
              role
            `)
            .eq(
              "id",
              participantId
            )
            .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (!profile) {
            return;
          }

          const participant =
            profile as
              ParticipantProfile;

          setName(
            participant.full_name ||
              routeName
          );

          setUsername(
            participant.username ||
              routeUsername
          );

          setImage(
            participant.avatar_url ||
              routeImage
          );

          if (
            participant.role
          ) {
            setRole(
              participant.role
            );
          }
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
      ]
    );


  /* =======================================================
     BLOCK STATUS
  ======================================================= */

  const loadBlockStatus =
    useCallback(
      async (
        myUserId: string,
        participantId: string
      ) => {
        if (
          !myUserId ||
          !participantId
        ) {
          return;
        }

        try {
          const {
            data,
            error,
          } = await supabase
            .from(
              "blocked_users"
            )
            .select(
              "blocker_id,blocked_id"
            )
            .or(
              `and(blocker_id.eq.${myUserId},blocked_id.eq.${participantId}),and(blocker_id.eq.${participantId},blocked_id.eq.${myUserId})`
            );

          if (error) {
            throw error;
          }

          setBlocked(
            (data || [])
              .length > 0
          );
        } catch (error) {
          console.log(
            "Block status error:",
            error
          );
        }
      },
      []
    );


  /* =======================================================
     LOAD CONVERSATION
  ======================================================= */

  const loadConversation =
    useCallback(
      async () => {
        try {
          if (
            !conversationId
          ) {
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

          const {
            data: members,
            error:
              membersError,
          } = await supabase
            .from(
              "conversation_members"
            )
            .select("user_id")
            .eq(
              "conversation_id",
              conversationId
            );

          if (membersError) {
            throw membersError;
          }

          const participantId =
            (
              members || []
            ).find(
              (member) =>
                member.user_id !==
                user.id
            )?.user_id ||
            routeOtherUserId;

          if (participantId) {
            setOtherUserId(
              participantId
            );

            await Promise.all([
              loadParticipant(
                user.id
              ),

              loadBlockStatus(
                user.id,
                participantId
              ),
            ]);
          } else {
            await loadParticipant(
              user.id
            );
          }

          const data =
            await loadMessages(
              conversationId
            );

          setMessages(
            data || []
          );

          await markConversationRead(
            conversationId
          );

          setTimeout(() => {
            listRef.current
              ?.scrollToEnd({
                animated: false,
              });
          }, 100);
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
        routeOtherUserId,
        loadParticipant,
        loadBlockStatus,
      ]
    );

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    loadConversation();
  }, [
    conversationId,
    loadConversation,
  ]);


  /* =======================================================
     MESSAGE REALTIME
  ======================================================= */

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel =
      supabase
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
          async (
            payload
          ) => {
            const newMessage =
              payload.new as Message;

            setMessages(
              (current) => {
                const exists =
                  current.some(
                    (
                      message
                    ) =>
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
              await markConversationRead(
                conversationId
              );
            }

            setTimeout(() => {
              listRef.current
                ?.scrollToEnd({
                  animated: true,
                });
            }, 100);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter:
              `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const updated =
              payload.new as Message;

            setMessages(
              (current) =>
                current.map(
                  (message) =>
                    message.id ===
                    updated.id
                      ? updated
                      : message
                )
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "messages",
            filter:
              `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const deleted =
              payload.old as {
                id?: string;
              };

            if (!deleted.id) {
              return;
            }

            setMessages(
              (current) =>
                current.filter(
                  (message) =>
                    message.id !==
                    deleted.id
                )
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    conversationId,
    currentUserId,
  ]);


  /* =======================================================
     BLOCK REALTIME
  ======================================================= */

  useEffect(() => {
    if (
      !currentUserId ||
      !otherUserId
    ) {
      return;
    }

    const channel =
      supabase
        .channel(
          `blocks-${currentUserId}-${otherUserId}`
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
            loadBlockStatus(
              currentUserId,
              otherUserId
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    currentUserId,
    otherUserId,
    loadBlockStatus,
  ]);


  /* =======================================================
     TEXT MESSAGE
  ======================================================= */

  async function handleSend() {
    const cleaned =
      text.trim();

    if (
      !cleaned ||
      sending ||
      blocked ||
      recording ||
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

      await touchConversation(
        conversationId
      );
    } catch (error) {
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


  /* =======================================================
     VOICE RECORDING
  ======================================================= */

  async function startRecording() {
    if (
      blocked ||
      sendingVoice
    ) {
      return;
    }

    try {
      const permission =
        await AudioModule
          .requestRecordingPermissionsAsync();

      if (
        !permission.granted
      ) {
        Alert.alert(
          "Microphone permission",
          "Allow microphone access to record voice notes."
        );

        return;
      }

      await setAudioModeAsync({
        playsInSilentMode:
          true,
        allowsRecording:
          true,
      });

      await audioRecorder
        .prepareToRecordAsync();

      audioRecorder.record();

      setRecording(true);
    } catch (error) {
      console.log(
        "Start recording error:",
        error
      );

      Alert.alert(
        "Voice note",
        "Unable to start recording."
      );
    }
  }

  async function cancelRecording() {
    try {
      if (recording) {
        await audioRecorder.stop();
      }
    } catch (error) {
      console.log(
        "Cancel recording error:",
        error
      );
    } finally {
      setRecording(false);

      await setAudioModeAsync({
        playsInSilentMode:
          true,
        allowsRecording:
          false,
      }).catch(() => {});
    }
  }

  async function sendVoiceRecording() {
    if (
      !conversationId ||
      !recording ||
      sendingVoice
    ) {
      return;
    }

    try {
      setSendingVoice(true);

      await audioRecorder.stop();

      setRecording(false);

      const uri =
        audioRecorder.uri;

      if (!uri) {
        throw new Error(
          "Recording file was not created."
        );
      }

      const user =
        await getCurrentUser();

      const milliseconds =
        recorderState.durationMillis ||
        0;

      const durationSeconds =
        Math.max(
          1,
          Math.ceil(
            milliseconds /
              1000
          )
        );

      const response =
        await fetch(uri);

      const arrayBuffer =
        await response.arrayBuffer();

      const fileName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.m4a`;

      const storagePath =
        `${conversationId}/${user.id}/${fileName}`;

      const {
        error:
          uploadError,
      } = await supabase.storage
        .from("chat-media")
        .upload(
          storagePath,
          arrayBuffer,
          {
            contentType:
              "audio/mp4",

            upsert: false,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      try {
        await sendVoiceMessage(
          conversationId,
          storagePath,
          durationSeconds
        );
      } catch (error) {
        await supabase.storage
          .from("chat-media")
          .remove([
            storagePath,
          ]);

        throw error;
      }

      await touchConversation(
        conversationId
      );
    } catch (error) {
      console.log(
        "Voice send error:",
        error
      );

      Alert.alert(
        "Voice note failed",
        error instanceof Error
          ? error.message
          : "Unable to send voice note."
      );
    } finally {
      setSendingVoice(false);

      await setAudioModeAsync({
        playsInSilentMode:
          true,
        allowsRecording:
          false,
      }).catch(() => {});
    }
  }


  /* =======================================================
     MESSAGE OPTIONS
  ======================================================= */

  function openMessageOptions(
    message: Message
  ) {
    if (
      message.deleted_at
    ) {
      return;
    }

    setSelectedMessage(
      message
    );

    setMessageOptionsVisible(
      true
    );
  }

  async function handleCopyMessage() {
    if (
      !selectedMessage ||
      selectedMessage.type !==
        "text"
    ) {
      return;
    }

    await Clipboard.setStringAsync(
      selectedMessage.body
    );

    setMessageOptionsVisible(
      false
    );

    setSelectedMessage(null);
  }

  function handleOpenEdit() {
    if (
      !selectedMessage ||
      selectedMessage.sender_id !==
        currentUserId ||
      selectedMessage.type !==
        "text"
    ) {
      return;
    }

    setEditingMessage(
      selectedMessage
    );

    setEditText(
      selectedMessage.body
    );

    setMessageOptionsVisible(
      false
    );

    setEditModalVisible(
      true
    );
  }

  async function handleSaveEdit() {
    if (
      !editingMessage ||
      messageActionLoading
    ) {
      return;
    }

    const cleaned =
      editText.trim();

    if (!cleaned) {
      Alert.alert(
        "Edit message",
        "Message cannot be empty."
      );

      return;
    }

    try {
      setMessageActionLoading(
        true
      );

      await editMessage(
        editingMessage.id,
        cleaned
      );

      setMessages(
        (current) =>
          current.map(
            (message) =>
              message.id ===
              editingMessage.id
                ? {
                    ...message,
                    body: cleaned,
                    edited_at:
                      new Date()
                        .toISOString(),
                  }
                : message
          )
      );

      setEditModalVisible(
        false
      );

      setEditingMessage(
        null
      );

      setEditText("");
    } catch (error) {
      Alert.alert(
        "Edit message",
        error instanceof Error
          ? error.message
          : "Unable to edit message."
      );
    } finally {
      setMessageActionLoading(
        false
      );
    }
  }

  function handleDeleteMessage() {
    if (
      !selectedMessage ||
      selectedMessage.sender_id !==
        currentUserId
    ) {
      return;
    }

    const message =
      selectedMessage;

    setMessageOptionsVisible(
      false
    );

    Alert.alert(
      "Delete message?",
      "This message will appear as deleted in the conversation.",
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
                setMessageActionLoading(
                  true
                );

                await deleteMessage(
                  message.id
                );

                setMessages(
                  (current) =>
                    current.map(
                      (item) =>
                        item.id ===
                        message.id
                          ? {
                              ...item,
                              body: "",
                              deleted_at:
                                new Date()
                                  .toISOString(),
                            }
                          : item
                    )
                );
              } catch (error) {
                Alert.alert(
                  "Delete message",
                  error instanceof Error
                    ? error.message
                    : "Unable to delete message."
                );
              } finally {
                setMessageActionLoading(
                  false
                );

                setSelectedMessage(
                  null
                );
              }
            },
        },
      ]
    );
  }


  /* =======================================================
     CONVERSATION MANAGEMENT
  ======================================================= */

  async function handleArchiveChat() {
    try {
      await archiveConversation(
        conversationId
      );

      setOptionsVisible(false);

      router.back();
    } catch (error) {
      Alert.alert(
        "Archive chat",
        error instanceof Error
          ? error.message
          : "Unable to archive this chat."
      );
    }
  }

  function handleHideChat() {
    Alert.alert(
      "Delete from my chats?",
      `This removes your conversation with ${name} from your chat list. It does not delete it for the other person.`,
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
                await hideConversation(
                  conversationId
                );

                setOptionsVisible(
                  false
                );

                router.back();
              } catch (error) {
                Alert.alert(
                  "Delete chat",
                  error instanceof Error
                    ? error.message
                    : "Unable to remove this chat."
                );
              }
            },
        },
      ]
    );
  }


  /* =======================================================
     BLOCK
  ======================================================= */

  async function handleBlock() {
    if (!otherUserId) {
      return;
    }

    if (blocked) {
      try {
        const {
          data: myBlock,
          error,
        } = await supabase
          .from(
            "blocked_users"
          )
          .select(
            "blocker_id,blocked_id"
          )
          .eq(
            "blocker_id",
            currentUserId
          )
          .eq(
            "blocked_id",
            otherUserId
          )
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!myBlock) {
          Alert.alert(
            "Messaging unavailable",
            "This member has blocked this conversation."
          );

          return;
        }

        await unblockUser(
          otherUserId
        );

        await loadBlockStatus(
          currentUserId,
          otherUserId
        );

        setOptionsVisible(
          false
        );

        return;
      } catch (error) {
        Alert.alert(
          "Block error",
          error instanceof Error
            ? error.message
            : "Unable to update block."
        );

        return;
      }
    }

    Alert.alert(
      "Block member",
      `Block ${name}? You will not be able to message each other.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Block",
          style:
            "destructive",

          onPress:
            async () => {
              try {
                await blockUser(
                  otherUserId
                );

                setBlocked(
                  true
                );

                setOptionsVisible(
                  false
                );
              } catch (error) {
                Alert.alert(
                  "Block error",
                  error instanceof Error
                    ? error.message
                    : "Unable to block this member."
                );
              }
            },
        },
      ]
    );
  }


  /* =======================================================
     MENTOR
  ======================================================= */

  async function handleMentor() {
    if (!otherUserId) {
      return;
    }

    try {
      if (isMentor) {
        await removeMentorLabel(
          otherUserId
        );

        setIsMentor(false);
      } else {
        await labelMentor(
          otherUserId
        );

        setIsMentor(true);
      }
    } catch (error) {
      Alert.alert(
        "Mentor error",
        error instanceof Error
          ? error.message
          : "Unable to update mentor."
      );
    }
  }


  /* =======================================================
     PROFILE
  ======================================================= */

  function openProfile() {
    if (!otherUserId) {
      return;
    }

    router.push({
      pathname:
        "../member/[id]" as never,

      params: {
        id: otherUserId,
        userId:
          otherUserId,
      },
    });
  }


  /* =======================================================
     RENDER MESSAGE
  ======================================================= */

  function renderMessage({
    item,
  }: {
    item: Message;
  }) {
    const mine =
      item.sender_id ===
      currentUserId;

    if (item.deleted_at) {
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
              styles.deletedBubble,
            ]}
          >
            <View
              style={
                styles.deletedRow
              }
            >
              <Ionicons
                name="ban-outline"
                size={14}
                color="#8A8A92"
              />

              <Text
                style={
                  styles.deletedText
                }
              >
                Message deleted
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        style={[
          styles.messageRow,

          mine &&
            styles.myMessageRow,
        ]}
        onLongPress={() =>
          openMessageOptions(
            item
          )
        }
        delayLongPress={350}
      >
        <View
          style={[
            styles.bubble,

            mine
              ? styles.myBubble
              : styles.otherBubble,

            item.type ===
              "voice" &&
              styles.voiceBubble,
          ]}
        >
          {item.type ===
          "voice" ? (
            <VoiceBubble
              message={item}
              mine={mine}
            />
          ) : (
            <Text
              style={[
                styles.messageText,

                mine &&
                  styles.myMessageText,
              ]}
            >
              {item.body}
            </Text>
          )}

          <View
            style={
              styles.messageMeta
            }
          >
            {item.edited_at &&
              item.type ===
                "text" && (
                <Text
                  style={[
                    styles.editedText,

                    mine &&
                      styles.myMetaText,
                  ]}
                >
                  Edited
                </Text>
              )}

            <Text
              style={[
                styles.messageTime,

                mine &&
                  styles.myMessageTime,
              ]}
            >
              {formatMessageTime(
                item.created_at
              )}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }


  /* =======================================================
     INVALID CONVERSATION
  ======================================================= */

  const initials =
    getInitials(name);

  if (!conversationId) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={
            styles.errorContainer
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={PRIMARY}
          />

          <Text
            style={
              styles.errorTitle
            }
          >
            Conversation unavailable
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            This conversation could not
            be opened.
          </Text>

          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              Go back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS ===
          "ios"
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
            onPress={
              openProfile
            }
          >
            {image ? (
              <Image
                source={{
                  uri: image,
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
                  style={
                    styles.name
                  }
                  numberOfLines={
                    1
                  }
                >
                  {name}
                </Text>

                {role ===
                  "staff" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={
                      PRIMARY
                    }
                  />
                )}

                {isMentor && (
                  <Ionicons
                    name="star"
                    size={14}
                    color="#E0A000"
                  />
                )}
              </View>

              <Text
                style={
                  styles.role
                }
                numberOfLines={
                  1
                }
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
            style={
              styles.loading
            }
          >
            <ActivityIndicator
              color={PRIMARY}
              size="large"
            />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(
              item
            ) => item.id}
            renderItem={
              renderMessage
            }
            contentContainerStyle={[
              styles.messages,

              messages.length ===
                0 &&
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
                  Start the conversation
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Send a message to begin
                  chatting.
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
              Messaging is unavailable
              for this conversation.
            </Text>
          </View>
        )}

        {recording ? (
          <View
            style={
              styles.recordingComposer
            }
          >
            <Pressable
              style={
                styles.recordCancel
              }
              onPress={
                cancelRecording
              }
              disabled={
                sendingVoice
              }
            >
              <Ionicons
                name="trash-outline"
                size={21}
                color="#D33"
              />
            </Pressable>

            <View
              style={
                styles.recordingInfo
              }
            >
              <View
                style={
                  styles.recordingDot
                }
              />

              <Text
                style={
                  styles.recordingText
                }
              >
                Recording
              </Text>

              <Text
                style={
                  styles.recordingTime
                }
              >
                {formatDuration(
                  Math.floor(
                    (recorderState.durationMillis ||
                      0) /
                      1000
                  )
                )}
              </Text>
            </View>

            <Pressable
              style={
                styles.voiceSendButton
              }
              onPress={
                sendVoiceRecording
              }
              disabled={
                sendingVoice
              }
            >
              {sendingVoice ? (
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
        ) : (
          <View
            style={
              styles.composer
            }
          >
            <TextInput
              value={text}
              onChangeText={
                setText
              }
              editable={
                !blocked
              }
              placeholder={
                blocked
                  ? "Messaging unavailable"
                  : "Message..."
              }
              placeholderTextColor="#999"
              multiline
              maxLength={3000}
              style={
                styles.input
              }
            />

            {text.trim() ? (
              <Pressable
                style={[
                  styles.sendButton,

                  (blocked ||
                    sending) &&
                    styles.sendDisabled,
                ]}
                disabled={
                  blocked ||
                  sending
                }
                onPress={
                  handleSend
                }
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
            ) : (
              <Pressable
                style={[
                  styles.sendButton,

                  blocked &&
                    styles.sendDisabled,
                ]}
                disabled={
                  blocked
                }
                onPress={
                  startRecording
                }
              >
                <Ionicons
                  name="mic"
                  size={20}
                  color="#fff"
                />
              </Pressable>
            )}
          </View>
        )}

        <ConversationOptions
          visible={
            optionsVisible
          }
          name={name}
          role={
            role === "staff"
              ? "student"
              : role
          }
          blocked={blocked}
          isMentor={isMentor}
          onClose={() =>
            setOptionsVisible(
              false
            )
          }
          onBlock={
            handleBlock
          }
          onToggleMentor={
            handleMentor
          }
        />

        {/* =================================================
            MESSAGE OPTIONS
        ================================================= */}

        <Modal
          visible={
            messageOptionsVisible
          }
          transparent
          animationType="fade"
          onRequestClose={() =>
            setMessageOptionsVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.modalOverlay
            }
            onPress={() =>
              setMessageOptionsVisible(
                false
              )
            }
          >
            <Pressable
              style={
                styles.messageSheet
              }
              onPress={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <View
                style={
                  styles.sheetHandle
                }
              />

              <Text
                style={
                  styles.sheetTitle
                }
              >
                Message
              </Text>

              {selectedMessage
                ?.type ===
                "text" && (
                <Pressable
                  style={
                    styles.sheetOption
                  }
                  onPress={
                    handleCopyMessage
                  }
                >
                  <Ionicons
                    name="copy-outline"
                    size={21}
                    color="#222"
                  />

                  <Text
                    style={
                      styles.sheetOptionText
                    }
                  >
                    Copy
                  </Text>
                </Pressable>
              )}

              {selectedMessage
                ?.sender_id ===
                currentUserId &&
                selectedMessage
                  ?.type ===
                  "text" && (
                  <Pressable
                    style={
                      styles.sheetOption
                    }
                    onPress={
                      handleOpenEdit
                    }
                  >
                    <Ionicons
                      name="create-outline"
                      size={21}
                      color="#222"
                    />

                    <Text
                      style={
                        styles.sheetOptionText
                      }
                    >
                      Edit
                    </Text>
                  </Pressable>
                )}

              {selectedMessage
                ?.sender_id ===
                currentUserId && (
                <Pressable
                  style={
                    styles.sheetOption
                  }
                  onPress={
                    handleDeleteMessage
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={21}
                    color="#D33"
                  />

                  <Text
                    style={
                      styles.deleteOptionText
                    }
                  >
                    Delete
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={
                  styles.sheetCancel
                }
                onPress={() =>
                  setMessageOptionsVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.sheetCancelText
                  }
                >
                  Cancel
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>


        {/* =================================================
            EDIT MESSAGE
        ================================================= */}

        <Modal
          visible={
            editModalVisible
          }
          transparent
          animationType="fade"
          onRequestClose={() =>
            setEditModalVisible(
              false
            )
          }
        >
          <View
            style={
              styles.editOverlay
            }
          >
            <View
              style={
                styles.editCard
              }
            >
              <Text
                style={
                  styles.editTitle
                }
              >
                Edit message
              </Text>

              <TextInput
                value={
                  editText
                }
                onChangeText={
                  setEditText
                }
                multiline
                maxLength={
                  3000
                }
                autoFocus
                style={
                  styles.editInput
                }
              />

              <View
                style={
                  styles.editActions
                }
              >
                <Pressable
                  style={
                    styles.editCancel
                  }
                  onPress={() => {
                    setEditModalVisible(
                      false
                    );

                    setEditingMessage(
                      null
                    );
                  }}
                >
                  <Text
                    style={
                      styles.editCancelText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.editSave,

                    (!editText.trim() ||
                      messageActionLoading) &&
                      styles.sendDisabled,
                  ]}
                  disabled={
                    !editText.trim() ||
                    messageActionLoading
                  }
                  onPress={
                    handleSaveEdit
                  }
                >
                  {messageActionLoading ? (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                    />
                  ) : (
                    <Text
                      style={
                        styles.editSaveText
                      }
                    >
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>


        {/* =================================================
            CHAT MANAGEMENT BUTTONS

            Temporary overlay because existing
            ConversationOptions does not yet expose these.
        ================================================= */}

        {optionsVisible && (
          <View
            pointerEvents="box-none"
            style={
              styles.managementButtons
            }
          >
            <Pressable
              style={
                styles.managementButton
              }
              onPress={
                handleArchiveChat
              }
            >
              <Ionicons
                name="archive-outline"
                size={18}
                color="#333"
              />

              <Text
                style={
                  styles.managementText
                }
              >
                Archive chat
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.managementButton
              }
              onPress={
                handleHideChat
              }
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#D33"
              />

              <Text
                style={
                  styles.managementDeleteText
                }
              >
                Delete from my chats
              </Text>
            </Pressable>
          </View>
        )}
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
      borderBottomColor: "#EFEFF2",
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
      maxWidth: "85%",
      fontSize: 15,
      fontWeight: "800",
      color: "#161616",
    },

    role: {
      marginTop: 2,
      fontSize: 11,
      color: "#888",
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

    voiceBubble: {
      minWidth: 220,
    },

    messageText: {
      fontSize: 14,
      lineHeight: 20,
      color: "#222",
    },

    myMessageText: {
      color: "#fff",
    },

    messageMeta: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 5,
      marginTop: 4,
    },

    messageTime: {
      fontSize: 9,
      color: "#888",
    },

    myMessageTime: {
      color:
        "rgba(255,255,255,0.72)",
    },

    editedText: {
      fontSize: 9,
      color: "#888",
    },

    myMetaText: {
      color:
        "rgba(255,255,255,0.68)",
    },

    deletedBubble: {
      backgroundColor: "#F1F1F3",
      borderWidth: 1,
      borderColor: "#E2E2E5",
    },

    deletedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    deletedText: {
      color: "#8A8A92",
      fontSize: 12,
      fontStyle: "italic",
    },

    voiceContainer: {
      flexDirection: "row",
      alignItems: "center",
    },

    voicePlayButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
    },

    myVoicePlayButton: {
      backgroundColor: "#fff",
    },

    voiceContent: {
      flex: 1,
      marginLeft: 9,
    },

    waveform: {
      height: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },

    waveBar: {
      width: 2,
      borderRadius: 2,
    },

    waveActive: {
      backgroundColor: PRIMARY,
    },

    waveInactive: {
      backgroundColor: "#B8B8C0",
    },

    myWaveActive: {
      backgroundColor: "#fff",
    },

    myWaveInactive: {
      backgroundColor:
        "rgba(255,255,255,0.42)",
    },

    voiceDuration: {
      marginTop: 2,
      fontSize: 9,
      color: "#777",
    },

    myVoiceDuration: {
      color:
        "rgba(255,255,255,0.78)",
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
      borderTopColor: "#EFEFF2",
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

    recordingComposer: {
      minHeight: 64,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: "#EFEFF2",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
    },

    recordCancel: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },

    recordingInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F4F4F6",
      height: 44,
      borderRadius: 22,
      paddingHorizontal: 14,
      gap: 7,
    },

    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#E53935",
    },

    recordingText: {
      fontSize: 12,
      color: "#555",
      fontWeight: "700",
    },

    recordingTime: {
      marginLeft: "auto",
      color: "#555",
      fontSize: 12,
      fontWeight: "700",
    },

    voiceSendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginLeft: 8,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },

    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor:
        "rgba(0,0,0,0.35)",
    },

    messageSheet: {
      backgroundColor: "#fff",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 28,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },

    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#D4D4D9",
      alignSelf: "center",
      marginBottom: 15,
    },

    sheetTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: "#222",
      marginBottom: 6,
    },

    sheetOption: {
      minHeight: 55,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      borderBottomWidth: 1,
      borderBottomColor: "#EFEFF2",
    },

    sheetOptionText: {
      color: "#222",
      fontSize: 14,
      fontWeight: "700",
    },

    deleteOptionText: {
      color: "#D33",
      fontSize: 14,
      fontWeight: "700",
    },

    sheetCancel: {
      height: 46,
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: "#F3F3F5",
      alignItems: "center",
      justifyContent: "center",
    },

    sheetCancelText: {
      color: "#333",
      fontWeight: "700",
    },

    editOverlay: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 22,
      backgroundColor:
        "rgba(0,0,0,0.35)",
    },

    editCard: {
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 18,
    },

    editTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: "#222",
      marginBottom: 13,
    },

    editInput: {
      minHeight: 90,
      maxHeight: 180,
      borderRadius: 13,
      backgroundColor: "#F3F3F6",
      padding: 13,
      textAlignVertical: "top",
      fontSize: 14,
      color: "#222",
    },

    editActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 9,
      marginTop: 14,
    },

    editCancel: {
      height: 42,
      paddingHorizontal: 17,
      borderRadius: 10,
      backgroundColor: "#F1F1F3",
      alignItems: "center",
      justifyContent: "center",
    },

    editCancelText: {
      color: "#444",
      fontWeight: "700",
    },

    editSave: {
      height: 42,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },

    editSaveText: {
      color: "#fff",
      fontWeight: "800",
    },

    managementButtons: {
      position: "absolute",
      right: 16,
      top: 78,
      width: 210,
      borderRadius: 13,
      paddingVertical: 5,
      backgroundColor: "#fff",

      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation: 8,
    },

    managementButton: {
      minHeight: 48,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    managementText: {
      color: "#333",
      fontSize: 12,
      fontWeight: "700",
    },

    managementDeleteText: {
      color: "#D33",
      fontSize: 12,
      fontWeight: "700",
    },

    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    errorTitle: {
      marginTop: 12,
      fontSize: 18,
      fontWeight: "900",
      color: "#222",
    },

    errorText: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color: "#777",
    },

    backButton: {
      marginTop: 18,
      height: 44,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },

    backButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },
  });