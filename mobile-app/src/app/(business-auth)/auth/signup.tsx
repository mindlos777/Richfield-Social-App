import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

export default function BusinessSignupScreen() {
  const [fullName, setFullName] =
    useState("");

  const [
    companyName,
    setCompanyName,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [industry, setIndustry] =
    useState("");

  const [website, setWebsite] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const validatePassword = (
    value: string
  ) => {
    return (
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  };

  const handleSignup = async () => {
    if (
      !fullName.trim() ||
      !companyName.trim() ||
      !email.trim() ||
      !industry.trim() ||
      !location.trim() ||
      !description.trim() ||
      !password
    ) {
      Alert.alert(
        "Missing information",
        "Please complete all required fields."
      );

      return;
    }

    if (!email.includes("@")) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid business email."
      );

      return;
    }

    if (
      !validatePassword(password)
    ) {
      Alert.alert(
        "Weak password",
        "Password must contain at least 8 characters, an uppercase letter, lowercase letter, number and special character."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      Alert.alert(
        "Passwords do not match",
        "Please make sure both passwords are the same."
      );

      return;
    }

    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email:
          email.trim().toLowerCase(),

        password,

        options: {
          data: {
            full_name:
              fullName.trim(),

            signup_role:
              "business",

            company_name:
              companyName.trim(),

            industry:
              industry.trim(),

            website:
              website.trim(),

            location:
              location.trim(),

            description:
              description.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "Unable to create business account."
        );
      }

      Alert.alert(
        "Registration submitted",
        "Your business account has been created. Please confirm your email. Your account must also be approved before you can access business features.",
        [
          {
            text: "Go to Login",

            onPress: () =>
              router.replace(
                "/(business-auth)/auth/login"
              ),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Registration failed",
        error.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ← Back
          </Text>
        </Pressable>

        <Text style={styles.logo}>
          RICHFIELD
          <Text
            style={
              styles.logoAccent
            }
          >
            {" "}
            SOCIAL
          </Text>
        </Text>

        <Text style={styles.title}>
          Business Registration
        </Text>

        <Text
          style={styles.subtitle}
        >
          Join Richfield Social to
          discover students, alumni and
          future employees.
        </Text>

        <Label
          title="Contact Person"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#999"
          value={fullName}
          onChangeText={setFullName}
        />

        <Label
          title="Company Name"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="Company name"
          placeholderTextColor="#999"
          value={companyName}
          onChangeText={
            setCompanyName
          }
        />

        <Label
          title="Business Email"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="company@example.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Label
          title="Industry"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="e.g. Technology"
          placeholderTextColor="#999"
          value={industry}
          onChangeText={setIndustry}
        />

        <Label title="Website" />

        <TextInput
          style={styles.input}
          placeholder="https://company.co.za"
          placeholderTextColor="#999"
          value={website}
          onChangeText={setWebsite}
          autoCapitalize="none"
        />

        <Label
          title="Location"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="e.g. Sandton, Gauteng"
          placeholderTextColor="#999"
          value={location}
          onChangeText={setLocation}
        />

        <Label
          title="Company Description"
          required
        />

        <TextInput
          style={[
            styles.input,
            styles.textArea,
          ]}
          placeholder="Tell us about your company..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={
            setDescription
          }
          multiline
          textAlignVertical="top"
        />

        <Label
          title="Password"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="Create password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text
          style={styles.passwordHint}
        >
          Minimum 8 characters with
          uppercase, lowercase, number
          and special character.
        </Text>

        <Label
          title="Confirm Password"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={
            setConfirmPassword
          }
          secureTextEntry
        />

        <View style={styles.notice}>
          <Text
            style={
              styles.noticeTitle
            }
          >
            Verification required
          </Text>

          <Text
            style={
              styles.noticeText
            }
          >
            Business accounts are
            reviewed before access is
            granted. This helps protect
            students and alumni from
            fraudulent recruiters.
          </Text>
        </View>

        <Pressable
          style={[
            styles.button,

            loading &&
              styles.disabledButton,
          ]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              Create Business Account
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() =>
            router.replace(
              "/(business-auth)/auth/login"
            )
          }
        >
          <Text
            style={styles.loginText}
          >
            Already registered?{" "}
            <Text
              style={
                styles.loginLink
              }
            >
              Sign in
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Label({
  title,
  required = false,
}: {
  title: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.label}>
      {title}

      {required && (
        <Text
          style={styles.required}
        >
          {" "}
          *
        </Text>
      )}
    </Text>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },

    content: {
      padding: 24,
      paddingTop: 55,
      paddingBottom: 45,
    },

    back: {
      color: PRIMARY,
      fontWeight: "700",
      marginBottom: 30,
    },

    logo: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
      marginBottom: 35,
    },

    logoAccent: {
      color: PRIMARY,
    },

    title: {
      fontSize: 30,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      color: "#666",
      lineHeight: 21,
      marginTop: 8,
      marginBottom: 24,
    },

    label: {
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 7,
      marginTop: 6,
      color: "#333",
    },

    required: {
      color: "#D93025",
    },

    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 10,
      paddingHorizontal: 15,
      fontSize: 15,
      color: "#111",
      marginBottom: 15,
    },

    textArea: {
      minHeight: 115,
      paddingTop: 14,
    },

    passwordHint: {
      fontSize: 11,
      color: "#888",
      marginTop: -8,
      marginBottom: 14,
    },

    notice: {
      backgroundColor: "#F5F6FF",
      borderRadius: 14,
      padding: 16,
      marginTop: 8,
      marginBottom: 20,
    },

    noticeTitle: {
      fontWeight: "800",
      color: "#111",
    },

    noticeText: {
      color: "#666",
      lineHeight: 19,
      fontSize: 13,
      marginTop: 5,
    },

    button: {
      height: 54,
      borderRadius: 10,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
    },

    disabledButton: {
      opacity: 0.5,
    },

    buttonText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 15,
    },

    loginText: {
      textAlign: "center",
      marginTop: 22,
      color: "#555",
    },

    loginLink: {
      color: PRIMARY,
      fontWeight: "800",
    },
  });