import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

const PRIMARY = "#0300cf";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_visibility: string | null;
};

export default function NetworkScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadNetwork();
  }, []);

  const loadNetwork = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          username,
          role,
          avatar_url,
          bio,
          profile_visibility
        `)
        .neq("id", user.id)
        .eq("status", "active")
        .order("full_name", { ascending: true });

      if (profileError) throw profileError;

      const { data: followingData, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followingError) throw followingError;

      setProfiles(profileData || []);
      setFollowing(
        (followingData || []).map((item) => item.following_id)
      );
    } catch (error) {
      console.log("Network error:", error);
      Alert.alert(
        "Network error",
        error instanceof Error ? error.message : "Could not load the network."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadNetwork();
  };

  const toggleFollow = async (profileId: string) => {
    if (!currentUser) return;

    const isFollowing = following.includes(profileId);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", profileId);

        if (error) throw error;

        setFollowing((previous) =>
          previous.filter((id) => id !== profileId)
        );
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: profileId,
          });

        if (error) throw error;

        setFollowing((previous) => [...previous, profileId]);
      }
    } catch (error) {
      console.log("Follow error:", error);

      Alert.alert(
        "Unable to update",
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  };

  const openProfile = (profile: Profile) => {
    router.push({
      pathname: "../(student)/profile",
      params: {
        userId: profile.id,
      },
    });
  };

  const filteredProfiles = profiles.filter((profile) => {
    const searchValue = search.trim().toLowerCase();

    const matchesSearch =
      !searchValue ||
      profile.full_name?.toLowerCase().includes(searchValue) ||
      profile.username?.toLowerCase().includes(searchValue) ||
      profile.bio?.toLowerCase().includes(searchValue);

    const matchesRole =
      roleFilter === "all" || profile.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "student":
        return "Student";
      case "alumni":
        return "Alumni";
      case "business":
        return "Business";
      case "admin":
        return "Admin";
      default:
        return "Member";
    }
  };

  const renderProfile = ({ item }: { item: Profile }) => {
    const isFollowing = following.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openProfile(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image
              source={{ uri: item.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.full_name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {item.full_name}
          </Text>

          {item.username ? (
            <Text style={styles.username} numberOfLines={1}>
              @{item.username}
            </Text>
          ) : null}

          <View style={styles.roleContainer}>
            <Text style={styles.role}>
              {getRoleLabel(item.role)}
            </Text>
          </View>

          {item.bio ? (
            <Text style={styles.bio} numberOfLines={2}>
              {item.bio}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing && styles.followingButton,
          ]}
          onPress={(event) => {
            event.stopPropagation();
            toggleFollow(item.id);
          }}
        >
          <Ionicons
            name={isFollowing ? "checkmark" : "person-add-outline"}
            size={18}
            color={isFollowing ? PRIMARY : "#fff"}
          />

          <Text
            style={[
              styles.followText,
              isFollowing && styles.followingText,
            ]}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>
          Loading your network...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Network</Text>
          <Text style={styles.subtitle}>
            Connect with people at Richfield
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={refresh}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={PRIMARY}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={21}
          color="#777"
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search people..."
          placeholderTextColor="#999"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: "all", label: "Everyone" },
          { id: "student", label: "Students" },
          { id: "alumni", label: "Alumni" },
          { id: "business", label: "Businesses" },
        ]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filter,
              roleFilter === item.id && styles.activeFilter,
            ]}
            onPress={() => setRoleFilter(item.id)}
          >
            <Text
              style={[
                styles.filterText,
                roleFilter === item.id &&
                  styles.activeFilterText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.resultHeader}>
        <Text style={styles.resultCount}>
          {filteredProfiles.length} people
        </Text>
      </View>

      <FlatList
        data={filteredProfiles}
        keyExtractor={(item) => item.id}
        renderItem={renderProfile}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={PRIMARY}
          />
        }
        contentContainerStyle={[
          styles.list,
          filteredProfiles.length === 0 &&
            styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={60}
              color="#ccc"
            />

            <Text style={styles.emptyTitle}>
              No people found
            </Text>

            <Text style={styles.emptyText}>
              Try another name or change your filter.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fc",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    color: "#777",
    fontSize: 14,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },

  searchContainer: {
    marginHorizontal: 20,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    elevation: 1,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#111",
  },

  filters: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 8,
  },

  filter: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3e3e3",
  },

  activeFilter: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  filterText: {
    color: "#555",
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#fff",
  },

  resultHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  resultCount: {
    color: "#777",
    fontSize: 13,
    fontWeight: "600",
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  avatarContainer: {
    marginRight: 12,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "800",
  },

  profileInfo: {
    flex: 1,
    marginRight: 8,
  },

  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },

  username: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
  },

  roleContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#eef0ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
  },

  role: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "700",
  },

  bio: {
    color: "#777",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },

  followButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  followingButton: {
    backgroundColor: "#eef0ff",
    borderWidth: 1,
    borderColor: PRIMARY,
  },

  followText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  followingText: {
    color: PRIMARY,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f8fc",
  },

  loadingText: {
    marginTop: 10,
    color: "#777",
  },

  emptyList: {
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
  },

  emptyText: {
    marginTop: 6,
    color: "#777",
    textAlign: "center",
  },
});