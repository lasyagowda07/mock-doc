"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { echoValues, loginSchema, signupSchema, type AuthState } from "@/lib/validation/auth";

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values: echoValues(formData) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Invalid email or password", values: echoValues(formData) };
  redirect("/");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values: echoValues(formData) };

  const { email, password, displayName } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: error.message, values: echoValues(formData) };
  if (!data.session) {
    return {
      error: "Account created, but email confirmation is on. Ask the admin to disable it, or confirm via email.",
      values: echoValues(formData),
    };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
