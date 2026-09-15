import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

export function AlumniHomeScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);

  useEffect(() => {
    loadHome();
  }, []);

  const loadHome = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const { data: opportunityData } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);

      setOpportunities(opportunityData || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Welcome back,
          </Text>

          <Text style={styles.name}>
            {profile?.full_name || "Alumni"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() =>
            router.push("/(alumni)/profile")
          }
        >
          <Ionicons
            name="person-outline"
            size={22}
            color={PRIMARY}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Keep building your career.
        </Text>

        <Text style={styles.heroText}>
          Connect with Richfield students, alumni and
          businesses while discovering new opportunities.
        </Text>

        <TouchableOpacity
          style={styles.heroButton}
          onPress={() =>
            router.push("/(alumni)/network")
          }
        >
          <Text style={styles.heroButtonText}>
            Explore Network
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Career opportunities
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push("/(alumni)/opportunities")
          }
        >
          <Text style={styles.seeAll}>
            See all
          </Text>
        </TouchableOpacity>
      </View>

      {opportunities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="briefcase-outline"
            size={35}
            color="#aaa"
          />

          <Text style={styles.emptyTitle}>
            No opportunities yet
          </Text>

          <Text style={styles.emptyText}>
            New opportunities will appear here.
          </Text>
        </View>
      ) : (
        opportunities.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.opportunityCard}
          >
            <View style={styles.opportunityIcon}>
              <Ionicons
                name="briefcase-outline"
                size={22}
                color={PRIMARY}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.opportunityTitle}>
                {item.title}
              </Text>

              <Text style={styles.company}>
                {item.company_name}
              </Text>

              <Text style={styles.location}>
                {item.location || "South Africa"}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

export function AlumniNetworkScreen() {
  return <NetworkWrapper />;
}

function NetworkWrapper() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (refresh = false) => {
    try {
      if (!refresh) {
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
        throw new Error("You are not signed in.");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          username,
          role,
          avatar_url,
          bio,
          headline,
          status
        `)
        .neq("id", user.id)
        .eq("status", "active")
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

      setUsers(data || []);
    } catch (error) {
      console.log(
        "Alumni network error:",
        error
      );

      Alert.alert(
        "Network",
        error?.message ||
          "Could not load the Richfield network."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadUsers(true);
  };

  const filtered = users.filter((user) => {
    const matchesRole =
      selectedRole === "all" ||
      user.role === selectedRole;

    if (!matchesRole) {
      return false;
    }

    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return true;
    }

    return (
      user.full_name
        ?.toLowerCase()
        .includes(value) ||
      user.username
        ?.toLowerCase()
        .includes(value) ||
      user.bio
        ?.toLowerCase()
        .includes(value) ||
      user.headline
        ?.toLowerCase()
        .includes(value)
    );
  });

  const alumniCount = users.filter(
    (user) => user.role === "alumni"
  ).length;

  const studentCount = users.filter(
    (user) => user.role === "student"
  ).length;

  const businessCount = users.filter(
    (user) => user.role === "business"
  ).length;

  const openProfile = (item) => {
    router.push({
      pathname: "/member-profile",
      params: {
        userId: item.id,
        id: item.id,
        name: item.full_name || "",
        username: item.username || "",
        image: item.avatar_url || "",
        role: item.role || "student",
      },
    });
  };

  const renderUser = ({ item }) => {
    return (
      <TouchableOpacity
        style={networkStyles.personCard}
        activeOpacity={0.75}
        onPress={() => openProfile(item)}
      >
        <View style={networkStyles.avatarContainer}>
          {item.avatar_url ? (
            <Image
              source={{
                uri: item.avatar_url,
              }}
              style={networkStyles.avatar}
            />
          ) : (
            <View style={networkStyles.avatarFallback}>
              <Text style={networkStyles.avatarText}>
                {getNetworkInitials(item.full_name)}
              </Text>
            </View>
          )}

          <View style={networkStyles.onlineRoleDot}>
            <Ionicons
              name={getRoleIcon(item.role)}
              size={10}
              color="#fff"
            />
          </View>
        </View>

        <View style={networkStyles.personContent}>
          <View style={networkStyles.nameRow}>
            <Text
              style={networkStyles.personName}
              numberOfLines={1}
            >
              {item.full_name || "Richfield Member"}
            </Text>

            <View
              style={[
                networkStyles.roleBadge,
                item.role === "alumni" &&
                  networkStyles.alumniRoleBadge,
                item.role === "business" &&
                  networkStyles.businessRoleBadge,
              ]}
            >
              <Text
                style={[
                  networkStyles.roleBadgeText,
                  item.role === "alumni" &&
                    networkStyles.alumniRoleText,
                  item.role === "business" &&
                    networkStyles.businessRoleText,
                ]}
              >
                {formatNetworkRole(item.role)}
              </Text>
            </View>
          </View>

          {item.username ? (
            <Text style={networkStyles.username}>
              @{item.username.replace(/^@/, "")}
            </Text>
          ) : null}

          {item.headline ? (
            <Text
              style={networkStyles.headline}
              numberOfLines={1}
            >
              {item.headline}
            </Text>
          ) : item.bio ? (
            <Text
              style={networkStyles.headline}
              numberOfLines={1}
            >
              {item.bio}
            </Text>
          ) : (
            <Text style={networkStyles.headline}>
              Richfield {formatNetworkRole(item.role)}
            </Text>
          )}
        </View>

        <View style={networkStyles.viewButton}>
          <Text style={networkStyles.viewButtonText}>
            View
          </Text>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={PRIMARY}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />

        <Text style={networkStyles.loadingText}>
          Loading your network...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={networkStyles.header}>
        <Text style={networkStyles.title}>
          Network
        </Text>

        <Text style={networkStyles.subtitle}>
          Connect with the Richfield community.
        </Text>

        <View style={networkStyles.stats}>
          <View style={networkStyles.stat}>
            <Text style={networkStyles.statNumber}>
              {alumniCount}
            </Text>

            <Text style={networkStyles.statLabel}>
              Alumni
            </Text>
          </View>

          <View style={networkStyles.statDivider} />

          <View style={networkStyles.stat}>
            <Text style={networkStyles.statNumber}>
              {studentCount}
            </Text>

            <Text style={networkStyles.statLabel}>
              Students
            </Text>
          </View>

          <View style={networkStyles.statDivider} />

          <View style={networkStyles.stat}>
            <Text style={networkStyles.statNumber}>
              {businessCount}
            </Text>

            <Text style={networkStyles.statLabel}>
              Businesses
            </Text>
          </View>
        </View>
      </View>

      <View style={networkStyles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={19}
          color="#777"
        />

        <TextInput
          placeholder="Search people, skills, careers..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={networkStyles.searchInput}
        />

        {search.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearch("")}
          >
            <Ionicons
              name="close-circle"
              size={19}
              color="#AAA"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={networkStyles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={networkStyles.filters}
        >
          <NetworkFilter
            label="All"
            active={selectedRole === "all"}
            onPress={() => setSelectedRole("all")}
          />

          <NetworkFilter
            label="Alumni"
            count={alumniCount}
            active={selectedRole === "alumni"}
            onPress={() => setSelectedRole("alumni")}
          />

          <NetworkFilter
            label="Students"
            count={studentCount}
            active={selectedRole === "student"}
            onPress={() => setSelectedRole("student")}
          />

          <NetworkFilter
            label="Businesses"
            count={businessCount}
            active={selectedRole === "business"}
            onPress={() => setSelectedRole("business")}
          />
        </ScrollView>
      </View>

      <View style={networkStyles.resultHeader}>
        <Text style={networkStyles.resultTitle}>
          {selectedRole === "all"
            ? "Richfield Community"
            : selectedRole === "alumni"
            ? "Richfield Alumni"
            : selectedRole === "student"
            ? "Current Students"
            : "Businesses"}
        </Text>

        <Text style={networkStyles.resultCount}>
          {filtered.length}{" "}
          {filtered.length === 1 ? "result" : "results"}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        refreshing={refreshing}
        onRefresh={refresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filtered.length
            ? networkStyles.list
            : networkStyles.emptyList
        }
        ListEmptyComponent={
          <View style={networkStyles.empty}>
            <View style={networkStyles.emptyIcon}>
              <Ionicons
                name="people-outline"
                size={34}
                color={PRIMARY}
              />
            </View>

            <Text style={networkStyles.emptyTitle}>
              No members found
            </Text>

            <Text style={networkStyles.emptyText}>
              {search
                ? "Try searching for another name, username or career."
                : "There are no active members in this category yet."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function NetworkFilter({
  label,
  count,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        networkStyles.filter,
        active && networkStyles.activeFilter,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          networkStyles.filterText,
          active && networkStyles.activeFilterText,
        ]}
      >
        {label}
      </Text>

      {typeof count === "number" ? (
        <View
          style={[
            networkStyles.filterCount,
            active && networkStyles.activeFilterCount,
          ]}
        >
          <Text
            style={[
              networkStyles.filterCountText,
              active &&
                networkStyles.activeFilterCountText,
            ]}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function formatNetworkRole(role) {
  if (role === "student") {
    return "Student";
  }

  if (role === "alumni") {
    return "Alumni";
  }

  if (role === "business") {
    return "Business";
  }

  return "Member";
}

function getRoleIcon(role) {
  if (role === "student") {
    return "school";
  }

  if (role === "alumni") {
    return "ribbon";
  }

  if (role === "business") {
    return "business";
  }

  return "person";
}

function getNetworkInitials(name) {
  if (!name) {
    return "R";
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    words[0].charAt(0).toUpperCase() +
    words[words.length - 1]
      .charAt(0)
      .toUpperCase()
  );
}

export function AlumniProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      Alert.alert(
        "Profile error",
        error.message || "Could not load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.largeAvatar}>
          <Text style={styles.largeAvatarText}>
            {profile?.full_name
              ?.charAt(0)
              ?.toUpperCase() || "A"}
          </Text>
        </View>

        <Text style={styles.profileName}>
          {profile?.full_name}
        </Text>

        <Text style={styles.profileUsername}>
          {profile?.username
            ? `@${profile.username}`
            : "Alumni"}
        </Text>

        <View style={styles.alumniBadge}>
          <Ionicons
            name="school-outline"
            size={15}
            color={PRIMARY}
          />

          <Text style={styles.alumniBadgeText}>
            Richfield Alumni
          </Text>
        </View>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>
          About
        </Text>

        <Text style={styles.about}>
          {profile?.bio ||
            "Tell the Richfield community about yourself."}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          router.push("/(alumni)/settings")
        }
      >
        <Ionicons
          name="create-outline"
          size={19}
          color="#fff"
        />

        <Text style={styles.editButtonText}>
          Edit profile
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export function AlumniOpportunitiesScreen() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "approved")
      .order("created_at", {
        ascending: false,
      });

    if (!error) {
      setOpportunities(data || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>
          Opportunities
        </Text>

        <Text style={styles.screenSubtitle}>
          Jobs, internships and career opportunities.
        </Text>
      </View>

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons
              name="briefcase-outline"
              size={40}
              color="#aaa"
            />

            <Text style={styles.emptyTitle}>
              No opportunities available
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.opportunityCard}
          >
            <View style={styles.opportunityIcon}>
              <Ionicons
                name="briefcase-outline"
                size={22}
                color={PRIMARY}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.opportunityTitle}>
                {item.title}
              </Text>

              <Text style={styles.company}>
                {item.company_name}
              </Text>

              <Text style={styles.location}>
                {item.location || "South Africa"}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export function AlumniSettingsScreen() {
  const [notifications, setNotifications] =
    useState(true);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.replace("/(auth)/login");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>
          Settings
        </Text>

        <Text style={styles.screenSubtitle}>
          Manage your alumni account.
        </Text>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={PRIMARY}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>
              Notifications
            </Text>

            <Text style={styles.settingText}>
              Receive updates about opportunities and
              connections.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              setNotifications(!notifications)
            }
          >
            <Ionicons
              name={
                notifications
                  ? "toggle"
                  : "toggle-outline"
              }
              size={36}
              color={
                notifications ? PRIMARY : "#999"
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={signOut}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#d60000"
        />

        <Text style={styles.logoutText}>
          Sign out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fc",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f8fc",
  },

  header: {
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  greeting: {
    color: "#777",
    fontSize: 14,
  },

  name: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
    marginTop: 3,
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  hero: {
    marginHorizontal: 20,
    backgroundColor: PRIMARY,
    borderRadius: 22,
    padding: 22,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },

  heroText: {
    color: "#e9e9ff",
    lineHeight: 20,
    marginTop: 8,
  },

  heroButton: {
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  heroButtonText: {
    color: "#fff",
    fontWeight: "800",
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  seeAll: {
    color: PRIMARY,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 18,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 10,
    fontWeight: "800",
    color: "#333",
  },

  emptyText: {
    color: "#777",
    marginTop: 5,
    textAlign: "center",
  },

  opportunityCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  opportunityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eef0ff",
    justifyContent: "center",
    alignItems: "center",
  },

  opportunityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  company: {
    color: PRIMARY,
    marginTop: 3,
    fontWeight: "600",
  },

  location: {
    color: "#888",
    marginTop: 3,
    fontSize: 12,
  },

  screenHeader: {
    padding: 22,
  },

  screenTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111",
  },

  screenSubtitle: {
    color: "#777",
    marginTop: 5,
  },

  search: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },

  list: {
    paddingVertical: 15,
  },

  personCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  personAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  personAvatarText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
  },

  personName: {
    fontWeight: "800",
    fontSize: 15,
  },

  personRole: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  personBio: {
    color: "#777",
    fontSize: 12,
    marginTop: 4,
  },

  profileHeader: {
    alignItems: "center",
    padding: 30,
  },

  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  largeAvatarText: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "800",
  },

  profileName: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 15,
  },

  profileUsername: {
    color: "#777",
    marginTop: 4,
  },

  alumniBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#eef0ff",
    borderRadius: 20,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },

  alumniBadgeText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 12,
  },

  profileSection: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 18,
  },

  about: {
    marginTop: 8,
    color: "#666",
    lineHeight: 21,
  },

  editButton: {
    margin: 20,
    backgroundColor: PRIMARY,
    padding: 15,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  editButtonText: {
    color: "#fff",
    fontWeight: "800",
  },

  settingsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eef0ff",
    justifyContent: "center",
    alignItems: "center",
  },

  settingTitle: {
    fontWeight: "800",
    fontSize: 15,
  },

  settingText: {
    color: "#777",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  logoutButton: {
    margin: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  logoutText: {
    color: "#d60000",
    fontWeight: "800",
  },
});

const networkStyles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },

  title: {
    fontSize: 27,
    fontWeight: "900",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    color: "#777",
    fontSize: 13,
  },

  stats: {
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F6F6FF",
    flexDirection: "row",
    alignItems: "center",
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    color: PRIMARY,
    fontSize: 17,
    fontWeight: "900",
  },

  statLabel: {
    marginTop: 2,
    color: "#777",
    fontSize: 9,
    fontWeight: "600",
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#DDDDF0",
  },

  searchContainer: {
    marginHorizontal: 16,
    marginTop: 13,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EC",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    color: "#111",
    fontSize: 13,
  },

  filtersWrapper: {
    paddingTop: 12,
  },

  filters: {
    paddingHorizontal: 16,
    gap: 7,
  },

  filter: {
    minHeight: 37,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#DEDEE3",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  activeFilter: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  filterText: {
    color: "#555",
    fontSize: 11,
    fontWeight: "700",
  },

  activeFilterText: {
    color: "#fff",
  },

  filterCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#EEEEF1",
    alignItems: "center",
    justifyContent: "center",
  },

  activeFilterCount: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  filterCountText: {
    color: "#666",
    fontSize: 8,
    fontWeight: "900",
  },

  activeFilterCountText: {
    color: "#fff",
  },

  resultHeader: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    paddingHorizontal: 14,
    paddingBottom: 100,
  },

  personCard: {
    minHeight: 82,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9E9ED",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },

  avatarContainer: {
    position: "relative",
    marginRight: 11,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEE",
  },

  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: PRIMARY,
    fontSize: 17,
    fontWeight: "900",
  },

  onlineRoleDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  personContent: {
    flex: 1,
    paddingRight: 6,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },

  personName: {
    maxWidth: "65%",
    color: "#1B1B1B",
    fontSize: 14,
    fontWeight: "800",
  },

  username: {
    marginTop: 2,
    color: "#8A8A8F",
    fontSize: 10,
  },

  headline: {
    marginTop: 5,
    color: "#666",
    fontSize: 11,
  },

  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: "#EEF0FF",
  },

  roleBadgeText: {
    color: PRIMARY,
    fontSize: 7,
    fontWeight: "900",
  },

  alumniRoleBadge: {
    backgroundColor: "#F1EDFF",
  },

  alumniRoleText: {
    color: "#6840C6",
  },

  businessRoleBadge: {
    backgroundColor: "#EAF6EF",
  },

  businessRoleText: {
    color: "#287A52",
  },

  viewButton: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F2F2FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  viewButtonText: {
    color: PRIMARY,
    fontSize: 9,
    fontWeight: "800",
  },

  emptyList: {
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    paddingTop: 80,
    alignItems: "center",
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    color: "#222",
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    maxWidth: 280,
    marginTop: 5,
    color: "#777",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#777",
    fontSize: 11,
  },
});