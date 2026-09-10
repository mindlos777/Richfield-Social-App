```tsx
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

type SelectedMedia = {
  uri: string;
  type: "image" | "video";
  mimeType: string | null;
  fileName: string | null;
};

type UploadedMedia = {
  url: string;
  type: "image" | "video";
};

export default function CreatePostScreen() {
  const [content, setContent] =
    useState("");

  const [selectedMedia, setSelectedMedia] =
    useState<SelectedMedia | null>(null);

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

  const [
    loadingProfile,
    setLoadingProfile,
  ] = useState(true);

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
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
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

      if (studentResult.error) {
        console.log(
          "Student profile error:",
          studentResult.error
        );
      }

      setProfile({
        fullName:
          profileResult.data
            ?.full_name ||
          "Your Profile",

        avatar:
          profileResult.data
            ?.avatar_url ||
          null,

        programme:
          studentResult.data
            ?.programme ||
          "",

        campus:
          studentResult.data
            ?.campus ||
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
        await ImagePicker
          .requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Camera permission required",
          "Please allow camera access to take a photo."
        );

        return;
      }

      setMediaOptionsVisible(false);

      const result =
        await ImagePicker
          .launchCameraAsync({
            mediaTypes: [
              "images",
            ],
            allowsEditing: false,
            quality: 1,
          });

      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }

      const asset =
        result.assets[0];

      console.log(
        "Camera asset:",
        {
          uri: asset.uri,
          type: asset.type,
          mimeType:
            asset.mimeType,
          fileName:
            asset.fileName,
          width:
            asset.width,
          height:
            asset.height,
        }
      );

      setSelectedMedia({
        uri: asset.uri,
        type: "image",
        mimeType:
          asset.mimeType ||
          null,
        fileName:
          asset.fileName ||
          null,
      });
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
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Gallery permission required",
          "Please allow access to your photos and videos."
        );

        return;
      }

      setMediaOptionsVisible(false);

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: [
              "images",
              "videos",
            ],

            allowsEditing:
              false,

            quality: 1,

            videoQuality:
              ImagePicker
                .UIImagePickerControllerQualityType
                .Medium,
          });

      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }

      const asset =
        result.assets[0];

      const type:
        | "image"
        | "video" =
        asset.type === "video"
          ? "video"
          : "image";

      console.log(
        "Gallery asset:",
        {
          uri: asset.uri,
          type,
          mimeType:
            asset.mimeType,
          fileName:
            asset.fileName,
          fileSize:
            asset.fileSize,
          width:
            asset.width,
          height:
            asset.height,
        }
      );

      setSelectedMedia({
        uri: asset.uri,
        type,
        mimeType:
          asset.mimeType ||
          null,
        fileName:
          asset.fileName ||
          null,
      });
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

  function getVideoExtension(
    media: SelectedMedia
  ) {
    const fileName =
      media.fileName
        ?.toLowerCase();

    if (
      fileName?.endsWith(
        ".mov"
      )
    ) {
      return "mov";
    }

    if (
      fileName?.endsWith(
        ".m4v"
      )
    ) {
      return "m4v";
    }

    if (
      fileName?.endsWith(
        ".webm"
      )
    ) {
      return "webm";
    }

    if (
      media.mimeType ===
      "video/quicktime"
    ) {
      return "mov";
    }

    if (
      media.mimeType ===
      "video/webm"
    ) {
      return "webm";
    }

    return "mp4";
  }

  function getVideoContentType(
    extension: string
  ) {
    if (
      extension === "mov"
    ) {
      return "video/quicktime";
    }

    if (
      extension === "webm"
    ) {
      return "video/webm";
    }

    if (
      extension === "m4v"
    ) {
      return "video/x-m4v";
    }

    return "video/mp4";
  }

  async function uploadImage(
    userId: string,
    media: SelectedMedia
  ): Promise<UploadedMedia> {
    console.log(
      "Original image URI:",
      media.uri
    );

    /*
      We deliberately re-render the
      selected image.

      This helps with HEIC, unusual
      Android gallery formats and
      images that Supabase may otherwise
      receive incorrectly.
    */

    const context =
      ImageManipulator
        .ImageManipulator
        .manipulate(
          media.uri
        );

    /*
      Large modern phone images can
      easily be 4000+ pixels wide.

      Resize to a reasonable social
      media size while maintaining
      aspect ratio.
    */

    context.resize({
      width: 1600,
      height: null,
    });

    const renderedImage =
      await context.renderAsync();

    console.log(
      "Rendered image:",
      {
        width:
          renderedImage.width,
        height:
          renderedImage.height,
      }
    );

    const savedImage =
      await renderedImage
        .saveAsync({
          format:
            ImageManipulator
              .SaveFormat
              .JPEG,

          compress: 0.9,
        });

    console.log(
      "Converted image URI:",
      savedImage.uri
    );

    /*
      IMPORTANT:
      Fetch the NEW converted JPEG,
      not the original picker URI.
    */

    const response =
      await fetch(
        savedImage.uri
      );

    if (!response.ok) {
      throw new Error(
        "Unable to read the converted image."
      );
    }

    const arrayBuffer =
      await response
        .arrayBuffer();

    console.log(
      "Converted JPEG bytes:",
      arrayBuffer.byteLength
    );

    if (
      arrayBuffer.byteLength <
      100
    ) {
      throw new Error(
        "The converted image file is empty or invalid."
      );
    }

    const timestamp =
      Date.now();

    const random =
      Math.random()
        .toString(36)
        .substring(2, 9);

    const filePath =
      `${userId}/${timestamp}-${random}.jpg`;

    console.log(
      "Uploading image:",
      filePath
    );

    const {
      data: uploadData,
      error: uploadError,
    } =
      await supabase.storage
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
      console.log(
        "Image upload error:",
        uploadError
      );

      throw uploadError;
    }

    console.log(
      "Image upload success:",
      uploadData
    );

    const {
      data: publicUrlData,
    } =
      supabase.storage
        .from("post-media")
        .getPublicUrl(
          filePath
        );

    if (
      !publicUrlData
        .publicUrl
    ) {
      throw new Error(
        "Unable to create image URL."
      );
    }

    console.log(
      "Image public URL:",
      publicUrlData.publicUrl
    );

    return {
      url:
        publicUrlData
          .publicUrl,

      type: "image",
    };
  }

  async function uploadVideo(
    userId: string,
    media: SelectedMedia
  ): Promise<UploadedMedia> {
    console.log(
      "Video URI:",
      media.uri
    );

    const response =
      await fetch(
        media.uri
      );

    if (!response.ok) {
      throw new Error(
        "Unable to read selected video."
      );
    }

    const arrayBuffer =
      await response
        .arrayBuffer();

    console.log(
      "Video bytes:",
      arrayBuffer.byteLength
    );

    if (
      arrayBuffer.byteLength <
      100
    ) {
      throw new Error(
        "The selected video is empty or invalid."
      );
    }

    const extension =
      getVideoExtension(
        media
      );

    const contentType =
      getVideoContentType(
        extension
      );

    const timestamp =
      Date.now();

    const random =
      Math.random()
        .toString(36)
        .substring(2, 9);

    const filePath =
      `${userId}/${timestamp}-${random}.${extension}`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from("post-media")
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType,
            cacheControl:
              "3600",
            upsert: false,
          }
        );

    if (uploadError) {
      console.log(
        "Video upload error:",
        uploadError
      );

      throw uploadError;
    }

    const {
      data: publicUrlData,
    } =
      supabase.storage
        .from("post-media")
        .getPublicUrl(
          filePath
        );

    return {
      url:
        publicUrlData
          .publicUrl,

      type: "video",
    };
  }

  async function uploadMedia(
    userId: string
  ): Promise<
    UploadedMedia | null
  > {
    if (!selectedMedia) {
      return null;
    }

    if (
      selectedMedia.type ===
      "video"
    ) {
      return uploadVideo(
        userId,
        selectedMedia
      );
    }

    return uploadImage(
      userId,
      selectedMedia
    );
  }

  async function handlePost() {
    if (
      !content.trim() &&
      !selectedMedia
    ) {
      return;
    }

    try {
      setPosting(true);

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

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

      let uploadedMedia:
        | UploadedMedia
        | null =
        null;

      if (selectedMedia) {
        uploadedMedia =
          await uploadMedia(
            user.id
          );
      }

      console.log(
        "Creating post:",
        {
          userId:
            user.id,

          media:
            uploadedMedia,

          visibility,
        }
      );

      const {
        data: postData,
        error: postError,
      } =
        await supabase
          .from("posts")
          .insert({
            user_id:
              user.id,

            content:
              content.trim() ||
              null,

            image_url:
              uploadedMedia
                ?.url ||
              null,

            media_type:
              uploadedMedia
                ?.type ||
              null,

            visibility,
          })
          .select()
          .single();

      if (postError) {
        console.log(
          "Post insert error:",
          postError
        );

        throw postError;
      }

      console.log(
        "Post created:",
        postData
      );

      setContent("");
      setSelectedMedia(null);

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

  function removeMedia() {
    setSelectedMedia(
      null
    );
  }

  const canPost =
    content.trim().length >
      0 ||
    selectedMedia !== null;

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
          Platform.OS ===
          "ios"
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
          {/* No Create Post title/header */}

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
              disabled={posting}
            >
              <Ionicons
                name="close"
                size={27}
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
                  numberOfLines={
                    1
                  }
                >
                  {[
                    profile.programme,
                    profile.campus,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " · "
                    )}
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
                style={[
                  styles.visibilityOption,
                  styles.lastVisibilityOption,
                ]}
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
                    connections can
                    see it
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
            onChangeText={(
              text
            ) =>
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

          {selectedMedia && (
            <View
              style={
                styles.mediaPreview
              }
            >
              {selectedMedia.type ===
              "video" ? (
                <View
                  style={
                    styles.videoPreview
                  }
                >
                  <View
                    style={
                      styles.videoIcon
                    }
                  >
                    <Ionicons
                      name="videocam"
                      size={34}
                      color="#fff"
                    />
                  </View>

                  <Text
                    style={
                      styles.videoText
                    }
                  >
                    Video selected
                  </Text>

                  {selectedMedia.fileName && (
                    <Text
                      style={
                        styles.videoFileName
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {
                        selectedMedia.fileName
                      }
                    </Text>
                  )}
                </View>
              ) : (
                <Image
                  source={{
                    uri:
                      selectedMedia.uri,
                  }}
                  style={
                    styles.mediaImage
                  }
                  resizeMode="cover"
                  onError={(
                    event
                  ) => {
                    console.log(
                      "Selected image preview error:",
                      event
                        .nativeEvent
                        .error
                    );
                  }}
                />
              )}

              <Pressable
                style={
                  styles.removeMedia
                }
                onPress={
                  removeMedia
                }
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

            <View
              style={{
                flex: 1,
              }}
            >
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
            onPress={(
              event
            ) =>
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
              Add media
            </Text>

            <Text
              style={
                styles.sheetSubtitle
              }
            >
              Choose where you
              want to add it from.
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
                  Choose a photo
                  or video
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

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#fff",
    },

    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal:
        18,
      paddingTop: 6,
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
      justifyContent:
        "center",
    },

    postButton: {
      minWidth: 70,
      height: 38,
      paddingHorizontal:
        17,
      borderRadius: 20,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
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
      backgroundColor:
        "#eee",
      alignItems: "center",
      justifyContent:
        "center",
    },

    avatarFallback: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
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
      borderColor:
        "#E8E8EC",
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor:
        "#fff",
    },

    visibilityOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderBottomWidth:
        1,
      borderBottomColor:
        "#eee",
    },

    lastVisibilityOption: {
      borderBottomWidth:
        0,
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
      alignSelf:
        "flex-end",
      color: "#aaa",
      fontSize: 11,
    },

    mediaPreview: {
      minHeight: 220,
      marginTop: 16,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor:
        "#F3F3F5",
    },

    mediaImage: {
      width: "100%",
      height: 300,
      backgroundColor:
        "#eee",
    },

    videoPreview: {
      height: 220,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal:
        25,
    },

    videoIcon: {
      width: 65,
      height: 65,
      borderRadius: 33,
      backgroundColor:
        PRIMARY,
      alignItems: "center",
      justifyContent:
        "center",
    },

    videoText: {
      color: "#333",
      fontWeight: "700",
      marginTop: 12,
    },

    videoFileName: {
      color: "#888",
      fontSize: 11,
      marginTop: 5,
      maxWidth: "80%",
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
      justifyContent:
        "center",
    },

    divider: {
      height: 1,
      backgroundColor:
        "#eee",
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
      justifyContent:
        "center",
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
      justifyContent:
        "flex-end",
    },

    modalSheet: {
      backgroundColor:
        "#fff",
      borderTopLeftRadius:
        24,
      borderTopRightRadius:
        24,
      paddingHorizontal:
        22,
      paddingTop: 12,
      paddingBottom: 35,
    },

    sheetHandle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        "#ccc",
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
      justifyContent:
        "center",
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
      justifyContent:
        "center",
      marginTop: 15,
    },

    cancelText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#333",
    },
  });