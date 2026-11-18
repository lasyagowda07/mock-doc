import { AuthForm } from "@/components/auth-form";
import { signup } from "../actions";

export const metadata = { title: "Sign up · Ajaia Docs" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} />;
}
