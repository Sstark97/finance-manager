import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

// Deduplicates the underlying session resolution across every call made within the same
// request (e.g. once from the (app) layout and once from each page it wraps), following
// the idiomatic Next.js App Router pattern for per-request memoization.
const resolveSession = cache(auth);

export class CurrentUserProvider {
  async requireUser(): Promise<AuthenticatedUser> {
    const session = await resolveSession();
    const userId = session?.user?.id;
    const email = session?.user?.email;
    if (userId === undefined || email == null) {
      redirect("/login");
    }
    return { id: userId, email };
  }

  async requireUserId(): Promise<string> {
    const user = await this.requireUser();
    return user.id;
  }

  async currentUserId(): Promise<string | null> {
    const session = await resolveSession();
    return session?.user?.id ?? null;
  }
}

export const currentUserProvider = new CurrentUserProvider();
