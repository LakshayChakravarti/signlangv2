"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GESTURE_IMAGES,
  LETTER_INSTRUCTIONS,
  getLessonGestureInfo,
} from "@/lib/gestures";
import GestureDisplay from "../common/GestureDisplay";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlinePlay,
  HiOutlinePause,
} from "react-icons/hi2";


export default function GestureLearnPanel({ target, instructions, color }) {
  const { type, letters, displayValue } = getLessonGestureInfo(target);

  // For word mode: stepper state
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  // Reset stepper when lesson changes
  useEffect(() => {
    setStep(0);
    setAutoPlay(false);
  }, [target]);

  // Auto-play through letters
  useEffect(() => {
    if (!autoPlay || type !== "word") return;
    if (step >= letters.length - 1) {
      setAutoPlay(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 1400);
    return () => clearTimeout(t);
  }, [autoPlay, step, letters.length, type]);

  const currentLetter = letters[step] ?? letters[0];
  const instruction =
    instructions || LETTER_INSTRUCTIONS[currentLetter] || "Follow the hand shape shown.";

  /* ─── LETTER LESSON ─── */
  if (type === "letter") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center bg-[#0B1120]">
        <div className="mb-10">
          <span className="text-xs font-black uppercase tracking-[0.4em] text-blue-500/60 mb-3 block">
            Target Lesson
          </span>
          <h2 className="text-6xl font-black text-white tracking-tighter">
            {displayValue}
          </h2>
        </div>

        <div className="text-gray-400 uppercase tracking-[0.2em] text-[10px] font-bold mb-4 opacity-70">
          Follow this hand movement
        </div>

        <motion.div
          key={currentLetter}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="mb-10"
        >
          <GestureDisplay gestureId={currentLetter} size="lg" />
        </motion.div>

        {/* Step-by-step guide */}
        <div className="bg-[#18243B] border border-white/10 rounded-[2rem] p-8 max-w-xl text-left shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
          
          <h3 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            How to perform this sign
          </h3>

          <div className="space-y-4 text-sm font-medium text-gray-400">
            <div className="flex gap-4 items-start">
              <span className="bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white/40 border border-white/10 shrink-0">01</span>
              <p>Raise your hand clearly in front of the camera</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white/40 border border-white/10 shrink-0">02</span>
              <p>Follow the exact finger position shown in the animation</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white/40 border border-white/10 shrink-0">03</span>
              <p>Keep your hand steady for 2–3 seconds</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white/40 border border-white/10 shrink-0">04</span>
              <p>Ensure good lighting and keep fingers visible</p>
            </div>
          </div>
          
          {/* Dynamic instruction from props */}
          <div className="mt-8 pt-6 border-t border-white/5 italic text-gray-500 text-sm">
            Note: {instruction}
          </div>
        </div>
      </div>
    );
  }

  /* ─── WORD LESSON ─── */
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center bg-[#0B1120]">
      <div className="mb-8">
        <span className="text-xs font-black uppercase tracking-[0.4em] text-blue-500/60 mb-2 block">
          Fingerspell Word
        </span>
        <h2 className="text-5xl font-black text-white tracking-tighter">
          {displayValue}
        </h2>
      </div>

      {/* Step counter */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        {letters.map((l, i) => (
          <button
            key={i}
            onClick={() => { setStep(i); setAutoPlay(false); }}
            className={`w-11 h-11 rounded-xl text-xs font-black transition-all border-2
              ${i === step
                ? "bg-blue-500 text-white border-blue-500 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                : i < step
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
              }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="text-gray-400 uppercase tracking-[0.2em] text-[10px] font-bold mb-4 opacity-70">
        Follow this hand movement
      </div>

      {/* Main gesture card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="mb-8"
        >
          <GestureDisplay gestureId={currentLetter} size="lg" />
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded">
              Step {step + 1}
            </span>
            <span className="text-lg font-black text-white">{currentLetter}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Playback controls */}
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={() => { setStep((s) => Math.max(0, s - 1)); setAutoPlay(false); }}
          disabled={step === 0}
          className="w-12 h-12 flex items-center justify-center rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-20 transition-all"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setAutoPlay((a) => !a)}
          className="px-8 py-3 rounded-2xl bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-[0_10px_20px_-5px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all"
        >
          {autoPlay ? (
            <><HiOutlinePause className="w-4 h-4" /> Pause</>
          ) : (
            <><HiOutlinePlay className="w-4 h-4" /> Auto-play</>
          )}
        </button>

        <button
          onClick={() => { setStep((s) => Math.min(letters.length - 1, s + 1)); setAutoPlay(false); }}
          disabled={step === letters.length - 1}
          className="w-12 h-12 flex items-center justify-center rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-20 transition-all"
        >
          <HiOutlineArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Instruction Card */}
      <div className="bg-[#18243B] border border-white/10 rounded-[2rem] p-8 max-w-xl text-left shadow-2xl relative overflow-hidden group">
        <h3 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Instructions for "{currentLetter}"
        </h3>
        <div className="space-y-4 text-sm font-medium text-gray-400">
            <div className="flex gap-4 items-start">
              <span className="bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white/40 border border-white/10 shrink-0">01</span>
              <p>Raise your hand clearly in front of the camera</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="bg-white/5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white/40 border border-white/10 shrink-0">02</span>
              <p>Follow the finger position shown for "{currentLetter}"</p>
            </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 italic text-gray-500 text-sm">
          Note: {LETTER_INSTRUCTIONS[currentLetter] || "Follow the hand shape shown."}
        </div>
      </div>
    </div>
  );
}
