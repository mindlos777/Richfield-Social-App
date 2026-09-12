import React from "react";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

export default function EncryptionNotice() {
  return (
    <View
      style={
        styles.container
      }
    >
      <Ionicons
        name="lock-closed"
        size={13}
        color="#8A741C"
      />

      <Text
        style={
          styles.text
        }
      >
        End-to-end encryption
        will protect messages
        and calls in this
        conversation.
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      alignSelf: "center",
      maxWidth: "84%",
      marginVertical: 14,
      paddingHorizontal:
        12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor:
        "#FFF7D6",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    text: {
      flex: 1,
      color: "#78641A",
      fontSize: 10,
      lineHeight: 14,
      textAlign: "center",
    },
  });