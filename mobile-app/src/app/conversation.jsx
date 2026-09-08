import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

const PRIMARY = "#0300cf";

const mockMessages = [
  {
    id: "1",
    text: "Hey 👋",
    sender: "them",
    time: "18:40",
  },
  {
    id: "2",
    text: "Hey, how are you?",
    sender: "me",
    time: "18:41",
  },
  {
    id: "3",
    text: "I'm good. What are you up to?",
    sender: "them",
    time: "18:42",
  },
];

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const listRef = useRef(null);

  const name = params.name || "Conversation";
  const username = params.username || "";
  const image = params.image || "";
  const online = params.online === "true";

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({
        animated: false,
      });
    }, 100);
  }, []);

  const sendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    const newMessage = {
      id: Date.now().toString(),
      text: trimmedMessage,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      newMessage,
    ]);

    setMessage("");

    setTimeout(() => {
      listRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender === "me";

    return (
      <View
        style={[
          styles.messageRow,
          isMine
            ? styles.myMessageRow
            : styles.theirMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine
              ? styles.myBubble
              : styles.theirBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMine
                ? styles.myMessageText
                : styles.theirMessageText,
            ]}
          >
            {item.text}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isMine
                ? styles.myMessageTime
                : styles.theirMessageTime,
            ]}
          >
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerProfile}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderText}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {name}
              </Text>

              <Text style={styles.headerStatus}>
                {online ? "Online" : "Offline"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({
              animated: false,
            })
          }
          ListHeaderComponent={
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                Today
              </Text>
            </View>
          }
        />

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachButton}>
            <Text style={styles.attachIcon}>+</Text>
          </TouchableOpacity>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Message..."
            placeholderTextColor="#8c8c95"
            multiline
            style={styles.input}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              !message.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  header: {
    height: 68,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeef",
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 38,
    fontWeight: "300",
    color: "#15151a",
    lineHeight: 38,
  },

  headerProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 3,
  },

  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eeeeee",
  },

  placeholderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },

  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },

  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15151a",
  },

  headerStatus: {
    marginTop: 2,
    fontSize: 12,
    color: "#777782",
  },

  moreButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  moreIcon: {
    fontSize: 15,
    letterSpacing: 2,
    color: "#55555e",
  },

  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 15,
  },

  dateContainer: {
    alignItems: "center",
    marginVertical: 12,
  },

  dateText: {
    fontSize: 12,
    color: "#92929b",
    backgroundColor: "#f3f3f6",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
  },

  messageRow: {
    width: "100%",
    marginVertical: 4,
  },

  myMessageRow: {
    alignItems: "flex-end",
  },

  theirMessageRow: {
    alignItems: "flex-start",
  },

  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
    borderRadius: 18,
  },

  myBubble: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 5,
  },

  theirBubble: {
    backgroundColor: "#f0f0f3",
    borderBottomLeftRadius: 5,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: "#ffffff",
  },

  theirMessageText: {
    color: "#202027",
  },

  messageTime: {
    fontSize: 10,
    marginTop: 3,
  },

  myMessageTime: {
    color: "#d5d5ff",
    textAlign: "right",
  },

  theirMessageTime: {
    color: "#898991",
  },

  inputArea: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#eeeeef",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "flex-end",
  },

  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },

  attachIcon: {
    fontSize: 27,
    color: "#65656e",
    fontWeight: "300",
  },

  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    marginHorizontal: 5,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 21,
    backgroundColor: "#f3f3f6",
    color: "#15151a",
    fontSize: 15,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },

  sendButtonDisabled: {
    backgroundColor: "#c9c9d0",
  },

  sendIcon: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "700",
    marginTop: -2,
  },
});
