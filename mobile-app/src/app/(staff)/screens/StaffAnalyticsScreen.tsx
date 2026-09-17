import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type AnalyticsData = {
  community_count: number;
  event_count: number;
  upcoming_event_count: number;
  announcement_count: number;
  event_registration_count: number;
};

type Campus = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
};

const EMPTY_ANALYTICS: AnalyticsData = {
  community_count: 0,
  event_count: 0,
  upcoming_event_count: 0,
  announcement_count: 0,
  event_registration_count: 0,
};

export default function StaffAnalyticsScreen() {
  const [analytics, setAnalytics] =
    useState<AnalyticsData>(EMPTY_ANALYTICS);

  const [campuses, setCampuses] =
    useState<Campus[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadCampuses = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error("Not authenticated.");
    }

    const {
      data: assignments,
      error: assignmentError,
    } = await supabase
      .from("staff_campuses")
      .select("campus_id")
      .eq("staff_user_id", user.id);

    if (assignmentError) {
      throw assignmentError;
    }

    const ids = (assignments || []).map(
      item => item.campus_id
    );

    if (!ids.length) {
      setCampuses([]);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("campuses")
      .select(`
        id,
        name,
        code,
        city
      `)
      .in("id", ids)
      .eq("active", true)
      .order("name");

    if (error) {
      throw error;
    }

    setCampuses((data || []) as Campus[]);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_staff_analytics"
    );

    if (error) {
      throw error;
    }

    const row = Array.isArray(data)
      ? data[0]
      : data;

    if (!row) {
      setAnalytics(EMPTY_ANALYTICS);
      return;
    }

    setAnalytics({
      community_count:
        Number(row.community_count) || 0,

      event_count:
        Number(row.event_count) || 0,

      upcoming_event_count:
        Number(row.upcoming_event_count) || 0,

      announcement_count:
        Number(row.announcement_count) || 0,

      event_registration_count:
        Number(row.event_registration_count) || 0,
    });
  }, []);

  const loadScreen = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        await Promise.all([
          loadCampuses(),
          loadAnalytics(),
        ]);
      } catch (error: any) {
        console.log(
          "Staff analytics:",
          error
        );

        Alert.alert(
          "Analytics",
          error?.message ||
            "Could not load analytics."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadCampuses, loadAnalytics]
  );

  useFocusEffect(
    useCallback(() => {
      loadScreen(true);
    }, [loadScreen])
  );

  const averageRegistrations = useMemo(() => {
    if (!analytics.event_count) {
      return 0;
    }

    return (
      analytics.event_registration_count /
      analytics.event_count
    );
  }, [analytics]);

  const upcomingPercentage = useMemo(() => {
    if (!analytics.event_count) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (analytics.upcoming_event_count /
          analytics.event_count) *
          100
      )
    );
  }, [analytics]);

  const registrationReach = useMemo(() => {
    if (!analytics.community_count) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (analytics.event_registration_count /
          analytics.community_count) *
          100
      )
    );
  }, [analytics]);

  async function refresh() {
    setRefreshing(true);
    await loadScreen(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#111"
          />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Analytics
          </Text>

          <Text style={styles.headerSubtitle}>
            Campus community insights
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={() => loadScreen(false)}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={PRIMARY}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={PRIMARY}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.scopeCard}>
          <View style={styles.scopeIcon}>
            <Ionicons
              name="business-outline"
              size={21}
              color={PRIMARY}
            />
          </View>

          <View style={styles.scopeContent}>
            <Text style={styles.scopeLabel}>
              Analytics scope
            </Text>

            <Text style={styles.scopeValue}>
              {campuses.length
                ? campuses
                    .map(campus => campus.name)
                    .join(", ")
                : "No campus assigned"}
            </Text>
          </View>

          <View style={styles.secureBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color="#16824C"
            />

            <Text style={styles.secureText}>
              Scoped
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Overview
          </Text>

          <Text style={styles.sectionSubtitle}>
            Current campus activity
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            value={analytics.community_count}
            label="Community"
            description="Students & alumni"
          />

          <StatCard
            icon="calendar-outline"
            value={analytics.event_count}
            label="Events"
            description="Total events"
          />

          <StatCard
            icon="time-outline"
            value={analytics.upcoming_event_count}
            label="Upcoming"
            description="Future events"
          />

          <StatCard
            icon="megaphone-outline"
            value={analytics.announcement_count}
            label="Announcements"
            description="Campus updates"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Event engagement
          </Text>

          <Text style={styles.sectionSubtitle}>
            Registration activity
          </Text>
        </View>

        <View style={styles.largeCard}>
          <View style={styles.largeCardTop}>
            <View style={styles.largeIcon}>
              <Ionicons
                name="people-outline"
                size={24}
                color={PRIMARY}
              />
            </View>

            <View style={styles.largeCardContent}>
              <Text style={styles.largeLabel}>
                Event registrations
              </Text>

              <Text style={styles.largeValue}>
                {formatNumber(
                  analytics.event_registration_count
                )}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricsRow}>
            <MiniMetric
              value={formatDecimal(
                averageRegistrations
              )}
              label="Avg. per event"
            />

            <View style={styles.verticalDivider} />

            <MiniMetric
              value={`${registrationReach}%`}
              label="Community reach"
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Event activity
          </Text>

          <Text style={styles.sectionSubtitle}>
            Upcoming event share
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>
                Upcoming events
              </Text>

              <Text style={styles.progressDescription}>
                {analytics.upcoming_event_count} of{" "}
                {analytics.event_count} events
              </Text>
            </View>

            <Text style={styles.progressPercentage}>
              {upcomingPercentage}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${upcomingPercentage}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Quick access
          </Text>
        </View>

        <View style={styles.quickActions}>
          <QuickAction
            icon="calendar-outline"
            title="Events"
            description="Manage campus events"
            onPress={() =>
              router.push("/(staff)/events" as any)
            }
          />

          <QuickAction
            icon="megaphone-outline"
            title="Announcements"
            description="Manage community updates"
            onPress={() =>
              router.push(
                "/(staff)/announcements" as any
              )
            }
          />

          <QuickAction
            icon="notifications-outline"
            title="Notifications"
            description="View your updates"
            onPress={() =>
              router.push(
                "/(staff)/notifications" as any
              )
            }
          />
        </View>

        <View style={styles.privacyCard}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#555"
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>
              Privacy protected
            </Text>

            <Text style={styles.privacyText}>
              Staff analytics contain aggregate
              community statistics for assigned
              campuses. Private student and alumni
              information is not displayed here.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  description: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={PRIMARY}
        />
      </View>

      <Text style={styles.statValue}>
        {formatNumber(value)}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>

      <Text style={styles.statDescription}>
        {description}
      </Text>
    </View>
  );
}

function MiniMetric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricValue}>
        {value}
      </Text>

      <Text style={styles.miniMetricLabel}>
        {label}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAction,
        pressed && {
          opacity: 0.7,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.quickIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={PRIMARY}
        />
      </View>

      <View style={styles.quickContent}>
        <Text style={styles.quickTitle}>
          {title}
        </Text>

        <Text style={styles.quickDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={17}
        color="#AAA"
      />
    </Pressable>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDecimal(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEE",
  },

  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  headerContent: {
    flex: 1,
    marginHorizontal: 5,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#777",
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEFF",
  },

  content: {
    padding: 16,
    paddingBottom: 45,
  },

  scopeCard: {
    padding: 14,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E6EA",
  },

  scopeIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEFF",
  },

  scopeContent: {
    flex: 1,
    marginLeft: 11,
  },

  scopeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
  },

  scopeValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "#222",
  },

  secureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF8EF",
  },

  secureText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#16824C",
  },

  sectionHeader: {
    marginTop: 23,
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#888",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },

  statCard: {
    width: "48.5%",
    minHeight: 145,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E6E6EA",
    backgroundColor: "#fff",
  },

  statIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEFF",
  },

  statValue: {
    marginTop: 13,
    fontSize: 25,
    fontWeight: "900",
    color: "#151515",
  },

  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
    color: "#333",
  },

  statDescription: {
    marginTop: 2,
    fontSize: 9,
    color: "#888",
  },

  largeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E6EA",
    backgroundColor: "#fff",
  },

  largeCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  largeIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEFF",
  },

  largeCardContent: {
    marginLeft: 13,
  },

  largeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
  },

  largeValue: {
    marginTop: 2,
    fontSize: 27,
    fontWeight: "900",
    color: "#151515",
  },

  divider: {
    height: 1,
    marginVertical: 15,
    backgroundColor: "#EEEEF0",
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  miniMetric: {
    flex: 1,
    alignItems: "center",
  },

  miniMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#222",
  },

  miniMetricLabel: {
    marginTop: 3,
    fontSize: 9,
    color: "#888",
  },

  verticalDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E8E8EB",
  },

  progressCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E6EA",
    backgroundColor: "#fff",
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#222",
  },

  progressDescription: {
    marginTop: 3,
    fontSize: 9,
    color: "#888",
  },

  progressPercentage: {
    fontSize: 18,
    fontWeight: "900",
    color: PRIMARY,
  },

  progressTrack: {
    height: 8,
    marginTop: 15,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#E8E8ED",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },

  quickActions: {
    gap: 8,
  },

  quickAction: {
    minHeight: 66,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E6EA",
    backgroundColor: "#fff",
  },

  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEFF",
  },

  quickContent: {
    flex: 1,
    marginLeft: 11,
  },

  quickTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#222",
  },

  quickDescription: {
    marginTop: 3,
    fontSize: 9,
    color: "#888",
  },

  privacyCard: {
    marginTop: 22,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EFEFF2",
  },

  privacyTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#444",
  },

  privacyText: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 14,
    color: "#777",
  },
});