import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

const PRIMARY = "#0300cf";

type UserType = "all" | "student" | "alumni" | "business";
type EngagementType =
  | "engagement"
  | "posts"
  | "likes"
  | "comments"
  | "shares";
type TimeRange = "7days" | "30days" | "6months";

type ProfileRow = {
  id: string;
  role: string | null;
  status: string | null;
  created_at: string;
};

type DatedRow = {
  created_at: string;
};

type OpportunityRow = {
  id: string;
  status: string | null;
  created_at: string;
};

type AlumniRow = {
  user_id: string;
  verified: boolean | null;
};

type BusinessRow = {
  user_id: string;
  verified: boolean | null;
};

type GraphPoint = {
  label: string;
  value: number;
};

type Counts = {
  totalUsers: number;
  students: number;
  alumni: number;
  businesses: number;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  opportunities: number;
  activeAccounts: number;
  pendingAccounts: number;
  suspendedAccounts: number;
  rejectedAccounts: number;
  approvedOpportunities: number;
  pendingOpportunities: number;
  rejectedOpportunities: number;
  closedOpportunities: number;
  unverifiedAlumni: number;
  pendingBusinesses: number;
};

const EMPTY: Counts = {
  totalUsers: 0,
  students: 0,
  alumni: 0,
  businesses: 0,
  posts: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  engagement: 0,
  opportunities: 0,
  activeAccounts: 0,
  pendingAccounts: 0,
  suspendedAccounts: 0,
  rejectedAccounts: 0,
  approvedOpportunities: 0,
  pendingOpportunities: 0,
  rejectedOpportunities: 0,
  closedOpportunities: 0,
  unverifiedAlumni: 0,
  pendingBusinesses: 0,
};

export default function AdminAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [posts, setPosts] = useState<DatedRow[]>([]);
  const [likes, setLikes] = useState<DatedRow[]>([]);
  const [comments, setComments] = useState<DatedRow[]>([]);
  const [shares, setShares] = useState<DatedRow[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [counts, setCounts] = useState<Counts>(EMPTY);

  const [userType, setUserType] = useState<UserType>("all");
  const [userRange, setUserRange] = useState<TimeRange>("30days");
  const [engagementType, setEngagementType] =
    useState<EngagementType>("engagement");
  const [engagementRange, setEngagementRange] =
    useState<TimeRange>("30days");

  const loadAnalytics = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("No signed-in user.");

      const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("role,status")
        .eq("id", user.id)
        .single();

      if (meError) throw meError;

      if (me?.role !== "admin" || me?.status !== "active") {
        throw new Error("Administrator access required.");
      }

      const [
        profileResult,
        postResult,
        likeResult,
        commentResult,
        shareResult,
        opportunityResult,
        alumniResult,
        businessResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,role,status,created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("posts")
          .select("created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("post_likes")
          .select("created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("post_comments")
          .select("created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("post_shares")
          .select("created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("opportunities")
          .select("id,status,created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("alumni_profiles")
          .select("user_id,verified"),
        supabase
          .from("business_profiles")
          .select("user_id,verified"),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (postResult.error) throw postResult.error;
      if (opportunityResult.error) throw opportunityResult.error;

      if (likeResult.error) {
        console.log("Admin likes analytics:", likeResult.error);
      }
      if (commentResult.error) {
        console.log("Admin comments analytics:", commentResult.error);
      }
      if (shareResult.error) {
        console.log("Admin shares analytics:", shareResult.error);
      }
      if (alumniResult.error) {
        console.log("Admin alumni analytics:", alumniResult.error);
      }
      if (businessResult.error) {
        console.log("Admin business analytics:", businessResult.error);
      }

      const profileRows = (profileResult.data || []) as ProfileRow[];
      const postRows = (postResult.data || []) as DatedRow[];
      const likeRows = (likeResult.data || []) as DatedRow[];
      const commentRows = (commentResult.data || []) as DatedRow[];
      const shareRows = (shareResult.data || []) as DatedRow[];
      const opportunityRows =
        (opportunityResult.data || []) as OpportunityRow[];
      const alumniRows = (alumniResult.data || []) as AlumniRow[];
      const businessRows = (businessResult.data || []) as BusinessRow[];

      setProfiles(profileRows);
      setPosts(postRows);
      setLikes(likeRows);
      setComments(commentRows);
      setShares(shareRows);
      setOpportunities(opportunityRows);

      const students = profileRows.filter(
        (item) => item.role === "student"
      ).length;
      const alumni = profileRows.filter(
        (item) => item.role === "alumni"
      ).length;
      const businesses = profileRows.filter(
        (item) => item.role === "business"
      ).length;

      const engagement =
        likeRows.length + commentRows.length + shareRows.length;

      const businessProfileMap = new Map(
        businessRows.map((item) => [item.user_id, item])
      );

      const pendingBusinesses = profileRows.filter((item) => {
        if (item.role !== "business") return false;

        const businessProfile = businessProfileMap.get(item.id);

        return (
          item.status === "pending" ||
          businessProfile?.verified === false
        );
      }).length;

      setCounts({
        totalUsers: profileRows.length,
        students,
        alumni,
        businesses,
        posts: postRows.length,
        likes: likeRows.length,
        comments: commentRows.length,
        shares: shareRows.length,
        engagement,
        opportunities: opportunityRows.length,

        activeAccounts: profileRows.filter(
          (item) => item.status === "active"
        ).length,
        pendingAccounts: profileRows.filter(
          (item) => item.status === "pending"
        ).length,
        suspendedAccounts: profileRows.filter(
          (item) => item.status === "suspended"
        ).length,
        rejectedAccounts: profileRows.filter(
          (item) => item.status === "rejected"
        ).length,

        approvedOpportunities: opportunityRows.filter(
          (item) => item.status === "approved"
        ).length,
        pendingOpportunities: opportunityRows.filter(
          (item) => item.status === "pending"
        ).length,
        rejectedOpportunities: opportunityRows.filter(
          (item) => item.status === "rejected"
        ).length,
        closedOpportunities: opportunityRows.filter(
          (item) => item.status === "closed"
        ).length,

        unverifiedAlumni: alumniRows.filter(
          (item) => item.verified === false
        ).length,

        pendingBusinesses,
      });
    } catch (error) {
      console.log("Admin analytics error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics(true);
    }, [loadAnalytics])
  );

  useEffect(() => {
    const channel = supabase
      .channel("admin-analytics-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => loadAnalytics(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => loadAnalytics(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        () => loadAnalytics(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments" },
        () => loadAnalytics(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_shares" },
        () => loadAnalytics(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        () => loadAnalytics(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAnalytics]);

  async function refresh() {
    setRefreshing(true);
    await loadAnalytics(false);
  }

  const selectedUsers = useMemo(() => {
    if (userType === "all") {
      return profiles.filter((item) =>
        ["student", "alumni", "business"].includes(
          String(item.role || "")
        )
      );
    }

    return profiles.filter((item) => item.role === userType);
  }, [profiles, userType]);

  const userGraph = useMemo(
    () => buildGraphData(selectedUsers, userRange),
    [selectedUsers, userRange]
  );

  const selectedEngagement = useMemo(() => {
    if (engagementType === "posts") return posts;
    if (engagementType === "likes") return likes;
    if (engagementType === "comments") return comments;
    if (engagementType === "shares") return shares;

    return [...likes, ...comments, ...shares];
  }, [engagementType, posts, likes, comments, shares]);

  const engagementGraph = useMemo(
    () => buildGraphData(selectedEngagement, engagementRange),
    [selectedEngagement, engagementRange]
  );

  const maxRole = Math.max(
    counts.students,
    counts.alumni,
    counts.businesses,
    1
  );

  const maxContent = Math.max(
    counts.posts,
    counts.likes,
    counts.comments,
    counts.shares,
    1
  );

  const maxOpportunity = Math.max(
    counts.approvedOpportunities,
    counts.pendingOpportunities,
    counts.rejectedOpportunities,
    counts.closedOpportunities,
    1
  );

  const maxAccount = Math.max(
    counts.activeAccounts,
    counts.pendingAccounts,
    counts.suspendedAccounts,
    counts.rejectedAccounts,
    1
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>
          Loading platform analytics...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
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
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Platform analytics</Text>
          <Text style={styles.introText}>
            Monitor Richfield Connect users, content, engagement,
            opportunities and account activity.
          </Text>
        </View>

        <SectionTitle
          title="Overview"
          subtitle="Current platform totals"
        />

        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            value={counts.totalUsers}
            label="Users"
          />
          <StatCard
            icon="school-outline"
            value={counts.students}
            label="Students"
          />
          <StatCard
            icon="ribbon-outline"
            value={counts.alumni}
            label="Alumni"
          />
          <StatCard
            icon="business-outline"
            value={counts.businesses}
            label="Businesses"
          />
          <StatCard
            icon="newspaper-outline"
            value={counts.posts}
            label="Posts"
          />
          <StatCard
            icon="pulse-outline"
            value={counts.engagement}
            label="Engagement"
          />
          <StatCard
            icon="briefcase-outline"
            value={counts.opportunities}
            label="Opportunities"
          />
          <StatCard
            icon="time-outline"
            value={counts.pendingAccounts}
            label="Pending users"
          />
        </View>

        <SectionTitle
          title="User growth"
          subtitle="New platform accounts created over time"
        />

        <View style={styles.card}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalTabs}
          >
            <Pill
              title="All users"
              active={userType === "all"}
              onPress={() => setUserType("all")}
            />
            <Pill
              title="Students"
              active={userType === "student"}
              onPress={() => setUserType("student")}
            />
            <Pill
              title="Alumni"
              active={userType === "alumni"}
              onPress={() => setUserType("alumni")}
            />
            <Pill
              title="Business"
              active={userType === "business"}
              onPress={() => setUserType("business")}
            />
          </ScrollView>

          <GraphHeading
            title={getUserGraphTitle(userType)}
            total={userGraph.reduce(
              (sum, item) => sum + item.value,
              0
            )}
            range={userRange}
          />

          <RangeSelector
            value={userRange}
            onChange={setUserRange}
          />

          <AnalyticsGraph data={userGraph} />
        </View>

        <SectionTitle
          title="User distribution"
          subtitle="Platform accounts by user type"
        />

        <View style={styles.card}>
          <MetricBar
            label="Students"
            value={counts.students}
            maximum={maxRole}
          />
          <MetricBar
            label="Alumni"
            value={counts.alumni}
            maximum={maxRole}
          />
          <MetricBar
            label="Businesses"
            value={counts.businesses}
            maximum={maxRole}
          />
        </View>

        <SectionTitle
          title="Platform engagement"
          subtitle="Content and interaction trends across the platform"
        />

        <View style={styles.card}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalTabs}
          >
            <Pill
              title="Engagement"
              active={engagementType === "engagement"}
              onPress={() => setEngagementType("engagement")}
            />
            <Pill
              title="Posts"
              active={engagementType === "posts"}
              onPress={() => setEngagementType("posts")}
            />
            <Pill
              title="Likes"
              active={engagementType === "likes"}
              onPress={() => setEngagementType("likes")}
            />
            <Pill
              title="Comments"
              active={engagementType === "comments"}
              onPress={() => setEngagementType("comments")}
            />
            <Pill
              title="Shares"
              active={engagementType === "shares"}
              onPress={() => setEngagementType("shares")}
            />
          </ScrollView>

          <GraphHeading
            title={getEngagementTitle(engagementType)}
            total={engagementGraph.reduce(
              (sum, item) => sum + item.value,
              0
            )}
            range={engagementRange}
          />

          <RangeSelector
            value={engagementRange}
            onChange={setEngagementRange}
          />

          <AnalyticsGraph data={engagementGraph} />

          <View style={styles.infoRow}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color="#777"
            />
            <Text style={styles.infoText}>
              Engagement combines likes, comments and shares across
              platform posts.
            </Text>
          </View>
        </View>

        <SectionTitle
          title="Content activity"
          subtitle="Current totals for platform content interactions"
        />

        <View style={styles.card}>
          <MetricBar
            label="Posts"
            value={counts.posts}
            maximum={maxContent}
          />
          <MetricBar
            label="Likes"
            value={counts.likes}
            maximum={maxContent}
          />
          <MetricBar
            label="Comments"
            value={counts.comments}
            maximum={maxContent}
          />
          <MetricBar
            label="Shares"
            value={counts.shares}
            maximum={maxContent}
          />
        </View>

        <SectionTitle
          title="Opportunities"
          subtitle="Current opportunity approval and publishing status"
        />

        <View style={styles.card}>
          <MetricBar
            label="Approved"
            value={counts.approvedOpportunities}
            maximum={maxOpportunity}
          />
          <MetricBar
            label="Pending"
            value={counts.pendingOpportunities}
            maximum={maxOpportunity}
          />
          <MetricBar
            label="Rejected"
            value={counts.rejectedOpportunities}
            maximum={maxOpportunity}
          />
          <MetricBar
            label="Closed"
            value={counts.closedOpportunities}
            maximum={maxOpportunity}
          />
        </View>

        <SectionTitle
          title="Account status"
          subtitle="Current account state across Richfield Connect"
        />

        <View style={styles.card}>
          <MetricBar
            label="Active"
            value={counts.activeAccounts}
            maximum={maxAccount}
          />
          <MetricBar
            label="Pending"
            value={counts.pendingAccounts}
            maximum={maxAccount}
          />
          <MetricBar
            label="Suspended"
            value={counts.suspendedAccounts}
            maximum={maxAccount}
          />
          <MetricBar
            label="Rejected"
            value={counts.rejectedAccounts}
            maximum={maxAccount}
          />
        </View>

        <SectionTitle
          title="Admin attention"
          subtitle="Items that may require administrator review"
        />

        <View style={styles.attentionGrid}>
          <AttentionCard
            icon="person-add-outline"
            value={counts.pendingAccounts}
            label="Pending accounts"
          />
          <AttentionCard
            icon="business-outline"
            value={counts.pendingBusinesses}
            label="Business reviews"
          />
          <AttentionCard
            icon="ribbon-outline"
            value={counts.unverifiedAlumni}
            label="Alumni verification"
          />
          <AttentionCard
            icon="briefcase-outline"
            value={counts.pendingOpportunities}
            label="Opportunity reviews"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Pill({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.pillText,
          active && styles.pillTextActive,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function GraphHeading({
  title,
  total,
  range,
}: {
  title: string;
  total: number;
  range: TimeRange;
}) {
  return (
    <View style={styles.graphHeading}>
      <View style={{ flex: 1 }}>
        <Text style={styles.graphTitle}>{title}</Text>
        <Text style={styles.graphSubtitle}>
          {getRangeLabel(range)}
        </Text>
      </View>
      <View style={styles.graphTotalBox}>
        <Text style={styles.graphTotal}>{total}</Text>
        <Text style={styles.graphTotalLabel}>in period</Text>
      </View>
    </View>
  );
}

function RangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  return (
    <View style={styles.rangeTabs}>
      <RangeButton
        title="7 Days"
        active={value === "7days"}
        onPress={() => onChange("7days")}
      />
      <RangeButton
        title="30 Days"
        active={value === "30days"}
        onPress={() => onChange("30days")}
      />
      <RangeButton
        title="6 Months"
        active={value === "6months"}
        onPress={() => onChange("6months")}
      />
    </View>
  );
}

function RangeButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.rangeButton,
        active && styles.rangeButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.rangeText,
          active && styles.rangeTextActive,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function AnalyticsGraph({
  data,
}: {
  data: GraphPoint[];
}) {
  const maximum = Math.max(
    ...data.map((item) => item.value),
    1
  );

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chart}>
        {data.map((item, index) => {
          const height =
            item.value === 0
              ? 0
              : Math.max(
                  8,
                  (item.value / maximum) * 100
                );

          return (
            <View
              key={`${item.label}-${index}`}
              style={styles.chartColumn}
            >
              <View style={styles.chartValueArea}>
                {item.value > 0 ? (
                  <Text style={styles.chartValue}>
                    {item.value}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${height}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={styles.chartLabel}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MetricBar({
  label,
  value,
  maximum,
}: {
  label: string;
  value: number;
  maximum: number;
}) {
  const width =
    value === 0
      ? 0
      : Math.max(
          5,
          (value / Math.max(maximum, 1)) * 100
        );

  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <View style={styles.metricTrack}>
        <View
          style={[
            styles.metricFill,
            {
              width: `${Math.min(width, 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function AttentionCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.attentionCard}>
      <View style={styles.attentionIcon}>
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <Text style={styles.attentionValue}>{value}</Text>
      <Text style={styles.attentionLabel}>{label}</Text>
    </View>
  );
}

function buildGraphData(
  rows: DatedRow[],
  range: TimeRange
): GraphPoint[] {
  if (range === "7days") {
    return buildDailyData(rows, 7);
  }

  if (range === "30days") {
    return buildThirtyDayData(rows);
  }

  return buildMonthlyData(rows);
}

function buildDailyData(
  rows: DatedRow[],
  days: number
): GraphPoint[] {
  const result: GraphPoint[] = [];
  const today = startOfDay(new Date());

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(today.getDate() - i);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    result.push({
      label: start.toLocaleDateString(undefined, {
        weekday: "short",
      }),
      value: countBetween(rows, start, end),
    });
  }

  return result;
}

function buildThirtyDayData(
  rows: DatedRow[]
): GraphPoint[] {
  const result: GraphPoint[] = [];
  const today = startOfDay(new Date());
  const periodStart = new Date(today);

  periodStart.setDate(today.getDate() - 29);

  for (let bucket = 0; bucket < 5; bucket++) {
    const start = new Date(periodStart);
    start.setDate(
      periodStart.getDate() + bucket * 6
    );

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    if (bucket === 4) {
      end.setTime(today.getTime());
      end.setDate(end.getDate() + 1);
    }

    result.push({
      label:
        bucket === 4
          ? "Now"
          : start.toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            }),
      value: countBetween(rows, start, end),
    });
  }

  return result;
}

function buildMonthlyData(
  rows: DatedRow[]
): GraphPoint[] {
  const result: GraphPoint[] = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const start = new Date(
      today.getFullYear(),
      today.getMonth() - i,
      1
    );

    const end = new Date(
      today.getFullYear(),
      today.getMonth() - i + 1,
      1
    );

    result.push({
      label: start.toLocaleDateString(undefined, {
        month: "short",
      }),
      value: countBetween(rows, start, end),
    });
  }

  return result;
}

function countBetween(
  rows: DatedRow[],
  start: Date,
  end: Date
) {
  return rows.filter((item) => {
    const date = new Date(item.created_at);

    return date >= start && date < end;
  }).length;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getRangeLabel(range: TimeRange) {
  if (range === "7days") return "Last 7 days";
  if (range === "30days") return "Last 30 days";
  return "Last 6 months";
}

function getUserGraphTitle(type: UserType) {
  if (type === "student") return "Student growth";
  if (type === "alumni") return "Alumni growth";
  if (type === "business") return "Business growth";
  return "User growth";
}

function getEngagementTitle(
  type: EngagementType
) {
  if (type === "posts") return "Post activity";
  if (type === "likes") return "Like activity";
  if (type === "comments") return "Comment activity";
  if (type === "shares") return "Share activity";
  return "Engagement activity";
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: "#777",
  },
  content: {
    padding: 18,
    paddingBottom: 50,
  },
  intro: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.5,
  },
  introText: {
    marginTop: 5,
    maxWidth: 360,
    fontSize: 13,
    lineHeight: 19,
    color: "#72727B",
  },
  sectionHeading: {
    marginTop: 3,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17171A",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#85858D",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  statCard: {
    width: "48%",
    marginBottom: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E9EE",
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  statIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "#EEEEFF",
  },
  statValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#74747D",
  },
  card: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9E9EE",
    borderRadius: 17,
    backgroundColor: "#fff",
  },
  horizontalTabs: {
    gap: 7,
    paddingBottom: 3,
  },
  pill: {
    minHeight: 35,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: "#F0F0F4",
  },
  pillActive: {
    backgroundColor: PRIMARY,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#66666E",
  },
  pillTextActive: {
    color: "#fff",
  },
  graphHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF2",
  },
  graphTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171717",
  },
  graphSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#888",
  },
  graphTotalBox: {
    alignItems: "flex-end",
  },
  graphTotal: {
    fontSize: 22,
    fontWeight: "800",
    color: PRIMARY,
  },
  graphTotalLabel: {
    fontSize: 9,
    color: "#999",
  },
  rangeTabs: {
    flexDirection: "row",
    marginTop: 15,
    marginBottom: 17,
    padding: 4,
    borderRadius: 10,
    backgroundColor: "#F3F3F6",
  },
  rangeButton: {
    flex: 1,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  rangeButtonActive: {
    backgroundColor: "#fff",
    elevation: 1,
  },
  rangeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#888",
  },
  rangeTextActive: {
    fontWeight: "800",
    color: PRIMARY,
  },
  chartContainer: {
    height: 215,
    paddingTop: 5,
  },
  chart: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4EA",
  },
  chartColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartValueArea: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartValue: {
    marginBottom: 5,
    fontSize: 10,
    fontWeight: "700",
    color: "#666",
  },
  chartBar: {
    width: "54%",
    maxWidth: 30,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: PRIMARY,
  },
  chartLabel: {
    marginTop: 8,
    marginBottom: -19,
    fontSize: 9,
    color: "#777",
  },
  infoRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 29,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F3",
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: "#777",
  },
  metric: {
    marginBottom: 17,
  },
  metricTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555",
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#222",
  },
  metricTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#EEEEF3",
  },
  metricFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: PRIMARY,
  },
  attentionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  attentionCard: {
    width: "48%",
    minHeight: 112,
    marginBottom: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E9EE",
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  attentionIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#EEEEFF",
  },
  attentionValue: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
  },
  attentionLabel: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    color: "#74747D",
  },
});