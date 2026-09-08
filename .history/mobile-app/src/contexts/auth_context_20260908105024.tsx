import { supabase } from '../lib/supabase';

const RICHFIELD_EMAIL_DOMAINS = [
  '@my.richfield.ac.za',
  '@richfield.ac.za',
  '@my.aaa.ac.za',
  '@aaa.ac.za',
];

export const isRichfieldEmail = (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();

  return RICHFIELD_EMAIL_DOMAINS.some(domain =>
    normalizedEmail.endsWith(domain)
  );
};

export const signIn = async (
  email: string,
  password: string
) => {
  const { data, error } = await supabase.auth.signInWithPassword({
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
  fullName: string
) => {
  if (!isRichfieldEmail(email)) {
    throw new Error(
      'Students must register using a valid Richfield or AAA institutional email.'
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'student',
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
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'alumni',
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    data,
    studentNumber,
    programme,
    campus,
    graduationYear,
  };
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
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'business',
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    data,
    companyName,
    industry,
    website,
    location,
    description,
  };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};