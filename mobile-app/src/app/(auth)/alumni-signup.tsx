import React, {
  useState,
} from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  supabase,
} from "../../lib/supabase";

const PRIMARY = "#0300cf";

const programmes = [
  "BSc IT",
  "DIT",
  "BCom",
  "BBA",
  "BPM",
  "MBA",
];

const campuses = [
  "Braamfontein",
  "Cape Town",
  "Centurion",
  "Durban",
  "Mbombela",
  "Polokwane",
  "Pretoria",
  "Randburg",
  "Roodepoort",
  "Sandton",
];

function isAlumniEmail(
  email: string
) {
  const cleanEmail = email
    .trim()
    .toLowerCase();

  return cleanEmail.endsWith(
    "@my.richfield.ac.za"
  );
}

function getStudentNumber(
  email: string
) {
  const cleanEmail = email
    .trim()
    .toLowerCase();

  const domain =
    "@my.richfield.ac.za";

  if (
    !cleanEmail.endsWith(domain)
  ) {
    return null;
  }

  const value = cleanEmail.slice(
    0,
    -domain.length
  );

  return /^\d+$/.test(value)
    ? value
    : null;
}

export default function AlumniSignupScreen() {
  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [programme, setProgramme] =
    useState("");

  const [campus, setCampus] =
    useState("");

  const [
    graduationYear,
    setGraduationYear,
  ] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    programmeOpen,
    setProgrammeOpen,
  ] = useState(false);

  const [
    campusOpen,
    setCampusOpen,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const passwordIsStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const passwordsMatch =
    password.length > 0 &&
    password === confirmPassword;

  const year =
    Number(graduationYear);

  const currentYear =
    new Date().getFullYear();

  const graduationYearValid =
    Number.isInteger(year) &&
    year >= 1990 &&
    year <= currentYear;

  const formIsValid =
    fullName.trim().length > 0 &&
    isAlumniEmail(email) &&
    programme.length > 0 &&
    campus.length > 0 &&
    graduationYearValid &&
    passwordIsStrong &&
    passwordsMatch;

  async function handleSignup() {
    if (!formIsValid) {
      Alert.alert(
        "Check your details",
        "Please complete all required fields correctly."
      );

      return;
    }

    try {
      setLoading(true);

      const cleanEmail = email
        .trim()
        .toLowerCase();

      const studentNumber =
        getStudentNumber(cleanEmail);

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,

          options: {
            data: {
              full_name:
                fullName.trim(),

              signup_role:
                "alumni",

              student_number:
                studentNumber,

              programme,

              campus,

              graduation_year:
                Number(
                  graduationYear
                ),
            },
          },
        });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "Account could not be created."
        );
      }

      Alert.alert(
        "Registration submitted",
        "Your Alumni account has been created and will be verified before Alumni access is activated.",
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
    } catch (error: any) {
      Alert.alert(
        "Signup failed",
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.container
      }
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        style={styles.backTop}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={23}
          color="#111"
        />
      </Pressable>

      <View style={styles.icon}>
        <Ionicons
          name="ribbon"
          size={28}
          color="#FFFFFF"
        />
      </View>

      <Text style={styles.title}>
        Alumni signup
      </Text>

      <Text style={styles.subtitle}>
        Rejoin the Richfield community
        and continue building your
        professional network.
      </Text>

      <Text style={styles.label}>
        Full name *
      </Text>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Enter your full name"
        style={styles.input}
      />

      <Text style={styles.label}>
        Richfield email *
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="123456789@my.richfield.ac.za"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <Text style={styles.helper}>
        Use the Richfield email linked
        to your student record.
      </Text>

      <Text style={styles.label}>
        Programme *
      </Text>

      <Pressable
        style={styles.select}
        onPress={() => {
          setProgrammeOpen(
            !programmeOpen
          );
          setCampusOpen(false);
        }}
      >
        <Text
          style={
            programme
              ? styles.selectText
              : styles.placeholder
          }
        >
          {programme ||
            "Select programme"}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={PRIMARY}
        />
      </Pressable>

      {programmeOpen && (
        <View style={styles.dropdown}>
          {programmes.map(item => (
            <Pressable
              key={item}
              style={
                styles.dropdownItem
              }
              onPress={() => {
                setProgramme(item);
                setProgrammeOpen(false);
              }}
            >
              <Text>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>
        Campus *
      </Text>

      <Pressable
        style={styles.select}
        onPress={() => {
          setCampusOpen(!campusOpen);
          setProgrammeOpen(false);
        }}
      >
        <Text
          style={
            campus
              ? styles.selectText
              : styles.placeholder
          }
        >
          {campus ||
            "Select campus"}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={PRIMARY}
        />
      </Pressable>

      {campusOpen && (
        <View style={styles.dropdown}>
          {campuses.map(item => (
            <Pressable
              key={item}
              style={
                styles.dropdownItem
              }
              onPress={() => {
                setCampus(item);
                setCampusOpen(false);
              }}
            >
              <Text>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>
        Graduation year *
      </Text>

      <TextInput
        value={graduationYear}
        onChangeText={text =>
          setGraduationYear(
            text
              .replace(
                /[^0-9]/g,
                ""
              )
              .slice(0, 4)
          )
        }
        placeholder="2025"
        keyboardType="numeric"
        maxLength={4}
        style={styles.input}
      />

      {graduationYear.length ===
        4 &&
      !graduationYearValid ? (
        <Text style={styles.error}>
          Enter a valid graduation
          year.
        </Text>
      ) : null}

      <Text style={styles.label}>
        Password *
      </Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Create a strong password"
        secureTextEntry
        style={styles.input}
      />

      <Text style={styles.passwordHint}>
        At least 8 characters with
        uppercase, lowercase, number and
        special character.
      </Text>

      <Text style={styles.label}>
        Re-enter password *
      </Text>

      <TextInput
        value={confirmPassword}
        onChangeText={
          setConfirmPassword
        }
        placeholder="Re-enter password"
        secureTextEntry
        style={[
          styles.input,

          confirmPassword &&
          !passwordsMatch
            ? styles.errorInput
            : null,
        ]}
      />

      {confirmPassword &&
      !passwordsMatch ? (
        <Text style={styles.error}>
          Passwords do not match.
        </Text>
      ) : null}

      <View style={styles.notice}>
        <Ionicons
          name="shield-checkmark-outline"
          size={22}
          color={PRIMARY}
        />

        <Text style={styles.noticeText}>
          Alumni accounts may require
          verification before access is
          activated.
        </Text>
      </View>

      <Pressable
        style={[
          styles.button,

          (!formIsValid ||
            loading) &&
            styles.disabled,
        ]}
        disabled={
          !formIsValid ||
          loading
        }
        onPress={handleSignup}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Submitting..."
            : "Create alumni account"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    padding: 24,
    paddingTop: 45,
    paddingBottom: 50,
  },

  backTop: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  icon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: PRIMARY,
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
    color: "#666",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    marginBottom: 28,
  },

  label: {
    color: "#222",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111",
    marginBottom: 17,
  },

  errorInput: {
    borderColor: "#D00000",
  },

  helper: {
    color: "#888",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 18,
  },

  select: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 17,
  },

  selectText: {
    color: "#111",
    fontSize: 15,
  },

  placeholder: {
    color: "#999",
    fontSize: 15,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: -10,
    marginBottom: 17,
  },

  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  passwordHint: {
    color: "#888",
    fontSize: 12,
    lineHeight: 17,
    marginTop: -10,
    marginBottom: 18,
  },

  error: {
    color: "#D00000",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 17,
  },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4FF",
    borderRadius: 11,
    padding: 13,
    marginTop: 3,
  },

  noticeText: {
    flex: 1,
    color: "#555",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },

  button: {
    height: 54,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  disabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});