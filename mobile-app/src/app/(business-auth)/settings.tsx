import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
} from "expo-router";

import {
  useAuth,
} from "../../auth/AuthContext";

import {
  supabase,
} from "../../lib/supabase";

const PRIMARY = "#0300cf";

type BusinessAccount = {
  email: string;
  status: string;

  companyName: string;
  registrationNumber: string;

  industry: string;
  website: string;
  location: string;
  description: string;

  contactName: string;
  contactJobTitle: string;
  contactEmail: string;
  contactPhone: string;

  verified: boolean;

  rejectionReason: string;
  verificationNotes: string;
};

export default function BusinessSettingsScreen() {
  const {
    signOut,
  } = useAuth();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    working,
    setWorking,
  ] = useState(false);

  const [
    account,
    setAccount,
  ] = useState<BusinessAccount>({
    email: "",
    status: "",

    companyName: "",
    registrationNumber: "",

    industry: "",
    website: "",
    location: "",
    description: "",

    contactName: "",
    contactJobTitle: "",
    contactEmail: "",
    contactPhone: "",

    verified: false,

    rejectionReason: "",
    verificationNotes: "",
  });

  const loadBusiness =
    useCallback(async () => {
      try {
        setLoading(true);

        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace(
            "/(business-auth)/auth/login"
          );

          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            email,
            role,
            status
          `)
          .eq(
            "id",
            user.id
          )
          .single();

        if (profileError) {
          throw profileError;
        }

        if (
          profile?.role !==
          "business"
        ) {
          throw new Error(
            "This page is only available to business accounts."
          );
        }

        const {
          data: business,
          error: businessError,
        } = await supabase
          .from(
            "business_profiles"
          )
          .select(`
            company_name,
            company_registration_number,
            industry,
            website,
            company_description,
            location,
            contact_person_name,
            contact_person_job_title,
            contact_email,
            contact_phone,
            verified,
            rejection_reason,
            verification_notes
          `)
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (businessError) {
          throw businessError;
        }

        setAccount({
          email:
            profile?.email ||
            user.email ||
            "",

          status:
            profile?.status ||
            "",

          companyName:
            business
              ?.company_name ||
            "",

          registrationNumber:
            business
              ?.company_registration_number ||
            "",

          industry:
            business?.industry ||
            "",

          website:
            business?.website ||
            "",

          location:
            business?.location ||
            "",

          description:
            business
              ?.company_description ||
            "",

          contactName:
            business
              ?.contact_person_name ||
            "",

          contactJobTitle:
            business
              ?.contact_person_job_title ||
            "",

          contactEmail:
            business
              ?.contact_email ||
            "",

          contactPhone:
            business
              ?.contact_phone ||
            "",

          verified:
            Boolean(
              business?.verified
            ),

          rejectionReason:
            business
              ?.rejection_reason ||
            "",

          verificationNotes:
            business
              ?.verification_notes ||
            "",
        });
      } catch (error: any) {
        console.log(
          "Business settings error:",
          error
        );

        Alert.alert(
          "Settings",
          error?.message ||
            "Could not load your business account."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  function showCompanyProfile() {
    const details = [
      account.companyName
        ? `Company: ${account.companyName}`
        : null,

      account.registrationNumber
        ? `Registration: ${account.registrationNumber}`
        : null,

      account.industry
        ? `Industry: ${account.industry}`
        : null,

      account.location
        ? `Location: ${account.location}`
        : null,

      account.website
        ? `Website: ${account.website}`
        : null,

      account.description
        ? `\n${account.description}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    Alert.alert(
      "Company Profile",
      details ||
        "No company information is available."
    );
  }

  function showContactDetails() {
    const details = [
      account.contactName
        ? `Contact: ${account.contactName}`
        : null,

      account.contactJobTitle
        ? `Position: ${account.contactJobTitle}`
        : null,

      account.contactEmail
        ? `Email: ${account.contactEmail}`
        : null,

      account.contactPhone
        ? `Phone: ${account.contactPhone}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    Alert.alert(
      "Business Contact",
      details ||
        "No contact information is available."
    );
  }

  function showVerification() {
    if (
      account.verified &&
      account.status === "active"
    ) {
      Alert.alert(
        "Verified Business",
        "Your organisation has been verified and approved by Richfield."
      );

      return;
    }

    if (
      account.status ===
      "pending"
    ) {
      Alert.alert(
        "Verification Pending",
        "Your business registration is currently being reviewed by Richfield."
      );

      return;
    }

    if (
      account.status ===
      "rejected"
    ) {
      const reason =
        account.rejectionReason ||
        account.verificationNotes ||
        "Richfield did not provide an additional reason.";

      Alert.alert(
        "Verification Rejected",
        `Your business registration was not approved.\n\nReason: ${reason}`
      );

      return;
    }

    if (
      account.status ===
      "suspended"
    ) {
      Alert.alert(
        "Account Suspended",
        "This business account is currently suspended. Please contact Richfield administration."
      );

      return;
    }

    Alert.alert(
      "Verification",
      "This organisation has not yet been verified."
    );
  }

  async function sendPasswordReset() {
    try {
      setWorking(true);

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error(
          "No email address was found for this account."
        );
      }

      const {
        error,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            user.email
          );

      if (error) {
        throw error;
      }

      Alert.alert(
        "Reset Email Sent",
        `A password reset link was sent to ${user.email}.`
      );
    } catch (error: any) {
      Alert.alert(
        "Password Reset",
        error?.message ||
          "Could not send the password reset email."
      );
    } finally {
      setWorking(false);
    }
  }

  function changePassword() {
    Alert.alert(
      "Change Password",
      "We will send a secure password reset link to your business account email.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Send Link",
          onPress:
            sendPasswordReset,
        },
      ]
    );
  }

  function manageEmail() {
    Alert.alert(
      "Account Email",
      account.email
        ? `Your account email is:\n\n${account.email}\n\nFor security, account email changes should be handled through Richfield support.`
        : "No account email was found."
    );
  }

  function jobPreferences() {
    Alert.alert(
      "Job Preferences",
      "Your job posting preferences are determined when you create each opportunity, including opportunity type, work mode, required skills, programme keywords and closing date."
    );
  }

  function notifications() {
    Alert.alert(
      "Notifications",
      "Richfield Social will notify your organisation about important account, verification and opportunity activity."
    );
  }

  function privacy() {
    Alert.alert(
      "Privacy",
      "Business accounts only receive information that users make available through Richfield Social. Private institutional information is protected by platform access controls."
    );
  }

  function helpSupport() {
    Alert.alert(
      "Help & Support",
      "Contact Richfield administration for help with business verification, company information or account access."
    );
  }

  function terms() {
    Alert.alert(
      "Terms & Conditions",
      "By using Richfield Social, organisations agree to use student and alumni information responsibly and only for legitimate professional, recruitment and networking purposes."
    );
  }

  function about() {
    Alert.alert(
      "About Richfield Social",
      "Richfield Social connects Richfield students and alumni with verified organisations through professional networking, career opportunities, portfolios and communication."
    );
  }

  async function openWebsite() {
    if (!account.website) {
      Alert.alert(
        "Website",
        "No company website has been added."
      );

      return;
    }

    try {
      const url =
        account.website.startsWith(
          "http://"
        ) ||
        account.website.startsWith(
          "https://"
        )
          ? account.website
          : `https://${account.website}`;

      const supported =
        await Linking.canOpenURL(
          url
        );

      if (!supported) {
        throw new Error(
          "This website could not be opened."
        );
      }

      await Linking.openURL(
        url
      );
    } catch (error: any) {
      Alert.alert(
        "Website",
        error?.message ||
          "Could not open the website."
      );
    }
  }

  function handleLogout() {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Log Out",
          style: "destructive",

          onPress: async () => {
            try {
              setWorking(true);

              await signOut();

              router.replace(
                "/(business-auth)/auth/login"
              );
            } catch {
              Alert.alert(
                "Error",
                "Unable to log out."
              );
            } finally {
              setWorking(false);
            }
          },
        },
      ]
    );
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

  const verificationText =
    account.verified &&
    account.status === "active"
      ? "Verified by Richfield"
      : account.status ===
        "pending"
      ? "Pending Richfield review"
      : account.status ===
        "rejected"
      ? "Verification rejected"
      : account.status ===
        "suspended"
      ? "Account suspended"
      : "Not verified";

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111"
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          Settings
        </Text>

        <View
          style={{ width: 40 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={
            styles.businessCard
          }
        >
          <View
            style={
              styles.businessIcon
            }
          >
            <Ionicons
              name="business"
              size={27}
              color={PRIMARY}
            />
          </View>

          <View
            style={
              styles.businessContent
            }
          >
            <Text
              style={
                styles.businessName
              }
              numberOfLines={1}
            >
              {account.companyName ||
                "Business Account"}
            </Text>

            <Text
              style={
                styles.businessEmail
              }
              numberOfLines={1}
            >
              {account.email}
            </Text>

            <View
              style={
                styles.statusRow
              }
            >
              <View
                style={[
                  styles.statusBadge,

                  account.verified &&
                  account.status ===
                    "active"
                    ? styles.verifiedBadge
                    : account.status ===
                      "rejected"
                    ? styles.rejectedBadge
                    : styles.pendingBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,

                    account.verified &&
                    account.status ===
                      "active"
                      ? styles.verifiedText
                      : account.status ===
                        "rejected"
                      ? styles.rejectedText
                      : styles.pendingText,
                  ]}
                >
                  {verificationText}
                </Text>
              </View>
            </View>
          </View>

          <Ionicons
            name={
              account.verified &&
              account.status ===
                "active"
                ? "checkmark-circle"
                : "shield-outline"
            }
            size={25}
            color={
              account.verified &&
              account.status ===
                "active"
                ? "#168653"
                : PRIMARY
            }
          />
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Account
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="business-outline"
            title="Company Profile"
            subtitle="View company details"
            onPress={
              showCompanyProfile
            }
          />

          <SettingItem
            icon="person-outline"
            title="Business Contact"
            subtitle="View contact information"
            onPress={
              showContactDetails
            }
          />

          <SettingItem
            icon="mail-outline"
            title="Email Address"
            subtitle={
              account.email ||
              "Manage account email"
            }
            onPress={manageEmail}
          />

          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Send a secure reset link"
            onPress={changePassword}
          />
        </View>

        <View
          style={
            styles.identityNotice
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={PRIMARY}
          />

          <Text
            style={
              styles.identityNoticeText
            }
          >
            Company identity and
            registration details are
            protected after submission.
            Contact Richfield if official
            information needs to be
            corrected.
          </Text>
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Business
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="shield-checkmark-outline"
            title="Verification"
            subtitle={
              verificationText
            }
            onPress={
              showVerification
            }
          />

          <SettingItem
            icon="briefcase-outline"
            title="Job Preferences"
            subtitle="Opportunity posting information"
            onPress={
              jobPreferences
            }
          />

          {account.website ? (
            <SettingItem
              icon="globe-outline"
              title="Company Website"
              subtitle={
                account.website
              }
              onPress={
                openWebsite
              }
            />
          ) : null}
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Preferences
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Alerts and important updates"
            onPress={
              notifications
            }
          />

          <SettingItem
            icon="lock-closed-outline"
            title="Privacy"
            subtitle="Platform privacy information"
            onPress={privacy}
          />
        </View>

        <Text
          style={styles.sectionLabel}
        >
          Support
        </Text>

        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Account and verification help"
            onPress={
              helpSupport
            }
          />

          <SettingItem
            icon="document-text-outline"
            title="Terms & Conditions"
            subtitle="Business platform terms"
            onPress={terms}
          />

          <SettingItem
            icon="information-circle-outline"
            title="About Richfield Social"
            subtitle="About the platform"
            onPress={about}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,

            working &&
              styles.disabled,
          ]}
          disabled={working}
          onPress={handleLogout}
        >
          {working ? (
            <ActivityIndicator
              size="small"
              color="#D93025"
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#D93025"
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Log Out
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text
          style={styles.version}
        >
          Richfield Social • Business
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={styles.itemLeft}
      >
        <View style={styles.icon}>
          <Ionicons
            name={icon}
            size={20}
            color={PRIMARY}
          />
        </View>

        <View
          style={
            styles.itemContent
          }
        >
          <Text
            style={styles.itemTitle}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={
                styles.itemSubtitle
              }
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#AAA"
        />
      ) : null}
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F7F7FA",
    },

    loading: {
      flex: 1,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },

    content: {
      paddingBottom: 35,
    },

    header: {
      height: 60,
      paddingHorizontal: 18,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#EEEEF2",
    },

    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
    },

    title: {
      fontSize: 19,
      fontWeight: "800",
      color: "#111",
    },

    businessCard: {
      marginHorizontal: 18,
      marginTop: 20,
      padding: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
    },

    businessIcon: {
      width: 52,
      height: 52,
      borderRadius: 15,
      backgroundColor: "#EEEEFF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },

    businessContent: {
      flex: 1,
      paddingRight: 8,
    },

    businessName: {
      fontSize: 15,
      fontWeight: "800",
      color: "#111",
    },

    businessEmail: {
      fontSize: 11,
      color: "#777",
      marginTop: 3,
    },

    statusRow: {
      flexDirection: "row",
      marginTop: 7,
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },

    verifiedBadge: {
      backgroundColor: "#E7F8EE",
    },

    pendingBadge: {
      backgroundColor: "#FFF6DB",
    },

    rejectedBadge: {
      backgroundColor: "#FFEAEA",
    },

    statusText: {
      fontSize: 9,
      fontWeight: "800",
    },

    verifiedText: {
      color: "#168653",
    },

    pendingText: {
      color: "#8A6400",
    },

    rejectedText: {
      color: "#C62828",
    },

    sectionLabel: {
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 9,
      fontSize: 13,
      fontWeight: "700",
      color: "#777",
    },

    section: {
      backgroundColor: "#FFFFFF",
      marginHorizontal: 18,
      borderRadius: 18,
      overflow: "hidden",
    },

    item: {
      minHeight: 66,
      paddingHorizontal: 15,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#F1F1F1",
    },

    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "#EEEEFF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 11,
    },

    itemContent: {
      flex: 1,
      paddingVertical: 4,
    },

    itemTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
    },

    itemSubtitle: {
      fontSize: 11,
      color: "#888",
      marginTop: 2,
    },

    identityNotice: {
      marginHorizontal: 18,
      marginTop: 12,
      backgroundColor: "#EEEEFF",
      borderRadius: 14,
      padding: 13,
      flexDirection: "row",
      alignItems: "flex-start",
    },

    identityNoticeText: {
      flex: 1,
      marginLeft: 8,
      color: "#666",
      fontSize: 11,
      lineHeight: 17,
    },

    logoutButton: {
      marginHorizontal: 18,
      marginTop: 28,
      minHeight: 55,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    logoutText: {
      color: "#D93025",
      fontWeight: "700",
    },

    disabled: {
      opacity: 0.5,
    },

    version: {
      textAlign: "center",
      fontSize: 10,
      color: "#AAA",
      marginTop: 18,
    },
  });