import { supabase } from "../lib/supabase";

export type ProfileCompletionResult = {
  percentage: number;
  completed: number;
  total: number;
  missing: string[];
  isComplete: boolean;
};

function hasValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

export async function getProfileCompletion(): Promise<ProfileCompletionResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      full_name,
      username,
      role,
      headline,
      bio,
      avatar_url,
      linkedin_url,
      github_url,
      instagram_url,
      website_url
    `)
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  const role = String(
    profile.role || ""
  ).toLowerCase();

  if (
    role !== "student" &&
    role !== "alumni"
  ) {
    return {
      percentage: 100,
      completed: 0,
      total: 0,
      missing: [],
      isComplete: true,
    };
  }

  const {
    data: cv,
    error: cvError,
  } = await supabase
    .from("user_cvs")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cvError) {
    throw cvError;
  }

  const hasSocial =
    hasValue(profile.linkedin_url) ||
    hasValue(profile.github_url) ||
    hasValue(profile.instagram_url) ||
    hasValue(profile.website_url);

  const checks: {
    label: string;
    complete: boolean;
  }[] = [
    {
      label: "Profile photo",
      complete: hasValue(
        profile.avatar_url
      ),
    },
    {
      label: "Full name",
      complete: hasValue(
        profile.full_name
      ),
    },
    {
      label: "Username",
      complete: hasValue(
        profile.username
      ),
    },
    {
      label: "Headline",
      complete: hasValue(
        profile.headline
      ),
    },
    {
      label: "Bio",
      complete: hasValue(
        profile.bio
      ),
    },
  ];

  if (role === "student") {
    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("student_profiles")
      .select(`
        programme,
        campus,
        year_of_study
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (studentError) {
      throw studentError;
    }

    checks.push(
      {
        label: "Programme",
        complete: hasValue(
          student?.programme
        ),
      },
      {
        label: "Campus",
        complete: hasValue(
          student?.campus
        ),
      },
      {
        label: "Year of study",
        complete: hasValue(
          student?.year_of_study
        ),
      }
    );
  }

  if (role === "alumni") {
    const {
      data: alumni,
      error: alumniError,
    } = await supabase
      .from("alumni_profiles")
      .select(`
        programme,
        campus,
        graduation_year,
        current_company,
        current_job_title
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (alumniError) {
      throw alumniError;
    }

    checks.push(
      {
        label: "Programme",
        complete: hasValue(
          alumni?.programme
        ),
      },
      {
        label: "Campus",
        complete: hasValue(
          alumni?.campus
        ),
      },
      {
        label: "Graduation year",
        complete: hasValue(
          alumni?.graduation_year
        ),
      },
      {
        label: "Current career information",
        complete:
          hasValue(
            alumni?.current_job_title
          ) ||
          hasValue(
            alumni?.current_company
          ),
      }
    );
  }

  checks.push(
    {
      label: "CV",
      complete: Boolean(cv),
    },
    {
      label: "Professional or social link",
      complete: hasSocial,
    }
  );

  const completed =
    checks.filter(
      item => item.complete
    ).length;

  const total = checks.length;

  const percentage =
    total === 0
      ? 100
      : Math.round(
          (completed / total) * 100
        );

  const missing =
    checks
      .filter(
        item => !item.complete
      )
      .map(
        item => item.label
      );

  return {
    percentage,
    completed,
    total,
    missing,
    isComplete:
      percentage === 100,
  };
}