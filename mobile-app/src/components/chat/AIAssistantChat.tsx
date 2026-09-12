import React from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

const PRIMARY = "#0300cf";

type Props = {
  onPress: () => void;
  lastMessage?: string;
  lastMessageTime?: string;
};

export default function AIAssistantChat({
  onPress,
  lastMessage =
    "Ask me about campus, careers, studying or opportunities.",
  lastMessageTime = "",
}: Props) {
  return (
    <Pressable
      style={
        styles.container
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.avatar
        }
      >
        <Ionicons
          name="sparkles"
          size={25}
          color="#fff"
        />
      </View>

      <View
        style={
          styles.content
        }
      >
        <View
          style={
            styles.topRow
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

          {!!lastMessageTime && (
            <Text
              style={
                styles.time
              }
            >
              {
                lastMessageTime
              }
            </Text>
          )}
        </View>

        <Text
          style={
            styles.subtitle
          }
        >
          Campus Assistant
        </Text>

        <Text
          style={
            styles.lastMessage
          }
          numberOfLines={
            1
          }
        >
          {lastMessage}
        </Text>
      </View>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal:
        20,
      paddingVertical: 14,
      backgroundColor:
        "#F8F8FF",
    },

    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 13,
    },

    content: {
      flex: 1,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    name: {
      fontSize: 16,
      fontWeight: "800",
      color: "#15151A",
    },

    aiBadge: {
      backgroundColor:
        "#E5E4FF",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
    },

    aiBadgeText: {
      color: PRIMARY,
      fontSize: 9,
      fontWeight: "900",
    },

    time: {
      fontSize: 11,
      color: "#92929B",
    },

    subtitle: {
      marginTop: 3,
      color: PRIMARY,
      fontSize: 10,
      fontWeight: "700",
    },

    lastMessage: {
      marginTop: 5,
      color: "#777782",
      fontSize: 13,
    },
  });