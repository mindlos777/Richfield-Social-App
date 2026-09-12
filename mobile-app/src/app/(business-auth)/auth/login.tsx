import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";

import { useAuth } from "../../../auth/AuthContext";

const PRIMARY = "#0300cf";

export default function BusinessLoginScreen() {
  const {
    signIn,
    signOut,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Email required",
        "Please enter your business email."
      );

      return;
    }

    if (!password) {
      Alert.alert(
        "Password required",
        "Please enter your password."
      );

      return;
    }

    try {
      setLoading(true);

      const profile =
        await signIn(
          email.trim(),
          password
        );

      if (
        profile.role !== "business"
      ) {
        await signOut();

        Alert.alert(
          "Not a business account",
          "This login area is only for business accounts."
        );

        return;
      }

      if (
        profile.status === "pending"
      ) {
        await signOut();

        Alert.alert(
          "Verification pending",
          "Your business account is still waiting for approval."
        );

        return;
      }

      if (
        profile.status === "rejected"
      ) {
        await signOut();

        Alert.alert(
          "Application rejected",
          "Your business account has not been approved."
        );

        return;
      }

      if (
        profile.status === "suspended"
      ) {
        await signOut();

        Alert.alert(
          "Account suspended",
          "Your business account has been suspended."
        );

        return;
      }

      router.replace(
        "/(business-auth)/(tabs)/dashboard"
      );
    } catch (error: any) {
      Alert.alert(
        "Login failed",
        error.message ||
          "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backButton}
        onPress={() =>
          router.replace(
            "/(auth)/login"
          )
        }
      >
        <Text
          style={styles.backText}
        >
          ← Back
        </Text>
      </Pressable>

      <Text style={styles.logo}>
        RICHFIELD
        <Text
          style={styles.logoAccent}
        >
          {" "}
          SOCIAL
        </Text>
      </Text>

      <Text style={styles.title}>
        Business Login
      </Text>

      <Text style={styles.subtitle}>
        Manage opportunities and connect
        with Richfield talent.
      </Text>

      <Text style={styles.label}>
        Business Email
      </Text>

      <TextInput
        style={styles.input}
        placeholder="you@company.co.za"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>
        Password
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={[
          styles.button,
          loading &&
            styles.disabledButton,
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <Text
            style={styles.buttonText}
          >
            Sign In
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() =>
          router.push(
            "/(business-auth)/auth/signup"
          )
        }
      >
        <Text style={styles.signup}>
          Don't have a business
          account?{" "}
          <Text
            style={styles.signupLink}
          >
            Register
          </Text>
        </Text>
      </Pressable>

      <View style={styles.notice}>
        <Text
          style={styles.noticeTitle}
        >
          Business verification
        </Text>

        <Text
          style={styles.noticeText}
        >
          New business accounts must
          be verified before they can
          post jobs or access
          applicants.
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: "#FFFFFF",
    },

    backButton: {
      position: "absolute",
      top: 60,
      left: 24,
    },

    backText: {
      color: PRIMARY,
      fontSize: 15,
      fontWeight: "700",
    },

    logo: {
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 38,
      color: "#111",
    },

    logoAccent: {
      color: PRIMARY,
    },

    title: {
      fontSize: 31,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      color: "#666",
      fontSize: 15,
      lineHeight: 21,
      marginTop: 8,
      marginBottom: 28,
    },

    label: {
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 7,
      color: "#333",
    },

    input: {
      height: 52,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 10,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 15,
      color: "#111",
    },

    button: {
      height: 52,
      backgroundColor: PRIMARY,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
    },

    disabledButton: {
      opacity: 0.5,
    },

    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },

    signup: {
      textAlign: "center",
      marginTop: 22,
      color: "#555",
    },

    signupLink: {
      color: PRIMARY,
      fontWeight: "800",
    },

    notice: {
      marginTop: 30,
      padding: 16,
      borderRadius: 14,
      backgroundColor: "#F5F6FF",
    },

    noticeTitle: {
      fontWeight: "800",
      color: "#111",
    },

    noticeText: {
      marginTop: 5,
      color: "#666",
      lineHeight: 19,
      fontSize: 13,
    },
  });