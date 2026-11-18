import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

export type AuthState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;
