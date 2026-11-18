// Shared by the upload dialog (client) and the server action so the limits can't drift.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB
export const SUPPORTED_EXTENSIONS = ["txt", "md", "markdown", "docx"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(",");
export const SUPPORTED_LABEL = ".txt, .md, .docx";
export const UPLOAD_HELP = `Supported: ${SUPPORTED_LABEL} · up to 4 MB. Text, headings, bold, italic, underline and lists are kept; images and tables are not imported.`;

export function getExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i + 1).toLowerCase();
}

/** Returns an error message, or null when the file looks acceptable. */
export function validateUpload(file: { name: string; size: number }): string | null {
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(getExtension(file.name)))
    return `Unsupported file type. Please upload ${SUPPORTED_LABEL}.`;
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "File is too large (max 4 MB).";
  return null;
}
