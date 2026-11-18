import { AuthArt } from "@/components/auth/auth-art";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-[1.1fr_1fr]">
      <AuthArt />
      <div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
        <div className="lg:hidden"><Logo /></div>
        {children}
      </div>
    </main>
  );
}
