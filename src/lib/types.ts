import type { JSONContent } from "@tiptap/react";

export type DocRole = "owner" | "editor" | "viewer";
export type DocSource = "created" | "uploaded";

export type DocListItem = {
  id: string;
  title: string;
  source: DocSource;
  updatedAt: string;
  role: DocRole;
  ownerName: string;
  ownerEmail: string;
  shareCount: number;
};

export type DocDetail = {
  id: string;
  title: string;
  content: JSONContent;
  source: DocSource;
  role: DocRole;
  ownerName: string;
  updatedAt: string;
};
