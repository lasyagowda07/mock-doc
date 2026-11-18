"use client";

import { motion } from "framer-motion";

/** Shared motion presets so the whole app moves with one personality. */
export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
};

/** Subtle press/hover feedback for call-to-action buttons. */
export function Pressable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} whileHover={{ y: -1.5 }} whileTap={{ scale: 0.96, y: 0 }}>
      {children}
    </motion.div>
  );
}
