import { supabase } from "../lib/supabase";

const STUDENT_EMAIL_DOMAINS = [
  "@my.richfield.ac.za",
  "@my.aaa.ac.za",
];

const STAFF_EMAIL_DOMAINS = [
  "@richfield.ac.za",
  "@aaa.ac.za",
];

export const isStudentEmail = (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  return STUDENT_EMAIL_DOMAINS.some((domain) =>
    normalizedEmail.endsWith(domain)
  );
};

export const isStaffEmail = (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  return STAFF_EMAIL_DOMAINS.some((domain) =>
    normalizedEmail.endsWith(domain)
  );
};

export const signIn = async (
  email: string,
  password: string
) => {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

  if (error) {
    throw error;
  }

  return data;
};

export const signUpStudent = async (
  email: string,
  password: string,
  fullName: string,
  studentNumber: string,
  programme: string,
  campus: string,
  yearOfStudy: number
) => {
  if (!isStudentEmail(email)) {
    throw new Error(
      "Students must use a valid Richfield or AAA student email."
    );
  }

  const { data, error } =
    await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),

          signup_role: "student",

          student_number: studentNumber,

          programme,

          campus,

          year_of_study: yearOfStudy,
        },
      },
    });

  if (error) {
    throw error;
  }

  return data;
};

export const signUpAlumni = async (
  email: string,
  password: string,
  fullName: string,
  studentNumber: string,
  programme: string,
  campus: string,
  graduationYear: number
) => {
  const { data, error } =
    await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),

          signup_role: "alumni",

          student_number: studentNumber,

          programme,

          campus,

          graduation_year: graduationYear,
        },
      },
    });

  if (error) {
    throw error;
  }

  return data;
};

export const signUpBusiness = async (
  email: string,
  password: string,
  fullName: string,
  companyName: string,
  industry: string,
  website: string,
  location: string,
  description: string
) => {
  const { data, error } =
    await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),

          signup_role: "business",

          company_name: companyName,

          industry,

          website,

          location,

          description,
        },
      },
    });

  if (error) {
    throw error;
  }

  return data;
};

export const signOut = async () => {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};