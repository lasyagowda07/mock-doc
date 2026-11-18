import { z } from "zod";

export const MAX_CONTENT_BYTES = 1_000_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty")
  .max(200, "Title must be 200 characters or fewer");

export const docIdSchema = z.uuid("Invalid document id");

export const contentSchema = z
  .looseObject({ type: z.literal("doc") })
  .refine((c) => JSON.stringify(c).length <= MAX_CONTENT_BYTES, "Document is too large");

export const updateDocumentSchema = z
  .object({ title: titleSchema.optional(), content: contentSchema.optional() })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update");

export type ActionResult = { ok: true } | { ok: false; error: string };
