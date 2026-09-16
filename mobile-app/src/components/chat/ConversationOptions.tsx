import React from "react";

import {
  Alert,
  Modal,
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
  visible: boolean;
  name: string;

  role:
    | "student"
    | "alumni"
    | "business"
    | "admin";

  blocked: boolean;
  isMentor: boolean;

  onClose: () => void;
  onBlock: () => void;
  onToggleMentor: () => void;
  onViewProfile?: () => void;
};

export default function ConversationOptions({
  visible,
  name,
  role,
  blocked,
  isMentor,
  onClose,
  onBlock,
  onToggleMentor,
  onViewProfile,
}: Props) {
  function handleBlock() {
    if (blocked) {
      onBlock();
      onClose();
      return;
    }

    Alert.alert(
      `Block ${name}?`,
      "They will not be able to send you messages or message requests.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Block",
          style:
            "destructive",

          onPress: () => {
            onBlock();
            onClose();
          },
        },
      ]
    );
  }

  function reportUser() {
    onClose();

    Alert.alert(
      "Report user",
      "Reporting will be connected to the moderation system later."
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <Pressable
        style={
          styles.overlay
        }
        onPress={
          onClose
        }
      >
        <Pressable
          style={
            styles.sheet
          }
          onPress={event =>
            event.stopPropagation()
          }
        >
          <View
            style={
              styles.handle
            }
          />

          <Text
            style={
              styles.title
            }
          >
            Conversation
            options
          </Text>

          {onViewProfile && (
            <Pressable
              style={
                styles.option
              }
              onPress={() => {
                onClose();
                onViewProfile();
              }}
            >
              <Ionicons
                name="person-outline"
                size={22}
                color="#333"
              />

              <Text
                style={
                  styles.optionText
                }
              >
                View profile
              </Text>
            </Pressable>
          )}

          {role ===
            "alumni" && (
            <Pressable
              style={
                styles.option
              }
              onPress={() => {
                onToggleMentor();
                onClose();
              }}
            >
              <Ionicons
                name={
                  isMentor
                    ? "star"
                    : "star-outline"
                }
                size={22}
                color={
                  PRIMARY
                }
              />

              <Text
                style={
                  styles.optionText
                }
              >
                {isMentor
                  ? "Remove mentor label"
                  : "Label as mentor"}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={
              styles.option
            }
            onPress={
              reportUser
            }
          >
            <Ionicons
              name="flag-outline"
              size={22}
              color="#333"
            />

            <Text
              style={
                styles.optionText
              }
            >
              Report
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.option
            }
            onPress={
              handleBlock
            }
          >
            <Ionicons
              name={
                blocked
                  ? "person-add-outline"
                  : "ban-outline"
              }
              size={22}
              color={
                blocked
                  ? PRIMARY
                  : "#D93025"
              }
            />

            <Text
              style={[
                styles.optionText,

                !blocked &&
                  styles.dangerText,
              ]}
            >
              {blocked
                ? "Unblock user"
                : "Block user"}
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.cancelButton
            }
            onPress={
              onClose
            }
          >
            <Text
              style={
                styles.cancelText
              }
            >
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.38)",
      justifyContent:
        "flex-end",
    },

    sheet: {
      backgroundColor:
        "#fff",
      borderTopLeftRadius:
        24,
      borderTopRightRadius:
        24,
      paddingHorizontal:
        20,
      paddingTop: 12,
      paddingBottom: 32,
    },

    handle: {
      width: 40,
      height: 4,
      backgroundColor:
        "#D0D0D5",
      alignSelf: "center",
      borderRadius: 2,
      marginBottom: 20,
    },

    title: {
      fontSize: 19,
      fontWeight: "800",
      color: "#171717",
      marginBottom: 8,
    },

    option: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "#EFEFF1",
    },

    optionText: {
      marginLeft: 14,
      fontSize: 14,
      fontWeight: "600",
      color: "#333",
    },

    dangerText: {
      color: "#D93025",
    },

    cancelButton: {
      marginTop: 16,
      height: 48,
      borderRadius: 12,
      backgroundColor:
        "#F2F2F4",
      alignItems: "center",
      justifyContent:
        "center",
    },

    cancelText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#333",
    },
  });