"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GESTURE_IMAGES } from "@/lib/gestures";
import GestureDisplay from "../common/GestureDisplay";

/**
 * GestureAnimation — shows a real ASL reference image for a given letter/word.
 * Falls back to a styled letter badge if the image fails to load.
 */
export default function GestureAnimation({
  letter,
  word,
  isPlaying,
  className = "",
  color = "#2563EB",
  animationUrl = null,
}) {
  const target = word ? word.charAt(0).toUpperCase() : (letter || "A").toUpperCase();
  const imgUrl = animationUrl ? `/animations/${animationUrl}` : GESTURE_IMAGES[target];
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--glass-border)] ${className}`}
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, ${color} 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <motion.div
        animate={
          isPlaying
            ? { scale: [1, 1.04, 1], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } }
            : { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
        }
        className="relative z-10 flex flex-col items-center"
      >
        <div
          className="w-48 h-48 rounded-3xl flex items-center justify-center shadow-xl overflow-hidden"
        >
          <GestureDisplay gestureId={target} size="sm" className="w-full h-full" />
        </div>

        {word && (
          <div
            className="mt-5 px-6 py-2 rounded-full font-bold tracking-widest uppercase text-xl"
            style={{ color: "var(--text-primary)", background: `${color}15`, border: `1px solid ${color}30` }}
          >
            {word}
          </div>
        )}
      </motion.div>

      {/* Status badges */}
      {!isPlaying && (
        <div className="absolute top-4 right-4 badge badge-primary animate-pulse">Paused</div>
      )}
      {isPlaying && (
        <div className="absolute top-4 right-4 badge badge-success flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-current animate-ping" />
          Playing
        </div>
      )}
    </div>
  );
}
