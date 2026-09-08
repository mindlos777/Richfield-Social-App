
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const PRIMARY = "#0300cf";

const mockChats = [
  {
    id: "1",
    name: "Thabo Mokoena",
    username: "thabo",
    image: "https://i.pravatar.cc/150?img=12",
    online: true,
    lastMessage: "Are you still coming later?",
    lastMessageTime: "18:42",
    unreadCount: 2,
  },
  {
    id: "2",
    name: "Lerato",
    username: "lerato",
    image: "https://i.pravatar.cc/150?img=47",
    online: true,
    lastMessage: "That photo is 🔥",
    lastMessageTime: "17:25",
    unreadCount: 0,
  },
  {
    id: "3",
    name: "Kabelo",
    username: "kabelo",
    image: "https://i.pravatar.cc/150?img=11",
    online: false,
    lastMessage: "Let me know when you get there",
    lastMessageTime: "16:08",
    unreadCount: 1,
  },
  {
    id: "4",
    name: "Neo",
    username: "neo",
    image: "https://i.pravatar.cc/150?img=32",
    online: false,
    lastMessage: "😂😂 no ways",
    lastMessageTime: "14:51",
    unreadCount: 0,
  },
  {
    id: "5",
    name: "Amanda",
    username: "amanda",
    image: "https://i.pravatar.cc/150?img=44",
    online: true,
    lastMessage: "Thanks! I appreciate it",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
  },
];

export default function ChatScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const chats = mockChats;

  const filteredChats = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return chats;
    }

    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(value) ||
        chat.username.toLowerCase().includes(value)
    );
  }, [search]);

  const openConversation = (chat) => {
    router.push({
      pathname: "/conversation",
      params: {
        id: chat.id,
        name: chat.name,
        username: chat.username,
        image: chat.image,
        online: chat.online ? "true" : "false",
      },
    });
  };

  const renderChat = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => openConversation(item)}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.image }} style={styles.avatar} />

          {item.online && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.name}
            </Text>

            <Text style={styles.chatTime}>
              {item.lastMessageTime}
            </Text>
          </View>

          <View style={styles.chatBottomRow}>
            <Text
              style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>
              Stay connected
            </Text>
          </View>

          <TouchableOpacity style={styles.newButton}>
            <Text style={styles.newButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search messages"
            placeholderTextColor="#8b8b96"
            style={styles.searchInput}
          />
        </View>

        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChat}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                No conversations
              </Text>

              <Text style={styles.emptyText}>
                Start a conversation with someone.
              </Text>
            </View>
          }
        />
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  newButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  newButtonText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 30,
  },

  searchContainer: {
    height: 48,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "#f3f3f6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchIcon: {
    fontSize: 25,
    color: "#777782",
    marginRight: 8,
    transform: [{ rotate: "-20deg" }],
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111111",
  },

  listContent: {
    paddingBottom: 30,
  },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
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
    backgroundColor: "#eeeeee",
  },

  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#20c76b",
    borderWidth: 2,
    borderColor: "#ffffff",
  },

  chatContent: {
    flex: 1,
    minWidth: 0,
  },

  chatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  chatName: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#15151a",
  },

  chatTime: {
    fontSize: 12,
    color: "#92929b",
  },

  chatBottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: "#85858e",
  },

  unreadMessage: {
    color: "#22222a",
    fontWeight: "600",
  },

  unreadBadge: {
    minWidth: 21,
    height: 21,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  unreadText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222222",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    color: "#85858e",
    textAlign: "center",
  },
});
```

### `src/screens/ConversationScreen.jsx`

```jsx
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
