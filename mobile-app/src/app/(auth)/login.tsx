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
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useAuth,
} from "../../auth/AuthContext";

const PRIMARY = "#0300cf";

export default function LoginScreen() {
  const {
    signIn,
    loading: authLoading,
  } = useAuth();

  const params =
    useLocalSearchParams<{
      error?: string;
    }>();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  useEffect(() => {
    if (!params.error) {
      return;
    }

    switch (params.error) {
      case "inactive":
        Alert.alert(
          "Account unavailable",
          "Your account is not currently active."
        );
        break;

      case "profile":
        Alert.alert(
          "Account error",
          "We could not load your Richfield Social profile."
        );
        break;

      case "business":
        Alert.alert(
          "Business account",
          "Business accounts use the Business Login area."
        );
        break;

      case "staff-pending":
        Alert.alert(
          "Staff verification pending",
          "Your Richfield Staff account is waiting for Administrator verification."
        );
        break;

      case "staff":
        Alert.alert(
          "Staff account",
          "We could not verify your Richfield Staff account."
        );
        break;

      case "suspended":
        Alert.alert(
          "Account suspended",
          "Your account has been suspended. Please contact Richfield support."
        );
        break;

      default:
        Alert.alert(
          "Login error",
          "We could not determine your account type."
        );
    }
  }, [params.error]);

  function handleEmailChange(
    value: string
  ) {
    setEmail(
      value
        .replace(/\s/g, "")
        .toLowerCase()
        .slice(0, 254)
    );
  }

  const handleLogin = async () => {
    if (
      loading ||
      authLoading
    ) {
      return;
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !password
    ) {
      Alert.alert(
        "Missing details",
        "Please enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);

      const userProfile =
        await signIn(
          cleanEmail,
          password
        );

      const role =
        String(
          userProfile.role || ""
        ).toLowerCase();

      const status =
        String(
          userProfile.status || ""
        ).toLowerCase();

      console.log(
        "Logged in role:",
        role
      );

      console.log(
        "Account status:",
        status
      );

      /*
       * STAFF
       *
       * Staff must be handled BEFORE the
       * normal active-account check.
       *
       * Pending/rejected Staff need to remain
       * authenticated so they can access their
       * verification screen.
       */

      if (role === "staff") {
        if (
          status === "pending" ||
          status === "rejected"
        ) {
          router.replace(
            "/(staff)/pending"
          );

          return;
        }

        if (status === "active") {
          router.replace(
            "/(staff)/(tabs)/feed"
          );

          return;
        }

        if (status === "suspended") {
          throw new Error(
            "Your Staff account has been suspended."
          );
        }

        throw new Error(
          "Your Staff account cannot currently be accessed."
        );
      }

      /*
       * ALL OTHER ROLES
       */

      if (status !== "active") {
        if (status === "suspended") {
          throw new Error(
            "Your account has been suspended. Please contact Richfield support."
          );
        }

        throw new Error(
          `Your account is currently ${status}.`
        );
      }

      /*
       * ADMIN
       */

      if (role === "admin") {
        router.replace(
          "/(admin)/(tabs)/feed"
        );

        return;
      }

      /*
       * STUDENT / ALUMNI
       */

      if (
        role === "student" ||
        role === "alumni"
      ) {
        router.replace(
          "/(tabs)"
        );

        return;
      }

      /*
       * BUSINESS
       */

      if (role === "business") {
        router.replace(
          "/(business-auth)/(tabs)/dashboard"
        );

        return;
      }

      throw new Error(
        `Unsupported account role: ${
          role || "unknown"
        }`
      );
    } catch (error: any) {
      console.log(
        "Login error:",
        error
      );

      Alert.alert(
        "Login failed",
        error?.message ||
          "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    loading ||
    authLoading;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* LOGO */}

          <View
            style={styles.logoSection}
          >
            <Image
              source={require(
                "../../../assets/images/rf_logo.jpg"
              )}
              style={styles.logoImage}
              resizeMode="contain"
            />

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
          </View>

          {/* HEADER */}

          <Text style={styles.title}>
            Welcome back
          </Text>

          <Text
            style={styles.subtitle}
          >
            Sign in to your professional
            community.
          </Text>

          {/* EMAIL */}

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={
              handleEmailChange
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={254}
            editable={!disabled}
            returnKeyType="next"
          />

          {/* PASSWORD */}

          <Text style={styles.label}>
            Password
          </Text>

          <View
            style={
              styles.passwordContainer
            }
          >
            <TextInput
              style={
                styles.passwordInput
              }
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={
                setPassword
              }
              secureTextEntry={
                !showPassword
              }
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={128}
              editable={!disabled}
              onSubmitEditing={
                handleLogin
              }
              returnKeyType="done"
            />

            <Pressable
              hitSlop={10}
              disabled={disabled}
              onPress={() =>
                setShowPassword(
                  (current) =>
                    !current
                )
              }
            >
              <Text
                style={
                  styles.passwordToggle
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </Text>
            </Pressable>
          </View>

          {/* SIGN IN */}

          <Pressable
            style={[
              styles.button,
              disabled &&
                styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={disabled}
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
                Sign In
              </Text>
            )}
          </Pressable>

          {/* COMMUNITY SIGNUP */}

          <Pressable
            onPress={() =>
              router.push(
                "/(auth)/signup"
              )
            }
            disabled={disabled}
          >
            <Text
              style={styles.signup}
            >
              New to Richfield Social?{" "}

              <Text
                style={
                  styles.signupLink
                }
              >
                Sign up
              </Text>
            </Text>
          </Pressable>

          {/* BUSINESS */}

          <View
            style={
              styles.businessBox
            }
          >
            <View
              style={
                styles.businessIcon
              }
            >
              <Text
                style={
                  styles.businessIconText
                }
              >
                B
              </Text>
            </View>

            <View
              style={
                styles.businessContent
              }
            >
              <Text
                style={
                  styles.businessTitle
                }
              >
                Are you a business?
              </Text>

              <Text
                style={
                  styles.businessText
                }
              >
                Businesses have a separate
                registration and verification
                process.
              </Text>

              <Pressable
                hitSlop={8}
                disabled={disabled}
                onPress={() =>
                  router.push(
                    "/(business-auth)/auth/login"
                  )
                }
              >
                <Text
                  style={
                    styles.businessLink
                  }
                >
                  Business Sign Up / Log In →
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footer}>
            Students, alumni and Staff use
            their Richfield account to access
            the community.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },

    keyboardView: {
      flex: 1,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 35,
      paddingBottom: 50,
    },

    logoSection: {
      alignItems: "center",
      marginBottom: 32,
    },

    logoImage: {
      width: 105,
      height: 105,
    },

    logo: {
      marginTop: 4,
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
    },

    logoAccent: {
      color: PRIMARY,
    },

    title: {
      fontSize: 32,
      fontWeight: "800",
      marginBottom: 8,
      color: "#111",
    },

    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      color: "#666",
      marginBottom: 28,
    },

    label: {
      fontSize: 13,
      fontWeight: "700",
      color: "#374151",
      marginBottom: 7,
    },

    input: {
      height: 52,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 10,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 16,
      color: "#111",
      backgroundColor:
        "#FFFFFF",
    },

    passwordContainer: {
      height: 52,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 10,
      paddingLeft: 16,
      paddingRight: 14,
      marginBottom: 16,
      backgroundColor:
        "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
    },

    passwordInput: {
      flex: 1,
      height: "100%",
      fontSize: 16,
      color: "#111",
      paddingRight: 10,
    },

    passwordToggle: {
      color: PRIMARY,
      fontSize: 13,
      fontWeight: "700",
    },

    button: {
      height: 52,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        PRIMARY,
      marginTop: 4,
    },

    buttonDisabled: {
      opacity: 0.5,
    },

    buttonText: {
      color: "#FFF",
      fontSize: 16,
      fontWeight: "700",
    },

    signup: {
      textAlign: "center",
      marginTop: 22,
      fontSize: 14,
      color: "#444",
    },

    signupLink: {
      color: PRIMARY,
      fontWeight: "700",
    },

    businessBox: {
      marginTop: 28,
      padding: 18,
      borderRadius: 14,
      backgroundColor:
        "#F5F6FF",
      borderWidth: 1,
      borderColor:
        "#E1E3FF",
      flexDirection: "row",
      alignItems: "flex-start",
    },

    businessIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    businessIconText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "800",
    },

    businessContent: {
      flex: 1,
    },

    businessTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#111",
    },

    businessText: {
      fontSize: 13,
      color: "#666",
      lineHeight: 19,
      marginTop: 5,
    },

    businessLink: {
      marginTop: 10,
      color: PRIMARY,
      fontWeight: "800",
      fontSize: 14,
    },

    footer: {
      textAlign: "center",
      color: "#9CA3AF",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 28,
      paddingHorizontal: 15,
    },
  });