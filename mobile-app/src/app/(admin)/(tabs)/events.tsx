import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useFocusEffect,
} from "expo-router";

import {
  Ionicons,
} from "@expo/vector-icons";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import {
  supabase,
} from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type CreateType =
  | "event"
  | "post"
  | "announcement"
  | null;

type EventRow = {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  location?: string | null;
  description?: string | null;
};

export default function AdminEventsScreen() {
  const [
    events,
    setEvents,
  ] = useState<EventRow[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    choiceVisible,
    setChoiceVisible,
  ] = useState(false);

  const [
    createType,
    setCreateType,
  ] = useState<CreateType>(null);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    startDateTime,
    setStartDateTime,
  ] = useState<Date | null>(null);

  const [
    endDateTime,
    setEndDateTime,
  ] = useState<Date | null>(null);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [
    registrationUrl,
    setRegistrationUrl,
  ] = useState("");

  const load = useCallback(
    async (
      showLoader = true
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const {
          data,
          error,
        } =
          await supabase
            .from("events")
            .select(`
              id,
              title,
              status,
              starts_at,
              location,
              description
            `)
            .order(
              "starts_at",
              {
                ascending: true,
              }
            );

        if (error) {
          throw error;
        }

        setEvents(
          (data || []) as EventRow[]
        );
      } catch (error: any) {
        console.log(
          "Admin events load error:",
          error
        );

        Alert.alert(
          "Events",
          error?.message ||
            "Could not load events."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  function resetForm() {
    setTitle("");
    setContent("");
    setLocation("");
    setStartDateTime(null);
    setEndDateTime(null);
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setRegistrationUrl("");
  }

  function closeCreator() {
    setCreateType(null);
    resetForm();
  }

  function selectCreateType(
    type:
      | "event"
      | "post"
      | "announcement"
  ) {
    setChoiceVisible(false);
    resetForm();
    setCreateType(type);
  }

  async function getAdminUser() {
    const {
      data: {
        user,
      },
      error,
    } =
      await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error(
        "You are not signed in."
      );
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id,role,status"
        )
        .eq(
          "id",
          user.id
        )
        .single();

    if (profileError) {
      throw profileError;
    }

    if (
      profile?.role !== "admin" ||
      profile?.status !== "active"
    ) {
      throw new Error(
        "Only active Richfield administrators can create official content."
      );
    }

    return user;
  }

  async function createNormalPost() {
    if (!content.trim()) {
      Alert.alert(
        "Post",
        "Please write something for the post."
      );

      return;
    }

    try {
      setSubmitting(true);

      const user =
        await getAdminUser();

      const {
        error,
      } =
        await supabase
          .from("posts")
          .insert({
            user_id: user.id,

            content:
              content.trim(),

            visibility:
              "Everyone",
          });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Published",
        "Your Richfield post has been published."
      );

      closeCreator();
    } catch (error: any) {
      console.log(
        "Admin post error:",
        error
      );

      Alert.alert(
        "Post",
        error?.message ||
          "Could not publish the post."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createAnnouncement() {
    if (!title.trim()) {
      Alert.alert(
        "Announcement",
        "Please enter an announcement title."
      );

      return;
    }

    if (!content.trim()) {
      Alert.alert(
        "Announcement",
        "Please enter the announcement."
      );

      return;
    }

    try {
      setSubmitting(true);

      const user =
        await getAdminUser();

      const announcement =
        `📢 ANNOUNCEMENT\n\n${title.trim()}\n\n${content.trim()}`;

      const {
        error,
      } =
        await supabase
          .from("posts")
          .insert({
            user_id: user.id,

            content:
              announcement,

            visibility:
              "Everyone",
          });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Announcement published",
        "The official announcement is now available in the Richfield feed."
      );

      closeCreator();
    } catch (error: any) {
      console.log(
        "Announcement error:",
        error
      );

      Alert.alert(
        "Announcement",
        error?.message ||
          "Could not publish the announcement."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatPickerDate(value: Date | null) {
    if (!value) return "Select date";

    return value.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatPickerTime(value: Date | null) {
    if (!value) return "Select time";

    return value.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function updateDatePart(
    current: Date | null,
    selected: Date
  ) {
    const next = current ? new Date(current) : new Date();
    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );
    return next;
  }

  function updateTimePart(
    current: Date | null,
    selected: Date
  ) {
    const next = current ? new Date(current) : new Date();
    next.setHours(
      selected.getHours(),
      selected.getMinutes(),
      0,
      0
    );
    return next;
  }

  function handleStartDateChange(
    event: DateTimePickerEvent,
    selected?: Date
  ) {
    setShowStartDatePicker(false);
    if (event.type === "dismissed" || !selected) return;
    setStartDateTime(current => updateDatePart(current, selected));
  }

  function handleStartTimeChange(
    event: DateTimePickerEvent,
    selected?: Date
  ) {
    setShowStartTimePicker(false);
    if (event.type === "dismissed" || !selected) return;
    setStartDateTime(current => updateTimePart(current, selected));
  }

  function handleEndDateChange(
    event: DateTimePickerEvent,
    selected?: Date
  ) {
    setShowEndDatePicker(false);
    if (event.type === "dismissed" || !selected) return;
    setEndDateTime(current => updateDatePart(current, selected));
  }

  function handleEndTimeChange(
    event: DateTimePickerEvent,
    selected?: Date
  ) {
    setShowEndTimePicker(false);
    if (event.type === "dismissed" || !selected) return;
    setEndDateTime(current => updateTimePart(current, selected));
  }

  async function createEvent() {
    if (!title.trim()) {
      Alert.alert(
        "Event",
        "Please enter an event title."
      );

      return;
    }

    if (!content.trim()) {
      Alert.alert(
        "Event",
        "Please enter an event description."
      );

      return;
    }

    try {
      setSubmitting(true);

      const user =
        await getAdminUser();

      if (!startDateTime) {
        throw new Error("Please select the event start date and time.");
      }

      if (!endDateTime) {
        throw new Error("Please select the event end date and time.");
      }

      if (endDateTime <= startDateTime) {
        throw new Error("The event must end after it starts.");
      }

      const {
        error,
      } =
        await supabase
          .from("events")
          .insert({
            created_by:
              user.id,

            title:
              title.trim(),

            description:
              content.trim(),

            event_type:
              "institutional",

            location:
              location.trim() ||
              null,

            starts_at:
              startDateTime.toISOString(),

            ends_at:
              endDateTime.toISOString(),

            registration_url:
              registrationUrl.trim() ||
              null,

            relevant_programmes:
              [],

            relevant_roles: [
              "student",
              "alumni",
            ],

            status:
              "published",
          });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Event published",
        "The Richfield event has been created successfully."
      );

      closeCreator();

      await load(false);
    } catch (error: any) {
      console.log(
        "Create event error:",
        error
      );

      Alert.alert(
        "Event",
        error?.message ||
          "Could not create the event."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitContent() {
    if (
      createType === "post"
    ) {
      await createNormalPost();
      return;
    }

    if (
      createType ===
      "announcement"
    ) {
      await createAnnouncement();
      return;
    }

    if (
      createType === "event"
    ) {
      await createEvent();
    }
  }

  async function togglePublish(
    item: EventRow
  ) {
    const status =
      item.status === "published"
        ? "draft"
        : "published";

    try {
      const {
        error,
      } =
        await supabase
          .from("events")
          .update({
            status,
          })
          .eq(
            "id",
            item.id
          );

      if (error) {
        throw error;
      }

      setEvents(
        current =>
          current.map(
            event =>
              event.id === item.id
                ? {
                    ...event,
                    status,
                  }
                : event
          )
      );
    } catch (error: any) {
      Alert.alert(
        "Events",
        error?.message ||
          "Could not update event."
      );
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load(false);
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

  return (
    <SafeAreaView
      style={styles.screen}
      edges={[
        "top",
        "left",
        "right",
      ]}
    >
      <View
        style={styles.header}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={styles.title}
          >
            Richfield Content
          </Text>

          <Text
            style={styles.subtitle}
          >
            Events, posts and official announcements
          </Text>
        </View>

        <Pressable
          style={
            styles.createButton
          }
          onPress={() =>
            setChoiceVisible(
              true
            )
          }
        >
          <Ionicons
            name="add"
            size={19}
            color="#fff"
          />

          <Text
            style={
              styles.createButtonText
            }
          >
            Create
          </Text>
        </Pressable>
      </View>

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
          Events
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Manage official Richfield events
        </Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={
          item => item.id
        }
        refreshing={
          refreshing
        }
        onRefresh={refresh}
        contentContainerStyle={
          events.length === 0
            ? styles.emptyList
            : styles.list
        }
        ListEmptyComponent={
          <View
            style={
              styles.emptyState
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={30}
                color={PRIMARY}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No events yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Create the first official Richfield event.
            </Text>

            <Pressable
              style={
                styles.emptyButton
              }
              onPress={() =>
                selectCreateType(
                  "event"
                )
              }
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Create event
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({
          item,
        }) => (
          <View
            style={styles.row}
          >
            <View
              style={
                styles.eventIcon
              }
            >
              <Ionicons
                name="calendar"
                size={20}
                color={PRIMARY}
              />
            </View>

            <View
              style={
                styles.eventContent
              }
            >
              <Text
                style={
                  styles.name
                }
              >
                {item.title}
              </Text>

              <Text
                style={
                  styles.meta
                }
              >
                {new Date(
                  item.starts_at
                ).toLocaleString(
                  "en-ZA",
                  {
                    day:
                      "numeric",
                    month:
                      "short",
                    year:
                      "numeric",
                    hour:
                      "2-digit",
                    minute:
                      "2-digit",
                  }
                )}
              </Text>

              {item.location ? (
                <View
                  style={
                    styles.locationRow
                  }
                >
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color="#777"
                  />

                  <Text
                    style={
                      styles.locationText
                    }
                  >
                    {item.location}
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.statusBadge,
                  item.status ===
                  "published"
                    ? styles.publishedBadge
                    : styles.draftBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status ===
                    "published"
                      ? styles.publishedText
                      : styles.draftText,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <Pressable
              style={
                styles.action
              }
              onPress={() =>
                togglePublish(
                  item
                )
              }
            >
              <Text
                style={
                  styles.actionText
                }
              >
                {item.status ===
                "published"
                  ? "Unpublish"
                  : "Publish"}
              </Text>
            </Pressable>
          </View>
        )}
      />

      <Modal
        visible={
          choiceVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setChoiceVisible(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setChoiceVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.choiceModal
            }
            onPress={event =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.modalHandle
              }
            />

            <Text
              style={
                styles.modalTitle
              }
            >
              Create content
            </Text>

            <Text
              style={
                styles.modalSubtitle
              }
            >
              What would you like to publish?
            </Text>

            <CreateChoice
              icon="calendar-outline"
              title="Event"
              description="Create an official Richfield event"
              onPress={() =>
                selectCreateType(
                  "event"
                )
              }
            />

            <CreateChoice
              icon="create-outline"
              title="Post"
              description="Share a normal post with the community"
              onPress={() =>
                selectCreateType(
                  "post"
                )
              }
            />

            <CreateChoice
              icon="megaphone-outline"
              title="Announcement"
              description="Publish an important official announcement"
              onPress={() =>
                selectCreateType(
                  "announcement"
                )
              }
            />

            <Pressable
              style={
                styles.cancelButton
              }
              onPress={() =>
                setChoiceVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={
          createType !== null
        }
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={
          closeCreator
        }
      >
        <SafeAreaView
          style={
            styles.creatorScreen
          }
        >
          <View
            style={
              styles.creatorHeader
            }
          >
            <Pressable
              style={
                styles.closeButton
              }
              onPress={
                closeCreator
              }
            >
              <Ionicons
                name="close"
                size={24}
                color="#222"
              />
            </Pressable>

            <Text
              style={
                styles.creatorTitle
              }
            >
              {createType ===
              "event"
                ? "Create Event"
                : createType ===
                  "announcement"
                ? "Announcement"
                : "Create Post"}
            </Text>

            <Pressable
              style={[
                styles.publishButton,
                submitting &&
                  styles.disabledButton,
              ]}
              disabled={
                submitting
              }
              onPress={
                submitContent
              }
            >
              {submitting ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.publishText
                  }
                >
                  Publish
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={
              styles.form
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={
                styles.typeBanner
              }
            >
              <Ionicons
                name={
                  createType ===
                  "event"
                    ? "calendar-outline"
                    : createType ===
                      "announcement"
                    ? "megaphone-outline"
                    : "create-outline"
                }
                size={20}
                color={PRIMARY}
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.typeTitle
                  }
                >
                  {createType ===
                  "event"
                    ? "Official Event"
                    : createType ===
                      "announcement"
                    ? "Official Announcement"
                    : "Richfield Post"}
                </Text>

                <Text
                  style={
                    styles.typeDescription
                  }
                >
                  {createType ===
                  "event"
                    ? "This will appear in Richfield events."
                    : createType ===
                      "announcement"
                    ? "This will be published as an official Richfield announcement."
                    : "This will appear as a normal post in the community feed."}
                </Text>
              </View>
            </View>

            {createType !==
            "post" ? (
              <Field
                label={
                  createType ===
                  "event"
                    ? "Title"
                    : "Announcement title"
                }
                value={title}
                onChangeText={
                  setTitle
                }
                placeholder={
                  createType ===
                  "event"
                    ? "e.g. Richfield Career Fair 2026"
                    : "e.g. Registration closing soon"
                }
              />
            ) : null}

            <Text
              style={
                styles.fieldLabel
              }
            >
              {createType ===
              "event"
                ? "Description"
                : createType ===
                  "announcement"
                ? "Announcement"
                : "What's happening at Richfield?"}
            </Text>

            <TextInput
              style={
                styles.contentInput
              }
              value={content}
              onChangeText={
                setContent
              }
              placeholder={
                createType ===
                "event"
                  ? "Tell students and alumni about the event..."
                  : createType ===
                    "announcement"
                  ? "Write the official announcement..."
                  : "Share an update with the Richfield community..."
              }
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />

            {createType ===
            "event" ? (
              <>
                <Text style={styles.fieldLabel}>Start date</Text>
                <Pressable
                  style={styles.datePickerButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
                  <Text style={styles.datePickerText}>
                    {formatPickerDate(startDateTime)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#888" />
                </Pressable>

                <Text style={styles.fieldLabel}>Start time</Text>
                <Pressable
                  style={styles.datePickerButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={PRIMARY} />
                  <Text style={styles.datePickerText}>
                    {formatPickerTime(startDateTime)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#888" />
                </Pressable>

                <Text style={styles.fieldLabel}>End date</Text>
                <Pressable
                  style={styles.datePickerButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
                  <Text style={styles.datePickerText}>
                    {formatPickerDate(endDateTime)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#888" />
                </Pressable>

                <Text style={styles.fieldLabel}>End time</Text>
                <Pressable
                  style={styles.datePickerButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={PRIMARY} />
                  <Text style={styles.datePickerText}>
                    {formatPickerTime(endDateTime)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#888" />
                </Pressable>

                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDateTime || new Date()}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={handleStartDateChange}
                  />
                )}

                {showStartTimePicker && (
                  <DateTimePicker
                    value={startDateTime || new Date()}
                    mode="time"
                    is24Hour
                    onChange={handleStartTimeChange}
                  />
                )}

                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDateTime || startDateTime || new Date()}
                    mode="date"
                    minimumDate={startDateTime || new Date()}
                    onChange={handleEndDateChange}
                  />
                )}

                {showEndTimePicker && (
                  <DateTimePicker
                    value={endDateTime || startDateTime || new Date()}
                    mode="time"
                    is24Hour
                    onChange={handleEndTimeChange}
                  />
                )}

                <Field
                  label="Location"
                  value={
                    location
                  }
                  onChangeText={
                    setLocation
                  }
                  placeholder="e.g. Richfield Centurion Campus"
                />

                <Field
                  label="Registration link"
                  value={
                    registrationUrl
                  }
                  onChangeText={
                    setRegistrationUrl
                  }
                  placeholder="Optional registration URL"
                  autoCapitalize="none"
                />
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function CreateChoice({
  icon,
  title,
  description,
  onPress,
}: {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];

  title: string;

  description: string;

  onPress: () => void;
}) {
  return (
    <Pressable
      style={
        styles.choice
      }
      onPress={onPress}
    >
      <View
        style={
          styles.choiceIcon
        }
      >
        <Ionicons
          name={icon}
          size={22}
          color={PRIMARY}
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.choiceTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.choiceDescription
          }
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color="#AAA"
      />
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText:
    (value: string) =>
      void;
  placeholder: string;
  autoCapitalize?:
    "none" |
    "sentences" |
    "words" |
    "characters";
}) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TextInput
        style={
          styles.input
        }
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#999"
        autoCapitalize={
          autoCapitalize
        }
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F5F5F7",
    },

    loading: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#fff",
    },

    header: {
      paddingHorizontal:
        18,
      paddingVertical:
        14,
      backgroundColor:
        "#fff",
      borderBottomWidth:
        1,
      borderBottomColor:
        "#ECECEE",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 12,
    },

    title: {
      fontSize: 24,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      marginTop: 3,
      color: "#777",
      fontSize: 11,
    },

    createButton: {
      minHeight: 40,
      paddingHorizontal:
        14,
      borderRadius: 9,
      backgroundColor:
        PRIMARY,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 4,
    },

    createButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },

    sectionHeader: {
      paddingHorizontal:
        18,
      paddingTop: 18,
      paddingBottom: 8,
    },

    sectionTitle: {
      color: "#171717",
      fontSize: 16,
      fontWeight: "800",
    },

    sectionDescription: {
      color: "#777",
      fontSize: 11,
      marginTop: 2,
    },

    list: {
      paddingVertical: 6,
      paddingBottom: 90,
    },

    emptyList: {
      flexGrow: 1,
    },

    row: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        18,
      paddingVertical:
        14,
      marginBottom: 1,
      backgroundColor:
        "#fff",
    },

    eventIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
      marginRight: 11,
    },

    eventContent: {
      flex: 1,
      paddingRight: 8,
    },

    name: {
      color: "#222",
      fontSize: 14,
      fontWeight: "700",
    },

    meta: {
      marginTop: 4,
      color: "#777",
      fontSize: 10,
    },

    locationRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 3,
      marginTop: 4,
    },

    locationText: {
      color: "#777",
      fontSize: 10,
    },

    statusBadge: {
      alignSelf:
        "flex-start",
      marginTop: 7,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
    },

    publishedBadge: {
      backgroundColor:
        "#EAF6EF",
    },

    draftBadge: {
      backgroundColor:
        "#F0F0F2",
    },

    statusText: {
      fontSize: 9,
      fontWeight: "800",
      textTransform:
        "uppercase",
    },

    publishedText: {
      color: "#287A52",
    },

    draftText: {
      color: "#777",
    },

    action: {
      paddingHorizontal:
        11,
      paddingVertical: 8,
      borderRadius: 7,
      backgroundColor:
        "#EEEEFF",
    },

    actionText: {
      color: PRIMARY,
      fontWeight: "700",
      fontSize: 10,
    },

    emptyState: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 30,
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
    },

    emptyTitle: {
      marginTop: 14,
      color: "#171717",
      fontSize: 17,
      fontWeight: "800",
    },

    emptyText: {
      marginTop: 5,
      color: "#777",
      textAlign:
        "center",
      fontSize: 12,
    },

    emptyButton: {
      marginTop: 16,
      backgroundColor:
        PRIMARY,
      borderRadius: 8,
      paddingHorizontal:
        16,
      paddingVertical: 10,
    },

    emptyButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },

    modalOverlay: {
      flex: 1,
      justifyContent:
        "flex-end",
      backgroundColor:
        "rgba(0,0,0,0.35)",
    },

    choiceModal: {
      backgroundColor:
        "#fff",
      borderTopLeftRadius:
        22,
      borderTopRightRadius:
        22,
      paddingHorizontal:
        18,
      paddingTop: 10,
      paddingBottom: 28,
    },

    modalHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        "#D7D7DC",
      alignSelf:
        "center",
      marginBottom: 17,
    },

    modalTitle: {
      color: "#111",
      fontSize: 20,
      fontWeight: "800",
    },

    modalSubtitle: {
      marginTop: 4,
      marginBottom: 16,
      color: "#777",
      fontSize: 12,
    },

    choice: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEEEF1",
    },

    choiceIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
      marginRight: 12,
    },

    choiceTitle: {
      color: "#222",
      fontSize: 14,
      fontWeight: "800",
    },

    choiceDescription: {
      marginTop: 3,
      color: "#777",
      fontSize: 11,
    },

    cancelButton: {
      alignItems:
        "center",
      paddingTop: 18,
    },

    cancelText: {
      color: "#777",
      fontSize: 13,
      fontWeight: "700",
    },

    creatorScreen: {
      flex: 1,
      backgroundColor:
        "#F7F7F9",
    },

    creatorHeader: {
      minHeight: 62,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        14,
      borderBottomWidth: 1,
      borderBottomColor:
        "#E9E9ED",
      backgroundColor:
        "#fff",
    },

    closeButton: {
      width: 40,
      height: 40,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    creatorTitle: {
      flex: 1,
      textAlign:
        "center",
      color: "#171717",
      fontSize: 16,
      fontWeight: "800",
    },

    publishButton: {
      minWidth: 76,
      minHeight: 38,
      paddingHorizontal:
        12,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 8,
      backgroundColor:
        PRIMARY,
    },

    disabledButton: {
      opacity: 0.6,
    },

    publishText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },

    form: {
      padding: 18,
      paddingBottom: 50,
    },

    typeBanner: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 11,
      padding: 14,
      borderRadius: 12,
      backgroundColor:
        "#EEEEFF",
      marginBottom: 22,
    },

    typeTitle: {
      color: PRIMARY,
      fontSize: 13,
      fontWeight: "800",
    },

    typeDescription: {
      marginTop: 2,
      color: "#5D5D77",
      fontSize: 10,
      lineHeight: 15,
    },

    field: {
      marginBottom: 16,
    },

    fieldLabel: {
      marginBottom: 7,
      color: "#333",
      fontSize: 12,
      fontWeight: "700",
    },

    input: {
      minHeight: 48,
      paddingHorizontal:
        13,
      borderWidth: 1,
      borderColor:
        "#DEDEE3",
      borderRadius: 10,
      backgroundColor:
        "#fff",
      color: "#222",
      fontSize: 13,
    },

    contentInput: {
      minHeight: 150,
      padding: 13,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        "#DEDEE3",
      borderRadius: 10,
      backgroundColor:
        "#fff",
      color: "#222",
      fontSize: 13,
      lineHeight: 20,
    },

    datePickerButton: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 10,
      backgroundColor: "#FFF",
      paddingHorizontal: 14,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    datePickerText: {
      flex: 1,
      color: "#222",
      fontSize: 14,
      fontWeight: "600",
    },
  });