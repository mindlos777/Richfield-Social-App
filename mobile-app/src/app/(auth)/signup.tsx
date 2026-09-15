import React from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#0300cf";

export default function SignupTypeScreen() {
  function chooseStudent() {
    router.push(
      "/(auth)/student-signup"
    );
  }

  function chooseAlumni() {
    router.push(
      "/(auth)/alumni-signup"
    );
  }

  function chooseBusiness() {
    router.push(
      "/(business-auth)/auth/signup"
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={23}
          color="#111"
        />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>
          Join Richfield Social
        </Text>

        <Text style={styles.subtitle}>
          Choose the account that best
          describes you.
        </Text>
      </View>

      <Pressable
        style={styles.roleCard}
        onPress={chooseStudent}
      >
        <View
          style={styles.studentIcon}
        >
          <Ionicons
            name="school"
            size={27}
            color={PRIMARY}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            Student
          </Text>

          <Text
            style={styles.cardDescription}
          >
            I'm currently studying at
            Richfield and want to connect,
            build my portfolio and discover
            opportunities.
          </Text>

          <View style={styles.cardLink}>
            <Text
              style={styles.cardLinkText}
            >
              Create student account
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={PRIMARY}
            />
          </View>
        </View>
      </Pressable>

      <Pressable
        style={styles.roleCard}
        onPress={chooseAlumni}
      >
        <View
          style={styles.alumniIcon}
        >
          <Ionicons
            name="ribbon"
            size={27}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>
              Alumni
            </Text>

            <View
              style={styles.alumniBadge}
            >
              <Text
                style={
                  styles.alumniBadgeText
                }
              >
                GRADUATE
              </Text>
            </View>
          </View>

          <Text
            style={styles.cardDescription}
          >
            I graduated from Richfield and
            want to stay connected, grow my
            professional network and discover
            career opportunities.
          </Text>

          <View style={styles.cardLink}>
            <Text
              style={styles.cardLinkText}
            >
              Create alumni account
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={PRIMARY}
            />
          </View>
        </View>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.line} />

        <Text style={styles.dividerText}>
          ORGANISATIONS
        </Text>

        <View style={styles.line} />
      </View>

      <Pressable
        style={styles.businessCard}
        onPress={chooseBusiness}
      >
        <View
          style={styles.businessIcon}
        >
          <Ionicons
            name="business"
            size={26}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            Business
          </Text>

          <Text
            style={styles.cardDescription}
          >
            I'm representing a company that
            wants to discover Richfield talent
            and publish career opportunities.
          </Text>

          <View style={styles.cardLink}>
            <Text
              style={styles.cardLinkText}
            >
              Business registration
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={PRIMARY}
            />
          </View>
        </View>
      </Pressable>

      <View style={styles.loginSection}>
        <Text style={styles.loginText}>
          Already have an account?
        </Text>

        <Pressable
          onPress={() =>
            router.replace("/login")
          }
        >
          <Text style={styles.loginLink}>
            Sign in
          </Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        Richfield Social
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    paddingHorizontal: 22,
    paddingTop: 45,
    paddingBottom: 40,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  header: {
    marginBottom: 28,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111111",
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
    marginTop: 8,
  },

  roleCard: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 17,
    padding: 17,
    marginBottom: 14,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },

  businessCard: {
    borderWidth: 1,
    borderColor: "#DEDEFF",
    borderRadius: 17,
    padding: 17,
    flexDirection: "row",
    backgroundColor: "#F8F8FF",
  },

  studentIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#EEEEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  alumniIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  businessIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  cardContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },

  alumniBadge: {
    backgroundColor: "#EEEEFF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 8,
  },

  alumniBadgeText: {
    color: PRIMARY,
    fontSize: 9,
    fontWeight: "800",
  },

  cardDescription: {
    color: "#666666",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  cardLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
  },

  cardLinkText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 5,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8E8E8",
  },

  dividerText: {
    marginHorizontal: 12,
    color: "#999999",
    fontSize: 10,
    fontWeight: "700",
  },

  loginSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },

  loginText: {
    color: "#666666",
    fontSize: 14,
  },

  loginLink: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 5,
  },

  footer: {
    textAlign: "center",
    color: "#BBBBBB",
    fontSize: 12,
    marginTop: 35,
  },
});