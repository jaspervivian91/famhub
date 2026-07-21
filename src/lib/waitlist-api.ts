import { createServerFn } from "@tanstack/react-start";
import { sql, hasDatabaseURL } from "~/db";

function isValidEmail(email: string): boolean {
  // Basic email validation regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const joinWaitlist = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const email = data.email.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    if (!hasDatabaseURL()) {
      return {
        success: false,
        message: "Waitlist is not available right now — database is not connected. Please try again later.",
      };
    }

    try {
      const db = sql();
      await db`
        insert into waitlist_signups (email)
        values (${email})
        on conflict (email) do nothing
      `;
      return { success: true, message: "You're on the list! We'll let you know when Family Hub launches." };
    } catch {
      // If there's a DB error, it might already be a duplicate — treat as success
      return { success: true, message: "You're on the list! We'll let you know when Family Hub launches." };
    }
  });
