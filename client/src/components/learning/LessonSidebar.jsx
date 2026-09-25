"use client";

import Link from "next/link";
import { HiOutlineCheckCircle, HiOutlinePlay, HiOutlineLockClosed } from "react-icons/hi2";
import { motion } from "framer-motion";

export default function LessonSidebar({
  course,
  lessons = [],
  currentLessonId,
  userProgress = [],
  isAdmin,
}) {
  // Ensure safe arrays even if parent passes undefined
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeProgress = Array.isArray(userProgress) ? userProgress : [];
  const getLessonStatus = (lessonId, order) => {
    if (isAdmin) return "available";

    // First lesson is always available
    if (order === 1) {
      const prog = safeProgress.find((p) => p.lessonId === lessonId);
      return prog?.completed ? "completed" : "available";
    }

    // Check if previous lesson was completed
    const prevLesson = safeLessons.find((l) => l.order === order - 1);
    const prevProg = prevLesson
      ? safeProgress.find((p) => p.lessonId === prevLesson._id)
      : null;

    if (!prevProg || !prevProg.completed) return "locked";

    const prog = safeProgress.find((p) => p.lessonId === lessonId);
    return prog?.completed ? "completed" : "available";
  };

  return (
    <div className="w-full lg:w-80 flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--glass-border)]">
      {/* Header */}
      <div className="p-6 border-b border-[var(--glass-border)] sticky top-0 bg-[var(--bg-secondary)] z-10 backdrop-blur-xl bg-opacity-80">
        <Link
          href={`/courses/${course._id}`}
          className="text-xs font-bold uppercase tracking-wider hover:underline"
          style={{ color: course.color }}
        >
          {course.level} Level
        </Link>
        <h2 className="text-lg font-bold mt-1 mb-4 leading-tight" style={{ color: "var(--text-primary)" }}>
          {course.title}
        </h2>

        {/* Mini progress bar */}
        <div className="progress-bar bg-white/10 h-1.5">
          <div
            className="progress-bar-fill"
            style={{
          width: `${(safeProgress.filter((p) => p.completed).length / Math.max(safeLessons.length, 1)) * 100}%`,
              background: course.color,
            }}
          />
        </div>
        <p className="text-[10px] mt-2 font-medium" style={{ color: "var(--text-muted)" }}>
          {safeProgress.filter((p) => p.completed).length} / {safeLessons.length} COMPLETED
        </p>
      </div>

      {/* Lesson List */}
      <div className="overflow-y-auto flex-1 p-4 space-y-2">
        {safeLessons.map((lesson) => {
          const status = getLessonStatus(lesson._id, lesson.order);
          const isCurrent = lesson._id === currentLessonId;
          const prog = safeProgress.find((p) => p.lessonId === lesson._id);

          return (
            <Link
              key={lesson._id}
              href={status === "locked" ? "#" : `/courses/${course._id}/lessons/${lesson._id}`}
              className={`flex items-start gap-4 p-3 rounded-xl transition-all ${
                isCurrent
                  ? "bg-white shadow-md border border-[var(--glass-border)]"
                  : status === "locked"
                  ? "opacity-50 cursor-not-allowed grayscale"
                  : "hover:bg-white/50"
              }`}
            >
              <div
                className="mt-0.5 flex-shrink-0"
                style={{
                  color: isCurrent
                    ? course.color
                    : status === "completed"
                    ? "var(--success)"
                    : "var(--text-muted)",
                }}
              >
                {status === "completed" ? (
                  <HiOutlineCheckCircle className="w-5 h-5" />
                ) : status === "locked" ? (
                  <HiOutlineLockClosed className="w-5 h-5" />
                ) : isCurrent ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, type: "tween" }}
                    className="w-5 h-5 flex items-center justify-center bg-current rounded-full"
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </motion.div>
                ) : (
                  <HiOutlinePlay className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm font-semibold leading-tight ${
                    isCurrent ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  {lesson.order}. {lesson.title}
                </div>
                {status === "completed" && prog?.bestScore && (
                  <div className="text-[10px] mt-1 font-bold" style={{ color: "var(--success)" }}>
                    Score: {prog.bestScore}%
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
