import { z } from "zod";

export const shareRoleSchema = z.enum(["editor", "viewer"], { error: "Choose Editor or Viewer" });

export const shareInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: shareRoleSchema,
});

export type ShareRole = z.infer<typeof shareRoleSchema>;
export type Collaborator = { userId: string; email: string; name: string; role: ShareRole };
