import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";

const PRIMARY = "#0300cf";

type SummaryData = {
  users: number;
  posts: number;
  opportunities: number;
  engagement: number;
  students: number;
  alumni: number;
  businesses: number;
};

const EMPTY: SummaryData = {
  users: 0,
  posts: 0,
  opportunities: 0,
  engagement: 0,
  students: 0,
  alumni: 0,
  businesses: 0,
};

export default function AdminDashboardSummary() {
  const [data, setData] = useState<SummaryData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
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
        usersResult,
        studentsResult,
        alumniResult,
        businessesResult,
        postsResult,
        opportunitiesResult,
        likesResult,
        commentsResult,
        sharesResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "alumni"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "business"),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("post_likes")
          .select("post_id", { count: "exact", head: true }),
        supabase
          .from("post_comments")
          .select("post_id", { count: "exact", head: true }),
        supabase
          .from("post_shares")
          .select("post_id", { count: "exact", head: true }),
      ]);

      const results = [
        usersResult,
        studentsResult,
        alumniResult,
        businessesResult,
        postsResult,
        opportunitiesResult,
        likesResult,
        commentsResult,
        sharesResult,
      ];

      results.forEach((result, index) => {
        if (result.error) {
          console.log(`Admin summary query ${index} error:`, result.error);
        }
      });

      setData({
        users: usersResult.count || 0,
        students: studentsResult.count || 0,
        alumni: alumniResult.count || 0,
        businesses: businessesResult.count || 0,
        posts: postsResult.count || 0,
        opportunities: opportunitiesResult.count || 0,
        engagement:
          (likesResult.count || 0) +
          (commentsResult.count || 0) +
          (sharesResult.count || 0),
      });
    } catch (error) {
      console.log("Admin summary error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  useEffect(() => {
    const channel = supabase
      .channel("admin-summary-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        loadSummary
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        loadSummary
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        loadSummary
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments" },
        loadSummary
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_shares" },
        loadSummary
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        loadSummary
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSummary]);

  const maxRole = Math.max(data.students, data.alumni, data.businesses, 1);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Platform overview</Text>
          <Text style={styles.subtitle}>Live Richfield Connect activity</Text>
        </View>

        <Pressable
          style={styles.analyticsButton}
          onPress={() => router.push("/(admin)/analytics" as never)}
        >
          <Text style={styles.analyticsText}>Analytics</Text>
          <Ionicons name="arrow-forward" size={15} color={PRIMARY} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <>
          <View style={styles.stats}>
            <MiniStat
              icon="people-outline"
              label="Users"
              value={data.users}
            />
            <MiniStat
              icon="newspaper-outline"
              label="Posts"
              value={data.posts}
            />
            <MiniStat
              icon="briefcase-outline"
              label="Opportunities"
              value={data.opportunities}
            />
            <MiniStat
              icon="pulse-outline"
              label="Engagement"
              value={data.engagement}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.distributionTitle}>User distribution</Text>

          <DistributionBar
            label="Students"
            value={data.students}
            maximum={maxRole}
          />
          <DistributionBar
            label="Alumni"
            value={data.alumni}
            maximum={maxRole}
          />
          <DistributionBar
            label="Business"
            value={data.businesses}
            maximum={maxRole}
          />
        </>
      )}
    </View>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={PRIMARY} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function DistributionBar({
  label,
  value,
  maximum,
}: {
  label: string;
  value: number;
  maximum: number;
}) {
  const percentage = value === 0 ? 0 : (value / maximum) * 100;

  return (
    <View style={styles.distributionRow}>
      <View style={styles.distributionHeader}>
        <Text style={styles.distributionLabel}>{label}</Text>
        <Text style={styles.distributionValue}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(percentage, 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E7EC",
    backgroundColor: "#fff",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#7A7A83",
  },
  analyticsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#EEEEFF",
  },
  analyticsText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY,
  },
  loading: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 17,
  },
  stat: {
    width: "48%",
    minHeight: 90,
    padding: 12,
    marginBottom: 10,
    borderRadius: 13,
    backgroundColor: "#F8F8FB",
  },
  iconBox: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#EEEEFF",
  },
  value: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    color: "#73737C",
  },
  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: "#EEEEF2",
  },
  distributionTitle: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "800",
    color: "#333",
  },
  distributionRow: {
    marginBottom: 12,
  },
  distributionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  distributionLabel: {
    fontSize: 11,
    color: "#62626B",
  },
  distributionValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#333",
  },
  track: {
    height: 7,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "#ECECF2",
  },
  fill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: PRIMARY,
  },
});