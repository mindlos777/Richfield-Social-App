/* =========================================================
   BASIC CLEANING
========================================================= */

export function cleanSingleLine(
  value: string,
  maxLength = 120
) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function cleanMultiline(
  value: string,
  maxLength = 1500
) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function cleanEmail(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s/g, "")
    .slice(0, 254);
}

/* =========================================================
   PERSON NAME
========================================================= */

export function cleanPersonName(
  value: string
) {
  return value
    .replace(/[^\p{L}\p{M}' -]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function isValidPersonName(
  value: string
) {
  const name =
    cleanPersonName(value);

  if (
    name.length < 2 ||
    name.length > 100
  ) {
    return false;
  }

  const nameRegex =
    /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;

  return nameRegex.test(name);
}

/* =========================================================
   EMAIL
========================================================= */

export function isValidEmail(
  value: string
) {
  const email =
    cleanEmail(value);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

/* =========================================================
   RICHFIELD EMAIL
========================================================= */

export function isStudentEmail(
  value: string
) {
  const email =
    cleanEmail(value);

  return email.endsWith(
    "@my.richfield.ac.za"
  );
}

export function isStaffEmail(
  value: string
) {
  const email =
    cleanEmail(value);

  return email.endsWith(
    "@richfield.ac.za"
  );
}

/* =========================================================
   IDENTIFIER
========================================================= */

export function getEmailIdentifier(
  value: string
) {
  const email =
    cleanEmail(value);

  return email.split("@")[0] || "";
}

export function hasFakeIdentifier(
  value: string
) {
  const identifier =
    getEmailIdentifier(value);

  if (!identifier) {
    return true;
  }

  // 00000000, 11111111, etc.
  if (/^(\d)\1{7,}$/.test(identifier)) {
    return true;
  }

  // Identifier consisting entirely of zeros.
  if (/^0+$/.test(identifier)) {
    return true;
  }

  return false;
}

/* =========================================================
   STUDENT EMAIL VALIDATION
========================================================= */

export function validateStudentEmail(
  value: string
) {
  const email =
    cleanEmail(value);

  if (!isValidEmail(email)) {
    return {
      valid: false,
      message:
        "Please enter a valid email address.",
    };
  }

  if (!isStudentEmail(email)) {
    return {
      valid: false,
      message:
        "Students must use their @my.richfield.ac.za email address.",
    };
  }

  if (hasFakeIdentifier(email)) {
    return {
      valid: false,
      message:
        "Please enter your valid Richfield student email address.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

/* =========================================================
   STAFF EMAIL VALIDATION
========================================================= */

export function validateStaffEmail(
  value: string
) {
  const email =
    cleanEmail(value);

  if (!isValidEmail(email)) {
    return {
      valid: false,
      message:
        "Please enter a valid email address.",
    };
  }

  if (!isStaffEmail(email)) {
    return {
      valid: false,
      message:
        "Staff must use their @richfield.ac.za email address.",
    };
  }

  if (hasFakeIdentifier(email)) {
    return {
      valid: false,
      message:
        "Please enter your valid Richfield staff email address.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

/* =========================================================
   PASSWORD
========================================================= */

export function validatePassword(
  password: string
) {
  if (password.length < 8) {
    return {
      valid: false,
      message:
        "Password must contain at least 8 characters.",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message:
        "Password is too long.",
    };
  }

  if (/^\s+$/.test(password)) {
    return {
      valid: false,
      message:
        "Password cannot contain only spaces.",
    };
  }

  // 00000000, 11111111, aaaaaaaa
  if (/^(.)\1{7,}$/.test(password)) {
    return {
      valid: false,
      message:
        "Password is too easy to guess.",
    };
  }

  const commonPasswords = [
    "password",
    "password1",
    "password123",
    "12345678",
    "123456789",
    "87654321",
    "qwerty123",
  ];

  if (
    commonPasswords.includes(
      password.toLowerCase()
    )
  ) {
    return {
      valid: false,
      message:
        "This password is too common. Please choose a stronger password.",
    };
  }

  const hasLetter =
    /[A-Za-z]/.test(password);

  const hasNumber =
    /\d/.test(password);

  if (
    !hasLetter ||
    !hasNumber
  ) {
    return {
      valid: false,
      message:
        "Password must contain at least one letter and one number.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

/* =========================================================
   USERNAME
========================================================= */

export function cleanUsername(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
}

export function validateUsername(
  value: string
) {
  const username =
    cleanUsername(value);

  if (username.length < 3) {
    return {
      valid: false,
      message:
        "Username must contain at least 3 characters.",
    };
  }

  if (username.length > 30) {
    return {
      valid: false,
      message:
        "Username cannot exceed 30 characters.",
    };
  }

  if (/^\d+$/.test(username)) {
    return {
      valid: false,
      message:
        "Username cannot contain only numbers.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

/* =========================================================
   PHONE
========================================================= */

export function cleanPhone(
  value: string
) {
  return value
    .replace(/[^0-9+\-()\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

export function validatePhone(
  value: string
) {
  const phone =
    cleanPhone(value);

  if (!phone) {
    return {
      valid: true,
      message: "",
    };
  }

  const digits =
    phone.replace(/\D/g, "");

  if (
    digits.length < 7 ||
    digits.length > 15
  ) {
    return {
      valid: false,
      message:
        "Please enter a valid phone number.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

/* =========================================================
   WEBSITE
========================================================= */

export function cleanWebsite(
  value: string
) {
  return value
    .trim()
    .replace(/\s/g, "")
    .slice(0, 300);
}

export function validateWebsite(
  value: string
) {
  const website =
    cleanWebsite(value);

  if (!website) {
    return {
      valid: true,
      message: "",
    };
  }

  try {
    const normalised =
      website.startsWith("http://") ||
      website.startsWith("https://")
        ? website
        : `https://${website}`;

    const url =
      new URL(normalised);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return {
        valid: false,
        message:
          "Please enter a valid website.",
      };
    }

    return {
      valid: true,
      message: "",
    };
  } catch {
    return {
      valid: false,
      message:
        "Please enter a valid website.",
    };
  }
}