"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { HiOutlineArrowLeft, HiOutlineArrowPath } from "react-icons/hi2";
import GestureDisplay from "@/components/common/GestureDisplay";

const CARDS_DATA = [
  { id: 1, type: 'letter', content: 'A', pairId: 'pair_A' },
  { id: 2, type: 'sign', content: 'A', pairId: 'pair_A' },
  { id: 3, type: 'letter', content: 'B', pairId: 'pair_B' },
  { id: 4, type: 'sign', content: 'B', pairId: 'pair_B' },
  { id: 5, type: 'letter', content: 'C', pairId: 'pair_C' },
  { id: 6, type: 'sign', content: 'C', pairId: 'pair_C' },
  { id: 7, type: 'letter', content: 'D', pairId: 'pair_D' },
  { id: 8, type: 'sign', content: 'D', pairId: 'pair_D' },
];

export default function MatchingGame() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  const shuffleCards = () => {
    const shuffled = [...CARDS_DATA].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  useEffect(() => {
    shuffleCards();
  }, []);

  const handleFlip = (index) => {
    // Prevent clicking if 2 cards are already flipped, or if clicking already matched/flipped cards
    if (flipped.length >= 2 || flipped.includes(index) || matched.includes(cards[index].pairId)) return;
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      
      if (cards[firstIdx].pairId === cards[secondIdx].pairId) {
        setMatched(prev => [...prev, cards[firstIdx].pairId]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000); // Wait 1 sec before flipping back
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />
      
      <main className="flex-1 mt-20 max-w-4xl mx-auto w-full px-4 py-10">
        
        <div className="flex justify-between items-center mb-8">
          <Link href="/games" className="inline-flex items-center gap-2 text-sm font-medium hover:underline text-[var(--text-secondary)]">
            <HiOutlineArrowLeft className="w-4 h-4" /> Back to Arcade
          </Link>

          <div className="flex gap-4 items-center">
            <div className="glass-sm px-4 py-2 font-bold text-[var(--text-primary)]">
              Moves: {moves}
            </div>
            <button onClick={shuffleCards} className="btn border border-[var(--glass-border)] bg-white ml-2 text-gray-700">
               <HiOutlineArrowPath className="w-4 h-4" /> Restart
            </button>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Memory Match</h1>
          <p className="text-[var(--text-muted)] mt-2">Match the English letter with its ASL sign substitute.</p>
        </div>

        {matched.length === CARDS_DATA.length / 2 && (
          <div className="text-center mb-8 p-6 glass-card bg-[var(--success)]/10 border border-[var(--success)]/20 animate-fade-in">
             <h2 className="text-2xl font-bold text-[var(--success)] mb-2">You Won!</h2>
             <p className="text-sm font-medium text-[var(--text-secondary)]">Completed in {moves} moves.</p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 sm:gap-6 perspective-1000">
          {cards.map((card, idx) => {
            const isFlipped = flipped.includes(idx) || matched.includes(card.pairId);

            return (
              <div 
                key={`${card.id}-${idx}`}
                onClick={() => handleFlip(idx)}
                className={`relative w-full aspect-[3/4] rounded-[2rem] cursor-pointer transition-all duration-500 preserve-3d shadow-2xl ${
                  isFlipped ? "rotate-y-180" : ""
                } ${matched.includes(card.pairId) ? "opacity-40 scale-95" : "hover:scale-105 hover:-translate-y-2"}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                
                {/* Back (Cover) */}
                <div className="absolute inset-0 backface-hidden rounded-[2rem] bg-gradient-to-br from-[#1e293b] to-[#0f172a] flex flex-col items-center justify-center shadow-2xl border border-white/5 box-border p-2">
                  <div className="w-full h-full border border-white/5 rounded-[1.5rem] flex items-center justify-center bg-white/5">
                    <span className="text-4xl font-black opacity-20 text-blue-500 animate-pulse">?</span>
                  </div>
                </div>

                {/* Front (Content) */}
                <div 
                  className="absolute inset-0 backface-hidden rounded-[2rem] bg-[#0f172a] flex flex-col items-center justify-center shadow-2xl border border-white/10 rotate-y-180 overflow-hidden"
                  style={{ 
                    transform: 'rotateY(180deg)', 
                    backfaceVisibility: 'hidden',
                    boxShadow: isFlipped ? "0 0 30px rgba(37, 99, 235, 0.2)" : "none"
                  }}
                >
                  <div className="w-[85%] h-[85%] flex items-center justify-center overflow-hidden">
                    {card.type === 'sign' ? (
                       <GestureDisplay 
                         gestureId={card.content} 
                         size="full" 
                         showInstructions={false} 
                         showReplay={false}
                         className="w-full h-full"
                       />
                    ) : (
                      <span className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        {card.content}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
