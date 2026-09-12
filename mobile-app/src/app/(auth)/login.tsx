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
    signInWithMicrosoft,
    signOut,
    loading: authLoading,
  } = useAuth();

  const params =
    useLocalSearchParams<{
      error?: string;
    }>();

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    microsoftLoading,
    setMicrosoftLoading,
  ] =
    useState(false);

  useEffect(() => {
    if (!params.error) {
      return;
    }

    switch (
      params.error
    ) {
      case "admin":
        Alert.alert(
          "Admin account",
          "This is an administrator account. Please use the Richfield Connect Admin Portal to sign in."
        );
        break;

      case "business":
        Alert.alert(
          "Business account",
          "Business accounts use the separate Business Login / Sign Up area."
        );
        break;

      case "inactive":
        Alert.alert(
          "Account unavailable",
          "Your account is currently pending, suspended or rejected."
        );
        break;

      case "profile":
        Alert.alert(
          "Account error",
          "We could not load your Richfield Connect profile."
        );
        break;

      default:
        Alert.alert(
          "Login error",
          "We could not determine your account type."
        );
    }
  }, [
    params.error,
  ]);

  const handleLogin =
    async () => {
      try {
        setLoading(
          true
        );

        const userProfile =
          await signIn(
            email.trim(),
            password
          );

        console.log(
          "Logged in role:",
          userProfile.role
        );

        if (
          userProfile.role ===
          "student"
        ) {
          router.replace(
            "/(tabs)"
          );

          return;
        }

        if (
          userProfile.role ===
          "alumni"
        ) {
          router.replace(
            "/(alumni)"
          );

          return;
        }

        if (
          userProfile.role ===
          "business"
        ) {
          router.replace(
            "/(business-auth)/(tabs)/dashboard"
          );

          return;
        }

        if (
          userProfile.role ===
          "admin"
        ) {
          Alert.alert(
            "Admin account",
            "Please use the Richfield Social Admin Portal."
          );

          await signOut();

          return;
        }

        throw new Error(
          "Your account role is invalid."
        );
      } catch (
        error: any
      ) {
        Alert.alert(
          "Login failed",
          error.message ||
            "Unable to login."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  const handleMicrosoftLogin =
    async () => {
      try {
        setMicrosoftLoading(
          true
        );

        await signInWithMicrosoft();
      } catch (
        error: any
      ) {
        Alert.alert(
          "Microsoft Login",
          error.message ||
            "Unable to start Microsoft login."
        );

        setMicrosoftLoading(
          false
        );
      }
    };

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <KeyboardAvoidingView
        style={
          styles.keyboardView
        }
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={
              styles.logoSection
            }
          >
            <Image
              source={require(
                "../../../assets/images/rf_logo.jpg"
              )}
              style={
                styles.logoImage
              }
              resizeMode="contain"
            />

            <Text
              style={
                styles.logo
              }
            >
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

          <Text
            style={
              styles.title
            }
          >
            Welcome back
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Sign in to your professional community.
          </Text>

          <Pressable
            style={[
              styles.microsoftButton,

              microsoftLoading &&
                styles.buttonDisabled,
            ]}
            onPress={
              handleMicrosoftLogin
            }
            disabled={
              microsoftLoading ||
              authLoading
            }
          >
            {microsoftLoading ? (
              <ActivityIndicator
                color="#111"
              />
            ) : (
              <>
                <View
                  style={
                    styles.microsoftLogo
                  }
                >
                  <View
                    style={
                      styles.msRed
                    }
                  />

                  <View
                    style={
                      styles.msGreen
                    }
                  />

                  <View
                    style={
                      styles.msBlue
                    }
                  />

                  <View
                    style={
                      styles.msYellow
                    }
                  />
                </View>

                <Text
                  style={
                    styles.microsoftText
                  }
                >
                  Continue with Microsoft
                </Text>
              </>
            )}
          </Pressable>

          <View
            style={
              styles.divider
            }
          >
            <View
              style={
                styles.line
              }
            />

            <Text
              style={
                styles.or
              }
            >
              OR
            </Text>

            <View
              style={
                styles.line
              }
            />
          </View>

          <TextInput
            style={
              styles.input
            }
            placeholder="Email"
            placeholderTextColor="#999"
            value={
              email
            }
            onChangeText={
              setEmail
            }
            autoCapitalize="none"
            autoCorrect={
              false
            }
            keyboardType="email-address"
          />

          <TextInput
            style={
              styles.input
            }
            placeholder="Password"
            placeholderTextColor="#999"
            value={
              password
            }
            onChangeText={
              setPassword
            }
            secureTextEntry
          />

          <Pressable
            style={[
              styles.button,

              loading &&
                styles.buttonDisabled,
            ]}
            onPress={
              handleLogin
            }
            disabled={
              loading ||
              microsoftLoading
            }
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

          <Pressable
            onPress={() =>
              router.push(
                "/(auth)/signup"
              )
            }
          >
            <Text
              style={
                styles.signup
              }
            >
              Don't have a student account?{" "}

              <Text
                style={
                  styles.signupLink
                }
              >
                Sign up
              </Text>
            </Text>
          </Pressable>

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
                Businesses have a separate registration and verification process.
              </Text>

              <Pressable
                hitSlop={
                  8
                }
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
      paddingHorizontal:
        24,
      paddingTop: 35,
      paddingBottom: 50,
    },

    logoSection: {
      alignItems:
        "center",
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
      color:
        PRIMARY,
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

    microsoftButton: {
      height: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor:
        "#D4D4D4",
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      flexDirection:
        "row",
      marginBottom: 20,
    },

    microsoftLogo: {
      width: 20,
      height: 20,
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      marginRight: 10,
    },

    msRed: {
      width: 9,
      height: 9,
      backgroundColor:
        "#F25022",
      marginRight: 2,
      marginBottom: 2,
    },

    msGreen: {
      width: 9,
      height: 9,
      backgroundColor:
        "#7FBA00",
    },

    msBlue: {
      width: 9,
      height: 9,
      backgroundColor:
        "#00A4EF",
      marginRight: 2,
    },

    msYellow: {
      width: 9,
      height: 9,
      backgroundColor:
        "#FFB900",
    },

    microsoftText: {
      color: "#111",
      fontSize: 15,
      fontWeight: "600",
    },

    divider: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 20,
    },

    line: {
      flex: 1,
      height: 1,
      backgroundColor:
        "#E5E5E5",
    },

    or: {
      color: "#999",
      fontSize: 12,
      marginHorizontal: 12,
    },

    input: {
      height: 52,
      borderWidth: 1,
      borderColor:
        "#DDD",
      borderRadius: 10,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 16,
      color: "#111",
      backgroundColor:
        "#FFFFFF",
    },

    button: {
      height: 52,
      borderRadius: 10,
      alignItems:
        "center",
      justifyContent:
        "center",
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
      textAlign:
        "center",
      marginTop: 22,
      fontSize: 14,
      color: "#444",
    },

    signupLink: {
      color:
        PRIMARY,
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
      flexDirection:
        "row",
      alignItems:
        "flex-start",
    },

    businessIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
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
      color:
        PRIMARY,
      fontWeight: "800",
      fontSize: 14,
    },
  });