import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

type PostDetails = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  media_type: string | null;
  visibility: string;
  created_at: string;
};

type Author = {
  full_name: string;
  username: string | null;
  avatar_url: string | null;
};

export default function PostDetailScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [post, setPost] =
    useState<PostDetails | null>(null);

  const [author, setAuthor] =
    useState<Author | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [isOwner, setIsOwner] =
    useState(false);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  async function loadPost() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const {
        data: postData,
        error: postError,
      } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (postError) {
        throw postError;
      }

      setPost(postData);

      if (user) {
        setIsOwner(
          user.id === postData.user_id
        );
      }

      const {
        data: authorData,
        error: authorError,
      } = await supabase
        .from("profiles")
        .select(
          `
          full_name,
          username,
          avatar_url
          `
        )
        .eq(
          "id",
          postData.user_id
        )
        .single();

      if (authorError) {
        throw authorError;
      }

      setAuthor(authorData);
    } catch (error) {
      console.log(
        "Load post error:",
        error
      );

      Alert.alert(
        "Post unavailable",
        "This post could not be loaded."
      );

      router.back();
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete post?",
      "This post will be permanently removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: deletePost,
        },
      ]
    );
  }

  async function deletePost() {
    if (!post) return;

    try {
      const { error } =
        await supabase
          .from("posts")
          .delete()
          .eq("id", post.id);

      if (error) {
        throw error;
      }

      router.back();
    } catch (error) {
      console.log(
        "Delete post error:",
        error
      );

      Alert.alert(
        "Delete failed",
        "The post could not be deleted."
      );
    }
  }

  function formatDate(
    value: string
  ) {
    const date =
      new Date(value);

    return date.toLocaleDateString(
      "en-ZA",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  if (loading) {
    return (
      <View
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
          color="#FFFFFF"
        />
      </View>
    );
  }

  if (!post) {
    return null;
  }

  const hasImage =
    Boolean(post.image_url);

  return (
    <View
      style={[
        styles.screen,
        !hasImage &&
          styles.lightScreen,
      ]}
    >
      <StatusBar
        barStyle={
          hasImage
            ? "light-content"
            : "dark-content"
        }
      />

      <View
        style={[
          styles.topBar,
          Platform.OS === "android" &&
            styles.androidTopBar,
        ]}
      >
        <Pressable
          style={[
            styles.topButton,
            !hasImage &&
              styles.lightButton,
          ]}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={
              hasImage
                ? "#FFFFFF"
                : "#111111"
            }
          />
        </Pressable>

        <Text
          style={[
            styles.topTitle,
            !hasImage &&
              styles.darkText,
          ]}
        >
          Post
        </Text>

        {isOwner ? (
          <Pressable
            style={[
              styles.topButton,
              !hasImage &&
                styles.lightButton,
            ]}
            onPress={
              confirmDelete
            }
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={23}
              color={
                hasImage
                  ? "#FFFFFF"
                  : "#111111"
              }
            />
          </Pressable>
        ) : (
          <View
            style={{
              width: 42,
            }}
          />
        )}
      </View>

      {hasImage ? (
        <>
          <View
            style={
              styles.imageStage
            }
          >
            <Image
              source={{
                uri:
                  post.image_url!,
              }}
              style={
                styles.fullImage
              }
              resizeMode="contain"
            />
          </View>

          <View
            style={
              styles.bottomPanel
            }
          >
            <AuthorRow
              author={author}
            />

            {post.content && (
              <Text
                style={
                  styles.caption
                }
              >
                {post.content}
              </Text>
            )}

            <View
              style={
                styles.metaRow
              }
            >
              <Text
                style={
                  styles.date
                }
              >
                {formatDate(
                  post.created_at
                )}
              </Text>

              <View
                style={
                  styles.dot
                }
              />

              <Ionicons
                name={
                  post.visibility ===
                  "Everyone"
                    ? "earth-outline"
                    : "people-outline"
                }
                size={13}
                color="#8E8E93"
              />

              <Text
                style={
                  styles.visibility
                }
              >
                {post.visibility}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={
            styles.textPostContainer
          }
        >
          <AuthorRow
            author={author}
            dark
          />

          <Text
            style={
              styles.largePostText
            }
          >
            {post.content}
          </Text>

          <View
            style={
              styles.textMeta
            }
          >
            <Text
              style={styles.date}
            >
              {formatDate(
                post.created_at
              )}
            </Text>

            <View
              style={styles.dot}
            />

            <Text
              style={
                styles.visibility
              }
            >
              {post.visibility}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function AuthorRow({
  author,
  dark = false,
}: {
  author: Author | null;
  dark?: boolean;
}) {
  const name =
    author?.full_name ||
    "Richfield Member";

  const username =
    author?.username
      ? author.username.startsWith(
          "@"
        )
        ? author.username
        : `@${author.username}`
      : "";

  return (
    <View
      style={
        styles.authorRow
      }
    >
      {author?.avatar_url ? (
        <Image
          source={{
            uri:
              author.avatar_url,
          }}
          style={
            styles.avatar
          }
        />
      ) : (
        <View
          style={
            styles.avatarFallback
          }
        >
          <Text
            style={
              styles.avatarLetter
            }
          >
            {name
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>
      )}

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={[
            styles.authorName,
            dark &&
              styles.darkText,
          ]}
        >
          {name}
        </Text>

        {!!username && (
          <Text
            style={
              styles.username
            }
          >
            {username}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#080808",
    },

    lightScreen: {
      backgroundColor:
        "#FFFFFF",
    },

    loading: {
      flex: 1,
      backgroundColor:
        "#080808",
      justifyContent:
        "center",
      alignItems: "center",
    },

    topBar: {
      position: "absolute",
      top: 48,
      left: 16,
      right: 16,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    androidTopBar: {
      top: 35,
    },

    topButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "rgba(0,0,0,0.42)",
      alignItems: "center",
      justifyContent:
        "center",
    },

    lightButton: {
      backgroundColor:
        "#F2F2F4",
    },

    topTitle: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },

    darkText: {
      color: "#111111",
    },

    imageStage: {
      flex: 1,
      justifyContent:
        "center",
      alignItems: "center",
      paddingTop: 85,
      paddingBottom: 190,
    },

    fullImage: {
      width: "100%",
      height: "100%",
    },

    bottomPanel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor:
        "#FFFFFF",
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 32,
    },

    authorRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 43,
      height: 43,
      borderRadius: 22,
      marginRight: 11,
    },

    avatarFallback: {
      width: 43,
      height: 43,
      borderRadius: 22,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    avatarLetter: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "800",
    },

    authorName: {
      color: "#111111",
      fontSize: 14,
      fontWeight: "800",
    },

    username: {
      color: "#777777",
      fontSize: 12,
      marginTop: 2,
    },

    caption: {
      color: "#202020",
      fontSize: 15,
      lineHeight: 21,
      marginTop: 16,
    },

    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 15,
    },

    date: {
      color: "#8E8E93",
      fontSize: 11,
      fontWeight: "500",
    },

    dot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        "#B7B7BC",
      marginHorizontal: 8,
    },

    visibility: {
      color: "#8E8E93",
      fontSize: 11,
      marginLeft: 4,
    },

    textPostContainer: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 120,
      paddingBottom: 40,
    },

    largePostText: {
      fontSize: 27,
      lineHeight: 38,
      fontWeight: "600",
      color: "#151515",
      marginTop: 45,
      letterSpacing: -0.4,
    },

    textMeta: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 35,
    },
  });