"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";

/** Glassy sticky bar that gains a soft shadow once you scroll. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 6));

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 print:hidden ${
        scrolled ? "border-border bg-background/85 shadow-soft" : "border-transparent bg-background/55"
      }`}
    >
      {children}
    </motion.header>
  );
}
