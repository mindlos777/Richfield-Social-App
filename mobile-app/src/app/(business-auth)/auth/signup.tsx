import React, { useState } from "react";
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

import {
  cleanEmail,
  cleanPersonName,
  isValidPersonName,
  validatePassword,
} from "../../../utils/validation";

const PRIMARY = "#0300cf";

const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

const MAX_COMPANY_NAME = 120;
const MAX_REGISTRATION_NUMBER = 40;
const MAX_LOCATION = 120;
const MAX_DESCRIPTION = 1000;
const MAX_CONTACT_NAME = 100;
const MAX_JOB_TITLE = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 25;
const MAX_WEBSITE = 250;

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

/* =========================================================
   GENERAL CLEANING
========================================================= */

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanSingleLine(value: string) {
  return value
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
}

function cleanMultiline(value: string) {
  return value
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}

/* =========================================================
   FAKE / REPEATED VALUES
========================================================= */

function isRepeatedValue(value: string) {
  const compact = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (compact.length < 4) {
    return false;
  }

  return /^([a-z0-9])\1+$/.test(compact);
}

function isObviousFakeText(value: string) {
  const compact = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!compact) {
    return true;
  }

  if (isRepeatedValue(compact)) {
    return true;
  }

  const blockedValues = [
    "test",
    "testing",
    "fake",
    "unknown",
    "none",
    "null",
    "undefined",
    "asdf",
    "qwerty",
    "company",
    "business",
    "example",
    "sample",
    "dummy",
    "demo",
  ];

  return blockedValues.includes(compact);
}

/* =========================================================
   COMPANY NAME
========================================================= */

function cleanCompanyName(value: string) {
  return cleanSingleLine(value)
    .replace(
      /[^\p{L}\p{M}\p{N}&'().,+\- ]/gu,
      ""
    )
    .slice(0, MAX_COMPANY_NAME);
}

function isValidCompanyName(value: string) {
  const cleaned = normalizeSpaces(
    cleanCompanyName(value)
  );

  if (
    cleaned.length < 2 ||
    cleaned.length > MAX_COMPANY_NAME
  ) {
    return false;
  }

  if (!/[\p{L}]/u.test(cleaned)) {
    return false;
  }

  if (isObviousFakeText(cleaned)) {
    return false;
  }

  return true;
}

/* =========================================================
   COMPANY REGISTRATION NUMBER
========================================================= */

function cleanRegistrationNumber(value: string) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9/.-]/g, "")
    .slice(0, MAX_REGISTRATION_NUMBER);
}

function isValidRegistrationNumber(value: string) {
  const cleaned =
    cleanRegistrationNumber(value);

  if (
    cleaned.length < 4 ||
    cleaned.length > MAX_REGISTRATION_NUMBER
  ) {
    return false;
  }

  const compact = cleaned.replace(
    /[^A-Z0-9]/g,
    ""
  );

  if (compact.length < 4) {
    return false;
  }

  if (
    /^0+$/.test(compact) ||
    /^1+$/.test(compact) ||
    /^([A-Z0-9])\1+$/.test(compact)
  ) {
    return false;
  }

  const blocked = [
    "00000000",
    "000000000",
    "11111111",
    "111111111",
    "12345678",
    "123456789",
  ];

  if (blocked.includes(compact)) {
    return false;
  }

  return true;
}

/* =========================================================
   WEBSITE
========================================================= */

function cleanWebsite(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, MAX_WEBSITE);
}

function isValidWebsite(value: string) {
  const website = cleanWebsite(value);

  if (!website) {
    return false;
  }

  try {
    const parsed = new URL(website);

    if (
      parsed.protocol !== "https:" &&
      parsed.protocol !== "http:"
    ) {
      return false;
    }

    if (
      !parsed.hostname ||
      !parsed.hostname.includes(".")
    ) {
      return false;
    }

    if (
      parsed.username ||
      parsed.password
    ) {
      return false;
    }

    const hostname =
      parsed.hostname.toLowerCase();

    const blockedHosts = [
      "example.com",
      "test.com",
      "fake.com",
      "localhost",
    ];

    if (blockedHosts.includes(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/* =========================================================
   LOCATION
========================================================= */

function cleanLocation(value: string) {
  return cleanSingleLine(value)
    .replace(
      /[^\p{L}\p{M}\p{N}'().,\- /]/gu,
      ""
    )
    .slice(0, MAX_LOCATION);
}

function isValidLocation(value: string) {
  const cleaned = normalizeSpaces(
    cleanLocation(value)
  );

  if (
    cleaned.length < 2 ||
    cleaned.length > MAX_LOCATION
  ) {
    return false;
  }

  if (!/[\p{L}]/u.test(cleaned)) {
    return false;
  }

  if (isObviousFakeText(cleaned)) {
    return false;
  }

  return true;
}

/* =========================================================
   COMPANY DESCRIPTION
========================================================= */

function cleanCompanyDescription(value: string) {
  return cleanMultiline(value).slice(
    0,
    MAX_DESCRIPTION
  );
}

function isValidDescription(value: string) {
  const cleaned =
    cleanCompanyDescription(value).trim();

  if (cleaned.length < 20) {
    return false;
  }

  if (!/[\p{L}]/u.test(cleaned)) {
    return false;
  }

  if (isRepeatedValue(cleaned)) {
    return false;
  }

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 4) {
    return false;
  }

  return true;
}

/* =========================================================
   PERSON NAME
========================================================= */

function sanitizePersonName(value: string) {
  return cleanPersonName(value).slice(
    0,
    MAX_CONTACT_NAME
  );
}

function isValidContactName(value: string) {
  const cleaned = normalizeSpaces(
    sanitizePersonName(value)
  );

  if (
    cleaned.length < 2 ||
    cleaned.length > MAX_CONTACT_NAME
  ) {
    return false;
  }

  if (!isValidPersonName(cleaned)) {
    return false;
  }

  if (/\d/.test(cleaned)) {
    return false;
  }

  if (isObviousFakeText(cleaned)) {
    return false;
  }

  return true;
}

/* =========================================================
   JOB TITLE
========================================================= */

function cleanJobTitle(value: string) {
  return cleanSingleLine(value)
    .replace(
      /[^\p{L}\p{M}&'().,\-/ ]/gu,
      ""
    )
    .slice(0, MAX_JOB_TITLE);
}

function isValidJobTitle(value: string) {
  const cleaned = normalizeSpaces(
    cleanJobTitle(value)
  );

  if (
    cleaned.length < 2 ||
    cleaned.length > MAX_JOB_TITLE
  ) {
    return false;
  }

  if (/\d/.test(cleaned)) {
    return false;
  }

  if (!/[\p{L}]/u.test(cleaned)) {
    return false;
  }

  if (isObviousFakeText(cleaned)) {
    return false;
  }

  return true;
}

/* =========================================================
   BUSINESS EMAIL
========================================================= */

function sanitizeBusinessEmail(value: string) {
  return cleanEmail(value)
    .replace(/\s+/g, "")
    .slice(0, MAX_EMAIL);
}

function isValidBusinessEmail(value: string) {
  const email =
    sanitizeBusinessEmail(value);

  if (
    email.length < 6 ||
    email.length > MAX_EMAIL
  ) {
    return false;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
      email
    )
  ) {
    return false;
  }

  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;

  if (!localPart || !domain) {
    return false;
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return false;
  }

  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    return false;
  }

  const compactLocal = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  /*
   * Reject:
   *
   * 00000@gmail.com
   * 000000@gmail.com
   * 11111@gmail.com
   * aaaaa@gmail.com
   */
  if (
    compactLocal.length >= 4 &&
    /^([a-z0-9])\1+$/.test(compactLocal)
  ) {
    return false;
  }

  if (/^0+$/.test(compactLocal)) {
    return false;
  }

  if (/^1+$/.test(compactLocal)) {
    return false;
  }

  const fakeLocalParts = [
    "test",
    "testing",
    "fake",
    "example",
    "sample",
    "dummy",
    "demo",
    "asdf",
    "qwerty",
    "12345678",
    "123456789",
    "00000",
    "000000",
    "00000000",
  ];

  if (
    fakeLocalParts.includes(
      compactLocal
    )
  ) {
    return false;
  }

  const lowerDomain =
    domain.toLowerCase();

  const fakeDomains = [
    "example.com",
    "test.com",
    "fake.com",
  ];

  if (
    fakeDomains.includes(
      lowerDomain
    )
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   PHONE NUMBER
========================================================= */

function cleanPhone(value: string) {
  let cleaned = value.replace(
    /[^\d+\-() ]/g,
    ""
  );

  /*
   * + may only appear at beginning.
   */
  cleaned = cleaned.replace(
    /(?!^)\+/g,
    ""
  );

  return cleaned.slice(
    0,
    MAX_PHONE
  );
}

function isValidPhone(value: string) {
  const cleaned = cleanPhone(value);

  const digits = cleaned.replace(
    /\D/g,
    ""
  );

  if (
    digits.length < 9 ||
    digits.length > 15
  ) {
    return false;
  }

  /*
   * Reject:
   * 0000000000
   * 1111111111
   * 9999999999
   */
  if (
    /^(\d)\1+$/.test(digits)
  ) {
    return false;
  }

  /*
   * Specifically handle South African
   * international numbers.
   *
   * +270000000000 -> digits = 270000000000
   *
   * Remove 27 and check the national
   * portion.
   */
  if (digits.startsWith("27")) {
    const nationalNumber =
      digits.slice(2);

    if (
      !nationalNumber ||
      /^0+$/.test(nationalNumber) ||
      /^(\d)\1+$/.test(
        nationalNumber
      )
    ) {
      return false;
    }
  }

  /*
   * South African local number:
   * 0000000000 should never pass.
   */
  if (
    digits.startsWith("0") &&
    /^0+$/.test(digits)
  ) {
    return false;
  }

  const blockedNumbers = [
    "000000000",
    "0000000000",
    "111111111",
    "1111111111",
    "123456789",
    "1234567890",
    "0123456789",
    "27000000000",
    "270000000000",
  ];

  if (blockedNumbers.includes(digits)) {
    return false;
  }

  return true;
}

/* =========================================================
   FILE NAME
========================================================= */

function sanitizeFileName(
  fileName: string
) {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);

  if (!cleaned) {
    return "registration-document.pdf";
  }

  if (
    !cleaned
      .toLowerCase()
      .endsWith(".pdf")
  ) {
    return `${cleaned}.pdf`;
  }

  return cleaned;
}

/* =========================================================
   SCREEN
========================================================= */

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

  /* =======================================================
     LIVE VALIDATION
  ======================================================= */

  const passwordValidation =
    validatePassword(password);

  const passwordIsStrong =
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
    password === confirmPassword;

  const companyNameIsValid =
    companyName.length === 0 ||
    isValidCompanyName(
      companyName
    );

  const registrationIsValid =
    registrationNumber.length === 0 ||
    isValidRegistrationNumber(
      registrationNumber
    );

  const websiteIsValid =
    website.length === 0 ||
    isValidWebsite(website);

  const locationIsValid =
    location.length === 0 ||
    isValidLocation(location);

  const descriptionIsValid =
    companyDescription.length === 0 ||
    isValidDescription(
      companyDescription
    );

  const contactNameIsValid =
    contactPersonName.length === 0 ||
    isValidContactName(
      contactPersonName
    );

  const jobTitleIsValid =
    contactPersonJobTitle.length === 0 ||
    isValidJobTitle(
      contactPersonJobTitle
    );

  const emailIsValid =
    contactEmail.length === 0 ||
    isValidBusinessEmail(
      contactEmail
    );

  const phoneIsValid =
    contactPhone.length === 0 ||
    isValidPhone(
      contactPhone
    );

  /* =======================================================
     INPUT HANDLERS
  ======================================================= */

  function handleCompanyNameChange(
    value: string
  ) {
    setCompanyName(
      cleanCompanyName(value)
    );
  }

  function handleRegistrationNumberChange(
    value: string
  ) {
    setRegistrationNumber(
      cleanRegistrationNumber(value)
    );
  }

  function handleWebsiteChange(
    value: string
  ) {
    setWebsite(
      cleanWebsite(value)
    );
  }

  function handleLocationChange(
    value: string
  ) {
    setLocation(
      cleanLocation(value)
    );
  }

  function handleDescriptionChange(
    value: string
  ) {
    setCompanyDescription(
      cleanCompanyDescription(
        value
      )
    );
  }

  function handleContactNameChange(
    value: string
  ) {
    setContactPersonName(
      sanitizePersonName(value)
    );
  }

  function handleJobTitleChange(
    value: string
  ) {
    setContactPersonJobTitle(
      cleanJobTitle(value)
    );
  }

  function handleEmailChange(
    value: string
  ) {
    setContactEmail(
      sanitizeBusinessEmail(
        value
      )
    );
  }

  function handlePhoneChange(
    value: string
  ) {
    setContactPhone(
      cleanPhone(value)
    );
  }

  /* =======================================================
     FINAL FORM VALIDATION
  ======================================================= */

  function validateForm() {
    const finalCompanyName =
      normalizeSpaces(
        cleanCompanyName(
          companyName
        )
      );

    const finalRegistrationNumber =
      cleanRegistrationNumber(
        registrationNumber
      );

    const finalWebsite =
      cleanWebsite(website);

    const finalLocation =
      normalizeSpaces(
        cleanLocation(location)
      );

    const finalDescription =
      cleanCompanyDescription(
        companyDescription
      ).trim();

    const finalContactName =
      normalizeSpaces(
        sanitizePersonName(
          contactPersonName
        )
      );

    const finalJobTitle =
      normalizeSpaces(
        cleanJobTitle(
          contactPersonJobTitle
        )
      );

    const finalEmail =
      sanitizeBusinessEmail(
        contactEmail
      );

    const finalPhone =
      cleanPhone(
        contactPhone
      ).trim();

    if (
      !isValidCompanyName(
        finalCompanyName
      )
    ) {
      Alert.alert(
        "Invalid company name",
        "Please enter the organisation's real company name."
      );

      return false;
    }

    if (
      !isValidRegistrationNumber(
        finalRegistrationNumber
      )
    ) {
      Alert.alert(
        "Invalid registration number",
        "Please enter a valid official company registration number."
      );

      return false;
    }

    if (
      !industries.includes(
        industry
      )
    ) {
      Alert.alert(
        "Industry required",
        "Please select your company's industry."
      );

      return false;
    }

    if (
      !isValidWebsite(
        finalWebsite
      )
    ) {
      Alert.alert(
        "Invalid website",
        "Enter a complete company website starting with https:// or http://."
      );

      return false;
    }

    if (
      !isValidLocation(
        finalLocation
      )
    ) {
      Alert.alert(
        "Invalid location",
        "Please enter a valid company location."
      );

      return false;
    }

    if (
      !isValidDescription(
        finalDescription
      )
    ) {
      Alert.alert(
        "Invalid description",
        "Please enter at least 20 meaningful characters describing your organisation."
      );

      return false;
    }

    if (
      !isValidContactName(
        finalContactName
      )
    ) {
      Alert.alert(
        "Invalid contact name",
        "Please enter the contact person's real full name. Numbers are not allowed."
      );

      return false;
    }

    if (
      !isValidJobTitle(
        finalJobTitle
      )
    ) {
      Alert.alert(
        "Invalid job title",
        "Please enter a valid job title. Numbers are not allowed."
      );

      return false;
    }

    if (
      !isValidBusinessEmail(
        finalEmail
      )
    ) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid business email. Fake values such as 00000@gmail.com are not accepted."
      );

      return false;
    }

    if (
      !isValidPhone(
        finalPhone
      )
    ) {
      Alert.alert(
        "Invalid contact number",
        "Please enter a real contact number. Numbers made up of repeated zeros or repeated digits are not accepted."
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

  /* =======================================================
     DOCUMENT PICKER
  ======================================================= */

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

      const file =
        result.assets[0];

      if (!file) {
        return;
      }

      if (
        file.size &&
        file.size >
          MAX_DOCUMENT_SIZE
      ) {
        Alert.alert(
          "File too large",
          "The registration document must be 5 MB or smaller."
        );

        return;
      }

      const fileName =
        file.name
          .toLowerCase()
          .trim();

      const mimeType =
        file.mimeType
          ?.toLowerCase();

      if (
        !fileName.endsWith(
          ".pdf"
        )
      ) {
        Alert.alert(
          "Invalid document",
          "Please select a PDF document."
        );

        return;
      }

      if (
        mimeType &&
        mimeType !==
          "application/pdf"
      ) {
        Alert.alert(
          "Invalid document",
          "The selected file must be a PDF document."
        );

        return;
      }

      setRegistrationDocument(
        file
      );
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

    setRegistrationDocument(
      null
    );
  }

  /* =======================================================
     DOCUMENT UPLOAD
  ======================================================= */

  async function uploadBusinessDocument(
    userId: string
  ) {
    if (!registrationDocument) {
      throw new Error(
        "Please upload your company registration document."
      );
    }

    if (
      registrationDocument.size &&
      registrationDocument.size >
        MAX_DOCUMENT_SIZE
    ) {
      throw new Error(
        "The registration document must be 5 MB or smaller."
      );
    }

    const originalName =
      registrationDocument.name
        .toLowerCase();

    if (
      !originalName.endsWith(
        ".pdf"
      )
    ) {
      throw new Error(
        "The registration document must be a PDF."
      );
    }

    setUploadProgress(
      "Uploading verification document..."
    );

    const response =
      await fetch(
        registrationDocument.uri
      );

    if (!response.ok) {
      throw new Error(
        "Could not read the selected registration document."
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    if (
      arrayBuffer.byteLength >
      MAX_DOCUMENT_SIZE
    ) {
      throw new Error(
        "The registration document must be 5 MB or smaller."
      );
    }

    const safeFileName =
      sanitizeFileName(
        registrationDocument.name ||
          "registration-document.pdf"
      );

    const filePath =
      `${userId}/${Date.now()}-${safeFileName}`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          "business-verification"
        )
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType:
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

  /* =======================================================
     SAVE DOCUMENT PATH
  ======================================================= */

  async function saveDocumentPath(
    userId: string,
    filePath: string
  ) {
    setUploadProgress(
      "Saving verification information..."
    );

    const {
      error: updateError,
    } =
      await supabase
        .from(
          "business_profiles"
        )
        .update({
          registration_document_url:
            filePath,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "user_id",
          userId
        );

    if (updateError) {
      throw new Error(
        `Could not save the verification document: ${updateError.message}`
      );
    }
  }

  /* =======================================================
     SIGN UP
  ======================================================= */

  async function handleSignup() {
    if (!validateForm()) {
      return;
    }

    const finalCompanyName =
      normalizeSpaces(
        cleanCompanyName(
          companyName
        )
      );

    const finalRegistrationNumber =
      cleanRegistrationNumber(
        registrationNumber
      );

    const finalWebsite =
      cleanWebsite(website);

    const finalLocation =
      normalizeSpaces(
        cleanLocation(location)
      );

    const finalDescription =
      cleanCompanyDescription(
        companyDescription
      ).trim();

    const finalContactName =
      normalizeSpaces(
        sanitizePersonName(
          contactPersonName
        )
      );

    const finalJobTitle =
      normalizeSpaces(
        cleanJobTitle(
          contactPersonJobTitle
        )
      );

    const finalEmail =
      sanitizeBusinessEmail(
        contactEmail
      );

    const finalPhone =
      cleanPhone(
        contactPhone
      ).trim();

    try {
      setLoading(true);
      setIndustryOpen(false);

      setUploadProgress(
        "Creating business account..."
      );

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: finalEmail,
          password,

          options: {
            data: {
              signup_role:
                "business",

              full_name:
                finalContactName,

              company_name:
                finalCompanyName,

              company_registration_number:
                finalRegistrationNumber,

              industry,

              website:
                finalWebsite,

              company_description:
                finalDescription,

              location:
                finalLocation,

              contact_email:
                finalEmail,

              contact_phone:
                finalPhone,

              contact_person_name:
                finalContactName,

              contact_person_job_title:
                finalJobTitle,
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

  /* =======================================================
     UI
  ======================================================= */

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
        showsVerticalScrollIndicator={
          false
        }
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

        <View
          style={styles.iconBox}
        >
          <Ionicons
            name="business"
            size={28}
            color="#fff"
          />
        </View>

        <Text
          style={styles.title}
        >
          Business registration
        </Text>

        <Text
          style={styles.subtitle}
        >
          Register your organisation to
          connect with Richfield talent and
          publish career opportunities.
        </Text>

        <View
          style={styles.notice}
        >
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
            Business accounts are reviewed by
            Richfield before they can access
            the platform.
          </Text>
        </View>

        {/* COMPANY INFORMATION */}

        <Text
          style={styles.sectionTitle}
        >
          Company information
        </Text>

        <FieldLabel
          text="Company name"
        />

        <TextInput
          value={companyName}
          onChangeText={
            handleCompanyNameChange
          }
          placeholder="e.g. TechNova Solutions"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={
            MAX_COMPANY_NAME
          }
          style={[
            styles.input,
            !companyNameIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!companyNameIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a valid company name.
          </Text>
        )}

        <FieldLabel
          text="Company registration number"
        />

        <TextInput
          value={
            registrationNumber
          }
          onChangeText={
            handleRegistrationNumberChange
          }
          placeholder="e.g. 2024/123456/07"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={
            MAX_REGISTRATION_NUMBER
          }
          style={[
            styles.input,
            !registrationIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!registrationIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a valid company registration
            number.
          </Text>
        )}

        <Text
          style={styles.helper}
        >
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
          <View
            style={styles.dropdown}
          >
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
          onChangeText={
            handleWebsiteChange
          }
          placeholder="https://company.co.za"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          maxLength={MAX_WEBSITE}
          style={[
            styles.input,
            !websiteIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!websiteIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a complete website starting
            with https:// or http://
          </Text>
        )}

        <FieldLabel text="Location" />

        <TextInput
          value={location}
          onChangeText={
            handleLocationChange
          }
          placeholder="e.g. Johannesburg, Gauteng"
          autoCapitalize="words"
          maxLength={MAX_LOCATION}
          style={[
            styles.input,
            !locationIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!locationIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a valid company location.
          </Text>
        )}

        <FieldLabel
          text="Company description"
        />

        <TextInput
          value={
            companyDescription
          }
          onChangeText={
            handleDescriptionChange
          }
          placeholder="Tell Richfield what your organisation does..."
          multiline
          textAlignVertical="top"
          maxLength={MAX_DESCRIPTION}
          editable={!loading}
          style={[
            styles.input,
            styles.descriptionInput,
            !descriptionIsValid &&
              styles.errorInput,
          ]}
        />

        {!descriptionIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a meaningful company
            description.
          </Text>
        )}

        <Text
          style={styles.counter}
        >
          {companyDescription.length}/
          {MAX_DESCRIPTION}
        </Text>

        {/* CONTACT PERSON */}

        <Text
          style={styles.sectionTitle}
        >
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
          value={
            contactPersonName
          }
          onChangeText={
            handleContactNameChange
          }
          placeholder="Contact person's full name"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={MAX_CONTACT_NAME}
          style={[
            styles.input,
            !contactNameIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!contactNameIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a valid full name. Numbers
            are not allowed.
          </Text>
        )}

        <FieldLabel text="Job title" />

        <TextInput
          value={
            contactPersonJobTitle
          }
          onChangeText={
            handleJobTitleChange
          }
          placeholder="e.g. HR Manager"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={MAX_JOB_TITLE}
          style={[
            styles.input,
            !jobTitleIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!jobTitleIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a valid job title. Numbers
            are not allowed.
          </Text>
        )}

        <FieldLabel
          text="Business email"
        />

        <TextInput
          value={contactEmail}
          onChangeText={
            handleEmailChange
          }
          placeholder="name@company.co.za"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={MAX_EMAIL}
          style={[
            styles.input,
            !emailIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!emailIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a valid business email.
            Repeated or fake values are not
            accepted.
          </Text>
        )}

        <FieldLabel
          text="Contact number"
        />

        <TextInput
          value={contactPhone}
          onChangeText={
            handlePhoneChange
          }
          placeholder="+27 82 123 4567"
          keyboardType="phone-pad"
          maxLength={MAX_PHONE}
          style={[
            styles.input,
            !phoneIsValid &&
              styles.errorInput,
          ]}
          editable={!loading}
        />

        {!phoneIsValid && (
          <Text
            style={styles.errorText}
          >
            Enter a valid contact number.
            Repeated zeros or fake numbers are
            not accepted.
          </Text>
        )}

        {/* VERIFICATION DOCUMENT */}

        <Text
          style={styles.sectionTitle}
        >
          Verification document
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Upload your official company
          registration document. Richfield
          administrators will use it to verify
          your organisation.
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
              style={styles.documentIcon}
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
                Upload registration document
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
                {registrationDocument.name}
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
            Your document is stored privately
            and is only available to authorised
            Richfield administrators.
          </Text>
        </View>

        {/* ACCOUNT SECURITY */}

        <Text
          style={styles.sectionTitle}
        >
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
          maxLength={128}
          style={[
            styles.input,
            password.length > 0 &&
            !passwordIsStrong
              ? styles.errorInput
              : null,
          ]}
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
              /[A-Z]/.test(password)
            }
            text="Uppercase letter"
          />

          <PasswordRule
            valid={
              /[a-z]/.test(password)
            }
            text="Lowercase letter"
          />

          <PasswordRule
            valid={
              /[0-9]/.test(password)
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

          {password.length > 0 &&
          !passwordValidation.valid ? (
            <Text
              style={
                styles.passwordError
              }
            >
              {passwordValidation.message}
            </Text>
          ) : null}
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
          maxLength={128}
          editable={!loading}
          style={[
            styles.input,
            confirmPassword.length > 0 &&
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

        {/* DECLARATION */}

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

        {/* PROGRESS */}

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

        {/* SUBMIT */}

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
                Submit business application
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

        {/* LOGIN */}

        <View
          style={styles.loginRow}
        >
          <Text
            style={styles.loginText}
          >
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
              style={styles.loginLink}
            >
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   FIELD LABEL
========================================================= */

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

/* =========================================================
   PASSWORD RULE
========================================================= */

function PasswordRule({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <View
      style={styles.ruleRow}
    >
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

/* =========================================================
   STYLES
========================================================= */

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

    passwordError: {
      color: "#D00000",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
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