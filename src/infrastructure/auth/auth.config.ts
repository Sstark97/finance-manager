import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const LOGIN_PATH = "/login";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: LOGIN_PATH,
  },
  providers: [Google({})],
  callbacks: {
    authorized({ auth, request }) {
      const isAuthenticated = auth?.user != null;
      const isRequestingLoginPage = request.nextUrl.pathname.startsWith(LOGIN_PATH);
      if (isRequestingLoginPage) {
        return true;
      }
      return isAuthenticated;
    },
  },
};
