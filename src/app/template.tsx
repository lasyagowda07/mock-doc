"use client";

import { motion } from "framer-motion";

// A template (unlike a layout) remounts on navigation, giving every page a soft entrance.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="flex flex-1 flex-col" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
