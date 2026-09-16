import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

type CommunityRole = "student" | "alumni";

type ViewerRole =
  | "student"
  | "alumni"
  | "staff"
  | "business"
  | "admin";

type RequestStatus =
  | "none"
  | "sent_pending"
  | "received_pending"
  | "accepted";

type Member = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: CommunityRole;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  programme: string;
  campus: string;
  year_of_study: number | null;
  graduation_year: number | null;
  current_company: string;
  current_job_title: string;
  verified: boolean;
};

type SkillItem = {
  skill: string;
  count: number;
  endorsedByMe: boolean;
};

type Recommendation = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: string | null;
};

export default function MemberProfileScreen() {
  const params = useLocalSearchParams<{
    userId?: string | string[];
  }>();

  const memberId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const [me, setMe] = useState<string | null>(null);

  const [myRole, setMyRole] =
    useState<ViewerRole | null>(null);

  const [member, setMember] =
    useState<Member | null>(null);

  const [skills, setSkills] =
    useState<SkillItem[]>([]);

  const [recommendations, setRecommendations] =
    useState<Recommendation[]>([]);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [followLoading, setFollowLoading] =
    useState(false);

  const [endorseLoading, setEndorseLoading] =
    useState<string | null>(null);

  const [requestStatus, setRequestStatus] =
    useState<RequestStatus>("none");

  const [requestId, setRequestId] =
    useState<string | null>(null);

  const [conversationId, setConversationId] =
    useState<string | null>(null);

  const [connectionLoading, setConnectionLoading] =
    useState(false);

  const [
    recommendationVisible,
    setRecommendationVisible,
  ] = useState(false);

  const [
    recommendationText,
    setRecommendationText,
  ] = useState("");

  const [
    recommendationSaving,
    setRecommendationSaving,
  ] = useState(false);

  const canInteract =
    myRole === "student" ||
    myRole === "alumni";

  const isStaff = myRole === "staff";

  const loadRelationship = useCallback(
    async (
      currentUserId: string,
      targetId: string,
      currentRole: ViewerRole
    ) => {
      setRequestStatus("none");
      setRequestId(null);
      setConversationId(null);

      /*
       * Staff bypass connection requests.
       * The server still checks that the
       * Staff account is active + verified.
       */
      if (currentRole === "staff") {
        return;
      }

      if (
        currentRole !== "student" &&
        currentRole !== "alumni"
      ) {
        return;
      }

      /*
       * First check if an accepted
       * conversation already exists.
       */
      const {
        data: myConversations,
        error: conversationError,
      } = await supabase.rpc(
        "get_my_conversations"
      );

      if (conversationError) {
        console.log(
          "Relationship conversations:",
          conversationError
        );
      }

      const existing = (
        myConversations || []
      ).find(
        (item: any) =>
          item.other_user_id === targetId
      );

      if (existing) {
        setRequestStatus("accepted");

        setConversationId(
          existing.conversation_id
        );

        return;
      }

      /*
       * Check the newest request between
       * these two users.
       */
      const {
        data: requestRows,
        error: requestError,
      } = await supabase
        .from("message_requests")
        .select(`
          id,
          sender_id,
          recipient_id,
          status,
          created_at,
          responded_at
        `)
        .or(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${currentUserId})`
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (requestError) {
        console.log(
          "Relationship request:",
          requestError
        );

        return;
      }

      const request = requestRows?.[0];

      if (!request) {
        return;
      }

      if (request.status === "accepted") {
        setRequestStatus("accepted");
        return;
      }

      if (request.status !== "pending") {
        return;
      }

      setRequestId(request.id);

      if (
        request.sender_id === currentUserId
      ) {
        setRequestStatus("sent_pending");
      } else {
        setRequestStatus(
          "received_pending"
        );
      }
    },
    []
  );

  const loadMember = useCallback(
    async (showLoader = true) => {
      if (!memberId) {
        Alert.alert(
          "Profile",
          "This member could not be found."
        );

        router.back();
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            "Please sign in again."
          );
        }

        setMe(user.id);

        if (memberId === user.id) {
          router.replace(
            "/(tabs)/profile" as never
          );

          return;
        }

        const [
          myProfileResult,
          profileResult,
          followerResult,
          followingResult,
          myFollowResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("role,status")
            .eq("id", user.id)
            .single(),

          supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              username,
              role,
              avatar_url,
              headline,
              bio,
              linkedin_url,
              github_url,
              instagram_url,
              website_url
            `)
            .eq("id", memberId)
            .eq("status", "active")
            .single(),

          supabase
            .from("follows")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "following_id",
              memberId
            ),

          supabase
            .from("follows")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "follower_id",
              memberId
            ),

          supabase
            .from("follows")
            .select("following_id")
            .eq(
              "follower_id",
              user.id
            )
            .eq(
              "following_id",
              memberId
            )
            .maybeSingle(),
        ]);

        if (myProfileResult.error) {
          throw myProfileResult.error;
        }

        if (profileResult.error) {
          throw profileResult.error;
        }

        const role = String(
          profileResult.data.role || ""
        ).toLowerCase();

        if (
          role !== "student" &&
          role !== "alumni"
        ) {
          throw new Error(
            "This profile is not available here."
          );
        }

        const currentRole = String(
          myProfileResult.data?.role || ""
        ).toLowerCase() as ViewerRole;

        setMyRole(currentRole);

        setFollowers(
          followerResult.count || 0
        );

        setFollowing(
          followingResult.count || 0
        );

        setIsFollowing(
          Boolean(myFollowResult.data)
        );

        let programme = "";
        let campus = "";

        let yearOfStudy:
          | number
          | null = null;

        let graduationYear:
          | number
          | null = null;

        let currentCompany = "";
        let currentJobTitle = "";
        let verified = false;

        let roleSkills: string[] = [];

        if (role === "student") {
          const {
            data,
            error,
          } = await supabase
            .from("student_profiles")
            .select(
              "programme,campus,year_of_study,skills"
            )
            .eq(
              "user_id",
              memberId
            )
            .maybeSingle();

          if (error) {
            console.log(
              "Member student profile:",
              error
            );
          }

          programme =
            data?.programme || "";

          campus =
            data?.campus || "";

          yearOfStudy =
            data?.year_of_study ??
            null;

          roleSkills =
            Array.isArray(data?.skills)
              ? data.skills
              : [];
        } else {
          const {
            data,
            error,
          } = await supabase
            .from("alumni_profiles")
            .select(`
              programme,
              campus,
              graduation_year,
              current_company,
              current_job_title,
              verified
            `)
            .eq(
              "user_id",
              memberId
            )
            .maybeSingle();

          if (error) {
            console.log(
              "Member alumni profile:",
              error
            );
          }

          programme =
            data?.programme || "";

          campus =
            data?.campus || "";

          graduationYear =
            data?.graduation_year ??
            null;

          currentCompany =
            data?.current_company ||
            "";

          currentJobTitle =
            data?.current_job_title ||
            "";

          verified =
            data?.verified === true;
        }

        const {
          data: portfolioRows,
          error: portfolioError,
        } = await supabase
          .from("portfolio_items")
          .select("skills")
          .eq(
            "user_id",
            memberId
          );

        if (portfolioError) {
          console.log(
            "Member portfolio skills:",
            portfolioError
          );
        }

        const portfolioSkills = (
          portfolioRows || []
        ).flatMap((item: any) =>
          Array.isArray(item.skills)
            ? item.skills
            : []
        );

        const baseSkills = [
          ...new Set(
            [
              ...roleSkills,
              ...portfolioSkills,
            ]
              .map((skill) =>
                String(
                  skill || ""
                ).trim()
              )
              .filter(Boolean)
          ),
        ];

        const [
          endorsementResult,
          recommendationResult,
        ] = await Promise.all([
          supabase
            .from(
              "skill_endorsements"
            )
            .select(
              "skill,endorser_id"
            )
            .eq(
              "profile_id",
              memberId
            ),

          supabase
            .from(
              "recommendations"
            )
            .select(
              "id,author_id,body,created_at"
            )
            .eq(
              "profile_id",
              memberId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),
        ]);

        if (
          endorsementResult.error
        ) {
          throw endorsementResult.error;
        }

        if (
          recommendationResult.error
        ) {
          throw recommendationResult.error;
        }

        const endorsementRows =
          endorsementResult.data || [];

        const allSkills = [
          ...new Set(
            [
              ...baseSkills,
              ...endorsementRows.map(
                (item: any) =>
                  String(
                    item.skill || ""
                  ).trim()
              ),
            ].filter(Boolean)
          ),
        ];

        setSkills(
          allSkills.map((skill) => {
            const matching =
              endorsementRows.filter(
                (item: any) =>
                  String(
                    item.skill || ""
                  ).toLowerCase() ===
                  skill.toLowerCase()
              );

            return {
              skill,

              count:
                matching.length,

              endorsedByMe:
                matching.some(
                  (item: any) =>
                    item.endorser_id ===
                    user.id
                ),
            };
          })
        );

        const recommendationRows =
          recommendationResult.data ||
          [];

        const authorIds = [
          ...new Set(
            recommendationRows.map(
              (item: any) =>
                item.author_id
            )
          ),
        ];

        let authorMap =
          new Map<string, any>();

        if (authorIds.length) {
          const {
            data: authors,
            error: authorError,
          } = await supabase
            .from("profiles")
            .select(
              "id,full_name,avatar_url,role"
            )
            .in("id", authorIds);

          if (authorError) {
            throw authorError;
          }

          authorMap = new Map(
            (authors || []).map(
              (author: any) => [
                author.id,
                author,
              ]
            )
          );
        }

        setRecommendations(
          recommendationRows.map(
            (item: any) => {
              const author =
                authorMap.get(
                  item.author_id
                );

              return {
                ...item,

                authorName:
                  author?.full_name ||
                  "Richfield Member",

                authorAvatar:
                  author?.avatar_url ||
                  null,

                authorRole:
                  author?.role ||
                  null,
              };
            }
          )
        );

        setMember({
          ...profileResult.data,

          role:
            role as CommunityRole,

          programme,
          campus,

          year_of_study:
            yearOfStudy,

          graduation_year:
            graduationYear,

          current_company:
            currentCompany,

          current_job_title:
            currentJobTitle,

          verified,
        } as Member);

        await loadRelationship(
          user.id,
          memberId,
          currentRole
        );
      } catch (error: any) {
        console.log(
          "Member profile error:",
          error
        );

        Alert.alert(
          "Profile",
          error?.message ||
            "Could not load this member."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      memberId,
      loadRelationship,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      loadMember(true);
    }, [loadMember])
  );

  async function refresh() {
    setRefreshing(true);

    await loadMember(false);
  }

  async function toggleFollow() {
    if (
      !me ||
      !memberId ||
      followLoading
    ) {
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        const { error } =
          await supabase
            .from("follows")
            .delete()
            .eq(
              "follower_id",
              me
            )
            .eq(
              "following_id",
              memberId
            );

        if (error) {
          throw error;
        }

        setIsFollowing(false);

        setFollowers((value) =>
          Math.max(
            0,
            value - 1
          )
        );
      } else {
        const { error } =
          await supabase
            .from("follows")
            .insert({
              follower_id: me,
              following_id:
                memberId,
            });

        if (
          error &&
          error.code !== "23505"
        ) {
          throw error;
        }

        setIsFollowing(true);

        setFollowers(
          (value) => value + 1
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Network",
        error?.message ||
          "Could not update follow."
      );
    } finally {
      setFollowLoading(false);
    }
  }

  async function sendRequest() {
    if (
      !me ||
      !memberId ||
      connectionLoading
    ) {
      return;
    }

    if (
      myRole !== "student" &&
      myRole !== "alumni"
    ) {
      return;
    }

    try {
      setConnectionLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("message_requests")
        .insert({
          sender_id: me,
          recipient_id:
            memberId,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        if (
          error.code === "23505"
        ) {
          await loadRelationship(
            me,
            memberId,
            myRole
          );

          return;
        }

        throw error;
      }

      setRequestId(data.id);

      setRequestStatus(
        "sent_pending"
      );

      Alert.alert(
        "Request sent",
        `Your connection request was sent to ${
          member?.full_name ||
          "this member"
        }.`
      );
    } catch (error: any) {
      console.log(
        "Send connection request:",
        error
      );

      Alert.alert(
        "Request",
        error?.message ||
          "Could not send the connection request."
      );
    } finally {
      setConnectionLoading(false);
    }
  }

  async function respondRequest(
    accept: boolean
  ) {
    if (
      !requestId ||
      !me ||
      !memberId ||
      connectionLoading
    ) {
      return;
    }

    try {
      setConnectionLoading(true);

      const {
        data,
        error,
      } = await supabase.rpc(
        "respond_to_message_request",
        {
          request_uuid:
            requestId,

          response_status:
            accept
              ? "accepted"
              : "rejected",
        }
      );

      if (error) {
        throw error;
      }

      if (!accept) {
        setRequestStatus("none");
        setRequestId(null);

        Alert.alert(
          "Request declined",
          "The connection request was declined."
        );

        return;
      }

      setRequestStatus("accepted");
      setRequestId(null);

      if (data) {
        setConversationId(
          String(data)
        );
      }

      Alert.alert(
        "Connected",
        `You can now message ${
          member?.full_name ||
          "this member"
        }.`
      );
    } catch (error: any) {
      console.log(
        "Respond request:",
        error
      );

      Alert.alert(
        "Request",
        error?.message ||
          "Could not respond to this request."
      );
    } finally {
      setConnectionLoading(false);
    }
  }

  async function openConversation() {
    if (
      !memberId ||
      !member ||
      connectionLoading
    ) {
      return;
    }

    /*
     * Student/Alumni must have an
     * accepted connection first.
     */
    if (
      canInteract &&
      requestStatus !== "accepted"
    ) {
      return;
    }

    /*
     * Business accounts cannot open
     * unrestricted direct messages here.
     */
    if (myRole === "business") {
      return;
    }

    try {
      setConnectionLoading(true);

      let id =
        conversationId;

      /*
       * Staff can call this immediately.
       *
       * Student/Alumni can only reach
       * this point after acceptance.
       *
       * Supabase RPC is still the final
       * security authority.
       */
      if (!id) {
        const {
          data,
          error,
        } = await supabase.rpc(
          "open_direct_conversation",
          {
            p_other_user_id:
              memberId,
          }
        );

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Conversation could not be opened."
          );
        }

        id = String(data);

        setConversationId(id);
      }

      router.push({
        pathname:
          "/conversation",

        params: {
          id,

          conversationId:
            id,

          userId:
            member.id,

          name:
            member.full_name ||
            "Richfield Member",

          username:
            member.username ||
            "",

          image:
            member.avatar_url ||
            "",

          online: "false",

          role:
            member.role,

          isMentor:
            "false",

          blocked:
            "false",
        },
      });
    } catch (error: any) {
      console.log(
        "Open conversation:",
        error
      );

      Alert.alert(
        "Chat",
        error?.message ||
          "Could not open this conversation."
      );
    } finally {
      setConnectionLoading(false);
    }
  }

  function handlePrimaryAction() {
    if (isStaff) {
      openConversation();
      return;
    }

    if (!canInteract) {
      return;
    }

    switch (requestStatus) {
      case "none":
        sendRequest();
        break;

      case "accepted":
        openConversation();
        break;

      case "sent_pending":
        Alert.alert(
          "Request pending",
          "This member has not accepted your request yet."
        );
        break;

      case "received_pending":
        break;
    }
  }

  async function toggleEndorsement(
    item: SkillItem
  ) {
    if (
      !me ||
      !memberId ||
      !canInteract ||
      endorseLoading
    ) {
      return;
    }

    try {
      setEndorseLoading(
        item.skill
      );

      if (item.endorsedByMe) {
        const { error } =
          await supabase
            .from(
              "skill_endorsements"
            )
            .delete()
            .eq(
              "profile_id",
              memberId
            )
            .eq(
              "endorser_id",
              me
            )
            .eq(
              "skill",
              item.skill
            );

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from(
              "skill_endorsements"
            )
            .insert({
              profile_id:
                memberId,

              endorser_id:
                me,

              skill:
                item.skill,
            });

        if (
          error &&
          error.code !== "23505"
        ) {
          throw error;
        }
      }

      await loadMember(false);
    } catch (error: any) {
      Alert.alert(
        "Endorsement",
        error?.message ||
          "Could not update endorsement."
      );
    } finally {
      setEndorseLoading(null);
    }
  }

  async function saveRecommendation() {
    if (
      !me ||
      !memberId ||
      !canInteract
    ) {
      return;
    }

    const body =
      recommendationText
        .trim()
        .replace(/\s+/g, " ");

    if (body.length < 10) {
      Alert.alert(
        "Recommendation",
        "Write at least 10 characters."
      );

      return;
    }

    try {
      setRecommendationSaving(true);

      const { error } =
        await supabase
          .from(
            "recommendations"
          )
          .upsert(
            {
              profile_id:
                memberId,

              author_id:
                me,

              body,

              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "profile_id,author_id",
            }
          );

      if (error) {
        throw error;
      }

      setRecommendationText("");
      setRecommendationVisible(false);

      await loadMember(false);
    } catch (error: any) {
      Alert.alert(
        "Recommendation",
        error?.message ||
          "Could not save recommendation."
      );
    } finally {
      setRecommendationSaving(false);
    }
  }

  async function deleteRecommendation(
    id: string
  ) {
    if (!me) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from(
            "recommendations"
          )
          .delete()
          .eq("id", id)
          .eq(
            "author_id",
            me
          );

      if (error) {
        throw error;
      }

      await loadMember(false);
    } catch (error: any) {
      Alert.alert(
        "Recommendation",
        error?.message ||
          "Could not remove recommendation."
      );
    }
  }

  async function openLink(
    value: string | null
  ) {
    if (!value) {
      return;
    }

    const url =
      value.startsWith(
        "http://"
      ) ||
      value.startsWith(
        "https://"
      )
        ? value
        : `https://${value}`;

    try {
      const supported =
        await Linking.canOpenURL(
          url
        );

      if (!supported) {
        throw new Error();
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Link",
        "Could not open this link."
      );
    }
  }

  const myRecommendation =
    useMemo(
      () =>
        recommendations.find(
          (item) =>
            item.author_id ===
            me
        ),
      [recommendations, me]
    );

  function openRecommendationModal() {
    setRecommendationText(
      myRecommendation?.body ||
        ""
    );

    setRecommendationVisible(true);
  }

  function getActionText() {
    if (isStaff) {
      return "Message";
    }

    switch (requestStatus) {
      case "sent_pending":
        return "Pending";

      case "accepted":
        return "Message";

      default:
        return "Send Request";
    }
  }

  function getActionIcon():
    keyof typeof Ionicons.glyphMap {
    if (
      isStaff ||
      requestStatus ===
        "accepted"
    ) {
      return "chatbubble-outline";
    }

    if (
      requestStatus ===
      "sent_pending"
    ) {
      return "time-outline";
    }

    return "person-add-outline";
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView
        style={styles.loading}
      >
        <Text style={styles.muted}>
          Member not available.
        </Text>
      </SafeAreaView>
    );
  }

  const initials = (
    member.full_name || "R"
  )
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join("");

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={refresh}
            tintColor={PRIMARY}
          />
        }
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={
            styles.profileCard
          }
        >
          {member.avatar_url ? (
            <Image
              source={{
                uri:
                  member.avatar_url,
              }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={
                styles.avatarPlaceholder
              }
            >
              <Text
                style={
                  styles.avatarText
                }
              >
                {initials}
              </Text>
            </View>
          )}

          <View
            style={styles.nameRow}
          >
            <Text
              style={styles.name}
            >
              {member.full_name ||
                "Richfield Member"}
            </Text>

            {member.role ===
              "alumni" &&
            member.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={19}
                color={PRIMARY}
              />
            ) : null}
          </View>

          {member.username ? (
            <Text
              style={
                styles.username
              }
            >
              {member.username.startsWith(
                "@"
              )
                ? member.username
                : `@${member.username}`}
            </Text>
          ) : null}

          <View
            style={
              styles.roleBadge
            }
          >
            <Ionicons
              name={
                member.role ===
                "alumni"
                  ? "ribbon-outline"
                  : "school-outline"
              }
              size={14}
              color={PRIMARY}
            />

            <Text
              style={
                styles.roleText
              }
            >
              {member.role ===
              "alumni"
                ? "Richfield Alumni"
                : "Richfield Student"}
            </Text>
          </View>

          {member.headline ? (
            <Text
              style={
                styles.headline
              }
            >
              {member.headline}
            </Text>
          ) : null}

          {member.bio ? (
            <Text style={styles.bio}>
              {member.bio}
            </Text>
          ) : null}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text
                style={
                  styles.statNumber
                }
              >
                {followers}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Followers
              </Text>
            </View>

            <View style={styles.stat}>
              <Text
                style={
                  styles.statNumber
                }
              >
                {following}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Following
              </Text>
            </View>

            <View style={styles.stat}>
              <Text
                style={
                  styles.statNumber
                }
              >
                {skills.reduce(
                  (sum, item) =>
                    sum +
                    item.count,
                  0
                )}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Endorsements
              </Text>
            </View>
          </View>

          <View
            style={
              styles.profileActions
            }
          >
            <Pressable
              style={[
                styles.followButton,

                isFollowing &&
                  styles.followingButton,
              ]}
              onPress={toggleFollow}
              disabled={
                followLoading
              }
            >
              {followLoading ? (
                <ActivityIndicator
                  size="small"
                  color={
                    isFollowing
                      ? PRIMARY
                      : "#fff"
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      isFollowing
                        ? "checkmark"
                        : "person-add-outline"
                    }
                    size={17}
                    color={
                      isFollowing
                        ? PRIMARY
                        : "#fff"
                    }
                  />

                  <Text
                    style={[
                      styles.followText,

                      isFollowing &&
                        styles.followingText,
                    ]}
                  >
                    {isFollowing
                      ? "Following"
                      : "Follow"}
                  </Text>
                </>
              )}
            </Pressable>

            {(canInteract ||
              isStaff) &&
            requestStatus !==
              "received_pending" ? (
              <Pressable
                style={[
                  styles.connectionButton,

                  requestStatus ===
                    "sent_pending" &&
                    styles.pendingButton,
                ]}
                disabled={
                  connectionLoading
                }
                onPress={
                  handlePrimaryAction
                }
              >
                {connectionLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={PRIMARY}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={
                        getActionIcon()
                      }
                      size={17}
                      color={PRIMARY}
                    />

                    <Text
                      style={
                        styles.connectionButtonText
                      }
                    >
                      {getActionText()}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>

          {requestStatus ===
            "received_pending" && (
            <View
              style={
                styles.requestCard
              }
            >
              <View
                style={
                  styles.requestTitleRow
                }
              >
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={PRIMARY}
                />

                <Text
                  style={
                    styles.requestTitle
                  }
                >
                  Connection request
                </Text>
              </View>

              <Text
                style={
                  styles.requestText
                }
              >
                This member wants to
                connect and message you.
              </Text>

              <View
                style={
                  styles.requestActions
                }
              >
                <Pressable
                  style={
                    styles.declineButton
                  }
                  disabled={
                    connectionLoading
                  }
                  onPress={() =>
                    respondRequest(
                      false
                    )
                  }
                >
                  <Text
                    style={
                      styles.declineText
                    }
                  >
                    Decline
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.acceptButton
                  }
                  disabled={
                    connectionLoading
                  }
                  onPress={() =>
                    respondRequest(
                      true
                    )
                  }
                >
                  {connectionLoading ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.acceptText
                        }
                      >
                        Accept
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {(member.programme ||
          member.campus ||
          member.current_job_title ||
          member.current_company ||
          member.graduation_year) && (
          <Section title="About">
            {member.programme ? (
              <InfoRow
                icon="school-outline"
                text={
                  member.programme
                }
              />
            ) : null}

            {member.campus ? (
              <InfoRow
                icon="location-outline"
                text={`${
                  member.campus
                }${
                  member.year_of_study
                    ? ` · Year ${member.year_of_study}`
                    : ""
                }`}
              />
            ) : null}

            {member.graduation_year ? (
              <InfoRow
                icon="ribbon-outline"
                text={`Graduated ${member.graduation_year}`}
              />
            ) : null}

            {member.current_job_title ||
            member.current_company ? (
              <InfoRow
                icon="briefcase-outline"
                text={[
                  member.current_job_title,
                  member.current_company,
                ]
                  .filter(Boolean)
                  .join(" at ")}
              />
            ) : null}
          </Section>
        )}

        <Section title="Skills & endorsements">
          {skills.length === 0 ? (
            <Text
              style={styles.muted}
            >
              No skills have been
              added to this profile
              yet.
            </Text>
          ) : (
            skills.map((item) => (
              <View
                key={
                  item.skill.toLowerCase()
                }
                style={
                  styles.skillRow
                }
              >
                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.skillName
                    }
                  >
                    {item.skill}
                  </Text>

                  <Text
                    style={
                      styles.skillCount
                    }
                  >
                    {item.count}{" "}
                    {item.count === 1
                      ? "endorsement"
                      : "endorsements"}
                  </Text>
                </View>

                {canInteract ? (
                  <Pressable
                    style={[
                      styles.endorseButton,

                      item.endorsedByMe &&
                        styles.endorsedButton,
                    ]}
                    onPress={() =>
                      toggleEndorsement(
                        item
                      )
                    }
                    disabled={
                      endorseLoading ===
                      item.skill
                    }
                  >
                    {endorseLoading ===
                    item.skill ? (
                      <ActivityIndicator
                        size="small"
                        color={PRIMARY}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            item.endorsedByMe
                              ? "checkmark-circle"
                              : "add-circle-outline"
                          }
                          size={16}
                          color={
                            PRIMARY
                          }
                        />

                        <Text
                          style={
                            styles.endorseText
                          }
                        >
                          {item.endorsedByMe
                            ? "Endorsed"
                            : "Endorse"}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </Section>

        <Section
          title="Recommendations"
          action={
            canInteract ? (
              <Pressable
                style={
                  styles.writeButton
                }
                onPress={
                  openRecommendationModal
                }
              >
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={PRIMARY}
                />

                <Text
                  style={
                    styles.writeButtonText
                  }
                >
                  {myRecommendation
                    ? "Edit mine"
                    : "Write"}
                </Text>
              </Pressable>
            ) : null
          }
        >
          {recommendations.length ===
          0 ? (
            <Text
              style={styles.muted}
            >
              No written
              recommendations yet.
            </Text>
          ) : (
            recommendations.map(
              (item) => (
                <View
                  key={item.id}
                  style={
                    styles.recommendation
                  }
                >
                  <View
                    style={
                      styles.recommendationHeader
                    }
                  >
                    {item.authorAvatar ? (
                      <Image
                        source={{
                          uri:
                            item.authorAvatar,
                        }}
                        style={
                          styles.smallAvatar
                        }
                      />
                    ) : (
                      <View
                        style={
                          styles.smallAvatarPlaceholder
                        }
                      >
                        <Ionicons
                          name="person"
                          size={15}
                          color={
                            PRIMARY
                          }
                        />
                      </View>
                    )}

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.authorName
                        }
                      >
                        {
                          item.authorName
                        }
                      </Text>

                      <Text
                        style={
                          styles.authorRole
                        }
                      >
                        {item.authorRole ===
                        "alumni"
                          ? "Alumni"
                          : item.authorRole ===
                              "staff"
                            ? "Staff"
                            : "Student"}
                      </Text>
                    </View>

                    {item.author_id ===
                    me ? (
                      <Pressable
                        hitSlop={10}
                        onPress={() =>
                          Alert.alert(
                            "Remove recommendation",
                            "Delete your recommendation?",
                            [
                              {
                                text:
                                  "Cancel",
                                style:
                                  "cancel",
                              },
                              {
                                text:
                                  "Delete",
                                style:
                                  "destructive",

                                onPress:
                                  () =>
                                    deleteRecommendation(
                                      item.id
                                    ),
                              },
                            ]
                          )
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#A33"
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Text
                    style={
                      styles.recommendationBody
                    }
                  >
                    {item.body}
                  </Text>
                </View>
              )
            )
          )}
        </Section>

        {(member.linkedin_url ||
          member.github_url ||
          member.instagram_url ||
          member.website_url) && (
          <Section title="Links">
            <View
              style={
                styles.socialRow
              }
            >
              {member.linkedin_url ? (
                <Social
                  icon="logo-linkedin"
                  onPress={() =>
                    openLink(
                      member.linkedin_url
                    )
                  }
                />
              ) : null}

              {member.github_url ? (
                <Social
                  icon="logo-github"
                  onPress={() =>
                    openLink(
                      member.github_url
                    )
                  }
                />
              ) : null}

              {member.instagram_url ? (
                <Social
                  icon="logo-instagram"
                  onPress={() =>
                    openLink(
                      member.instagram_url
                    )
                  }
                />
              ) : null}

              {member.website_url ? (
                <Social
                  icon="globe-outline"
                  onPress={() =>
                    openLink(
                      member.website_url
                    )
                  }
                />
              ) : null}
            </View>
          </Section>
        )}
      </ScrollView>

      <Modal
        visible={
          recommendationVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setRecommendationVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={styles.modalCard}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                {myRecommendation
                  ? "Edit recommendation"
                  : "Write recommendation"}
              </Text>

              <Pressable
                onPress={() =>
                  setRecommendationVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#111"
                />
              </Pressable>
            </View>

            <Text
              style={
                styles.modalHint
              }
            >
              Share a genuine
              recommendation about
              working, studying or
              collaborating with this
              member.
            </Text>

            <TextInput
              value={
                recommendationText
              }
              onChangeText={
                setRecommendationText
              }
              placeholder="Write your recommendation..."
              placeholderTextColor="#999"
              multiline
              maxLength={800}
              style={
                styles.recommendationInput
              }
              textAlignVertical="top"
            />

            <Text
              style={
                styles.characterCount
              }
            >
              {
                recommendationText.length
              }
              /800
            </Text>

            <Pressable
              style={
                styles.saveButton
              }
              onPress={
                saveRecommendation
              }
              disabled={
                recommendationSaving
              }
            >
              {recommendationSaving ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Save recommendation
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View
        style={
          styles.sectionHeader
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>

        {action}
      </View>

      {children}
    </View>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={18}
        color="#555"
      />

      <Text
        style={styles.infoText}
      >
        {text}
      </Text>
    </View>
  );
}

function Social({
  icon,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={
        styles.socialButton
      }
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={20}
        color="#222"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  content: {
    padding: 16,
    paddingBottom: 45,
  },

  profileCard: {
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8ED",
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },

  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECECFF",
  },

  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: PRIMARY,
  },

  nameRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  name: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },

  username: {
    marginTop: 3,
    fontSize: 12,
    color: "#777",
  },

  roleBadge: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEEEFF",
  },

  roleText: {
    fontSize: 10,
    fontWeight: "800",
    color: PRIMARY,
  },

  headline: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },

  bio: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#666",
  },

  stats: {
    width: "100%",
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: "#EEEEF2",
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
  },

  statLabel: {
    marginTop: 3,
    fontSize: 9,
    color: "#777",
  },

  profileActions: {
    width: "100%",
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
  },

  followButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },

  followingButton: {
    backgroundColor: "#EEEEFF",
    borderWidth: 1,
    borderColor: PRIMARY,
  },

  followText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },

  followingText: {
    color: PRIMARY,
  },

  connectionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: "#EEEEFF",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  connectionButtonText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "800",
  },

  pendingButton: {
    backgroundColor: "#F5F5F7",
    borderColor: "#D8D8DE",
  },

  requestCard: {
    width: "100%",
    marginTop: 14,
    padding: 14,
    borderRadius: 13,
    backgroundColor: "#F3F3FF",
    borderWidth: 1,
    borderColor: "#DDDDFF",
  },

  requestTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  requestTitle: {
    color: "#222",
    fontSize: 12,
    fontWeight: "800",
  },

  requestText: {
    color: "#666",
    fontSize: 11,
    marginTop: 5,
  },

  requestActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  declineButton: {
    flex: 1,
    height: 39,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D5D5DC",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  declineText: {
    color: "#555",
    fontSize: 11,
    fontWeight: "800",
  },

  acceptButton: {
    flex: 1,
    height: 39,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  acceptText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  section: {
    marginTop: 14,
    padding: 16,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8ED",
  },

  sectionHeader: {
    minHeight: 32,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 7,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#555",
  },

  skillRow: {
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F3",
  },

  skillName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
  },

  skillCount: {
    marginTop: 3,
    fontSize: 10,
    color: "#888",
  },

  endorseButton: {
    minWidth: 92,
    height: 35,
    paddingHorizontal: 10,
    borderRadius: 18,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEFF",
  },

  endorsedButton: {
    borderWidth: 1,
    borderColor: "#D2D2FF",
  },

  endorseText: {
    fontSize: 10,
    fontWeight: "800",
    color: PRIMARY,
  },

  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: "#888",
  },

  writeButton: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEEEFF",
  },

  writeButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: PRIMARY,
  },

  recommendation: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F3",
  },

  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  smallAvatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
  },

  smallAvatarPlaceholder: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEFF",
  },

  authorName: {
    fontSize: 11,
    fontWeight: "800",
    color: "#222",
  },

  authorRole: {
    marginTop: 2,
    fontSize: 9,
    color: "#888",
  },

  recommendationBody: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 18,
    color: "#555",
  },

  socialRow: {
    flexDirection: "row",
    gap: 9,
  },

  socialButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F6",
  },

  modalOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  modalCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#fff",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  modalHint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#777",
  },

  recommendationInput: {
    height: 145,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DDDEE4",
    borderRadius: 12,
    fontSize: 13,
    color: "#111",
  },

  characterCount: {
    marginTop: 5,
    textAlign: "right",
    fontSize: 9,
    color: "#999",
  },

  saveButton: {
    height: 46,
    marginTop: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },

  saveButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
});