import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

type MessageRequest = {
  request_id: string;
  sender_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: "student" | "alumni";
  created_at: string;
};

export default function RequestsScreen() {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_my_message_requests"
      );

      if (error) {
        throw error;
      }

      setRequests((data || []) as MessageRequest[]);
    } catch (error: any) {
      console.log("Load requests error:", error);

      Alert.alert(
        "Requests",
        error?.message || "Could not load your requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const channel = supabase
      .channel(`message-requests-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_requests",
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  async function refresh() {
    setRefreshing(true);
    await loadRequests();
  }

  async function respond(
    request: MessageRequest,
    accept: boolean
  ) {
    if (processingId) {
      return;
    }

    try {
      setProcessingId(request.request_id);

      const { data, error } = await supabase.rpc(
        "respond_to_message_request",
        {
          request_uuid: request.request_id,
          response_status: accept
            ? "accepted"
            : "rejected",
        }
      );

      if (error) {
        throw error;
      }

      setRequests((current) =>
        current.filter(
          (item) => item.request_id !== request.request_id
        )
      );

      if (!accept) {
        return;
      }

      const conversationId =
        typeof data === "string" ? data : null;

      if (!conversationId) {
        Alert.alert(
          "Connected",
          `You are now connected with ${
            request.full_name || "this member"
          }.`
        );

        return;
      }

      Alert.alert(
        "Request accepted",
        `You can now message ${
          request.full_name || "this member"
        }.`,
        [
          {
            text: "Later",
            style: "cancel",
          },
          {
            text: "Message",
            onPress: () => {
              router.push({
                pathname: "/conversation",
                params: {
                  conversationId,
                  id: conversationId,
                  userId: request.sender_id,
                  name:
                    request.full_name ||
                    "Richfield Member",
                  username:
                    request.username || "",
                  image:
                    request.avatar_url || "",
                  role: request.role,
                  online: "false",
                  blocked: "false",
                  isMentor: "false",
                },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.log("Respond request error:", error);

      Alert.alert(
        "Request",
        error?.message ||
          "Could not respond to this request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function openProfile(request: MessageRequest) {
    router.push({
      pathname: "/member-profile",
      params: {
        userId: request.sender_id,
      },
    });
  }

  function renderRequest({
    item,
  }: {
    item: MessageRequest;
  }) {
    const processing = processingId === item.request_id;

    return (
      <View style={styles.requestCard}>
        <Pressable
          style={styles.profileRow}
          onPress={() => openProfile(item)}
        >
          {item.avatar_url ? (
            <Image
              source={{
                uri: item.avatar_url,
              }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons
                name="person"
                size={25}
                color={PRIMARY}
              />
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {item.full_name || "Richfield Member"}
            </Text>

            {item.username ? (
              <Text style={styles.username}>
                {item.username.startsWith("@")
                  ? item.username
                  : `@${item.username}`}
              </Text>
            ) : null}

            <View style={styles.roleRow}>
              <Ionicons
                name={
                  item.role === "alumni"
                    ? "ribbon-outline"
                    : "school-outline"
                }
                size={12}
                color={PRIMARY}
              />

              <Text style={styles.roleText}>
                {item.role === "alumni"
                  ? "Alumni"
                  : "Student"}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color="#AAA"
          />
        </Pressable>

        <Text style={styles.requestText}>
          wants to connect and message you.
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.declineButton,
              processing && styles.disabledButton,
            ]}
            disabled={processing}
            onPress={() => respond(item, false)}
          >
            <Text style={styles.declineText}>
              Decline
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.acceptButton,
              processing && styles.disabledButton,
            ]}
            disabled={processing}
            onPress={() => respond(item, true)}
          >
            {processing ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.acceptText}>
                  Accept
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />

        <Text style={styles.loadingText}>
          Loading requests...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#111"
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Requests
          </Text>

          <Text style={styles.subtitle}>
            {requests.length === 0
              ? "No pending requests"
              : `${requests.length} pending ${
                  requests.length === 1
                    ? "request"
                    : "requests"
                }`}
          </Text>
        </View>

        <View style={styles.headerSpace} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.request_id}
        renderItem={renderRequest}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          requests.length
            ? styles.list
            : styles.emptyList
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="people-outline"
                size={39}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.emptyTitle}>
              You're all caught up
            </Text>

            <Text style={styles.emptyText}>
              New Student and Alumni connection
              requests will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#777",
  },

  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    alignItems: "center",
  },

  headerSpace: {
    width: 42,
  },

  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },

  list: {
    padding: 16,
    paddingBottom: 50,
  },

  requestCard: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E7EC",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#EEEEEE",
  },

  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 11,
  },

  name: {
    fontSize: 14,
    fontWeight: "800",
    color: "#222",
  },

  username: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },

  roleText: {
    fontSize: 9,
    fontWeight: "800",
    color: PRIMARY,
  },

  requestText: {
    marginTop: 12,
    color: "#666",
    fontSize: 11,
  },

  actions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },

  declineButton: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D9D9DF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  declineText: {
    color: "#555",
    fontSize: 11,
    fontWeight: "800",
  },

  acceptButton: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  acceptText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.6,
  },

  separator: {
    height: 11,
  },

  emptyList: {
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  emptyText: {
    maxWidth: 270,
    marginTop: 6,
    textAlign: "center",
    color: "#777",
    fontSize: 11,
    lineHeight: 17,
  },
});