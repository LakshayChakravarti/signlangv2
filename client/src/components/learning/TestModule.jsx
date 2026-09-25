"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import WebcamCapture from "../webcam/WebcamCapture";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineArrowRight,
} from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";
import { getLessonGestureInfo, GESTURE_IMAGES } from "@/lib/gestures";
import GestureDisplay from "../common/GestureDisplay";
import useGesturePredictor from "@/hooks/useGesturePredictor";
const { SIGN_MAP } = require("@/lib/signDetection");

// ─── Shared constants ─────────────────────────────────────────────────────────
const TEST_SECONDS   = 7;    // seconds per letter
const PASS_THRESHOLD = 50;   // % accuracy to pass
const WORD_PASS_RATIO = 0.6; // 60% of letters must pass for word test

// ─── Issue 3: 5-frame majority-vote smoothing (module-level, pure fn) ─────────
function getStablePrediction(pred, historyRef) {
  if (pred) {
    historyRef.current.push(pred);
  }
  if (historyRef.current.length > 5) {
    historyRef.current.shift();
  }
  if (historyRef.current.length === 0) return null;

  const count = {};
  historyRef.current.forEach((p) => {
    count[p] = (count[p] || 0) + 1;
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * LetterTest
 * Single-letter timed test. Timer is FULLY decoupled from prediction state.
 */
function LetterTest({ targetLetter, onDone }) {
  const [timeLeft,    setTimeLeft]    = useState(TEST_SECONDS);
  const [score,       setScore]       = useState(0);
  const [detectedText, setDetectedText] = useState("–");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stability,   setStability]   = useState(0);

  // Issue 5: single-finalize guard
  const [isFinalized, setIsFinalized] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const { prediction, evaluateGesture } = useGesturePredictor();

  // Issue 2: lock final prediction
  const finalPredictionRef = useRef(null);

  // Issue 3: smoothing history
  const historyRef = useRef([]);

  // Scoring counters
  const totalRef   = useRef(0);
  const correctRef = useRef(0);

  // Local UI throttle
  const lastCallRef = useRef(0);
  const THROTTLE_MS = 300;

  // ── Issue 5: finalize exactly once ────────────────────────────────────────
  const finalizeTest = useCallback(() => {
    if (isFinalized) return;                    // guard double-call
    setIsFinalized(true);

    const finalSign = (
      finalPredictionRef.current ||
      detectedText ||
      "nothing"
    ).toUpperCase();
    const expected = (targetLetter || "").toUpperCase();

    console.log(
      "TEST FINISHED. Locked Sign:", finalSign,
      "Expected:", expected,
      finalSign === expected ? "→ PASS" : "→ FAIL"
    );

    const finalScore =
      totalRef.current > 0
        ? Math.floor((correctRef.current / totalRef.current) * 100)
        : 0;

    if (onDone) onDone({ score: finalScore, passed: finalScore >= PASS_THRESHOLD });
  }, [isFinalized, detectedText, targetLetter, onDone]);

  // ── Issue 1: timer FULLY decoupled from prediction ─────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // defer slightly so state settles
          setTimeout(finalizeTest, 50);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← no deps: runs once on mount, never resets due to prediction change

  // ── Landmark handler ───────────────────────────────────────────────────────
  const handleLandmarks = async (landmarks) => {
    if (isFinalized) return;
    
    if (!cameraReady) {
      setDetectedText("Camera Off");
      return;
    }

    if (!landmarks) {
      setDetectedText("Show your hand");
      setStability(0);
      return;
    }

    const now = Date.now();
    if (now - lastCallRef.current < THROTTLE_MS) return;
    lastCallRef.current = now;

    try {
      const result = await evaluateGesture(landmarks, targetLetter);
      if (!result) return;

      const { predicted_class: rawPred, confidence: conf } = result;

      // Issue 7: reject open-hand / low-confidence detections
      if (!conf || conf < 0.5) {
        setDetectedText("Unknown");
        setStability((prev) => Math.max(0, prev - 10));
        return;
      }

      // Issue 4: hold-steady message when between 0.5–0.6
      if (conf < 0.6) {
        setDetectedText("Hold steady...");
        setStability((prev) => Math.max(0, prev - 5));
        return;
      }

      // Issue 3: apply smoothing
      const stablePred   = getStablePrediction(rawPred, historyRef);
      const displaySign  = stablePred || rawPred || "–";
      const isMatch      = displaySign.toUpperCase() === (targetLetter || "").toUpperCase();

      // Stability gauge
      if (isMatch && conf >= 0.6) {
        setStability((prev) => Math.min(100, prev + 25));
      } else {
        setStability((prev) => Math.max(0, prev - 15));
      }

      // Issue 2: lock final prediction in last 2 s
      if (timeLeft <= 2 && !finalPredictionRef.current && stablePred && stablePred !== "NOTHING") {
        finalPredictionRef.current = stablePred;
        console.log("PREDICTION LOCKED:", finalPredictionRef.current);
      }

      setDetectedText(SIGN_MAP[displaySign]?.text || displaySign || "–");

      // Rolling accuracy
      totalRef.current += 1;
      if (isMatch && conf >= 0.6) correctRef.current += 1;
      setScore(Math.floor((correctRef.current / totalRef.current) * 100));

    } catch (err) {
      console.warn("Test handleLandmarks failed:", err.message);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--glass-border)] shadow-inner relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative w-14 h-14">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent"
                      strokeDasharray={150.7} strokeDashoffset={150.7 - (150.7 * timeLeft) / TEST_SECONDS}
                      className="text-[var(--primary)] transition-all duration-1000 ease-linear" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-[var(--primary)]">
              {timeLeft}
            </div>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em]">Remaining</span>
            <span className="font-bold text-lg text-[var(--text-primary)]">Target: <span className="text-[var(--primary)] text-2xl ml-1 font-black">{targetLetter}</span></span>
          </div>
        </div>

        <div className="text-right relative z-10">
          <span className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em]">Test Grade</span>
          <div className={`text-3xl font-black tabular-nums ${score >= PASS_THRESHOLD ? "text-[var(--success)]" : "text-[var(--primary)]"}`}>
            {score}<span className="text-sm opacity-50">%</span>
          </div>
        </div>

        {/* Stability underlay */}
        <div className="absolute bottom-0 left-0 h-1 bg-[var(--primary)] transition-all duration-300 opacity-20"
             style={{ width: `${stability}%` }} />
      </div>

      {/* Gesture Guide + Camera side by side */}
      <div className="flex flex-col xl:flex-row gap-8 items-stretch justify-center p-8 bg-black/5 rounded-[2.5rem] border border-white/5 shadow-inner">
        
        {/* Gesture Guide */}
        <div className="flex-1 flex flex-col items-center justify-center glass-card p-8 rounded-[2rem] border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <p className="text-xs font-black text-[var(--primary)] mb-6 uppercase tracking-[0.3em] relative z-10">
            Follow this gesture
          </p>
          <div className="relative z-10 w-full max-w-[240px]">
            <GestureDisplay gestureId={targetLetter} size="md" />
          </div>
          <AnimatePresence>
            {prediction?.predicted_class?.toUpperCase() === targetLetter?.toUpperCase() && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-6 bg-[var(--success)] text-white px-6 py-2 rounded-full font-black text-sm shadow-[0_10px_20px_-5px_var(--success)] z-20 flex items-center gap-2"
              >
                <HiOutlineCheckCircle className="w-4 h-4" />
                CORRECT
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Camera Container */}
        <div className="flex-[1.5] relative min-h-[400px] rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-2xl transition-all duration-500 group"
             style={{ borderColor: stability >= 80 ? "var(--primary)" : "var(--glass-border)" }}>
          
          <WebcamCapture 
            isActive={true} 
            onLandmarks={handleLandmarks} 
            showOverlay={true}
            onCameraReady={setCameraReady}
            onCameraError={setCameraError}
          />

          {/* Overlays on Camera */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Mode indicator */}
            <div className="absolute top-4 right-4">
              <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">
                AI: {prediction?.method?.split('_')[0] || 'active'}
              </div>
            </div>

            {/* Pose integrity gauge */}
            <div className="absolute top-4 left-4 flex bg-black/40 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 items-center gap-3">
              <div className="relative w-8 h-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/10" />
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="transparent"
                          strokeDasharray={87.9} strokeDashoffset={87.9 - (87.9 * stability) / 100}
                          className="text-[var(--primary)] transition-all duration-300" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase text-white/40 tracking-widest">Integrity</span>
                <span className="text-[10px] font-bold text-white uppercase">{stability > 50 ? "Steady" : "Aligning"}</span>
              </div>
            </div>

            {/* Detection feedback text */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full px-8 text-center">
              <div className="text-[11px] font-black text-white drop-shadow-lg opacity-90 py-2 px-4 rounded-full bg-black/40 backdrop-blur-md border border-white/5 inline-block uppercase tracking-wider">
                {detectedText === "Hold steady..." ? "Hold steady..." : 
                 detectedText === "Show your hand" ? "Show your hand" : 
                 `Detected: ${detectedText}`}
              </div>
            </div>

            {/* Result sealed box */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 text-white shadow-2xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black shadow-lg ${finalPredictionRef.current ? "bg-[var(--success)]" : "bg-[var(--primary)]"}`}>
                  {finalPredictionRef.current || (detectedText?.length === 1 ? detectedText : "–")}
                </div>
                <div>
                  <div className="text-[8px] uppercase font-bold tracking-widest opacity-50">
                    {finalPredictionRef.current ? "Locked" : "Live"}
                  </div>
                  <div className={`text-[10px] font-black ${detectedText === targetLetter ? "text-green-400" : "text-white/60"}`}>
                    {finalPredictionRef.current ? "RESULT SEALED" : detectedText === targetLetter ? "MATCH" : "PENDING"}
                  </div>
                </div>
              </div>

              {/* Target Small Overlay */}
              <div className="w-12 h-12 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center border border-[var(--primary)]">
                <span className="text-[7px] font-black text-[var(--text-muted)] uppercase mb-[-1px]">Target</span>
                <span className="text-xl font-black text-[var(--primary)] leading-none">{targetLetter}</span>
              </div>
            </div>
          </div>

          {/* Fallback UI Messages */}
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            {cameraError && (
              <div className="text-red-500 text-center bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-red-500/50 text-xs font-bold mx-8">
                Camera error. Please check permissions.
              </div>
            )}
            {!cameraError && !cameraReady && (
              <div className="flex flex-col items-center gap-3 bg-black/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Initializing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main TestModule ───────────────────────────────────────────────────────────
export default function TestModule({ targetGesture, onComplete }) {
  const gestureInfo = useMemo(() => getLessonGestureInfo(targetGesture), [targetGesture]);

  const [testState,   setTestState]   = useState("intro");
  const [results,     setResults]     = useState(null);
  const [wordStep,    setWordStep]    = useState(0);
  const [wordResults, setWordResults] = useState([]);

  const isLetter = gestureInfo.type === "letter";
  const letters  = gestureInfo.letters;

  // Issue 8: full state reset when starting / retrying
  const handleStartTest = () => {
    setTestState("running");
    setWordStep(0);
    setWordResults([]);
    setResults(null);
  };

  const handleLetterDone = useCallback(
    ({ score, passed }) => {
      if (isLetter) {
        const finalResults = {
          score,
          passed,
          message: passed
            ? `Excellent! You signed "${targetGesture}" correctly.`
            : `Score was ${score}%. Try holding steadier and ensuring good lighting.`,
          suggestions: passed
            ? []
            : ["Move your hand closer to the camera", "Ensure better lighting", "Hold the sign steady for longer"],
        };
        setResults(finalResults);
        setTestState("finished");
      } else {
        const updated = [...wordResults, { score, passed }];
        setWordResults(updated);
        const nextStep = wordStep + 1;

        if (nextStep >= letters.length) {
          const passedCount = updated.filter((r) => r.passed).length;
          const avgScore    = Math.round(updated.reduce((acc, r) => acc + r.score, 0) / updated.length);
          const wordPassed  = passedCount / letters.length >= WORD_PASS_RATIO;

          setResults({
            score: avgScore,
            passed: wordPassed,
            message: wordPassed
              ? `Great job! You fingerspelled "${targetGesture}" (${passedCount}/${letters.length} letters correct).`
              : `You got ${passedCount}/${letters.length} letters. Need ${Math.ceil(letters.length * WORD_PASS_RATIO)} to pass.`,
            suggestions: wordPassed ? [] : ["Practice individual letters that failed", "Take your time between letters"],
          });
          setTestState("finished");
        } else {
          setWordStep(nextStep);
        }
      }
    },
    [isLetter, letters, wordResults, wordStep, targetGesture]
  );

  // ── Intro screen ────────────────────────────────────────────────────────────
  if (testState === "intro") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[500px]">
        <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-6">
          <HiOutlineClock className="w-10 h-10 text-[var(--primary)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Ready for the Test?</h2>
        {isLetter ? (
          <p className="text-[var(--text-secondary)] mb-8 max-w-sm">
            You have <strong>{TEST_SECONDS} seconds</strong> to sign{" "}
            <strong className="text-[var(--primary)]">{targetGesture}</strong>. Reach{" "}
            <strong>{PASS_THRESHOLD}%</strong> accuracy to pass.
          </p>
        ) : (
          <p className="text-[var(--text-secondary)] mb-8 max-w-sm">
            You&apos;ll fingerspell <strong className="text-[var(--primary)]">{targetGesture}</strong> letter by letter:{" "}
            <strong>{letters.join(" → ")}</strong>. Each letter gets{" "}
            <strong>{TEST_SECONDS}s</strong>. Pass <strong>{Math.ceil(letters.length * WORD_PASS_RATIO)}</strong> of{" "}
            <strong>{letters.length}</strong> letters to complete.
          </p>
        )}
        <button onClick={handleStartTest} className="btn btn-primary btn-lg px-12">
          Start Test
        </button>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (testState === "finished" && results) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-8 text-center h-[500px]"
      >
        <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl mb-6 ${results.passed ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`}>
          {results.passed
            ? <HiOutlineCheckCircle className="w-12 h-12 text-white" />
            : <HiOutlineExclamationCircle className="w-12 h-12 text-white" />}
        </div>
        <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">{results.score}% Accuracy</h2>
        <p className={`text-lg font-medium mb-8 ${results.passed ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
          {results.message}
        </p>
        <div className="flex gap-4">
          <button onClick={handleStartTest} className="btn btn-primary px-10">
            Retry Test
          </button>
          <button
            onClick={() => onComplete && onComplete(results.score, results)}
            className="btn btn-accent px-10 text-white"
          >
            Finish &amp; Continue
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Running screen ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col space-y-4">
      {!isLetter && (
        <div className="flex items-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--glass-border)]">
          <span className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mr-2">Progress:</span>
          {letters.map((l, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border
                ${i < wordStep
                  ? wordResults[i]?.passed
                    ? "bg-[var(--success)] text-white border-transparent"
                    : "bg-[var(--danger)] text-white border-transparent"
                  : i === wordStep
                  ? "bg-[var(--primary)] text-white border-transparent scale-110 shadow"
                  : "bg-white text-[var(--text-muted)] border-[var(--glass-border)]"
                }`}
            >
              {wordResults[i]?.passed === true  && i < wordStep ? "✓"
               : wordResults[i]?.passed === false && i < wordStep ? "✗"
               : l}
            </div>
          ))}
          <HiOutlineArrowRight className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
        </div>
      )}

      {/* Key includes wordStep AND testState so it remounts clean on retry */}
      <LetterTest
        key={`${wordStep}-${testState}`}
        targetLetter={letters[wordStep]}
        onDone={handleLetterDone}
      />
    </div>
  );
}
