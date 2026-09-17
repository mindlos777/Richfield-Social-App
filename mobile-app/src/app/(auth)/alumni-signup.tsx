import React, {
  useMemo,
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

const STUDENT_DOMAIN =
  "@my.richfield.ac.za";

const STUDENT_NUMBER_REGEX =
  /^40\d{7}$/;

const STUDENT_EMAIL_REGEX =
  /^40\d{7}@my\.richfield\.ac\.za$/;

const PERSON_NAME_REGEX =
  /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;

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

function cleanSingleLine(
  value: string
) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPersonName(
  value: string
) {
  return cleanSingleLine(value)
    .replace(
      /[^\p{L}\p{M}' -]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function cleanEmail(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s/g, "")
    .slice(0, 254);
}

function cleanYear(
  value: string
) {
  return value
    .replace(/[^0-9]/g, "")
    .slice(0, 4);
}

function isValidPersonName(
  value: string
) {
  const clean =
    cleanPersonName(value);

  if (
    clean.length < 2 ||
    clean.length > 100
  ) {
    return false;
  }

  if (
    !PERSON_NAME_REGEX.test(clean)
  ) {
    return false;
  }

  const letters =
    clean.match(/\p{L}/gu) || [];

  return letters.length >= 2;
}

function getStudentNumber(
  email: string
) {
  const clean =
    cleanEmail(email);

  if (
    !STUDENT_EMAIL_REGEX.test(
      clean
    )
  ) {
    return null;
  }

  const studentNumber =
    clean.slice(
      0,
      -STUDENT_DOMAIN.length
    );

  if (
    !STUDENT_NUMBER_REGEX.test(
      studentNumber
    )
  ) {
    return null;
  }

  if (
    studentNumber ===
    "400000000"
  ) {
    return null;
  }

  return studentNumber;
}

function validateAlumniEmail(
  email: string
) {
  const clean =
    cleanEmail(email);

  if (!clean) {
    return "Richfield email is required.";
  }

  if (
    !STUDENT_EMAIL_REGEX.test(
      clean
    )
  ) {
    return "Use a valid Richfield student email, for example 401234567@my.richfield.ac.za.";
  }

  const studentNumber =
    clean.slice(
      0,
      -STUDENT_DOMAIN.length
    );

  if (
    studentNumber ===
    "400000000"
  ) {
    return "Enter your real Richfield student email.";
  }

  return null;
}

function validatePassword(
  value: string
) {
  if (!value) {
    return "Password is required.";
  }

  if (
    value === "00000000"
  ) {
    return "This password is not allowed.";
  }

  if (value.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  if (value.length > 128) {
    return "Password is too long.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Add at least one uppercase letter.";
  }

  if (!/[a-z]/.test(value)) {
    return "Add at least one lowercase letter.";
  }

  if (!/[0-9]/.test(value)) {
    return "Add at least one number.";
  }

  if (
    !/[^A-Za-z0-9]/.test(
      value
    )
  ) {
    return "Add at least one special character.";
  }

  return null;
}

export default function AlumniSignupScreen() {
  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    programme,
    setProgramme,
  ] = useState("");

  const [
    campus,
    setCampus,
  ] = useState("");

  const [
    graduationYear,
    setGraduationYear,
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
    programmeOpen,
    setProgrammeOpen,
  ] = useState(false);

  const [
    campusOpen,
    setCampusOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    attemptedSubmit,
    setAttemptedSubmit,
  ] = useState(false);

  const currentYear =
    new Date().getFullYear();

  const cleanName =
    useMemo(
      () =>
        cleanPersonName(
          fullName
        ),
      [fullName]
    );

  const sanitizedEmail =
    useMemo(
      () => cleanEmail(email),
      [email]
    );

  const nameError =
    useMemo(() => {
      if (!cleanName) {
        return "Full name is required.";
      }

      if (
        !isValidPersonName(
          cleanName
        )
      ) {
        return "Enter a valid name using letters only.";
      }

      return null;
    }, [cleanName]);

  const emailError =
    useMemo(
      () =>
        validateAlumniEmail(
          sanitizedEmail
        ),
      [sanitizedEmail]
    );

  const graduationYearError =
    useMemo(() => {
      if (!graduationYear) {
        return "Graduation year is required.";
      }

      if (
        graduationYear.length !==
        4
      ) {
        return "Enter a 4-digit graduation year.";
      }

      const year =
        Number(
          graduationYear
        );

      if (
        !Number.isInteger(
          year
        ) ||
        year < 1990 ||
        year > currentYear
      ) {
        return `Enter a graduation year between 1990 and ${currentYear}.`;
      }

      return null;
    }, [
      graduationYear,
      currentYear,
    ]);

  const passwordError =
    useMemo(
      () =>
        validatePassword(
          password
        ),
      [password]
    );

  const confirmPasswordError =
    useMemo(() => {
      if (!confirmPassword) {
        return "Please re-enter your password.";
      }

      if (
        password !==
        confirmPassword
      ) {
        return "Passwords do not match.";
      }

      return null;
    }, [
      password,
      confirmPassword,
    ]);

  const formIsValid =
    !nameError &&
    !emailError &&
    Boolean(programme) &&
    Boolean(campus) &&
    !graduationYearError &&
    !passwordError &&
    !confirmPasswordError;

  function showError(
    value: string,
    error: string | null
  ) {
    return Boolean(
      attemptedSubmit ||
        value.length > 0
    ) && Boolean(error);
  }

  async function handleSignup() {
    setAttemptedSubmit(true);

    const finalName =
      cleanPersonName(
        fullName
      );

    const finalEmail =
      cleanEmail(email);

    const studentNumber =
      getStudentNumber(
        finalEmail
      );

    if (
      !isValidPersonName(
        finalName
      )
    ) {
      Alert.alert(
        "Invalid name",
        "Enter your real full name using letters only."
      );

      return;
    }

    const finalEmailError =
      validateAlumniEmail(
        finalEmail
      );

    if (finalEmailError) {
      Alert.alert(
        "Invalid email",
        finalEmailError
      );

      return;
    }

    if (!studentNumber) {
      Alert.alert(
        "Invalid student number",
        "Your Richfield email must contain a valid 9-digit student number starting with 40."
      );

      return;
    }

    if (!programme) {
      Alert.alert(
        "Programme required",
        "Select the programme you completed at Richfield."
      );

      return;
    }

    if (!campus) {
      Alert.alert(
        "Campus required",
        "Select your Richfield campus."
      );

      return;
    }

    if (
      graduationYearError
    ) {
      Alert.alert(
        "Invalid graduation year",
        graduationYearError
      );

      return;
    }

    const finalPasswordError =
      validatePassword(
        password
      );

    if (
      finalPasswordError
    ) {
      Alert.alert(
        "Weak password",
        finalPasswordError
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      Alert.alert(
        "Passwords do not match",
        "Re-enter the same password."
      );

      return;
    }

    if (loading) {
      return;
    }

    try {
      setLoading(true);

      /*
        Sanitise again immediately
        before sending data to Supabase.

        Client-side validation improves
        UX. The database must still
        enforce important security rules.
      */

      const {
        data,
        error,
      } =
        await supabase.auth.signUp(
          {
            email: finalEmail,
            password,

            options: {
              data: {
                full_name:
                  finalName,

                signup_role:
                  "alumni",

                student_number:
                  studentNumber,

                programme:
                  cleanSingleLine(
                    programme
                  ),

                campus:
                  cleanSingleLine(
                    campus
                  ),

                graduation_year:
                  Number(
                    graduationYear
                  ),
              },
            },
          }
        );

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
        "Your Alumni account has been created. Your Alumni status must be verified before full Alumni access is activated.",
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
    } catch (
      error: any
    ) {
      console.log(
        "Alumni signup:",
        error
      );

      let message =
        error?.message ||
        "Something went wrong.";

      const lower =
        message.toLowerCase();

      if (
        lower.includes(
          "already registered"
        ) ||
        lower.includes(
          "already been registered"
        ) ||
        lower.includes(
          "user already"
        )
      ) {
        message =
          "An account already exists for this Richfield email.";
      }

      Alert.alert(
        "Signup failed",
        message
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
      showsVerticalScrollIndicator={
        false
      }
    >
      <Pressable
        style={styles.backTop}
        onPress={() =>
          router.back()
        }
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

      <Text
        style={styles.subtitle}
      >
        Rejoin the Richfield community
        and continue building your
        professional network.
      </Text>

      <Text style={styles.label}>
        Full name *
      </Text>

      <TextInput
        value={fullName}
        onChangeText={text =>
          setFullName(
            cleanPersonName(
              text
            )
          )
        }
        onBlur={() =>
          setFullName(
            cleanPersonName(
              fullName
            )
          )
        }
        placeholder="Enter your full name"
        placeholderTextColor="#999"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={100}
        style={[
          styles.input,

          showError(
            fullName,
            nameError
          )
            ? styles.errorInput
            : null,
        ]}
      />

      {showError(
        fullName,
        nameError
      ) ? (
        <ValidationError
          text={nameError!}
        />
      ) : null}

      <Text style={styles.label}>
        Richfield email *
      </Text>

      <TextInput
        value={email}
        onChangeText={text =>
          setEmail(
            cleanEmail(text)
          )
        }
        onBlur={() =>
          setEmail(
            cleanEmail(email)
          )
        }
        placeholder="401234567@my.richfield.ac.za"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={254}
        style={[
          styles.input,

          showError(
            email,
            emailError
          )
            ? styles.errorInput
            : null,
        ]}
      />

      {showError(
        email,
        emailError
      ) ? (
        <ValidationError
          text={emailError!}
        />
      ) : (
        <Text
          style={styles.helper}
        >
          Use the Richfield email linked
          to your student record. The
          student number must contain 9
          digits and start with 40.
        </Text>
      )}

      <Text style={styles.label}>
        Programme *
      </Text>

      <Pressable
        style={[
          styles.select,

          attemptedSubmit &&
          !programme
            ? styles.errorInput
            : null,
        ]}
        onPress={() => {
          setProgrammeOpen(
            current =>
              !current
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
          name={
            programmeOpen
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color={PRIMARY}
        />
      </Pressable>

      {programmeOpen ? (
        <View
          style={
            styles.dropdown
          }
        >
          {programmes.map(
            item => (
              <Pressable
                key={item}
                style={
                  styles.dropdownItem
                }
                onPress={() => {
                  setProgramme(
                    item
                  );

                  setProgrammeOpen(
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

                {programme ===
                item ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={
                      PRIMARY
                    }
                  />
                ) : null}
              </Pressable>
            )
          )}
        </View>
      ) : null}

      {attemptedSubmit &&
      !programme ? (
        <ValidationError
          text="Select your Richfield programme."
        />
      ) : null}

      <Text style={styles.label}>
        Campus *
      </Text>

      <Pressable
        style={[
          styles.select,

          attemptedSubmit &&
          !campus
            ? styles.errorInput
            : null,
        ]}
        onPress={() => {
          setCampusOpen(
            current =>
              !current
          );

          setProgrammeOpen(
            false
          );
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
          name={
            campusOpen
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color={PRIMARY}
        />
      </Pressable>

      {campusOpen ? (
        <View
          style={
            styles.dropdown
          }
        >
          {campuses.map(
            item => (
              <Pressable
                key={item}
                style={
                  styles.dropdownItem
                }
                onPress={() => {
                  setCampus(item);

                  setCampusOpen(
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

                {campus ===
                item ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={
                      PRIMARY
                    }
                  />
                ) : null}
              </Pressable>
            )
          )}
        </View>
      ) : null}

      {attemptedSubmit &&
      !campus ? (
        <ValidationError
          text="Select your Richfield campus."
        />
      ) : null}

      <Text style={styles.label}>
        Graduation year *
      </Text>

      <TextInput
        value={graduationYear}
        onChangeText={text =>
          setGraduationYear(
            cleanYear(text)
          )
        }
        placeholder={`${currentYear}`}
        placeholderTextColor="#999"
        keyboardType="number-pad"
        maxLength={4}
        style={[
          styles.input,

          showError(
            graduationYear,
            graduationYearError
          )
            ? styles.errorInput
            : null,
        ]}
      />

      {showError(
        graduationYear,
        graduationYearError
      ) ? (
        <ValidationError
          text={
            graduationYearError!
          }
        />
      ) : null}

      <Text style={styles.label}>
        Password *
      </Text>

      <TextInput
        value={password}
        onChangeText={
          setPassword
        }
        placeholder="Create a strong password"
        placeholderTextColor="#999"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={128}
        style={[
          styles.input,

          showError(
            password,
            passwordError
          )
            ? styles.errorInput
            : null,
        ]}
      />

      {showError(
        password,
        passwordError
      ) ? (
        <ValidationError
          text={passwordError!}
        />
      ) : (
        <Text
          style={
            styles.passwordHint
          }
        >
          At least 8 characters with
          uppercase, lowercase, a number
          and a special character.
        </Text>
      )}

      <PasswordRules
        password={password}
      />

      <Text style={styles.label}>
        Re-enter password *
      </Text>

      <TextInput
        value={
          confirmPassword
        }
        onChangeText={
          setConfirmPassword
        }
        placeholder="Re-enter password"
        placeholderTextColor="#999"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={128}
        style={[
          styles.input,

          showError(
            confirmPassword,
            confirmPasswordError
          )
            ? styles.errorInput
            : null,
        ]}
      />

      {showError(
        confirmPassword,
        confirmPasswordError
      ) ? (
        <ValidationError
          text={
            confirmPasswordError!
          }
        />
      ) : null}

      <View style={styles.notice}>
        <Ionicons
          name="shield-checkmark-outline"
          size={22}
          color={PRIMARY}
        />

        <Text
          style={
            styles.noticeText
          }
        >
          Alumni accounts require
          verification before Alumni
          access is activated. Your
          Richfield details must match
          your Alumni verification
          document.
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
        onPress={
          handleSignup
        }
      >
        {loading ? (
          <Text
            style={
              styles.buttonText
            }
          >
            Submitting...
          </Text>
        ) : (
          <>
            <Ionicons
              name="person-add-outline"
              size={19}
              color="#fff"
            />

            <Text
              style={
                styles.buttonText
              }
            >
              Create alumni account
            </Text>
          </>
        )}
      </Pressable>

      <View
        style={
          styles.securityFooter
        }
      >
        <Ionicons
          name="lock-closed-outline"
          size={13}
          color="#888"
        />

        <Text
          style={
            styles.securityFooterText
          }
        >
          Your account information is
          protected and used for
          Richfield community access.
        </Text>
      </View>
    </ScrollView>
  );
}

function ValidationError({
  text,
}: {
  text: string;
}) {
  return (
    <View
      style={
        styles.errorRow
      }
    >
      <Ionicons
        name="alert-circle-outline"
        size={14}
        color="#C62828"
      />

      <Text
        style={styles.error}
      >
        {text}
      </Text>
    </View>
  );
}

function PasswordRules({
  password,
}: {
  password: string;
}) {
  if (!password) {
    return null;
  }

  return (
    <View
      style={
        styles.passwordRules
      }
    >
      <PasswordRule
        valid={
          password.length >= 8
        }
        text="8+ characters"
      />

      <PasswordRule
        valid={
          /[A-Z]/.test(
            password
          )
        }
        text="Uppercase"
      />

      <PasswordRule
        valid={
          /[a-z]/.test(
            password
          )
        }
        text="Lowercase"
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
    <View
      style={
        styles.passwordRule
      }
    >
      <Ionicons
        name={
          valid
            ? "checkmark-circle"
            : "ellipse-outline"
        }
        size={14}
        color={
          valid
            ? "#18864B"
            : "#AAA"
        }
      />

      <Text
        style={[
          styles.passwordRuleText,

          valid &&
            styles.passwordRuleValid,
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
      backgroundColor:
        "#FFFFFF",
    },

    container: {
      padding: 24,
      paddingTop: 45,
      paddingBottom: 55,
    },

    backTop: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#F5F5F7",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 22,
    },

    icon: {
      width: 55,
      height: 55,
      borderRadius: 16,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
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
      backgroundColor: "#fff",
    },

    errorInput: {
      borderColor: "#C62828",
      backgroundColor:
        "#FFF9F9",
    },

    helper: {
      color: "#888",
      fontSize: 12,
      lineHeight: 17,
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
      backgroundColor: "#fff",
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
      backgroundColor: "#fff",
    },

    dropdownItem: {
      minHeight: 49,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEE",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    dropdownText: {
      fontSize: 14,
      color: "#222",
    },

    passwordHint: {
      color: "#888",
      fontSize: 12,
      lineHeight: 17,
      marginTop: -10,
      marginBottom: 10,
    },

    passwordRules: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: -5,
      marginBottom: 18,
    },

    passwordRule: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor:
        "#F5F5F7",
    },

    passwordRuleText: {
      fontSize: 9,
      color: "#888",
    },

    passwordRuleValid: {
      color: "#18864B",
      fontWeight: "700",
    },

    errorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 5,
      marginTop: -10,
      marginBottom: 17,
    },

    error: {
      flex: 1,
      color: "#C62828",
      fontSize: 11,
      lineHeight: 16,
    },

    notice: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      backgroundColor:
        "#F4F4FF",
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
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
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

    securityFooter: {
      marginTop: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 6,
      paddingHorizontal: 12,
    },

    securityFooterText: {
      flexShrink: 1,
      textAlign: "center",
      fontSize: 10,
      lineHeight: 15,
      color: "#888",
    },
  });