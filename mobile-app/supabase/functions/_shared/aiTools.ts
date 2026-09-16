export type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

type SupabaseAdmin =
  any;

type ToolResult = {
  ok: boolean;
  tool: string;
  data?: any;
  error?: string;
};

/* =========================================================
   SMALL HELPERS
========================================================= */

function cleanString(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const result =
    value.trim();

  return result ||
    null;
}

function cleanArray(
  value: unknown
): string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .filter(
      item =>
        typeof item ===
        "string"
    )
    .map(
      item =>
        item.trim()
    )
    .filter(Boolean);
}

function normalise(
  value:
    string | null | undefined
) {
  return (
    value || ""
  )
    .toLowerCase()
    .trim();
}

function calculateOverlap(
  first: string[],
  second: string[]
) {
  const a =
    first.map(
      normalise
    );

  const b =
    second.map(
      normalise
    );

  let matches = 0;

  for (
    const item of a
  ) {
    if (
      !item
    ) {
      continue;
    }

    if (
      b.some(
        other =>
          other.includes(
            item
          ) ||
          item.includes(
            other
          )
      )
    ) {
      matches += 1;
    }
  }

  return matches;
}

/* =========================================================
   GET MY PROFILE
========================================================= */

export async function
getMyProfile(
  adminClient:
    SupabaseAdmin,
  userId:
    string,
  role:
    UserRole
): Promise<ToolResult> {
  try {
    const {
      data:
        profile,

      error:
        profileError,
    } =
      await adminClient
        .from(
          "profiles"
        )
        .select(`
          id,
          full_name,
          username,
          headline,
          bio,
          avatar_url,
          role,
          linkedin_url,
          github_url,
          instagram_url,
          website_url
        `)
        .eq(
          "id",
          userId
        )
        .single();

    if (
      profileError ||
      !profile
    ) {
      return {
        ok:
          false,

        tool:
          "get_my_profile",

        error:
          "Profile could not be loaded.",
      };
    }

    let roleData:
      any = null;

    if (
      role ===
      "student"
    ) {
      const {
        data,
      } =
        await adminClient
          .from(
            "student_profiles"
          )
          .select(`
            programme,
            campus,
            skills,
            career_interests
          `)
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      roleData =
        data || null;
    }

    /*
     * We deliberately don't send auth details,
     * email addresses, phone numbers, tokens,
     * private IDs or other secrets to the AI.
     */

    return {
      ok:
        true,

      tool:
        "get_my_profile",

      data: {
        fullName:
          cleanString(
            profile.full_name
          ),

        username:
          cleanString(
            profile.username
          ),

        headline:
          cleanString(
            profile.headline
          ),

        bio:
          cleanString(
            profile.bio
          ),

        hasProfilePhoto:
          Boolean(
            profile.avatar_url
          ),

        role:
          profile.role,

        links: {
          linkedin:
            cleanString(
              profile.linkedin_url
            ),

          github:
            cleanString(
              profile.github_url
            ),

          instagram:
            cleanString(
              profile.instagram_url
            ),

          website:
            cleanString(
              profile.website_url
            ),
        },

        student:
          role ===
          "student"
            ? {
                programme:
                  cleanString(
                    roleData
                      ?.programme
                  ),

                campus:
                  cleanString(
                    roleData
                      ?.campus
                  ),

                skills:
                  cleanArray(
                    roleData
                      ?.skills
                  ),

                careerInterests:
                  cleanArray(
                    roleData
                      ?.career_interests
                  ),
              }
            : null,
      },
    };
  } catch (
    error
  ) {
    console.error(
      "getMyProfile error:",
      error
    );

    return {
      ok:
        false,

      tool:
        "get_my_profile",

      error:
        "Profile tool failed.",
    };
  }
}

/* =========================================================
   PROFILE STRENGTH
========================================================= */

export async function
getMyProfileStrength(
  adminClient:
    SupabaseAdmin,
  userId:
    string,
  role:
    UserRole
): Promise<ToolResult> {
  const profileResult =
    await getMyProfile(
      adminClient,
      userId,
      role
    );

  if (
    !profileResult.ok ||
    !profileResult.data
  ) {
    return {
      ok:
        false,

      tool:
        "get_my_profile_strength",

      error:
        "Profile strength could not be calculated.",
    };
  }

  const profile =
    profileResult.data;

  const checks = [
    {
      key:
        "name",

      label:
        "Full name",

      weight:
        10,

      complete:
        Boolean(
          profile.fullName
        ),
    },

    {
      key:
        "photo",

      label:
        "Profile photo",

      weight:
        15,

      complete:
        Boolean(
          profile.hasProfilePhoto
        ),
    },

    {
      key:
        "headline",

      label:
        "Professional headline",

      weight:
        10,

      complete:
        Boolean(
          profile.headline
        ),
    },

    {
      key:
        "bio",

      label:
        "Professional summary",

      weight:
        15,

      complete:
        Boolean(
          profile.bio
        ),
    },

    {
      key:
        "linkedin",

      label:
        "LinkedIn",

      weight:
        10,

      complete:
        Boolean(
          profile.links
            ?.linkedin
        ),
    },

    {
      key:
        "github",

      label:
        "GitHub",

      weight:
        10,

      complete:
        Boolean(
          profile.links
            ?.github
        ),
    },

    {
      key:
        "website",

      label:
        "Portfolio / website",

      weight:
        5,

      complete:
        Boolean(
          profile.links
            ?.website
        ),
    },

    {
      key:
        "programme",

      label:
        "Programme",

      weight:
        10,

      complete:
        role !==
          "student"
          ? true
          : Boolean(
              profile.student
                ?.programme
            ),
    },

    {
      key:
        "campus",

      label:
        "Campus",

      weight:
        5,

      complete:
        role !==
          "student"
          ? true
          : Boolean(
              profile.student
                ?.campus
            ),
    },

    {
      key:
        "skills",

      label:
        "Skills",

      weight:
        10,

      complete:
        role !==
          "student"
          ? true
          : (
              profile.student
                ?.skills
                ?.length ||
              0
            ) >
            0,
    },
  ];

  const relevantChecks =
    role ===
    "student"
      ? checks
      : checks.filter(
          check =>
            ![
              "programme",
              "campus",
              "skills",
            ].includes(
              check.key
            )
        );

  const maxScore =
    relevantChecks
      .reduce(
        (
          total,
          check
        ) =>
          total +
          check.weight,
        0
      );

  const earned =
    relevantChecks
      .filter(
        check =>
          check.complete
      )
      .reduce(
        (
          total,
          check
        ) =>
          total +
          check.weight,
        0
      );

  const score =
    maxScore >
    0
      ? Math.round(
          (
            earned /
            maxScore
          ) *
            100
        )
      : 0;

  const missing =
    relevantChecks
      .filter(
        check =>
          !check.complete
      )
      .map(
        check =>
          check.label
      );

  const completed =
    relevantChecks
      .filter(
        check =>
          check.complete
      )
      .map(
        check =>
          check.label
      );

  return {
    ok:
      true,

    tool:
      "get_my_profile_strength",

    data: {
      score,

      completed,

      missing,

      strongestNextStep:
        missing[0] ||
        null,
    },
  };
}

/* =========================================================
   MATCHING OPPORTUNITIES
========================================================= */

export async function
findMatchingOpportunities(
  adminClient:
    SupabaseAdmin,
  userId:
    string,
  role:
    UserRole,
  requestedLimit = 5
): Promise<ToolResult> {
  if (
    role !==
      "student" &&
    role !==
      "admin"
  ) {
    return {
      ok:
        false,

      tool:
        "find_matching_opportunities",

      error:
        "Opportunity matching is currently available to students.",
    };
  }

  try {
    const {
      data:
        student,
    } =
      await adminClient
        .from(
          "student_profiles"
        )
        .select(`
          programme,
          skills,
          career_interests
        `)
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (
      !student &&
      role ===
        "student"
    ) {
      return {
        ok:
          false,

        tool:
          "find_matching_opportunities",

        error:
          "Student profile is incomplete.",
      };
    }

    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    const {
      data:
        opportunities,

      error,
    } =
      await adminClient
        .from(
          "opportunities"
        )
        .select(`
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
          created_at
        `)
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
        )
        .limit(
          50
        );

    if (error) {
      console.error(
        "Opportunity query error:",
        error
      );

      return {
        ok:
          false,

        tool:
          "find_matching_opportunities",

        error:
          "Opportunities could not be loaded.",
      };
    }

    const programme =
      normalise(
        student
          ?.programme
      );

    const skills =
      cleanArray(
        student
          ?.skills
      );

    const interests =
      cleanArray(
        student
          ?.career_interests
      );

    const ranked =
      (
        opportunities ||
        []
      )
        .map(
          (
            opportunity:
              any
          ) => {
            let score =
              0;

            const reasons:
              string[] = [];

            const programmeKeywords =
              cleanArray(
                opportunity
                  .programme_keywords
              );

            const requiredSkills =
              cleanArray(
                opportunity
                  .required_skills
              );

            if (
              programme &&
              programmeKeywords
                .some(
                  keyword => {
                    const value =
                      normalise(
                        keyword
                      );

                    return (
                      programme.includes(
                        value
                      ) ||
                      value.includes(
                        programme
                      )
                    );
                  }
                )
            ) {
              score +=
                45;

              reasons.push(
                "Programme match"
              );
            }

            const skillMatches =
              calculateOverlap(
                skills,
                requiredSkills
              );

            if (
              skillMatches >
              0
            ) {
              score +=
                Math.min(
                  skillMatches *
                    15,
                  45
                );

              reasons.push(
                `${skillMatches} skill match${
                  skillMatches ===
                  1
                    ? ""
                    : "es"
                }`
              );
            }

            const text =
              normalise(
                `${opportunity.title} ${opportunity.description}`
              );

            const interestMatches =
              interests.filter(
                interest =>
                  text.includes(
                    normalise(
                      interest
                    )
                  )
              ).length;

            if (
              interestMatches >
              0
            ) {
              score +=
                Math.min(
                  interestMatches *
                    5,
                  10
                );

              reasons.push(
                "Career interest match"
              );
            }

            /*
             * A listing still appears with a low score
             * if we do not yet have enough profile data.
             */

            if (
              score ===
              0
            ) {
              score =
                1;
            }

            return {
              id:
                opportunity.id,

              title:
                opportunity.title,

              type:
                opportunity
                  .opportunity_type,

              location:
                opportunity.location,

              workMode:
                opportunity
                  .work_mode,

              requiredSkills,

              closingDate:
                opportunity
                  .closing_date,

              applicationUrl:
                opportunity
                  .application_url,

              matchScore:
                Math.min(
                  score,
                  100
                ),

              reasons,
            };
          }
        )
        .sort(
          (
            a: {
              matchScore:
                number;
            },
            b: {
              matchScore:
                number;
            }
          ) =>
            b.matchScore -
            a.matchScore
        );

    const limit =
      Math.min(
        Math.max(
          Number(
            requestedLimit
          ) ||
            5,
          1
        ),
        10
      );

    return {
      ok:
        true,

      tool:
        "find_matching_opportunities",

      data: {
        programme:
          student
            ?.programme ||
          null,

        skills,

        results:
          ranked.slice(
            0,
            limit
          ),
      },
    };
  } catch (
    error
  ) {
    console.error(
      "findMatchingOpportunities error:",
      error
    );

    return {
      ok:
        false,

      tool:
        "find_matching_opportunities",

      error:
        "Opportunity matching failed.",
    };
  }
}

/* =========================================================
   UPCOMING EVENTS
========================================================= */

export async function
getUpcomingEvents(
  adminClient:
    SupabaseAdmin,
  userId:
    string,
  role:
    UserRole,
  requestedLimit = 5
): Promise<ToolResult> {
  try {
    let programme:
      string | null =
      null;

    if (
      role ===
      "student"
    ) {
      const {
        data:
          student,
      } =
        await adminClient
          .from(
            "student_profiles"
          )
          .select(
            "programme"
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      programme =
        student
          ?.programme ||
        null;
    }

    const {
      data:
        events,

      error,
    } =
      await adminClient
        .from(
          "events"
        )
        .select(`
          id,
          title,
          description,
          event_type,
          location,
          starts_at,
          ends_at,
          registration_url,
          relevant_programmes,
          relevant_roles
        `)
        .eq(
          "status",
          "published"
        )
        .gte(
          "starts_at",
          new Date()
            .toISOString()
        )
        .order(
          "starts_at",
          {
            ascending:
              true,
          }
        )
        .limit(
          30
        );

    if (error) {
      return {
        ok:
          false,

        tool:
          "get_upcoming_events",

        error:
          "Events could not be loaded.",
      };
    }

    const relevant =
      (
        events ||
        []
      )
        .map(
          (
            event:
              any
          ) => {
            let relevance =
              0;

            const reasons:
              string[] =
              [];

            const roles =
              cleanArray(
                event
                  .relevant_roles
              );

            const programmes =
              cleanArray(
                event
                  .relevant_programmes
              );

            if (
              roles.length ===
              0
            ) {
              relevance +=
                10;

              reasons.push(
                "Open to all users"
              );
            } else if (
              roles.includes(
                role
              )
            ) {
              relevance +=
                40;

              reasons.push(
                "Relevant to your role"
              );
            }

            if (
              programme &&
              programmes
                .some(
                  item => {
                    const a =
                      normalise(
                        item
                      );

                    const b =
                      normalise(
                        programme
                      );

                    return (
                      a.includes(
                        b
                      ) ||
                      b.includes(
                        a
                      )
                    );
                  }
                )
            ) {
              relevance +=
                60;

              reasons.push(
                "Relevant to your programme"
              );
            } else if (
              programmes.length ===
              0
            ) {
              relevance +=
                10;
            }

            return {
              id:
                event.id,

              title:
                event.title,

              description:
                event.description,

              type:
                event
                  .event_type,

              location:
                event.location,

              startsAt:
                event
                  .starts_at,

              endsAt:
                event
                  .ends_at,

              registrationUrl:
                event
                  .registration_url,

              relevance,

              reasons,
            };
          }
        )
        .filter(
          (event: {
            relevance:
              number;
          }) =>
            event.relevance >
            0
        )
        .sort(
          (
            a: {
              relevance: number;
              startsAt: string;
            },
            b: {
              relevance: number;
              startsAt: string;
            }
          ) =>
            b.relevance -
              a.relevance ||
            new Date(
              a.startsAt
            ).getTime() -
              new Date(
                b.startsAt
              ).getTime()
        );

    const limit =
      Math.min(
        Math.max(
          Number(
            requestedLimit
          ) ||
            5,
          1
        ),
        10
      );

    return {
      ok:
        true,

      tool:
        "get_upcoming_events",

      data: {
        results:
          relevant.slice(
            0,
            limit
          ),
      },
    };
  } catch (
    error
  ) {
    console.error(
      "getUpcomingEvents error:",
      error
    );

    return {
      ok:
        false,

      tool:
        "get_upcoming_events",

      error:
        "Event tool failed.",
    };
  }
}

/* =========================================================
   TOOL DECLARATIONS FOR GEMINI
========================================================= */

export const
GEMINI_AI_TOOLS = [
  {
    name:
      "get_my_profile",

    description:
      "Reads the authenticated user's own Richfield Connect professional profile. Use when the user asks what is on their profile, what is missing, or asks for profile-specific advice.",

    parameters: {
      type:
        "OBJECT",

      properties: {},
    },
  },

  {
    name:
      "get_my_profile_strength",

    description:
      "Calculates the authenticated user's real profile completeness score and missing profile sections. Use when the user asks about profile completeness, profile strength, what is missing, or what to improve next.",

    parameters: {
      type:
        "OBJECT",

      properties: {},
    },
  },

  {
    name:
      "find_matching_opportunities",

    description:
      "Finds approved Richfield opportunities that match the authenticated student's programme, skills and career interests. Use for internships, learnerships, jobs, graduate opportunities or matching vacancies.",

    parameters: {
      type:
        "OBJECT",

      properties: {
        limit: {
          type:
            "INTEGER",

          description:
            "Maximum number of opportunities to return, between 1 and 10.",
        },
      },
    },
  },

  {
    name:
      "get_upcoming_events",

    description:
      "Returns real upcoming published Richfield events relevant to the authenticated user's role or programme.",

    parameters: {
      type:
        "OBJECT",

      properties: {
        limit: {
          type:
            "INTEGER",

          description:
            "Maximum number of upcoming events to return, between 1 and 10.",
        },
      },
    },
  },
];

/* =========================================================
   TOOL EXECUTOR
========================================================= */

export async function
executeAITool(
  adminClient:
    SupabaseAdmin,
  userId:
    string,
  role:
    UserRole,
  name:
    string,
  args:
    Record<
      string,
      any
    > = {}
): Promise<ToolResult> {
  switch (name) {
    case "get_my_profile":
      return getMyProfile(
        adminClient,
        userId,
        role
      );

    case "get_my_profile_strength":
      return getMyProfileStrength(
        adminClient,
        userId,
        role
      );

    case "find_matching_opportunities":
      return findMatchingOpportunities(
        adminClient,
        userId,
        role,
        args?.limit
      );

    case "get_upcoming_events":
      return getUpcomingEvents(
        adminClient,
        userId,
        role,
        args?.limit
      );

    default:
      return {
        ok:
          false,

        tool:
          name,

        error:
          "Tool is not approved.",
      };
  }
}