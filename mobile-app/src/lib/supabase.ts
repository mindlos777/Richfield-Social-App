import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import "react-native-url-polyfill/auto";

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";

export const supabasePublicKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ||
  "";

if (!supabaseUrl) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL");
}

if (!supabasePublicKey) {
  console.error("Missing Supabase public key");
}

/* =========================================================
   SSR-SAFE STORAGE
========================================================= */

const isWebSSR =
  Platform.OS === "web" &&
  typeof window === "undefined";

const WebStorageAdapter = {
  async getItem(key: string) {
    if (typeof window === "undefined") {
      return null;
    }

    return AsyncStorage.getItem(key);
  },

  async setItem(
    key: string,
    value: string
  ) {
    if (typeof window === "undefined") {
      return;
    }

    return AsyncStorage.setItem(
      key,
      value
    );
  },

  async removeItem(key: string) {
    if (typeof window === "undefined") {
      return;
    }

    return AsyncStorage.removeItem(
      key
    );
  },
};

/* =========================================================
   SUPABASE
========================================================= */

export const supabase =
  createClient(
    supabaseUrl,
    supabasePublicKey,
    {
      auth: {
        storage:
          Platform.OS === "web"
            ? WebStorageAdapter
            : AsyncStorage,

        autoRefreshToken:
          !isWebSSR,

        persistSession:
          !isWebSSR,

        detectSessionInUrl:
          false,
      },
    }
  );

/* =========================================================
   NATIVE AUTO REFRESH
========================================================= */

if (Platform.OS !== "web") {
  AppState.addEventListener(
    "change",
    state => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }
  );
}