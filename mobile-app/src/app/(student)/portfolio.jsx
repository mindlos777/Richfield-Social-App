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

export default function PortfolioScreen() {
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
        error instanceof Error ? error.message : 'Something went wrong.'
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