"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tintFor } from "@/components/user-menu";
import type { AuthState } from "@/lib/validation/auth";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
};

const DEMOS = [
  { name: "Alice Johnson", email: "alice@example.com", hint: "Owner" },
  { name: "Bob Smith", email: "bob@example.com", hint: "Editor" },
  { name: "Carol Lee", email: "carol@example.com", hint: "Viewer" },
];
const DEMO_PASSWORD = "Demo-pass-123";

function Field({ id, label, icon: Icon, error, children }: { id: string; label: string; icon: typeof Mail; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-sm text-destructive">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputClass = "h-11 rounded-xl border-input bg-card pl-10 text-[15px] shadow-soft transition-shadow focus-visible:shadow-lift";

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const shake = useAnimationControls();
  const isSignup = mode === "signup";
  const fe = state?.fieldErrors;

  useEffect(() => {
    if (state?.error || state?.fieldErrors) void shake.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } });
  }, [state, shake]);

  function loginAsDemo(email: string) {
    const f = formRef.current;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("password") as HTMLInputElement).value = DEMO_PASSWORD;
    f.requestSubmit();
  }

  return (
    <motion.div animate={shake} className="w-full max-w-sm">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {isSignup ? <>Create your <span className="italic text-primary">account</span></> : <>Welcome <span className="italic text-primary">back</span></>}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isSignup ? "Sign up to start writing and sharing documents." : "Log in to pick up where you left off."}
        </p>

        <form ref={formRef} action={formAction} className="mt-8 space-y-4" noValidate>
          {isSignup && (
            <Field id="displayName" label="Name" icon={User} error={fe?.displayName?.[0]}>
              <Input id="displayName" name="displayName" autoComplete="name" defaultValue={state?.values?.displayName} placeholder="Your name" required aria-invalid={!!fe?.displayName} className={inputClass} />
            </Field>
          )}
          <Field id="email" label="Email" icon={Mail} error={fe?.email?.[0]}>
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} placeholder="you@company.com" required aria-invalid={!!fe?.email} className={inputClass} />
          </Field>
          <Field id="password" label="Password" icon={Lock} error={fe?.password?.[0]}>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "Use 8 or more characters" : "Your password"}
              required
              aria-invalid={!!fe?.password}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </Field>

          <AnimatePresence initial={false}>
            {state?.error && (
              <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                {state.error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.div whileHover={{ y: -1.5 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" disabled={pending} className="group/cta h-11 w-full rounded-xl text-[15px] font-semibold shadow-lift">
              {pending ? <><Loader2 className="animate-spin" /> Please wait…</> : <>{isSignup ? "Sign up" : "Log in"} <ArrowRight className="transition-transform duration-300 group-hover/cta:translate-x-1" /></>}
            </Button>
          </motion.div>
        </form>

        {!isSignup && (
          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> Try a demo account <span className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {DEMOS.map((d, i) => (
                <motion.button
                  key={d.email}
                  type="button"
                  disabled={pending}
                  onClick={() => loginAsDemo(d.email)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-2 py-3 text-center shadow-soft outline-none transition-shadow hover:shadow-lift focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <span className="sr-only">Log in as</span>
                  <Avatar aria-hidden className="size-9"><AvatarFallback className={`text-[13px] font-semibold ${tintFor(d.name)}`}>{d.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                  <span className="text-[13px] font-semibold leading-none">{d.name.split(" ")[0]}</span>
                  <span className="text-[11px] leading-none text-muted-foreground">{d.hint}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-primary underline-offset-4 hover:underline">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
