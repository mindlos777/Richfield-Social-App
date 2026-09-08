import React, { useState } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

const PRIMARY = '#0300cf'

export default function ConversationScreen() {
  const router = useRouter()

  const params = useLocalSearchParams()

  const name = params.name || 'Conversation'
  const image = params.image
  const isAI = params.isAI === 'true'
  const online = params.online === 'true'

  const [message, setMessage] = useState('')

  const [messages, setMessages] = useState(
    isAI
      ? []
      : [
          {
            id: '1',
            text: 'Hey 👋',
            sender: 'them',
            time: '18:40',
          },
          {
            id: '2',
            text: 'Hey, how are you?',
            sender: 'me',
            time: '18:41',
          },
          {
            id: '3',
            text: 'I’m good. What are you up to?',
            sender: 'them',
            time: '18:42',
          },
        ]
  )

  const sendMessage = () => {
    const trimmedMessage = message.trim()

    if (!trimmedMessage) return

    const newMessage = {
      id: Date.now().toString(),
      text: trimmedMessage,
      sender: 'me',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    setMessages(prev => [...prev, newMessage])
    setMessage('')

    if (isAI) {
      // AI functionality will be added later
    }
  }

  const renderMessage = ({ item }) => {
    const isMine = item.sender === 'me'

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
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        {isAI ? (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiSymbol}>✦</Text>
          </View>
        ) : (
          <View style={styles.avatarWrapper}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderText}>
                  {name.charAt(0)}
                </Text>
              </View>
            )}

            {online && (
              <View style={styles.headerOnlineDot} />
            )}
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {name}
          </Text>

          <Text style={styles.headerStatus}>
            {isAI
              ? 'Your personal assistant'
              : online
              ? 'Online'
              : 'Offline'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => {}}
        >
          <Text style={styles.moreIcon}>•••</Text>
        </TouchableOpacity>
      </View>

      {isAI && messages.length === 0 && (
        <View style={styles.aiWelcome}>
          <View style={styles.largeAIIcon}>
            <Text style={styles.largeAISymbol}>✦</Text>
          </View>

          <Text style={styles.welcomeTitle}>
            Meet your AI Assistant
          </Text>

          <Text style={styles.welcomeText}>
            Ask questions, get help, or just have a
            conversation.
          </Text>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesList}
      />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <View style={styles.inputArea}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => {}}
          >
            <Text style={styles.attachIcon}>+</Text>
          </TouchableOpacity>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={
              isAI
                ? 'Message your AI...'
                : 'Write a message...'
            }
            placeholderTextColor="#999999"
            style={styles.input}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              !message.trim() &&
                styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 70,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },

  backIcon: {
    fontSize: 38,
    fontWeight: '300',
    color: '#222222',
    marginTop: -4,
  },

  avatarWrapper: {
    position: 'relative',
  },

  headerAvatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#EEEEEE',
  },

  placeholderAvatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#777777',
  },

  headerOnlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#20C878',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    right: 0,
    bottom: 0,
  },

  aiAvatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },

  aiSymbol: {
    color: '#FFFFFF',
    fontSize: 22,
  },

  headerInfo: {
    flex: 1,
    marginLeft: 11,
  },

  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161616',
  },

  headerStatus: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },

  moreButton: {
    width: 35,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  moreIcon: {
    color: '#555555',
    fontSize: 15,
    letterSpacing: 2,
  },

  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 15,
  },

  messageRow: {
    width: '100%',
    marginBottom: 9,
  },

  myMessageRow: {
    alignItems: 'flex-end',
  },

  theirMessageRow: {
    alignItems: 'flex-start',
  },

  messageBubble: {
    maxWidth: '78%',
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
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 5,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: '#FFFFFF',
  },

  theirMessageText: {
    color: '#222222',
  },

  messageTime: {
    fontSize: 9,
    marginTop: 4,
  },

  myMessageTime: {
    color: '#D8D7FF',
    textAlign: 'right',
  },

  theirMessageTime: {
    color: '#999999',
  },

  aiWelcome: {
    alignItems: 'center',
    paddingHorizontal: 35,
    paddingTop: 75,
  },

  largeAIIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  largeAISymbol: {
    color: '#FFFFFF',
    fontSize: 34,
  },

  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#161616',
    textAlign: 'center',
  },

  welcomeText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },

  inputArea: {
    minHeight: 65,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  attachButton: {
    width: 39,
    height: 43,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },

  attachIcon: {
    fontSize: 27,
    fontWeight: '300',
    color: PRIMARY,
  },

  input: {
    flex: 1,
    minHeight: 43,
    maxHeight: 110,
    backgroundColor: '#F3F3F3',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 10,
    fontSize: 15,
    color: '#222222',
  },

  sendButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 7,
  },

  sendButtonDisabled: {
    backgroundColor: '#D8D8D8',
  },

  sendIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    marginTop: -2,
  },
})