import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";

export const metadata = { title: "Log in · Ajaia Docs" };

export default function LoginPage() {
  return <AuthForm mode="login" action={login} />;
}
