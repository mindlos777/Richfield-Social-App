import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const PRIMARY = "#0300cf";

export default function BusinessDashboard() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Dashboard
            </Text>

            <Text style={styles.subtitle}>
              Find the right Richfield talent.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
          >
            <Ionicons
              name="notifications-outline"
              size={23}
              color="#111"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="briefcase"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>
            Grow your team
          </Text>

          <Text style={styles.heroDescription}>
            Post opportunities and connect with students
            and alumni across the Richfield network.
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            onPress={() =>
              router.push(
                "/(business-auth)/(tabs)/jobs"
              )
            }
          >
            <Ionicons
              name="add"
              size={20}
              color={PRIMARY}
            />

            <Text style={styles.heroButtonText}>
              Post a Job
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          Overview
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            icon="briefcase-outline"
            value="0"
            label="Active Jobs"
          />

          <StatCard
            icon="people-outline"
            value="0"
            label="Applicants"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="eye-outline"
            value="0"
            label="Profile Views"
          />

          <StatCard
            icon="bookmark-outline"
            value="0"
            label="Saved Talent"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <QuickAction
          icon="add-circle-outline"
          title="Create Job"
          description="Post a new opportunity"
          onPress={() =>
            router.push(
              "/(business-auth)/(tabs)/jobs"
            )
          }
        />

        <QuickAction
          icon="people-outline"
          title="View Applicants"
          description="Review people interested in your opportunities"
          onPress={() =>
            router.push(
              "/(business-auth)/(tabs)/applicants"
            )
          }
        />

        <QuickAction
          icon="business-outline"
          title="Company Profile"
          description="Update your business information"
          onPress={() =>
            router.push(
              "/(business-auth)/profile"
            )
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={PRIMARY}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
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
    <TouchableOpacity
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.actionIcon}>
        <Ionicons
          name={icon}
          size={24}
          color={PRIMARY}
        />
      </View>

      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>
          {title}
        </Text>

        <Text style={styles.actionDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#999"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },

  content: {
    padding: 18,
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    m
  },

  greeting: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111111",
  },

  subtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  heroCard: {
    backgroundColor: PRIMARY,
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  heroDescription: {
    color: "#E4E4FF",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
  },

  heroButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
  },

  heroButtonText: {
    color: PRIMARY,
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 14,
    color: "#111",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 18,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  statValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111",
  },

  statLabel: {
    color: "#777",
    marginTop: 3,
    fontSize: 13,
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 17,
    marginBottom: 11,
  },

  actionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#EEEEFF",
    justifyContent: "center",
    alignItems: "center",
  },

  actionContent: {
    flex: 1,
    marginLeft: 13,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  actionDescription: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },
});