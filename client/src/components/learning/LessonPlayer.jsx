"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GestureLearnPanel from "./GestureLearnPanel";
import PracticeMode from "../webcam/PracticeMode";
import TestModule from "./TestModule";
import api from "@/lib/api";
import {
  HiOutlineArrowRight,
  HiOutlineBookOpen,
  HiOutlineVideoCamera,
  HiOutlineBeaker,
} from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";

export default function LessonPlayer({
  course,
  lesson,
  nextLessonId,
  onTestPassed,
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("learn"); // learn, practice, test
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // STEP 4: PREVENT BLANK PAGES
  if (!lesson) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center bg-[var(--bg-primary)]">
        <div className="glass-card p-8 rounded-3xl border-red-100 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lesson Not Found</h1>
          <p className="text-[var(--text-secondary)] mb-6">We couldn't load the lesson data. It might be missing or corrupted.</p>
          <Link href="/dashboard" className="btn btn-primary px-8">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const handleTestComplete = async (score, result) => {
    try {
      setSubmitting(true);
      const courseId = course?._id || course?.id;
      const lessonId = lesson?._id || lesson?.id;

      if (!courseId || !lessonId) {
        console.error("❌ Submission Error: Missing IDs", { course, lesson, courseId, lessonId });
        throw new Error("Missing course or lesson ID for submission.");
      }

      const payload = {
        courseId,
        lessonId,
        score,
        feedback: {
          accuracy: score,
          timing: "Good",
          suggestions: result?.suggestions || [],
        },
      };

      console.log("📤 Submitting Progress Payload (MOCKED):", payload);
      
      // STEP 1: REMOVE RESULT API CALL
      // const res = await api.post("/progress/submit", payload, { timeout: 15000 });
      // console.log("Progress saved", res.data);

      // STEP 2 & 3: PREVENT CRASH & KEEP UI FLOW
      // Simulate successful completion if score is high enough to pass
      const PASS_THRESHOLD = 50; 
      if (score >= PASS_THRESHOLD && onTestPassed) {
        console.log("✅ Offline Pass: Triggering onTestPassed UI flow");
        onTestPassed();
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to process local progress", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden relative">
      {/* Top navbar for lesson */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--glass-border)] bg-white/50 backdrop-blur-xl z-20">
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {lesson.order}. {lesson.title}
        </h1>

        {/* Module Tabs */}
        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-full border border-[var(--glass-border)] shadow-sm">
          <button
            onClick={() => setActiveTab("learn")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
              activeTab === "learn"
                ? "bg-[var(--primary)] text-white shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--primary)]"
            }`}
          >
            <HiOutlineBookOpen className="w-4 h-4" /> Learn
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
              activeTab === "practice"
                ? "bg-[var(--accent)] text-white shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--accent)]"
            }`}
          >
            <HiOutlineVideoCamera className="w-4 h-4" /> Practice
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
              activeTab === "test"
                ? "bg-[var(--danger)] text-white shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--danger)]"
            }`}
          >
            <HiOutlineBeaker className="w-4 h-4" /> Test
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative p-6 flex flex-col overflow-y-auto">
        <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* TAB: LEARN */}
            {activeTab === "learn" && (
              <motion.div
                key="learn"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full h-[600px] glass-card rounded-3xl"
              >
                <GestureLearnPanel
                  target={lesson?.content?.value || lesson?.title || "Sign"}
                  instructions={lesson?.content?.instructions || "Follow the sign shown."}
                  color={course?.color || "#2563EB"}
                />
              </motion.div>
            )}

            {/* TAB: PRACTICE */}
            {activeTab === "practice" && (
              <motion.div
                key="practice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full h-[600px] glass-card rounded-3xl p-6"
              >
                <PracticeMode 
                  targetGesture={lesson?.content?.value || "A"} 
                  onComplete={handleTestComplete}
                  courseId={course?._id || course?.id}
                  lessonId={lesson?._id || lesson?.id}
                />
              </motion.div>
            )}

            {/* TAB: TEST */}
            {activeTab === "test" && (
              <motion.div
                key="test"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full glass-card rounded-3xl p-6 relative"
              >
                {submitting && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 font-bold text-red-600">
                      Saving Result...
                    </p>
                  </div>
                )}
                <TestModule
                  targetGesture={lesson?.content?.value || "A"}
                  onComplete={handleTestComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5 glass-card rounded-2xl max-w-5xl mx-auto w-full">
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            {activeTab === "learn" &&
              "Review the hand shapes and instructions before practicing."}
            {activeTab === "practice" &&
              "Use the webcam to get real-time AI feedback."}
            {activeTab === "test" &&
              "Pass a 5-second assessment to unlock the next module."}
          </div>

          <div className="flex gap-4">
            {activeTab === "learn" && (
              <button
                onClick={() => setActiveTab("practice")}
                className="btn bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                Proceed to Practice
                <HiOutlineArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}

            {/* Practice button removed - handled inside PracticeMode component */}

            {nextLessonId && activeTab === "test" && (
              <button
                onClick={() => {
                  router.push(
                    `/courses/${course?._id}/lessons/${nextLessonId}`,
                  );
                  setActiveTab("learn"); // reset for new lesson
                }}
                className="btn btn-primary btn-lg"
              >
                Next Lesson
                <HiOutlineArrowRight className="w-5 h-5 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
