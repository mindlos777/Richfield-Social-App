import React, {
  useEffect,
  useState,
} from "react";

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
import * as ImageManipulator from "expo-image-manipulator";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const PRIMARY = "#0300cf";
const MAX_CHARACTERS = 1000;

type ComposerProfile = {
  fullName: string;
  avatar: string | null;
  programme: string;
  campus: string;
};

export default function CreatePostScreen() {
  const [content, setContent] =
    useState("");

  const [mediaUri, setMediaUri] =
    useState<string | null>(null);

  const [mediaType, setMediaType] =
    useState<string | null>(null);

  const [visibility, setVisibility] =
    useState("Everyone");

  const [
    showVisibility,
    setShowVisibility,
  ] = useState(false);

  const [
    mediaOptionsVisible,
    setMediaOptionsVisible,
  ] = useState(false);

  const [posting, setPosting] =
    useState(false);

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [profile, setProfile] =
    useState<ComposerProfile>({
      fullName: "Your Profile",
      avatar: null,
      programme: "",
      campus: "",
    });

  useEffect(() => {
    loadCurrentProfile();
  }, []);

  async function loadCurrentProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.back();
        return;
      }

      const [
        profileResult,
        studentResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            full_name,
            avatar_url
          `)
          .eq("id", user.id)
          .single(),

        supabase
          .from("student_profiles")
          .select(`
            programme,
            campus
          `)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      setProfile({
        fullName:
          profileResult.data.full_name ||
          "Your Profile",

        avatar:
          profileResult.data.avatar_url ||
          null,

        programme:
          studentResult.data?.programme ||
          "",

        campus:
          studentResult.data?.campus ||
          "",
      });
    } catch (error) {
      console.log(
        "Create post profile error:",
        error
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  async function openCamera() {
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
          quality: 0.85,
        });

      if (
        !result.canceled &&
        result.assets.length > 0
      ) {
        const asset =
          result.assets[0];

        setMediaUri(asset.uri);
        setMediaType(
          asset.type || "image"
        );
      }
    } catch (error) {
      console.log(
        "Camera error:",
        error
      );

      Alert.alert(
        "Camera error",
        "Something went wrong while opening the camera."
      );
    }
  }

  async function openGallery() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Gallery permission required",
          "Please allow access to your photos."
        );

        return;
      }

      setMediaOptionsVisible(false);

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: [
            "images",
            "videos",
          ],
          allowsEditing: true,
          quality: 0.85,
        });

      if (
        !result.canceled &&
        result.assets.length > 0
      ) {
        const asset =
          result.assets[0];

        setMediaUri(asset.uri);
        setMediaType(
          asset.type || "image"
        );
      }
    } catch (error) {
      console.log(
        "Gallery error:",
        error
      );

      Alert.alert(
        "Gallery error",
        "Something went wrong while opening your gallery."
      );
    }
  }

  async function uploadMedia(
    userId: string
  ) {
    if (!mediaUri) {
      return null;
    }

    if (mediaType === "video") {
      const response =
        await fetch(mediaUri);

      const arrayBuffer =
        await response.arrayBuffer();

      const extension =
        mediaUri
          .split(".")
          .pop()
          ?.split("?")[0]
          ?.toLowerCase() || "mp4";

      const contentType =
        extension === "mov"
          ? "video/quicktime"
          : "video/mp4";

      const filePath =
        `${userId}/${Date.now()}.${extension}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("post-media")
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType,
            upsert: false,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("post-media")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    }

    const context =
      ImageManipulator.ImageManipulator.manipulate(
        mediaUri
      );

    const renderedImage =
      await context.renderAsync();

    const savedImage =
      await renderedImage.saveAsync({
        format:
          ImageManipulator.SaveFormat.JPEG,

        compress: 0.9,
      });

    console.log(
      "Converted image URI:",
      savedImage.uri
    );

    const response =
      await fetch(savedImage.uri);

    if (!response.ok) {
      throw new Error(
        "Unable to read selected image."
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    console.log(
      "Image bytes:",
      arrayBuffer.byteLength
    );

    if (
      arrayBuffer.byteLength === 0
    ) {
      throw new Error(
        "The selected image is empty."
      );
    }

    const filePath =
      `${userId}/${Date.now()}.jpg`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("post-media")
      .upload(
        filePath,
        arrayBuffer,
        {
          contentType:
            "image/jpeg",

          cacheControl:
            "3600",

          upsert: false,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("post-media")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  async function handlePost() {
    if (
      !content.trim() &&
      !mediaUri
    ) {
      return;
    }

    try {
      setPosting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        Alert.alert(
          "Not signed in",
          "Please sign in again."
        );

        return;
      }

      const mediaUrl =
        await uploadMedia(
          user.id
        );

      const {
        error: postError,
      } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,

          content:
            content.trim() ||
            null,

          image_url:
            mediaUrl,

          media_type:
            mediaType ||
            (mediaUrl
              ? "image"
              : null),

          visibility,
        });

      if (postError) {
        throw postError;
      }

      setContent("");
      setMediaUri(null);
      setMediaType(null);

      router.back();
    } catch (error) {
      console.log(
        "Create post error:",
        error
      );

      Alert.alert(
        "Post failed",
        error instanceof Error
          ? error.message
          : "Your post could not be created."
      );
    } finally {
      setPosting(false);
    }
  }

  const canPost =
    content.trim().length > 0 ||
    mediaUri !== null;

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <KeyboardAvoidingView
        style={
          styles.container
        }
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={
              styles.composerActions
            }
          >
            <Pressable
              style={
                styles.closeButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="close"
                size={26}
                color="#111"
              />
            </Pressable>

            <Pressable
              onPress={
                handlePost
              }
              disabled={
                !canPost ||
                posting
              }
              style={[
                styles.postButton,

                (!canPost ||
                  posting) &&
                  styles.postButtonDisabled,
              ]}
            >
              {posting ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <Text
                  style={
                    styles.postButtonText
                  }
                >
                  Post
                </Text>
              )}
            </Pressable>
          </View>

          <View
            style={
              styles.profileRow
            }
          >
            {loadingProfile ? (
              <View
                style={
                  styles.avatarPlaceholder
                }
              >
                <ActivityIndicator
                  size="small"
                  color={PRIMARY}
                />
              </View>
            ) : profile.avatar ? (
              <Image
                source={{
                  uri:
                    profile.avatar,
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
                  {profile.fullName
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            )}

            <View
              style={
                styles.profileDetails
              }
            >
              <Text
                style={
                  styles.profileName
                }
              >
                {
                  profile.fullName
                }
              </Text>

              {(profile.programme ||
                profile.campus) && (
                <Text
                  style={
                    styles.profileEducation
                  }
                  numberOfLines={1}
                >
                  {[
                    profile.programme,
                    profile.campus,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}

              <Pressable
                style={
                  styles.visibilityButton
                }
                onPress={() =>
                  setShowVisibility(
                    !showVisibility
                  )
                }
              >
                <Ionicons
                  name={
                    visibility ===
                    "Everyone"
                      ? "earth-outline"
                      : "people-outline"
                  }
                  size={14}
                  color="#666"
                />

                <Text
                  style={
                    styles.visibilityText
                  }
                >
                  {visibility}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={13}
                  color="#666"
                />
              </Pressable>
            </View>
          </View>

          {showVisibility && (
            <View
              style={
                styles.visibilityMenu
              }
            >
              <Pressable
                style={
                  styles.visibilityOption
                }
                onPress={() => {
                  setVisibility(
                    "Everyone"
                  );

                  setShowVisibility(
                    false
                  );
                }}
              >
                <Ionicons
                  name="earth-outline"
                  size={20}
                  color="#333"
                />

                <View
                  style={
                    styles.visibilityInfo
                  }
                >
                  <Text
                    style={
                      styles.visibilityTitle
                    }
                  >
                    Everyone
                  </Text>

                  <Text
                    style={
                      styles.visibilityDescription
                    }
                  >
                    Anyone can see
                    your post
                  </Text>
                </View>

                {visibility ===
                  "Everyone" && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={PRIMARY}
                  />
                )}
              </Pressable>

              <Pressable
                style={
                  styles.visibilityOption
                }
                onPress={() => {
                  setVisibility(
                    "Connections"
                  );

                  setShowVisibility(
                    false
                  );
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color="#333"
                />

                <View
                  style={
                    styles.visibilityInfo
                  }
                >
                  <Text
                    style={
                      styles.visibilityTitle
                    }
                  >
                    Connections
                  </Text>

                  <Text
                    style={
                      styles.visibilityDescription
                    }
                  >
                    Only your
                    connections can see it
                  </Text>
                </View>

                {visibility ===
                  "Connections" && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={PRIMARY}
                  />
                )}
              </Pressable>
            </View>
          )}

          <TextInput
            value={content}
            onChangeText={(text) =>
              setContent(
                text.slice(
                  0,
                  MAX_CHARACTERS
                )
              )
            }
            placeholder="What do you want to share?"
            placeholderTextColor="#A0A0A8"
            multiline
            autoFocus
            textAlignVertical="top"
            style={
              styles.textInput
            }
          />

          <Text
            style={
              styles.characterCount
            }
          >
            {content.length}/
            {MAX_CHARACTERS}
          </Text>

          {mediaUri && (
            <View
              style={
                styles.mediaPreview
              }
            >
              {mediaType ===
              "video" ? (
                <View
                  style={
                    styles.videoPreview
                  }
                >
                  <Ionicons
                    name="videocam-outline"
                    size={44}
                    color={PRIMARY}
                  />

                  <Text
                    style={
                      styles.videoText
                    }
                  >
                    Video selected
                  </Text>
                </View>
              ) : (
                <Image
                  source={{
                    uri: mediaUri,
                  }}
                  style={
                    styles.mediaImage
                  }
                  resizeMode="cover"
                />
              )}

              <Pressable
                style={
                  styles.removeMedia
                }
                onPress={() => {
                  setMediaUri(null);
                  setMediaType(null);
                }}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color="#fff"
                />
              </Pressable>
            </View>
          )}

          <View
            style={
              styles.divider
            }
          />

          <Text
            style={
              styles.addTitle
            }
          >
            Add to your post
          </Text>

          <Pressable
            style={
              styles.mediaAction
            }
            onPress={() =>
              setMediaOptionsVisible(
                true
              )
            }
          >
            <View
              style={
                styles.mediaActionIcon
              }
            >
              <Ionicons
                name="images-outline"
                size={22}
                color={PRIMARY}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.mediaActionTitle
                }
              >
                Photo or video
              </Text>

              <Text
                style={
                  styles.mediaActionSubtitle
                }
              >
                Camera or gallery
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#aaa"
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={
          mediaOptionsVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setMediaOptionsVisible(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setMediaOptionsVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.modalSheet
            }
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.sheetHandle
              }
            />

            <Text
              style={
                styles.sheetTitle
              }
            >
              Add a photo
            </Text>

            <Text
              style={
                styles.sheetSubtitle
              }
            >
              Choose where you want
              to add it from.
            </Text>

            <Pressable
              style={
                styles.mediaOption
              }
              onPress={
                openCamera
              }
            >
              <View
                style={
                  styles.optionIcon
                }
              >
                <Ionicons
                  name="camera"
                  size={23}
                  color="#fff"
                />
              </View>

              <View
                style={
                  styles.optionContent
                }
              >
                <Text
                  style={
                    styles.optionTitle
                  }
                >
                  Camera
                </Text>

                <Text
                  style={
                    styles.optionSubtitle
                  }
                >
                  Take a new photo
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#999"
              />
            </Pressable>

            <Pressable
              style={
                styles.mediaOption
              }
              onPress={
                openGallery
              }
            >
              <View
                style={
                  styles.optionIcon
                }
              >
                <Ionicons
                  name="images"
                  size={23}
                  color="#fff"
                />
              </View>

              <View
                style={
                  styles.optionContent
                }
              >
                <Text
                  style={
                    styles.optionTitle
                  }
                >
                  Gallery
                </Text>

                <Text
                  style={
                    styles.optionSubtitle
                  }
                >
                  Choose from your
                  photos
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#999"
              />
            </Pressable>

            <Pressable
              style={
                styles.cancelButton
              }
              onPress={() =>
                setMediaOptionsVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 50,
  },

  composerActions: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 12,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  postButton: {
    minWidth: 70,
    height: 38,
    paddingHorizontal: 17,
    borderRadius: 20,
    backgroundColor:
      PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  postButtonDisabled: {
    opacity: 0.3,
  },

  postButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor:
      PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLetter: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
  },

  profileDetails: {
    flex: 1,
    marginLeft: 11,
  },

  profileName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171717",
  },

  profileEducation: {
    marginTop: 2,
    color: "#777",
    fontSize: 11,
  },

  visibilityButton: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  visibilityText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },

  visibilityMenu: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E8E8EC",
    borderRadius: 14,
    overflow: "hidden",
  },

  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  visibilityInfo: {
    flex: 1,
    marginLeft: 11,
  },

  visibilityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },

  visibilityDescription: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },

  textInput: {
    minHeight: 190,
    marginTop: 22,
    fontSize: 18,
    lineHeight: 26,
    color: "#171717",
  },

  characterCount: {
    alignSelf: "flex-end",
    color: "#aaa",
    fontSize: 11,
  },

  mediaPreview: {
    minHeight: 220,
    maxHeight: 420,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F3F5",
  },

  mediaImage: {
    width: "100%",
    height: 300,
  },

  videoPreview: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },

  videoText: {
    color: "#555",
    fontWeight: "600",
    marginTop: 8,
  },

  removeMedia: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 24,
  },

  addTitle: {
    marginTop: 18,
    color: "#222",
    fontWeight: "800",
    fontSize: 14,
  },

  mediaAction: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  mediaActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor:
      "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  mediaActionTitle: {
    color: "#222",
    fontWeight: "700",
    fontSize: 14,
  },

  mediaActionSubtitle: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 35,
  },

  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: 22,
  },

  sheetTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111",
  },

  sheetSubtitle: {
    color: "#777",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 18,
  },

  mediaOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },

  optionIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor:
      PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  optionContent: {
    flex: 1,
    marginLeft: 13,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  optionSubtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },

  cancelButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor:
      "#F2F2F4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },

  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
});