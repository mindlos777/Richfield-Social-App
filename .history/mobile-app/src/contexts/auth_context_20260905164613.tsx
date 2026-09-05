import { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthContextType = {
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  
};