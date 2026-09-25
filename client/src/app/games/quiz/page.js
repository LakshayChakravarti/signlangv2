"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";
import GestureDisplay from "@/components/common/GestureDisplay";

const QUIZ_QUESTIONS = [
  {
    question: "When signing 'Hello', the standard motion is:",
    options: ["Waving your hand outward from forehead", "Rubbing your chest", "Pointing at the person with both hands", "Tapping your chin twice"],
    correct: 0
  },
  {
    question: "Which of these ASL letters does NOT require extending fingers upward?",
    options: ["R", "L", "S", "W"],
    correct: 2
  },
  {
    question: "Is American Sign Language (ASL) universal globally?",
    options: ["Yes, deaf people in all countries use it", "No, many countries have their own sign languages (e.g. BSL)"],
    correct: 1
  },
  {
    question: "Which gesture means 'Thank you' in ASL?",
    options: ["Hand starts at chin and moves forward", "Hand waves goodbye", "Make an 'O' shape over heart", "Hands clasp together in prayer"],
    correct: 0
  },
  {
    question: "Identify the ASL sign shown below:",
    gestureId: "A",
    options: ["Letter A", "Letter B", "Letter C", "Letter E"],
    correct: 0
  },
  {
    question: "What does this sign represent?",
    gestureId: "C",
    options: ["Letter O", "Letter C", "Letter G", "Letter D"],
    correct: 1
  }
];

export default function QuizGame() {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const q = QUIZ_QUESTIONS[currentQIndex];

  const handleSelect = (idx) => {
    if (isAnswered) return;
    
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === q.correct) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentQIndex(c => c + 1);
  };

  // Game over state
  if (currentQIndex >= QUIZ_QUESTIONS.length) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
        <Navbar />
        <main className="flex-1 mt-20 max-w-2xl mx-auto w-full px-4 py-20 text-center">
          <div className="glass-card p-12">
            <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-4">Quiz Completed!</h1>
            <p className="text-xl text-[var(--text-secondary)] mb-8">
              You scored <span className="font-bold text-[var(--accent)]">{score}</span> out of {QUIZ_QUESTIONS.length}
            </p>
            
            <div className="flex gap-4 justify-center">
              <button onClick={() => { setCurrentQIndex(0); setScore(0); setIsAnswered(false); setSelectedOption(null); }} className="btn btn-secondary">
                Retry Quiz
              </button>
              <Link href="/games" className="btn btn-primary bg-[var(--accent)]">
                Back to Arcade
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />

      <main className="flex-1 mt-20 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="flex justify-between items-center mb-8">
          <Link href="/games" className="inline-flex items-center gap-2 text-sm font-medium hover:underline text-[var(--text-secondary)]">
            <HiOutlineArrowLeft className="w-4 h-4" /> Exit
          </Link>
          <div className="text-sm font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--glass-border)]">
            Question {currentQIndex + 1} of {QUIZ_QUESTIONS.length}
          </div>
        </div>

        <div className="glass-card p-8 sm:p-12 mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-relaxed mb-8">
            {q.question}
          </h2>

          {q.gestureId && (
            <div className="flex justify-center mb-8">
              <GestureDisplay gestureId={q.gestureId} size="md" />
            </div>
          )}

          <div className="space-y-4">
            {q.options.map((option, idx) => {
              
              let baseStyles = "w-full text-left p-5 rounded-xl border-2 transition-all font-medium text-[var(--text-secondary)] ";
              let activeStyles = "border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:border-gray-400 hover:bg-gray-50";
              
              if (isAnswered) {
                if (idx === q.correct) {
                  // The correct answer (highlight green always after answer)
                  activeStyles = "border-[var(--success)] bg-[rgba(16,185,129,0.1)] text-[var(--success)] shadow-md";
                } else if (idx === selectedOption) {
                  // User chose it, but it was wrong
                  activeStyles = "border-[var(--error)] bg-[rgba(239,68,68,0.1)] text-[var(--error)]";
                } else {
                  // Was not chosen, is not correct
                  activeStyles = "border-[var(--glass-border)] bg-[var(--bg-secondary)] opacity-50";
                }
              } else if (selectedOption === idx) { // Usually unreachable because we set isAnswered immediately, but safe keeping
                activeStyles = "border-[var(--accent)] bg-[rgba(139,92,246,0.1)] text-[var(--accent)]";
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleSelect(idx)}
                  className={`${baseStyles} ${activeStyles} relative flex items-center justify-between`}
                >
                  <span className="pr-8">{option}</span>
                  {isAnswered && idx === q.correct && <HiOutlineCheckCircle className="w-6 h-6 absolute right-5" />}
                  {isAnswered && idx === selectedOption && idx !== q.correct && <HiOutlineXCircle className="w-6 h-6 absolute right-5" />}
                </button>
              );
            })}
          </div>
        </div>

        {isAnswered && (
          <div className="flex justify-end animate-fade-in">
            <button onClick={handleNext} className="btn btn-lg btn-primary bg-[var(--accent)] border-none">
              Next Question &rarr;
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
