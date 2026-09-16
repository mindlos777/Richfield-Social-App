import React, { useCallback, useMemo, useState } from "react";
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
import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

type Role = "student" | "alumni";
type GraphType =
  | "posts"
  | "likes"
  | "comments"
  | "shares"
  | "followers"
  | "portfolio"
  | "engagement";
type TimeRange = "7days" | "30days" | "6months";

type DatedItem = { created_at: string };
type PostRow = { id: string; created_at: string };
type EngagementRow = { post_id: string; created_at?: string | null };
type GraphPoint = { label: string; value: number };

type AnalyticsData = {
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
  following: number;
  portfolioItems: number;
  engagement: number;
  profileStrength: number;
};

const EMPTY: AnalyticsData = {
  posts: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  followers: 0,
  following: 0,
  portfolioItems: 0,
  engagement: 0,
  profileStrength: 0,
};

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsData>(EMPTY);
  const [graphType, setGraphType] = useState<GraphType>("engagement");
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");

  const [posts, setPosts] = useState<DatedItem[]>([]);
  const [likes, setLikes] = useState<DatedItem[]>([]);
  const [comments, setComments] = useState<DatedItem[]>([]);
  const [shares, setShares] = useState<DatedItem[]>([]);
  const [followers, setFollowers] = useState<DatedItem[]>([]);
  const [portfolio, setPortfolio] = useState<DatedItem[]>([]);

  const loadAnalytics = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Your account could not be found.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name,role,avatar_url,headline,bio,linkedin_url,github_url,instagram_url,website_url")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const currentRole = String(profile?.role || "").toLowerCase();
      if (currentRole !== "student" && currentRole !== "alumni") {
        throw new Error("This dashboard is for students and alumni.");
      }

      setRole(currentRole as Role);
      setName(profile?.full_name || "Richfield Member");

      const [
        postResult,
        followersResult,
        followingResult,
        portfolioResult,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("id,created_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("follows")
          .select("created_at", { count: "exact" })
          .eq("following_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", user.id),
        supabase
          .from("portfolio_items")
          .select("created_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

      if (postResult.error) {
        console.log("POST ANALYTICS ERROR:", postResult.error);
        throw postResult.error;
      }
      if (followersResult.error) console.log("FOLLOWERS ANALYTICS ERROR:", followersResult.error);
      if (followingResult.error) console.log("FOLLOWING ANALYTICS ERROR:", followingResult.error);
      if (portfolioResult.error) console.log("PORTFOLIO ANALYTICS ERROR:", portfolioResult.error);

      console.log("ANALYTICS USER ID:", user.id);
      console.log("POST COUNT:", postResult.count);
      console.log("FOLLOWER COUNT:", followersResult.count);
      console.log("FOLLOWING COUNT:", followingResult.count);
      console.log("PORTFOLIO COUNT:", portfolioResult.count);

      const userPosts = (postResult.data || []) as PostRow[];
      const postIds = userPosts.map((item) => item.id);
      const postDateMap = new Map(
        userPosts.map((item) => [item.id, item.created_at])
      );

      let likeRows: EngagementRow[] = [];
      let commentRows: EngagementRow[] = [];
      let shareRows: EngagementRow[] = [];

      if (postIds.length > 0) {
        const [likesResult, commentsResult, sharesResult] = await Promise.all([
          supabase.from("post_likes").select("*").in("post_id", postIds),
          supabase.from("post_comments").select("*").in("post_id", postIds),
          supabase.from("post_shares").select("*").in("post_id", postIds),
        ]);

        if (likesResult.error) console.log("Likes analytics:", likesResult.error);
        if (commentsResult.error) console.log("Comments analytics:", commentsResult.error);
        if (sharesResult.error) console.log("Shares analytics:", sharesResult.error);

        likeRows = (likesResult.data || []) as EngagementRow[];
        commentRows = (commentsResult.data || []) as EngagementRow[];
        shareRows = (sharesResult.data || []) as EngagementRow[];
      }

      // If an engagement table has created_at, use the real interaction time.
      // Otherwise use the parent post date so the graph still works without
      // requiring a schema change.
      const normaliseEngagement = (rows: EngagementRow[]): DatedItem[] =>
        rows
          .map((row) => ({
            created_at:
              row.created_at ||
              postDateMap.get(row.post_id) ||
              "",
          }))
          .filter((row) => Boolean(row.created_at));

      const likeActivity = normaliseEngagement(likeRows);
      const commentActivity = normaliseEngagement(commentRows);
      const shareActivity = normaliseEngagement(shareRows);

      setPosts(userPosts.map((item) => ({ created_at: item.created_at })));
      setLikes(likeActivity);
      setComments(commentActivity);
      setShares(shareActivity);
      setFollowers((followersResult.data || []) as DatedItem[]);
      setPortfolio((portfolioResult.data || []) as DatedItem[]);

      const profileFields = [
        profile?.full_name,
        profile?.avatar_url,
        profile?.headline,
        profile?.bio,
        profile?.linkedin_url,
        profile?.github_url,
        profile?.instagram_url,
        profile?.website_url,
      ];

      let careerFields: any[] = [];

      if (currentRole === "student") {
        const { data: student } = await supabase
          .from("student_profiles")
          .select("programme,campus,year_of_study,skills,career_interests")
          .eq("user_id", user.id)
          .maybeSingle();

        careerFields = [
          student?.programme,
          student?.campus,
          student?.year_of_study,
          Array.isArray(student?.skills) && student.skills.length ? student.skills : null,
          Array.isArray(student?.career_interests) && student.career_interests.length
            ? student.career_interests
            : null,
        ];
      } else {
        const { data: alumni } = await supabase
          .from("alumni_profiles")
          .select("graduation_year,programme,campus,current_company,current_job_title,linkedin_url")
          .eq("user_id", user.id)
          .maybeSingle();

        careerFields = [
          alumni?.graduation_year,
          alumni?.programme,
          alumni?.campus,
          alumni?.current_company,
          alumni?.current_job_title,
          alumni?.linkedin_url,
        ];
      }

      const allFields = [...profileFields, ...careerFields];
      const completed = allFields.filter(hasValue).length;
      const profileStrength = allFields.length
        ? Math.round((completed / allFields.length) * 100)
        : 0;

      const totalEngagement =
        likeRows.length + commentRows.length + shareRows.length;

      setAnalytics({
        posts: postResult.count ?? userPosts.length,
        likes: likeRows.length,
        comments: commentRows.length,
        shares: shareRows.length,
        followers: followersResult.count ?? followersResult.data?.length ?? 0,
        following: followingResult.count ?? 0,
        portfolioItems: portfolioResult.count ?? portfolioResult.data?.length ?? 0,
        engagement: totalEngagement,
        profileStrength,
      });
    } catch (error: any) {
      console.log("Analytics error:", error);
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

  async function refresh() {
    setRefreshing(true);
    await loadAnalytics(false);
  }

  const selectedActivity = useMemo(() => {
    if (graphType === "posts") return posts;
    if (graphType === "likes") return likes;
    if (graphType === "comments") return comments;
    if (graphType === "shares") return shares;
    if (graphType === "followers") return followers;
    if (graphType === "portfolio") return portfolio;
    return [...likes, ...comments, ...shares];
  }, [graphType, posts, likes, comments, shares, followers, portfolio]);

  const graphData = useMemo(
    () => buildGraphData(selectedActivity, timeRange),
    [selectedActivity, timeRange]
  );

  const graphTotal = graphData.reduce((sum, item) => sum + item.value, 0);
  const firstName = name.split(" ")[0] || "there";

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PRIMARY} />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.intro}>
          <Text style={styles.greeting}>Hi {firstName}</Text>
          <Text style={styles.subtitle}>
            Track your content, engagement, network and profile growth.
          </Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={role === "alumni" ? "ribbon-outline" : "school-outline"}
              size={15}
              color={PRIMARY}
            />
            <Text style={styles.roleText}>
              {role === "alumni" ? "Alumni analytics" : "Student analytics"}
            </Text>
          </View>
        </View>

        <SectionTitle title="Overview" subtitle="Your current community performance" />

        <View style={styles.grid}>
          <StatCard icon="document-text-outline" value={analytics.posts} label="Posts" />
          <StatCard icon="heart-outline" value={analytics.likes} label="Likes" />
          <StatCard icon="chatbubble-outline" value={analytics.comments} label="Comments" />
          <StatCard icon="repeat-outline" value={analytics.shares} label="Shares" />
          <StatCard icon="people-outline" value={analytics.followers} label="Followers" />
          <StatCard icon="person-add-outline" value={analytics.following} label="Following" />
          <StatCard icon="folder-open-outline" value={analytics.portfolioItems} label="Portfolio" />
          <StatCard icon="pulse-outline" value={analytics.engagement} label="Engagement" />
        </View>

        <SectionTitle
          title="Performance trends"
          subtitle="Switch between the metrics you want to analyse"
        />

        <View style={styles.graphCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.graphTabs}
          >
            <GraphTab title="Engagement" active={graphType === "engagement"} onPress={() => setGraphType("engagement")} />
            <GraphTab title="Posts" active={graphType === "posts"} onPress={() => setGraphType("posts")} />
            <GraphTab title="Likes" active={graphType === "likes"} onPress={() => setGraphType("likes")} />
            <GraphTab title="Comments" active={graphType === "comments"} onPress={() => setGraphType("comments")} />
            <GraphTab title="Shares" active={graphType === "shares"} onPress={() => setGraphType("shares")} />
            <GraphTab title="Followers" active={graphType === "followers"} onPress={() => setGraphType("followers")} />
            <GraphTab title="Portfolio" active={graphType === "portfolio"} onPress={() => setGraphType("portfolio")} />
          </ScrollView>

          <View style={styles.graphHeader}>
            <View>
              <Text style={styles.graphTitle}>{getGraphTitle(graphType)}</Text>
              <Text style={styles.graphSubtitle}>{getRangeLabel(timeRange)}</Text>
            </View>
            <View style={styles.graphTotalBox}>
              <Text style={styles.graphTotal}>{graphTotal}</Text>
              <Text style={styles.graphTotalLabel}>in period</Text>
            </View>
          </View>

          <View style={styles.rangeTabs}>
            <RangeTab title="7 Days" active={timeRange === "7days"} onPress={() => setTimeRange("7days")} />
            <RangeTab title="30 Days" active={timeRange === "30days"} onPress={() => setTimeRange("30days")} />
            <RangeTab title="6 Months" active={timeRange === "6months"} onPress={() => setTimeRange("6months")} />
          </View>

          <AnalyticsGraph data={graphData} />

          <View style={styles.graphInfo}>
            <Ionicons name="information-circle-outline" size={17} color="#777" />
            <Text style={styles.graphInfoText}>
              Engagement combines likes, comments and shares received on your posts.
            </Text>
          </View>
        </View>

        <SectionTitle title="Engagement breakdown" subtitle="How people interact with your posts" />
        <View style={styles.card}>
          <MetricBar label="Likes" value={analytics.likes} maximum={Math.max(analytics.likes, analytics.comments, analytics.shares, 1)} />
          <MetricBar label="Comments" value={analytics.comments} maximum={Math.max(analytics.likes, analytics.comments, analytics.shares, 1)} />
          <MetricBar label="Shares" value={analytics.shares} maximum={Math.max(analytics.likes, analytics.comments, analytics.shares, 1)} />
        </View>

        <SectionTitle title="Profile strength" subtitle="How complete your professional profile is" />
        <View style={styles.card}>
          <View style={styles.strengthTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Profile completion</Text>
              <Text style={styles.cardSub}>
                Complete your profile to improve your visibility in the Richfield community.
              </Text>
            </View>
            <View style={styles.strengthCircle}>
              <Text style={styles.strengthValue}>{analytics.profileStrength}%</Text>
            </View>
          </View>
          <View style={styles.progressBackground}>
            <View style={[styles.progress, { width: `${analytics.profileStrength}%` }]} />
          </View>
          <Text style={styles.helper}>{getStrengthMessage(analytics.profileStrength)}</Text>
        </View>

        <SectionTitle title="Network" subtitle="Your community connections" />
        <View style={styles.networkCard}>
          <View style={styles.iconBox}>
            <Ionicons name="people" size={24} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Your network</Text>
            <Text style={styles.cardSub}>
              {analytics.followers} followers and {analytics.following} following.
            </Text>
          </View>
          <Ionicons name="trending-up-outline" size={23} color={PRIMARY} />
        </View>

        <SectionTitle title="Insight" subtitle="A quick recommendation based on your activity" />
        <View style={styles.tipCard}>
          <View style={styles.iconBox}>
            <Ionicons name="bulb-outline" size={23} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{getInsightTitle(analytics)}</Text>
            <Text style={styles.cardSub}>{getInsight(analytics)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
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
        <Ionicons name={icon} size={21} color={PRIMARY} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GraphTab({
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
      style={[styles.graphTab, active && styles.graphTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.graphTabText, active && styles.graphTabTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

function RangeTab({
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
      style={[styles.rangeTab, active && styles.rangeTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.rangeTabText, active && styles.rangeTabTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

function AnalyticsGraph({ data }: { data: GraphPoint[] }) {
  const maximum = Math.max(...data.map((item) => item.value), 1);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chart}>
        {data.map((item, index) => {
          const percentage =
            item.value === 0 ? 3 : Math.max(8, (item.value / maximum) * 100);

          return (
            <View key={`${item.label}-${index}`} style={styles.chartColumn}>
              <View style={styles.chartValueArea}>
                {item.value > 0 && <Text style={styles.chartValue}>{item.value}</Text>}
                <View style={[styles.chartBar, { height: `${percentage}%` }]} />
              </View>
              <Text style={styles.chartLabel} numberOfLines={1}>
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
  const width = Math.max(3, (value / maximum) * 100);
  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${Math.min(width, 100)}%` }]} />
      </View>
    </View>
  );
}

function buildGraphData(activity: DatedItem[], range: TimeRange): GraphPoint[] {
  if (range === "7days") return buildDailyData(activity, 7);
  if (range === "30days") return buildSixDayBuckets(activity);
  return buildMonthlyData(activity);
}

function buildDailyData(activity: DatedItem[], days: number): GraphPoint[] {
  const result: GraphPoint[] = [];
  const today = startOfDay(new Date());

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(today.getDate() - i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    result.push({
      label: start.toLocaleDateString(undefined, { weekday: "short" }),
      value: countBetween(activity, start, end),
    });
  }

  return result;
}

function buildSixDayBuckets(activity: DatedItem[]): GraphPoint[] {
  const result: GraphPoint[] = [];
  const today = startOfDay(new Date());

  for (let i = 4; i >= 0; i--) {
    const end = new Date(today);
    end.setDate(today.getDate() - i * 6 + 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    result.push({
      label: i === 0 ? "Now" : `W${5 - i}`,
      value: countBetween(activity, start, end),
    });
  }

  return result;
}

function buildMonthlyData(activity: DatedItem[]): GraphPoint[] {
  const result: GraphPoint[] = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

    result.push({
      label: start.toLocaleDateString(undefined, { month: "short" }),
      value: countBetween(activity, start, end),
    });
  }

  return result;
}

function countBetween(activity: DatedItem[], start: Date, end: Date) {
  return activity.filter((item) => {
    const date = new Date(item.created_at);
    return date >= start && date < end;
  }).length;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function hasValue(value: any) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function getGraphTitle(type: GraphType) {
  const titles: Record<GraphType, string> = {
    engagement: "Engagement trend",
    posts: "Post activity",
    likes: "Likes received",
    comments: "Comments received",
    shares: "Shares received",
    followers: "Follower growth",
    portfolio: "Portfolio activity",
  };
  return titles[type];
}

function getRangeLabel(range: TimeRange) {
  if (range === "7days") return "Last 7 days";
  if (range === "30days") return "Last 30 days";
  return "Last 6 months";
}

function getStrengthMessage(value: number) {
  if (value >= 90) return "Excellent. Your profile is looking complete.";
  if (value >= 70) return "Looking good. A few more details can strengthen your profile.";
  if (value >= 40) return "Good start. Add more career and profile information.";
  return "Complete your profile to help people and opportunities discover you.";
}

function getInsightTitle(data: AnalyticsData) {
  if (data.profileStrength < 70) return "Strengthen your profile";
  if (data.portfolioItems === 0) return "Showcase your work";
  if (data.posts === 0) return "Start sharing";
  if (data.engagement === 0) return "Build engagement";
  if (data.followers < 5) return "Grow your network";
  return "Keep building momentum";
}

function getInsight(data: AnalyticsData) {
  if (data.profileStrength < 70)
    return "Add your skills, career interests, bio and professional links.";
  if (data.portfolioItems === 0)
    return "Add projects and achievements so the community can see your work.";
  if (data.posts === 0)
    return "Share a project, achievement or career update with the community.";
  if (data.engagement === 0)
    return "Post useful content and interact with the community to encourage engagement.";
  if (data.followers < 5)
    return "Connect with more students and alumni to grow your professional network.";
  return "Your profile is active. Keep sharing useful content and building connections.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FA" },
  loading: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#777", fontSize: 13 },
  content: { padding: 18, paddingBottom: 50 },
  intro: { marginBottom: 26 },
  greeting: { fontSize: 26, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 14, color: "#6B6B75", marginTop: 5, lineHeight: 20 },
  roleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEEEFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  roleText: { color: PRIMARY, fontSize: 12, fontWeight: "700" },
  sectionHeading: { marginTop: 4, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#17171A" },
  sectionSubtitle: { color: "#85858D", fontSize: 12, marginTop: 3, lineHeight: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECECF1",
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  statValue: { fontSize: 24, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 12, color: "#73737C", marginTop: 3 },
  graphCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECECF1",
    marginBottom: 25,
  },
  graphTabs: { gap: 7, paddingBottom: 16 },
  graphTab: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F1F5",
  },
  graphTabActive: { backgroundColor: PRIMARY },
  graphTabText: { fontSize: 11, fontWeight: "700", color: "#666" },
  graphTabTextActive: { color: "#fff" },
  graphHeader: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEF2",
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  graphTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  graphSubtitle: { fontSize: 12, color: "#888", marginTop: 3 },
  graphTotalBox: { alignItems: "flex-end" },
  graphTotal: { fontSize: 23, fontWeight: "800", color: PRIMARY },
  graphTotalLabel: { fontSize: 10, color: "#999" },
  rangeTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F3F6",
    padding: 4,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 18,
  },
  rangeTab: { flex: 1, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  rangeTabActive: { backgroundColor: "#fff", elevation: 1 },
  rangeTabText: { fontSize: 11, color: "#888", fontWeight: "600" },
  rangeTabTextActive: { color: PRIMARY, fontWeight: "800" },
  chartContainer: { height: 220, paddingTop: 8 },
  chart: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4EA",
    paddingHorizontal: 2,
  },
  chartColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  chartValueArea: { flex: 1, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  chartValue: { fontSize: 10, fontWeight: "700", color: "#666", marginBottom: 5 },
  chartBar: {
    width: "54%",
    maxWidth: 30,
    minHeight: 4,
    backgroundColor: PRIMARY,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  chartLabel: { fontSize: 9, color: "#777", marginTop: 8, marginBottom: -19, textAlign: "center" },
  graphInfo: {
    flexDirection: "row",
    gap: 6,
    marginTop: 29,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F3",
  },
  graphInfoText: { flex: 1, fontSize: 11, lineHeight: 16, color: "#777" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: "#ECECF1",
    marginBottom: 25,
  },
  strengthTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  strengthCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  strengthValue: { fontSize: 17, fontWeight: "800", color: PRIMARY },
  progressBackground: {
    height: 10,
    borderRadius: 10,
    backgroundColor: "#EEEEF3",
    overflow: "hidden",
    marginTop: 18,
  },
  progress: { height: "100%", borderRadius: 10, backgroundColor: PRIMARY },
  helper: { color: "#686872", fontSize: 12, lineHeight: 18, marginTop: 11 },
  networkCard: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: "#ECECF1",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 25,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#111", fontSize: 14, fontWeight: "800" },
  cardSub: { color: "#707078", fontSize: 12, lineHeight: 18, marginTop: 4 },
  metric: { marginBottom: 17 },
  metricHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  metricLabel: { fontSize: 12, fontWeight: "700", color: "#555" },
  metricValue: { fontSize: 12, fontWeight: "800", color: "#333" },
  metricTrack: { height: 8, backgroundColor: "#EEEEF3", borderRadius: 10, overflow: "hidden" },
  metricFill: { height: "100%", backgroundColor: PRIMARY, borderRadius: 10 },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#EEEEFF",
    borderRadius: 17,
    padding: 17,
    marginBottom: 10,
  },
});