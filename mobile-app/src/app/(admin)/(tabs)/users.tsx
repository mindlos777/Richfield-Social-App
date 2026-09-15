import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
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
import { router, useFocusEffect } from "expo-router";

import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type UserType =
  | "student"
  | "alumni"
  | "business";

type UserRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  role: string | null;
  status: string | null;
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedType, setSelectedType] =
    useState<UserType>("student");

  const [selectedUser, setSelectedUser] =
    useState<UserRow | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusLoadingId, setStatusLoadingId] =
    useState<string | null>(null);

  const load = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            email,
            avatar_url,
            headline,
            bio,
            role,
            status
          `)
          .in("role", [
            "student",
            "alumni",
            "business",
          ])
          .order("full_name", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setUsers((data || []) as UserRow[]);
      } catch (error: any) {
        console.log(
          "Admin users error:",
          error
        );

        Alert.alert(
          "Users",
          error?.message ||
            "Could not load users."
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

  const studentCount = useMemo(
    () =>
      users.filter(
        item =>
          item.role === "student"
      ).length,
    [users]
  );

  const alumniCount = useMemo(
    () =>
      users.filter(
        item =>
          item.role === "alumni"
      ).length,
    [users]
  );

  const businessCount = useMemo(
    () =>
      users.filter(
        item =>
          item.role === "business" &&
          item.status !== "pending"
      ).length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    let list = users.filter(
      item =>
        item.role === selectedType
    );

    // Pending businesses belong in Review Center.
    if (
      selectedType === "business"
    ) {
      list = list.filter(
        item =>
          item.status !== "pending"
      );
    }

    const value =
      search
        .trim()
        .toLowerCase();

    if (!value) {
      return list;
    }

    return list.filter(
      item => {
        const searchable = `
          ${item.full_name || ""}
          ${item.username || ""}
          ${item.email || ""}
          ${item.headline || ""}
          ${item.status || ""}
        `.toLowerCase();

        return searchable.includes(
          value
        );
      }
    );
  }, [
    users,
    selectedType,
    search,
  ]);

  function changeType(
    type: UserType
  ) {
    setSelectedType(type);
    setSearch("");
  }

  function confirmStatusChange(
    user: UserRow
  ) {
    const suspended =
      user.status ===
      "suspended";

    const nextStatus =
      suspended
        ? "active"
        : "suspended";

    Alert.alert(
      suspended
        ? "Reactivate account"
        : "Suspend account",

      suspended
        ? `Reactivate ${
            user.full_name ||
            "this account"
          }?`
        : `Suspend ${
            user.full_name ||
            "this account"
          }? They will no longer have normal access until the account is reactivated.`,

      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text:
            suspended
              ? "Reactivate"
              : "Suspend",

          style:
            suspended
              ? "default"
              : "destructive",

          onPress: () =>
            updateStatus(
              user.id,
              nextStatus
            ),
        },
      ]
    );
  }

  async function updateStatus(
    id: string,
    status:
      | "active"
      | "suspended"
  ) {
    try {
      setStatusLoadingId(id);

      const { error } =
        await supabase
          .from("profiles")
          .update({
            status,
          })
          .eq("id", id)
          .neq(
            "role",
            "admin"
          );

      if (error) {
        throw error;
      }

      setUsers(current =>
        current.map(item =>
          item.id === id
            ? {
                ...item,
                status,
              }
            : item
        )
      );

      setSelectedUser(
        current =>
          current?.id === id
            ? {
                ...current,
                status,
              }
            : current
      );
    } catch (error: any) {
      console.log(
        "Update user status:",
        error
      );

      Alert.alert(
        "Users",
        error?.message ||
          "Could not update user."
      );
    } finally {
      setStatusLoadingId(
        null
      );
    }
  }

  function openPublicProfile(
    user: UserRow
  ) {
    setSelectedUser(null);

    router.push({
      pathname:
        "/member-profile",

      params: {
        userId: user.id,
        id: user.id,

        name:
          user.full_name ||
          "",

        username:
          user.username ||
          "",

        image:
          user.avatar_url ||
          "",

        role:
          user.role ||
          "student",
      },
    });
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
        <Text
          style={styles.title}
        >
          Users
        </Text>

        <Text
          style={styles.subtitle}
        >
          Manage Richfield Connect accounts
        </Text>
      </View>

      <View
        style={styles.tabs}
      >
        <UserTab
          icon="school-outline"
          label="Students"
          count={studentCount}
          active={
            selectedType ===
            "student"
          }
          onPress={() =>
            changeType(
              "student"
            )
          }
        />

        <UserTab
          icon="ribbon-outline"
          label="Alumni"
          count={alumniCount}
          active={
            selectedType ===
            "alumni"
          }
          onPress={() =>
            changeType(
              "alumni"
            )
          }
        />

        <UserTab
          icon="business-outline"
          label="Businesses"
          count={businessCount}
          active={
            selectedType ===
            "business"
          }
          onPress={() =>
            changeType(
              "business"
            )
          }
        />
      </View>

      <View
        style={
          styles.searchContainer
        }
      >
        <Ionicons
          name="search-outline"
          size={19}
          color="#777"
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            selectedType ===
            "student"
              ? "Search students"
              : selectedType ===
                "alumni"
              ? "Search alumni"
              : "Search businesses"
          }
          placeholderTextColor="#999"
          style={styles.searchInput}
        />

        {search.length > 0 ? (
          <Pressable
            onPress={() =>
              setSearch("")
            }
          >
            <Ionicons
              name="close-circle"
              size={19}
              color="#AAA"
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={
          styles.resultHeader
        }
      >
        <Text
          style={
            styles.resultTitle
          }
        >
          {selectedType ===
          "student"
            ? "Students"
            : selectedType ===
              "alumni"
            ? "Alumni"
            : "Businesses"}
        </Text>

        <Text
          style={
            styles.resultCount
          }
        >
          {
            filteredUsers.length
          }{" "}
          account
          {filteredUsers.length ===
          1
            ? ""
            : "s"}
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={
          item => item.id
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              refresh
            }
            tintColor={
              PRIMARY
            }
          />
        }
        contentContainerStyle={
          filteredUsers.length
            ? styles.list
            : styles.emptyList
        }
        ListEmptyComponent={
          <View
            style={
              styles.empty
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name={
                  selectedType ===
                  "student"
                    ? "school-outline"
                    : selectedType ===
                      "alumni"
                    ? "ribbon-outline"
                    : "business-outline"
                }
                size={32}
                color={
                  PRIMARY
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No{" "}
              {selectedType ===
              "business"
                ? "businesses"
                : selectedType}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {search
                ? "No accounts match your search."
                : "There are no accounts in this category yet."}
            </Text>
          </View>
        }
        renderItem={({
          item,
        }) => (
          <UserCard
            user={item}
            loading={
              statusLoadingId ===
              item.id
            }
            onPress={() =>
              setSelectedUser(
                item
              )
            }
            onStatusPress={() =>
              confirmStatusChange(
                item
              )
            }
          />
        )}
      />

      <UserDetailsModal
        user={selectedUser}
        loading={
          selectedUser
            ? statusLoadingId ===
              selectedUser.id
            : false
        }
        onClose={() =>
          setSelectedUser(
            null
          )
        }
        onProfile={() => {
          if (
            selectedUser
          ) {
            openPublicProfile(
              selectedUser
            );
          }
        }}
        onStatus={() => {
          if (
            selectedUser
          ) {
            confirmStatusChange(
              selectedUser
            );
          }
        }}
      />
    </SafeAreaView>
  );
}

function UserTab({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.tab,
        active &&
          styles.activeTab,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={
          active
            ? PRIMARY
            : "#777"
        }
      />

      <Text
        style={[
          styles.tabText,
          active &&
            styles.activeTabText,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.countBadge,
          active &&
            styles.activeCountBadge,
        ]}
      >
        <Text
          style={[
            styles.countText,
            active &&
              styles.activeCountText,
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function UserCard({
  user,
  loading,
  onPress,
  onStatusPress,
}: {
  user: UserRow;
  loading: boolean;
  onPress: () => void;
  onStatusPress: () => void;
}) {
  const suspended =
    user.status ===
    "suspended";

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
    >
      <Avatar
        user={user}
        size={48}
      />

      <View
        style={
          styles.userContent
        }
      >
        <Text
          style={
            styles.name
          }
          numberOfLines={1}
        >
          {user.full_name ||
            "Richfield Member"}
        </Text>

        {user.username ? (
          <Text
            style={
              styles.username
            }
          >
            @
            {user.username.replace(
              /^@/,
              ""
            )}
          </Text>
        ) : null}

        <View
          style={
            styles.userMeta
          }
        >
          <View
            style={
              styles.roleBadge
            }
          >
            <Text
              style={
                styles.roleText
              }
            >
              {formatRole(
                user.role
              )}
            </Text>
          </View>

          <StatusBadge
            status={
              user.status
            }
          />
        </View>
      </View>

      <Pressable
        style={[
          styles.statusButton,
          suspended
            ? styles.activateButton
            : styles.suspendButton,
        ]}
        onPress={event => {
          event.stopPropagation();
          onStatusPress();
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              suspended
                ? PRIMARY
                : "#B42318"
            }
          />
        ) : (
          <Text
            style={[
              styles.statusButtonText,
              suspended
                ? styles.activateText
                : styles.suspendText,
            ]}
          >
            {suspended
              ? "Activate"
              : "Suspend"}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
}

function UserDetailsModal({
  user,
  loading,
  onClose,
  onProfile,
  onStatus,
}: {
  user:
    | UserRow
    | null;
  loading: boolean;
  onClose: () => void;
  onProfile: () => void;
  onStatus: () => void;
}) {
  const suspended =
    user?.status ===
    "suspended";

  return (
    <Modal
      visible={!!user}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={
        onClose
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
              styles.closeButton
            }
            onPress={onClose}
          >
            <Ionicons
              name="close"
              size={25}
              color="#222"
            />
          </Pressable>

          <Text
            style={
              styles.modalTitle
            }
          >
            Account
          </Text>

          <View
            style={{
              width: 40,
            }}
          />
        </View>

        {user ? (
          <ScrollView
            contentContainerStyle={
              styles.modalContent
            }
          >
            <View
              style={
                styles.profileTop
              }
            >
              <Avatar
                user={user}
                size={86}
              />

              <Text
                style={
                  styles.profileName
                }
              >
                {user.full_name ||
                  "Richfield Member"}
              </Text>

              {user.username ? (
                <Text
                  style={
                    styles.profileUsername
                  }
                >
                  @
                  {user.username.replace(
                    /^@/,
                    ""
                  )}
                </Text>
              ) : null}

              <View
                style={
                  styles.profileBadges
                }
              >
                <View
                  style={
                    styles.roleBadge
                  }
                >
                  <Text
                    style={
                      styles.roleText
                    }
                  >
                    {formatRole(
                      user.role
                    )}
                  </Text>
                </View>

                <StatusBadge
                  status={
                    user.status
                  }
                />
              </View>

              {user.headline ? (
                <Text
                  style={
                    styles.headline
                  }
                >
                  {
                    user.headline
                  }
                </Text>
              ) : null}
            </View>

            <View
              style={
                styles.detailsCard
              }
            >
              <DetailRow
                label="Name"
                value={
                  user.full_name ||
                  "Not provided"
                }
              />

              <DetailRow
                label="Email"
                value={
                  user.email ||
                  "Not provided"
                }
              />

              <DetailRow
                label="Username"
                value={
                  user.username
                    ? `@${user.username.replace(
                        /^@/,
                        ""
                      )}`
                    : "Not provided"
                }
              />

              <DetailRow
                label="Account type"
                value={formatRole(
                  user.role
                )}
              />

              <DetailRow
                label="Status"
                value={
                  user.status ||
                  "Unknown"
                }
                last
              />
            </View>

            {user.bio ? (
              <View
                style={
                  styles.bioCard
                }
              >
                <Text
                  style={
                    styles.bioLabel
                  }
                >
                  About
                </Text>

                <Text
                  style={
                    styles.bioText
                  }
                >
                  {user.bio}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={
                styles.profileButton
              }
              onPress={
                onProfile
              }
            >
              <Ionicons
                name="person-outline"
                size={18}
                color="#fff"
              />

              <Text
                style={
                  styles.profileButtonText
                }
              >
                View profile
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.manageButton,
                suspended
                  ? styles.reactivateLarge
                  : styles.suspendLarge,
              ]}
              onPress={
                onStatus
              }
              disabled={
                loading
              }
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={
                    suspended
                      ? PRIMARY
                      : "#B42318"
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      suspended
                        ? "checkmark-circle-outline"
                        : "ban-outline"
                    }
                    size={18}
                    color={
                      suspended
                        ? PRIMARY
                        : "#B42318"
                    }
                  />

                  <Text
                    style={[
                      styles.manageText,
                      {
                        color:
                          suspended
                            ? PRIMARY
                            : "#B42318",
                      },
                    ]}
                  >
                    {suspended
                      ? "Reactivate account"
                      : "Suspend account"}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function Avatar({
  user,
  size,
}: {
  user: UserRow;
  size: number;
}) {
  if (user.avatar_url) {
    return (
      <Image
        source={{
          uri:
            user.avatar_url,
        }}
        style={{
          width: size,
          height: size,
          borderRadius:
            size / 2,
          backgroundColor:
            "#EEE",
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius:
          size / 2,
        backgroundColor:
          "#EEEEFF",
        alignItems:
          "center",
        justifyContent:
          "center",
      }}
    >
      <Text
        style={{
          color: PRIMARY,
          fontSize:
            size * 0.32,
          fontWeight: "900",
        }}
      >
        {getInitials(
          user.full_name
        )}
      </Text>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | string
    | null;
}) {
  const value =
    String(
      status ||
        "unknown"
    ).toLowerCase();

  const suspended =
    value ===
    "suspended";

  const rejected =
    value ===
    "rejected";

  return (
    <View
      style={[
        styles.statusBadge,
        suspended
          ? styles.suspendedBadge
          : rejected
          ? styles.rejectedBadge
          : styles.activeBadge,
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor:
              suspended
                ? "#B42318"
                : rejected
                ? "#9B3A31"
                : "#218358",
          },
        ]}
      />

      <Text
        style={[
          styles.statusText,
          {
            color:
              suspended ||
              rejected
                ? "#B42318"
                : "#287A52",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        last &&
          styles.lastDetailRow,
      ]}
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function formatRole(
  role:
    | string
    | null
) {
  if (
    role === "student"
  ) {
    return "Student";
  }

  if (
    role === "alumni"
  ) {
    return "Alumni";
  }

  if (
    role === "business"
  ) {
    return "Business";
  }

  return "Member";
}

function getInitials(
  name:
    | string
    | null
) {
  if (!name) {
    return "R";
  }

  const words =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length === 1
  ) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    words[0]
      .charAt(0)
      .toUpperCase() +
    words[
      words.length - 1
    ]
      .charAt(0)
      .toUpperCase()
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
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 14,
      backgroundColor:
        "#fff",
      borderBottomWidth: 1,
      borderBottomColor:
        "#ECECEE",
    },

    title: {
      fontSize: 25,
      fontWeight: "800",
      color: "#111",
    },

    subtitle: {
      marginTop: 3,
      color: "#777",
      fontSize: 12,
    },

    tabs: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 5,
      gap: 6,
    },

    tab: {
      flex: 1,
      minHeight: 70,
      borderRadius: 11,
      backgroundColor:
        "#fff",
      borderWidth: 1,
      borderColor:
        "#E4E4E8",
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
    },

    activeTab: {
      borderColor:
        PRIMARY,
      backgroundColor:
        "#F1F1FF",
    },

    tabText: {
      marginTop: 4,
      color: "#666",
      fontSize: 10,
      fontWeight: "700",
    },

    activeTabText: {
      color: PRIMARY,
    },

    countBadge: {
      position:
        "absolute",
      right: 6,
      top: 6,
      minWidth: 19,
      height: 19,
      paddingHorizontal: 4,
      borderRadius: 10,
      backgroundColor:
        "#EEEEF1",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    activeCountBadge: {
      backgroundColor:
        PRIMARY,
    },

    countText: {
      color: "#666",
      fontSize: 8,
      fontWeight: "900",
    },

    activeCountText: {
      color: "#fff",
    },

    searchContainer: {
      minHeight: 44,
      marginHorizontal: 14,
      marginTop: 10,
      marginBottom: 10,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor:
        "#E0E0E4",
      borderRadius: 10,
      backgroundColor:
        "#fff",
      flexDirection: "row",
      alignItems:
        "center",
      gap: 8,
    },

    searchInput: {
      flex: 1,
      color: "#111",
      fontSize: 13,
    },

    resultHeader: {
      paddingHorizontal: 16,
      paddingTop: 3,
      paddingBottom: 9,
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    resultTitle: {
      color: "#222",
      fontSize: 13,
      fontWeight: "800",
    },

    resultCount: {
      color: "#888",
      fontSize: 10,
    },

    list: {
      paddingHorizontal: 12,
      paddingBottom: 100,
    },

    emptyList: {
      flexGrow: 1,
    },

    card: {
      minHeight: 78,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 7,
      borderRadius: 11,
      backgroundColor:
        "#fff",
      borderWidth: 1,
      borderColor:
        "#ECECF0",
      flexDirection: "row",
      alignItems:
        "center",
      gap: 11,
    },

    userContent: {
      flex: 1,
    },

    name: {
      color: "#222",
      fontSize: 13,
      fontWeight: "800",
    },

    username: {
      marginTop: 2,
      color: "#777",
      fontSize: 10,
    },

    userMeta: {
      flexDirection: "row",
      alignItems:
        "center",
      gap: 5,
      marginTop: 6,
    },

    roleBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor:
        "#EEEEFF",
    },

    roleText: {
      color: PRIMARY,
      fontSize: 8,
      fontWeight: "800",
    },

    statusBadge: {
      flexDirection: "row",
      alignItems:
        "center",
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },

    activeBadge: {
      backgroundColor:
        "#EAF6EF",
    },

    suspendedBadge: {
      backgroundColor:
        "#FDECEC",
    },

    rejectedBadge: {
      backgroundColor:
        "#FDECEC",
    },

    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "800",
      textTransform:
        "capitalize",
    },

    statusButton: {
      minWidth: 68,
      minHeight: 34,
      paddingHorizontal: 9,
      borderRadius: 7,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    suspendButton: {
      backgroundColor:
        "#FDECEC",
    },

    activateButton: {
      backgroundColor:
        "#EEEEFF",
    },

    statusButtonText: {
      fontSize: 9,
      fontWeight: "800",
    },

    suspendText: {
      color: "#B42318",
    },

    activateText: {
      color: PRIMARY,
    },

    empty: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingBottom: 80,
    },

    emptyIcon: {
      width: 66,
      height: 66,
      borderRadius: 33,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EEEEFF",
    },

    emptyTitle: {
      marginTop: 14,
      color: "#222",
      fontSize: 16,
      fontWeight: "800",
      textTransform:
        "capitalize",
    },

    emptyText: {
      marginTop: 5,
      color: "#777",
      fontSize: 11,
    },

    modalScreen: {
      flex: 1,
      backgroundColor:
        "#F5F5F7",
    },

    modalHeader: {
      minHeight: 60,
      flexDirection: "row",
      alignItems:
        "center",
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        "#E8E8EC",
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

    modalTitle: {
      flex: 1,
      textAlign:
        "center",
      color: "#171717",
      fontSize: 16,
      fontWeight: "800",
    },

    modalContent: {
      paddingBottom: 50,
    },

    profileTop: {
      alignItems:
        "center",
      paddingHorizontal: 20,
      paddingVertical: 28,
      backgroundColor:
        "#fff",
    },

    profileName: {
      marginTop: 13,
      color: "#171717",
      fontSize: 20,
      fontWeight: "900",
      textAlign:
        "center",
    },

    profileUsername: {
      marginTop: 3,
      color: "#777",
      fontSize: 11,
    },

    profileBadges: {
      flexDirection: "row",
      gap: 6,
      marginTop: 9,
    },

    headline: {
      marginTop: 12,
      maxWidth: 320,
      color: "#555",
      fontSize: 12,
      textAlign:
        "center",
    },

    detailsCard: {
      margin: 16,
      marginBottom: 10,
      borderRadius: 12,
      backgroundColor:
        "#fff",
      overflow:
        "hidden",
    },

    detailRow: {
      minHeight: 60,
      paddingHorizontal: 15,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor:
        "#EEEEF1",
      justifyContent:
        "center",
    },

    lastDetailRow: {
      borderBottomWidth: 0,
    },

    detailLabel: {
      color: "#888",
      fontSize: 9,
      fontWeight: "700",
      textTransform:
        "uppercase",
    },

    detailValue: {
      marginTop: 4,
      color: "#222",
      fontSize: 12,
      fontWeight: "600",
      textTransform:
        "capitalize",
    },

    bioCard: {
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 15,
      borderRadius: 12,
      backgroundColor:
        "#fff",
    },

    bioLabel: {
      color: "#777",
      fontSize: 9,
      fontWeight: "800",
      textTransform:
        "uppercase",
    },

    bioText: {
      marginTop: 7,
      color: "#444",
      fontSize: 12,
      lineHeight: 18,
    },

    profileButton: {
      minHeight: 48,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 9,
      backgroundColor:
        PRIMARY,
      flexDirection: "row",
      gap: 7,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    profileButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },

    manageButton: {
      minHeight: 48,
      marginHorizontal: 16,
      marginTop: 9,
      borderRadius: 9,
      flexDirection: "row",
      gap: 7,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    suspendLarge: {
      borderWidth: 1,
      borderColor:
        "#F0C4C0",
      backgroundColor:
        "#FFF7F6",
    },

    reactivateLarge: {
      borderWidth: 1,
      borderColor:
        "#D9D9F5",
      backgroundColor:
        "#F4F4FF",
    },

    manageText: {
      fontSize: 12,
      fontWeight: "800",
    },
  });