import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_CHARACTERS = 1000;

export default function CreatePostScreen() {
  const [content, setContent] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [visibility, setVisibility] = useState("Everyone");
  const [showVisibility, setShowVisibility] = useState(false);
  const [posting, setPosting] = useState(false);
  const [mediaOptionsVisible, setMediaOptionsVisible] = useState(false);

const openCamera = async () => {
  try {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Camera permission required",
        "Please allow camera access to take a photo."
      );
      return;
    }

    setMediaOptionsVisible(false);

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

    if (
      !result.canceled &&
      result.assets.length > 0
    ) {
      const asset = result.assets[0];

      setMediaUri(asset.uri);
      setMediaType(asset.type ?? "image");
    }
  } catch (error) {
    console.log("Camera error:", error);

    Alert.alert(
      "Camera error",
      "Something went wrong while opening the camera."
    );
  }
};

const openGallery = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Gallery permission required",
        "Please allow access to your gallery."
      );
      return;
    }

    setMediaOptionsVisible(false);

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsEditing: true,
        quality: 0.8,
      });

    if (
      !result.canceled &&
      result.assets.length > 0
    ) {
      const asset = result.assets[0];

      setMediaUri(asset.uri);
      setMediaType(asset.type ?? "image");
    }
  } catch (error) {
    console.log("Gallery error:", error);

    Alert.alert(
      "Gallery error",
      "Something went wrong while opening your gallery."
    );
  }
};

  const handlePost = async () => {
    if (!content.trim() && !mediaUri) {
      return;
    }

    setPosting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      setContent("");
      setMediaUri(null);
      setMediaType(null);

      router.back();
    } finally {
      setPosting(false);
    }
  };

  const canPost = content.trim().length > 0 || mediaUri !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="close" size={26} color="#111827" />
          </Pressable>

          <Text style={styles.headerTitle}>Create Post</Text>

          <Pressable
            onPress={handlePost}
            disabled={!canPost || posting}
            style={[
              styles.postButton,
              (!canPost || posting) && styles.postButtonDisabled,
            ]}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.postButtonText,
                  !canPost && styles.postButtonTextDisabled,
                ]}
              >
                Post
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color="#64748B" />
            </View>

            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>Your Profile</Text>

              <Pressable
                style={styles.visibilityButton}
                onPress={() => setShowVisibility(!showVisibility)}
              >
                <Ionicons
                  name={
                    visibility === "Everyone"
                      ? "globe-outline"
                      : "people-outline"
                  }
                  size={14}
                  color="#64748B"
                />

                <Text style={styles.visibilityText}>
                  {visibility}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>

          {showVisibility && (
            <View style={styles.visibilityMenu}>
              <Pressable
                style={styles.visibilityOption}
                onPress={() => {
                  setVisibility("Everyone");
                  setShowVisibility(false);
                }}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color="#334155"
                />

                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Everyone</Text>
                  <Text style={styles.optionDescription}>
                    Anyone can see your post
                  </Text>
                </View>

                {visibility === "Everyone" && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color="#2563EB"
                  />
                )}
              </Pressable>

              <Pressable
                style={styles.visibilityOption}
                onPress={() => {
                  setVisibility("Connections");
                  setShowVisibility(false);
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color="#334155"
                />

                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Connections</Text>
                  <Text style={styles.optionDescription}>
                    Only your connections can see your post
                  </Text>
                </View>

                {visibility === "Connections" && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color="#2563EB"
                  />
                )}
              </Pressable>
            </View>
          )}

          <TextInput
            value={content}
            onChangeText={(text) =>
              setContent(text.slice(0, MAX_CHARACTERS))
            }
            placeholder="Share something with your professional network..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            style={styles.textInput}
            autoFocus
          />

          <View style={styles.characterRow}>
            <Text style={styles.characterCount}>
              {content.length}/{MAX_CHARACTERS}
            </Text>
          </View>

          {mediaUri && (
            <View style={styles.mediaPreview}>
              {mediaType === "video" ? (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons
                    name="videocam-outline"
                    size={42}
                    color="#2563EB"
                  />

                  <Text style={styles.mediaText}>Video attached</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: mediaUri }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              )}

              <Pressable
                style={styles.removeMedia}
                onPress={() => {
                  setMediaUri(null);
                  setMediaType(null);
                }}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.addToPostTitle}>Add to your post</Text>

          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={pickMedia}>
              <View style={styles.actionIcon}>
                <Ionicons
                  name="images-outline"
                  size={22}
                  color="#2563EB"
                />
              </View>

              <Text style={styles.actionText}>Photo / Video</Text>
            </Pressable>

          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={21}
              color="#2563EB"
            />

            <Text style={styles.infoText}>
              Share projects, achievements, career opportunities, ideas,
              events, or professional insights with your network.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  postButton: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  postButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },

  postButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  postButtonTextDisabled: {
    color: "#94A3B8",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  profileDetails: {
    marginLeft: 12,
  },

  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },

  visibilityButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  visibilityText: {
    fontSize: 13,
    color: "#64748B",
  },

  visibilityMenu: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  optionContent: {
    flex: 1,
    marginLeft: 12,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  optionDescription: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  textInput: {
    minHeight: 220,
    marginTop: 24,
    fontSize: 17,
    lineHeight: 25,
    color: "#0F172A",
  },

  characterRow: {
    alignItems: "flex-end",
  },

  characterCount: {
    fontSize: 12,
    color: "#94A3B8",
  },

  mediaPreview: {
    height: 180,
    marginTop: 18,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    position: "relative",
  },

  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  mediaImage: {
    width: "100%",
    height: "100%",
  },

  mediaText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },

  removeMedia: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 24,
  },

  addToPostTitle: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  actions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 20,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  infoCard: {
    flexDirection: "row",
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
});
