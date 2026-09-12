import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { getCurrentProfile } from "./roleService";

export async function routeUserByRole() {
  try {
    const profile = await getCurrentProfile();

    if (!profile) {
      router.replace("/(auth)/login");
      return;
    }

    if (profile.status !== "active") {
      await supabase.auth.signOut();

      router.replace({
        pathname: "/(auth)/login",
        params: {
          error: "inactive",
        },
      });

      return;
    }

    switch (profile.role) {
      case "student":
        router.replace("../app/(student)");
        return;

      case "alumni":
        router.replace("../app/(alumni)");
        return;

      case "business":
        await supabase.auth.signOut();

        router.replace({
          pathname: "/(auth)/login",
          params: {
            error: "business",
          },
        });

        return;

      case "admin":
        await supabase.auth.signOut();

        router.replace({
          pathname: "/(auth)/login",
          params: {
            error: "admin",
          },
        });

        return;

      default:
        await supabase.auth.signOut();

        router.replace({
          pathname: "/(auth)/login",
          params: {
            error: "unknown-role",
          },
        });
    }
  } catch (error) {
    console.log("Role routing error:", error);

    await supabase.auth.signOut();

    router.replace({
      pathname: "/(auth)/login",
      params: {
        error: "profile",
      },
    });
  }
}