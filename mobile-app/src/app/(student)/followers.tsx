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
import { supabase } from '../../lib/supabase';

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

export default function FollowersScreen() {
  const [followers, setFollowers] = useState<Record<string, any>[]>([]);
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

  async function removeFollower(followerId: string) {
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
                  pathname: '../(student)/user-profile',
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
  const [following, setFollowing] = useState<Record<string, any>[]>([]);
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

  async function unfollow(userId: string) {
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
                  pathname: '../(student)/user-profile',
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