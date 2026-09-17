import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type NotificationType =
  | "system"
  | "event"
  | "announcement"
  | "message"
  | "account"
  | "moderation";

type FilterType =
  | "all"
  | "unread"
  | "events"
  | "announcements";

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export default function StaffNotificationsScreen() {
  const [userId, setUserId] =
    useState<string | null>(null);

  const [notifications, setNotifications] =
    useState<NotificationRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [markingAll, setMarkingAll] =
    useState(false);

  const [filter, setFilter] =
    useState<FilterType>("all");

  const loadNotifications = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user = authData.user;

        if (!user) {
          throw new Error(
            "You are not signed in."
          );
        }

        setUserId(user.id);

        const {
          data,
          error,
        } = await supabase
          .from("notifications")
          .select(`
            id,
            user_id,
            type,
            title,
            body,
            entity_type,
            entity_id,
            read_at,
            created_at
          `)
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(100);

        if (error) {
          throw error;
        }

        setNotifications(
          (data ?? []) as NotificationRow[]
        );
      } catch (error: any) {
        console.log(
          "Notifications load error:",
          error
        );

        Alert.alert(
          "Could not load notifications",
          error?.message ||
            "Please try again."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadNotifications();

      return undefined;
    }, [loadNotifications])
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(
        `staff-notifications-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        item => !item.read_at
      ).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case "unread":
        return notifications.filter(
          item => !item.read_at
        );

      case "events":
        return notifications.filter(
          item => item.type === "event"
        );

      case "announcements":
        return notifications.filter(
          item =>
            item.type === "announcement"
        );

      default:
        return notifications;
    }
  }, [notifications, filter]);

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadNotifications(false);
    } finally {
      setRefreshing(false);
    }
  }

  async function markAsRead(
    notification: NotificationRow
  ) {
    if (notification.read_at) {
      return;
    }

    const readAt =
      new Date().toISOString();

    setNotifications(current =>
      current.map(item =>
        item.id === notification.id
          ? {
              ...item,
              read_at: readAt,
            }
          : item
      )
    );

    const { error } = await supabase.rpc(
      "mark_notification_read",
      {
        p_notification_id:
          notification.id,
      }
    );

    if (error) {
      console.log(
        "Mark notification read error:",
        error
      );

      await loadNotifications(false);
    }
  }

  async function markAllAsRead() {
    if (
      unreadCount === 0 ||
      markingAll
    ) {
      return;
    }

    try {
      setMarkingAll(true);

      const { error } =
        await supabase.rpc(
          "mark_all_notifications_read"
        );

      if (error) {
        throw error;
      }

      const now =
        new Date().toISOString();

      setNotifications(current =>
        current.map(item => ({
          ...item,
          read_at:
            item.read_at ?? now,
        }))
      );
    } catch (error: any) {
      Alert.alert(
        "Could not update notifications",
        error?.message ||
          "Please try again."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(
    notification: NotificationRow
  ) {
    await markAsRead(notification);

    if (
      notification.entity_type ===
        "event" &&
      notification.entity_id
    ) {
      /*
       * We can change this to an event
       * detail route once that route exists.
       */
      router.push(
        "/(staff)/events"
      );

      return;
    }

    if (
      notification.entity_type ===
      "announcement" &&
      notification.entity_id
    ) {
      router.push(
        "/(staff)/announcements"
      );

      return;
    }

    if (
      notification.entity_type ===
        "conversation" &&
      notification.entity_id
    ) {
      router.push({
        pathname: "/conversation",
        params: {
          conversationId:
            notification.entity_id,
        },
      });

      return;
    }
  }

  function notificationVisual(
    type: NotificationType
  ) {
    switch (type) {
      case "event":
        return {
          icon: "calendar-outline" as const,
          background: "#EEF5FF",
          foreground: "#2368C4",
        };

      case "announcement":
        return {
          icon: "megaphone-outline" as const,
          background: "#F1F0FF",
          foreground: PRIMARY,
        };

      case "message":
        return {
          icon: "chatbubble-outline" as const,
          background: "#ECF8F0",
          foreground: "#078343",
        };

      case "account":
        return {
          icon:
            "shield-checkmark-outline" as const,
          background: "#FFF6E7",
          foreground: "#9A6500",
        };

      case "moderation":
        return {
          icon: "warning-outline" as const,
          background: "#FFF0F0",
          foreground: "#C32929",
        };

      default:
        return {
          icon:
            "notifications-outline" as const,
          background: "#F2F2F4",
          foreground: "#555",
        };
    }
  }

  function relativeTime(value: string) {
    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "";
    }

    const difference =
      Date.now() - date.getTime();

    const minutes = Math.floor(
      difference / 60000
    );

    if (minutes < 1) {
      return "Now";
    }

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `${days}d`;
    }

    return date.toLocaleDateString(
      "en-ZA",
      {
        day: "2-digit",
        month: "short",
      }
    );
  }

  function renderNotification({
    item,
  }: {
    item: NotificationRow;
  }) {
    const visual =
      notificationVisual(item.type);

    const unread =
      !item.read_at;

    return (
      <Pressable
        style={[
          styles.notificationCard,
          unread &&
            styles.unreadNotification,
        ]}
        onPress={() =>
          openNotification(item)
        }
      >
        <View
          style={[
            styles.notificationIcon,
            {
              backgroundColor:
                visual.background,
            },
          ]}
        >
          <Ionicons
            name={visual.icon}
            size={22}
            color={visual.foreground}
          />
        </View>

        <View
          style={styles.notificationContent}
        >
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.notificationTitle,
                unread &&
                  styles.unreadTitle,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={styles.time}>
              {relativeTime(
                item.created_at
              )}
            </Text>
          </View>

          {item.body ? (
            <Text
              style={styles.notificationBody}
              numberOfLines={3}
            >
              {item.body}
            </Text>
          ) : null}
        </View>

        {unread && (
          <View style={styles.unreadDot} />
        )}
      </Pressable>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="notifications-off-outline"
            size={32}
            color={PRIMARY}
          />
        </View>

        <Text style={styles.emptyTitle}>
          No notifications
        </Text>

        <Text style={styles.emptyText}>
          {filter === "unread"
            ? "You're all caught up."
            : "New notifications will appear here."}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>
              Notifications
            </Text>

            {unreadCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.headerSubtitle}>
            Stay updated with your account
          </Text>
        </View>

        {unreadCount > 0 && (
          <Pressable
            style={styles.readAllButton}
            onPress={markAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <ActivityIndicator
                size="small"
                color={PRIMARY}
              />
            ) : (
              <Text style={styles.readAllText}>
                Read all
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterContent
          }
        >
          <FilterChip
            label="All"
            selected={filter === "all"}
            onPress={() =>
              setFilter("all")
            }
          />

          <FilterChip
            label={`Unread${
              unreadCount
                ? ` (${unreadCount})`
                : ""
            }`}
            selected={filter === "unread"}
            onPress={() =>
              setFilter("unread")
            }
          />

          <FilterChip
            label="Events"
            selected={filter === "events"}
            onPress={() =>
              setFilter("events")
            }
          />

          <FilterChip
            label="Announcements"
            selected={
              filter === "announcements"
            }
            onPress={() =>
              setFilter("announcements")
            }
          />
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={PRIMARY}
          />

          <Text style={styles.loadingText}>
            Loading notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length ===
              0 &&
              styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterChip,
        selected &&
          styles.filterChipSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          selected &&
            styles.filterTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  countBadge: {
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },

  countText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },

  readAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  readAllText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "800",
  },

  filters: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F4",
  },

  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#F2F2F4",
  },

  filterChipSelected: {
    backgroundColor: "#EEEEFF",
    borderWidth: 1,
    borderColor: "#BEBDF7",
  },

  filterText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },

  filterTextSelected: {
    color: PRIMARY,
    fontWeight: "800",
  },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },

  emptyList: {
    flexGrow: 1,
  },

  notificationCard: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFF1",
  },

  unreadNotification: {
    backgroundColor: "#F8F8FF",
    borderRadius: 13,
    marginBottom: 5,
    borderBottomWidth: 0,
  },

  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  notificationContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    lineHeight: 19,
    paddingRight: 7,
  },

  unreadTitle: {
    fontWeight: "800",
    color: "#111",
  },

  notificationBody: {
    fontSize: 12,
    lineHeight: 18,
    color: "#666",
    marginTop: 4,
    paddingRight: 8,
  },

  time: {
    fontSize: 10,
    color: "#999",
  },

  unreadDot: {
    position: "absolute",
    right: 8,
    top: 37,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#777",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: "#F0F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
  },

  emptyText: {
    fontSize: 13,
    color: "#777",
    marginTop: 5,
    textAlign: "center",
  },
});