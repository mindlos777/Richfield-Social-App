import { useState } from "react";

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

import {
  cleanEmail,
  cleanPersonName,
  isValidPersonName,
  validatePassword,
} from "../../utils/validation";

const PRIMARY = "#0300cf";

const STUDENT_DOMAIN =
  "@my.richfield.ac.za";

/*
 * Richfield student number format:
 *
 * - Exactly 9 digits
 * - Must start with 40
 *
 * Example:
 * 401234567
 */
const STUDENT_NUMBER_REGEX =
  /^40\d{7}$/;

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

/* =========================================================
   STUDENT NUMBER
========================================================= */

function getStudentNumber(
  email: string
) {
  const normalizedEmail =
    cleanEmail(email);

  if (
    !normalizedEmail.endsWith(
      STUDENT_DOMAIN
    )
  ) {
    return null;
  }

  const studentNumber =
    normalizedEmail.slice(
      0,
      -STUDENT_DOMAIN.length
    );

  /*
   * Student number MUST:
   *
   * 1. Be exactly 9 digits
   * 2. Start with 40
   *
   * Example:
   * 401234567
   */
  if (
    !STUDENT_NUMBER_REGEX.test(
      studentNumber
    )
  ) {
    return null;
  }

  /*
   * Extra fake-number protection.
   *
   * Although a valid number starts
   * with 40, we also reject a number
   * where everything after 40 is zero.
   *
   * Example:
   * 400000000
   */
  if (
    /^40{1}0{7}$/.test(
      studentNumber
    )
  ) {
    return null;
  }

  return studentNumber;
}

/* =========================================================
   STUDENT EMAIL VALIDATION
========================================================= */

function validateRichfieldStudentEmail(
  value: string
) {
  const email =
    cleanEmail(value);

  if (!email) {
    return {
      valid: false,
      message:
        "Please enter your Richfield student email.",
    };
  }

  /*
   * Exact required format:
   *
   * 40XXXXXXX@my.richfield.ac.za
   */
  const studentEmailRegex =
    /^40\d{7}@my\.richfield\.ac\.za$/;

  if (
    !studentEmailRegex.test(
      email
    )
  ) {
    return {
      valid: false,
      message:
        "Use your Richfield student email. The student number must start with 40 and contain exactly 9 digits before @my.richfield.ac.za.",
    };
  }

  const studentNumber =
    getStudentNumber(email);

  if (!studentNumber) {
    return {
      valid: false,
      message:
        "Please enter a valid Richfield student email.",
    };
  }

  return {
    valid: true,
    message: "",
    studentNumber,
  };
}

/* =========================================================
   PASSWORD STRENGTH
========================================================= */

function getPasswordStrength(
  password: string
) {
  if (!password) {
    return {
      label: "",
      score: 0,
    };
  }

  let score = 0;

  if (password.length >= 8) {
    score++;
  }

  if (/[A-Z]/.test(password)) {
    score++;
  }

  if (/[a-z]/.test(password)) {
    score++;
  }

  if (/[0-9]/.test(password)) {
    score++;
  }

  if (
    /[^A-Za-z0-9]/.test(
      password
    )
  ) {
    score++;
  }

  if (score <= 2) {
    return {
      label: "Weak",
      score,
    };
  }

  if (score <= 4) {
    return {
      label: "Medium",
      score,
    };
  }

  return {
    label: "Strong",
    score,
  };
}

/* =========================================================
   SCREEN
========================================================= */

export default function StudentSignupScreen() {
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
    yearOfStudy,
    setYearOfStudy,
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

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const cleanedName =
    cleanPersonName(
      fullName
    );

  const cleanedEmail =
    cleanEmail(email);

  const nameIsValid =
    isValidPersonName(
      cleanedName
    );

  const emailValidation =
    validateRichfieldStudentEmail(
      cleanedEmail
    );

  const emailIsValid =
    emailValidation.valid;

  const studentNumber =
    emailIsValid
      ? getStudentNumber(
          cleanedEmail
        )
      : null;

  const passwordValidation =
    validatePassword(
      password
    );

  const passwordStrength =
    getPasswordStrength(
      password
    );

  /*
   * Strong password rules:
   *
   * - At least 8 characters
   * - Uppercase
   * - Lowercase
   * - Number
   * - Special character
   * - Must also pass shared validation
   */
  const passwordMeetsRules =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(
      password
    ) &&
    passwordValidation.valid;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password ===
      confirmPassword;

  const formIsValid =
    nameIsValid &&
    emailIsValid &&
    programme.length > 0 &&
    campus.length > 0 &&
    yearOfStudy.length > 0 &&
    passwordMeetsRules &&
    passwordsMatch;

  /* =======================================================
     INPUT HANDLERS
  ======================================================= */

  function handleNameChange(
    value: string
  ) {
    setFullName(
      cleanPersonName(
        value
      )
    );
  }

  function handleEmailChange(
    value: string
  ) {
    setEmail(
      cleanEmail(value)
    );
  }

  /* =======================================================
     SIGNUP
  ======================================================= */

  async function handleSignup() {
    const finalName =
      cleanPersonName(
        fullName
      );

    const finalEmail =
      cleanEmail(email);

    /* -----------------------------------------------------
       FULL NAME
    ----------------------------------------------------- */

    if (!finalName) {
      Alert.alert(
        "Required field",
        "Please enter your full name."
      );

      return;
    }

    if (
      !isValidPersonName(
        finalName
      )
    ) {
      Alert.alert(
        "Invalid name",
        "Please enter your real full name. Numbers are not allowed."
      );

      return;
    }

    /* -----------------------------------------------------
       STUDENT EMAIL
    ----------------------------------------------------- */

    const finalEmailCheck =
      validateRichfieldStudentEmail(
        finalEmail
      );

    if (
      !finalEmailCheck.valid
    ) {
      Alert.alert(
        "Invalid student email",
        finalEmailCheck.message
      );

      return;
    }

    const derivedStudentNumber =
      getStudentNumber(
        finalEmail
      );

    if (
      !derivedStudentNumber
    ) {
      Alert.alert(
        "Invalid student number",
        "Your student number must start with 40 and contain exactly 9 digits."
      );

      return;
    }

    /* -----------------------------------------------------
       PROGRAMME
    ----------------------------------------------------- */

    if (!programme) {
      Alert.alert(
        "Required field",
        "Please select your programme."
      );

      return;
    }

    /* -----------------------------------------------------
       CAMPUS
    ----------------------------------------------------- */

    if (!campus) {
      Alert.alert(
        "Required field",
        "Please select your campus."
      );

      return;
    }

    /* -----------------------------------------------------
       YEAR OF STUDY
    ----------------------------------------------------- */

    if (!yearOfStudy) {
      Alert.alert(
        "Required field",
        "Please select your year of study."
      );

      return;
    }

    /* -----------------------------------------------------
       PASSWORD
    ----------------------------------------------------- */

    const finalPasswordCheck =
      validatePassword(
        password
      );

    if (
      !finalPasswordCheck.valid
    ) {
      Alert.alert(
        "Weak password",
        finalPasswordCheck.message
      );

      return;
    }

    if (
      !passwordMeetsRules
    ) {
      Alert.alert(
        "Weak password",
        "Your password must be at least 8 characters and contain uppercase, lowercase, a number and a special character."
      );

      return;
    }

    if (!passwordsMatch) {
      Alert.alert(
        "Passwords do not match",
        "Please make sure both passwords are the same."
      );

      return;
    }

    /* -----------------------------------------------------
       CREATE ACCOUNT
    ----------------------------------------------------- */

    try {
      setLoading(true);

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email:
            finalEmail,

          password,

          options: {
            data: {
              full_name:
                finalName,

              signup_role:
                "student",

              student_number:
                derivedStudentNumber,

              programme,

              campus,

              year_of_study:
                Number(
                  yearOfStudy
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
        "Account created",
        "Your student account has been created. Please check your Richfield email to verify your account.",
        [
          {
            text:
              "Continue",

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
        "Student signup error:",
        error
      );

      Alert.alert(
        "Signup failed",
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.container
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={
        false
      }
    >
      {/* BACK */}

      <Pressable
        style={
          styles.backTop
        }
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

      {/* HEADER */}

      <Text
        style={
          styles.title
        }
      >
        Student signup
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Create your Richfield student
        account and start building your
        professional network.
      </Text>

      {/* FULL NAME */}

      <Text
        style={
          styles.label
        }
      >
        Full name{" "}
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      </Text>

      <TextInput
        value={
          fullName
        }
        onChangeText={
          handleNameChange
        }
        placeholder="Enter your full name"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={100}
        style={[
          styles.input,

          fullName.length >
            0 &&
          !nameIsValid
            ? styles.errorInput
            : null,
        ]}
      />

      {fullName.length >
        0 &&
      !nameIsValid ? (
        <Text
          style={
            styles.errorText
          }
        >
          Please enter a valid full
          name. Numbers are not
          allowed.
        </Text>
      ) : null}

      {/* STUDENT EMAIL */}

      <Text
        style={
          styles.label
        }
      >
        Richfield student email{" "}
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      </Text>

      <TextInput
        value={
          email
        }
        onChangeText={
          handleEmailChange
        }
        placeholder="401234567@my.richfield.ac.za"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={254}
        style={[
          styles.input,

          email.length > 0 &&
          !emailIsValid
            ? styles.errorInput
            : null,
        ]}
      />

      {email.length > 0 &&
      !emailIsValid ? (
        <Text
          style={
            styles.errorText
          }
        >
          {
            emailValidation.message
          }
        </Text>
      ) : null}

      {/* DETECTED STUDENT NUMBER */}

      {studentNumber ? (
        <View
          style={
            styles.detectedBox
          }
        >
          <Ionicons
            name="checkmark-circle"
            size={19}
            color="#008A42"
          />

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.detectedLabel
              }
            >
              Student number detected
            </Text>

            <Text
              style={
                styles.detectedValue
              }
            >
              {studentNumber}
            </Text>
          </View>
        </View>
      ) : null}

      {/* PROGRAMME */}

      <Text
        style={
          styles.label
        }
      >
        Programme{" "}
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      </Text>

      <Pressable
        style={
          styles.select
        }
        onPress={() => {
          setProgrammeOpen(
            !programmeOpen
          );

          setCampusOpen(
            false
          );
        }}
      >
        <Text
          style={
            programme
              ? styles.selectText
              : styles.placeholderText
          }
        >
          {programme ||
            "Select your programme"}
        </Text>

        <Ionicons
          name={
            programmeOpen
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color={
            PRIMARY
          }
        />
      </Pressable>

      {programmeOpen && (
        <View
          style={
            styles.dropdown
          }
        >
          {programmes.map(
            item => (
              <Pressable
                key={
                  item
                }
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
              </Pressable>
            )
          )}
        </View>
      )}

      {/* CAMPUS */}

      <Text
        style={
          styles.label
        }
      >
        Campus{" "}
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      </Text>

      <Pressable
        style={
          styles.select
        }
        onPress={() => {
          setCampusOpen(
            !campusOpen
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
              : styles.placeholderText
          }
        >
          {campus ||
            "Select your campus"}
        </Text>

        <Ionicons
          name={
            campusOpen
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color={
            PRIMARY
          }
        />
      </Pressable>

      {campusOpen && (
        <View
          style={
            styles.dropdown
          }
        >
          <ScrollView
            style={
              styles.campusList
            }
            nestedScrollEnabled
          >
            {campuses.map(
              item => (
                <Pressable
                  key={
                    item
                  }
                  style={
                    styles.dropdownItem
                  }
                  onPress={() => {
                    setCampus(
                      item
                    );

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
                </Pressable>
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* YEAR OF STUDY */}

      <Text
        style={
          styles.label
        }
      >
        Year of study{" "}
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      </Text>

      <View
        style={
          styles.radioContainer
        }
      >
        {[
          "1",
          "2",
          "3",
        ].map(
          year => (
            <Pressable
              key={
                year
              }
              style={
                styles.radioOption
              }
              onPress={() =>
                setYearOfStudy(
                  year
                )
              }
            >
              <View
                style={[
                  styles.radio,

                  yearOfStudy ===
                    year &&
                    styles.radioSelected,
                ]}
              >
                {yearOfStudy ===
                  year && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>

              <Text
                style={
                  styles.radioText
                }
              >
                {year === "1"
                  ? "1st Year"
                  : year === "2"
                    ? "2nd Year"
                    : "3rd Year"}
              </Text>
            </Pressable>
          )
        )}
      </View>

      {/* PASSWORD */}

      <Text
        style={
          styles.label
        }
      >
        Password{" "}
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      </Text>

      <TextInput
        value={
          password
        }
        onChangeText={
          setPassword
        }
        placeholder="Create a strong password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={128}
        style={[
          styles.input,

          password.length >
            0 &&
          !passwordMeetsRules
            ? styles.errorInput
            : null,
        ]}
      />

      {password.length >
        0 && (
        <View
          style={
            styles.passwordSection
          }
        >
          <View
            style={
              styles.strengthRow
            }
          >
            <Text
              style={
                styles.strengthLabel
              }
            >
              Password strength
            </Text>

            <Text
              style={[
                styles.strengthValue,

                passwordStrength.label ===
                "Weak"
                  ? styles.weak
                  : passwordStrength.label ===
                      "Medium"
                    ? styles.medium
                    : styles.strong,
              ]}
            >
              {
                passwordStrength.label
              }
            </Text>
          </View>

          <View
            style={
              styles.strengthBar
            }
          >
            <View
              style={[
                styles.strengthProgress,

                {
                  width:
                    passwordStrength.label ===
                    "Weak"
                      ? "33%"
                      : passwordStrength.label ===
                          "Medium"
                        ? "66%"
                        : "100%",
                },
              ]}
            />
          </View>

          <Text
            style={
              styles.passwordRule
            }
          >
            {password.length >=
            8
              ? "✓"
              : "○"}{" "}
            At least 8 characters
          </Text>

          <Text
            style={
              styles.passwordRule
            }
          >
            {/[A-Z]/.test(
              password
            )
              ? "✓"
              : "○"}{" "}
            Uppercase letter
          </Text>

          <Text
            style={
              styles.passwordRule
            }
          >
            {/[a-z]/.test(
              password
            )
              ? "✓"
              : "○"}{" "}
            Lowercase letter
          </Text>

          <Text
            style={
              styles.passwordRule
            }
          >
            {/[0-9]/.test(
              password
            )
              ? "✓"
              : "○"}{" "}
            Number
          </Text>

          <Text
            style={
              styles.passwordRule
            }
          >
            {/[^A-Za-z0-9]/.test(
              password
            )
              ? "✓"
              : "○"}{" "}
            Special character
          </Text>

          {!passwordValidation.valid &&
          password.length >
            0 ? (
            <Text
              style={
                styles.passwordError
              }
            >
              {
                passwordValidation.message
              }
            </Text>
          ) : null}
        </View>
      )}

      {/* CONFIRM PASSWORD */}

      <Text
        style={
          styles.label
        }
      >
        Re-enter password{" "}
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      </Text>

      <TextInput
        value={
          confirmPassword
        }
        onChangeText={
          setConfirmPassword
        }
        placeholder="Re-enter your password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={128}
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
              ? styles.matchText
              : styles.errorText
          }
        >
          {passwordsMatch
            ? "✓ Passwords match"
            : "Passwords do not match"}
        </Text>
      )}

      {/* CREATE ACCOUNT */}

      <Pressable
        style={[
          styles.button,

          (!formIsValid ||
            loading) &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleSignup
        }
        disabled={
          !formIsValid ||
          loading
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          {loading
            ? "Creating account..."
            : "Create student account"}
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.backButton
        }
        onPress={() =>
          router.back()
        }
      >
        <Text
          style={
            styles.backText
          }
        >
          Back
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#fff",
    },

    container: {
      padding: 24,
      paddingTop: 45,
      paddingBottom: 40,
    },

    backTop: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#F5F5F7",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 22,
    },

    title: {
      fontSize: 30,
      fontWeight: "800",
      color: "#111",
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: "#666",
      marginBottom: 28,
    },

    label: {
      fontSize: 14,
      fontWeight: "600",
      color: "#222",
      marginBottom: 8,
    },

    required: {
      color: "#e00000",
    },

    input: {
      height: 52,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 15,
      marginBottom: 16,
      backgroundColor:
        "#fff",
      color: "#111",
    },

    errorInput: {
      borderColor:
        "#e00000",
    },

    errorText: {
      color: "#e00000",
      fontSize: 12,
      marginTop: -9,
      marginBottom: 14,
    },

    passwordError: {
      color: "#e00000",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },

    detectedBox: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      backgroundColor:
        "#F0FAF4",
      borderWidth: 1,
      borderColor:
        "#CDEAD8",
      borderRadius: 10,
      padding: 12,
      marginTop: -7,
      marginBottom: 18,
    },

    detectedLabel: {
      color: "#568064",
      fontSize: 11,
      fontWeight: "600",
    },

    detectedValue: {
      color: "#166534",
      fontSize: 14,
      fontWeight: "800",
      marginTop: 1,
    },

    select: {
      height: 52,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 10,
      paddingHorizontal: 16,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 16,
    },

    selectText: {
      color: "#111",
      fontSize: 15,
    },

    placeholderText: {
      color: "#999",
      fontSize: 15,
    },

    dropdown: {
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 10,
      marginTop: -9,
      marginBottom: 18,
      overflow: "hidden",
      backgroundColor:
        "#fff",
    },

    campusList: {
      maxHeight: 220,
    },

    dropdownItem: {
      paddingVertical: 15,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        "#eee",
    },

    dropdownText: {
      fontSize: 15,
      color: "#222",
    },

    radioContainer: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      marginBottom: 24,
    },

    radioOption: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    radio: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: "#bbb",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 7,
    },

    radioSelected: {
      borderColor:
        PRIMARY,
    },

    radioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor:
        PRIMARY,
    },

    radioText: {
      fontSize: 14,
      color: "#333",
    },

    passwordSection: {
      marginTop: -7,
      marginBottom: 20,
    },

    strengthRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      marginBottom: 7,
    },

    strengthLabel: {
      fontSize: 13,
      color: "#666",
    },

    strengthValue: {
      fontSize: 13,
      fontWeight: "700",
    },

    weak: {
      color: "#e00000",
    },

    medium: {
      color: "#d58a00",
    },

    strong: {
      color: "#008a42",
    },

    strengthBar: {
      height: 5,
      borderRadius: 3,
      backgroundColor:
        "#eee",
      overflow: "hidden",
      marginBottom: 12,
    },

    strengthProgress: {
      height: "100%",
      backgroundColor:
        PRIMARY,
    },

    passwordRule: {
      fontSize: 12,
      color: "#666",
      marginBottom: 4,
    },

    matchText: {
      color: "#008a42",
      fontSize: 12,
      marginTop: -9,
      marginBottom: 14,
    },

    button: {
      height: 54,
      borderRadius: 11,
      backgroundColor:
        PRIMARY,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 10,
    },

    buttonDisabled: {
      opacity: 0.45,
    },

    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },

    backButton: {
      alignItems:
        "center",
      marginTop: 20,
    },

    backText: {
      color: PRIMARY,
      fontSize: 15,
      fontWeight: "600",
    },
  });