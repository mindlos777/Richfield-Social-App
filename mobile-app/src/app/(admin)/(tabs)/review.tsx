import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type ReviewType =
  | "business"
  | "job"
  | "report";

type BusinessItem = {
  type: "business";
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  status: string | null;
};

type JobItem = {
  type: "job";
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  opportunity_type: string | null;
  location: string | null;
  work_mode: string | null;
  status: string | null;
  closing_date: string | null;
  business_name: string;
};

type ReportItem = {
  type: "report";
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_name: string;
};

type ReviewItem =
  | BusinessItem
  | JobItem
  | ReportItem;

export default function AdminReviewScreen() {
  const [businesses, setBusinesses] =
    useState<BusinessItem[]>([]);

  const [jobs, setJobs] =
    useState<JobItem[]>([]);

  const [reports, setReports] =
    useState<ReportItem[]>([]);

  const [selectedType, setSelectedType] =
    useState<ReviewType>("business");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const loadReviews = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "You are not signed in."
          );
        }

        const {
          data: admin,
          error: adminError,
        } = await supabase
          .from("profiles")
          .select("id,role,status")
          .eq("id", user.id)
          .single();

        if (adminError) {
          throw adminError;
        }

        if (
          admin?.role !== "admin" ||
          admin?.status !== "active"
        ) {
          throw new Error(
            "Admin access required."
          );
        }

        const [
          businessResult,
          jobsResult,
          reportsResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              username,
              email,
              status
            `)
            .eq("role", "business")
            .eq("status", "pending")
            .order("full_name", {
              ascending: true,
            }),

          supabase
            .from("opportunities")
            .select(`
              id,
              business_id,
              title,
              description,
              opportunity_type,
              location,
              work_mode,
              status,
              closing_date,
              created_at
            `)
            .eq("status", "pending")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("reports")
            .select(`
              id,
              reporter_id,
              target_type,
              target_id,
              reason,
              details,
              status,
              created_at
            `)
            .eq("status", "pending")
            .order("created_at", {
              ascending: false,
            }),
        ]);

        if (businessResult.error) {
          throw businessResult.error;
        }

        if (jobsResult.error) {
          throw jobsResult.error;
        }

        if (reportsResult.error) {
          throw reportsResult.error;
        }

        const businessRows =
          businessResult.data || [];

        const jobRows =
          jobsResult.data || [];

        const reportRows =
          reportsResult.data || [];

        /*
         * Get business names for job cards.
         */
        const businessIds = [
          ...new Set(
            jobRows
              .map(item => item.business_id)
              .filter(Boolean)
          ),
        ];

        const businessNameMap:
          Record<string, string> = {};

        if (businessIds.length > 0) {
          const {
            data: businessProfiles,
            error,
          } = await supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", businessIds);

          if (error) {
            throw error;
          }

          (businessProfiles || []).forEach(
            profile => {
              businessNameMap[
                profile.id
              ] =
                profile.full_name ||
                "Business";
            }
          );
        }

        /*
         * Get reporter names.
         */
        const reporterIds = [
          ...new Set(
            reportRows
              .map(item => item.reporter_id)
              .filter(Boolean)
          ),
        ];

        const reporterNameMap:
          Record<string, string> = {};

        if (reporterIds.length > 0) {
          const {
            data: reporterProfiles,
            error,
          } = await supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", reporterIds);

          if (error) {
            throw error;
          }

          (reporterProfiles || []).forEach(
            profile => {
              reporterNameMap[
                profile.id
              ] =
                profile.full_name ||
                "Richfield Member";
            }
          );
        }

        setBusinesses(
          businessRows.map(item => ({
            type: "business",
            id: item.id,
            full_name: item.full_name,
            username: item.username,
            email: item.email,
            status: item.status,
          }))
        );

        setJobs(
          jobRows.map(item => ({
            type: "job",
            id: item.id,
            business_id:
              item.business_id,
            title: item.title,
            description:
              item.description,
            opportunity_type:
              item.opportunity_type,
            location:
              item.location,
            work_mode:
              item.work_mode,
            status: item.status,
            closing_date:
              item.closing_date,
            business_name:
              businessNameMap[
                item.business_id
              ] || "Business",
          }))
        );

        setReports(
          reportRows.map(item => ({
            type: "report",
            id: item.id,
            reporter_id:
              item.reporter_id,
            target_type:
              item.target_type,
            target_id:
              item.target_id,
            reason: item.reason,
            details: item.details,
            status: item.status,
            created_at:
              item.created_at,
            reporter_name:
              reporterNameMap[
                item.reporter_id
              ] ||
              "Richfield Member",
          }))
        );
      } catch (error: any) {
        console.log(
          "Review center:",
          error
        );

        Alert.alert(
          "Review Center",
          error?.message ||
            "Could not load reviews."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadReviews(true);
    }, [loadReviews])
  );

  const currentItems =
    useMemo<ReviewItem[]>(() => {
      if (
        selectedType ===
        "business"
      ) {
        return businesses;
      }

      if (
        selectedType ===
        "job"
      ) {
        return jobs;
      }

      return reports;
    }, [
      selectedType,
      businesses,
      jobs,
      reports,
    ]);

  async function reviewBusiness(
    item: BusinessItem,
    decision:
      | "active"
      | "rejected"
  ) {
    try {
      setActionLoading(item.id);

      const { error } =
        await supabase.rpc(
          "admin_review_business",
          {
            p_business_id:
              item.id,
            p_decision:
              decision,
          }
        );

      if (error) {
        throw error;
      }

      setBusinesses(current =>
        current.filter(
          business =>
            business.id !==
            item.id
        )
      );

      Alert.alert(
        "Business reviewed",
        decision === "active"
          ? "Business account approved."
          : "Business account rejected."
      );
    } catch (error: any) {
      Alert.alert(
        "Business review",
        error?.message ||
          "Could not review business."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function reviewJob(
    item: JobItem,
    decision:
      | "approved"
      | "rejected"
  ) {
    try {
      setActionLoading(item.id);

      const { error } =
        await supabase.rpc(
          "admin_review_opportunity",
          {
            p_opportunity_id:
              item.id,
            p_decision:
              decision,
          }
        );

      if (error) {
        throw error;
      }

      setJobs(current =>
        current.filter(
          job =>
            job.id !== item.id
        )
      );

      Alert.alert(
        "Job reviewed",
        decision ===
        "approved"
          ? "The opportunity is now approved."
          : "The opportunity was rejected."
      );
    } catch (error: any) {
      Alert.alert(
        "Job review",
        error?.message ||
          "Could not review job."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function reviewReport(
    item: ReportItem,
    decision:
      | "dismissed"
      | "actioned"
  ) {
    try {
      setActionLoading(item.id);

      const { error } =
        await supabase.rpc(
          "admin_review_report",
          {
            p_report_id:
              item.id,
            p_decision:
              decision,
          }
        );

      if (error) {
        throw error;
      }

      setReports(current =>
        current.filter(
          report =>
            report.id !==
            item.id
        )
      );

      Alert.alert(
        "Report reviewed",
        decision ===
        "dismissed"
          ? "The report was dismissed."
          : "The report has been marked as actioned."
      );
    } catch (error: any) {
      Alert.alert(
        "Report review",
        error?.message ||
          "Could not review report."
      );
    } finally {
      setActionLoading(null);
    }
  }

  function approve(
    item: ReviewItem
  ) {
    if (
      item.type ===
      "business"
    ) {
      reviewBusiness(
        item,
        "active"
      );
      return;
    }

    if (
      item.type ===
      "job"
    ) {
      reviewJob(
        item,
        "approved"
      );
      return;
    }

    reviewReport(
      item,
      "actioned"
    );
  }

  function reject(
    item: ReviewItem
  ) {
    if (
      item.type ===
      "business"
    ) {
      reviewBusiness(
        item,
        "rejected"
      );
      return;
    }

    if (
      item.type ===
      "job"
    ) {
      reviewJob(
        item,
        "rejected"
      );
      return;
    }

    reviewReport(
      item,
      "dismissed"
    );
  }

  async function refresh() {
    setRefreshing(true);
    await loadReviews(false);
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Review
          </Text>

          <Text
            style={styles.subtitle}
          >
            Approvals and reports
          </Text>
        </View>

        <View
          style={styles.totalBadge}
        >
          <Text
            style={styles.totalText}
          >
            {businesses.length +
              jobs.length +
              reports.length}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <ReviewTab
          icon="business-outline"
          label="Businesses"
          count={businesses.length}
          active={
            selectedType ===
            "business"
          }
          onPress={() =>
            setSelectedType(
              "business"
            )
          }
        />

        <ReviewTab
          icon="briefcase-outline"
          label="Jobs"
          count={jobs.length}
          active={
            selectedType ===
            "job"
          }
          onPress={() =>
            setSelectedType(
              "job"
            )
          }
        />

        <ReviewTab
          icon="flag-outline"
          label="Reports"
          count={reports.length}
          active={
            selectedType ===
            "report"
          }
          onPress={() =>
            setSelectedType(
              "report"
            )
          }
        />
      </View>

      <View
        style={styles.sectionHeader}
      >
        <Text
          style={styles.sectionTitle}
        >
          {selectedType ===
          "business"
            ? "Pending Businesses"
            : selectedType ===
              "job"
            ? "Pending Jobs"
            : "Pending Reports"}
        </Text>

        <Text
          style={styles.sectionCount}
        >
          {currentItems.length}
        </Text>
      </View>

      <FlatList
        data={currentItems}
        keyExtractor={item =>
          `${item.type}-${item.id}`
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={refresh}
            tintColor={PRIMARY}
          />
        }
        contentContainerStyle={
          currentItems.length
            ? styles.list
            : styles.emptyList
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="checkmark-done"
                size={34}
                color={PRIMARY}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              Nothing to review
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              There are no pending items here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ReviewCard
            item={item}
            loading={
              actionLoading ===
              item.id
            }
            onApprove={() =>
              approve(item)
            }
            onReject={() =>
              reject(item)
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

function ReviewTab({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.tab,
        active &&
          styles.activeTab,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          active
            ? PRIMARY
            : "#777"
        }
      />

      <Text
        style={[
          styles.tabLabel,
          active &&
            styles.activeTabLabel,
        ]}
      >
        {label}
      </Text>

      {count > 0 ? (
        <View
          style={[
            styles.countBadge,
            active &&
              styles.activeCountBadge,
          ]}
        >
          <Text
            style={[
              styles.countText,
              active &&
                styles.activeCountText,
            ]}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ReviewCard({
  item,
  loading,
  onApprove,
  onReject,
}: {
  item: ReviewItem;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (
    item.type ===
    "business"
  ) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View
            style={styles.iconBox}
          >
            <Ionicons
              name="business-outline"
              size={23}
              color={PRIMARY}
            />
          </View>

          <View
            style={styles.cardContent}
          >
            <Text
              style={styles.label}
            >
              BUSINESS ACCOUNT
            </Text>

            <Text
              style={styles.cardTitle}
            >
              {item.full_name ||
                "Business"}
            </Text>

            <Text
              style={styles.meta}
            >
              {item.email ||
                item.username ||
                "Pending account"}
            </Text>
          </View>
        </View>

        <DecisionButtons
          loading={loading}
          positive="Approve"
          negative="Reject"
          onPositive={
            onApprove
          }
          onNegative={
            onReject
          }
        />
      </View>
    );
  }

  if (item.type === "job") {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View
            style={styles.iconBox}
          >
            <Ionicons
              name="briefcase-outline"
              size={23}
              color={PRIMARY}
            />
          </View>

          <View
            style={styles.cardContent}
          >
            <Text
              style={styles.label}
            >
              JOB / OPPORTUNITY
            </Text>

            <Text
              style={styles.cardTitle}
            >
              {item.title}
            </Text>

            <Text
              style={styles.meta}
            >
              {item.business_name}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text
            style={styles.description}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        ) : null}

        <View
          style={styles.jobMeta}
        >
          {item.location ? (
            <SmallMeta
              icon="location-outline"
              text={item.location}
            />
          ) : null}

          {item.work_mode ? (
            <SmallMeta
              icon="laptop-outline"
              text={item.work_mode}
            />
          ) : null}
        </View>

        <DecisionButtons
          loading={loading}
          positive="Approve"
          negative="Reject"
          onPositive={
            onApprove
          }
          onNegative={
            onReject
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View
          style={[
            styles.iconBox,
            styles.reportIcon,
          ]}
        >
          <Ionicons
            name="flag-outline"
            size={23}
            color="#B42318"
          />
        </View>

        <View
          style={styles.cardContent}
        >
          <Text
            style={[
              styles.label,
              {
                color: "#B42318",
              },
            ]}
          >
            REPORTED{" "}
            {item.target_type.toUpperCase()}
          </Text>

          <Text
            style={styles.cardTitle}
          >
            {item.reason}
          </Text>

          <Text
            style={styles.meta}
          >
            Reported by{" "}
            {item.reporter_name}
          </Text>
        </View>
      </View>

      {item.details ? (
        <Text
          style={styles.description}
        >
          {item.details}
        </Text>
      ) : null}

      <Text
        style={styles.reportDate}
      >
        {new Date(
          item.created_at
        ).toLocaleString(
          "en-ZA"
        )}
      </Text>

      <DecisionButtons
        loading={loading}
        positive="Actioned"
        negative="Dismiss"
        onPositive={
          onApprove
        }
        onNegative={
          onReject
        }
      />
    </View>
  );
}

function DecisionButtons({
  loading,
  positive,
  negative,
  onPositive,
  onNegative,
}: {
  loading: boolean;
  positive: string;
  negative: string;
  onPositive: () => void;
  onNegative: () => void;
}) {
  return (
    <View style={styles.actions}>
      <Pressable
        style={styles.rejectButton}
        onPress={onNegative}
        disabled={loading}
      >
        <Text
          style={styles.rejectText}
        >
          {negative}
        </Text>
      </Pressable>

      <Pressable
        style={styles.approveButton}
        onPress={onPositive}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#fff"
          />
        ) : (
          <>
            <Ionicons
              name="checkmark"
              size={17}
              color="#fff"
            />

            <Text
              style={
                styles.approveText
              }
            >
              {positive}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function SmallMeta({
  icon,
  text,
}: {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];
  text: string;
}) {
  return (
    <View
      style={styles.smallMeta}
    >
      <Ionicons
        name={icon}
        size={13}
        color="#777"
      />

      <Text
        style={styles.smallMetaText}
      >
        {text}
      </Text>
    </View>
  );
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
    minHeight: 76,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEE",
  },

  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#111",
  },

  subtitle: {
    marginTop: 3,
    color: "#777",
    fontSize: 11,
  },

  totalBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  totalText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "900",
  },

  tabs: {
    flexDirection: "row",
    gap: 7,
    padding: 12,
  },

  tab: {
    flex: 1,
    minHeight: 70,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E3E3E8",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTab: {
    backgroundColor: "#EEEEFF",
    borderColor: PRIMARY,
  },

  tabLabel: {
    marginTop: 4,
    color: "#666",
    fontSize: 10,
    fontWeight: "700",
  },

  activeTabLabel: {
    color: PRIMARY,
  },

  countBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#EEE",
    alignItems: "center",
    justifyContent: "center",
  },

  activeCountBadge: {
    backgroundColor: PRIMARY,
  },

  countText: {
    color: "#666",
    fontSize: 8,
    fontWeight: "900",
  },

  activeCountText: {
    color: "#fff",
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 3,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: "#222",
    fontSize: 13,
    fontWeight: "800",
  },

  sectionCount: {
    color: "#888",
    fontSize: 11,
  },

  list: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },

  emptyList: {
    flexGrow: 1,
  },

  card: {
    marginBottom: 9,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9E9ED",
    backgroundColor: "#fff",
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  iconBox: {
    width: 45,
    height: 45,
    marginRight: 11,
    borderRadius: 11,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  reportIcon: {
    backgroundColor: "#FDECEC",
  },

  cardContent: {
    flex: 1,
  },

  label: {
    color: PRIMARY,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  cardTitle: {
    marginTop: 3,
    color: "#1E1E1E",
    fontSize: 14,
    fontWeight: "800",
  },

  meta: {
    marginTop: 3,
    color: "#777",
    fontSize: 10,
  },

  description: {
    marginTop: 12,
    color: "#555",
    fontSize: 11,
    lineHeight: 17,
  },

  jobMeta: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  smallMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  smallMetaText: {
    color: "#777",
    fontSize: 9,
  },

  reportDate: {
    marginTop: 8,
    color: "#999",
    fontSize: 9,
  },

  actions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF1",
    flexDirection: "row",
    gap: 8,
  },

  rejectButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EBC7C4",
    alignItems: "center",
    justifyContent: "center",
  },

  rejectText: {
    color: "#B42318",
    fontSize: 11,
    fontWeight: "800",
  },

  approveButton: {
    flex: 1.3,
    minHeight: 39,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  approveText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    color: "#222",
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    marginTop: 5,
    color: "#777",
    fontSize: 11,
  },
});