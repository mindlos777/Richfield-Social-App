import React, { useEffect, useState } from "react";
import {
  View,
  Text,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, role, avatar_url, bio"
        )
        .neq("id", user?.id)
        .eq("status", "active")
        .in("role", ["student", "alumni", "business"])
        .order("full_name");

      setUsers(data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((user) => {
    const value = search.toLowerCase();

    return (
      user.full_name?.toLowerCase().includes(value) ||
      user.username?.toLowerCase().includes(value) ||
      user.bio?.toLowerCase().includes(value)
    );
  });

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
          Alumni Network
        </Text>

        <Text style={styles.screenSubtitle}>
          Build meaningful professional connections.
        </Text>
      </View>

      <View style={styles.search}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#777"
        />

        <TextInput
          placeholder="Search people..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.personCard}
            onPress={() =>
              router.push({
                pathname: "/(alumni)/profile",
                params: {
                  userId: item.id,
                },
              })
            }
          >
            <View style={styles.personAvatar}>
              <Text style={styles.personAvatarText}>
                {item.full_name
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>
                {item.full_name}
              </Text>

              <Text style={styles.personRole}>
                {item.role === "student"
                  ? "Student"
                  : item.role === "business"
                  ? "Business"
                  : "Alumni"}
              </Text>

              {item.bio ? (
                <Text
                  style={styles.personBio}
                  numberOfLines={2}
                >
                  {item.bio}
                </Text>
              ) : null}
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
      .eq("status", "open")
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