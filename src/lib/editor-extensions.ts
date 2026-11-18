import StarterKit from "@tiptap/starter-kit";

// Single source of truth for the document schema: used by the editor AND by file import,
// so anything imported is guaranteed to be representable (and unknown tags are dropped).
export const editorExtensions = [StarterKit.configure({ heading: { levels: [1, 2, 3] } })];
