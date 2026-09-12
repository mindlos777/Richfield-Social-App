import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

interface BusinessProfile {
  full_name: string;
  email: string;
  company_name: string;
  industry: string | null;
  website: string | null;
  location: string | null;
  company_description: string | null;
  verified: boolean;
}

export default function BusinessProfileScreen() {
  const [profile, setProfile] =
    useState<BusinessProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const {
        data: mainProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const {
        data: businessProfile,
        error: businessError,
      } = await supabase
        .from("business_profiles")
        .select(
          `
          company_name,
          industry,
          website,
          location,
          company_description,
          verified
          `
        )
        .eq("user_id", user.id)
        .single();

      if (businessError) {
        throw businessError;
      }

      setProfile({
        full_name:
          mainProfile.full_name ||
          "Business User",

        email:
          mainProfile.email ||
          user.email ||
          "",

        company_name:
          businessProfile.company_name ||
          "Company",

        industry:
          businessProfile.industry,

        website:
          businessProfile.website,

        location:
          businessProfile.location,

        company_description:
          businessProfile.company_description,

        verified:
          businessProfile.verified,
      });
    } catch (error) {
      console.log(
        "Business profile error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

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
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() =>
              router.push(
                "/(business-auth)/settings"
              )
            }
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color="#111"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileTop}>
          <View style={styles.companyLogo}>
            <Ionicons
              name="business"
              size={42}
              color={PRIMARY}
            />
          </View>

          <Text style={styles.companyName}>
            {profile?.company_name}
          </Text>

          <Text style={styles.email}>
            {profile?.email}
          </Text>

          <View
            style={[
              styles.verificationBadge,
              profile?.verified
                ? styles.verifiedBadge
                : styles.pendingBadge,
            ]}
          >
            <Ionicons
              name={
                profile?.verified
                  ? "checkmark-circle"
                  : "time-outline"
              }
              size={16}
              color={
                profile?.verified
                  ? "#168653"
                  : "#C47D00"
              }
            />

            <Text
              style={[
                styles.verificationText,
                {
                  color: profile?.verified
                    ? "#168653"
                    : "#C47D00",
                },
              ]}
            >
              {profile?.verified
                ? "Verified Business"
                : "Verification Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Company Information
          </Text>

          <InfoRow
            icon="person-outline"
            label="Contact Person"
            value={profile?.full_name}
          />

          <InfoRow
            icon="briefcase-outline"
            label="Industry"
            value={
              profile?.industry ||
              "Not added"
            }
          />

          <InfoRow
            icon="location-outline"
            label="Location"
            value={
              profile?.location ||
              "Not added"
            }
          />

          <InfoRow
            icon="globe-outline"
            label="Website"
            value={
              profile?.website ||
              "Not added"
            }
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            About Company
          </Text>

          <Text style={styles.description}>
            {profile?.company_description ||
              "No company description added yet."}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            router.push(
              "/(business-auth)/settings"
            )
          }
        >
          <View style={styles.menuLeft}>
            <View style={styles.menuIcon}>
              <Ionicons
                name="settings-outline"
                size={21}
                color={PRIMARY}
              />
            </View>

            <View>
              <Text style={styles.menuTitle}>
                Settings
              </Text>

              <Text style={styles.menuSubtitle}>
                Account, privacy and preferences
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#999"
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={PRIMARY}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F7FA",
  },

  content: {
    paddingBottom: 30,
  },

  header: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
  },

  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  profileTop: {
    alignItems: "center",
    paddingVertical: 18,
  },

  companyLogo: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: "#EEEEFF",
    justifyContent: "center",
    alignItems: "center",
  },

  companyName: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111",
    marginTop: 14,
  },

  email: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },

  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },

  verifiedBadge: {
    backgroundColor: "#E8F7EF",
  },

  pendingBadge: {
    backgroundColor: "#FFF5DF",
  },

  verificationText: {
    fontSize: 12,
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 20,
    padding: 17,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    marginBottom: 15,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EEEEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: "#888",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    marginTop: 2,
  },

  description: {
    color: "#666",
    fontSize: 14,
    lineHeight: 21,
  },

  menuItem: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEEEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  menuSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },
});