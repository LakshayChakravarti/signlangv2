"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import WebcamCapture from "@/components/webcam/WebcamCapture";
import useGesturePredictor from "@/hooks/useGesturePredictor";
import { HiOutlineBolt } from "react-icons/hi2";
import GestureDisplay from "@/components/common/GestureDisplay";

const LETTERS = ["A", "B", "C", "D", "L", "V", "W", "Y", "I", "U"];

export default function SpeedGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [targetLetter, setTargetLetter] = useState("A");
  const [gameEnded, setGameEnded] = useState(false);

  const { evaluateGesture } = useGesturePredictor();
  const evaluationCompleteRef = useRef(false); // Debounce success

  // Timer logic
  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameEnded(true);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft]);

  const generateNewLetter = () => {
    let nextLetter = targetLetter;
    while (nextLetter === targetLetter) {
      nextLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }
    setTargetLetter(nextLetter);
    evaluationCompleteRef.current = false;
  };

  const handleStart = () => {
    setScore(0);
    setTimeLeft(60);
    generateNewLetter();
    setGameEnded(false);
    setIsPlaying(true);
  };
  const lastCallRef = useRef(0);
  const THROTTLE_MS = 300;

  const handleLandmarks = async (landmarks) => {
    if (!isPlaying || evaluationCompleteRef.current) return;

    const now = Date.now();
    if (now - lastCallRef.current < THROTTLE_MS) return;
    lastCallRef.current = now;

    try {
      const res = await evaluateGesture(landmarks, targetLetter);
      // Wait for high confidence to pass in a speed challenge
      if (res && res.score > 80) {
        evaluationCompleteRef.current = true;
        setScore(s => s + 10);
        
        // Brief visual success pulse, then new letter
        setTimeout(() => {
          generateNewLetter();
        }, 500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />

      <main className="flex-1 mt-20 max-w-5xl mx-auto w-full px-4 py-8">
        
        <div className="flex justify-between items-center mb-6">
          <Link href="/games" className="inline-flex items-center gap-2 text-sm font-medium hover:underline text-[var(--text-secondary)]">
            <HiOutlineArrowLeft className="w-4 h-4" /> Back to Arcade
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
           
           <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-6 border-t-4" style={{ borderColor: "var(--warning)" }}>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <HiOutlineBolt className="w-6 h-6 text-[var(--warning)]" />
                  Speed Run
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-2 mb-6">
                  Sign the displayed letter into your webcam as fast as you can. You have 60 seconds!
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[var(--bg-secondary)] p-3 rounded-lg text-center border border-[var(--glass-border)]">
                    <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Time Left</p>
                    <p className={`text-2xl font-bold ${timeLeft < 10 ? "text-[var(--error)] animate-pulse" : "text-[var(--text-primary)]"}`}>
                      {timeLeft}s
                    </p>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-3 rounded-lg text-center border border-[var(--glass-border)]">
                    <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Score</p>
                    <p className="text-2xl font-bold text-[var(--success)]">{score}</p>
                  </div>
                </div>

                {!isPlaying && !gameEnded && (
                  <button onClick={handleStart} className="btn w-full btn-primary bg-[var(--warning)] hover:bg-orange-600 border-none">
                    Start Challenge
                  </button>
                )}

                {gameEnded && (
                  <div className="mt-6 text-center animate-fade-in">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Time's Up!</h3>
                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-4">You signed <span className="text-[var(--primary)] font-bold">{score / 10} letters</span> correctly.</p>
                    <button onClick={handleStart} className="btn w-full btn-secondary">Play Again</button>
                  </div>
                )}
              </div>
           </div>

           <div className="lg:col-span-2 relative h-[500px]">
             
              {/* Target Display Overlay */}
              {isPlaying && (
                <div className="absolute top-6 right-6 z-20 w-32 h-auto bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-[var(--warning)] p-2 scale-up-center flex flex-col items-center">
                   <span className="text-[10px] font-bold uppercase text-[var(--warning)] mb-1">Target</span>
                   <GestureDisplay gestureId={targetLetter} size="sm" className="w-full" />
                </div>
              )}

             <WebcamCapture 
               isActive={isPlaying} 
               onLandmarks={handleLandmarks} 
               showOverlay={true}
             />
             
             {/* If not playing and not ended, show idle state over webcam container */}
             {!isPlaying && !gameEnded && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-black/60 backdrop-blur-sm rounded-3xl text-white text-center">
                  <span className="text-6xl mb-4 opacity-50">⏱️</span>
                  <h2 className="text-2xl font-bold">Ready to test your speed?</h2>
                  <p className="opacity-80">Make sure your camera is connected and you have enough space.</p>
                </div>
             )}
           </div>

        </div>

      </main>
    </div>
  );
}
