import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#0300cf";

export default function ApplicantsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Applicants
        </Text>

        <Text style={styles.subtitle}>
          Review candidates for your opportunities
        </Text>
      </View>

      <View style={styles.empty}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="people-outline"
            size={40}
            color={PRIMARY}
          />
        </View>

        <Text style={styles.emptyTitle}>
          No applicants yet
        </Text>

        <Text style={styles.emptyText}>
          Applicants will appear here when
          students or alumni apply to one of your
          opportunities.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7FA",
  },

  header: {
    padding: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    color: "#777",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },

  iconContainer: {
    width: 78,
    height: 78,
    backgroundColor: "#EEEEFF",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    marginTop: 18,
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 8,
    lineHeight: 20,
  },
});