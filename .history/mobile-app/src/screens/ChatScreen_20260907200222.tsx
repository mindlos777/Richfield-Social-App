import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

const PRIMARY = '#0300cf'

const chats = [
  {
    id: '1',
    name: 'Thabo Mokoena',
    message: 'Are you still coming later?',
    time: '18:42',
    unread: 2,
    online: true,
    image: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: '2',
    name: 'Lerato',
    message: 'That photo is 🔥',
    time: '17:25',
    unread: 0,
    online: true,
    image: 'https://i.pravatar.cc/150?img=47',
  },
  {
    id: '3',
    name: 'Kabelo',
    message: 'Let me know when you get there',
    time: '16:08',
    unread: 1,
    online: false,
    image: 'https://i.pravatar.cc/150?img=11',
  },
  {
    id: '4',
    name: 'Neo',
    message: '😂😂 no ways',
    time: '14:51',
    unread: 0,
    online: false,
    image: 'https://i.pravatar.cc/150?img=32',
  },
  {
    id: '5',
    name: 'Amanda',
    message: 'Thanks! I appreciate it',
    time: 'Yesterday',
    unread: 0,
    online: true,
    image: 'https://i.pravatar.cc/150?img=44',
  },
  {
    id: '6',
    name: 'Michael',
    message: 'See you tomorrow',
    time: 'Yesterday',
    unread: 0,
    online: false,
    image: 'https://i.pravatar.cc/150?img=13',
  },
]

export default function ChatScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats

    return chats.filter(chat =>
      chat.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const openChat = (chat: (typeof chats)[number]) => {
    router.push({
      pathname: '../screens/ConversationScreen',
      params: {
        id: chat.id,
        name: chat.name,
        image: chat.image,
        online: chat.online ? 'true' : 'false',
        isAI: 'false',
      },
    })
  }

  const openAI = () => {
    router.push({
      pathname: '/AIChatScreen',
      params: {
        id: 'ai',
        name: 'AI Assistant',
        isAI: 'true',
      },
    })
  }

  const renderChat = ({ item }: { item: (typeof chats)[number] }) => (
    <TouchableOpacity
      style={styles.chatItem}
      activeOpacity={0.7}
      onPress={() => openChat(item)}
    >
      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: item.image }}
          style={styles.avatar}
        />

        {item.online && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              item.unread > 0 && styles.unreadName,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text
            style={[
              styles.time,
              item.unread > 0 && styles.unreadTime,
            ]}
          >
            {item.time}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.message,
              item.unread > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.message}
          </Text>

          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Stay connected</Text>
        </View>

        <TouchableOpacity
          style={styles.newButton}
          activeOpacity={0.8}
          onPress={() => {}}
        >
          <Text style={styles.newButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>⌕</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search messages"
          placeholderTextColor="#999"
          style={styles.searchInput}
          autoCapitalize="none"
        />

        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
          >
            <Text style={styles.clearSearch}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.aiCard}
        activeOpacity={0.8}
        onPress={openAI}
      >
        <View style={styles.aiIcon}>
          <Text style={styles.aiIconText}>✦</Text>
        </View>

        <View style={styles.aiContent}>
          <Text style={styles.aiTitle}>AI Assistant</Text>

          <Text style={styles.aiSubtitle}>
            Ask me anything
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent</Text>

        <Text style={styles.count}>
          {filteredChats.length}
        </Text>
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={item => item.id}
        renderItem={renderChat}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⌕</Text>

            <Text style={styles.emptyTitle}>
              No conversations found
            </Text>

            <Text style={styles.emptyText}>
              Try searching for another person.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.7,
  },

  subtitle: {
    fontSize: 14,
    color: '#8A8A8A',
    marginTop: 3,
  },

  newButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  newButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },

  searchContainer: {
    marginHorizontal: 20,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  searchIcon: {
    fontSize: 25,
    color: PRIMARY,
    marginRight: 8,
    transform: [{ rotate: '-20deg' }],
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111111',
    paddingVertical: 0,
  },

  clearSearch: {
    fontSize: 25,
    color: '#888888',
    paddingLeft: 8,
  },

  aiCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#F3F3FF',
    borderWidth: 1,
    borderColor: '#E2E1FF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  aiIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiIconText: {
    color: '#FFFFFF',
    fontSize: 21,
  },

  aiContent: {
    flex: 1,
    marginLeft: 12,
  },

  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },

  aiSubtitle: {
    fontSize: 13,
    color: '#777777',
    marginTop: 2,
  },

  arrow: {
    fontSize: 27,
    color: PRIMARY,
    fontWeight: '300',
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },

  count: {
    marginLeft: 7,
    fontSize: 12,
    color: '#999999',
  },

  list: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },

  chatItem: {
    minHeight: 78,
    paddingHorizontal: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    position: 'relative',
    marginRight: 13,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EEEEEE',
  },

  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#25C76F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  chatContent: {
    flex: 1,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginRight: 10,
  },

  unreadName: {
    fontWeight: '700',
  },

  time: {
    fontSize: 11,
    color: '#999999',
  },

  unreadTime: {
    color: PRIMARY,
    fontWeight: '600',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  message: {
    flex: 1,
    fontSize: 13,
    color: '#8A8A8A',
    marginRight: 8,
  },

  unreadMessage: {
    color: '#444444',
    fontWeight: '500',
  },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  empty: {
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    fontSize: 38,
    color: '#BBBBBB',
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },

  emptyText: {
    fontSize: 13,
    color: '#999999',
    marginTop: 5,
    textAlign: 'center',
  },
})