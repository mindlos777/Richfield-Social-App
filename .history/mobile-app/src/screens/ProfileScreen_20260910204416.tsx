import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const PRIMARY = '#0300cf';
const DRAWER_WIDTH = width * 0.75;

type ProfilePost = {
  id: string;
  image_url: string;
  created_at: string;
};

export default function ProfileScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [profile, setProfile] = useState({
    fullName: 'Your Name',
    username: '@yourusername',
    bio: 'Information Technology student | Building my future in tech.',
    avatar: null,
  });

  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  const [posts, setPosts] = useState<ProfilePost[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile({
          fullName: profileData.full_name || 'Your Name',
          username:
            profileData.username ||
            `@${profileData.full_name?.toLowerCase().replace(/\s+/g, '') || 'student'}`,
          bio:
            profileData.bio ||
            'Information Technology student | Building my future in tech.',
          avatar: profileData.avatar_url || null,
        });
      }

      const { count: postCount } = await supabase
        .from('posts')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('user_id', user.id);

      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('following_id', user.id);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('follower_id', user.id);

      setStats({
        posts: postCount || 0,
        followers: followerCount || 0,
        following: followingCount || 0,
      });

      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      setPosts(postData || []);
    } catch (error) {
      console.log('Profile loading error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  function openFollowers() {
    router.push('/(student)/followers');
  }

  function openFollowing() {
    router.push('/(student)/following');
  }

  function openSettings() {
    setMenuVisible(false);
    router.push('/(student)/settings');
  }

  function openActivity() {
    setMenuVisible(false);
    router.push('/(student)/activity');
  }

  function openPortfolio() {
    router.push('../(student)/portfolio');
  }

  function showCreateOptions() {
    router.push("../screens/CreatePostScreen");
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProfile}
            tintColor={PRIMARY}
          />
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <Pressable
            onPress={() => setMenuVisible(true)}
            style={styles.headerButton}
          >
            <Ionicons
              name="menu-outline"
              size={29}
              color="#111"
            />
          </Pressable>
        </View>

        {/* PROFILE */}

        <View style={styles.profileSection}>
          <View style={styles.profileTop}>
            <View style={styles.avatarContainer}>
              {profile.avatar ? (
                <Image
                  source={{
                    uri: profile.avatar,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile.fullName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>
                  {stats.posts}
                </Text>

                <Text style={styles.statLabel}>
                  Posts
                </Text>
              </View>

              <Pressable
                style={styles.stat}
                onPress={openFollowers}
              >
                <Text style={styles.statNumber}>
                  {stats.followers}
                </Text>

                <Text style={styles.statLabel}>
                  Followers
                </Text>
              </Pressable>

              <Pressable
                style={styles.stat}
                onPress={openFollowing}
              >
                <Text style={styles.statNumber}>
                  {stats.following}
                </Text>

                <Text style={styles.statLabel}>
                  Following
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {profile.fullName}
            </Text>

            <Text style={styles.username}>
              {profile.username}
            </Text>

            <Text style={styles.bio}>
              {profile.bio}
            </Text>
          </View>

          {/* EDIT PROFILE */}

          <Pressable
            style={styles.editButton}
            onPress={() =>
              router.push('/(student)/edit-profile')
            }
          >
            <Text style={styles.editButtonText}>
              Edit profile
            </Text>
          </Pressable>
        </View>

        {/* PORTFOLIO */}

        <Pressable
          style={styles.portfolioCard}
          onPress={openPortfolio}
        >
          <View style={styles.portfolioIcon}>
            <Ionicons
              name="briefcase-outline"
              size={23}
              color="#fff"
            />
          </View>

          <View style={styles.portfolioContent}>
            <Text style={styles.portfolioTitle}>
              My Portfolio
            </Text>

            <Text style={styles.portfolioSubtitle}>
              Projects, skills, achievements and experience
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#777"
          />
        </Pressable>

        {/* POSTS HEADER */}

        <View style={styles.postsHeader}>
          <Ionicons
            name="grid-outline"
            size={22}
            color="#111"
          />

          <Text style={styles.postsTitle}>
            Posts
          </Text>
        </View>

        {/* POSTS */}

        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="camera-outline"
                size={30}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No posts yet
            </Text>

            <Text style={styles.emptyText}>
              Share your projects, achievements and
              student journey.
            </Text>

            <Pressable
              style={styles.firstPostButton}
              onPress={showCreateOptions}
            >
              <Text style={styles.firstPostButtonText}>
                Create your first post
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {posts.map(post => (
              <Pressable
                key={post.id}
                style={styles.post}
              >
                <Image
                  source={{
                    uri: post.image_url,
                  }}
                  style={styles.postImage}
                />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CREATE POST BUTTON */}

      <Pressable
        style={styles.floatingButton}
        onPress={showCreateOptions}
      >
        <Ionicons
          name="add"
          size={30}
          color="#fff"
        />
      </Pressable>

      {/* SIDE MENU */}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            style={styles.blurArea}
            onPress={() => setMenuVisible(false)}
          />

          <View style={styles.sideMenu}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>
                Account
              </Text>

              <Pressable
                onPress={() => setMenuVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={26}
                  color="#111"
                />
              </Pressable>
            </View>

            <View style={styles.menuProfile}>
              {profile.avatar ? (
                <Image
                  source={{
                    uri: profile.avatar,
                  }}
                  style={styles.menuAvatar}
                />
              ) : (
                <View style={styles.menuAvatarPlaceholder}>
                  <Text style={styles.menuAvatarText}>
                    {profile.fullName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              <View>
                <Text style={styles.menuName}>
                  {profile.fullName}
                </Text>

                <Text style={styles.menuUsername}>
                  {profile.username}
                </Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItem}
              onPress={openSettings}
            >
              <Ionicons
                name="settings-outline"
                size={23}
                color="#222"
              />

              <Text style={styles.menuItemText}>
                Settings
              </Text>

              <Ionicons
                name="chevron-forward"
                size={19}
                color="#999"
              />
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={openActivity}
            >
              <Ionicons
                name="time-outline"
                size={23}
                color="#222"
              />

              <Text style={styles.menuItemText}>
                Activity
              </Text>

              <Ionicons
                name="chevron-forward"
                size={19}
                color="#999"
              />
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={openPortfolio}
            >
              <Ionicons
                name="briefcase-outline"
                size={23}
                color="#222"
              />

              <Text style={styles.menuItemText}>
                Portfolio
              </Text>

              <Ionicons
                name="chevron-forward"
                size={19}
                color="#999"
              />
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={openFollowers}
            >
              <Ionicons
                name="people-outline"
                size={23}
                color="#222"
              />

              <Text style={styles.menuItemText}>
                Followers
              </Text>

              <Text style={styles.menuCount}>
                {stats.followers}
              </Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={openFollowing}
            >
              <Ionicons
                name="person-add-outline"
                size={23}
                color="#222"
              />

              <Text style={styles.menuItemText}>
                Following
              </Text>

              <Text style={styles.menuCount}>
                {stats.following}
              </Text>
            </Pressable>

            <View style={styles.menuBottom}>
              <Text style={styles.menuVersion}>
                Richfield Connect
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  header: {
    height: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },

  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    marginRight: 24,
  },

  avatar: {
    width: '100%',
    height: '100%',
  },

  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },

  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  stat: {
    alignItems: 'center',
    minWidth: 60,
  },

  statNumber: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111',
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  profileInfo: {
    marginTop: 17,
  },

  name: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111',
  },

  username: {
    color: PRIMARY,
    fontSize: 14,
    marginTop: 2,
  },

  bio: {
    color: '#444',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 9,
  },

  editButton: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  editButtonText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#222',
  },

  portfolioCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f6f6fb',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e7e7f3',
  },

  portfolioIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  portfolioContent: {
    flex: 1,
  },

  portfolioTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
  },

  portfolioSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
    lineHeight: 17,
  },

  postsHeader: {
    height: 50,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  postsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  post: {
    width: width / 3,
    height: width / 3,
    padding: 1,
  },

  postImage: {
    width: '100%',
    height: '100%',
  },

  emptyPosts: {
    alignItems: 'center',
    paddingHorizontal: 35,
    paddingVertical: 45,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
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
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  firstPostButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
    marginTop: 18,
  },

  firstPostButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 25,
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },

  blurArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  sideMenu: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 55 : 35,
    paddingHorizontal: 20,
    elevation: 20,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {
      width: -4,
      height: 0,
    },
  },

  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  menuTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111',
  },

  menuProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  menuAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  menuAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },

  menuName: {
    fontSize: 15,
    fontWeight: '800',
  },

  menuUsername: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },

  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 10,
  },

  menuItem: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 15,
    color: '#222',
  },

  menuCount: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },

  menuBottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 30,
  },

  menuVersion: {
    color: '#aaa',
    fontSize: 12,
  },

  createOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  createSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 35,
  },

  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 22,
  },

  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },

  sheetSubtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
  },

  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },

  createOptionIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  createOptionText: {
    flex: 1,
  },

  createOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  createOptionSubtitle: {
    color: '#777',
    fontSize: 12,
    marginTop: 3,
  },

  cancelButton: {
    height: 50,
    backgroundColor: '#f2f2f2',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },

  cancelText: {
    fontWeight: '700',
    fontSize: 15,
  },

  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  uploadingBox: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 170,
  },

  uploadingText: {
    marginTop: 12,
    fontWeight: '700',
  },
});

