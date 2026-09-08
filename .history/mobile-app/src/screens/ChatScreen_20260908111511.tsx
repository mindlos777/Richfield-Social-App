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

