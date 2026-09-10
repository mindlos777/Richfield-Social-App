import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  media_type: string | null;
  visibility: string;
  created_at: string;
};

type Author = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;

  author?: {
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
};

export default function PostDetailScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const inputRef =
    useRef<TextInput>(null);

  const [post, setPost] =
    useState<Post | null>(null);

  const [author, setAuthor] =
    useState<Author | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [liked, setLiked] =
    useState(false);

  const [likesCount, setLikesCount] =
    useState(0);

  const [comments, setComments] =
    useState<Comment[]>([]);

  const [commentText, setCommentText] =
    useState("");

  const [sendingComment, setSendingComment] =
    useState(false);

  const [liking, setLiking] =
    useState(false);

  useEffect(() => {
    if (id) {
      loadEverything();
    }
  }, [id]);

  async function loadEverything() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(
        user?.id || null
      );

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

      const {
        data: authorData,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          username,
          avatar_url
        `)
        .eq(
          "id",
          postData.user_id
        )
        .single();

      setAuthor(
        authorData || null
      );

      await Promise.all([
        loadLikes(
          postData.id,
          user?.id || null
        ),

        loadComments(
          postData.id
        ),
      ]);
    } catch (error) {
      console.log(
        "Post loading error:",
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

  async function loadLikes(
    postId: string,
    userId: string | null
  ) {
    const {
      count,
      error,
    } = await supabase
      .from("post_likes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("post_id", postId);

    if (!error) {
      setLikesCount(
        count || 0
      );
    }

    if (!userId) {
      setLiked(false);
      return;
    }

    const {
      data: myLike,
    } = await supabase
      .from("post_likes")
      .select("id")
      .eq(
        "post_id",
        postId
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

    setLiked(Boolean(myLike));
  }

  async function loadComments(
    postId: string
  ) {
    const {
      data: commentData,
      error,
    } = await supabase
      .from("post_comments")
      .select(`
        id,
        user_id,
        content,
        created_at
      `)
      .eq(
        "post_id",
        postId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      console.log(
        "Comments error:",
        error
      );

      return;
    }

    if (
      !commentData ||
      commentData.length === 0
    ) {
      setComments([]);
      return;
    }

    const userIds = [
      ...new Set(
        commentData.map(
          (comment) =>
            comment.user_id
        )
      ),
    ];

    const {
      data: profileData,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        username,
        avatar_url
      `)
      .in("id", userIds);

    const profileMap =
      new Map();

    profileData?.forEach(
      (profile) => {
        profileMap.set(
          profile.id,
          profile
        );
      }
    );

    const mapped =
      commentData.map(
        (comment) => ({
          ...comment,

          author:
            profileMap.get(
              comment.user_id
            ),
        })
      );

    setComments(mapped);
  }

  async function toggleLike() {
    if (
      !post ||
      !currentUserId ||
      liking
    ) {
      return;
    }

    try {
      setLiking(true);

      if (liked) {
        setLiked(false);

        setLikesCount(
          (current) =>
            Math.max(
              current - 1,
              0
            )
        );

        const { error } =
          await supabase
            .from(
              "post_likes"
            )
            .delete()
            .eq(
              "post_id",
              post.id
            )
            .eq(
              "user_id",
              currentUserId
            );

        if (error) {
          throw error;
        }
      } else {
        setLiked(true);

        setLikesCount(
          (current) =>
            current + 1
        );

        const { error } =
          await supabase
            .from(
              "post_likes"
            )
            .insert({
              post_id:
                post.id,

              user_id:
                currentUserId,
            });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.log(
        "Like error:",
        error
      );

      await loadLikes(
        post.id,
        currentUserId
      );
    } finally {
      setLiking(false);
    }
  }

  async function sendComment() {
    const cleanComment =
      commentText.trim();

    if (
      !cleanComment ||
      !post ||
      !currentUserId ||
      sendingComment
    ) {
      return;
    }

    try {
      setSendingComment(true);

      const {
        data,
        error,
      } = await supabase
        .from(
          "post_comments"
        )
        .insert({
          post_id:
            post.id,

          user_id:
            currentUserId,

          content:
            cleanComment,
        })
        .select(`
          id,
          user_id,
          content,
          created_at
        `)
        .single();

      if (error) {
        throw error;
      }

      const {
        data:
          currentProfile,
      } = await supabase
        .from("profiles")
        .select(`
          full_name,
          username,
          avatar_url
        `)
        .eq(
          "id",
          currentUserId
        )
        .single();

      setComments(
        (current) => [
          ...current,
          {
            ...data,
            author:
              currentProfile ||
              undefined,
          },
        ]
      );

      setCommentText("");
    } catch (error) {
      console.log(
        "Comment error:",
        error
      );

      Alert.alert(
        "Comment failed",
        "Your comment could not be posted."
      );
    } finally {
      setSendingComment(false);
    }
  }

  function confirmDeletePost() {
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
          onPress:
            deletePost,
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
          .eq(
            "id",
            post.id
          );

      if (error) {
        throw error;
      }

      router.back();
    } catch (error) {
      Alert.alert(
        "Delete failed",
        "The post could not be deleted."
      );
    }
  }

  function confirmDeleteComment(
    comment: Comment
  ) {
    if (
      comment.user_id !==
      currentUserId
    ) {
      return;
    }

    Alert.alert(
      "Delete comment?",
      undefined,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteComment(
              comment.id
            ),
        },
      ]
    );
  }

  async function deleteComment(
    commentId: string
  ) {
    try {
      const { error } =
        await supabase
          .from(
            "post_comments"
          )
          .delete()
          .eq(
            "id",
            commentId
          );

      if (error) {
        throw error;
      }

      setComments(
        (current) =>
          current.filter(
            (comment) =>
              comment.id !==
              commentId
          )
      );
    } catch {
      Alert.alert(
        "Delete failed",
        "The comment could not be deleted."
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

  function formatCommentTime(
    value: string
  ) {
    const date =
      new Date(value);

    const difference =
      Date.now() -
      date.getTime();

    const minutes =
      Math.floor(
        difference /
          60000
      );

    if (minutes < 1) {
      return "now";
    }

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    if (hours < 24) {
      return `${hours}h`;
    }

    const days =
      Math.floor(
        hours / 24
      );

    if (days < 7) {
      return `${days}d`;
    }

    return formatDate(value);
  }

  if (loading) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />
      </View>
    );
  }

  if (!post) {
    return null;
  }

  const ownsPost =
    currentUserId ===
    post.user_id;

  return (
    <SafeAreaView
      edges={[
        "top",
        "bottom",
      ]}
      style={
        styles.screen
      }
    >
      <StatusBar
        barStyle="dark-content"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#161616"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Post
          </Text>

          {ownsPost ? (
            <Pressable
              style={
                styles.headerButton
              }
              onPress={
                confirmDeletePost
              }
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={23}
                color="#161616"
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

        <FlatList
          data={comments}
          keyExtractor={(
            item
          ) => item.id}
          showsVerticalScrollIndicator={
            false
          }
          ListHeaderComponent={
            <>
              <View
                style={
                  styles.authorSection
                }
              >
                <Avatar
                  name={
                    author?.full_name
                  }
                  uri={
                    author?.avatar_url
                  }
                  size={44}
                />

                <View
                  style={
                    styles.authorInfo
                  }
                >
                  <Text
                    style={
                      styles.authorName
                    }
                  >
                    {author?.full_name ||
                      "Richfield Member"}
                  </Text>

                  <View
                    style={
                      styles.authorMeta
                    }
                  >
                    {author?.username && (
                      <Text
                        style={
                          styles.authorUsername
                        }
                      >
                        {author.username.startsWith(
                          "@"
                        )
                          ? author.username
                          : `@${author.username}`}
                      </Text>
                    )}

                    <View
                      style={
                        styles.metaDot
                      }
                    />

                    <Text
                      style={
                        styles.postDate
                      }
                    >
                      {formatDate(
                        post.created_at
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {post.content && (
                <Text
                  style={
                    styles.postContent
                  }
                >
                  {post.content}
                </Text>
              )}

              {post.image_url && (
                <View
                  style={
                    styles.imageContainer
                  }
                >
                  <Image
                    source={{
                      uri:
                        post.image_url,
                    }}
                    style={
                      styles.postImage
                    }
                    resizeMode="cover"
                  />
                </View>
              )}

              <View
                style={
                  styles.engagementSummary
                }
              >
                <Text
                  style={
                    styles.engagementText
                  }
                >
                  {likesCount ===
                  1
                    ? "1 like"
                    : `${likesCount} likes`}
                </Text>

                <Pressable
                  onPress={() =>
                    inputRef.current?.focus()
                  }
                >
                  <Text
                    style={
                      styles.engagementText
                    }
                  >
                    {comments.length ===
                    1
                      ? "1 comment"
                      : `${comments.length} comments`}
                  </Text>
                </Pressable>
              </View>

              <View
                style={
                  styles.actionBar
                }
              >
                <Pressable
                  style={
                    styles.actionButton
                  }
                  onPress={
                    toggleLike
                  }
                >
                  <Ionicons
                    name={
                      liked
                        ? "heart"
                        : "heart-outline"
                    }
                    size={24}
                    color={
                      liked
                        ? "#E53935"
                        : "#222"
                    }
                  />

                  <Text
                    style={[
                      styles.actionText,
                      liked && {
                        color:
                          "#E53935",
                      },
                    ]}
                  >
                    Like
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.actionButton
                  }
                  onPress={() =>
                    inputRef.current?.focus()
                  }
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={22}
                    color="#222"
                  />

                  <Text
                    style={
                      styles.actionText
                    }
                  >
                    Comment
                  </Text>
                </Pressable>

                <View
                  style={
                    styles.visibilityBox
                  }
                >
                  <Ionicons
                    name={
                      post.visibility ===
                      "Everyone"
                        ? "earth-outline"
                        : "people-outline"
                    }
                    size={17}
                    color="#777"
                  />

                  <Text
                    style={
                      styles.visibilityText
                    }
                  >
                    {
                      post.visibility
                    }
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.commentsHeader
                }
              >
                <Text
                  style={
                    styles.commentsTitle
                  }
                >
                  Comments
                </Text>
              </View>
            </>
          }
          renderItem={({
            item,
          }) => (
            <Pressable
              onLongPress={() =>
                confirmDeleteComment(
                  item
                )
              }
              style={
                styles.commentRow
              }
            >
              <Avatar
                name={
                  item.author
                    ?.full_name
                }
                uri={
                  item.author
                    ?.avatar_url
                }
                size={38}
              />

              <View
                style={
                  styles.commentBody
                }
              >
                <View
                  style={
                    styles.commentBubble
                  }
                >
                  <View
                    style={
                      styles.commentTop
                    }
                  >
                    <Text
                      style={
                        styles.commentName
                      }
                    >
                      {item.author
                        ?.full_name ||
                        "Member"}
                    </Text>

                    <Text
                      style={
                        styles.commentTime
                      }
                    >
                      {formatCommentTime(
                        item.created_at
                      )}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.commentContent
                    }
                  >
                    {item.content}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View
              style={
                styles.noComments
              }
            >
              <Text
                style={
                  styles.noCommentsTitle
                }
              >
                No comments yet
              </Text>

              <Text
                style={
                  styles.noCommentsText
                }
              >
                Start the conversation.
              </Text>
            </View>
          }
          contentContainerStyle={
            styles.listContent
          }
        />

        <View
          style={
            styles.commentComposer
          }
        >
          <TextInput
            ref={inputRef}
            value={
              commentText
            }
            onChangeText={
              setCommentText
            }
            placeholder="Add a comment..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            style={
              styles.commentInput
            }
          />

          <Pressable
            style={[
              styles.sendButton,

              !commentText.trim() &&
                styles.sendButtonDisabled,
            ]}
            disabled={
              !commentText.trim() ||
              sendingComment
            }
            onPress={
              sendComment
            }
          >
            {sendingComment ? (
              <ActivityIndicator
                size="small"
                color="#fff"
              />
            ) : (
              <Ionicons
                name="arrow-up"
                size={20}
                color="#fff"
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Avatar({
  name,
  uri,
  size,
}: {
  name?: string | null;
  uri?: string | null;
  size: number;
}) {
  if (uri) {
    return (
      <Image
        source={{
          uri,
        }}
        style={{
          width: size,
          height: size,
          borderRadius:
            size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius:
          size / 2,
        backgroundColor:
          PRIMARY,
        alignItems: "center",
        justifyContent:
          "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize:
            size * 0.38,
          fontWeight: "800",
        }}
      >
        {(name || "R")
          .charAt(0)
          .toUpperCase()}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#fff",
    },

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff",
    },

    header: {
      height: 58,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },

    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#161616",
    },

    listContent: {
      paddingBottom: 20,
    },

    authorSection: {
      paddingHorizontal: 16,
      paddingTop: 17,
      flexDirection: "row",
      alignItems: "center",
    },

    authorInfo: {
      flex: 1,
      marginLeft: 11,
    },

    authorName: {
      fontSize: 15,
      fontWeight: "800",
      color: "#161616",
    },

    authorMeta: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
    },

    authorUsername: {
      color: "#777",
      fontSize: 12,
    },

    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: "#aaa",
      marginHorizontal: 7,
    },

    postDate: {
      fontSize: 12,
      color: "#888",
    },

    postContent: {
      paddingHorizontal: 16,
      marginTop: 15,
      marginBottom: 15,
      fontSize: 16,
      lineHeight: 23,
      color: "#222",
    },

    imageContainer: {
      width: "100%",
      backgroundColor: "#111",
    },

    postImage: {
      width: "100%",
      aspectRatio: 1,
    },

    engagementSummary: {
      height: 45,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },

    engagementText: {
      fontSize: 12,
      color: "#666",
      fontWeight: "600",
    },

    actionBar: {
      minHeight: 56,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },

    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 26,
    },

    actionText: {
      marginLeft: 7,
      fontSize: 13,
      fontWeight: "700",
      color: "#333",
    },

    visibilityBox: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "center",
    },

    visibilityText: {
      color: "#777",
      fontSize: 11,
      marginLeft: 4,
    },

    commentsHeader: {
      paddingHorizontal: 16,
      paddingTop: 21,
      paddingBottom: 12,
    },

    commentsTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#161616",
    },

    commentRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems:
        "flex-start",
    },

    commentBody: {
      flex: 1,
      marginLeft: 10,
    },

    commentBubble: {
      alignSelf:
        "flex-start",
      maxWidth: "100%",
      backgroundColor:
        "#F4F4F6",
      borderRadius: 16,
      borderTopLeftRadius: 5,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },

    commentTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    commentName: {
      fontSize: 13,
      fontWeight: "800",
      color: "#222",
    },

    commentTime: {
      fontSize: 10,
      color: "#999",
      marginLeft: 8,
    },

    commentContent: {
      color: "#333",
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },

    noComments: {
      alignItems: "center",
      paddingVertical: 35,
    },

    noCommentsTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#444",
    },

    noCommentsText: {
      color: "#999",
      fontSize: 12,
      marginTop: 4,
    },

    commentComposer: {
      minHeight: 64,
      borderTopWidth: 1,
      borderTopColor: "#E6E6E8",
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: "#fff",
    },

    commentInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 100,
      backgroundColor: "#F3F3F5",
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 11,
      fontSize: 14,
      color: "#222",
    },

    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },

    sendButtonDisabled: {
      opacity: 0.35,
    },
  });