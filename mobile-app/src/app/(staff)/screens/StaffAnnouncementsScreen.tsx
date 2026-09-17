import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 5000;

type AudienceRole =
  | "student"
  | "alumni";

type AnnouncementStatus =
  | "draft"
  | "published"
  | "archived";

type FilterType =
  | "all"
  | "published"
  | "draft"
  | "archived";

type Campus = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  province: string | null;
};

type StaffCampusRow = {
  campus_id: string;
  is_primary: boolean;
};

type AnnouncementCampusRow = {
  announcement_id: string;
  campus_id: string;
};

type AnnouncementRow = {
  id: string;
  created_by: string;
  title: string;
  body: string;
  audience_scope:
    | "all"
    | "campus"
    | "selected_campuses";
  relevant_roles: string[];
  status: AnnouncementStatus;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type Announcement = AnnouncementRow & {
  campuses: Campus[];
};

/* =========================================================
   SANITISATION
========================================================= */

function cleanSingleLine(
  value: string
) {
  return value
    .replace(/[\r\n\t]/g, " ")
    .replace(
      /[\u0000-\u001F\u007F]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trimStart();
}

function cleanMultiline(
  value: string
) {
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

function sanitizeTitle(
  value: string
) {
  return cleanSingleLine(
    value
  ).slice(
    0,
    MAX_TITLE_LENGTH
  );
}

function sanitizeBody(
  value: string
) {
  return cleanMultiline(
    value
  ).slice(
    0,
    MAX_BODY_LENGTH
  );
}

/* =========================================================
   VALIDATION
========================================================= */

function isRepeatedText(
  value: string
) {
  const compact = value
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]/gu,
      ""
    );

  if (compact.length < 5) {
    return false;
  }

  return /^(.)(\1)+$/u.test(
    compact
  );
}

function isFakeText(
  value: string
) {
  const compact = value
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]/gu,
      ""
    );

  const blocked = [
    "test",
    "testing",
    "fake",
    "asdf",
    "qwerty",
    "none",
    "null",
    "undefined",
    "announcement",
    "sample",
    "dummy",
    "demo",
    "00000",
    "000000",
    "00000000",
    "11111",
    "111111",
  ];

  if (
    blocked.includes(compact)
  ) {
    return true;
  }

  if (
    /^0+$/.test(compact) ||
    /^1+$/.test(compact)
  ) {
    return true;
  }

  return isRepeatedText(
    compact
  );
}

function isValidTitle(
  value: string
) {
  const cleaned =
    sanitizeTitle(
      value
    ).trim();

  if (
    cleaned.length < 3 ||
    cleaned.length >
      MAX_TITLE_LENGTH
  ) {
    return false;
  }

  if (
    !/[\p{L}\p{N}]/u.test(
      cleaned
    )
  ) {
    return false;
  }

  if (isFakeText(cleaned)) {
    return false;
  }

  return true;
}

function isValidBody(
  value: string
) {
  const cleaned =
    sanitizeBody(
      value
    ).trim();

  if (
    cleaned.length < 10 ||
    cleaned.length >
      MAX_BODY_LENGTH
  ) {
    return false;
  }

  if (
    !/[\p{L}]/u.test(
      cleaned
    )
  ) {
    return false;
  }

  if (isFakeText(cleaned)) {
    return false;
  }

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 3) {
    return false;
  }

  return true;
}

/* =========================================================
   DATE HELPERS
========================================================= */

function formatDate(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "en-ZA",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-ZA",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function StaffAnnouncementsScreen() {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    announcements,
    setAnnouncements,
  ] = useState<
    Announcement[]
  >([]);

  const [
    campuses,
    setCampuses,
  ] = useState<
    Campus[]
  >([]);

  const [
    staffCampusIds,
    setStaffCampusIds,
  ] = useState<
    string[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      "all"
    );

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    body,
    setBody,
  ] = useState("");

  const [
    selectedRoles,
    setSelectedRoles,
  ] = useState<
    AudienceRole[]
  >([
    "student",
    "alumni",
  ]);

  const [
    selectedCampusIds,
    setSelectedCampusIds,
  ] = useState<
    string[]
  >([]);

  /* =======================================================
     LIVE VALIDATION
  ======================================================= */

  const titleValid =
    title.length === 0 ||
    isValidTitle(title);

  const bodyValid =
    body.length === 0 ||
    isValidBody(body);

  /* =======================================================
     LOAD STAFF CAMPUSES
  ======================================================= */

  const loadCampuses =
    useCallback(
      async () => {
        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user =
          authData.user;

        if (!user) {
          throw new Error(
            "You are not signed in."
          );
        }

        const {
          data:
            staffCampusData,
          error:
            staffCampusError,
        } =
          await supabase
            .from(
              "staff_campuses"
            )
            .select(
              "campus_id, is_primary"
            )
            .eq(
              "staff_user_id",
              user.id
            );

        if (
          staffCampusError
        ) {
          throw staffCampusError;
        }

        const rows =
          (staffCampusData ??
            []) as StaffCampusRow[];

        const campusIds =
          rows.map(
            row =>
              row.campus_id
          );

        setStaffCampusIds(
          campusIds
        );

        if (
          campusIds.length === 0
        ) {
          setCampuses([]);
          setSelectedCampusIds(
            []
          );

          return;
        }

        const {
          data:
            campusData,
          error:
            campusError,
        } =
          await supabase
            .from("campuses")
            .select(
              `
                id,
                name,
                code,
                city,
                province
              `
            )
            .in(
              "id",
              campusIds
            )
            .eq(
              "active",
              true
            )
            .order(
              "name",
              {
                ascending:
                  true,
              }
            );

        if (campusError) {
          throw campusError;
        }

        const available =
          (campusData ??
            []) as Campus[];

        setCampuses(
          available
        );

        setSelectedCampusIds(
          current => {
            const validCurrent =
              current.filter(
                id =>
                  available.some(
                    campus =>
                      campus.id ===
                      id
                  )
              );

            if (
              validCurrent.length >
              0
            ) {
              return validCurrent;
            }

            return available.map(
              campus =>
                campus.id
            );
          }
        );
      },
      []
    );

  /* =======================================================
     LOAD ANNOUNCEMENTS
  ======================================================= */

  const loadAnnouncements =
    useCallback(
      async () => {
        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user =
          authData.user;

        if (!user) {
          throw new Error(
            "You are not signed in."
          );
        }

        /*
         * We load announcements that
         * the current RLS policies allow
         * this Staff user to see.
         *
         * Backend permissions remain the
         * source of truth.
         */
        const {
          data:
            announcementData,
          error:
            announcementError,
        } =
          await supabase
            .from(
              "announcements"
            )
            .select(
              `
                id,
                created_by,
                title,
                body,
                audience_scope,
                relevant_roles,
                status,
                published_at,
                expires_at,
                created_at,
                updated_at
              `
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        if (
          announcementError
        ) {
          throw announcementError;
        }

        const rows =
          (announcementData ??
            []) as AnnouncementRow[];

        if (
          rows.length === 0
        ) {
          setAnnouncements(
            []
          );

          return;
        }

        const announcementIds =
          rows.map(
            item =>
              item.id
          );

        const {
          data:
            linkData,
          error:
            linkError,
        } =
          await supabase
            .from(
              "announcement_campuses"
            )
            .select(
              `
                announcement_id,
                campus_id
              `
            )
            .in(
              "announcement_id",
              announcementIds
            );

        if (linkError) {
          throw linkError;
        }

        const links =
          (linkData ??
            []) as AnnouncementCampusRow[];

        const linkedCampusIds =
          Array.from(
            new Set(
              links.map(
                link =>
                  link.campus_id
              )
            )
          );

        let campusRows:
          Campus[] = [];

        if (
          linkedCampusIds.length >
          0
        ) {
          const {
            data:
              campusData,
            error:
              campusError,
          } =
            await supabase
              .from(
                "campuses"
              )
              .select(
                `
                  id,
                  name,
                  code,
                  city,
                  province
                `
              )
              .in(
                "id",
                linkedCampusIds
              );

          if (campusError) {
            throw campusError;
          }

          campusRows =
            (campusData ??
              []) as Campus[];
        }

        const campusMap =
          new Map<
            string,
            Campus
          >();

        campusRows.forEach(
          campus => {
            campusMap.set(
              campus.id,
              campus
            );
          }
        );

        const merged =
          rows.map(row => {
            const rowCampusIds =
              links
                .filter(
                  link =>
                    link.announcement_id ===
                    row.id
                )
                .map(
                  link =>
                    link.campus_id
                );

            const rowCampuses =
              rowCampusIds
                .map(
                  id =>
                    campusMap.get(
                      id
                    )
                )
                .filter(
                  (
                    campus
                  ): campus is Campus =>
                    Boolean(
                      campus
                    )
                );

            return {
              ...row,
              campuses:
                rowCampuses,
            };
          });

        setAnnouncements(
          merged
        );
      },
      []
    );

  /* =======================================================
     LOAD SCREEN
  ======================================================= */

  const loadScreen =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          await Promise.all([
            loadCampuses(),
            loadAnnouncements(),
          ]);
        } catch (
          error: any
        ) {
          console.log(
            "Staff announcements load error:",
            error
          );

          Alert.alert(
            "Could not load announcements",
            error?.message ||
              "Please try again."
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [
        loadCampuses,
        loadAnnouncements,
      ]
    );

  /* =======================================================
     FOCUS REFRESH
  ======================================================= */

  useFocusEffect(
    useCallback(() => {
      loadScreen();

      return undefined;
    }, [loadScreen])
  );

  /* =======================================================
     REALTIME
  ======================================================= */

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "staff-announcements-screen"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "announcements",
          },
          () => {
            loadAnnouncements().catch(
              error => {
                console.log(
                  "Announcement realtime refresh error:",
                  error
                );
              }
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "announcement_campuses",
          },
          () => {
            loadAnnouncements().catch(
              error => {
                console.log(
                  "Announcement campus realtime refresh error:",
                  error
                );
              }
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "staff_campuses",
          },
          () => {
            loadScreen(
              false
            ).catch(
              error => {
                console.log(
                  "Staff campus realtime refresh error:",
                  error
                );
              }
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    loadAnnouncements,
    loadScreen,
  ]);

  /* =======================================================
     PULL TO REFRESH
  ======================================================= */

  async function onRefresh() {
    try {
      setRefreshing(true);

      await loadScreen(
        false
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* =======================================================
     FILTERING
  ======================================================= */

  const filteredAnnouncements =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return announcements.filter(
        announcement => {
          if (
            filter !== "all" &&
            announcement.status !==
              filter
          ) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          const campusNames =
            announcement.campuses
              .map(
                campus =>
                  campus.name
              )
              .join(" ");

          const roles =
            announcement.relevant_roles
              ?.join(" ") ??
            "";

          const searchable =
            [
              announcement.title,
              announcement.body,
              campusNames,
              roles,
              announcement.status,
            ]
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            searchValue
          );
        }
      );
    }, [
      announcements,
      search,
      filter,
    ]);

  /* =======================================================
     MODAL
  ======================================================= */

  function resetForm() {
    setTitle("");
    setBody("");

    setSelectedRoles([
      "student",
      "alumni",
    ]);

    setSelectedCampusIds(
      campuses.map(
        campus =>
          campus.id
      )
    );
  }

  function openCreateModal() {
    if (
      campuses.length === 0
    ) {
      Alert.alert(
        "No campus assigned",
        "Your Staff account does not currently have an active campus assignment. An administrator must assign at least one campus before you can publish announcements."
      );

      return;
    }

    resetForm();
    setModalVisible(true);
  }

  function closeModal() {
    if (creating) {
      return;
    }

    setModalVisible(
      false
    );

    resetForm();
  }

  /* =======================================================
     ROLE SELECTION
  ======================================================= */

  function toggleRole(
    role: AudienceRole
  ) {
    setSelectedRoles(
      current => {
        if (
          current.includes(
            role
          )
        ) {
          return current.filter(
            item =>
              item !== role
          );
        }

        return [
          ...current,
          role,
        ];
      }
    );
  }

  /* =======================================================
     CAMPUS SELECTION
  ======================================================= */

  function toggleCampus(
    campusId: string
  ) {
    /*
     * UI check.
     *
     * The RPC also performs the real
     * backend permission check.
     */
    if (
      !staffCampusIds.includes(
        campusId
      )
    ) {
      Alert.alert(
        "Campus not allowed",
        "You cannot publish an announcement to a campus that is not assigned to your Staff account."
      );

      return;
    }

    setSelectedCampusIds(
      current => {
        if (
          current.includes(
            campusId
          )
        ) {
          return current.filter(
            id =>
              id !== campusId
          );
        }

        return [
          ...current,
          campusId,
        ];
      }
    );
  }

  function selectAllCampuses() {
    setSelectedCampusIds(
      campuses.map(
        campus =>
          campus.id
      )
    );
  }

  function clearCampuses() {
    setSelectedCampusIds(
      []
    );
  }

  /* =======================================================
     CREATE ANNOUNCEMENT
  ======================================================= */

  async function createAnnouncement() {
    const finalTitle =
      sanitizeTitle(
        title
      ).trim();

    const finalBody =
      sanitizeBody(
        body
      ).trim();

    if (
      !isValidTitle(
        finalTitle
      )
    ) {
      Alert.alert(
        "Invalid title",
        "Enter a meaningful announcement title between 3 and 160 characters."
      );

      return;
    }

    if (
      !isValidBody(
        finalBody
      )
    ) {
      Alert.alert(
        "Invalid announcement",
        "Enter a meaningful announcement message of at least 10 characters."
      );

      return;
    }

    if (
      selectedRoles.length ===
      0
    ) {
      Alert.alert(
        "Audience required",
        "Select Students, Alumni or both."
      );

      return;
    }

    const invalidRole =
      selectedRoles.some(
        role =>
          role !==
            "student" &&
          role !==
            "alumni"
      );

    if (invalidRole) {
      Alert.alert(
        "Invalid audience",
        "Staff announcements can currently target Students and Alumni only."
      );

      return;
    }

    if (
      selectedCampusIds.length ===
      0
    ) {
      Alert.alert(
        "Campus required",
        "Select at least one campus."
      );

      return;
    }

    const invalidCampus =
      selectedCampusIds.some(
        campusId =>
          !staffCampusIds.includes(
            campusId
          )
      );

    if (invalidCampus) {
      Alert.alert(
        "Campus not allowed",
        "One or more selected campuses are not assigned to your Staff account."
      );

      return;
    }

    try {
      setCreating(true);

      /*
       * Do NOT insert directly into
       * announcements here.
       *
       * The RPC is responsible for
       * verifying the authenticated Staff
       * member and their campus permissions.
       */
      const {
        error,
      } =
        await supabase.rpc(
          "create_staff_announcement",
          {
            p_title:
              finalTitle,

            p_body:
              finalBody,

            p_relevant_roles:
              selectedRoles,

            p_campus_ids:
              selectedCampusIds,
          }
        );

      if (error) {
        throw error;
      }

      setModalVisible(
        false
      );

      resetForm();

      await loadAnnouncements();

      Alert.alert(
        "Announcement published",
        "The announcement was published successfully."
      );
    } catch (
      error: any
    ) {
      console.log(
        "Create staff announcement error:",
        error
      );

      Alert.alert(
        "Could not publish announcement",
        error?.message ||
          "Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  /* =======================================================
     RENDER STATUS
  ======================================================= */

  function getStatusStyle(
    status: AnnouncementStatus
  ) {
    switch (status) {
      case "published":
        return {
          backgroundColor:
            "#E8F8EF",
          color: "#08783E",
          label: "Published",
        };

      case "draft":
        return {
          backgroundColor:
            "#FFF5DF",
          color: "#9A6500",
          label: "Draft",
        };

      case "archived":
        return {
          backgroundColor:
            "#EEEEF2",
          color: "#666",
          label: "Archived",
        };

      default:
        return {
          backgroundColor:
            "#EEEEF2",
          color: "#666",
          label: status,
        };
    }
  }

  /* =======================================================
     ANNOUNCEMENT CARD
  ======================================================= */

  function renderAnnouncement({
    item,
  }: {
    item: Announcement;
  }) {
    const status =
      getStatusStyle(
        item.status
      );

    const studentAudience =
      item.relevant_roles?.includes(
        "student"
      );

    const alumniAudience =
      item.relevant_roles?.includes(
        "alumni"
      );

    return (
      <View
        style={
          styles.announcementCard
        }
      >
        <View
          style={
            styles.cardTopRow
          }
        >
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status.backgroundColor,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status.color,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    status.color,
                },
              ]}
            >
              {status.label}
            </Text>
          </View>

          <Text
            style={
              styles.dateText
            }
          >
            {formatDate(
              item.published_at ||
                item.created_at
            )}
          </Text>
        </View>

        <Text
          style={
            styles.cardTitle
          }
        >
          {item.title}
        </Text>

        <Text
          style={
            styles.cardBody
          }
          numberOfLines={5}
        >
          {item.body}
        </Text>

        <View
          style={
            styles.divider
          }
        />

        <View
          style={
            styles.metaSection
          }
        >
          <View
            style={
              styles.metaTitleRow
            }
          >
            <Ionicons
              name="location-outline"
              size={16}
              color="#666"
            />

            <Text
              style={
                styles.metaTitle
              }
            >
              Campuses
            </Text>
          </View>

          <View
            style={
              styles.chipWrap
            }
          >
            {item.campuses.length >
            0 ? (
              item.campuses.map(
                campus => (
                  <View
                    key={
                      campus.id
                    }
                    style={
                      styles.smallChip
                    }
                  >
                    <Text
                      style={
                        styles.smallChipText
                      }
                    >
                      {campus.name}
                    </Text>
                  </View>
                )
              )
            ) : (
              <Text
                style={
                  styles.noMetaText
                }
              >
                No campus information
              </Text>
            )}
          </View>
        </View>

        <View
          style={
            styles.metaSection
          }
        >
          <View
            style={
              styles.metaTitleRow
            }
          >
            <Ionicons
              name="people-outline"
              size={16}
              color="#666"
            />

            <Text
              style={
                styles.metaTitle
              }
            >
              Audience
            </Text>
          </View>

          <View
            style={
              styles.chipWrap
            }
          >
            {studentAudience && (
              <View
                style={
                  styles.audienceChip
                }
              >
                <Ionicons
                  name="school-outline"
                  size={14}
                  color={PRIMARY}
                />

                <Text
                  style={
                    styles.audienceChipText
                  }
                >
                  Students
                </Text>
              </View>
            )}

            {alumniAudience && (
              <View
                style={
                  styles.audienceChip
                }
              >
                <Ionicons
                  name="ribbon-outline"
                  size={14}
                  color={PRIMARY}
                />

                <Text
                  style={
                    styles.audienceChipText
                  }
                >
                  Alumni
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text
          style={
            styles.createdText
          }
        >
          Created{" "}
          {formatDateTime(
            item.created_at
          )}
        </Text>
      </View>
    );
  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  function renderEmpty() {
    if (loading) {
      return null;
    }

    return (
      <View
        style={
          styles.emptyContainer
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="megaphone-outline"
            size={32}
            color={PRIMARY}
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          No announcements
        </Text>

        <Text
          style={
            styles.emptyText
          }
        >
          {search.trim()
            ? "No announcements match your search."
            : filter !== "all"
            ? `There are no ${filter} announcements.`
            : "Create your first Staff announcement for your assigned campus community."}
        </Text>
      </View>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View
        style={
          styles.header
        }
      >
        <View>
          <Text
            style={
              styles.headerTitle
            }
          >
            Announcements
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Share important campus updates
          </Text>
        </View>

        <Pressable
          style={
            styles.createButton
          }
          onPress={
            openCreateModal
          }
        >
          <Ionicons
            name="add"
            size={23}
            color="#fff"
          />
        </Pressable>
      </View>

      <View
        style={
          styles.searchContainer
        }
      >
        <Ionicons
          name="search-outline"
          size={20}
          color="#777"
        />

        <TextInput
          value={search}
          onChangeText={
            value =>
              setSearch(
                cleanSingleLine(
                  value
                ).slice(
                  0,
                  100
                )
              )
          }
          placeholder="Search announcements..."
          placeholderTextColor="#999"
          style={
            styles.searchInput
          }
          autoCorrect={false}
          maxLength={100}
        />

        {search.length > 0 && (
          <Pressable
            onPress={() =>
              setSearch("")
            }
          >
            <Ionicons
              name="close-circle"
              size={19}
              color="#999"
            />
          </Pressable>
        )}
      </View>

      <View
        style={
          styles.filterContainer
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterScroll
          }
        >
          <FilterChip
            label="All"
            selected={
              filter === "all"
            }
            onPress={() =>
              setFilter("all")
            }
          />

          <FilterChip
            label="Published"
            selected={
              filter ===
              "published"
            }
            onPress={() =>
              setFilter(
                "published"
              )
            }
          />

          <FilterChip
            label="Drafts"
            selected={
              filter ===
              "draft"
            }
            onPress={() =>
              setFilter(
                "draft"
              )
            }
          />

          <FilterChip
            label="Archived"
            selected={
              filter ===
              "archived"
            }
            onPress={() =>
              setFilter(
                "archived"
              )
            }
          />
        </ScrollView>
      </View>

      {loading ? (
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={PRIMARY}
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading announcements...
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            filteredAnnouncements
          }
          keyExtractor={
            item =>
              item.id
          }
          renderItem={
            renderAnnouncement
          }
          contentContainerStyle={[
            styles.listContent,

            filteredAnnouncements.length ===
              0 &&
              styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
              tintColor={
                PRIMARY
              }
            />
          }
          ListEmptyComponent={
            renderEmpty
          }
        />
      )}

      {/* =================================================
          CREATE MODAL
      ================================================= */}

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={
          closeModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS ===
            "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={
              closeModal
            }
          />

          <View
            style={
              styles.modalContainer
            }
          >
            <View
              style={
                styles.modalHandle
              }
            />

            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  New announcement
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Publish to your assigned
                  campuses
                </Text>
              </View>

              <Pressable
                style={
                  styles.closeButton
                }
                disabled={
                  creating
                }
                onPress={
                  closeModal
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#222"
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalContent
              }
            >
              <FieldLabel
                text="Title"
              />

              <TextInput
                value={title}
                onChangeText={
                  value =>
                    setTitle(
                      sanitizeTitle(
                        value
                      )
                    )
                }
                placeholder="Announcement title"
                placeholderTextColor="#999"
                maxLength={
                  MAX_TITLE_LENGTH
                }
                editable={
                  !creating
                }
                style={[
                  styles.input,

                  !titleValid &&
                    styles.errorInput,
                ]}
              />

              {!titleValid && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  Enter a meaningful
                  announcement title.
                </Text>
              )}

              <Text
                style={
                  styles.counter
                }
              >
                {title.length}/
                {MAX_TITLE_LENGTH}
              </Text>

              <FieldLabel
                text="Announcement"
              />

              <TextInput
                value={body}
                onChangeText={
                  value =>
                    setBody(
                      sanitizeBody(
                        value
                      )
                    )
                }
                placeholder="Write your announcement..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
                maxLength={
                  MAX_BODY_LENGTH
                }
                editable={
                  !creating
                }
                style={[
                  styles.input,
                  styles.bodyInput,

                  !bodyValid &&
                    styles.errorInput,
                ]}
              />

              {!bodyValid && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  Enter a meaningful message
                  with at least 10 characters.
                </Text>
              )}

              <Text
                style={
                  styles.counter
                }
              >
                {body.length}/
                {MAX_BODY_LENGTH}
              </Text>

              {/* AUDIENCE */}

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Audience
              </Text>

              <Text
                style={
                  styles.sectionDescription
                }
              >
                Choose who should receive
                this announcement.
              </Text>

              <View
                style={
                  styles.selectionRow
                }
              >
                <SelectionChip
                  icon="school-outline"
                  label="Students"
                  selected={
                    selectedRoles.includes(
                      "student"
                    )
                  }
                  onPress={() =>
                    toggleRole(
                      "student"
                    )
                  }
                />

                <SelectionChip
                  icon="ribbon-outline"
                  label="Alumni"
                  selected={
                    selectedRoles.includes(
                      "alumni"
                    )
                  }
                  onPress={() =>
                    toggleRole(
                      "alumni"
                    )
                  }
                />
              </View>

              {selectedRoles.length ===
                0 && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  Select at least one
                  audience.
                </Text>
              )}

              {/* CAMPUSES */}

              <View
                style={
                  styles.campusHeadingRow
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Campuses
                  </Text>

                  <Text
                    style={
                      styles.sectionDescription
                    }
                  >
                    You can only publish to
                    campuses assigned to your
                    Staff account.
                  </Text>
                </View>
              </View>

              {campuses.length >
              1 ? (
                <View
                  style={
                    styles.quickActions
                  }
                >
                  <Pressable
                    onPress={
                      selectAllCampuses
                    }
                    disabled={
                      creating
                    }
                  >
                    <Text
                      style={
                        styles.quickActionText
                      }
                    >
                      Select all
                    </Text>
                  </Pressable>

                  <View
                    style={
                      styles.quickActionDivider
                    }
                  />

                  <Pressable
                    onPress={
                      clearCampuses
                    }
                    disabled={
                      creating
                    }
                  >
                    <Text
                      style={
                        styles.quickActionText
                      }
                    >
                      Clear
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {campuses.map(
                campus => {
                  const selected =
                    selectedCampusIds.includes(
                      campus.id
                    );

                  return (
                    <Pressable
                      key={
                        campus.id
                      }
                      style={[
                        styles.campusOption,

                        selected &&
                          styles.campusOptionSelected,
                      ]}
                      disabled={
                        creating
                      }
                      onPress={() =>
                        toggleCampus(
                          campus.id
                        )
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,

                          selected &&
                            styles.checkboxSelected,
                        ]}
                      >
                        {selected && (
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color="#fff"
                          />
                        )}
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={
                            styles.campusName
                          }
                        >
                          {campus.name}
                        </Text>

                        {(campus.city ||
                          campus.province) && (
                          <Text
                            style={
                              styles.campusLocation
                            }
                          >
                            {[
                              campus.city,
                              campus.province,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ", "
                              )}
                          </Text>
                        )}
                      </View>

                      {campus.code && (
                        <View
                          style={
                            styles.codeBadge
                          }
                        >
                          <Text
                            style={
                              styles.codeText
                            }
                          >
                            {campus.code}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                }
              )}

              {selectedCampusIds.length ===
                0 && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  Select at least one campus.
                </Text>
              )}

              <View
                style={
                  styles.securityNotice
                }
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={PRIMARY}
                />

                <Text
                  style={
                    styles.securityNoticeText
                  }
                >
                  Campus permissions are
                  verified again by the
                  backend before the
                  announcement is published.
                </Text>
              </View>

              <Pressable
                style={[
                  styles.publishButton,

                  creating &&
                    styles.disabled,
                ]}
                disabled={
                  creating
                }
                onPress={
                  createAnnouncement
                }
              >
                {creating ? (
                  <ActivityIndicator
                    color="#fff"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="megaphone-outline"
                      size={19}
                      color="#fff"
                    />

                    <Text
                      style={
                        styles.publishButtonText
                      }
                    >
                      Publish announcement
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   FILTER CHIP
========================================================= */

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterChip,
        selected &&
          styles.filterChipSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          selected &&
            styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   SELECTION CHIP
========================================================= */

function SelectionChip({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.selectionChip,

        selected &&
          styles.selectionChipSelected,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={
          selected
            ? PRIMARY
            : "#777"
        }
      />

      <Text
        style={[
          styles.selectionChipText,

          selected &&
            styles.selectionChipTextSelected,
        ]}
      >
        {label}
      </Text>

      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={17}
          color={PRIMARY}
        />
      )}
    </Pressable>
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
    <Text
      style={
        styles.label
      }
    >
      {text}{" "}
      <Text
        style={
          styles.required
        }
      >
        *
      </Text>
    </Text>
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
        "#FFFFFF",
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor:
        "#F0F0F0",
    },

    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: "#111",
    },

    headerSubtitle: {
      fontSize: 13,
      color: "#777",
      marginTop: 3,
    },

    createButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    searchContainer: {
      marginHorizontal: 20,
      marginTop: 16,
      minHeight: 48,
      borderRadius: 13,
      backgroundColor:
        "#F5F5F7",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
    },

    searchInput: {
      flex: 1,
      marginLeft: 9,
      fontSize: 14,
      color: "#111",
      paddingVertical: 11,
    },

    filterContainer: {
      marginTop: 13,
      marginBottom: 4,
    },

    filterScroll: {
      paddingHorizontal: 20,
      gap: 8,
    },

    filterChip: {
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor:
        "#F2F2F4",
    },

    filterChipSelected: {
      backgroundColor:
        "#EEEEFF",
      borderWidth: 1,
      borderColor:
        "#BEBDF7",
    },

    filterChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#666",
    },

    filterChipTextSelected: {
      color: PRIMARY,
      fontWeight: "800",
    },

    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    loadingText: {
      fontSize: 13,
      color: "#777",
      marginTop: 12,
    },

    announcementCard: {
      borderWidth: 1,
      borderColor:
        "#E9E9EC",
      borderRadius: 17,
      backgroundColor:
        "#FFF",
      padding: 17,
      marginBottom: 13,
    },

    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
    },

    statusText: {
      fontSize: 11,
      fontWeight: "800",
    },

    dateText: {
      fontSize: 11,
      color: "#888",
    },

    cardTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
      lineHeight: 23,
    },

    cardBody: {
      fontSize: 13,
      lineHeight: 20,
      color: "#5F5F65",
      marginTop: 7,
    },

    divider: {
      height: 1,
      backgroundColor:
        "#F0F0F2",
      marginVertical: 14,
    },

    metaSection: {
      marginBottom: 11,
    },

    metaTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 7,
    },

    metaTitle: {
      fontSize: 12,
      color: "#666",
      fontWeight: "700",
      marginLeft: 5,
    },

    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

    smallChip: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 9,
      backgroundColor:
        "#F3F3F5",
    },

    smallChipText: {
      fontSize: 11,
      color: "#555",
      fontWeight: "600",
    },

    audienceChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 9,
      backgroundColor:
        "#F0F0FF",
    },

    audienceChipText: {
      fontSize: 11,
      color: PRIMARY,
      fontWeight: "700",
      marginLeft: 4,
    },

    noMetaText: {
      fontSize: 11,
      color: "#999",
    },

    createdText: {
      fontSize: 10,
      color: "#AAA",
      marginTop: 2,
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 35,
      paddingBottom: 70,
    },

    emptyIcon: {
      width: 66,
      height: 66,
      borderRadius: 20,
      backgroundColor:
        "#F0F0FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#222",
    },

    emptyText: {
      fontSize: 13,
      lineHeight: 20,
      color: "#777",
      textAlign: "center",
      marginTop: 6,
    },

    /* MODAL */

    modalOverlay: {
      flex: 1,
      justifyContent:
        "flex-end",
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor:
        "rgba(0,0,0,0.35)",
    },

    modalContainer: {
      maxHeight: "92%",
      minHeight: "70%",
      backgroundColor:
        "#FFFFFF",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: "hidden",
    },

    modalHandle: {
      width: 42,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        "#D6D6D9",
      alignSelf: "center",
      marginTop: 9,
    },

    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        "#EFEFF1",
    },

    modalTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#111",
    },

    modalSubtitle: {
      fontSize: 12,
      color: "#777",
      marginTop: 3,
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        "#F3F3F5",
      alignItems: "center",
      justifyContent:
        "center",
    },

    modalContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 45,
    },

    label: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
      marginTop: 14,
      marginBottom: 8,
    },

    required: {
      color: "#D00000",
    },

    input: {
      minHeight: 51,
      borderWidth: 1,
      borderColor:
        "#DCDCE0",
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 14,
      color: "#111",
      backgroundColor:
        "#FFF",
    },

    bodyInput: {
      minHeight: 130,
      paddingTop: 13,
      paddingBottom: 13,
    },

    errorInput: {
      borderColor:
        "#D00000",
    },

    errorText: {
      color: "#D00000",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 5,
    },

    counter: {
      textAlign: "right",
      fontSize: 10,
      color: "#999",
      marginTop: 5,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#111",
      marginTop: 22,
    },

    sectionDescription: {
      fontSize: 12,
      lineHeight: 18,
      color: "#777",
      marginTop: 4,
      marginBottom: 10,
    },

    selectionRow: {
      flexDirection: "row",
      gap: 9,
    },

    selectionChip: {
      flex: 1,
      minHeight: 49,
      borderWidth: 1,
      borderColor:
        "#DDDDE1",
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      gap: 7,
    },

    selectionChipSelected: {
      borderColor:
        "#B8B7F7",
      backgroundColor:
        "#F3F3FF",
    },

    selectionChipText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: "#666",
    },

    selectionChipTextSelected: {
      color: PRIMARY,
      fontWeight: "800",
    },

    campusHeadingRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },

    quickActions: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },

    quickActionText: {
      color: PRIMARY,
      fontSize: 12,
      fontWeight: "700",
    },

    quickActionDivider: {
      width: 1,
      height: 13,
      backgroundColor:
        "#DDD",
      marginHorizontal: 10,
    },

    campusOption: {
      minHeight: 58,
      borderWidth: 1,
      borderColor:
        "#E0E0E3",
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
      paddingVertical: 9,
      marginBottom: 8,
    },

    campusOptionSelected: {
      borderColor:
        "#B8B7F7",
      backgroundColor:
        "#F7F7FF",
    },

    checkbox: {
      width: 21,
      height: 21,
      borderRadius: 6,
      borderWidth: 2,
      borderColor:
        "#BDBDC2",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    checkboxSelected: {
      borderColor:
        PRIMARY,
      backgroundColor:
        PRIMARY,
    },

    campusName: {
      fontSize: 13,
      fontWeight: "700",
      color: "#222",
    },

    campusLocation: {
      fontSize: 11,
      color: "#888",
      marginTop: 2,
    },

    codeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor:
        "#EEEEF2",
    },

    codeText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#666",
    },

    securityNotice: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      backgroundColor:
        "#F4F4FF",
      borderRadius: 12,
      padding: 12,
      marginTop: 18,
    },

    securityNoticeText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      color: "#5F5F66",
      marginLeft: 8,
    },

    publishButton: {
      minHeight: 55,
      borderRadius: 13,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      marginTop: 20,
    },

    publishButtonText: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "800",
    },

    disabled: {
      opacity: 0.5,
    },
  });