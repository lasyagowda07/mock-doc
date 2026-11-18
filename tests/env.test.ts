import { afterEach, describe, expect, it } from "vitest";
import { getPublicEnv } from "@/lib/env";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("getPublicEnv", () => {
  it("throws a helpful error when vars are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => getPublicEnv()).toThrow(/\.env\.example/);
  });

  it("returns values when valid", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "key";
    expect(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).toBe("https://abc.supabase.co");
  });
});
