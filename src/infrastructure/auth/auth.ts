import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { authConfig } from "@/infrastructure/auth/auth.config";
import { container } from "@/lib/di/ContainerDI";
import { users, accounts } from "@/infrastructure/db/schema";

function readCredentialAsString(credentials: Partial<Record<string, unknown>>, fieldName: string): string | null {
  const fieldValue = credentials[fieldName];
  return typeof fieldValue === "string" ? fieldValue : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(container.database(), { usersTable: users, accountsTable: accounts }),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = readCredentialAsString(credentials, "email");
        const password = readCredentialAsString(credentials, "password");
        if (email === null || password === null) {
          return null;
        }

        const authenticatedUser = await container.authenticateWithCredentials().invoke(email, password);
        if (authenticatedUser === null) {
          return null;
        }

        return {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          name: authenticatedUser.displayName,
          image: authenticatedUser.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
