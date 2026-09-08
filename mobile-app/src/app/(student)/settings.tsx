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

export default function SettingsScreen() {
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

  async function updateSetting(
    field:
      | 'notifications_enabled'
      | 'email_notifications'
      | 'private_profile',
    value: boolean
  ) {
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

  function changeNotifications(value: boolean) {
    setNotifications(value);
    updateSetting('notifications_enabled', value);
  }

  function changeEmailNotifications(value: boolean) {
    setEmailNotifications(value);
    updateSetting('email_notifications', value);
  }

  function changePrivacy(value: boolean) {
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
          router.push('../(student)/portfolio')
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