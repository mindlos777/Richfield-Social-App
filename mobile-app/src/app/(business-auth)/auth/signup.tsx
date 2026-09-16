import React, {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import * as DocumentPicker
  from "expo-document-picker";

import { supabase }
  from "../../../lib/supabase";

const PRIMARY = "#0300cf";

const MAX_DOCUMENT_SIZE =
  5 * 1024 * 1024;

const industries = [
  "Technology",
  "Finance",
  "Education",
  "Healthcare",
  "Retail",
  "Engineering",
  "Telecommunications",
  "Consulting",
  "Marketing",
  "Logistics",
  "Government",
  "Non-Profit",
  "Other",
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function isValidWebsite(value: string) {
  const website = value.trim();

  if (!website) {
    return false;
  }

  return (
    website.startsWith("https://") ||
    website.startsWith("http://")
  );
}

function sanitizeFileName(
  fileName: string
) {
  return fileName.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
}

export default function BusinessSignupScreen() {
  const [
    companyName,
    setCompanyName,
  ] = useState("");

  const [
    registrationNumber,
    setRegistrationNumber,
  ] = useState("");

  const [
    industry,
    setIndustry,
  ] = useState("");

  const [
    website,
    setWebsite,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    companyDescription,
    setCompanyDescription,
  ] = useState("");

  const [
    contactPersonName,
    setContactPersonName,
  ] = useState("");

  const [
    contactPersonJobTitle,
    setContactPersonJobTitle,
  ] = useState("");

  const [
    contactEmail,
    setContactEmail,
  ] = useState("");

  const [
    contactPhone,
    setContactPhone,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    industryOpen,
    setIndustryOpen,
  ] = useState(false);

  const [
    declarationAccepted,
    setDeclarationAccepted,
  ] = useState(false);

  const [
    registrationDocument,
    setRegistrationDocument,
  ] =
    useState<DocumentPicker.DocumentPickerAsset | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState("");

  const passwordIsStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  function validateForm() {
    if (companyName.trim().length < 2) {
      Alert.alert(
        "Company name required",
        "Please enter your company name."
      );

      return false;
    }

    if (
      registrationNumber.trim().length < 4
    ) {
      Alert.alert(
        "Registration number required",
        "Please enter a valid company registration number."
      );

      return false;
    }

    if (!industry) {
      Alert.alert(
        "Industry required",
        "Please select your company's industry."
      );

      return false;
    }

    if (!website.trim()) {
      Alert.alert(
        "Website required",
        "Please enter your company website."
      );

      return false;
    }

    if (!isValidWebsite(website)) {
      Alert.alert(
        "Invalid website",
        "Your website must start with https:// or http://."
      );

      return false;
    }

    if (location.trim().length < 2) {
      Alert.alert(
        "Location required",
        "Please enter your company location."
      );

      return false;
    }

    if (
      companyDescription.trim().length < 20
    ) {
      Alert.alert(
        "Description too short",
        "Please enter at least 20 characters describing your organisation."
      );

      return false;
    }

    if (
      contactPersonName.trim().length < 2
    ) {
      Alert.alert(
        "Contact person required",
        "Please enter the contact person's full name."
      );

      return false;
    }

    if (
      contactPersonJobTitle.trim().length <
      2
    ) {
      Alert.alert(
        "Job title required",
        "Please enter the contact person's job title."
      );

      return false;
    }

    if (!isValidEmail(contactEmail)) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid business email address."
      );

      return false;
    }

    if (contactPhone.trim().length < 9) {
      Alert.alert(
        "Contact number required",
        "Please enter a valid contact number."
      );

      return false;
    }

    if (!registrationDocument) {
      Alert.alert(
        "Verification document required",
        "Please upload your company registration PDF."
      );

      return false;
    }

    if (!passwordIsStrong) {
      Alert.alert(
        "Password not strong enough",
        "Your password must contain at least 8 characters, an uppercase letter, lowercase letter, number and special character."
      );

      return false;
    }

    if (!passwordsMatch) {
      Alert.alert(
        "Passwords do not match",
        "Please make sure both passwords are exactly the same."
      );

      return false;
    }

    if (!declarationAccepted) {
      Alert.alert(
        "Declaration required",
        "Please confirm that you are authorised to represent the organisation."
      );

      return false;
    }

    return true;
  }

  async function pickRegistrationDocument() {
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

      const file = result.assets[0];

      if (!file) {
        return;
      }

      if (
        file.size &&
        file.size > MAX_DOCUMENT_SIZE
      ) {
        Alert.alert(
          "File too large",
          "The registration document must be 5 MB or smaller."
        );

        return;
      }

      const fileName =
        file.name.toLowerCase();

      if (!fileName.endsWith(".pdf")) {
        Alert.alert(
          "Invalid document",
          "Please select a PDF document."
        );

        return;
      }

      setRegistrationDocument(file);
    } catch (error: any) {
      Alert.alert(
        "Document error",
        error?.message ||
          "Could not select the registration document."
      );
    }
  }

  function removeDocument() {
    if (loading) {
      return;
    }

    setRegistrationDocument(null);
  }

  async function uploadBusinessDocument(
    userId: string
  ) {
    if (!registrationDocument) {
      throw new Error(
        "Please upload your company registration document."
      );
    }

    setUploadProgress(
      "Uploading verification document..."
    );

    const response = await fetch(
      registrationDocument.uri
    );

    if (!response.ok) {
      throw new Error(
        "Could not read the selected registration document."
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const safeFileName =
      sanitizeFileName(
        registrationDocument.name ||
          "registration-document.pdf"
      );

    const filePath =
      `${userId}/${Date.now()}-${safeFileName}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("business-verification")
      .upload(
        filePath,
        arrayBuffer,
        {
          contentType:
            registrationDocument.mimeType ||
            "application/pdf",

          upsert: false,
        }
      );

    if (uploadError) {
      throw new Error(
        `Document upload failed: ${uploadError.message}`
      );
    }

    return filePath;
  }

  async function saveDocumentPath(
    userId: string,
    filePath: string
  ) {
    setUploadProgress(
      "Saving verification information..."
    );

    const {
      error: updateError,
    } = await supabase
      .from("business_profiles")
      .update({
        registration_document_url:
          filePath,

        updated_at:
          new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(
        `Could not save the verification document: ${updateError.message}`
      );
    }
  }

  async function handleSignup() {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      setUploadProgress(
        "Creating business account..."
      );

      const email =
        contactEmail
          .trim()
          .toLowerCase();

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email,
          password,

          options: {
            data: {
              signup_role: "business",

              full_name:
                contactPersonName.trim(),

              company_name:
                companyName.trim(),

              company_registration_number:
                registrationNumber.trim(),

              industry,

              website:
                website.trim(),

              company_description:
                companyDescription.trim(),

              location:
                location.trim(),

              contact_email:
                email,

              contact_phone:
                contactPhone.trim(),

              contact_person_name:
                contactPersonName.trim(),

              contact_person_job_title:
                contactPersonJobTitle.trim(),
            },
          },
        });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "Business account could not be created."
        );
      }

      if (!data.session) {
        setUploadProgress("");

        Alert.alert(
          "Account created",
          "Your account was created, but you must verify your email before the registration document can be securely uploaded. Sign in after verification to complete your business application.",
          [
            {
              text: "Continue",

              onPress: () =>
                router.replace(
                  "/login"
                ),
            },
          ]
        );

        return;
      }

      const documentPath =
        await uploadBusinessDocument(
          data.user.id
        );

      await saveDocumentPath(
        data.user.id,
        documentPath
      );

      setUploadProgress("");

      Alert.alert(
        "Application submitted",
        "Your business account and verification document have been submitted successfully. Richfield must approve your organisation before you can access the business platform.",
        [
          {
            text: "Continue",

            onPress: async () => {
              await supabase.auth.signOut();

              router.replace(
                "/login"
              );
            },
          },
        ]
      );
    } catch (error: any) {
      setUploadProgress("");

      console.log(
        "Business signup error:",
        error
      );

      Alert.alert(
        "Registration failed",
        error?.message ||
          "Something went wrong while creating your business account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
          disabled={loading}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111"
          />
        </Pressable>

        <View style={styles.iconBox}>
          <Ionicons
            name="business"
            size={28}
            color="#fff"
          />
        </View>

        <Text style={styles.title}>
          Business registration
        </Text>

        <Text style={styles.subtitle}>
          Register your organisation to
          connect with Richfield talent and
          publish career opportunities.
        </Text>

        <View style={styles.notice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={PRIMARY}
          />

          <Text style={styles.noticeText}>
            Business accounts are reviewed by
            Richfield before they can access
            the platform.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Company information
        </Text>

        <FieldLabel
          text="Company name"
        />

        <TextInput
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="e.g. TechNova Solutions"
          style={styles.input}
          editable={!loading}
        />

        <FieldLabel
          text="Company registration number"
        />

        <TextInput
          value={registrationNumber}
          onChangeText={
            setRegistrationNumber
          }
          placeholder="e.g. 2024/123456/07"
          autoCapitalize="characters"
          style={styles.input}
          editable={!loading}
        />

        <Text style={styles.helper}>
          Enter the official registration
          number used to identify your
          organisation.
        </Text>

        <FieldLabel text="Industry" />

        <Pressable
          style={styles.select}
          disabled={loading}
          onPress={() =>
            setIndustryOpen(
              !industryOpen
            )
          }
        >
          <Text
            style={
              industry
                ? styles.selectText
                : styles.placeholder
            }
          >
            {industry ||
              "Select industry"}
          </Text>

          <Ionicons
            name={
              industryOpen
                ? "chevron-up"
                : "chevron-down"
            }
            size={18}
            color={PRIMARY}
          />
        </Pressable>

        {industryOpen && (
          <View style={styles.dropdown}>
            {industries.map(
              item => (
                <Pressable
                  key={item}
                  style={
                    styles.dropdownItem
                  }
                  onPress={() => {
                    setIndustry(item);

                    setIndustryOpen(
                      false
                    );
                  }}
                >
                  <Text
                    style={
                      styles.dropdownText
                    }
                  >
                    {item}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        )}

        <FieldLabel
          text="Company website"
        />

        <TextInput
          value={website}
          onChangeText={setWebsite}
          placeholder="https://company.co.za"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          editable={!loading}
        />

        {website.length > 0 &&
          !isValidWebsite(
            website
          ) && (
            <Text
              style={styles.errorText}
            >
              Website must start with
              https:// or http://
            </Text>
          )}

        <FieldLabel text="Location" />

        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Johannesburg, Gauteng"
          style={styles.input}
          editable={!loading}
        />

        <FieldLabel
          text="Company description"
        />

        <TextInput
          value={companyDescription}
          onChangeText={
            setCompanyDescription
          }
          placeholder="Tell Richfield what your organisation does..."
          multiline
          textAlignVertical="top"
          maxLength={1000}
          editable={!loading}
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
        />

        <Text style={styles.counter}>
          {companyDescription.length}
          /1000
        </Text>

        <Text style={styles.sectionTitle}>
          Contact person
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          This person will be contacted by
          Richfield regarding verification,
          approval or problems with the
          business account.
        </Text>

        <FieldLabel text="Full name" />

        <TextInput
          value={contactPersonName}
          onChangeText={
            setContactPersonName
          }
          placeholder="Contact person's full name"
          style={styles.input}
          editable={!loading}
        />

        <FieldLabel text="Job title" />

        <TextInput
          value={
            contactPersonJobTitle
          }
          onChangeText={
            setContactPersonJobTitle
          }
          placeholder="e.g. HR Manager"
          style={styles.input}
          editable={!loading}
        />

        <FieldLabel
          text="Business email"
        />

        <TextInput
          value={contactEmail}
          onChangeText={
            setContactEmail
          }
          placeholder="name@company.co.za"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!loading}
        />

        {contactEmail.length > 0 &&
          !isValidEmail(
            contactEmail
          ) && (
            <Text
              style={styles.errorText}
            >
              Enter a valid business
              email.
            </Text>
          )}

        <FieldLabel
          text="Contact number"
        />

        <TextInput
          value={contactPhone}
          onChangeText={
            setContactPhone
          }
          placeholder="+27 82 123 4567"
          keyboardType="phone-pad"
          style={styles.input}
          editable={!loading}
        />

        <Text style={styles.sectionTitle}>
          Verification document
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Upload your official company
          registration document. Richfield
          administrators will use it to
          verify your organisation.
        </Text>

        {!registrationDocument ? (
          <Pressable
            style={
              styles.documentUploadBox
            }
            disabled={loading}
            onPress={
              pickRegistrationDocument
            }
          >
            <View
              style={
                styles.documentIcon
              }
            >
              <Ionicons
                name="cloud-upload-outline"
                size={26}
                color={PRIMARY}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.documentTitle
                }
              >
                Upload registration
                document
              </Text>

              <Text
                style={
                  styles.documentDescription
                }
              >
                PDF only, maximum 5 MB
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color="#999"
            />
          </Pressable>
        ) : (
          <View
            style={
              styles.selectedDocument
            }
          >
            <View
              style={
                styles.successDocumentIcon
              }
            >
              <Ionicons
                name="document-text"
                size={25}
                color="#008A42"
              />
            </View>

            <View
              style={{
                flex: 1,
                paddingRight: 8,
              }}
            >
              <View
                style={
                  styles.documentNameRow
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#008A42"
                />

                <Text
                  style={
                    styles.readyText
                  }
                >
                  Ready
                </Text>
              </View>

              <Text
                style={
                  styles.selectedFileName
                }
                numberOfLines={2}
              >
                {
                  registrationDocument.name
                }
              </Text>

              <Text
                style={
                  styles.documentDescription
                }
              >
                {registrationDocument.size
                  ? `${(
                      registrationDocument.size /
                      1024 /
                      1024
                    ).toFixed(2)} MB`
                  : "PDF document"}
              </Text>
            </View>

            <View
              style={
                styles.documentActions
              }
            >
              <Pressable
                style={
                  styles.documentAction
                }
                disabled={loading}
                onPress={
                  pickRegistrationDocument
                }
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={19}
                  color={PRIMARY}
                />
              </Pressable>

              <Pressable
                style={[
                  styles.documentAction,
                  styles.removeAction,
                ]}
                disabled={loading}
                onPress={
                  removeDocument
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#D00000"
                />
              </Pressable>
            </View>
          </View>
        )}

        <View
          style={
            styles.documentSecurityNotice
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color="#555"
          />

          <Text
            style={
              styles.documentSecurityText
            }
          >
            Your document is stored
            privately and is only available
            to authorised Richfield
            administrators.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Account security
        </Text>

        <FieldLabel text="Password" />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Create a strong password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!loading}
        />

        <View style={styles.rules}>
          <PasswordRule
            valid={
              password.length >= 8
            }
            text="At least 8 characters"
          />

          <PasswordRule
            valid={
              /[A-Z]/.test(
                password
              )
            }
            text="Uppercase letter"
          />

          <PasswordRule
            valid={
              /[a-z]/.test(
                password
              )
            }
            text="Lowercase letter"
          />

          <PasswordRule
            valid={
              /[0-9]/.test(
                password
              )
            }
            text="Number"
          />

          <PasswordRule
            valid={
              /[^A-Za-z0-9]/.test(
                password
              )
            }
            text="Special character"
          />
        </View>

        <FieldLabel
          text="Confirm password"
        />

        <TextInput
          value={confirmPassword}
          onChangeText={
            setConfirmPassword
          }
          placeholder="Re-enter password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={[
            styles.input,

            confirmPassword.length >
              0 &&
            !passwordsMatch
              ? styles.errorInput
              : null,
          ]}
        />

        {confirmPassword.length >
          0 && (
          <Text
            style={
              passwordsMatch
                ? styles.successText
                : styles.errorText
            }
          >
            {passwordsMatch
              ? "✓ Passwords match"
              : "Passwords do not match"}
          </Text>
        )}

        <Pressable
          style={
            styles.declarationRow
          }
          disabled={loading}
          onPress={() =>
            setDeclarationAccepted(
              !declarationAccepted
            )
          }
        >
          <View
            style={[
              styles.checkbox,

              declarationAccepted &&
                styles.checkboxSelected,
            ]}
          >
            {declarationAccepted && (
              <Ionicons
                name="checkmark"
                size={15}
                color="#fff"
              />
            )}
          </View>

          <Text
            style={
              styles.declarationText
            }
          >
            I confirm that I am authorised
            to represent this organisation
            and that the information
            provided is accurate.
          </Text>
        </Pressable>

        {loading &&
          uploadProgress.length >
            0 && (
            <View
              style={
                styles.progressBox
              }
            >
              <ActivityIndicator
                size="small"
                color={PRIMARY}
              />

              <Text
                style={
                  styles.progressText
                }
              >
                {uploadProgress}
              </Text>
            </View>
          )}

        <Pressable
          style={[
            styles.submitButton,

            loading &&
              styles.disabled,
          ]}
          disabled={loading}
          onPress={handleSignup}
        >
          {loading ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <>
              <Text
                style={
                  styles.submitText
                }
              >
                Submit business
                application
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#fff"
              />
            </>
          )}
        </Pressable>

        {!registrationDocument && (
          <Text
            style={
              styles.requiredDocumentText
            }
          >
            A company registration PDF is
            required before you can submit.
          </Text>
        )}

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>
            Already registered?
          </Text>

          <Pressable
            disabled={loading}
            onPress={() =>
              router.replace(
                "/login"
              )
            }
          >
            <Text
              style={
                styles.loginLink
              }
            >
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({
  text,
}: {
  text: string;
}) {
  return (
    <Text style={styles.label}>
      {text}{" "}
      <Text
        style={styles.required}
      >
        *
      </Text>
    </Text>
  );
}

function PasswordRule({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={
          valid
            ? "checkmark-circle"
            : "ellipse-outline"
        }
        size={15}
        color={
          valid
            ? "#008A42"
            : "#999"
        }
      />

      <Text
        style={[
          styles.ruleText,

          valid &&
            styles.validRuleText,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },

    container: {
      paddingHorizontal: 22,
      paddingTop: 45,
      paddingBottom: 50,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#F5F5F7",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 22,
    },

    iconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: "#111111",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 17,
    },

    title: {
      fontSize: 30,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: "#666",
      marginTop: 7,
      marginBottom: 20,
    },

    notice: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F3F3FF",
      borderRadius: 12,
      padding: 14,
      marginBottom: 30,
    },

    noticeText: {
      flex: 1,
      color: "#555",
      fontSize: 12,
      lineHeight: 18,
      marginLeft: 10,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111",
      marginTop: 10,
      marginBottom: 7,
    },

    sectionDescription: {
      fontSize: 13,
      lineHeight: 19,
      color: "#777",
      marginBottom: 14,
    },

    label: {
      fontSize: 14,
      fontWeight: "600",
      color: "#222",
      marginTop: 12,
      marginBottom: 8,
    },

    required: {
      color: "#D00000",
    },

    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 11,
      paddingHorizontal: 15,
      fontSize: 15,
      color: "#111",
      backgroundColor: "#FFF",
    },

    descriptionInput: {
      minHeight: 110,
      paddingTop: 14,
      paddingBottom: 14,
    },

    errorInput: {
      borderColor: "#D00000",
    },

    helper: {
      fontSize: 12,
      color: "#888",
      marginTop: 6,
    },

    errorText: {
      color: "#D00000",
      fontSize: 12,
      marginTop: 6,
    },

    successText: {
      color: "#008A42",
      fontSize: 12,
      marginTop: 6,
    },

    counter: {
      fontSize: 11,
      color: "#999",
      textAlign: "right",
      marginTop: 5,
    },

    select: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 11,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    selectText: {
      fontSize: 15,
      color: "#111",
    },

    placeholder: {
      fontSize: 15,
      color: "#999",
    },

    dropdown: {
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 11,
      marginTop: 5,
      overflow: "hidden",
      backgroundColor: "#FFF",
    },

    dropdownItem: {
      paddingHorizontal: 15,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#EEE",
    },

    dropdownText: {
      fontSize: 14,
      color: "#222",
    },

    documentUploadBox: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: "#B9B8F5",
      borderRadius: 14,
      padding: 15,
      backgroundColor: "#FAFAFF",
      marginTop: 5,
    },

    selectedDocument: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#B7E2C7",
      borderRadius: 14,
      padding: 14,
      backgroundColor: "#F4FFF7",
      marginTop: 5,
    },

    documentIcon: {
      width: 47,
      height: 47,
      borderRadius: 13,
      backgroundColor: "#EEEEFF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    successDocumentIcon: {
      width: 47,
      height: 47,
      borderRadius: 13,
      backgroundColor: "#E5F8EC",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    documentTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
    },

    documentDescription: {
      fontSize: 11,
      lineHeight: 16,
      color: "#777",
      marginTop: 3,
    },

    documentNameRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 3,
    },

    readyText: {
      fontSize: 11,
      color: "#008A42",
      fontWeight: "800",
      marginLeft: 4,
    },

    selectedFileName: {
      fontSize: 13,
      color: "#222",
      fontWeight: "700",
    },

    documentActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    documentAction: {
      width: 35,
      height: 35,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#EEEEFF",
    },

    removeAction: {
      backgroundColor: "#FFECEC",
    },

    documentSecurityNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "#F7F7F8",
      borderRadius: 10,
      padding: 11,
      marginTop: 10,
      marginBottom: 15,
    },

    documentSecurityText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: "#666",
      marginLeft: 7,
    },

    rules: {
      marginTop: 8,
      marginBottom: 5,
    },

    ruleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
    },

    ruleText: {
      color: "#777",
      fontSize: 12,
      marginLeft: 6,
    },

    validRuleText: {
      color: "#008A42",
    },

    declarationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 25,
    },

    checkbox: {
      width: 21,
      height: 21,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: "#BBB",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      marginTop: 1,
    },

    checkboxSelected: {
      borderColor: PRIMARY,
      backgroundColor: PRIMARY,
    },

    declarationText: {
      flex: 1,
      color: "#555",
      fontSize: 12,
      lineHeight: 18,
    },

    progressBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F4F4FF",
      borderRadius: 11,
      padding: 12,
      marginTop: 20,
    },

    progressText: {
      fontSize: 12,
      color: "#555",
      fontWeight: "600",
      marginLeft: 9,
    },

    submitButton: {
      minHeight: 55,
      borderRadius: 12,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 25,
    },

    disabled: {
      opacity: 0.45,
    },

    submitText: {
      color: "#FFF",
      fontSize: 15,
      fontWeight: "800",
    },

    requiredDocumentText: {
      textAlign: "center",
      color: "#888",
      fontSize: 11,
      marginTop: 9,
    },

    loginRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 25,
    },

    loginText: {
      color: "#666",
      fontSize: 14,
    },

    loginLink: {
      color: PRIMARY,
      fontSize: 14,
      fontWeight: "800",
      marginLeft: 5,
    },
  });