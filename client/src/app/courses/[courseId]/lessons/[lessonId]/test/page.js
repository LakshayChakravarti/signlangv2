"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import TestModule from "@/components/learning/TestModule";
import { HiOutlineArrowLeft, HiOutlineTrophy } from "react-icons/hi2";
import { motion } from "framer-motion";

import React from "react";

export default function TestPage({ params }) {
  const resolvedParams = React.use(params);
  const { courseId, lessonId } = resolvedParams;

  const router = useRouter();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!courseId || !lessonId) {
      setError("Missing course or lesson ID.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [courseRes, lessonRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/courses/${courseId}/lessons/${lessonId}`),
        ]);

        setCourse(courseRes.data?.course || courseRes.data);
        setLesson(lessonRes.data?.lesson || lessonRes.data);
      } catch (err) {
        console.error("[TestPage] Failed to load:", err.message);
        setError("Could not load the test. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, lessonId]);

  const handleTestComplete = async (score, results) => {
    try {
      if (user && courseId && lessonId) {
        await api.post("/progress/submit", {
          courseId,
          lessonId,
          score,
          feedback: {
            accuracy: score,
            timing: "Good",
            suggestions: results?.suggestions || [],
          },
        }).catch((err) => {
          // Don't crash if progress save fails — just log it
          console.warn("[TestPage] Progress save failed:", err.message);
        });
      }

      setResult({ score, ...results });
    } catch (err) {
      console.warn("[TestPage] handleTestComplete error:", err.message);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="glass-card p-10 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-red-500 mb-3">Test Not Found</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              {error || "The test could not be loaded. The lesson may not exist."}
            </p>
            <button
              onClick={() => router.push("/courses")}
              className="btn btn-primary w-full py-3 rounded-xl font-bold"
            >
              Back to Courses
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Result screen ────────────────────────────────────────────────────────────
  if (result) {
    const passed = result.passed || result.score >= 50;
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <Navbar />
        <main className="flex-1 mt-20 max-w-3xl mx-auto w-full px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center"
          >
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ${
                passed ? "bg-[var(--success)]" : "bg-[var(--danger)]"
              }`}
            >
              <HiOutlineTrophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold mb-2 text-[var(--text-primary)]">
              {passed ? "Test Passed!" : "Not Quite"}
            </h1>
            <p className="text-lg text-[var(--text-secondary)] mb-2">
              Score: <strong className={passed ? "text-[var(--success)]" : "text-[var(--danger)]"}>{result.score}%</strong>
            </p>
            {result.message && (
              <p className="text-sm text-[var(--text-muted)] mb-8">{result.message}</p>
            )}
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => setResult(null)}
                className="btn btn-secondary px-8"
              >
                Retry Test
              </button>
              <Link
                href={`/courses/${courseId}/lessons/${lessonId}`}
                className="btn btn-primary px-8"
              >
                Back to Lesson
              </Link>
              <Link href={`/courses/${courseId}`} className="btn btn-secondary px-8">
                Course Overview
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Test screen ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Navbar />

      <main className="flex-1 mt-20 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/courses/${courseId}/lessons/${lessonId}`}
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline text-[var(--text-secondary)]"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
            Back to Lesson
          </Link>
          <span className="badge badge-primary">AI Test — {lesson.title}</span>
        </div>

        {/* TestModule */}
        <div className="glass-card p-6 rounded-3xl">
          <TestModule
            targetGesture={lesson.content?.value || lesson.title || "A"}
            onComplete={handleTestComplete}
          />
        </div>
      </main>
    </div>
  );
}
