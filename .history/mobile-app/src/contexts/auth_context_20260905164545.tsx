import { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthContextType = {
  session: Session | null;
  setSession: (session: Session | null) => void;
};