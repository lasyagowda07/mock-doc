import { describe, expect, it } from "vitest";
import { canDelete, canEdit, canShare } from "@/lib/permissions";
import { contentSchema, titleSchema, updateDocumentSchema } from "@/lib/validation/documents";

describe("permissions", () => {
  it("owner can do everything", () => {
    expect([canEdit("owner"), canShare("owner"), canDelete("owner")]).toEqual([true, true, true]);
  });
  it("editor can edit but not share or delete", () => {
    expect([canEdit("editor"), canShare("editor"), canDelete("editor")]).toEqual([true, false, false]);
  });
  it("viewer is read-only", () => {
    expect([canEdit("viewer"), canShare("viewer"), canDelete("viewer")]).toEqual([false, false, false]);
  });
});

describe("document validation", () => {
  it("trims and rejects empty or oversized titles", () => {
    expect(titleSchema.parse("  Plan  ")).toBe("Plan");
    expect(titleSchema.safeParse("   ").success).toBe(false);
    expect(titleSchema.safeParse("x".repeat(201)).success).toBe(false);
  });
  it("accepts Tiptap docs and rejects other shapes", () => {
    expect(contentSchema.safeParse({ type: "doc", content: [] }).success).toBe(true);
    expect(contentSchema.safeParse({ type: "paragraph" }).success).toBe(false);
    expect(contentSchema.safeParse("<p>html</p>").success).toBe(false);
  });
  it("requires something to update", () => {
    expect(updateDocumentSchema.safeParse({}).success).toBe(false);
    expect(updateDocumentSchema.safeParse({ title: "A" }).success).toBe(true);
  });
});
