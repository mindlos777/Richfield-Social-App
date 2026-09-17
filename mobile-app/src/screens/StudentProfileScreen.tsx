import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const PRIMARY = '#0300cf';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

function Avatar({
  name,
  uri,
  size = 52,
}: {
  name?: string;
  uri?: string | null;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: size * 0.32,
          fontWeight: '800',
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

/* =========================================================
   EDIT PROFILE
========================================================= */

export function EditProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [role, setRole] =
    useState<"student" | "alumni">(
      "student"
    );

  const [fullName, setFullName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [headline, setHeadline] =
    useState("");

  const [avatarUrl, setAvatarUrl] =
    useState("");

  const [linkedin, setLinkedin] =
    useState("");

  const [github, setGithub] =
    useState("");

  const [instagram, setInstagram] =
    useState("");

  const [website, setWebsite] =
    useState("");

  const [programme, setProgramme] =
    useState("");

  const [campus, setCampus] =
    useState("");

  const [yearOfStudy, setYearOfStudy] =
    useState<number | null>(null);

  const [
    graduationYear,
    setGraduationYear,
  ] = useState<number | null>(null);

  const [
    alumniVerified,
    setAlumniVerified,
  ] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          full_name,
          username,
          role,
          bio,
          headline,
          avatar_url,
          linkedin_url,
          github_url,
          instagram_url,
          website_url
        `)
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const userRole =
        profile?.role === "alumni"
          ? "alumni"
          : "student";

      setRole(userRole);

      setFullName(
        profile?.full_name || ""
      );

      setUsername(
        profile?.username || ""
      );

      setBio(profile?.bio || "");

      setHeadline(
        profile?.headline || ""
      );

      setAvatarUrl(
        profile?.avatar_url || ""
      );

      setLinkedin(
        profile?.linkedin_url || ""
      );

      setGithub(
        profile?.github_url || ""
      );

      setInstagram(
        profile?.instagram_url || ""
      );

      setWebsite(
        profile?.website_url || ""
      );

      if (userRole === "student") {
        const {
          data: student,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(`
            programme,
            campus,
            year_of_study
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          studentError &&
          studentError.code !== "PGRST116"
        ) {
          throw studentError;
        }

        setProgramme(
          student?.programme || ""
        );

        setCampus(
          student?.campus || ""
        );

        setYearOfStudy(
          student?.year_of_study ??
            null
        );
      } else {
        const {
          data: alumni,
          error: alumniError,
        } = await supabase
          .from("alumni_profiles")
          .select(`
            programme,
            campus,
            graduation_year,
            verified
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          alumniError &&
          alumniError.code !== "PGRST116"
        ) {
          throw alumniError;
        }

        setProgramme(
          alumni?.programme || ""
        );

        setCampus(
          alumni?.campus || ""
        );

        setGraduationYear(
          alumni?.graduation_year ??
            null
        );

        setAlumniVerified(
          alumni?.verified || false
        );
      }
    } catch (error: any) {
      console.error(
        "Load edit profile error:",
        error
      );

      Alert.alert(
        "Profile",
        error?.message ||
          "Could not load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You are not signed in."
        );
      }

      /*
       * IMPORTANT:
       *
       * We use the controlled RPC instead
       * of directly updating profiles.
       *
       * Students and alumni cannot change:
       *
       * full_name
       * username
       * role
       * status
       * programme
       * campus
       * student_number
       * year_of_study
       * graduation_year
       * verified
       *
       * They may only change their
       * public/personal presentation data.
       */

      const {
        error,
      } = await supabase.rpc(
        "update_my_public_profile",
        {
          p_bio:
            bio.trim() || null,

          p_avatar_url:
            avatarUrl.trim() ||
            null,

          p_headline:
            headline.trim() ||
            null,

          p_linkedin_url:
            linkedin.trim() ||
            null,

          p_github_url:
            github.trim() ||
            null,

          p_instagram_url:
            instagram.trim() ||
            null,

          p_website_url:
            website.trim() ||
            null,
        }
      );

      if (error) {
        throw error;
      }

      Alert.alert(
        "Profile updated",
        "Your public profile has been updated successfully.",
        [
          {
            text: "Done",
            onPress: () =>
              router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error(
        "Save profile error:",
        error
      );

      Alert.alert(
        "Update failed",
        error?.message ||
          "Could not update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
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
      style={{
        flex: 1,
        backgroundColor: "#fff",
      }}
    >
      <View style={editStyles.header}>
        <Pressable
          style={
            editStyles.headerButton
          }
          onPress={() =>
            router.back()
          }
          disabled={saving}
        >
          <Ionicons
            name="close"
            size={25}
            color="#111"
          />
        </Pressable>

        <Text
          style={
            editStyles.headerTitle
          }
        >
          Edit profile
        </Text>

        <Pressable
          style={
            editStyles.saveHeaderButton
          }
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color={PRIMARY}
            />
          ) : (
            <Text
              style={
                editStyles.saveHeaderText
              }
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={
          editStyles.container
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            editStyles.avatarSection
          }
        >
          <View
            style={
              editStyles.avatarContainer
            }
          >
            {avatarUrl ? (
              <Image
                source={{
                  uri: avatarUrl,
                }}
                style={
                  editStyles.avatar
                }
              />
            ) : (
              <View
                style={
                  editStyles.avatarPlaceholder
                }
              >
                <Ionicons
                  name="person"
                  size={42}
                  color="#888"
                />
              </View>
            )}
          </View>

          <Text
            style={
              editStyles.avatarTitle
            }
          >
            Profile photo
          </Text>

          <Text
            style={
              editStyles.avatarSubtitle
            }
          >
            Enter an image URL below for
            now.
          </Text>
        </View>

        <View
          style={
            editStyles.infoNotice
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={PRIMARY}
          />

          <Text
            style={
              editStyles.infoNoticeText
            }
          >
            Your name, username and
            Richfield academic information
            are verified account details
            and cannot be changed here.
          </Text>
        </View>

        <Text
          style={
            editStyles.sectionTitle
          }
        >
          Richfield account
        </Text>

        <ProfileReadOnlyField
          label="Full name"
          value={
            fullName ||
            "Not available"
          }
        />

        <ProfileReadOnlyField
          label="Username"
          value={
            username
              ? `@${username}`
              : "Not available"
          }
        />

        <ProfileReadOnlyField
          label="Account type"
          value={
            role === "alumni"
              ? alumniVerified
                ? "Verified Alumni"
                : "Alumni"
              : "Student"
          }
        />

        <ProfileReadOnlyField
          label="Programme"
          value={
            programme ||
            "Not available"
          }
        />

        <ProfileReadOnlyField
          label="Campus"
          value={
            campus ||
            "Not available"
          }
        />

        {role === "student" ? (
          <ProfileReadOnlyField
            label="Year of study"
            value={
              yearOfStudy
                ? `Year ${yearOfStudy}`
                : "Not available"
            }
          />
        ) : (
          <ProfileReadOnlyField
            label="Graduation year"
            value={
              graduationYear
                ? String(
                    graduationYear
                  )
                : "Not available"
            }
          />
        )}

        <Text
          style={
            editStyles.sectionTitle
          }
        >
          Public profile
        </Text>

        <ProfileInput
          label="Headline"
          value={headline}
          onChangeText={
            setHeadline
          }
          placeholder={
            role === "alumni"
              ? "e.g. Software Engineer at TechNova"
              : "e.g. BSc IT Student | Aspiring AI Engineer"
          }
          maxLength={120}
        />

        <ProfileInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Tell the Richfield community about yourself..."
          multiline
          maxLength={500}
        />

        <Text
          style={
            editStyles.counter
          }
        >
          {bio.length}/500
        </Text>

        <ProfileInput
          label="Profile image URL"
          value={avatarUrl}
          onChangeText={
            setAvatarUrl
          }
          placeholder="https://..."
          autoCapitalize="none"
        />

        <Text
          style={
            editStyles.sectionTitle
          }
        >
          Social links
        </Text>

        <ProfileInput
          label="LinkedIn"
          value={linkedin}
          onChangeText={setLinkedin}
          placeholder="https://linkedin.com/in/..."
          autoCapitalize="none"
        />

        <ProfileInput
          label="GitHub"
          value={github}
          onChangeText={setGithub}
          placeholder="https://github.com/..."
          autoCapitalize="none"
        />

        <ProfileInput
          label="Instagram"
          value={instagram}
          onChangeText={
            setInstagram
          }
          placeholder="https://instagram.com/..."
          autoCapitalize="none"
        />

        <ProfileInput
          label="Website"
          value={website}
          onChangeText={setWebsite}
          placeholder="https://..."
          autoCapitalize="none"
        />

        <Pressable
          style={[
            editStyles.bottomSaveButton,
            saving &&
              editStyles.disabled,
          ]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  editStyles.bottomSaveText
                }
              >
                Save changes
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  autoCapitalize = "sentences",
}: any) {
  return (
    <View
      style={
        editStyles.fieldContainer
      }
    >
      <Text
        style={editStyles.label}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#999"
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={
          autoCapitalize
        }
        autoCorrect={false}
        textAlignVertical={
          multiline
            ? "top"
            : "center"
        }
        style={[
          editStyles.input,

          multiline &&
            editStyles.multilineInput,
        ]}
      />
    </View>
  );
}

function ProfileReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        editStyles.fieldContainer
      }
    >
      <Text
        style={editStyles.label}
      >
        {label}
      </Text>

      <View
        style={
          editStyles.readOnlyField
        }
      >
        <Text
          style={
            editStyles.readOnlyText
          }
        >
          {value}
        </Text>

        <Ionicons
          name="lock-closed"
          size={15}
          color="#999"
        />
      </View>
    </View>
  );
}

const editStyles =
  StyleSheet.create({
    header: {
      height: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#EEE",
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111",
    },

    saveHeaderButton: {
      minWidth: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },

    saveHeaderText: {
      color: PRIMARY,
      fontWeight: "800",
      fontSize: 15,
    },

    container: {
      padding: 20,
      paddingBottom: 55,
    },

    avatarSection: {
      alignItems: "center",
      marginBottom: 20,
    },

    avatarContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      overflow: "hidden",
      marginBottom: 10,
    },

    avatar: {
      width: "100%",
      height: "100%",
    },

    avatarPlaceholder: {
      flex: 1,
      backgroundColor: "#EFEFF3",
      alignItems: "center",
      justifyContent: "center",
    },

    avatarTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#222",
    },

    avatarSubtitle: {
      fontSize: 11,
      color: "#888",
      marginTop: 3,
    },

    infoNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 14,
      borderRadius: 12,
      backgroundColor: "#F4F4FF",
      marginBottom: 25,
    },

    infoNoticeText: {
      flex: 1,
      marginLeft: 9,
      color: "#555",
      fontSize: 12,
      lineHeight: 18,
    },

    sectionTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: "#777",
      textTransform:
        "uppercase",
      marginTop: 15,
      marginBottom: 12,
    },

    fieldContainer: {
      marginBottom: 15,
    },

    label: {
      fontSize: 13,
      fontWeight: "700",
      color: "#333",
      marginBottom: 7,
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 11,
      paddingHorizontal: 14,
      color: "#111",
      backgroundColor: "#FFF",
      fontSize: 14,
    },

    multilineInput: {
      minHeight: 110,
      paddingTop: 13,
      paddingBottom: 13,
    },

    readOnlyField: {
      minHeight: 50,
      borderRadius: 11,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor: "#F5F5F7",
      borderWidth: 1,
      borderColor: "#ECECEF",
    },

    readOnlyText: {
      flex: 1,
      fontSize: 14,
      color: "#666",
      marginRight: 10,
    },

    counter: {
      fontSize: 11,
      color: "#999",
      textAlign: "right",
      marginTop: -10,
      marginBottom: 12,
    },

    bottomSaveButton: {
      minHeight: 54,
      backgroundColor: PRIMARY,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
      gap: 7,
    },

    bottomSaveText: {
      color: "#FFF",
      fontSize: 15,
      fontWeight: "800",
    },

    disabled: {
      opacity: 0.55,
    },
  });


/* =========================================================
   FOLLOWERS
========================================================= */

export function FollowersScreen() {
  const [followers, setFollowers] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFollowers();
    }, [])
  );

  async function loadFollowers() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFollowers([]);
        return;
      }

      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false });

      if (followError) throw followError;

      if (!followRows || followRows.length === 0) {
        setFollowers([]);
        return;
      }

      const followerIds = followRows
        .map(item => item.follower_id)
        .filter(Boolean);

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          bio,
          headline,
          role,
          status
        `)
        .in('id', followerIds);

      if (profileError) throw profileError;

      const profileMap = new Map(
        (profileRows || []).map(profile => [profile.id, profile])
      );

      const result = followRows
        .map(follow => {
          const person = profileMap.get(follow.follower_id);
          if (!person) return null;
          return { ...person, followId: follow.follower_id };
        })
        .filter(Boolean) as Record<string, any>[];

      setFollowers(result);
    } catch (error: any) {
      console.log('Followers error:', error);
      Alert.alert(
        'Followers',
        error?.message || 'Unable to load your followers.'
      );
      setFollowers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openProfile(person: Record<string, any>) {
    if (!person?.id) return;

    router.push({
      pathname: '../(student)/user-profile',
      params: { id: person.id },
    });
  }

  async function removeFollower(followerId: string) {
    Alert.alert(
      'Remove follower',
      'Remove this person from your followers?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) return;

              const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', user.id);

              if (error) throw error;

              setFollowers(current =>
                current.filter(person => person.id !== followerId)
              );
            } catch (error: any) {
              console.log('Remove follower error:', error);
              Alert.alert(
                'Error',
                error?.message || 'Unable to remove follower.'
              );
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.screen}>
      <ProfileHeader title="Followers" />

      {followers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No followers yet"
          text="When people follow you, they will appear here."
        />
      ) : (
        <FlatList
          data={followers}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFollowers();
              }}
              tintColor={PRIMARY}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              buttonText="Remove"
              secondary
              onPress={() => openProfile(item)}
              onButtonPress={() => removeFollower(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

/* =========================================================
   FOLLOWING
========================================================= */

export function FollowingScreen() {
  const [following, setFollowing] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFollowing();
    }, [])
  );

  async function loadFollowing() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFollowing([]);
        return;
      }

      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('following_id, created_at')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (followError) throw followError;

      if (!followRows || followRows.length === 0) {
        setFollowing([]);
        return;
      }

      const followingIds = followRows
        .map(item => item.following_id)
        .filter(Boolean);

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          bio,
          headline,
          role,
          status
        `)
        .in('id', followingIds);

      if (profileError) throw profileError;

      const profileMap = new Map(
        (profileRows || []).map(profile => [profile.id, profile])
      );

      const result = followRows
        .map(follow => {
          const person = profileMap.get(follow.following_id);
          if (!person) return null;
          return { ...person, followId: follow.following_id };
        })
        .filter(Boolean) as Record<string, any>[];

      setFollowing(result);
    } catch (error: any) {
      console.log('Following error:', error);
      Alert.alert(
        'Following',
        error?.message || 'Unable to load the people you follow.'
      );
      setFollowing([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openProfile(person: Record<string, any>) {
    if (!person?.id) return;

    router.push({
      pathname: '../(student)/user-profile',
      params: { id: person.id },
    });
  }

  function unfollow(userId: string) {
    Alert.alert(
      'Unfollow?',
      'You will stop following this person.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) return;

              const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', userId);

              if (error) throw error;

              setFollowing(current =>
                current.filter(person => person.id !== userId)
              );
            } catch (error: any) {
              console.log('Unfollow error:', error);
              Alert.alert(
                'Error',
                error?.message || 'Unable to unfollow this person.'
              );
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.screen}>
      <ProfileHeader title="Following" />

      {following.length === 0 ? (
        <EmptyState
          icon="person-add-outline"
          title="Not following anyone"
          text="People you follow will appear here."
        />
      ) : (
        <FlatList
          data={following}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFollowing();
              }}
              tintColor={PRIMARY}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              buttonText="Following"
              onPress={() => openProfile(item)}
              onButtonPress={() => unfollow(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

/* =========================================================
   PORTFOLIO
========================================================= */

type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  url: string | null;
  skills: string[] | null;
};

export function PortfolioScreen() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [skills, setSkills] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.log('Portfolio error:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function addProject() {
    if (!title.trim()) {
      Alert.alert(
        'Project title required',
        'Please enter a project title.'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        'Description required',
        'Please describe your project.'
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('portfolio_items')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          item_type: "project",
          url: projectUrl.trim() || null,
          skills: skills
            .split(',')
            .map(item => item.trim())
            .filter(Boolean),
        })
        .select()
        .single();

      if (error) throw error;

      setProjects(current => [data, ...current]);

      setTitle('');
      setDescription('');
      setProjectUrl('');
      setSkills('');
      setShowForm(false);

      Alert.alert(
        'Project added',
        'Your project has been added to your portfolio.'
      );
    } catch (error: any) {
      console.log('ADD PORTFOLIO PROJECT ERROR:', error);

      Alert.alert(
        'Could not add project',
        error?.message ||
          error?.details ||
          error?.hint ||
          'Something went wrong.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id: string) {
    Alert.alert(
      'Delete project',
      'Are you sure you want to delete this project?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('portfolio_items')
                .delete()
                .eq('id', id);

              if (error) throw error;

              setProjects(current =>
                current.filter(project => project.id !== id)
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Unable to delete project.'
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.screen}>
      <ProfileHeader
        title="My Portfolio"
        rightAction={
          <Pressable
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons
              name={showForm ? 'close' : 'add'}
              size={27}
              color={PRIMARY}
            />
          </Pressable>
        }
      />

      {showForm && (
        <View style={styles.projectForm}>
          <Text style={styles.sectionTitle}>
            Add project
          </Text>

          <TextInput
            placeholder="Project title *"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <TextInput
            placeholder="Description *"
            value={description}
            onChangeText={setDescription}
            multiline
            style={[styles.input, styles.bioInput]}
          />

          <TextInput
            placeholder="Project URL"
            value={projectUrl}
            onChangeText={setProjectUrl}
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            placeholder="Skills e.g. React, JavaScript, SQL"
            value={skills}
            onChangeText={setSkills}
            style={styles.input}
          />

          <Pressable
            style={styles.primaryButton}
            onPress={addProject}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Add project
              </Text>
            )}
          </Pressable>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.portfolioList}
      >
        {projects.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="Your portfolio is empty"
            text="Showcase your projects, skills and work to your professional network."
          />
        ) : (
          projects.map(project => (
            <View
              key={project.id}
              style={styles.projectCard}
            >
              <View style={styles.projectTop}>
                <View style={styles.projectIcon}>
                  <Ionicons
                    name="code-slash-outline"
                    size={23}
                    color="#fff"
                  />
                </View>

                <Pressable
                  onPress={() =>
                    deleteProject(project.id)
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#d00000"
                  />
                </Pressable>
              </View>

              <Text style={styles.projectTitle}>
                {project.title}
              </Text>

              <Text style={styles.projectDescription}>
                {project.description}
              </Text>

              {project.skills && project.skills.length > 0 && (
                <View style={styles.skillsContainer}>
                  {project.skills.map(skill => (
                    <View
                      key={skill}
                      style={styles.skill}
                    >
                      <Text style={styles.skillText}>
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {project.url && (
                <Pressable
                  style={styles.projectLink}
                  onPress={async () => {
                    let value = project.url!.trim();

                    if (
                      !value.startsWith('http://') &&
                      !value.startsWith('https://')
                    ) {
                      value = `https://${value}`;
                    }

                    try {
                      await Linking.openURL(value);
                    } catch {
                      Alert.alert(
                        'Link error',
                        'This project link could not be opened.'
                      );
                    }
                  }}
                >
                  <Ionicons
                    name="link-outline"
                    size={17}
                    color={PRIMARY}
                  />

                  <Text style={styles.projectLinkText}>
                    View project
                  </Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

/* =========================================================
   ACTIVITY
========================================================= */

type ActivityPost = {
  id: string;
  created_at: string;
  image_url?: string | null;
  content?: string | null;
};

export function ActivityScreen() {
  const [posts, setPosts] = useState<ActivityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivity();
  }, []);

  async function loadActivity() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.log('Activity error:', error);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function deletePost(id: string) {
    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', id);

              if (error) throw error;

              setPosts(current =>
                current.filter(post => post.id !== id)
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Unable to delete this post.'
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.screen}>
      <ProfileHeader title="Activity" />

      {posts.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No activity yet"
          text="Your posts and activity will appear here."
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadActivity();
              }}
              tintColor={PRIMARY}
            />
          }
          contentContainerStyle={styles.activityList}
          renderItem={({ item }) => (
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name="image-outline"
                    size={20}
                    color="#fff"
                  />
                </View>

                <View style={styles.activityHeaderText}>
                  <Text style={styles.activityTitle}>
                    You created a post
                  </Text>

                  <Text style={styles.activityDate}>
                    {new Date(
                      item.created_at
                    ).toLocaleDateString()}
                  </Text>
                </View>

                <Pressable
                  onPress={() => deletePost(item.id)}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={21}
                    color="#777"
                  />
                </Pressable>
              </View>

              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.activityImage}
                />
              )}

              {item.content && (
                <Text style={styles.activityContent}>
                  {item.content}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

export function SettingsScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [working, setWorking] =
    useState(false);

  const [role, setRole] =
    useState<
      | "student"
      | "alumni"
      | "business"
      | "admin"
    >("student");

  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(true);

  const [
    emailNotifications,
    setEmailNotifications,
  ] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      if (
        data?.role === "student" ||
        data?.role === "alumni" ||
        data?.role === "business" ||
        data?.role === "admin"
      ) {
        setRole(data.role);
      }

      /*
       * These switches are kept as
       * interface preferences for now.
       *
       * We intentionally do NOT query
       * private_profile because that
       * column does not exist.
       */
    } catch (error: any) {
      console.error(
        "Load settings error:",
        error
      );

      Alert.alert(
        "Settings",
        error?.message ||
          "Could not load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function togglePushNotifications(
    value: boolean
  ) {
    setNotificationsEnabled(
      value
    );

    Alert.alert(
      value
        ? "Notifications enabled"
        : "Notifications disabled",
      value
        ? "You will receive Richfield Social activity notifications."
        : "Push notifications have been turned off for this session."
    );
  }

  function toggleEmailNotifications(
    value: boolean
  ) {
    setEmailNotifications(
      value
    );

    Alert.alert(
      value
        ? "Email updates enabled"
        : "Email updates disabled",
      value
        ? "You will receive important Richfield Social email updates."
        : "Email updates have been turned off for this session."
    );
  }

  async function sendPasswordReset() {
    try {
      setWorking(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error(
          "No email address was found for this account."
        );
      }

      const {
        error,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            user.email
          );

      if (error) {
        throw error;
      }

      Alert.alert(
        "Reset email sent",
        `A password reset link was sent to ${user.email}.`
      );
    } catch (error: any) {
      Alert.alert(
        "Password reset failed",
        error?.message ||
          "Could not send the password reset email."
      );
    } finally {
      setWorking(false);
    }
  }

  function confirmPasswordReset() {
    Alert.alert(
      "Change password",
      "Send a secure password reset link to your account email?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Send link",
          onPress:
            sendPasswordReset,
        },
      ]
    );
  }

  async function logout() {
    try {
      setWorking(true);

      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/login");
    } catch (error: any) {
      Alert.alert(
        "Logout failed",
        error?.message ||
          "Could not log out."
      );
    } finally {
      setWorking(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  }

  function openEditProfile() {
    if (
      role === "student" ||
      role === "alumni"
    ) {
      router.push(
        "/(student)/edit-profile"
      );

      return;
    }

    Alert.alert(
      "Profile",
      "Profile editing for this account type is managed from its account profile."
    );
  }

  function openPortfolio() {
    if (
      role === "student" ||
      role === "alumni"
    ) {
      router.push(
        "/(student)/portfolio"
      );

      return;
    }

    Alert.alert(
      "Portfolio",
      "Portfolio is available to students and alumni."
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={
          settingsStyles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </SafeAreaView>
    );
  }

  const isCommunity =
    role === "student" ||
    role === "alumni";

  return (
    <SafeAreaView
      style={settingsStyles.screen}
    >
      <View
        style={settingsStyles.header}
      >
        <Pressable
          style={
            settingsStyles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111"
          />
        </Pressable>

        <Text
          style={
            settingsStyles.headerTitle
          }
        >
          Settings
        </Text>

        <View
          style={{ width: 42 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={
          settingsStyles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            settingsStyles.accountCard
          }
        >
          <View
            style={
              settingsStyles.accountIcon
            }
          >
            <Ionicons
              name={
                role === "admin"
                  ? "shield-checkmark"
                  : role ===
                    "business"
                  ? "business"
                  : role ===
                    "alumni"
                  ? "school"
                  : "person"
              }
              size={24}
              color={PRIMARY}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={
                settingsStyles.accountLabel
              }
            >
              Account type
            </Text>

            <Text
              style={
                settingsStyles.accountRole
              }
            >
              {role === "student"
                ? "Richfield Student"
                : role ===
                  "alumni"
                ? "Richfield Alumni"
                : role ===
                  "business"
                ? "Business"
                : "Administrator"}
            </Text>
          </View>

          {role === "alumni" && (
            <Ionicons
              name="school-outline"
              size={21}
              color={PRIMARY}
            />
          )}
        </View>

        <SettingsSectionTitle
          title="Notifications"
        />

        <SettingsSwitchRow
          icon="notifications-outline"
          title="Push notifications"
          subtitle="Activity, messages and important updates"
          value={
            notificationsEnabled
          }
          onValueChange={
            togglePushNotifications
          }
        />

        <SettingsSwitchRow
          icon="mail-outline"
          title="Email notifications"
          subtitle="Important Richfield Social email updates"
          value={
            emailNotifications
          }
          onValueChange={
            toggleEmailNotifications
          }
        />

        {isCommunity && (
          <>
            <SettingsSectionTitle
              title="Profile"
            />

            <SettingsRow
              icon="person-outline"
              title="Edit profile"
              subtitle="Bio, headline, avatar and social links"
              onPress={
                openEditProfile
              }
            />

            <SettingsRow
              icon="briefcase-outline"
              title="My portfolio"
              subtitle="Projects, certificates and achievements"
              onPress={
                openPortfolio
              }
            />

            <View
              style={
                settingsStyles.securityNotice
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={PRIMARY}
              />

              <Text
                style={
                  settingsStyles.securityNoticeText
                }
              >
                Richfield academic and
                verification information
                cannot be changed from
                Settings.
              </Text>
            </View>
          </>
        )}

        {role === "business" && (
          <>
            <SettingsSectionTitle
              title="Business"
            />

            <SettingsRow
              icon="business-outline"
              title="Business account"
              subtitle="Company and verification information"
              onPress={() =>
                Alert.alert(
                  "Business account",
                  "Verified business information is controlled through Richfield's business verification process."
                )
              }
            />
          </>
        )}

        {role === "admin" && (
          <>
            <SettingsSectionTitle
              title="Administration"
            />

            <SettingsRow
              icon="shield-outline"
              title="Administrator account"
              subtitle="Richfield administrator access"
              onPress={() =>
                Alert.alert(
                  "Administrator account",
                  "Administrator permissions are controlled by Richfield."
                )
              }
            />
          </>
        )}

        <SettingsSectionTitle
          title="Security"
        />

        <SettingsRow
          icon="lock-closed-outline"
          title="Change password"
          subtitle="Send a secure password reset email"
          onPress={
            confirmPasswordReset
          }
        />

        <SettingsSectionTitle
          title="About"
        />

        <SettingsRow
          icon="information-circle-outline"
          title="About Richfield Social"
          subtitle="Professional community platform"
          onPress={() =>
            Alert.alert(
              "Richfield Social",
              "Richfield Social connects students, alumni and industry through networking, portfolios, messaging and career opportunities."
            )
          }
        />

        <SettingsRow
          icon="shield-checkmark-outline"
          title="Privacy & security"
          subtitle="How Richfield Social protects your account"
          onPress={() =>
            Alert.alert(
              "Privacy & security",
              "Your authentication credentials are handled securely by Supabase Auth. Account roles and institutional information cannot be changed from your public profile."
            )
          }
        />

        <Pressable
          style={[
            settingsStyles.logoutButton,

            working &&
              settingsStyles.disabled,
          ]}
          disabled={working}
          onPress={
            confirmLogout
          }
        >
          {working ? (
            <ActivityIndicator
              color="#D00000"
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#D00000"
              />

              <Text
                style={
                  settingsStyles.logoutText
                }
              >
                Log out
              </Text>
            </>
          )}
        </Pressable>

        <Text
          style={
            settingsStyles.version
          }
        >
          Richfield Social • Hackathon
          2026
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <Text
      style={
        settingsStyles.sectionTitle
      }
    >
      {title}
    </Text>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: any) {
  return (
    <Pressable
      style={
        settingsStyles.settingRow
      }
      onPress={onPress}
    >
      <View
        style={
          settingsStyles.settingIcon
        }
      >
        <Ionicons
          name={icon}
          size={21}
          color="#333"
        />
      </View>

      <View
        style={
          settingsStyles.settingContent
        }
      >
        <Text
          style={
            settingsStyles.settingTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            settingsStyles.settingSubtitle
          }
        >
          {subtitle}
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

function SettingsSwitchRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: any) {
  return (
    <View
      style={
        settingsStyles.settingRow
      }
    >
      <View
        style={
          settingsStyles.settingIcon
        }
      >
        <Ionicons
          name={icon}
          size={21}
          color="#333"
        />
      </View>

      <View
        style={
          settingsStyles.settingContent
        }
      >
        <Text
          style={
            settingsStyles.settingTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            settingsStyles.settingSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={
          onValueChange
        }
        trackColor={{
          false: "#DDD",
          true: "#BDBDFF",
        }}
        thumbColor={
          value
            ? PRIMARY
            : "#FFF"
        }
      />
    </View>
  );
}

const settingsStyles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#FFF",
    },

    loading: {
      flex: 1,
      backgroundColor: "#FFF",
      alignItems: "center",
      justifyContent: "center",
    },

    header: {
      height: 60,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: "#EEE",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#F5F5F7",
      alignItems: "center",
      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111",
    },

    container: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 50,
    },

    accountCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F5F5FF",
      borderRadius: 15,
      padding: 16,
      marginBottom: 25,
    },

    accountIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#E7E7FF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },

    accountLabel: {
      color: "#777",
      fontSize: 11,
    },

    accountRole: {
      color: "#111",
      fontSize: 15,
      fontWeight: "800",
      marginTop: 3,
    },

    sectionTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#777",
      textTransform:
        "uppercase",
      marginTop: 13,
      marginBottom: 7,
    },

    settingRow: {
      minHeight: 69,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#EEE",
    },

    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: "#F5F5F7",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    settingContent: {
      flex: 1,
      paddingRight: 8,
    },

    settingTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#222",
    },

    settingSubtitle: {
      fontSize: 11,
      color: "#888",
      marginTop: 3,
    },

    securityNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "#F5F5FF",
      borderRadius: 11,
      padding: 12,
      marginTop: 12,
      marginBottom: 8,
    },

    securityNoticeText: {
      flex: 1,
      color: "#666",
      fontSize: 11,
      lineHeight: 16,
      marginLeft: 8,
    },

    logoutButton: {
      minHeight: 55,
      borderRadius: 12,
      backgroundColor: "#FFF1F1",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 30,
    },

    logoutText: {
      color: "#D00000",
      fontSize: 14,
      fontWeight: "800",
      marginLeft: 8,
    },

    disabled: {
      opacity: 0.5,
    },

    version: {
      textAlign: "center",
      color: "#AAA",
      fontSize: 10,
      marginTop: 18,
    },
  });

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator
        size="large"
        color={PRIMARY}
      />
    </View>
  );
}

function ProfileHeader({
  title,
  rightAction,
}: {
  title: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()}>
        <Ionicons
          name="arrow-back"
          size={25}
          color="#111"
        />
      </Pressable>

      <Text style={styles.topTitle}>{title}</Text>

      <View style={styles.headerRight}>
        {rightAction || <View style={{ width: 25 }} />}
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={30}
          color={PRIMARY}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyText}>
        {text}
      </Text>
    </View>
  );
}

function PersonRow({
  person,
  buttonText,
  secondary,
  onPress,
  onButtonPress,
}: {
  person: {
    full_name?: string | null;
    avatar_url?: string | null;
    username?: string | null;
    bio?: string | null;
  };
  buttonText: string;
  secondary?: boolean;
  onPress: () => void;
  onButtonPress: () => void;
}) {
  return (
    <Pressable
      style={styles.personRow}
      onPress={onPress}
    >
      <Avatar
        name={person.full_name ?? undefined}
        uri={person.avatar_url}
        size={52}
      />

      <View style={styles.personInfo}>
        <Text style={styles.personName}>
          {person.full_name || 'Student'}
        </Text>

        <Text style={styles.personUsername}>
          {person.username
            ? person.username.startsWith('@')
              ? person.username
              : `@${person.username}`
            : 'Student'}
        </Text>

        {person.bio && (
          <Text
            style={styles.personBio}
            numberOfLines={1}
          >
            {person.bio}
          </Text>
        )}
      </View>

      <Pressable
        style={[
          styles.followButton,
          secondary && styles.secondaryButton,
        ]}
        onPress={event => {
          event.stopPropagation();
          onButtonPress();
        }}
      >
        <Text
          style={[
            styles.followButtonText,
            secondary && styles.secondaryButtonText,
          ]}
        >
          {buttonText}
        </Text>
      </Pressable>
    </Pressable>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={PRIMARY}
        />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingSubtitle}>
          {subtitle}
        </Text>
      </View>

      {right}
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  topBar: {
    height: 62,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },

  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },

  headerRight: {
    minWidth: 25,
    alignItems: 'flex-end',
  },

  saveText: {
    color: PRIMARY,
    fontWeight: '800',
    fontSize: 15,
  },

  form: {
    padding: 22,
    paddingBottom: 40,
  },

  editAvatar: {
    alignItems: 'center',
    marginBottom: 30,
  },

  changePhoto: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  changePhotoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    marginBottom: 15,
    marginTop: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 7,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#fff',
    marginBottom: 17,
  },

  bioInput: {
    height: 105,
    paddingTop: 14,
    textAlignVertical: 'top',
  },

  characterCount: {
    color: '#999',
    fontSize: 11,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 15,
  },

  primaryButton: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  list: {
    padding: 16,
  },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  personInfo: {
    flex: 1,
    marginLeft: 13,
    marginRight: 10,
  },

  personName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  personUsername: {
    color: PRIMARY,
    fontSize: 12,
    marginTop: 2,
  },

  personBio: {
    color: '#777',
    fontSize: 11,
    marginTop: 3,
  },

  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777',
    marginTop: -5,
    marginBottom: 17,
  },

  socialInputContainer: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E2E2E6',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 15,
    backgroundColor: '#fff',
  },

  socialInput: {
    flex: 1,
    marginLeft: 11,
    fontSize: 14,
    color: '#222',
    paddingVertical: 12,
  },

  followButton: {
    minWidth: 82,
    height: 35,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: '#f1f1f1',
  },

  secondaryButtonText: {
    color: '#333',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
  },

  emptyText: {
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7,
    fontSize: 13,
  },

  projectForm: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  portfolioList: {
    padding: 18,
    paddingBottom: 40,
  },

  projectCard: {
    borderWidth: 1,
    borderColor: '#e4e4e4',
    borderRadius: 15,
    padding: 17,
    marginBottom: 14,
    backgroundColor: '#fff',
  },

  projectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  projectTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
  },

  projectDescription: {
    color: '#666',
    lineHeight: 20,
    fontSize: 13,
    marginTop: 7,
  },

  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },

  skill: {
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },

  skillText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: '700',
  },

  projectLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 6,
  },

  projectLinkText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },

  activityList: {
    padding: 16,
  },

  activityCard: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 15,
    marginBottom: 13,
  },

  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },

  activityDate: {
    color: '#888',
    fontSize: 11,
    marginTop: 3,
  },

  activityImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginTop: 13,
  },

  activityContent: {
    color: '#444',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },

  settingsContainer: {
    paddingBottom: 40,
  },

  settingsSection: {
    fontSize: 13,
    fontWeight: '800',
    color: '#777',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  settingRow: {
    minHeight: 72,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingContent: {
    flex: 1,
    marginLeft: 13,
    marginRight: 10,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },

  settingSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },

  settingsButton: {
    minHeight: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  settingsButtonText: {
    flex: 1,
    marginLeft: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },

  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0caca',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    color: '#d00000',
    fontWeight: '800',
  },

  version: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 11,
    marginTop: 25,
  },
});