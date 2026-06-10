import React, { createContext, useContext } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { AuthSession } from "@workspace/api-client-react/src/generated/api.schemas";

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  operatorId: number | null;
  operatorName: string | null;
  role: string | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  isAdmin: false,
  isModerator: false,
  operatorId: null,
  operatorName: null,
  role: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading, error } = useGetMe({
    query: {
      retry: false,
    }
  });

  const validSession = error ? null : session ?? null;

  return (
    <AuthContext.Provider
      value={{
        session: validSession,
        isLoading,
        isAdmin: validSession?.role === "admin" || validSession?.role === "master",
        isModerator: validSession?.role === "moderator",
        operatorId: validSession?.operatorId ?? null,
        operatorName: validSession?.operatorName ?? null,
        role: validSession?.role ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
