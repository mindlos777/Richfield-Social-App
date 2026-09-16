import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

import * as ImagePicker
  from "expo-image-picker";

import {
  supabase,
} from "../../../lib/supabase";

const PRIMARY =
  "#0300cf";

type MainProfile = {
  id: string;
  full_name:
    | string
    | null;
  avatar_url:
    | string
    | null;
  role:
    | string
    | null;
};

type BusinessProfile = {
  user_id: string;

  organisation_name:
    | string
    | null;

  industry:
    | string
    | null;

  company_description:
    | string
    | null;

  location:
    | string
    | null;

  company_website:
    | string
    | null;

  contact_email:
    | string
    | null;

  contact_phone:
    | string
    | null;

  talent_interests:
    string[] | null;
};

export default function EditBusinessProfileScreen() {
  const [
    userId,
    setUserId,
  ] =
    useState<
      string | null
    >(null);

  const [
    logoUrl,
    setLogoUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    organisationName,
    setOrganisationName,
  ] =
    useState("");

  const [
    industry,
    setIndustry,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    location,
    setLocation,
  ] =
    useState("");

  const [
    website,
    setWebsite,
  ] =
    useState("");

  const [
    contactEmail,
    setContactEmail,
  ] =
    useState("");

  const [
    contactPhone,
    setContactPhone,
  ] =
    useState("");

  const [
    talentInterests,
    setTalentInterests,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  async function loadProfile() {
    try {
      setLoading(
        true
      );

      console.log(
        "EDIT PROFILE: 1 - getting auth user"
      );

      const {
        data:
          authData,
        error:
          authError,
      } =
        await supabase.auth
          .getUser();

      if (
        authError
      ) {
        console.log(
          "EDIT PROFILE AUTH ERROR:",
          authError
        );

        throw authError;
      }

      const user =
        authData.user;

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

      console.log(
        "EDIT PROFILE: 2 - authenticated:",
        user.id
      );

      setUserId(
        user.id
      );

      // =====================================================
      // MAIN PROFILE
      // =====================================================

      console.log(
        "EDIT PROFILE: 3 - loading profiles table"
      );

      const {
        data:
          profileRows,
        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(`
            id,
            full_name,
            avatar_url,
            role
          `)
          .eq(
            "id",
            user.id
          );

      if (
        profileError
      ) {
        console.log(
          "EDIT PROFILE MAIN PROFILE ERROR:",
          profileError
        );

        throw profileError;
      }

      console.log(
        "EDIT PROFILE: 4 - profile rows:",
        profileRows
      );

      const profile:
        MainProfile | null =
        profileRows &&
        profileRows.length >
          0
          ? profileRows[0]
          : null;

      if (
        !profile
      ) {
        throw new Error(
          "Your account exists, but no profile row was found."
        );
      }

      if (
        profile.role !==
        "business"
      ) {
        throw new Error(
          "This account is not a business account."
        );
      }

      setLogoUrl(
        profile.avatar_url ||
          null
      );

      // =====================================================
      // BUSINESS PROFILE
      // =====================================================

      console.log(
        "EDIT PROFILE: 5 - loading business_profiles table"
      );

      const {
        data:
          businessRows,
        error:
          businessError,
      } =
        await supabase
          .from(
            "business_profiles"
          )
          .select(`
            user_id,
            organisation_name,
            industry,
            company_description,
            location,
            company_website,
            contact_email,
            contact_phone,
            talent_interests
          `)
          .eq(
            "user_id",
            user.id
          );

      if (
        businessError
      ) {
        console.log(
          "EDIT PROFILE BUSINESS QUERY ERROR:",
          businessError
        );

        throw businessError;
      }

      console.log(
        "EDIT PROFILE: 6 - business rows:",
        businessRows
      );

      const business:
        BusinessProfile | null =
        businessRows &&
        businessRows.length >
          0
          ? businessRows[0]
          : null;

      // =====================================================
      // IF NO BUSINESS PROFILE EXISTS YET
      // DO NOT INSERT ANYTHING HERE.
      // JUST USE DEFAULT FORM VALUES.
      // =====================================================

      if (
        !business
      ) {
        console.log(
          "EDIT PROFILE: 7 - no business profile row. Using local defaults."
        );

        setOrganisationName(
          profile.full_name ||
            ""
        );

        setIndustry(
          ""
        );

        setDescription(
          ""
        );

        setLocation(
          ""
        );

        setWebsite(
          ""
        );

        setContactEmail(
          user.email ||
            ""
        );

        setContactPhone(
          ""
        );

        setTalentInterests(
          ""
        );

        console.log(
          "EDIT PROFILE: 8 - defaults loaded"
        );

        return;
      }

      // =====================================================
      // EXISTING BUSINESS PROFILE
      // =====================================================

      setOrganisationName(
        business
          .organisation_name ||
          profile.full_name ||
          ""
      );

      setIndustry(
        business.industry ||
          ""
      );

      setDescription(
        business
          .company_description ||
          ""
      );

      setLocation(
        business.location ||
          ""
      );

      setWebsite(
        business
          .company_website ||
          ""
      );

      setContactEmail(
        business
          .contact_email ||
          user.email ||
          ""
      );

      setContactPhone(
        business
          .contact_phone ||
          ""
      );

      setTalentInterests(
        (
          business
            .talent_interests ||
          []
        ).join(", ")
      );

      console.log(
        "EDIT PROFILE: 9 - profile loaded successfully"
      );
    } catch (
      error: any
    ) {
      console.log(
        "EDIT PROFILE FINAL ERROR:",
        error
      );

      Alert.alert(
        "Unable to load profile",
        error?.message ||
          "Could not load your company profile."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  // =========================================================
  // CHOOSE COMPANY LOGO
  // =========================================================

  async function chooseLogo() {
    if (!userId) {
      Alert.alert(
        "Profile unavailable",
        "Your profile has not finished loading."
      );

      return;
    }

    try {
      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (
        !permission.granted
      ) {
        Alert.alert(
          "Permission required",
          "Allow photo access to select your company logo."
        );

        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: [
              "images",
            ],

            allowsEditing:
              true,

            aspect: [
              1,
              1,
            ],

            quality:
              0.85,
          });

      if (
        result.canceled ||
        !result.assets?.[0]
      ) {
        return;
      }

      setUploading(
        true
      );

      const asset =
        result.assets[0];

      const uri =
        asset.uri;

      const response =
        await fetch(
          uri
        );

      const arrayBuffer =
        await response
          .arrayBuffer();

      const filePath =
        `${userId}/business-logo-${Date.now()}.jpg`;

      console.log(
        "EDIT PROFILE: uploading logo",
        filePath
      );

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "profile-media"
          )
          .upload(
            filePath,
            arrayBuffer,
            {
              contentType:
                asset.mimeType ||
                "image/jpeg",

              cacheControl:
                "3600",

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        console.log(
          "EDIT PROFILE LOGO UPLOAD ERROR:",
          uploadError
        );

        throw uploadError;
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "profile-media"
          )
          .getPublicUrl(
            filePath
          );

      const publicUrl =
        publicUrlData
          .publicUrl;

      console.log(
        "EDIT PROFILE: updating avatar_url"
      );

      const {
        data:
          updatedProfiles,
        error:
          profileUpdateError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            avatar_url:
              publicUrl,
          })
          .eq(
            "id",
            userId
          )
          .select(
            "id, avatar_url"
          );

      if (
        profileUpdateError
      ) {
        console.log(
          "EDIT PROFILE AVATAR UPDATE ERROR:",
          profileUpdateError
        );

        throw profileUpdateError;
      }

      if (
        !updatedProfiles ||
        updatedProfiles.length ===
          0
      ) {
        throw new Error(
          "The logo uploaded, but your profile row could not be updated."
        );
      }

      setLogoUrl(
        publicUrl
      );

      Alert.alert(
        "Logo updated",
        "Your company logo has been updated."
      );
    } catch (
      error: any
    ) {
      console.log(
        "Business logo error:",
        error
      );

      Alert.alert(
        "Logo upload failed",
        error?.message ||
          "Could not upload the company logo."
      );
    } finally {
      setUploading(
        false
      );
    }
  }

  // =========================================================
  // SAVE PROFILE
  // =========================================================

  async function save() {
    if (!userId) {
      Alert.alert(
        "Profile unavailable",
        "Your profile has not finished loading."
      );

      return;
    }

    const cleanName =
      organisationName
        .trim();

    const cleanIndustry =
      industry.trim();

    if (
      !cleanName
    ) {
      Alert.alert(
        "Organisation name",
        "Please enter your organisation name."
      );

      return;
    }

    if (
      !cleanIndustry
    ) {
      Alert.alert(
        "Industry",
        "Please enter your industry."
      );

      return;
    }

    setSaving(
      true
    );

    try {
      const talents =
        talentInterests
          .split(",")
          .map(
            item =>
              item.trim()
          )
          .filter(
            item =>
              item.length >
              0
          );

      console.log(
        "EDIT PROFILE SAVE: 1 - checking business row"
      );

      // =====================================================
      // CHECK WHETHER ROW EXISTS
      // =====================================================

      const {
        data:
          existingRows,
        error:
          existingError,
      } =
        await supabase
          .from(
            "business_profiles"
          )
          .select(
            "user_id"
          )
          .eq(
            "user_id",
            userId
          );

      if (
        existingError
      ) {
        console.log(
          "EDIT PROFILE SAVE CHECK ERROR:",
          existingError
        );

        throw existingError;
      }

      const businessData = {
        organisation_name:
          cleanName,

        industry:
          cleanIndustry,

        company_description:
          description
            .trim() ||
          null,

        location:
          location
            .trim() ||
          null,

        company_website:
          website
            .trim() ||
          null,

        contact_email:
          contactEmail
            .trim() ||
          null,

        contact_phone:
          contactPhone
            .trim() ||
          null,

        talent_interests:
          talents,

        updated_at:
          new Date()
            .toISOString(),
      };

      // =====================================================
      // UPDATE EXISTING ROW
      // =====================================================

      if (
        existingRows &&
        existingRows.length >
          0
      ) {
        console.log(
          "EDIT PROFILE SAVE: 2 - updating existing row"
        );

        const {
          data:
            updatedBusinessRows,
          error:
            updateBusinessError,
        } =
          await supabase
            .from(
              "business_profiles"
            )
            .update(
              businessData
            )
            .eq(
              "user_id",
              userId
            )
            .select(
              "user_id"
            );

        if (
          updateBusinessError
        ) {
          console.log(
            "EDIT PROFILE BUSINESS UPDATE ERROR:",
            updateBusinessError
          );

          throw updateBusinessError;
        }

        if (
          !updatedBusinessRows ||
          updatedBusinessRows.length ===
            0
        ) {
          throw new Error(
            "Your company profile could not be updated. Check the business_profiles RLS update policy."
          );
        }
      }

      // =====================================================
      // INSERT NEW ROW
      // =====================================================

      else {
        console.log(
          "EDIT PROFILE SAVE: 2 - creating new row"
        );

        const {
          data:
            insertedBusinessRows,
          error:
            insertBusinessError,
        } =
          await supabase
            .from(
              "business_profiles"
            )
            .insert({
              user_id:
                userId,

              ...businessData,
            })
            .select(
              "user_id"
            );

        if (
          insertBusinessError
        ) {
          console.log(
            "EDIT PROFILE BUSINESS INSERT ERROR:",
            insertBusinessError
          );

          throw insertBusinessError;
        }

        if (
          !insertedBusinessRows ||
          insertedBusinessRows.length ===
            0
        ) {
          throw new Error(
            "Your company profile could not be created. Check the business_profiles RLS insert policy."
          );
        }
      }

      // =====================================================
      // UPDATE GENERAL PROFILE
      // =====================================================

      console.log(
        "EDIT PROFILE SAVE: 3 - updating headline"
      );

      const {
        data:
          updatedProfileRows,
        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            headline:
              `${cleanIndustry} · Industry Partner`,
          })
          .eq(
            "id",
            userId
          )
          .select(
            "id"
          );

      if (
        profileError
      ) {
        console.log(
          "EDIT PROFILE HEADLINE ERROR:",
          profileError
        );

        throw profileError;
      }

      if (
        !updatedProfileRows ||
        updatedProfileRows.length ===
          0
      ) {
        throw new Error(
          "The company profile saved, but the main profile headline could not be updated."
        );
      }

      console.log(
        "EDIT PROFILE SAVE: 4 - completed successfully"
      );

      Alert.alert(
        "Profile updated",
        "Your company profile has been saved.",
        [
          {
            text:
              "Done",

            onPress:
              () =>
                router.back(),
          },
        ]
      );
    } catch (
      error: any
    ) {
      console.log(
        "BUSINESS PROFILE SAVE FINAL ERROR:",
        error
      );

      Alert.alert(
        "Could not save",
        error?.message ||
          "Something went wrong while updating your company profile."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={
            PRIMARY
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading company profile...
        </Text>
      </SafeAreaView>
    );
  }

  // =========================================================
  // SCREEN
  // =========================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
        }}
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#111"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Edit company profile
          </Text>

          <View
            style={{
              width: 42,
            }}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={
              styles.logoSection
            }
          >
            <Pressable
              onPress={
                chooseLogo
              }
              disabled={
                uploading
              }
              style={
                styles.logoWrapper
              }
            >
              {logoUrl ? (
                <Image
                  source={{
                    uri:
                      logoUrl,
                  }}
                  style={
                    styles.logo
                  }
                />
              ) : (
                <View
                  style={
                    styles.logoFallback
                  }
                >
                  <Ionicons
                    name="business-outline"
                    size={35}
                    color={
                      PRIMARY
                    }
                  />
                </View>
              )}

              <View
                style={
                  styles.cameraBadge
                }
              >
                {uploading ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                  />
                ) : (
                  <Ionicons
                    name="camera"
                    size={16}
                    color="#fff"
                  />
                )}
              </View>
            </Pressable>

            <Text
              style={
                styles.logoTitle
              }
            >
              Company logo
            </Text>

            <Text
              style={
                styles.logoSubtitle
              }
            >
              A professional logo helps students recognise your organisation.
            </Text>
          </View>

          <SectionHeader
            title="Company information"
            subtitle="Tell students and graduates about your organisation."
          />

          <FormField
            label="Organisation name"
            value={
              organisationName
            }
            onChangeText={
              setOrganisationName
            }
            placeholder="e.g. Tech Solutions Africa"
          />

          <FormField
            label="Industry"
            value={
              industry
            }
            onChangeText={
              setIndustry
            }
            placeholder="e.g. Software & Technology"
          />

          <FormField
            label="Company description"
            value={
              description
            }
            onChangeText={
              setDescription
            }
            placeholder="Tell students about your company, culture and what you do."
            multiline
          />

          <FormField
            label="Location"
            value={
              location
            }
            onChangeText={
              setLocation
            }
            placeholder="e.g. Johannesburg, Gauteng"
          />

          <SectionHeader
            title="Contact information"
            subtitle="Give candidates a way to learn more about your organisation."
          />

          <FormField
            label="Company website"
            value={
              website
            }
            onChangeText={
              setWebsite
            }
            placeholder="https://company.co.za"
            autoCapitalize="none"
            keyboardType="url"
          />

          <FormField
            label="Contact email"
            value={
              contactEmail
            }
            onChangeText={
              setContactEmail
            }
            placeholder="careers@company.co.za"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            label="Contact phone"
            value={
              contactPhone
            }
            onChangeText={
              setContactPhone
            }
            placeholder="+27 10 000 0000"
            keyboardType="phone-pad"
          />

          <SectionHeader
            title="Talent preferences"
            subtitle="Add the skills your company is interested in."
          />

          <FormField
            label="Talent and skills sought"
            value={
              talentInterests
            }
            onChangeText={
              setTalentInterests
            }
            placeholder="React, Java, Data Science, Cloud, Cybersecurity"
            multiline
            helper="Separate each skill or talent area with a comma."
          />

          <Pressable
            style={[
              styles.saveButton,

              (
                saving ||
                uploading
              ) &&
                styles.saveButtonDisabled,
            ]}
            disabled={
              saving ||
              uploading
            }
            onPress={
              save
            }
          >
            {saving ? (
              <ActivityIndicator
                color="#fff"
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Save profile
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================================================
// SECTION HEADER
// =========================================================

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>
  );
}

// =========================================================
// FORM FIELD
// =========================================================

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  helper,
  ...rest
}: {
  label: string;

  value: string;

  onChangeText:
    (
      value: string
    ) => void;

  placeholder: string;

  multiline?: boolean;

  helper?: string;

  [key: string]:
    any;
}) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={
          styles.label
        }
      >
        {label}
      </Text>

      <TextInput
        value={
          value
        }
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#A2A2AA"
        multiline={
          multiline
        }
        textAlignVertical={
          multiline
            ? "top"
            : "center"
        }
        style={[
          styles.input,

          multiline &&
            styles.multilineInput,
        ]}
        {...rest}
      />

      {helper ? (
        <Text
          style={
            styles.helper
          }
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F7F7FB",
    },

    loading: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F7F7FB",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      color: "#777",
    },

    header: {
      height: 62,
      backgroundColor:
        "#fff",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingHorizontal:
        12,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#EBEBEF",
    },

    headerButton: {
      width: 42,
      height: 42,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerTitle: {
      fontSize: 16,
      fontWeight:
        "800",
      color: "#151515",
    },

    content: {
      padding: 18,
      paddingBottom:
        80,
    },

    logoSection: {
      alignItems:
        "center",

      marginBottom:
        30,
    },

    logoWrapper: {
      position:
        "relative",
    },

    logo: {
      width: 104,
      height: 104,

      borderRadius:
        24,

      backgroundColor:
        "#fff",

      borderWidth:
        1,

      borderColor:
        "#E4E4EA",
    },

    logoFallback: {
      width: 104,
      height: 104,

      borderRadius:
        24,

      backgroundColor:
        "#ECECFF",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    cameraBadge: {
      position:
        "absolute",

      right: -4,
      bottom: -4,

      width: 35,
      height: 35,

      borderRadius:
        18,

      backgroundColor:
        PRIMARY,

      borderWidth:
        3,

      borderColor:
        "#F7F7FB",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    logoTitle: {
      marginTop: 13,

      fontSize: 15,

      fontWeight:
        "800",

      color: "#222",
    },

    logoSubtitle: {
      marginTop: 5,

      maxWidth: 280,

      textAlign:
        "center",

      color: "#888",

      lineHeight: 17,

      fontSize: 11,
    },

    sectionHeader: {
      marginTop: 8,

      marginBottom:
        16,
    },

    sectionTitle: {
      fontSize: 17,

      fontWeight:
        "900",

      color: "#171717",
    },

    sectionSubtitle: {
      marginTop: 4,

      fontSize: 11,

      lineHeight: 17,

      color: "#888",
    },

    field: {
      marginBottom:
        17,
    },

    label: {
      marginBottom:
        7,

      fontSize: 12,

      fontWeight:
        "700",

      color: "#333",
    },

    input: {
      minHeight: 50,

      borderRadius:
        13,

      backgroundColor:
        "#fff",

      borderWidth:
        1,

      borderColor:
        "#E5E5EB",

      paddingHorizontal:
        13,

      fontSize: 13,

      color: "#111",
    },

    multilineInput: {
      minHeight: 115,

      paddingTop:
        13,

      paddingBottom:
        13,
    },

    helper: {
      marginTop: 5,

      fontSize: 10,

      lineHeight: 15,

      color: "#888",
    },

    saveButton: {
      marginTop: 18,

      minHeight: 53,

      borderRadius:
        14,

      backgroundColor:
        PRIMARY,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },

    saveButtonDisabled: {
      opacity:
        0.65,
    },

    saveButtonText: {
      color: "#fff",

      fontWeight:
        "800",

      fontSize: 14,
    },
  });