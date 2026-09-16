import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

const PRIMARY = "#0300cf";

export type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

export type FeedPostItem = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  media_type: string | null;
  visibility: string | null;
  created_at: string;

  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  headline: string | null;

  programme?: string | null;
  campus?: string | null;
  skills?: string[];

  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
};

type Props = {
  post: FeedPostItem;
  variant: "social" | "talent" | "admin";
  onProfilePress: () => void;

  onLikePress?: () => void;
  onCommentPress?: () => void;
  onSharePress?: () => void;

  onMessagePress?: () => void;
  messageLoading?: boolean;

  onDeletePress?: () => void;
  deleteLoading?: boolean;
};

export default function FeedPostCard({
  post,
  variant,
  onProfilePress,
  onLikePress,
  onCommentPress,
  onSharePress,
  onMessagePress,
  messageLoading = false,
  onDeletePress,
  deleteLoading = false,
}: Props) {
  const subtitle =
    post.headline ||
    post.programme ||
    post.campus ||
    (post.username ? `@${post.username.replace(/^@/, "")}` : getRoleLabel(post.role));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.authorArea} onPress={onProfilePress}>
          {post.avatar_url ? (
            <Image source={{ uri: post.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {getInitials(post.full_name)}
              </Text>
            </View>
          )}

          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {post.full_name || "Richfield Member"}
              </Text>

              <Text style={styles.role}>
                {getRoleLabel(post.role)}
              </Text>
            </View>

            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {formatRelativeTime(post.created_at)}
              </Text>

              <Text style={styles.metaText}>·</Text>

              <Ionicons
                name={
                  post.visibility?.toLowerCase() === "connections"
                    ? "people-outline"
                    : "globe-outline"
                }
                size={12}
                color="#8B8B91"
              />
            </View>
          </View>
        </Pressable>

        {variant === "admin" && onDeletePress ? (
          <Pressable
            style={styles.adminDeleteButton}
            onPress={onDeletePress}
            disabled={deleteLoading}
            hitSlop={8}
          >
            {deleteLoading ? (
              <ActivityIndicator size="small" color="#B42318" />
            ) : (
              <Ionicons name="trash-outline" size={19} color="#B42318" />
            )}
          </Pressable>
        ) : null}
      </View>

      {post.content ? (
        <Text style={styles.content}>{post.content}</Text>
      ) : null}

      {post.image_url ? (
        post.media_type === "video" ? (
          <FeedVideo uri={post.image_url} />
        ) : (
          <Image
            source={{ uri: post.image_url }}
            style={styles.media}
            resizeMode="cover"
          />
        )
      ) : null}

      {variant === "talent" && post.skills?.length ? (
        <View style={styles.skills}>
          {post.skills.slice(0, 5).map((skill, index) => (
            <View key={`${post.id}-${skill}-${index}`} style={styles.skill}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {variant === "talent" ? (
        <View style={styles.talentActions}>
          <Pressable style={styles.secondaryButton} onPress={onProfilePress}>
            <Ionicons name="person-outline" size={17} color="#292929" />
            <Text style={styles.secondaryButtonText}>Profile</Text>
          </Pressable>

          <Pressable
            style={styles.primaryButton}
            onPress={onMessagePress}
            disabled={!onMessagePress || messageLoading}
          >
            {messageLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.primaryButtonText}>Message</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.engagement}>
            <Text style={styles.engagementText}>
              {post.likes} {post.likes === 1 ? "like" : "likes"}
            </Text>

            <Text style={styles.engagementText}>
              {post.comments} comments · {post.shares} shares
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.socialActions}>
            <PostAction
              icon={post.liked ? "thumbs-up" : "thumbs-up-outline"}
              label="Like"
              active={post.liked}
              onPress={onLikePress}
            />

            <PostAction
              icon="chatbubble-outline"
              label="Comment"
              onPress={onCommentPress}
            />

            <PostAction
              icon="share-social-outline"
              label="Share"
              onPress={onSharePress}
            />
          </View>
        </>
      )}
    </View>
  );
}

function PostAction({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.postAction}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons
        name={icon}
        size={19}
        color={active ? PRIMARY : "#63636A"}
      />
      <Text
        style={[
          styles.postActionText,
          active && styles.postActionTextActive,
          !onPress && styles.disabledText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FeedVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.media}
      nativeControls
      contentFit="cover"
    />
  );
}

function getRoleLabel(role: UserRole | null) {
  switch (role) {
    case "student":
      return "Student";
    case "alumni":
      return "Alumni";
    case "business":
      return "Business";
    case "admin":
      return "Richfield";
    default:
      return "Member";
  }
}

function getInitials(name: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "R";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0).toUpperCase()}${parts[
    parts.length - 1
  ]
    .charAt(0)
    .toUpperCase()}`;
}

function formatRelativeTime(value: string) {
  const created = new Date(value);
  const seconds = Math.max(
    1,
    Math.floor((Date.now() - created.getTime()) / 1000)
  );

  if (seconds < 60) return "now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return created.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E7E7EB",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  authorArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 11,
    backgroundColor: "#eee",
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECECF7",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2A2A2D",
  },
  authorText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  name: {
    flexShrink: 1,
    color: "#171717",
    fontSize: 14,
    fontWeight: "800",
  },
  role: {
    color: "#74747A",
    fontSize: 10,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    color: "#66666D",
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    color: "#8B8B91",
    fontSize: 10,
  },
  adminDeleteButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 13,
    color: "#272727",
    fontSize: 14,
    lineHeight: 20,
  },
  media: {
    width: "100%",
    aspectRatio: 1.15,
    backgroundColor: "#111",
  },
  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E0E0E4",
    borderRadius: 16,
    backgroundColor: "#FAFAFB",
  },
  skillText: {
    color: "#55555A",
    fontSize: 10,
    fontWeight: "700",
  },
  engagement: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  engagementText: {
    color: "#737378",
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: "#EEEEF0",
  },
  socialActions: {
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 8,
  },
  postAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  postActionText: {
    color: "#63636A",
    fontSize: 12,
    fontWeight: "600",
  },
  postActionTextActive: {
    color: PRIMARY,
  },
  disabledText: {
    opacity: 0.45,
  },
  talentActions: {
    flexDirection: "row",
    gap: 9,
    padding: 14,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#DADADF",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryButtonText: {
    color: "#292929",
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});