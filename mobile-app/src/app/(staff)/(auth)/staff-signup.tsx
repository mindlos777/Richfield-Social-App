import React, { useMemo, useState } from "react";

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
import * as DocumentPicker from "expo-document-picker";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";
const STAFF_DOMAIN = "@richfield.ac.za";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const PERSON_NAME_REGEX =
  /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;

const LETTER_TEXT_REGEX =
  /^[\p{L}\p{M}][\p{L}\p{M}'&()/. -]*$/u;

const CAMPUSES = [
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

type VerificationFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

function cleanSingleLine(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(value: string) {
  return value
    .replace(/[^\p{L}\p{M}' -]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function finalCleanName(value: string) {
  return cleanName(value).trim();
}

function isValidName(value: string) {
  const clean = finalCleanName(value);

  if (
    clean.length < 2 ||
    clean.length > 80
  ) {
    return false;
  }

  if (!PERSON_NAME_REGEX.test(clean)) {
    return false;
  }

  const letters =
    clean.match(/\p{L}/gu) || [];

  return letters.length >= 2;
}

/*
  STAFF NUMBER

  Digits only.
  Letters, spaces, hyphens and
  special characters are removed
  immediately while typing.
*/
function cleanStaffNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 30);
}

function isRepeatedDigitValue(value: string) {
  if (!value) {
    return false;
  }

  return /^(\d)\1+$/.test(value);
}

function isFakeStaffNumber(value: string) {
  const clean =
    cleanStaffNumber(value);

  if (clean.length < 3) {
    return true;
  }

  if (
    isRepeatedDigitValue(clean)
  ) {
    return true;
  }

  const fakeValues = [
    "00000000",
    "000000000",
    "12345678",
    "123456789",
  ];

  return fakeValues.includes(clean);
}

/*
  DEPARTMENT / JOB TITLE

  Numbers are removed while typing.

  We allow normal punctuation that can
  genuinely appear in names such as:
  Information Technology
  Research & Development
  Head of IT
  Lecturer / Coordinator

  Digits are never accepted.
*/
function cleanLetterText(
  value: string,
  maxLength = 100
) {
  return value
    .replace(
      /[^\p{L}\p{M}'&()/. -]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function finalCleanLetterText(
  value: string,
  maxLength = 100
) {
  return cleanLetterText(
    value,
    maxLength
  ).trim();
}

function isValidLetterText(
  value: string
) {
  const clean =
    finalCleanLetterText(value);

  if (
    clean.length < 2 ||
    clean.length > 100
  ) {
    return false;
  }

  if (
    /\d/.test(clean)
  ) {
    return false;
  }

  if (
    !LETTER_TEXT_REGEX.test(clean)
  ) {
    return false;
  }

  const letters =
    clean.match(/\p{L}/gu) || [];

  return letters.length >= 2;
}

function cleanEmail(value: string) {
  return value
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase()
    .slice(0, 150);
}

function isValidStaffEmail(value: string) {
  const email =
    cleanEmail(value);

  if (
    !/^[^\s@]+@richfield\.ac\.za$/i.test(
      email
    )
  ) {
    return false;
  }

  if (
    email.endsWith(
      "@my.richfield.ac.za"
    )
  ) {
    return false;
  }

  const localPart =
    email.split("@")[0];

  if (
    !localPart ||
    localPart.length < 2
  ) {
    return false;
  }

  if (
    /^([a-z0-9])\1+$/i.test(
      localPart
    )
  ) {
    return false;
  }

  const fakeLocalParts = [
    "test",
    "testing",
    "fake",
    "example",
    "admin123",
    "00000000",
  ];

  if (
    fakeLocalParts.includes(
      localPart.toLowerCase()
    )
  ) {
    return false;
  }

  return true;
}

function validatePassword(
  password: string
) {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (password.length > 128) {
    return "Password is too long.";
  }

  if (
    !/[A-Z]/.test(password)
  ) {
    return "Password must contain an uppercase letter.";
  }

  if (
    !/[a-z]/.test(password)
  ) {
    return "Password must contain a lowercase letter.";
  }

  if (
    !/[0-9]/.test(password)
  ) {
    return "Password must contain a number.";
  }

  if (
    !/[^A-Za-z0-9]/.test(
      password
    )
  ) {
    return "Password must contain a special character.";
  }

  if (
    /^(.)\1+$/.test(password)
  ) {
    return "Please choose a stronger password.";
  }

  const weakPasswords = [
    "password",
    "password1",
    "password123",
    "12345678",
    "00000000",
    "000000000",
    "qwerty123",
  ];

  if (
    weakPasswords.includes(
      password.toLowerCase()
    )
  ) {
    return "Please choose a stronger password.";
  }

  return null;
}

function sanitizeFileName(
  value: string
) {
  return value
    .replace(
      /[^A-Za-z0-9._-]/g,
      "_"
    )
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export default function StaffSignupScreen() {
  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    staffNumber,
    setStaffNumber,
  ] = useState("");

  const [
    department,
    setDepartment,
  ] = useState("");

  const [
    jobTitle,
    setJobTitle,
  ] = useState("");

  const [
    campus,
    setCampus,
  ] = useState("");

  const [
    email,
    setEmail,
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
    verificationFile,
    setVerificationFile,
  ] =
    useState<VerificationFile | null>(
      null
    );

  const [
    showCampuses,
    setShowCampuses,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    declarationAccepted,
    setDeclarationAccepted,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    attemptedSubmit,
    setAttemptedSubmit,
  ] = useState(false);

  const passwordChecks =
    useMemo(
      () => ({
        length:
          password.length >= 8,

        uppercase:
          /[A-Z]/.test(password),

        lowercase:
          /[a-z]/.test(password),

        number:
          /[0-9]/.test(password),

        special:
          /[^A-Za-z0-9]/.test(
            password
          ),
      }),
      [password]
    );

  const nameError =
    useMemo(() => {
      if (!fullName.trim()) {
        return "Full name is required.";
      }

      if (
        !isValidName(fullName)
      ) {
        return "Full name may only contain letters, spaces, apostrophes and hyphens.";
      }

      return null;
    }, [fullName]);

  const staffNumberError =
    useMemo(() => {
      if (!staffNumber) {
        return "Staff number is required.";
      }

      if (
        !/^\d+$/.test(
          staffNumber
        )
      ) {
        return "Staff number may only contain numbers.";
      }

      if (
        staffNumber.length < 3
      ) {
        return "Enter a valid Richfield staff number.";
      }

      if (
        isFakeStaffNumber(
          staffNumber
        )
      ) {
        return "Enter your real Richfield staff number.";
      }

      return null;
    }, [staffNumber]);

  const departmentError =
    useMemo(() => {
      if (!department.trim()) {
        return "Department is required.";
      }

      if (
        !isValidLetterText(
          department
        )
      ) {
        return "Department may only contain letters and normal name punctuation.";
      }

      return null;
    }, [department]);

  const jobTitleError =
    useMemo(() => {
      if (!jobTitle.trim()) {
        return "Job title is required.";
      }

      if (
        !isValidLetterText(
          jobTitle
        )
      ) {
        return "Job title may only contain letters and normal title punctuation.";
      }

      return null;
    }, [jobTitle]);

  const emailError =
    useMemo(() => {
      if (!email) {
        return "Richfield staff email is required.";
      }

      if (
        !isValidStaffEmail(
          email
        )
      ) {
        return `Use your official Richfield Staff email ending in ${STAFF_DOMAIN}.`;
      }

      return null;
    }, [email]);

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
        return "Confirm your password.";
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

  function showError(
    value: string,
    error: string | null
  ) {
    return Boolean(
      attemptedSubmit ||
        value.length > 0
    ) && Boolean(error);
  }

  const chooseVerificationDocument =
    async () => {
      try {
        const result =
          await DocumentPicker.getDocumentAsync(
            {
              type: "application/pdf",
              copyToCacheDirectory:
                true,
              multiple: false,
            }
          );

        if (result.canceled) {
          return;
        }

        const file =
          result.assets?.[0];

        if (!file) {
          return;
        }

        if (
          file.mimeType &&
          file.mimeType !==
            "application/pdf"
        ) {
          Alert.alert(
            "Invalid document",
            "Please upload a PDF document."
          );

          return;
        }

        if (
          !file.name
            .toLowerCase()
            .endsWith(".pdf")
        ) {
          Alert.alert(
            "Invalid document",
            "Your verification document must be a PDF."
          );

          return;
        }

        if (
          typeof file.size ===
            "number" &&
          file.size >
            MAX_FILE_SIZE
        ) {
          Alert.alert(
            "File too large",
            "The PDF must be 5 MB or smaller."
          );

          return;
        }

        setVerificationFile({
          uri: file.uri,
          name: file.name,
          mimeType:
            file.mimeType,
          size: file.size,
        });
      } catch (error) {
        console.error(
          "Document picker error:",
          error
        );

        Alert.alert(
          "Document error",
          "We could not select that document."
        );
      }
    };

  const validateForm = () => {
    const safeName =
      finalCleanName(
        fullName
      );

    const safeStaffNumber =
      cleanStaffNumber(
        staffNumber
      );

    const safeDepartment =
      finalCleanLetterText(
        department
      );

    const safeJobTitle =
      finalCleanLetterText(
        jobTitle
      );

    const safeEmail =
      cleanEmail(email);

    if (
      !safeName ||
      !isValidName(safeName)
    ) {
      return "Enter a valid full name.";
    }

    if (!safeStaffNumber) {
      return "Enter your Richfield staff number.";
    }

    if (
      !/^\d+$/.test(
        safeStaffNumber
      )
    ) {
      return "Staff number may only contain numbers.";
    }

    if (
      isFakeStaffNumber(
        safeStaffNumber
      )
    ) {
      return "Enter a valid Richfield staff number.";
    }

    if (
      !safeDepartment ||
      !isValidLetterText(
        safeDepartment
      )
    ) {
      return "Enter a valid department using letters only.";
    }

    if (
      !safeJobTitle ||
      !isValidLetterText(
        safeJobTitle
      )
    ) {
      return "Enter a valid job title using letters only.";
    }

    if (!campus) {
      return "Select your primary campus.";
    }

    if (!safeEmail) {
      return "Enter your Richfield staff email.";
    }

    if (
      !isValidStaffEmail(
        safeEmail
      )
    ) {
      return `Use your Richfield staff email ending in ${STAFF_DOMAIN}.`;
    }

    const passwordValidation =
      validatePassword(
        password
      );

    if (
      passwordValidation
    ) {
      return passwordValidation;
    }

    if (
      password !==
      confirmPassword
    ) {
      return "Passwords do not match.";
    }

    if (!verificationFile) {
      return "Upload a staff verification document.";
    }

    if (
      !declarationAccepted
    ) {
      return "Please confirm that the information you provided is correct.";
    }

    return null;
  };

  const uploadVerificationDocument =
    async (
      userId: string,
      file: VerificationFile
    ) => {
      const response =
        await fetch(file.uri);

      if (!response.ok) {
        throw new Error(
          "Could not read the selected verification document."
        );
      }

      const blob =
        await response.blob();

      if (
        blob.size >
        MAX_FILE_SIZE
      ) {
        throw new Error(
          "The verification PDF must be 5 MB or smaller."
        );
      }

      const safeFileName =
        sanitizeFileName(
          file.name ||
            "staff-verification.pdf"
        );

      const filePath =
        `${userId}/${Date.now()}-${safeFileName}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "staff-verification"
          )
          .upload(
            filePath,
            blob,
            {
              contentType:
                "application/pdf",
              upsert: false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      return filePath;
    };

  const handleSignup =
    async () => {
      if (loading) {
        return;
      }

      setAttemptedSubmit(true);

      const validationError =
        validateForm();

      if (validationError) {
        Alert.alert(
          "Check your details",
          validationError
        );

        return;
      }

      /*
        Sanitise again immediately
        before sending anything to
        Supabase.
      */

      const safeName =
        finalCleanName(
          fullName
        );

      const safeStaffNumber =
        cleanStaffNumber(
          staffNumber
        );

      const safeDepartment =
        finalCleanLetterText(
          department
        );

      const safeJobTitle =
        finalCleanLetterText(
          jobTitle
        );

      const safeEmail =
        cleanEmail(email);

      try {
        setLoading(true);

        const {
          data,
          error,
        } =
          await supabase.auth.signUp(
            {
              email: safeEmail,
              password,

              options: {
                data: {
                  full_name:
                    safeName,

                  signup_role:
                    "staff",

                  staff_number:
                    safeStaffNumber,

                  department:
                    safeDepartment,

                  job_title:
                    safeJobTitle,

                  campus:
                    campus,
                },
              },
            }
          );

        if (error) {
          throw error;
        }

        const user =
          data.user;

        if (!user) {
          throw new Error(
            "The Staff account could not be created."
          );
        }

        /*
          If email confirmation is enabled,
          Supabase can create the user without
          returning an authenticated session.

          In that case the private verification
          document is uploaded after the user
          verifies their email and signs in.
        */

        if (!data.session) {
          Alert.alert(
            "Verify your email",
            "Your Staff account has been created. Verify your Richfield email, then sign in to continue your Staff verification.",
            [
              {
                text:
                  "Go to Login",

                onPress: () =>
                  router.replace(
                    "/login"
                  ),
              },
            ]
          );

          return;
        }

        if (
          !verificationFile
        ) {
          throw new Error(
            "Verification document is required."
          );
        }

        const filePath =
          await uploadVerificationDocument(
            user.id,
            verificationFile
          );

        /*
          Use the protected RPC instead of
          allowing the client to directly
          modify verification state.
        */

        const {
          error:
            verificationError,
        } =
          await supabase.rpc(
            "update_my_staff_verification_document",
            {
              p_document_path:
                filePath,
            }
          );

        if (
          verificationError
        ) {
          console.error(
            "Staff verification link error:",
            verificationError
          );

          Alert.alert(
            "Account created",
            "Your Staff account was created, but the verification document could not be linked to your profile. Sign in and complete verification.",
            [
              {
                text:
                  "Go to Login",

                onPress:
                  async () => {
                    await supabase.auth.signOut();

                    router.replace(
                      "/login"
                    );
                  },
              },
            ]
          );

          return;
        }

        await supabase.auth.signOut();

        Alert.alert(
          "Application submitted",
          "Your Staff account is pending Richfield Administrator verification. Staff access will be activated after approval.",
          [
            {
              text:
                "Go to Login",

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
        console.error(
          "Staff signup error:",
          error
        );

        let message =
          error?.message ||
          "We could not create your Staff account.";

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
            "An account already exists with this email.";
        }

        if (
          lower.includes(
            "staff_number"
          )
        ) {
          message =
            "That staff number is already registered.";
        }

        Alert.alert(
          "Staff signup failed",
          message
        );
      } finally {
        setLoading(false);
      }
    };

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
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#111827"
          />

          <Text
            style={
              styles.backText
            }
          >
            Back
          </Text>
        </Pressable>

        <View style={styles.header}>
          <View
            style={
              styles.iconBox
            }
          >
            <Ionicons
              name="school-outline"
              size={30}
              color={PRIMARY}
            />
          </View>

          <Text
            style={styles.title}
          >
            Staff Registration
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Create your Richfield Staff
            account. Your account will
            be reviewed before Staff
            access is activated.
          </Text>
        </View>

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
            Staff accounts require a
            Richfield staff email and
            verification before
            activation.
          </Text>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Staff information
        </Text>

        <Text style={styles.label}>
          Full name
        </Text>

        <TextInput
          style={[
            styles.input,

            showError(
              fullName,
              nameError
            )
              ? styles.errorInput
              : null,
          ]}
          value={fullName}
          onChangeText={value =>
            setFullName(
              cleanName(value)
            )
          }
          onBlur={() =>
            setFullName(
              finalCleanName(
                fullName
              )
            )
          }
          placeholder="Your full name"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={80}
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
          Staff number
        </Text>

        <TextInput
          style={[
            styles.input,

            showError(
              staffNumber,
              staffNumberError
            )
              ? styles.errorInput
              : null,
          ]}
          value={staffNumber}
          onChangeText={value =>
            setStaffNumber(
              cleanStaffNumber(
                value
              )
            )
          }
          placeholder="Richfield staff number"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          inputMode="numeric"
          autoCorrect={false}
          maxLength={30}
        />

        {showError(
          staffNumber,
          staffNumberError
        ) ? (
          <ValidationError
            text={
              staffNumberError!
            }
          />
        ) : (
          <Text
            style={styles.helper}
          >
            Numbers only.
          </Text>
        )}

        <Text style={styles.label}>
          Department
        </Text>

        <TextInput
          style={[
            styles.input,

            showError(
              department,
              departmentError
            )
              ? styles.errorInput
              : null,
          ]}
          value={department}
          onChangeText={value =>
            setDepartment(
              cleanLetterText(
                value
              )
            )
          }
          onBlur={() =>
            setDepartment(
              finalCleanLetterText(
                department
              )
            )
          }
          placeholder="e.g. Information Technology"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={100}
        />

        {showError(
          department,
          departmentError
        ) ? (
          <ValidationError
            text={
              departmentError!
            }
          />
        ) : (
          <Text
            style={styles.helper}
          >
            Letters only. Numbers are
            not accepted.
          </Text>
        )}

        <Text style={styles.label}>
          Job title
        </Text>

        <TextInput
          style={[
            styles.input,

            showError(
              jobTitle,
              jobTitleError
            )
              ? styles.errorInput
              : null,
          ]}
          value={jobTitle}
          onChangeText={value =>
            setJobTitle(
              cleanLetterText(
                value
              )
            )
          }
          onBlur={() =>
            setJobTitle(
              finalCleanLetterText(
                jobTitle
              )
            )
          }
          placeholder="e.g. Lecturer"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={100}
        />

        {showError(
          jobTitle,
          jobTitleError
        ) ? (
          <ValidationError
            text={
              jobTitleError!
            }
          />
        ) : (
          <Text
            style={styles.helper}
          >
            Letters only. Numbers are
            not accepted.
          </Text>
        )}

        <Text style={styles.label}>
          Primary campus
        </Text>

        <Pressable
          style={[
            styles.select,

            attemptedSubmit &&
            !campus
              ? styles.errorInput
              : null,
          ]}
          onPress={() =>
            setShowCampuses(
              value => !value
            )
          }
        >
          <Text
            style={[
              styles.selectText,
              !campus &&
                styles.placeholder,
            ]}
          >
            {campus ||
              "Select your campus"}
          </Text>

          <Ionicons
            name={
              showCampuses
                ? "chevron-up"
                : "chevron-down"
            }
            size={20}
            color="#6B7280"
          />
        </Pressable>

        {showCampuses ? (
          <View
            style={
              styles.dropdown
            }
          >
            {CAMPUSES.map(
              item => (
                <Pressable
                  key={item}
                  style={
                    styles.dropdownItem
                  }
                  onPress={() => {
                    setCampus(item);

                    setShowCampuses(
                      false
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,

                      campus ===
                        item &&
                        styles.dropdownTextSelected,
                    ]}
                  >
                    {item}
                  </Text>

                  {campus ===
                  item ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
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
            text="Select your primary campus."
          />
        ) : null}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Account
        </Text>

        <Text style={styles.label}>
          Richfield staff email
        </Text>

        <TextInput
          style={[
            styles.input,

            showError(
              email,
              emailError
            )
              ? styles.errorInput
              : null,
          ]}
          value={email}
          onChangeText={value =>
            setEmail(
              cleanEmail(value)
            )
          }
          onBlur={() =>
            setEmail(
              cleanEmail(email)
            )
          }
          placeholder="name@richfield.ac.za"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={150}
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
            Use your official
            @richfield.ac.za email.
          </Text>
        )}

        <Text style={styles.label}>
          Password
        </Text>

        <View
          style={[
            styles.passwordContainer,

            showError(
              password,
              passwordError
            )
              ? styles.errorInput
              : null,
          ]}
        >
          <TextInput
            style={
              styles.passwordInput
            }
            value={password}
            onChangeText={
              setPassword
            }
            placeholder="Create a strong password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={
              !showPassword
            }
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
          />

          <Pressable
            onPress={() =>
              setShowPassword(
                value => !value
              )
            }
          >
            <Ionicons
              name={
                showPassword
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={22}
              color="#6B7280"
            />
          </Pressable>
        </View>

        {!!password ? (
          <View
            style={
              styles.passwordRules
            }
          >
            <PasswordRule
              valid={
                passwordChecks.length
              }
              text="At least 8 characters"
            />

            <PasswordRule
              valid={
                passwordChecks.uppercase
              }
              text="One uppercase letter"
            />

            <PasswordRule
              valid={
                passwordChecks.lowercase
              }
              text="One lowercase letter"
            />

            <PasswordRule
              valid={
                passwordChecks.number
              }
              text="One number"
            />

            <PasswordRule
              valid={
                passwordChecks.special
              }
              text="One special character"
            />
          </View>
        ) : null}

        {showError(
          password,
          passwordError
        ) ? (
          <ValidationError
            text={passwordError!}
          />
        ) : null}

        <Text style={styles.label}>
          Confirm password
        </Text>

        <View
          style={[
            styles.passwordContainer,

            showError(
              confirmPassword,
              confirmPasswordError
            )
              ? styles.errorInput
              : null,
          ]}
        >
          <TextInput
            style={
              styles.passwordInput
            }
            value={
              confirmPassword
            }
            onChangeText={
              setConfirmPassword
            }
            placeholder="Enter your password again"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={
              !showConfirmPassword
            }
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
          />

          <Pressable
            onPress={() =>
              setShowConfirmPassword(
                value => !value
              )
            }
          >
            <Ionicons
              name={
                showConfirmPassword
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={22}
              color="#6B7280"
            />
          </Pressable>
        </View>

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

        <Text
          style={
            styles.sectionTitle
          }
        >
          Staff verification
        </Text>

        <Text
          style={
            styles.verificationDescription
          }
        >
          Upload a Richfield-issued
          document that can help an
          Administrator confirm your
          Staff identity. The document
          is stored privately and is
          not displayed on your public
          profile.
        </Text>

        <Pressable
          style={[
            styles.documentButton,

            verificationFile &&
              styles.documentButtonSelected,
          ]}
          onPress={
            chooseVerificationDocument
          }
        >
          <View
            style={
              styles.documentIcon
            }
          >
            <Ionicons
              name={
                verificationFile
                  ? "document-text"
                  : "cloud-upload-outline"
              }
              size={26}
              color={PRIMARY}
            />
          </View>

          <View
            style={
              styles.documentInfo
            }
          >
            <Text
              style={
                styles.documentTitle
              }
              numberOfLines={1}
            >
              {verificationFile
                ? verificationFile.name
                : "Upload verification PDF"}
            </Text>

            <Text
              style={
                styles.documentSubtitle
              }
            >
              {verificationFile
                ? "Tap to replace document"
                : "PDF only, maximum 5 MB"}
            </Text>
          </View>

          {verificationFile ? (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color="#16A34A"
            />
          ) : null}
        </Pressable>

        {attemptedSubmit &&
        !verificationFile ? (
          <ValidationError
            text="Upload a staff verification PDF."
          />
        ) : null}

        <Pressable
          style={
            styles.declaration
          }
          onPress={() =>
            setDeclarationAccepted(
              value => !value
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
            {declarationAccepted ? (
              <Ionicons
                name="checkmark"
                size={16}
                color="#FFFFFF"
              />
            ) : null}
          </View>

          <Text
            style={
              styles.declarationText
            }
          >
            I confirm that the
            information and document
            provided belong to me and
            are accurate.
          </Text>
        </Pressable>

        {attemptedSubmit &&
        !declarationAccepted ? (
          <ValidationError
            text="Confirm that the information you provided is correct."
          />
        ) : null}

        <Pressable
          style={[
            styles.submitButton,

            loading &&
              styles.submitButtonDisabled,
          ]}
          disabled={loading}
          onPress={
            handleSignup
          }
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text
                style={
                  styles.submitText
                }
              >
                Submit Staff Application
              </Text>

              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
              />
            </>
          )}
        </Pressable>

        <Pressable
          style={
            styles.loginButton
          }
          onPress={() =>
            router.replace(
              "/login"
            )
          }
        >
          <Text
            style={
              styles.loginText
            }
          >
            Already have an
            account?{" "}
            <Text
              style={
                styles.loginLink
              }
            >
              Sign in
            </Text>
          </Text>
        </Pressable>

        <Text
          style={styles.footer}
        >
          Staff access is activated
          only after verification by a
          Richfield Administrator.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ValidationError({
  text,
}: {
  text: string;
}) {
  return (
    <View
      style={styles.errorRow}
    >
      <Ionicons
        name="alert-circle-outline"
        size={15}
        color="#C62828"
      />

      <Text
        style={
          styles.errorText
        }
      >
        {text}
      </Text>
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
    <View style={styles.rule}>
      <Ionicons
        name={
          valid
            ? "checkmark-circle"
            : "ellipse-outline"
        }
        size={16}
        color={
          valid
            ? "#16A34A"
            : "#9CA3AF"
        }
      />

      <Text
        style={[
          styles.ruleText,

          valid &&
            styles.ruleTextValid,
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

    content: {
      paddingHorizontal: 22,
      paddingTop: 18,
      paddingBottom: 50,
    },

    backButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      marginBottom: 24,
    },

    backText: {
      color: "#111827",
      fontSize: 15,
      fontWeight: "600",
    },

    header: {
      marginBottom: 24,
    },

    iconBox: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 18,
    },

    title: {
      color: "#111827",
      fontSize: 28,
      fontWeight: "800",
      marginBottom: 8,
    },

    subtitle: {
      color: "#6B7280",
      fontSize: 15,
      lineHeight: 22,
    },

    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 15,
      backgroundColor:
        "#F2F2FF",
      borderRadius: 16,
      marginBottom: 28,
    },

    noticeText: {
      flex: 1,
      color: "#374151",
      fontSize: 14,
      lineHeight: 20,
    },

    sectionTitle: {
      color: "#111827",
      fontSize: 18,
      fontWeight: "800",
      marginTop: 10,
      marginBottom: 17,
    },

    label: {
      color: "#374151",
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 8,
    },

    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      borderRadius: 14,
      paddingHorizontal: 15,
      color: "#111827",
      fontSize: 15,
      backgroundColor:
        "#FFFFFF",
      marginBottom: 17,
    },

    errorInput: {
      borderColor:
        "#C62828",
      backgroundColor:
        "#FFF9F9",
    },

    helper: {
      color: "#6B7280",
      fontSize: 12,
      marginTop: -9,
      marginBottom: 17,
    },

    errorRow: {
      marginTop: -9,
      marginBottom: 17,
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 5,
    },

    errorText: {
      flex: 1,
      color: "#C62828",
      fontSize: 11,
      lineHeight: 16,
    },

    select: {
      minHeight: 52,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      borderRadius: 14,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 10,
    },

    selectText: {
      color: "#111827",
      fontSize: 15,
    },

    placeholder: {
      color: "#9CA3AF",
    },

    dropdown: {
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 18,
    },

    dropdownItem: {
      minHeight: 48,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        "#E5E7EB",
    },

    dropdownText: {
      color: "#374151",
      fontSize: 14,
    },

    dropdownTextSelected: {
      color: PRIMARY,
      fontWeight: "700",
    },

    passwordContainer: {
      minHeight: 52,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      borderRadius: 14,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 17,
    },

    passwordInput: {
      flex: 1,
      color: "#111827",
      fontSize: 15,
      paddingVertical: 13,
      paddingRight: 10,
    },

    passwordRules: {
      marginTop: -6,
      marginBottom: 18,
      gap: 7,
    },

    rule: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    ruleText: {
      color: "#9CA3AF",
      fontSize: 12,
    },

    ruleTextValid: {
      color: "#16A34A",
    },

    verificationDescription: {
      color: "#6B7280",
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 16,
    },

    documentButton: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor:
        "#C7C7FF",
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 22,
    },

    documentButtonSelected: {
      borderStyle: "solid",
      borderColor:
        "#B8B7FF",
      backgroundColor:
        "#FAFAFF",
    },

    documentIcon: {
      width: 46,
      height: 46,
      borderRadius: 13,
      backgroundColor:
        "#EEEEFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    documentInfo: {
      flex: 1,
    },

    documentTitle: {
      color: "#111827",
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 4,
    },

    documentSubtitle: {
      color: "#6B7280",
      fontSize: 12,
    },

    declaration: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 11,
      marginBottom: 25,
    },

    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor:
        "#9CA3AF",
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 1,
    },

    checkboxSelected: {
      borderColor: PRIMARY,
      backgroundColor:
        PRIMARY,
    },

    declarationText: {
      flex: 1,
      color: "#4B5563",
      fontSize: 13,
      lineHeight: 19,
    },

    submitButton: {
      minHeight: 54,
      backgroundColor:
        PRIMARY,
      borderRadius: 15,
      alignItems: "center",
      justifyContent:
        "center",
      flexDirection: "row",
      gap: 9,
    },

    submitButtonDisabled: {
      opacity: 0.65,
    },

    submitText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },

    loginButton: {
      alignItems: "center",
      paddingVertical: 20,
    },

    loginText: {
      color: "#6B7280",
      fontSize: 14,
    },

    loginLink: {
      color: PRIMARY,
      fontWeight: "800",
    },

    footer: {
      textAlign: "center",
      color: "#9CA3AF",
      fontSize: 11,
      lineHeight: 17,
      paddingHorizontal: 20,
    },
  });