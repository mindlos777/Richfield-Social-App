import { supabase } from "../lib/supabase";

export type OpportunityType =
  | "internship"
  | "learnership"
  | "part_time"
  | "graduate"
  | "job";

export type WorkMode =
  | "onsite"
  | "hybrid"
  | "remote";

export type StudentCareerProfile = {
  userId: string;
  programme: string;
  skills: string[];
  careerInterests: string[];
};

export type Opportunity = {
  id: string;
  business_id: string;

  title: string;
  description: string;

  opportunity_type: OpportunityType;

  location: string | null;

  work_mode: WorkMode | null;

  required_skills: string[];

  programme_keywords: string[];

  application_url: string | null;

  closing_date: string | null;

  status: string;

  created_at: string;

  company_name: string;

  matchScore: number;

  matchedSkills: string[];

  matchReasons: string[];
};

function normalize(value?: string | null) {
  return (value || "")
    .trim()
    .toLowerCase();
}

function normalizeArray(
  values?: string[] | null
) {
  return (values || [])
    .map(item => normalize(item))
    .filter(Boolean);
}

function uniqueStrings(
  values: string[]
) {
  const seen =
    new Set<string>();

  return values.filter(
    value => {
      const cleaned =
        value.trim();

      if (!cleaned) {
        return false;
      }

      const key =
        cleaned.toLowerCase();

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

function programmeMatches(
  programme: string,
  keywords: string[]
) {
  const userProgramme =
    normalize(programme);

  if (!userProgramme) {
    return false;
  }

  return keywords.some(
    keyword => {
      const value =
        normalize(keyword);

      if (!value) {
        return false;
      }

      return (
        userProgramme.includes(
          value
        ) ||
        value.includes(
          userProgramme
        )
      );
    }
  );
}

export function calculateOpportunityMatch(
  opportunity: any,
  student: StudentCareerProfile
) {
  const studentSkills =
    normalizeArray(
      student.skills
    );

  const requiredSkills =
    normalizeArray(
      opportunity.required_skills
    );

  const programmeKeywords =
    normalizeArray(
      opportunity.programme_keywords
    );

  const matchedSkills =
    requiredSkills.filter(
      skill =>
        studentSkills.some(
          userSkill => {
            return (
              userSkill ===
                skill ||
              userSkill.includes(
                skill
              ) ||
              skill.includes(
                userSkill
              )
            );
          }
        )
    );

  let score = 0;

  const reasons: string[] =
    [];

  // ================= SKILLS =================

  if (
    requiredSkills.length >
    0
  ) {
    const skillPercentage =
      matchedSkills.length /
      requiredSkills.length;

    score +=
      skillPercentage * 70;

    if (
      matchedSkills.length >
      0
    ) {
      reasons.push(
        `${
          matchedSkills.length
        } matching ${
          matchedSkills.length ===
          1
            ? "skill"
            : "skills"
        }`
      );
    }
  } else {
    score += 35;
  }

  // ================= PROGRAMME =================

  const programmeMatch =
    programmeMatches(
      student.programme,
      programmeKeywords
    );

  if (
    programmeKeywords.length >
    0
  ) {
    if (
      programmeMatch
    ) {
      score += 30;

      reasons.push(
        "Matches your programme"
      );
    }
  } else {
    score += 15;
  }

  // ================= CAREER INTEREST =================

  const interests =
    normalizeArray(
      student.careerInterests
    );

  const searchableText =
    normalize(
      `
      ${opportunity.title}
      ${opportunity.description}
      ${opportunity.opportunity_type}
      `
    );

  const interestMatch =
    interests.some(
      interest =>
        searchableText.includes(
          interest
        )
    );

  if (
    interestMatch
  ) {
    score += 5;

    reasons.push(
      "Matches a career interest"
    );
  }

  score = Math.min(
    Math.round(score),
    100
  );

  if (
    reasons.length === 0
  ) {
    reasons.push(
      "Explore this opportunity"
    );
  }

  return {
    score,
    matchedSkills,
    reasons,
  };
}

// =====================================================
// CURRENT USER CAREER PROFILE
//
// Kept as getStudentCareerProfile so the existing
// OpportunitiesScreen does not need to change.
//
// Supports:
// - Student
// - Alumni
// =====================================================

export async function getStudentCareerProfile(): Promise<StudentCareerProfile> {
  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError
  ) {
    throw authError;
  }

  const user =
    authData.user;

  if (
    !user
  ) {
    throw new Error(
      "You must be signed in."
    );
  }

  // ================= USER ROLE =================

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        `
        id,
        role,
        status
        `
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError
  ) {
    throw profileError;
  }

  if (
    !profile
  ) {
    throw new Error(
      "Your Richfield profile could not be found."
    );
  }

  if (
    profile.status !==
    "active"
  ) {
    throw new Error(
      "Your account is not currently active."
    );
  }

  if (
    profile.role !==
      "student" &&
    profile.role !==
      "alumni"
  ) {
    throw new Error(
      "Career opportunities are available to students and alumni."
    );
  }

  // =====================================================
  // STUDENT
  // =====================================================

  if (
    profile.role ===
    "student"
  ) {
    const {
      data:
        studentProfile,
      error:
        studentError,
    } =
      await supabase
        .from(
          "student_profiles"
        )
        .select(
          `
          programme,
          skills,
          career_interests
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      studentError
    ) {
      throw studentError;
    }

    if (
      !studentProfile
    ) {
      console.log(
        "Student profile row not found:",
        user.id
      );

      return {
        userId:
          user.id,

        programme:
          "",

        skills:
          [],

        careerInterests:
          [],
      };
    }

    return {
      userId:
        user.id,

      programme:
        studentProfile.programme ||
        "",

      skills:
        Array.isArray(
          studentProfile.skills
        )
          ? studentProfile.skills
          : [],

      careerInterests:
        Array.isArray(
          studentProfile.career_interests
        )
          ? studentProfile.career_interests
          : [],
    };
  }

  // =====================================================
  // ALUMNI
  // =====================================================

  const {
    data: alumniProfile,
    error: alumniError,
  } =
    await supabase
      .from(
        "alumni_profiles"
      )
      .select(
        `
        programme,
        current_company,
        current_job_title
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    alumniError
  ) {
    throw alumniError;
  }

  // =====================================================
  // ALUMNI PORTFOLIO SKILLS
  //
  // Alumni profiles do not currently have a dedicated
  // skills column, so portfolio skills are used for
  // opportunity matching.
  // =====================================================

  const {
    data:
      portfolioRows,
    error:
      portfolioError,
  } =
    await supabase
      .from(
        "portfolio_items"
      )
      .select(
        "skills"
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    portfolioError
  ) {
    console.log(
      "Alumni portfolio skills error:",
      portfolioError
    );
  }

  const portfolioSkills =
    (
      portfolioRows ||
      []
    ).flatMap(
      item =>
        Array.isArray(
          item.skills
        )
          ? item.skills
          : []
    );

  // =====================================================
  // ALUMNI CAREER INTERESTS
  //
  // We can safely use their current role/company as
  // additional matching context without requiring
  // student_profiles.
  // =====================================================

  const alumniCareerContext =
    [
      alumniProfile
        ?.current_job_title,

      alumniProfile
        ?.current_company,
    ].filter(
      (
        value
      ): value is string =>
        Boolean(
          value?.trim()
        )
    );

  return {
    userId:
      user.id,

    programme:
      alumniProfile
        ?.programme ||
      "",

    skills:
      uniqueStrings(
        portfolioSkills
      ),

    careerInterests:
      uniqueStrings(
        alumniCareerContext
      ),
  };
}

// =====================================================
// APPROVED OPPORTUNITIES
// =====================================================

export async function getApprovedOpportunities(
  student: StudentCareerProfile
): Promise<
  Opportunity[]
> {
  const today =
    new Date()
      .toISOString()
      .split(
        "T"
      )[0];

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "opportunities"
      )
      .select(
        `
        id,
        business_id,
        title,
        description,
        opportunity_type,
        location,
        work_mode,
        required_skills,
        programme_keywords,
        application_url,
        closing_date,
        status,
        created_at
        `
      )
      .eq(
        "status",
        "approved"
      )
      .or(
        `closing_date.is.null,closing_date.gte.${today}`
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (
    error
  ) {
    throw error;
  }

  const rows =
    data || [];

  const businessIds =
    [
      ...new Set(
        rows
          .map(
            item =>
              item.business_id
          )
          .filter(
            Boolean
          )
      ),
    ];

  let businessMap:
    Record<
      string,
      string
    > = {};

  if (
    businessIds.length >
    0
  ) {
    const {
      data:
        businesses,
      error:
        businessError,
    } =
      await supabase
        .from(
          "business_profiles"
        )
        .select(
          `
          user_id,
          organisation_name
          `
        )
        .in(
          "user_id",
          businessIds
        );

    if (
      businessError
    ) {
      console.log(
        "Business profile error:",
        businessError
      );
    }

    businessMap =
      (
        businesses ||
        []
      ).reduce(
        (
          accumulator,
          business
        ) => {
          accumulator[
            business.user_id
          ] =
            business
              .organisation_name ||
            "Company";

          return accumulator;
        },
        {} as Record<
          string,
          string
        >
      );
  }

  const opportunities =
    rows.map(
      item => {
        const match =
          calculateOpportunityMatch(
            item,
            student
          );

        return {
          ...item,

          company_name:
            businessMap[
              item.business_id
            ] ||
            "Organisation",

          required_skills:
            item.required_skills ||
            [],

          programme_keywords:
            item.programme_keywords ||
            [],

          matchScore:
            match.score,

          matchedSkills:
            match.matchedSkills,

          matchReasons:
            match.reasons,
        } as Opportunity;
      }
    );

  return opportunities.sort(
    (
      a,
      b
    ) =>
      b.matchScore -
      a.matchScore
  );
}