"use client";

import { MotionConfig } from "framer-motion";

// reducedMotion="user": people who prefer reduced motion get no transform animations anywhere.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      {children}
    </MotionConfig>
  );
}
