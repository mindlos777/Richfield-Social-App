import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
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
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [programme, setProgramme] = useState('');
  const [campus, setCampus] = useState('');

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
        router.replace('/login');
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setProgramme(data.programme || '');
      setCampus(data.campus || '');
    } catch (error) {
      console.log('Edit profile error:', error);
      Alert.alert('Error', 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!userId) return;

    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          programme: programme.trim(),
          campus: campus.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert(
        'Profile updated',
        'Your profile has been successfully updated.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.log('Save profile error:', error);

      Alert.alert(
        'Update failed',
        error.message || 'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color="#111" />
        </Pressable>

        <Text style={styles.topTitle}>Edit Profile</Text>

        <Pressable onPress={saveProfile} disabled={saving}>
          <Text
            style={[
              styles.saveText,
              saving && { opacity: 0.5 },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.editAvatar}>
          <Avatar name={fullName} size={90} />

          <Pressable style={styles.changePhoto}>
            <Ionicons
              name="camera-outline"
              size={17}
              color="#fff"
            />
            <Text style={styles.changePhotoText}>
              Change photo
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Personal information
        </Text>

        <Text style={styles.label}>Full name</Text>

        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          style={styles.input}
        />

        <Text style={styles.label}>Username</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="@username"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Bio</Text>

        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about yourself"
          multiline
          maxLength={160}
          style={[styles.input, styles.bioInput]}
        />

        <Text style={styles.characterCount}>
          {bio.length}/160
        </Text>

        <Text style={styles.sectionTitle}>
          Education
        </Text>

        <Text style={styles.label}>Programme</Text>

        <TextInput
          value={programme}
          onChangeText={setProgramme}
          placeholder="e.g. BSc IT"
          style={styles.input}
        />

        <Text style={styles.label}>Campus</Text>

        <TextInput
          value={campus}
          onChangeText={setCampus}
          placeholder="Your campus"
          style={styles.input}
        />

        <Pressable
          style={styles.primaryButton}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Save changes
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   FOLLOWERS
========================================================= */

export function FollowersScreen() {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFollowers();
  }, []);

  async function loadFollowers() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          follower_id,
          profiles!follows_follower_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) throw error;

      setFollowers(
        (data || []).map(item => ({
          followId: item.id,
          ...item.profiles,
        }))
      );
    } catch (error) {
      console.log('Followers error:', error);
      setFollowers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function removeFollower(followerId) {
    Alert.alert(
      'Remove follower',
      'Remove this person from your followers?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) return;

              await supabase
                .from('follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', user.id);

              setFollowers(current =>
                current.filter(
                  person => person.id !== followerId
                )
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Unable to remove follower.'
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
              onPress={() =>
                router.push({
                  pathname: '/(student)/user-profile',
                  params: { id: item.id },
                })
              }
              onButtonPress={() =>
                removeFollower(item.id)
              }
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
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFollowing();
  }, []);

  async function loadFollowing() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('follows')
        .select(`
          id,
          following_id,
          profiles!follows_following_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) throw error;

      setFollowing(
        (data || []).map(item => ({
          followId: item.id,
          ...item.profiles,
        }))
      );
    } catch (error) {
      console.log('Following error:', error);
      setFollowing([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function unfollow(userId) {
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
    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to unfollow this person.'
      );
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

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
              onPress={() =>
                router.push({
                  pathname: '/(student)/user-profile',
                  params: { id: item.id },
                })
              }
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

export function PortfolioScreen() {
  const [projects, setProjects] = useState([]);
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
          project_url: projectUrl.trim() || null,
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
    } catch (error) {
      Alert.alert(
        'Could not add project',
        error.message || 'Something went wrong.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id) {
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

              {project.skills?.length > 0 && (
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

              {project.project_url && (
                <Pressable
                  style={styles.projectLink}
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

export function ActivityScreen() {
  const [posts, setPosts] = useState([]);
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

  async function deletePost(id) {
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
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] =
    useState(true);
  const [privateProfile, setPrivateProfile] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select(
          'notifications_enabled,email_notifications,private_profile'
        )
        .eq('id', user.id)
        .single();

      if (data) {
        setNotifications(
          data.notifications_enabled ?? true
        );

        setEmailNotifications(
          data.email_notifications ?? true
        );

        setPrivateProfile(
          data.private_profile ?? false
        );
      }
    } catch (error) {
      console.log('Settings loading error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting(field, value) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      Alert.alert(
        'Unable to save',
        'Your setting could not be updated.'
      );
    }
  }

  function changeNotifications(value) {
    setNotifications(value);
    updateSetting('notifications_enabled', value);
  }

  function changeEmailNotifications(value) {
    setEmailNotifications(value);
    updateSetting('email_notifications', value);
  }

  function changePrivacy(value) {
    setPrivateProfile(value);
    updateSetting('private_profile', value);
  }

  async function logout() {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);

              const { error } =
                await supabase.auth.signOut();

              if (error) throw error;

              router.replace('/login');
            } catch (error) {
              Alert.alert(
                'Logout failed',
                'Unable to log out. Please try again.'
              );
            } finally {
              setSigningOut(false);
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.settingsContainer}
    >
      <ProfileHeader title="Settings" />

      <Text style={styles.settingsSection}>
        Notifications
      </Text>

      <SettingRow
        icon="notifications-outline"
        title="Push notifications"
        subtitle="Receive updates about your network"
        right={
          <Switch
            value={notifications}
            onValueChange={changeNotifications}
            trackColor={{
              false: '#ddd',
              true: PRIMARY,
            }}
          />
        }
      />

      <SettingRow
        icon="mail-outline"
        title="Email notifications"
        subtitle="Receive important updates by email"
        right={
          <Switch
            value={emailNotifications}
            onValueChange={changeEmailNotifications}
            trackColor={{
              false: '#ddd',
              true: PRIMARY,
            }}
          />
        }
      />

      <Text style={styles.settingsSection}>
        Privacy
      </Text>

      <SettingRow
        icon="lock-closed-outline"
        title="Private profile"
        subtitle="Control who can discover your profile"
        right={
          <Switch
            value={privateProfile}
            onValueChange={changePrivacy}
            trackColor={{
              false: '#ddd',
              true: PRIMARY,
            }}
          />
        }
      />

      <Text style={styles.settingsSection}>
        Account
      </Text>

      <Pressable
        style={styles.settingsButton}
        onPress={() =>
          router.push('/(student)/edit-profile')
        }
      >
        <Ionicons
          name="person-outline"
          size={22}
          color="#222"
        />

        <Text style={styles.settingsButtonText}>
          Edit profile
        </Text>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#999"
        />
      </Pressable>

      <Pressable
        style={styles.settingsButton}
        onPress={() =>
          router.push('/(student)/portfolio')
        }
      >
        <Ionicons
          name="briefcase-outline"
          size={22}
          color="#222"
        />

        <Text style={styles.settingsButtonText}>
          My portfolio
        </Text>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#999"
        />
      </Pressable>

      <Pressable
        style={[
          styles.logoutButton,
          signingOut && { opacity: 0.5 },
        ]}
        onPress={logout}
        disabled={signingOut}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color="#d00000"
        />

        <Text style={styles.logoutText}>
          {signingOut ? 'Logging out...' : 'Log out'}
        </Text>
      </Pressable>

      <Text style={styles.version}>
        Richfield Connect
      </Text>
    </ScrollView>
  );
}

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
}) {
  return (
    <Pressable
      style={styles.personRow}
      onPress={onPress}
    >
      <Avatar
        name={person.full_name}
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