import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export class CurrentUserProvider {
  async requireUser(): Promise<AuthenticatedUser> {
    const session = await auth();
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
    const session = await auth();
    return session?.user?.id ?? null;
  }
}

export const currentUserProvider = new CurrentUserProvider();
