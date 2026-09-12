import React, {
  useState,
} from "react";

import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useRouter,
} from "expo-router";

const PRIMARY = "#0300cf";

type RequestRole =
  | "student"
  | "alumni";

type ChatRequest = {
  id: string;
  name: string;
  username: string;
  image: string;
  role: RequestRole;
  description: string;
  mutualConnections: number;
};

const mockRequests:
  ChatRequest[] = [
    {
      id: "101",
      name: "Naledi Moagi",
      username: "naledi",
      image:
        "https://i.pravatar.cc/150?img=45",
      role: "student",
      description:
        "BSc IT · Centurion",
      mutualConnections: 4,
    },

    {
      id: "102",
      name: "Sibusiso Mthembu",
      username: "sibusiso",
      image:
        "https://i.pravatar.cc/150?img=15",
      role: "alumni",
      description:
        "Software Engineer · Richfield Alumni",
      mutualConnections: 8,
    },

    {
      id: "103",
      name: "Khanyisa Dube",
      username: "khanyisa",
      image:
        "https://i.pravatar.cc/150?img=35",
      role: "student",
      description:
        "BCom · Pretoria",
      mutualConnections: 2,
    },
  ];

export default function ChatRequestsScreen() {
  const router =
    useRouter();

  const [
    requests,
    setRequests,
  ] =
    useState<ChatRequest[]>(
      mockRequests
    );

  function acceptRequest(
    request: ChatRequest
  ) {
    console.log(
      "Accepted:",
      request.id
    );

    setRequests(
      current =>
        current.filter(
          item =>
            item.id !==
            request.id
        )
    );

    /*
      Supabase later:

      update chat_requests
      set status = accepted

      then create conversation
    */
  }

  function rejectRequest(
    request: ChatRequest
  ) {
    console.log(
      "Rejected:",
      request.id
    );

    setRequests(
      current =>
        current.filter(
          item =>
            item.id !==
            request.id
        )
    );
  }

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          style={
            styles.backButton
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

        <View>
          <Text
            style={
              styles.title
            }
          >
            Requests
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Students and alumni
          </Text>
        </View>
      </View>

      <FlatList
        data={requests}
        keyExtractor={item =>
          item.id
        }
        contentContainerStyle={
          requests.length ===
          0
            ? styles.emptyList
            : styles.list
        }
        renderItem={({
          item,
        }) => (
          <View
            style={
              styles.requestItem
            }
          >
            <Image
              source={{
                uri:
                  item.image,
              }}
              style={
                styles.avatar
              }
            />

            <View
              style={
                styles.requestContent
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
                  {
                    item.name
                  }
                </Text>

                <View
                  style={[
                    styles.roleBadge,

                    item.role ===
                      "alumni" &&
                      styles.alumniBadge,
                  ]}
                >
                  <Ionicons
                    name={
                      item.role ===
                      "alumni"
                        ? "ribbon-outline"
                        : "school-outline"
                    }
                    size={11}
                    color="#555"
                  />

                  <Text
                    style={
                      styles.roleText
                    }
                  >
                    {item.role ===
                    "alumni"
                      ? "Alumni"
                      : "Student"}
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.username
                }
              >
                @{item.username}
              </Text>

              <Text
                style={
                  styles.description
                }
                numberOfLines={
                  1
                }
              >
                {
                  item.description
                }
              </Text>

              <Text
                style={
                  styles.mutual
                }
              >
                {
                  item.mutualConnections
                }{" "}
                mutual connections
              </Text>

              <View
                style={
                  styles.actions
                }
              >
                <Pressable
                  style={
                    styles.acceptButton
                  }
                  onPress={() =>
                    acceptRequest(
                      item
                    )
                  }
                >
                  <Text
                    style={
                      styles.acceptText
                    }
                  >
                    Accept
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.rejectButton
                  }
                  onPress={() =>
                    rejectRequest(
                      item
                    )
                  }
                >
                  <Text
                    style={
                      styles.rejectText
                    }
                  >
                    Decline
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View
            style={
              styles.emptyContainer
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="people-outline"
                size={34}
                color={PRIMARY}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No requests
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              New message requests
              from students and
              alumni will appear
              here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#fff",
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal:
        18,
      paddingTop: 8,
      paddingBottom: 18,
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        "#F3F3F5",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 13,
    },

    title: {
      fontSize: 24,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      marginTop: 2,
      color: "#888",
      fontSize: 12,
    },

    list: {
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,
    },

    requestItem: {
      flexDirection: "row",
      paddingHorizontal:
        20,
      paddingVertical: 17,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F0F0F2",
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        "#eee",
    },

    requestContent: {
      flex: 1,
      marginLeft: 13,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 7,
    },

    name: {
      fontSize: 16,
      fontWeight: "800",
      color: "#191919",
    },

    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor:
        "#EFEFF2",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },

    alumniBadge: {
      backgroundColor:
        "#FFF3D5",
    },

    roleText: {
      fontSize: 10,
      color: "#555",
      fontWeight: "700",
    },

    username: {
      fontSize: 12,
      color: "#85858F",
      marginTop: 3,
    },

    description: {
      marginTop: 7,
      color: "#444",
      fontSize: 13,
    },

    mutual: {
      marginTop: 4,
      color: "#999",
      fontSize: 11,
    },

    actions: {
      flexDirection: "row",
      marginTop: 13,
      gap: 8,
    },

    acceptButton: {
      flex: 1,
      height: 38,
      borderRadius: 10,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    acceptText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "800",
    },

    rejectButton: {
      flex: 1,
      height: 38,
      borderRadius: 10,
      backgroundColor:
        "#EFEFF2",
      alignItems: "center",
      justifyContent:
        "center",
    },

    rejectText: {
      color: "#333",
      fontSize: 13,
      fontWeight: "700",
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal:
        40,
    },

    emptyIcon: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      marginTop: 17,
      fontSize: 19,
      fontWeight: "800",
      color: "#222",
    },

    emptyText: {
      marginTop: 7,
      color: "#85858F",
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
    },
  });