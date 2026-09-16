import React, { useCallback, useEffect, useState } from "react";
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
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type StaffProfile = {
  user_id: string;
  staff_number: string;
  department: string;
  job_title: string;
  campus: string;
  verification_document_path: string | null;
  verified: boolean;
};

type MainProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
};

type VerificationFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

function sanitizeFileName(value: string) {
  return value
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

export default function StaffPendingScreen() {
  const [profile, setProfile] = useState<MainProfile | null>(null);
  const [staffProfile, setStaffProfile] =
    useState<StaffProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: mainProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            `
            id,
            email,
            full_name,
            role,
            status
          `
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!mainProfile) {
        throw new Error("Staff profile could not be found.");
      }

      if (mainProfile.role !== "staff") {
        router.replace("/login");
        return;
      }

      const { data: staffData, error: staffError } =
        await supabase
          .from("staff_profiles")
          .select(
            `
            user_id,
            staff_number,
            department,
            job_title,
            campus,
            verification_document_path,
            verified
          `
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (staffError) {
        throw staffError;
      }

      setProfile(mainProfile);
      setStaffProfile(staffData);

      /*
        Once Admin approves the account, refreshing this
        screen takes Staff directly into the Staff interface.
      */

      if (
        mainProfile.status === "active" &&
        staffData?.verified === true
      ) {
        router.replace("/(staff)/(tabs)/feed");
      }
    } catch (error: any) {
      console.error("Load Staff account error:", error);

      Alert.alert(
        "Could not load account",
        error?.message ||
          "Your Staff account information could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const refresh = () => {
    setRefreshing(true);
    loadAccount();
  };

  const chooseDocument = async () => {
    if (uploading) {
      return;
    }

    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];

      if (!file) {
        return;
      }

      if (
        file.mimeType &&
        file.mimeType !== "application/pdf"
      ) {
        Alert.alert(
          "Invalid document",
          "Please choose a PDF document."
        );

        return;
      }

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        Alert.alert(
          "Invalid document",
          "The verification document must be a PDF."
        );

        return;
      }

      if (
        typeof file.size === "number" &&
        file.size > MAX_FILE_SIZE
      ) {
        Alert.alert(
          "File too large",
          "The verification PDF must be 5 MB or smaller."
        );

        return;
      }

      await uploadDocument({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      });
    } catch (error: any) {
      console.error("Document picker error:", error);

      Alert.alert(
        "Document error",
        error?.message ||
          "The document could not be selected."
      );
    }
  };

  const uploadDocument = async (
    file: VerificationFile
  ) => {
    try {
      setUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be signed in to upload your document."
        );
      }

      const response = await fetch(file.uri);

      if (!response.ok) {
        throw new Error(
          "The selected document could not be read."
        );
      }

      const blob = await response.blob();

      if (blob.size > MAX_FILE_SIZE) {
        throw new Error(
          "The verification PDF must be 5 MB or smaller."
        );
      }

      const safeFileName = sanitizeFileName(
        file.name || "staff-verification.pdf"
      );

      const path = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("staff-verification")
          .upload(path, blob, {
            contentType: "application/pdf",
            upsert: false,
          });

      if (uploadError) {
        throw uploadError;
      }

      const previousPath =
        staffProfile?.verification_document_path;

      const { error: updateError } =
        await supabase.rpc(
            "update_my_staff_verification_document",
            {
            p_document_path: path,
            }
        );

      if (updateError) {
        /*
          Remove the new file when the DB update fails so
          we don't leave an unused verification document.
        */

        await supabase.storage
          .from("staff-verification")
          .remove([path]);

        throw updateError;
      }

      /*
        Only delete the previous document after the new
        document was successfully linked to the profile.
      */

      if (
        previousPath &&
        previousPath !== path
      ) {
        const { error: removeError } =
          await supabase.storage
            .from("staff-verification")
            .remove([previousPath]);

        if (removeError) {
          console.warn(
            "Old Staff document cleanup failed:",
            removeError
          );
        }
      }

      setStaffProfile((current) =>
        current
          ? {
              ...current,
              verification_document_path: path,
            }
          : current
      );

      Alert.alert(
        "Document submitted",
        "Your verification document has been uploaded successfully. A Richfield Administrator can now review your Staff application."
      );
    } catch (error: any) {
      console.error(
        "Staff verification upload error:",
        error
      );

      Alert.alert(
        "Upload failed",
        error?.message ||
          "Your verification document could not be uploaded."
      );
    } finally {
      setUploading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/login");
    } catch (error: any) {
      Alert.alert(
        "Sign out failed",
        error?.message ||
          "We could not sign you out."
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />

        <Text style={styles.loadingText}>
          Loading Staff application...
        </Text>
      </View>
    );
  }

  const hasDocument =
    !!staffProfile?.verification_document_path;

  const rejected =
    profile?.status === "rejected";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={PRIMARY}
          colors={[PRIMARY]}
        />
      }
    >
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Ionicons
            name="school"
            size={24}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.brand}>
          Richfield Social
        </Text>
      </View>

      <View
        style={[
          styles.statusIcon,
          rejected && styles.rejectedIcon,
        ]}
      >
        <Ionicons
          name={
            rejected
              ? "alert-circle-outline"
              : "time-outline"
          }
          size={38}
          color={rejected ? "#DC2626" : PRIMARY}
        />
      </View>

      <Text style={styles.title}>
        {rejected
          ? "Verification needs attention"
          : "Staff verification pending"}
      </Text>

      <Text style={styles.subtitle}>
        {rejected
          ? "Your Staff application was not approved. You can replace your verification document before the application is reviewed again."
          : hasDocument
          ? "Your Staff information and verification document have been submitted. Your account is waiting for Administrator approval."
          : "Your Staff account has been created. Upload your verification document to complete your application."}
      </Text>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View>
            <Text style={styles.statusLabel}>
              Application status
            </Text>

            <Text
              style={[
                styles.statusValue,
                rejected && styles.rejectedText,
              ]}
            >
              {rejected
                ? "Needs attention"
                : "Pending review"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              rejected &&
                styles.statusBadgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                rejected &&
                  styles.statusBadgeTextRejected,
              ]}
            >
              {rejected ? "Rejected" : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <InfoRow
          icon="person-outline"
          label="Name"
          value={profile?.full_name || "Not available"}
        />

        <InfoRow
          icon="mail-outline"
          label="Staff email"
          value={profile?.email || "Not available"}
        />

        <InfoRow
          icon="id-card-outline"
          label="Staff number"
          value={
            staffProfile?.staff_number ||
            "Not available"
          }
        />

        <InfoRow
          icon="business-outline"
          label="Department"
          value={
            staffProfile?.department ||
            "Not available"
          }
        />

        <InfoRow
          icon="briefcase-outline"
          label="Job title"
          value={
            staffProfile?.job_title ||
            "Not available"
          }
        />

        <InfoRow
          icon="location-outline"
          label="Campus"
          value={
            staffProfile?.campus ||
            "Not available"
          }
        />
      </View>

      <Text style={styles.sectionTitle}>
        Verification document
      </Text>

      <View style={styles.documentCard}>
        <View
          style={[
            styles.documentIcon,
            hasDocument &&
              styles.documentIconComplete,
          ]}
        >
          <Ionicons
            name={
              hasDocument
                ? "document-text"
                : "document-outline"
            }
            size={27}
            color={
              hasDocument
                ? "#16A34A"
                : PRIMARY
            }
          />
        </View>

        <View style={styles.documentContent}>
          <Text style={styles.documentTitle}>
            {hasDocument
              ? "Document submitted"
              : "Verification required"}
          </Text>

          <Text style={styles.documentText}>
            {hasDocument
              ? "Your PDF is stored privately for Administrator review."
              : "Upload a Richfield-issued Staff verification document."}
          </Text>
        </View>

        {hasDocument && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color="#16A34A"
          />
        )}
      </View>

      <Pressable
        style={[
          styles.uploadButton,
          uploading &&
            styles.disabledButton,
        ]}
        disabled={uploading}
        onPress={chooseDocument}
      >
        {uploading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.uploadButtonText}>
              {hasDocument
                ? "Replace Verification PDF"
                : "Upload Verification PDF"}
            </Text>
          </>
        )}
      </Pressable>

      <Text style={styles.fileHint}>
        PDF only. Maximum file size 5 MB.
      </Text>

      <View style={styles.securityCard}>
        <Ionicons
          name="lock-closed-outline"
          size={22}
          color={PRIMARY}
        />

        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>
            Private verification
          </Text>

          <Text style={styles.securityText}>
            Your verification document is not part of
            your public profile. It is stored privately
            for account verification.
          </Text>
        </View>
      </View>

      <View style={styles.reviewInfo}>
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>
              1
            </Text>
          </View>

          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              Submit verification
            </Text>

            <Text style={styles.stepText}>
              Provide your Staff details and document.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>
              2
            </Text>
          </View>

          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              Administrator review
            </Text>

            <Text style={styles.stepText}>
              Richfield reviews your Staff application.
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>
              3
            </Text>
          </View>

          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              Staff access
            </Text>

            <Text style={styles.stepText}>
              Once approved, your Staff interface becomes
              available.
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={styles.refreshButton}
        onPress={refresh}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator color={PRIMARY} />
        ) : (
          <>
            <Ionicons
              name="refresh-outline"
              size={20}
              color={PRIMARY}
            />

            <Text style={styles.refreshText}>
              Check approval status
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={styles.signOutButton}
        onPress={signOut}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#DC2626"
        />

        <Text style={styles.signOutText}>
          Sign out
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={18}
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
  screen: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 45,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    gap: 14,
  },

  loadingText: {
    color: "#6B7280",
    fontSize: 14,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 38,
  },

  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  brand: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },

  statusIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  rejectedIcon: {
    backgroundColor: "#FEF2F2",
  },

  title: {
    color: "#111827",
    fontSize: 27,
    fontWeight: "800",
    marginBottom: 10,
  },

  subtitle: {
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECEEF3",
    marginBottom: 28,
  },

  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusLabel: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 4,
  },

  statusValue: {
    color: "#D97706",
    fontSize: 17,
    fontWeight: "800",
  },

  rejectedText: {
    color: "#DC2626",
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
  },

  statusBadgeRejected: {
    backgroundColor: "#FEF2F2",
  },

  statusBadgeText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
  },

  statusBadgeTextRejected: {
    color: "#DC2626",
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F1F4",
    marginVertical: 18,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F1F1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 2,
  },

  infoValue: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },

  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },

  documentCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEEF3",
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  documentIconComplete: {
    backgroundColor: "#F0FDF4",
  },

  documentContent: {
    flex: 1,
  },

  documentTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  documentText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
  },

  uploadButton: {
    height: 53,
    borderRadius: 15,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  disabledButton: {
    opacity: 0.65,
  },

  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  fileHint: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 8,
    marginBottom: 25,
  },

  securityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F1FF",
    borderRadius: 16,
    padding: 15,
    gap: 12,
    marginBottom: 27,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },

  securityText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
  },

  reviewInfo: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEEF3",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  stepNumberText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "800",
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },

  stepText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
  },

  refreshButton: {
    height: 52,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },

  refreshText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "800",
  },

  signOutButton: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  signOutText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
});