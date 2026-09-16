import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type Opportunity = {
  id: string;
  title: string;
  status: string | null;
  opportunity_type: string | null;
  closing_date: string | null;
  created_at: string;
};

type Application = {
  id: string;
  opportunity_id: string;
  status: string | null;
  created_at: string;
};

type DashboardStats = {
  activeJobs: number;
  totalJobs: number;
  applicants: number;
  reviewing: number;
  shortlisted: number;
  accepted: number;
};

type GraphType = "applications" | "shortlisted" | "accepted";
type TimeRange = "7days" | "30days" | "6months";
type GraphPoint = { label: string; value: number };
type DatedItem = { created_at: string };

export default function BusinessDashboard() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("Your business");
  const [stats, setStats] = useState<DashboardStats>({
    activeJobs: 0,
    totalJobs: 0,
    applicants: 0,
    reviewing: 0,
    shortlisted: 0,
    accepted: 0,
  });

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [graphType, setGraphType] = useState<GraphType>("applications");
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");

  const loadDashboard = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Business account could not be found.");
      }

      const { data: account, error: accountError } = await supabase
        .from("profiles")
        .select("role,status")
        .eq("id", user.id)
        .single();

      if (accountError) throw accountError;
      if (account?.role !== "business") {
        throw new Error("This dashboard is only available to business accounts.");
      }

      const { data: businessProfile, error: businessError } = await supabase
        .from("business_profiles")
        .select("organisation_name,company_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (businessError) {
        console.log("Dashboard business profile error:", businessError);
      }

      setCompanyName(
        businessProfile?.organisation_name ||
          businessProfile?.company_name ||
          "Your business"
      );

      const { data: opportunityRows, error: opportunityError } = await supabase
        .from("opportunities")
        .select("id,title,status,opportunity_type,closing_date,created_at")
        .eq("business_id", user.id)
        .order("created_at", { ascending: false });

      if (opportunityError) throw opportunityError;

      const jobs = (opportunityRows || []) as Opportunity[];
      setOpportunities(jobs);

      const now = new Date();
      const activeJobs = jobs.filter((job) => {
        if (job.status !== "approved") return false;
        if (!job.closing_date) return true;
        return new Date(job.closing_date) >= now;
      }).length;

      if (!jobs.length) {
        setApplications([]);
        setStats({
          activeJobs,
          totalJobs: 0,
          applicants: 0,
          reviewing: 0,
          shortlisted: 0,
          accepted: 0,
        });
        return;
      }

      const opportunityIds = jobs.map((item) => item.id);

      const { data: applicationRows, error: applicationError } = await supabase
        .from("opportunity_applications")
        .select("id,opportunity_id,status,created_at")
        .in("opportunity_id", opportunityIds)
        .order("created_at", { ascending: true });

      if (applicationError) throw applicationError;

      const rows = (applicationRows || []) as Application[];
      setApplications(rows);

      setStats({
        activeJobs,
        totalJobs: jobs.length,
        applicants: rows.length,
        reviewing: rows.filter(
          (item) => item.status === "reviewing" || item.status === "pending"
        ).length,
        shortlisted: rows.filter((item) => item.status === "shortlisted").length,
        accepted: rows.filter((item) => item.status === "accepted").length,
      });
    } catch (error: any) {
      console.log("Business dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(true);
    }, [loadDashboard])
  );

  useEffect(() => {
    const channel = supabase
      .channel("business-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        () => loadDashboard(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunity_applications" },
        () => loadDashboard(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  async function refresh() {
    setRefreshing(true);
    await loadDashboard(false);
  }

  function openJobs() {
    router.push("/(business-auth)/(tabs)/jobs");
  }

  function openApplicants() {
    router.push("/(business-auth)/(tabs)/applicants");
  }

  function openProfile() {
    router.push("/(business-auth)/profile");
  }

  function openFeed() {
    router.push("/(business-auth)/(tabs)/feed");
  }

  const graphActivity = useMemo(() => {
    if (graphType === "shortlisted") {
      return applications.filter((item) => item.status === "shortlisted");
    }

    if (graphType === "accepted") {
      return applications.filter((item) => item.status === "accepted");
    }

    return applications;
  }, [applications, graphType]);

  const graphData = useMemo(
    () => buildGraphData(graphActivity, timeRange),
    [graphActivity, timeRange]
  );

  const graphTotal = graphData.reduce((sum, item) => sum + item.value, 0);

  const shortlistRate =
    stats.applicants > 0
      ? (stats.shortlisted / stats.applicants) * 100
      : 0;

  const acceptanceRate =
    stats.applicants > 0
      ? (stats.accepted / stats.applicants) * 100
      : 0;

  const applicationsPerJob =
    stats.totalJobs > 0
      ? stats.applicants / stats.totalJobs
      : 0;

  const opportunityPerformance = useMemo(() => {
    return opportunities
      .map((job) => ({
        id: job.id,
        title: job.title,
        applications: applications.filter(
          (application) => application.opportunity_id === job.id
        ).length,
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5);
  }, [opportunities, applications]);

  const statusData = useMemo(
    () => ({
      approved: opportunities.filter((item) => item.status === "approved").length,
      pending: opportunities.filter((item) => item.status === "pending").length,
      rejected: opportunities.filter((item) => item.status === "rejected").length,
      closed: opportunities.filter((item) => item.status === "closed").length,
    }),
    [opportunities]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PRIMARY} />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Dashboard</Text>
            <Text style={styles.companyName} numberOfLines={1}>
              {companyName}
            </Text>
          </View>

          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={23} color="#111" />
          </TouchableOpacity>
        </View>

        <SectionHeader
          title="Hiring overview"
          action="View applicants"
          onPress={openApplicants}
        />

        <View style={styles.statsGrid}>
          <StatCard icon="briefcase-outline" label="Active jobs" value={stats.activeJobs} />
          <StatCard icon="people-outline" label="Applications" value={stats.applicants} />
          <StatCard icon="star-outline" label="Shortlisted" value={stats.shortlisted} />
          <StatCard icon="checkmark-circle-outline" label="Accepted" value={stats.accepted} />
        </View>

        <Text style={styles.sectionTitle}>Hiring analytics</Text>
        <Text style={styles.sectionSubtitle}>
          Track how candidates move through your hiring activity.
        </Text>

        <View style={styles.analyticsCard}>
          <View style={styles.graphTabs}>
            <GraphTab
              title="Applications"
              active={graphType === "applications"}
              onPress={() => setGraphType("applications")}
            />
            <GraphTab
              title="Shortlisted"
              active={graphType === "shortlisted"}
              onPress={() => setGraphType("shortlisted")}
            />
            <GraphTab
              title="Accepted"
              active={graphType === "accepted"}
              onPress={() => setGraphType("accepted")}
            />
          </View>

          <View style={styles.graphHeading}>
            <View>
              <Text style={styles.graphTitle}>{getGraphTitle(graphType)}</Text>
              <Text style={styles.graphRange}>{getRangeLabel(timeRange)}</Text>
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
        </View>

        <Text style={styles.sectionTitle}>Application pipeline</Text>
        <Text style={styles.sectionSubtitle}>
          Visual breakdown of candidates at each hiring stage.
        </Text>

        <View style={styles.card}>
          <MetricBar label="Applications" value={stats.applicants} maximum={Math.max(stats.applicants, 1)} />
          <MetricBar label="Reviewing" value={stats.reviewing} maximum={Math.max(stats.applicants, 1)} />
          <MetricBar label="Shortlisted" value={stats.shortlisted} maximum={Math.max(stats.applicants, 1)} />
          <MetricBar label="Accepted" value={stats.accepted} maximum={Math.max(stats.applicants, 1)} />
        </View>

        <Text style={styles.sectionTitle}>Hiring performance</Text>
        <Text style={styles.sectionSubtitle}>
          Conversion indicators calculated from your applications.
        </Text>

        <View style={styles.performanceGrid}>
          <PerformanceCard
            value={applicationsPerJob.toFixed(1)}
            label="Applications / job"
          />
          <PerformanceCard
            value={`${shortlistRate.toFixed(1)}%`}
            label="Shortlist rate"
          />
          <PerformanceCard
            value={`${acceptanceRate.toFixed(1)}%`}
            label="Acceptance rate"
          />
        </View>

        <Text style={styles.sectionTitle}>Opportunity performance</Text>
        <Text style={styles.sectionSubtitle}>
          Which opportunities are receiving the most applications.
        </Text>

        <View style={styles.card}>
          {opportunityPerformance.length === 0 ? (
            <Text style={styles.emptySmall}>No opportunity performance data yet.</Text>
          ) : (
            opportunityPerformance.map((item) => (
              <MetricBar
                key={item.id}
                label={item.title}
                value={item.applications}
                maximum={Math.max(
                  ...opportunityPerformance.map((row) => row.applications),
                  1
                )}
              />
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Opportunity status</Text>
        <Text style={styles.sectionSubtitle}>
          Current approval and publishing status of your opportunities.
        </Text>

        <View style={styles.statusGrid}>
          <StatusCard label="Live" value={statusData.approved} icon="radio-outline" />
          <StatusCard label="Pending" value={statusData.pending} icon="time-outline" />
          <StatusCard label="Rejected" value={statusData.rejected} icon="close-circle-outline" />
          <StatusCard label="Closed" value={statusData.closed} icon="lock-closed-outline" />
        </View>

        <Text style={[styles.sectionTitle, styles.actionsHeading]}>Quick actions</Text>

        <View style={styles.actionsContainer}>
          <QuickAction icon="add-outline" title="Post an opportunity" onPress={openJobs} />
          <QuickAction icon="people-outline" title="Review applicants" onPress={openApplicants} />
          <QuickAction icon="search-outline" title="Discover talent" onPress={openFeed} />
          <QuickAction icon="business-outline" title="Company profile" onPress={openProfile} />
        </View>

        <View style={styles.jobsHeading}>
          <Text style={styles.sectionTitle}>Recent opportunities</Text>
          <TouchableOpacity onPress={openJobs}>
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {opportunities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={29} color="#777" />
            <Text style={styles.emptyTitle}>No opportunities yet</Text>
            <Text style={styles.emptyText}>
              Create your first opportunity to start receiving applications.
            </Text>
            <TouchableOpacity onPress={openJobs} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Create opportunity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {opportunities.slice(0, 4).map((job) => (
              <OpportunityRow key={job.id} job={job} onPress={openJobs} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.sectionLink}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
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
    <TouchableOpacity
      style={[styles.graphTab, active && styles.graphTabActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.graphTabText, active && styles.graphTabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
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
    <TouchableOpacity
      style={[styles.rangeTab, active && styles.rangeTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.rangeTabText, active && styles.rangeTabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
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
              <Text style={styles.chartLabel}>{item.label}</Text>
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
  const percentage =
    value === 0 ? 2 : Math.max(5, (value / Math.max(maximum, 1)) * 100);

  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${Math.min(percentage, 100)}%` }]} />
      </View>
    </View>
  );
}

function PerformanceCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.performanceCard}>
      <Text style={styles.performanceValue}>{value}</Text>
      <Text style={styles.performanceLabel}>{label}</Text>
    </View>
  );
}

function StatusCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statusCard}>
      <Ionicons name={icon} size={20} color={PRIMARY} />
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} activeOpacity={0.65} onPress={onPress}>
      <Ionicons name={icon} size={21} color="#222" />
      <Text style={styles.actionTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color="#aaa" />
    </TouchableOpacity>
  );
}

function OpportunityRow({
  job,
  onPress,
}: {
  job: Opportunity;
  onPress: () => void;
}) {
  const status = getStatusInfo(job.status);

  return (
    <TouchableOpacity style={styles.jobRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
        <View style={styles.jobMetaRow}>
          <Text style={styles.jobMeta}>{formatType(job.opportunity_type)}</Text>
          {!!job.closing_date && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.jobMeta}>Closes {formatDate(job.closing_date)}</Text>
            </>
          )}
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </TouchableOpacity>
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

function getGraphTitle(type: GraphType) {
  if (type === "shortlisted") return "Shortlisting trend";
  if (type === "accepted") return "Accepted candidates trend";
  return "Application trend";
}

function getRangeLabel(range: TimeRange) {
  if (range === "7days") return "Last 7 days";
  if (range === "30days") return "Last 30 days";
  return "Last 6 months";
}

function formatType(value: string | null) {
  if (!value) return "Opportunity";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function getStatusInfo(status: string | null) {
  switch (status) {
    case "approved":
      return { label: "Live", color: "#157347", background: "#E9F7EF" };
    case "pending":
      return { label: "Pending", color: "#8A6116", background: "#FFF5DA" };
    case "rejected":
      return { label: "Rejected", color: "#B42318", background: "#FDECEC" };
    case "closed":
      return { label: "Closed", color: "#666", background: "#EEEEF1" };
    default:
      return { label: status || "Draft", color: "#666", background: "#EEEEF1" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FA" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 25,
  },
  headerText: { flex: 1, paddingRight: 16 },
  greeting: { fontSize: 26, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  companyName: { marginTop: 4, color: "#6B6B72", fontSize: 14 },
  notificationButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6E6E8",
    borderRadius: 21,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#171717", marginTop: 7 },
  sectionSubtitle: { fontSize: 12, color: "#818188", marginTop: 4, marginBottom: 13, lineHeight: 17 },
  sectionLink: { color: PRIMARY, fontSize: 12, fontWeight: "700" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EA",
    borderRadius: 14,
    padding: 15,
    marginBottom: 11,
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
  statValue: { fontSize: 25, fontWeight: "800", color: "#111" },
  statLabel: { color: "#73737A", fontSize: 12, marginTop: 3 },
  analyticsCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 25,
  },
  graphTabs: { flexDirection: "row", gap: 6 },
  graphTab: {
    flex: 1,
    minHeight: 37,
    borderRadius: 9,
    backgroundColor: "#F2F2F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  graphTabActive: { backgroundColor: PRIMARY },
  graphTabText: { fontSize: 10, fontWeight: "700", color: "#68686F" },
  graphTabTextActive: { color: "#fff" },
  graphHeading: {
    marginTop: 17,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  graphTitle: { fontSize: 15, fontWeight: "800", color: "#171717" },
  graphRange: { fontSize: 11, color: "#888", marginTop: 3 },
  graphTotalBox: { alignItems: "flex-end" },
  graphTotal: { fontSize: 22, fontWeight: "800", color: PRIMARY },
  graphTotalLabel: { fontSize: 10, color: "#999" },
  rangeTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F3F6",
    padding: 4,
    borderRadius: 10,
    marginTop: 15,
    marginBottom: 17,
  },
  rangeTab: { flex: 1, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  rangeTabActive: { backgroundColor: "#fff", elevation: 1 },
  rangeTabText: { fontSize: 10, color: "#888", fontWeight: "600" },
  rangeTabTextActive: { color: PRIMARY, fontWeight: "800" },
  chartContainer: { height: 210, paddingTop: 7 },
  chart: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4EA",
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
  chartLabel: { fontSize: 9, color: "#777", marginTop: 8, marginBottom: -19 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EA",
    borderRadius: 15,
    padding: 16,
    marginBottom: 25,
  },
  metric: { marginBottom: 17 },
  metricHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  metricLabel: { flex: 1, paddingRight: 10, fontSize: 12, fontWeight: "700", color: "#555" },
  metricValue: { fontSize: 12, fontWeight: "800", color: "#222" },
  metricTrack: { height: 8, backgroundColor: "#EEEEF3", borderRadius: 10, overflow: "hidden" },
  metricFill: { height: "100%", backgroundColor: PRIMARY, borderRadius: 10 },
  performanceGrid: { flexDirection: "row", gap: 8, marginBottom: 25 },
  performanceCard: {
    flex: 1,
    minHeight: 95,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EA",
    borderRadius: 14,
    padding: 12,
    justifyContent: "center",
  },
  performanceValue: { fontSize: 20, fontWeight: "800", color: PRIMARY },
  performanceLabel: { fontSize: 10, lineHeight: 14, color: "#73737A", marginTop: 5 },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statusCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EA",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  statusValue: { fontSize: 22, fontWeight: "800", color: "#111", marginTop: 9 },
  statusLabel: { fontSize: 11, color: "#777", marginTop: 2 },
  actionsHeading: { marginTop: 3, marginBottom: 10 },
  actionsContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EBEBED",
    marginBottom: 28,
  },
  actionRow: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBED",
  },
  actionTitle: { flex: 1, marginLeft: 13, fontSize: 14, color: "#242424", fontWeight: "600" },
  jobsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  jobsList: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EBEBED",
  },
  jobRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBED",
    paddingVertical: 12,
  },
  jobInfo: { flex: 1, paddingRight: 12 },
  jobTitle: { fontSize: 14, color: "#171717", fontWeight: "700" },
  jobMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, flexWrap: "wrap" },
  jobMeta: { color: "#77777E", fontSize: 11 },
  metaDot: { color: "#B0B0B5", fontSize: 10, marginHorizontal: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "700" },
  emptyState: {
    alignItems: "flex-start",
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#EBEBED",
  },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: "700", color: "#222" },
  emptyText: { marginTop: 5, color: "#777", fontSize: 12, lineHeight: 18, maxWidth: 290 },
  emptyButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 7,
    backgroundColor: PRIMARY,
  },
  emptyButtonText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  emptySmall: { fontSize: 12, color: "#777", lineHeight: 18 },
});