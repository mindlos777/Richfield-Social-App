import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";

const PRIMARY = "#0300cf";

type Opportunity = {
  id: string;
  title: string;
  status: string;
  opportunity_type: string;
  created_at: string;
};

export default function AdminOpportunitiesScreen() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("opportunities")
        .select("id,title,status,opportunity_type,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data || []) as Opportunity[]);
    } catch (error: any) {
      Alert.alert("Opportunities", error?.message || "Could not load opportunities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function updateStatus(id: string, status: "approved" | "rejected") {
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status } : item
        )
      );
    } catch (error: any) {
      Alert.alert("Opportunities", error?.message || "Could not update opportunity.");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Opportunities</Text>
        <Text style={styles.subtitle}>Review business listings</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.opportunity_type} · {item.status}
            </Text>

            {item.status === "pending" ? (
              <View style={styles.actions}>
                <Pressable
                  style={styles.reject}
                  onPress={() => updateStatus(item.id, "rejected")}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>

                <Pressable
                  style={styles.approve}
                  onPress={() => updateStatus(item.id, "approved")}
                >
                  <Text style={styles.approveText}>Approve</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F7" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEE",
  },
  title: { fontSize: 25, fontWeight: "800", color: "#111" },
  subtitle: { marginTop: 3, color: "#777", fontSize: 12 },
  list: { padding: 14 },
  card: {
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EC",
  },
  name: { color: "#222", fontSize: 14, fontWeight: "800" },
  meta: { marginTop: 5, color: "#777", fontSize: 11 },
  actions: { flexDirection: "row", gap: 9, marginTop: 14 },
  reject: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDECEC",
  },
  rejectText: { color: "#B42318", fontWeight: "700", fontSize: 12 },
  approve: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  approveText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
