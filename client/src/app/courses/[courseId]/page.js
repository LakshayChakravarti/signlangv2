"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/ui/Navbar";
import {
  HiOutlinePlay,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
  HiOutlineArrowLeft,
} from "react-icons/hi2";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params?.courseId;
  
  const router = useRouter();
  const { user } = useAuth();
  const [courseData, setCourseData] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Validate route params
      if (!courseId || courseId === "undefined") {
        setLoading(false);
        return;
      }

      // 2. Add safe ID validation (just check if exists)
      if (!courseId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);

        const [courseRes, progressRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          user ? api.get(`/progress/${courseId}`) : Promise.resolve({ data: { progress: [] } }),
        ]);

        if (courseRes.data && courseRes.data.course) {
          setCourseData(courseRes.data);
          setUserProgress(progressRes.data.progress || []);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Course fetch failed:", err);
        // 5. Improve API error handling
        if (err.response?.status === 404 || err.response?.status === 400) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (notFound || !courseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="glass-card p-12 text-center max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-red-600">Course not found</h2>
          <p className="text-[var(--text-secondary)] mb-8">The course you are looking for might have been moved or deleted.</p>
          <button 
            onClick={() => router.push("/courses")} 
            className="btn btn-primary w-full py-4 rounded-xl font-bold"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const { course, lessons } = courseData;

  const getLessonStatus = (lessonId, order) => {
    if (!user) return order === 1 ? "available" : "locked";
    
    // Admin bypass
    if (user.role === "admin") return "available";

    // First lesson is always available
    if (order === 1) {
      const prog = userProgress.find((p) => p.lessonId === lessonId);
      return prog?.completed ? "completed" : "available";
    }

    // Check if previous lesson was completed
    const prevLesson = lessons.find((l) => l.order === order - 1);
    const prevProg = prevLesson ? userProgress.find((p) => p.lessonId === prevLesson._id) : null;

    if (!prevProg || !prevProg.completed) return "locked";

    const prog = userProgress.find((p) => p.lessonId === lessonId);
    return prog?.completed ? "completed" : "available";
  };

  const completedCount = userProgress.filter((p) => p.completed).length;
  const progressPercent = Math.round((completedCount / (lessons.length || 1)) * 100);

  // Find next lesson to take
  let nextLessonUrl = `/courses/${courseId}/lessons/${lessons[0]?._id}`;
  for (const lesson of lessons) {
    const status = getLessonStatus(lesson._id, lesson.order);
    if (status === "available") {
      nextLessonUrl = `/courses/${courseId}/lessons/${lesson._id}`;
      break;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Navbar />

      <main className="flex-1 mt-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm font-medium mb-8 hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left Col: Details */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-8">
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                style={{
                  background: `${course.color}22`,
                  color: course.color,
                }}
              >
                {course.level} Level
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: "var(--text-primary)" }}>
                {course.title}
              </h1>
              <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
                {course.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {(Array.isArray(course.features) ? course.features : []).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: course.color }} />
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Syllabus */}
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Syllabus</h2>
              <div className="space-y-4">
                {(Array.isArray(lessons) ? lessons : []).map((lesson) => {
                  const status = getLessonStatus(lesson._id, lesson.order);
                  const prog = userProgress.find((p) => p.lessonId === lesson._id);

                  return (
                    <Link
                      key={lesson._id}
                      href={status === "locked" ? "#" : `/courses/${courseId}/lessons/${lesson._id}`}
                      className={`glass-card p-5 flex items-center gap-4 transition-all ${
                        status === "locked"
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:scale-[1.01] hover:shadow-lg"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                        style={{
                          background: status === "completed" ? "var(--success)" : "var(--bg-secondary)",
                          color: status === "completed" ? "white" : "var(--text-primary)",
                        }}
                      >
                        {status === "completed" ? <HiOutlineCheckCircle className="w-6 h-6" /> : lesson.order}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{lesson.title}</h3>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{lesson.description}</p>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        {status === "completed" && prog?.bestScore && (
                          <span className="text-xs font-bold text-[var(--success)]">{prog.bestScore}%</span>
                        )}
                        {status === "locked" ? (
                          <HiOutlineLockClosed className="w-5 h-5 text-[var(--text-muted)]" />
                        ) : (
                          <HiOutlinePlay className="w-6 h-6 text-[var(--primary)]" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Course Action Card */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-28">
              {user ? (
                <>
                  <h3 className="text-lg font-bold mb-2">Your Progress</h3>
                  <div className="flex justify-between text-sm mb-2 text-[var(--text-muted)]">
                    <span>{completedCount} / {lessons.length} completed</span>
                    <span className="font-bold text-[var(--primary)]">{progressPercent}%</span>
                  </div>
                  <div className="progress-bar mb-6">
                    <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <Link href={nextLessonUrl} className="btn w-full btn-primary btn-lg">
                    {completedCount === 0 ? "Start Course" : completedCount === lessons.length ? "Review Course" : "Continue Learning"}
                  </Link>
                </>
              ) : (
                <>
                  <div className="text-3xl font-extrabold mb-2 text-[var(--text-primary)]">
                    {course.price === 0 ? "Free" : `₹${course.price}`}
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mb-6">Gain full access to all {lessons.length} lessons.</p>
                  <Link href="/login" className="btn w-full btn-primary btn-lg">
                    Log in to Start
                  </Link>
                </>
              )}

              <hr className="my-6 border-[var(--glass-border)]" />
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Language</span>
                  <span className="font-medium text-[var(--text-primary)]">American Sign Lang (ASL)</span>
                </div>
                <div className="flex justify-between">
                  <span>Level</span>
                  <span className="font-medium text-[var(--text-primary)] capitalize">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assessments</span>
                  <span className="font-medium text-[var(--text-primary)]">AI Webcam Grading</span>
                </div>
                <div className="flex justify-between">
                  <span>Certificate</span>
                  <span className="font-medium text-[var(--text-primary)]">Included upon passing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
