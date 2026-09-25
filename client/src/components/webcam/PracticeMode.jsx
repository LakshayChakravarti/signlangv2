"use client";

import { useState, useEffect, useRef } from "react";
import WebcamCapture from "./WebcamCapture";
import useGesturePredictor from "@/hooks/useGesturePredictor";
import { HiOutlineCheckCircle, HiOutlineExclamationCircle } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";
import GestureDisplay from "../common/GestureDisplay";
const { SIGN_MAP } = require("@/lib/signDetection");

export default function PracticeMode({ targetGesture, onComplete, courseId, lessonId }) {
  const [isActive, setIsActive] = useState(true);
  const [passed, setPassed] = useState(false);
  const [detectedText, setDetectedText] = useState("");
  const [previousSign, setPreviousSign] = useState(null);
  const [score, setScore] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [feedback, setFeedback] = useState("Show your hand to the camera");
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stability, setStability] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  const { prediction, evaluateGesture, error: predictError } = useGesturePredictor();
  const evaluationCompleteRef = useRef(false);

  // Stability progress logic (UI only)
  useEffect(() => {
    if (prediction && prediction.predicted_class) {
      const target = (targetGesture || "").toUpperCase();
      const current = (prediction.predicted_class || "").toUpperCase();
      
      if (current === target && prediction.confidence > 0.6) {
        setStability(prev => Math.min(100, prev + 20));
      } else {
        setStability(prev => Math.max(0, prev - 15));
      }
    }
  }, [prediction, targetGesture]);

  // Step 7: Local throttling (backup for UI responsiveness)
  const lastCallRef = useRef(0);
  const THROTTLE_MS = 300;

  const handleLandmarks = async (landmarks) => {
    if (!isActive || !targetGesture || passed || evaluationCompleteRef.current) return;

    if (!cameraReady) {
      setDetectedText("Camera Off");
      setFeedback("Camera Off");
      return;
    }

    setLandmarkCount(landmarks ? landmarks.length : 0);

    if (!landmarks) {
      setFeedback("Show your hand");
      setDetectedText("Show your hand");
      setIsWrong(false);
      setIsCorrect(false);
      setStability(0);
      return;
    }

    const now = Date.now();
    if (now - lastCallRef.current < THROTTLE_MS) return;
    lastCallRef.current = now;

    try {
      const result = await evaluateGesture(landmarks, targetGesture);
      
      if (result) {
        const { predicted_class: displaySign, confidence: conf, isStable } = result;
        
        // Update UI Text
        if (displaySign === "unknown" || displaySign === "uncertain") {
          setDetectedText("Hold Gesture Steady");
          setFeedback("Hold Gesture Steady");
        } else if (displaySign && displaySign !== "nothing") {
          setDetectedText(SIGN_MAP[displaySign]?.text || displaySign);
        } else {
          setDetectedText("Detecting...");
        }

        // Logic for triggering success
        if (displaySign && displaySign !== "nothing" && displaySign !== "unknown" && displaySign !== "uncertain") {
          
          const expected = targetGesture.toUpperCase();
          const predicted = displaySign.toUpperCase();

          if (predicted === expected && conf >= 0.6) {
            // Check if stable or if it's been the same for a while
            if (isStable) {
              setIsCorrect(true);
              setIsWrong(false);
              setFeedback(`Detected: ${displaySign} ✅`);
              
              // Prevent multiple completions
              if (!evaluationCompleteRef.current) {
                evaluationCompleteRef.current = true;
                const finalScore = score + 10;
                setScore(finalScore);
                if (finalScore > bestScore) setBestScore(finalScore);
                setCorrectAttempts(prev => prev + 1);
                
                setTimeout(() => {
                  if (onComplete) {
                    onComplete(finalScore, {
                      totalAttempts: totalAttempts + 1,
                      correctAttempts: correctAttempts + 1,
                      type: "practice"
                    });
                  }
                }, 1000);
              }
            } else {
              setFeedback("Hold steady to confirm...");
            }
          } else if (conf >= 0.7 && predicted !== "NOTHING") {
            // Only flag as wrong if confidence is high enough to be sure
            if (predicted !== previousSign) {
              setPreviousSign(predicted);
              setTotalAttempts(prev => prev + 1);
              setIsWrong(true);
              setIsCorrect(false);
              setScore(prev => Math.max(0, prev - 2));
              setFeedback(`Detected: ${displaySign} (Try ${targetGesture}) ❌`);
              
              setTimeout(() => setIsWrong(false), 2000);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Practice handleLandmarks failed:", err.message);
    }
  };


  return (
    <div className="w-full min-h-screen bg-[#070b14] text-slate-300 px-8 py-4 overflow-hidden flex flex-col items-center justify-center">
      
      <div className="max-w-6xl w-full flex flex-col gap-6">
        
        {/* HEADER AREA */}
        <div className="flex items-end justify-between px-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-blue-500/70 font-bold mb-1">
              Currently Practicing
            </p>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Letter {targetGesture}
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-[#111827] px-4 py-2 rounded-xl border border-white/5 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'} animate-pulse`} />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              {cameraReady ? "AI Engine Online" : "System Loading"}
            </span>
          </div>
        </div>

        {/* WORKSPACE GRID */}
        <div className="grid grid-cols-[320px_320px_240px] gap-8 items-start justify-center">
          
          {/* LEFT — GESTURE VIDEO */}
          <div className="flex flex-col gap-3 group">
            <p className="text-[9px] uppercase tracking-widest font-black opacity-40 px-1">Reference Animation</p>
            <div className="h-[360px] w-[320px] flex items-center justify-center">
              <GestureDisplay gestureId={targetGesture} size="md" className="w-full" />
            </div>
          </div>

          {/* CENTER — WEBCAM FEED */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[9px] uppercase tracking-widest font-black opacity-40">My Practice Space</p>
              <AnimatePresence>
                {isCorrect && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
                  >
                    <HiOutlineCheckCircle className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Matched</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-[360px] w-[320px] rounded-2xl bg-[#0f172a] border border-white/5 overflow-hidden shadow-2xl relative">
              <WebcamCapture 
                isActive={isActive} 
                onLandmarks={handleLandmarks} 
                showOverlay={true}
                onCameraReady={setCameraReady}
                onCameraError={setCameraError}
              />
            </div>
          </div>

          {/* RIGHT — COMPACT STATS */}
          <div className="flex flex-col gap-4 pt-7">
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg group hover:border-blue-500/20 transition-all">
              <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-2">Total Points</p>
              <h2 className="text-4xl font-black text-blue-400 tracking-tighter tabular-nums">
                {score}
              </h2>
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg group hover:border-blue-500/20 transition-all">
              <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-2">Precision</p>
              <h2 className="text-4xl font-black text-blue-400 tracking-tighter tabular-nums">
                {totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0}<span className="text-xl opacity-30 ml-1">%</span>
              </h2>
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg group hover:border-blue-500/20 transition-all">
              <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-2">Best Streak</p>
              <h2 className="text-4xl font-black text-blue-400 tracking-tighter tabular-nums">
                {Math.floor(bestScore/10)}
              </h2>
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl px-6 py-4 flex items-center justify-between shadow-xl mt-2">
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isCorrect ? "bg-emerald-500" : isWrong ? "bg-red-500" : "bg-white/5 border border-white/10"}`}>
              {isCorrect ? (
                <HiOutlineCheckCircle className="w-5 h-5 text-white" />
              ) : (
                <HiOutlineExclamationCircle className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-black opacity-30">Status</p>
              <h3 className="text-sm font-bold text-slate-200 tracking-tight leading-none mt-0.5">
                {predictError ? "Connection Lost" : feedback}
              </h3>
            </div>
          </div>

          {(() => {
            const canNavigate = !!courseId && !!lessonId;
            return (
              <button
                disabled={!canNavigate}
                onClick={() => {
                  if (canNavigate) {
                    window.location.href = `/courses/${courseId}/lessons/${lessonId}/test`;
                  } else {
                    console.warn("[PracticeMode] Cannot navigate — missing IDs:", { courseId, lessonId });
                  }
                }}
                className={`
                  px-6 py-2.5
                  rounded-xl
                  active:scale-95
                  transition-all
                  font-black
                  text-[11px]
                  uppercase
                  tracking-[0.2em]
                  text-white
                  shadow-lg shadow-blue-900/20
                  ${canNavigate
                    ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    : "bg-blue-600/40 cursor-not-allowed opacity-50"
                  }
                `}
              >
                Take the Test →
              </button>
            );
          })()}
        </div>

      </div>

    </div>
  );
}
