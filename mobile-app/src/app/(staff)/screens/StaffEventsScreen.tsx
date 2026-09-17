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
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type Campus = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  province: string | null;
};

type EventRow = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_type: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_url: string | null;
  relevant_programmes: string[];
  relevant_roles: string[];
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type EventItem = EventRow & {
  campuses: Campus[];
  registrations: number;
};

type EventFilter =
  | "upcoming"
  | "past"
  | "all";

type AudienceRole =
  | "student"
  | "alumni";

const EVENT_TYPES = [
  "Academic",
  "Career",
  "Networking",
  "Workshop",
  "Social",
  "Orientation",
  "Other",
];

export default function StaffEventsScreen() {
  const [events, setEvents] =
    useState<EventItem[]>([]);

  const [campuses, setCampuses] =
    useState<Campus[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [
    createVisible,
    setCreateVisible,
  ] = useState(false);

  const [filter, setFilter] =
    useState<EventFilter>(
      "upcoming"
    );

  const [search, setSearch] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    eventType,
    setEventType,
  ] = useState("Academic");

  const [location, setLocation] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [
    registrationUrl,
    setRegistrationUrl,
  ] = useState("");

  const [
    selectedCampusIds,
    setSelectedCampusIds,
  ] = useState<string[]>([]);

  const [
    selectedRoles,
    setSelectedRoles,
  ] = useState<
    AudienceRole[]
  >([
    "student",
    "alumni",
  ]);

  const loadCampuses =
    useCallback(async () => {
      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "Not authenticated."
        );
      }

      const {
        data: assignments,
        error: assignmentError,
      } = await supabase
        .from("staff_campuses")
        .select("campus_id")
        .eq(
          "staff_user_id",
          user.id
        );

      if (assignmentError) {
        throw assignmentError;
      }

      const campusIds =
        (
          assignments || []
        ).map(
          item =>
            item.campus_id
        );

      if (!campusIds.length) {
        setCampuses([]);
        return [];
      }

      const {
        data,
        error,
      } = await supabase
        .from("campuses")
        .select(`
          id,
          name,
          code,
          city,
          province
        `)
        .in("id", campusIds)
        .eq("active", true)
        .order("name");

      if (error) {
        throw error;
      }

      const result =
        (data ||
          []) as Campus[];

      setCampuses(result);

      setSelectedCampusIds(
        current => {
          if (
            current.length
          ) {
            return current;
          }

          return result.map(
            campus =>
              campus.id
          );
        }
      );

      return result;
    }, []);

  const loadEvents =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          const {
            data: {
              user,
            },
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          if (!user) {
            throw new Error(
              "Not authenticated."
            );
          }

          const {
            data:
              assignments,
            error:
              assignmentError,
          } =
            await supabase
              .from(
                "staff_campuses"
              )
              .select(
                "campus_id"
              )
              .eq(
                "staff_user_id",
                user.id
              );

          if (
            assignmentError
          ) {
            throw assignmentError;
          }

          const campusIds =
            (
              assignments ||
              []
            ).map(
              item =>
                item.campus_id
            );

          if (
            !campusIds.length
          ) {
            setEvents([]);
            return;
          }

          const {
            data:
              eventCampusRows,
            error:
              eventCampusError,
          } =
            await supabase
              .from(
                "event_campuses"
              )
              .select(
                "event_id,campus_id"
              )
              .in(
                "campus_id",
                campusIds
              );

          if (
            eventCampusError
          ) {
            throw eventCampusError;
          }

          const eventIds = [
            ...new Set(
              (
                eventCampusRows ||
                []
              ).map(
                item =>
                  item.event_id
              )
            ),
          ];

          if (
            !eventIds.length
          ) {
            setEvents([]);
            return;
          }

          const [
            eventResult,
            campusResult,
            attendanceResult,
          ] =
            await Promise.all([
              supabase
                .from(
                  "events"
                )
                .select(`
                  id,
                  created_by,
                  title,
                  description,
                  event_type,
                  location,
                  starts_at,
                  ends_at,
                  registration_url,
                  relevant_programmes,
                  relevant_roles,
                  status,
                  image_url,
                  created_at,
                  updated_at
                `)
                .in(
                  "id",
                  eventIds
                )
                .order(
                  "starts_at",
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from(
                  "event_campuses"
                )
                .select(
                  "event_id,campus_id"
                )
                .in(
                  "event_id",
                  eventIds
                ),

              supabase
                .from(
                  "event_attendees"
                )
                .select(
                  "event_id,status"
                )
                .in(
                  "event_id",
                  eventIds
                ),
            ]);

          if (
            eventResult.error
          ) {
            throw eventResult.error;
          }

          if (
            campusResult.error
          ) {
            throw campusResult.error;
          }

          if (
            attendanceResult.error
          ) {
            throw attendanceResult.error;
          }

          const allCampusIds =
            [
              ...new Set(
                (
                  campusResult.data ||
                  []
                ).map(
                  item =>
                    item.campus_id
                )
              ),
            ];

          let campusRows:
            Campus[] = [];

          if (
            allCampusIds.length
          ) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "campuses"
                )
                .select(`
                  id,
                  name,
                  code,
                  city,
                  province
                `)
                .in(
                  "id",
                  allCampusIds
                );

            if (error) {
              throw error;
            }

            campusRows =
              (data ||
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
            (
              eventResult.data ||
              []
            ).map(
              (
                event: EventRow
              ) => {
                const ids =
                  (
                    campusResult.data ||
                    []
                  )
                    .filter(
                      row =>
                        row.event_id ===
                        event.id
                    )
                    .map(
                      row =>
                        row.campus_id
                    );

                const eventCampuses =
                  ids
                    .map(id =>
                      campusMap.get(
                        id
                      )
                    )
                    .filter(
                      Boolean
                    ) as Campus[];

                const registrations =
                  (
                    attendanceResult.data ||
                    []
                  ).filter(
                    row =>
                      row.event_id ===
                        event.id &&
                      [
                        "registered",
                        "attended",
                      ].includes(
                        row.status
                      )
                  ).length;

                return {
                  ...event,
                  campuses:
                    eventCampuses,
                  registrations,
                };
              }
            );

          setEvents(merged);
        } catch (
          error: any
        ) {
          console.log(
            "Staff events:",
            error
          );

          Alert.alert(
            "Events",
            error?.message ||
              "Could not load events."
          );
        } finally {
          setLoading(false);
          setRefreshing(
            false
          );
        }
      },
      []
    );

  const loadScreen =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          await Promise.all([
            loadCampuses(),
            loadEvents(
              showLoader
            ),
          ]);
        } catch (
          error: any
        ) {
          console.log(
            "Staff event screen:",
            error
          );

          Alert.alert(
            "Events",
            error?.message ||
              "Could not load event information."
          );

          setLoading(false);
          setRefreshing(
            false
          );
        }
      },
      [
        loadCampuses,
        loadEvents,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      loadScreen(true);
    }, [loadScreen])
  );

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "staff-events-realtime"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "events",
          },
          () =>
            loadEvents(
              false
            )
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "event_campuses",
          },
          () =>
            loadEvents(
              false
            )
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "event_attendees",
          },
          () =>
            loadEvents(
              false
            )
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [loadEvents]);

  const visibleEvents =
    useMemo(() => {
      const now =
        Date.now();

      let result =
        [...events];

      if (
        filter ===
        "upcoming"
      ) {
        result =
          result.filter(
            event =>
              new Date(
                event.starts_at
              ).getTime() >=
              now
          );
      }

      if (
        filter === "past"
      ) {
        result =
          result.filter(
            event =>
              new Date(
                event.starts_at
              ).getTime() <
              now
          );
      }

      const query =
        search
          .trim()
          .toLowerCase();

      if (query) {
        result =
          result.filter(
            event => {
              const value = `
                ${event.title}
                ${event.description || ""}
                ${event.event_type || ""}
                ${event.location || ""}
                ${event.campuses
                  .map(
                    campus =>
                      campus.name
                  )
                  .join(" ")}
              `.toLowerCase();

              return value.includes(
                query
              );
            }
          );
      }

      if (
        filter === "past"
      ) {
        result.sort(
          (a, b) =>
            new Date(
              b.starts_at
            ).getTime() -
            new Date(
              a.starts_at
            ).getTime()
        );
      } else {
        result.sort(
          (a, b) =>
            new Date(
              a.starts_at
            ).getTime() -
            new Date(
              b.starts_at
            ).getTime()
        );
      }

      return result;
    }, [
      events,
      filter,
      search,
    ]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setEventType(
      "Academic"
    );
    setLocation("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setRegistrationUrl("");

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

  function openCreate() {
    if (
      !campuses.length
    ) {
      Alert.alert(
        "No campus assigned",
        "Your Staff account does not have an assigned campus. An administrator must assign one before you can create events."
      );

      return;
    }

    resetForm();
    setCreateVisible(true);
  }

  function closeCreate() {
    if (creating) {
      return;
    }

    setCreateVisible(false);
    resetForm();
  }

  function toggleCampus(
    campusId: string
  ) {
    setSelectedCampusIds(
      current =>
        current.includes(
          campusId
        )
          ? current.filter(
              id =>
                id !==
                campusId
            )
          : [
              ...current,
              campusId,
            ]
    );
  }

  function toggleRole(
    role: AudienceRole
  ) {
    setSelectedRoles(
      current =>
        current.includes(
          role
        )
          ? current.filter(
              item =>
                item !== role
            )
          : [
              ...current,
              role,
            ]
    );
  }

  function parseDateTime(
    dateValue: string,
    timeValue: string
  ) {
    const date =
      dateValue.trim();

    const time =
      timeValue.trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return null;
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        time
      )
    ) {
      return null;
    }

    const result =
      new Date(
        `${date}T${time}:00`
      );

    if (
      Number.isNaN(
        result.getTime()
      )
    ) {
      return null;
    }

    return result;
  }

  async function createEvent() {
    if (creating) {
      return;
    }

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description.trim();

    const cleanLocation =
      location.trim();

    const cleanUrl =
      registrationUrl.trim();

    if (
      cleanTitle.length <
      3
    ) {
      Alert.alert(
        "Event",
        "Enter an event title."
      );

      return;
    }

    if (
      cleanTitle.length >
      160
    ) {
      Alert.alert(
        "Event",
        "The event title is too long."
      );

      return;
    }

    if (
      !selectedCampusIds.length
    ) {
      Alert.alert(
        "Event",
        "Select at least one campus."
      );

      return;
    }

    if (
      !selectedRoles.length
    ) {
      Alert.alert(
        "Event",
        "Select at least one audience."
      );

      return;
    }

    const start =
      parseDateTime(
        startDate,
        startTime
      );

    if (!start) {
      Alert.alert(
        "Start date",
        "Use YYYY-MM-DD for the date and HH:MM for the time."
      );

      return;
    }

    if (
      start.getTime() <=
      Date.now()
    ) {
      Alert.alert(
        "Start date",
        "The event must start in the future."
      );

      return;
    }

    let end:
      Date | null = null;

    const hasEndDate =
      Boolean(
        endDate.trim()
      );

    const hasEndTime =
      Boolean(
        endTime.trim()
      );

    if (
      hasEndDate ||
      hasEndTime
    ) {
      if (
        !hasEndDate ||
        !hasEndTime
      ) {
        Alert.alert(
          "End date",
          "Enter both an end date and end time."
        );

        return;
      }

      end =
        parseDateTime(
          endDate,
          endTime
        );

      if (!end) {
        Alert.alert(
          "End date",
          "Use YYYY-MM-DD for the date and HH:MM for the time."
        );

        return;
      }

      if (
        end.getTime() <=
        start.getTime()
      ) {
        Alert.alert(
          "End date",
          "The event must end after it starts."
        );

        return;
      }
    }

    if (
      cleanUrl &&
      !/^https?:\/\/.+/i.test(
        cleanUrl
      )
    ) {
      Alert.alert(
        "Registration link",
        "Enter a valid http or https URL."
      );

      return;
    }

    try {
      setCreating(true);

      const {
        error,
      } = await supabase.rpc(
        "create_staff_event",
        {
          p_title:
            cleanTitle,

          p_description:
            cleanDescription ||
            null,

          p_event_type:
            eventType,

          p_location:
            cleanLocation ||
            null,

          p_starts_at:
            start.toISOString(),

          p_ends_at:
            end
              ? end.toISOString()
              : null,

          p_registration_url:
            cleanUrl ||
            null,

          p_relevant_programmes:
            [],

          p_relevant_roles:
            selectedRoles,

          p_campus_ids:
            selectedCampusIds,
        }
      );

      if (error) {
        throw error;
      }

      setCreateVisible(
        false
      );

      resetForm();

      await loadEvents(
        false
      );

      Alert.alert(
        "Event created",
        "The event has been published successfully."
      );
    } catch (
      error: any
    ) {
      console.log(
        "Create Staff event:",
        error
      );

      Alert.alert(
        "Could not create event",
        error?.message ||
          "Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  async function refresh() {
    setRefreshing(true);

    await loadScreen(
      false
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View
        style={styles.header}
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
            color="#111"
          />
        </Pressable>

        <View
          style={
            styles.headerContent
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            Events
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Manage campus events
          </Text>
        </View>

        <Pressable
          style={
            styles.createButton
          }
          onPress={openCreate}
        >
          <Ionicons
            name="add"
            size={23}
            color="#fff"
          />
        </Pressable>
      </View>

      <View
        style={styles.searchBox}
      >
        <Ionicons
          name="search-outline"
          size={19}
          color="#777"
        />

        <TextInput
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Search events"
          placeholderTextColor="#999"
          style={
            styles.searchInput
          }
        />

        {search ? (
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
        ) : null}
      </View>

      <View
        style={styles.filters}
      >
        <FilterButton
          label="Upcoming"
          active={
            filter ===
            "upcoming"
          }
          onPress={() =>
            setFilter(
              "upcoming"
            )
          }
        />

        <FilterButton
          label="Past"
          active={
            filter === "past"
          }
          onPress={() =>
            setFilter("past")
          }
        />

        <FilterButton
          label="All"
          active={
            filter === "all"
          }
          onPress={() =>
            setFilter("all")
          }
        />
      </View>

      {campuses.length ? (
        <View
          style={
            styles.scopeBanner
          }
        >
          <Ionicons
            name="location-outline"
            size={17}
            color={PRIMARY}
          />

          <Text
            style={
              styles.scopeText
            }
            numberOfLines={1}
          >
            {campuses
              .map(
                campus =>
                  campus.name
              )
              .join(", ")}
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.warningBanner
          }
        >
          <Ionicons
            name="warning-outline"
            size={18}
            color="#A15C00"
          />

          <Text
            style={
              styles.warningText
            }
          >
            No campus has been
            assigned to your Staff
            account.
          </Text>
        </View>
      )}

      <FlatList
        data={visibleEvents}
        keyExtractor={
          item => item.id
        }
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
          visibleEvents.length
            ? styles.list
            : styles.emptyList
        }
        ListEmptyComponent={
          <View
            style={styles.empty}
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={31}
                color={PRIMARY}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {filter ===
              "upcoming"
                ? "No upcoming events"
                : filter ===
                  "past"
                ? "No past events"
                : "No events yet"}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Events for your
              assigned campuses
              will appear here.
            </Text>

            {campuses.length ? (
              <Pressable
                style={
                  styles.emptyButton
                }
                onPress={
                  openCreate
                }
              >
                <Ionicons
                  name="add"
                  size={17}
                  color="#fff"
                />

                <Text
                  style={
                    styles.emptyButtonText
                  }
                >
                  Create event
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({
          item,
        }) => (
          <EventCard
            event={item}
          />
        )}
      />

      <Modal
        visible={
          createVisible
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={
          closeCreate
        }
      >
        <SafeAreaView
          style={
            styles.modalScreen
          }
        >
          <View
            style={
              styles.modalHeader
            }
          >
            <Pressable
              style={
                styles.modalClose
              }
              onPress={
                closeCreate
              }
              disabled={
                creating
              }
            >
              <Ionicons
                name="close"
                size={24}
                color="#222"
              />
            </Pressable>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                Create event
              </Text>

              <Text
                style={
                  styles.modalSubtitle
                }
              >
                Publish to your
                assigned campuses
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={
              styles.form
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            <FormLabel
              text="Event title"
              required
            />

            <TextInput
              value={title}
              onChangeText={
                setTitle
              }
              placeholder="e.g. Career Networking Day"
              placeholderTextColor="#999"
              maxLength={160}
              style={styles.input}
            />

            <FormLabel
              text="Description"
            />

            <TextInput
              value={
                description
              }
              onChangeText={
                setDescription
              }
              placeholder="Tell the community about the event"
              placeholderTextColor="#999"
              multiline
              maxLength={3000}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
              ]}
            />

            <FormLabel
              text="Event type"
              required
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.optionRow
              }
            >
              {EVENT_TYPES.map(
                type => (
                  <ChoiceChip
                    key={type}
                    label={type}
                    active={
                      eventType ===
                      type
                    }
                    onPress={() =>
                      setEventType(
                        type
                      )
                    }
                  />
                )
              )}
            </ScrollView>

            <FormLabel
              text="Location"
            />

            <TextInput
              value={location}
              onChangeText={
                setLocation
              }
              placeholder="e.g. Main Auditorium"
              placeholderTextColor="#999"
              maxLength={200}
              style={styles.input}
            />

            <View
              style={
                styles.dateRow
              }
            >
              <View
                style={
                  styles.dateColumn
                }
              >
                <FormLabel
                  text="Start date"
                  required
                />

                <TextInput
                  value={
                    startDate
                  }
                  onChangeText={
                    setStartDate
                  }
                  placeholder="2026-10-20"
                  placeholderTextColor="#999"
                  maxLength={10}
                  style={
                    styles.input
                  }
                />
              </View>

              <View
                style={
                  styles.timeColumn
                }
              >
                <FormLabel
                  text="Time"
                  required
                />

                <TextInput
                  value={
                    startTime
                  }
                  onChangeText={
                    setStartTime
                  }
                  placeholder="10:00"
                  placeholderTextColor="#999"
                  maxLength={5}
                  style={
                    styles.input
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.dateRow
              }
            >
              <View
                style={
                  styles.dateColumn
                }
              >
                <FormLabel
                  text="End date"
                />

                <TextInput
                  value={endDate}
                  onChangeText={
                    setEndDate
                  }
                  placeholder="2026-10-20"
                  placeholderTextColor="#999"
                  maxLength={10}
                  style={
                    styles.input
                  }
                />
              </View>

              <View
                style={
                  styles.timeColumn
                }
              >
                <FormLabel
                  text="Time"
                />

                <TextInput
                  value={endTime}
                  onChangeText={
                    setEndTime
                  }
                  placeholder="14:00"
                  placeholderTextColor="#999"
                  maxLength={5}
                  style={
                    styles.input
                  }
                />
              </View>
            </View>

            <Text
              style={
                styles.dateHint
              }
            >
              Use YYYY-MM-DD and
              24-hour HH:MM.
            </Text>

            <FormLabel
              text="Audience"
              required
            />

            <View
              style={
                styles.optionRow
              }
            >
              <ChoiceChip
                label="Students"
                active={selectedRoles.includes(
                  "student"
                )}
                onPress={() =>
                  toggleRole(
                    "student"
                  )
                }
              />

              <ChoiceChip
                label="Alumni"
                active={selectedRoles.includes(
                  "alumni"
                )}
                onPress={() =>
                  toggleRole(
                    "alumni"
                  )
                }
              />
            </View>

            <FormLabel
              text="Campuses"
              required
            />

            <View
              style={
                styles.campusList
              }
            >
              {campuses.map(
                campus => {
                  const active =
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
                        active &&
                          styles.campusOptionActive,
                      ]}
                      onPress={() =>
                        toggleCampus(
                          campus.id
                        )
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          active &&
                            styles.checkboxActive,
                        ]}
                      >
                        {active ? (
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color="#fff"
                          />
                        ) : null}
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
                          {
                            campus.name
                          }
                        </Text>

                        {campus.city ? (
                          <Text
                            style={
                              styles.campusLocation
                            }
                          >
                            {
                              campus.city
                            }
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }
              )}
            </View>

            <FormLabel
              text="Registration link"
            />

            <TextInput
              value={
                registrationUrl
              }
              onChangeText={
                setRegistrationUrl
              }
              placeholder="https://..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              keyboardType="url"
              style={styles.input}
            />

            <Pressable
              style={[
                styles.publishButton,
                creating &&
                  styles.publishButtonDisabled,
              ]}
              disabled={creating}
              onPress={
                createEvent
              }
            >
              {creating ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <>
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.publishButtonText
                    }
                  >
                    Publish event
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function EventCard({
  event,
}: {
  event: EventItem;
}) {
  const start =
    new Date(
      event.starts_at
    );

  const now =
    Date.now();

  const upcoming =
    start.getTime() >= now;

  const day =
    start.toLocaleDateString(
      undefined,
      {
        day: "2-digit",
      }
    );

  const month =
    start
      .toLocaleDateString(
        undefined,
        {
          month: "short",
        }
      )
      .toUpperCase();

  const dateText =
    start.toLocaleDateString(
      undefined,
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );

  const timeText =
    start.toLocaleTimeString(
      undefined,
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  return (
    <View
      style={styles.eventCard}
    >
      <View
        style={styles.eventTop}
      >
        <View
          style={
            styles.dateBadge
          }
        >
          <Text
            style={
              styles.dateMonth
            }
          >
            {month}
          </Text>

          <Text
            style={
              styles.dateDay
            }
          >
            {day}
          </Text>
        </View>

        <View
          style={
            styles.eventMain
          }
        >
          <View
            style={
              styles.eventStatusRow
            }
          >
            <View
              style={[
                styles.statusBadge,
                upcoming
                  ? styles.upcomingBadge
                  : styles.pastBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  upcoming
                    ? styles.upcomingText
                    : styles.pastText,
                ]}
              >
                {upcoming
                  ? "Upcoming"
                  : "Past"}
              </Text>
            </View>

            {event.event_type ? (
              <Text
                style={
                  styles.eventType
                }
              >
                {
                  event.event_type
                }
              </Text>
            ) : null}
          </View>

          <Text
            style={
              styles.eventTitle
            }
          >
            {event.title}
          </Text>

          {event.description ? (
            <Text
              style={
                styles.eventDescription
              }
              numberOfLines={2}
            >
              {
                event.description
              }
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={
          styles.eventDetails
        }
      >
        <DetailRow
          icon="calendar-outline"
          text={dateText}
        />

        <DetailRow
          icon="time-outline"
          text={timeText}
        />

        {event.location ? (
          <DetailRow
            icon="location-outline"
            text={
              event.location
            }
          />
        ) : null}

        {event.campuses.length ? (
          <DetailRow
            icon="business-outline"
            text={event.campuses
              .map(
                campus =>
                  campus.name
              )
              .join(", ")}
          />
        ) : null}

        <DetailRow
          icon="people-outline"
          text={`${
            event.registrations
          } ${
            event.registrations ===
            1
              ? "registration"
              : "registrations"
          }`}
        />
      </View>

      {event.relevant_roles
        ?.length ? (
        <View
          style={
            styles.audienceRow
          }
        >
          {event.relevant_roles.map(
            role => (
              <View
                key={role}
                style={
                  styles.audienceBadge
                }
              >
                <Text
                  style={
                    styles.audienceText
                  }
                >
                  {role ===
                  "student"
                    ? "Students"
                    : role ===
                      "alumni"
                    ? "Alumni"
                    : role}
                </Text>
              </View>
            )
          )}
        </View>
      ) : null}
    </View>
  );
}

function DetailRow({
  icon,
  text,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <Ionicons
        name={icon}
        size={16}
        color="#666"
      />

      <Text
        style={
          styles.detailText
        }
        numberOfLines={2}
      >
        {text}
      </Text>
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterButton,
        active &&
          styles.filterButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.choiceChip,
        active &&
          styles.choiceChipActive,
      ]}
      onPress={onPress}
    >
      {active ? (
        <Ionicons
          name="checkmark"
          size={15}
          color="#fff"
        />
      ) : null}

      <Text
        style={[
          styles.choiceText,
          active &&
            styles.choiceTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FormLabel({
  text,
  required = false,
}: {
  text: string;
  required?: boolean;
}) {
  return (
    <Text
      style={styles.formLabel}
    >
      {text}
      {required ? (
        <Text
          style={
            styles.required
          }
        >
          {" "}
          *
        </Text>
      ) : null}
    </Text>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F5F5F7",
    },

    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#fff",
    },

    header: {
      minHeight: 72,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderBottomWidth: 1,
      borderBottomColor:
        "#ECECEE",
    },

    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 4,
    },

    headerContent: {
      flex: 1,
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#111",
    },

    headerSubtitle: {
      marginTop: 2,
      fontSize: 11,
      color: "#777",
    },

    createButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: PRIMARY,
    },

    searchBox: {
      minHeight: 44,
      marginHorizontal: 16,
      marginTop: 13,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: "#E1E1E5",
      borderRadius: 11,
      backgroundColor: "#fff",
    },

    searchInput: {
      flex: 1,
      color: "#111",
      fontSize: 14,
    },

    filters: {
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 10,
      flexDirection: "row",
      gap: 8,
    },

    filterButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: "#DDDDE2",
      backgroundColor: "#fff",
    },

    filterButtonActive: {
      borderColor: PRIMARY,
      backgroundColor: PRIMARY,
    },

    filterText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#555",
    },

    filterTextActive: {
      color: "#fff",
    },

    scopeBanner: {
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      minHeight: 38,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: "#EEEEFF",
    },

    scopeText: {
      flex: 1,
      fontSize: 11,
      fontWeight: "700",
      color: PRIMARY,
    },

    warningBanner: {
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 12,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FFF6E8",
      borderWidth: 1,
      borderColor: "#F4D5A3",
    },

    warningText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: "#805000",
    },

    list: {
      paddingHorizontal: 16,
      paddingBottom: 35,
    },

    emptyList: {
      flexGrow: 1,
      paddingHorizontal: 16,
    },

    empty: {
      flex: 1,
      minHeight: 420,
      alignItems: "center",
      justifyContent:
        "center",
      paddingBottom: 70,
    },

    emptyIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#EEEEFF",
    },

    emptyTitle: {
      marginTop: 15,
      fontSize: 16,
      fontWeight: "800",
      color: "#222",
    },

    emptyText: {
      marginTop: 6,
      maxWidth: 280,
      textAlign: "center",
      fontSize: 12,
      lineHeight: 18,
      color: "#777",
    },

    emptyButton: {
      marginTop: 17,
      minHeight: 40,
      paddingHorizontal: 16,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: PRIMARY,
    },

    emptyButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },

    eventCard: {
      marginBottom: 12,
      padding: 16,
      borderRadius: 17,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#E7E7EA",
    },

    eventTop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
    },

    dateBadge: {
      width: 56,
      minHeight: 61,
      borderRadius: 13,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#EEEEFF",
      marginRight: 12,
    },

    dateMonth: {
      fontSize: 10,
      fontWeight: "900",
      color: PRIMARY,
    },

    dateDay: {
      marginTop: 1,
      fontSize: 22,
      fontWeight: "900",
      color: "#171717",
    },

    eventMain: {
      flex: 1,
    },

    eventStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 7,
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },

    upcomingBadge: {
      backgroundColor: "#EAF8EF",
    },

    pastBadge: {
      backgroundColor: "#F0F0F2",
    },

    statusText: {
      fontSize: 9,
      fontWeight: "800",
    },

    upcomingText: {
      color: "#167A3D",
    },

    pastText: {
      color: "#777",
    },

    eventType: {
      fontSize: 10,
      fontWeight: "700",
      color: "#777",
    },

    eventTitle: {
      marginTop: 7,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
      color: "#181818",
    },

    eventDescription: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 17,
      color: "#777",
    },

    eventDetails: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#F0F0F2",
      gap: 8,
    },

    detailRow: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 8,
    },

    detailText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: "#555",
    },

    audienceRow: {
      marginTop: 13,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },

    audienceBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: "#F2F2F5",
    },

    audienceText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#555",
    },

    modalScreen: {
      flex: 1,
      backgroundColor: "#F7F7F9",
    },

    modalHeader: {
      minHeight: 72,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderBottomWidth: 1,
      borderBottomColor: "#ECECEE",
    },

    modalClose: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 5,
    },

    modalTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: "#111",
    },

    modalSubtitle: {
      marginTop: 2,
      fontSize: 11,
      color: "#777",
    },

    form: {
      padding: 18,
      paddingBottom: 45,
    },

    formLabel: {
      marginTop: 16,
      marginBottom: 7,
      fontSize: 12,
      fontWeight: "800",
      color: "#333",
    },

    required: {
      color: "#D62929",
    },

    input: {
      minHeight: 48,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: "#DDDDE2",
      borderRadius: 11,
      backgroundColor: "#fff",
      color: "#111",
      fontSize: 13,
    },

    textArea: {
      minHeight: 115,
      paddingTop: 13,
      paddingBottom: 13,
    },

    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    choiceChip: {
      minHeight: 37,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#DADAE0",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#fff",
    },

    choiceChipActive: {
      borderColor: PRIMARY,
      backgroundColor: PRIMARY,
    },

    choiceText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#555",
    },

    choiceTextActive: {
      color: "#fff",
    },

    dateRow: {
      flexDirection: "row",
      gap: 10,
    },

    dateColumn: {
      flex: 1.5,
    },

    timeColumn: {
      flex: 1,
    },

    dateHint: {
      marginTop: 7,
      fontSize: 10,
      color: "#888",
    },

    campusList: {
      gap: 8,
    },

    campusOption: {
      minHeight: 58,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: "#DDDDE2",
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      backgroundColor: "#fff",
    },

    campusOptionActive: {
      borderColor: "#B9B8FF",
      backgroundColor: "#F7F7FF",
    },

    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#C8C8CE",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#fff",
    },

    checkboxActive: {
      borderColor: PRIMARY,
      backgroundColor: PRIMARY,
    },

    campusName: {
      fontSize: 12,
      fontWeight: "800",
      color: "#222",
    },

    campusLocation: {
      marginTop: 2,
      fontSize: 10,
      color: "#888",
    },

    publishButton: {
      minHeight: 50,
      marginTop: 26,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      backgroundColor: PRIMARY,
    },

    publishButtonDisabled: {
      opacity: 0.6,
    },

    publishButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#fff",
    },
  });