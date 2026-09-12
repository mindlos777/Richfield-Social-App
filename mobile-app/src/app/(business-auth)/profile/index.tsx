import React, {
  useEffect,
  useState,
} from "react";

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
import { useRouter } from "expo-router";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

interface BusinessProfile {
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;

  company_name: string | null;
  industry: string | null;
  website: string | null;
  company_description: string | null;
  verified: boolean;
}

export default function BusinessProfileScreen() {
  const router = useRouter();

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

      if (!user) {
        return;
      }

      const { data: mainProfile } =
        await supabase
          .from("profiles")
          .select(
            "full_name,email,avatar_url,bio"
          )
          .eq("id", user.id)
          .single();

      const { data: businessProfile } =
        await supabase
          .from("business_profiles")
          .select(
            "company_name,industry,website,company_description,verified"
          )
          .eq("user_id", user.id)
          .single();

      setProfile({
        full_name:
          mainProfile?.full_name ||
          "Business User",

        email:
          mainProfile?.email ||
          user.email ||
          "",

        avatar_url:
          mainProfile?.avatar_url || null,

        bio:
          mainProfile?.bio || null,

        company_name:
          businessProfile?.company_name ||
          null,

        industry:
          businessProfile?.industry ||
          null,

        website:
          businessProfile?.website ||
          null,

        company_description:
          businessProfile?.company_description ||
          null,

        verified:
          businessProfile?.verified ||
          false,
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
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push(
                "/(business-auth)/profile/settings"
              )
            }
          >
            <Ionicons
              name="settings-outline"
              size={25}
              color="#111"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileTop}>
          <View style={styles.logo}>
            <Ionicons
              name="business"
              size={37}
              color={PRIMARY}
            />
          </View>

          <Text style={styles.companyName}>
            {profile?.company_name ||
              "Your Company"}
          </Text>

          <Text style={styles.email}>
            {profile?.email}
          </Text>

          <View style={styles.verification}>
            <Ionicons
              name={
                profile?.verified
                  ? "checkmark-circle"
                  : "time-outline"
              }
              size={17}
              color={
                profile?.verified
                  ? "#169B62"
                  : "#D98B00"
              }
            />

            <Text
              style={[
                styles.verificationText,
                {
                  color: profile?.verified
                    ? "#169B62"
                    : "#D98B00",
                },
              ]}
            >
              {profile?.verified
                ? "Verified Business"
                : "Verification Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Company Information
          </Text>

          <InfoRow
            icon="person-outline"
            label="Contact Person"
            value={profile?.full_name}
          />

          <InfoRow
            icon="business-outline"
            label="Industry"
            value={
              profile?.industry ||
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            About
          </Text>

          <Text style={styles.description}>
            {profile?.company_description ||
              "Tell students and alumni about your company."}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() =>
            router.push(
              "/(business-auth)/profile/settings"
            )
          }
        >
          <View style={styles.settingsLeft}>
            <Ionicons
              name="settings-outline"
              size={22}
              color={PRIMARY}
            />

            <Text style={styles.settingsText}>
              Settings
            </Text>
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

      <View>
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
  },

  header: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
  },

  profileTop: {
    alignItems: "center",
    paddingVertical: 20,
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "#EEEEFF",
    justifyContent: "center",
    alignItems: "center",
  },

  companyName: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 14,
  },

  email: {
    color: "#777",
    marginTop: 4,
  },

  verification: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },

  verificationText: {
    fontSize: 13,
    fontWeight: "700",
  },

  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 20,
    padding: 17,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 14,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoLabel: {
    fontSize: 12,
    color: "#888",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  description: {
    color: "#666",
    lineHeight: 21,
  },

  settingsRow: {
    marginHorizontal: 18,
    marginVertical: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  settingsText: {
    fontSize: 15,
    fontWeight: "700",
  },
});