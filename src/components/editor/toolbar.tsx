"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import { Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Redo2, Underline, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ToolButton({ label, shortcut, active, disabled, onClick, children }: {
  label: string; shortcut?: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()} // keep editor selection
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}{shortcut ? ` (${shortcut})` : ""}</TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const mod = typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl+";

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 border-b bg-background px-4 py-1.5">
      <ToolButton label="Undo" shortcut={`${mod}Z`} disabled={!s.canUndo} onClick={() => chain().undo().run()}><Undo2 /></ToolButton>
      <ToolButton label="Redo" shortcut={`${mod}⇧Z`} disabled={!s.canRedo} onClick={() => chain().redo().run()}><Redo2 /></ToolButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolButton label="Bold" shortcut={`${mod}B`} active={s.bold} onClick={() => chain().toggleBold().run()}><Bold /></ToolButton>
      <ToolButton label="Italic" shortcut={`${mod}I`} active={s.italic} onClick={() => chain().toggleItalic().run()}><Italic /></ToolButton>
      <ToolButton label="Underline" shortcut={`${mod}U`} active={s.underline} onClick={() => chain().toggleUnderline().run()}><Underline /></ToolButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolButton label="Heading 1" active={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}><Heading1 /></ToolButton>
      <ToolButton label="Heading 2" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolButton>
      <ToolButton label="Heading 3" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolButton label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}><List /></ToolButton>
      <ToolButton label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered /></ToolButton>
    </div>
  );
}
