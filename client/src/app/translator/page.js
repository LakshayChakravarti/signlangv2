"use client";

import { useState } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import GestureSequencePlayer from "@/components/learning/GestureSequencePlayer";
import { translateTextToSignSequence } from "@/lib/TranslatorEngine";
import { HiOutlineLanguage, HiOutlineMicrophone, HiOutlineTrash, HiOutlineSparkles, HiOutlineQuestionMarkCircle } from "react-icons/hi2";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import GestureDisplay from "@/components/common/GestureDisplay";

export default function TranslatorPage() {
  const [inputText, setInputText] = useState("");
  const [sequence, setSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speed, setSpeed] = useState(1500); // ms per gesture

  const { speak } = useAccessibility();

  const handleTranslate = () => {
    if (!inputText.trim()) return;
    const signSequence = translateTextToSignSequence(inputText);
    setSequence(signSequence);
    setIsPlaying(true);
    // Optional: speak the sentence aloud for blind/low-vision users
    speak(inputText);
  };

  const handleClear = () => {
    setInputText("");
    setSequence([]);
    setIsPlaying(false);
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setInputText(transcript);
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto translate upon voice finish
      if (document.getElementById("translate-btn")) {
         // Tiny delay to ensure state update
         setTimeout(() => document.getElementById("translate-btn").click(), 200);
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero">
      <Navbar />

      <main className="flex-1 mt-20 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg mb-6 shadow-indigo-500/30">
            <HiOutlineLanguage className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-[var(--text-primary)]">
            Text to ASL Translator
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Type an English sentence and our AI engine will generate the American Sign Language gesture sequence.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left: Input Sidebar */}
          <div className="lg:col-span-5 space-y-6 flex flex-col h-full">
            
            <div className="glass-card p-6 flex-1 flex flex-col border-[var(--glass-border)] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
              
              <label htmlFor="translator-input" className="block text-sm font-bold text-[var(--text-primary)] mb-3">
                English Input
              </label>
              
              <div className="relative flex-1">
                <textarea
                  id="translator-input"
                  value={inputText}
                  placeholder="E.g., Hello, how are you? My name is..."
                  className="input-field w-full h-full min-h-[150px] p-4 resize-none text-lg font-medium leading-relaxed"
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTranslate();
                    }
                  }}
                />
                
                {/* Embedded Voice Button inside active textarea bounds idea */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button 
                    onClick={toggleVoiceInput}
                    className={`p-3 rounded-full shadow-md transition-all flex items-center justify-center ${
                      isListening 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "bg-white text-[var(--text-secondary)] hover:text-[var(--primary)] border border-gray-200"
                    }`}
                    title="Voice Input"
                  >
                    <HiOutlineMicrophone className={`w-5 h-5 ${isListening ? "animate-bounce" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-4">
                <button 
                  onClick={handleClear}
                  className="btn btn-secondary flex-1 py-3 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <HiOutlineTrash className="w-5 h-5" /> Clear
                </button>
                <button 
                  id="translate-btn"
                  onClick={handleTranslate}
                  disabled={!inputText.trim()}
                  className="btn btn-primary flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30"
                >
                  <HiOutlineSparkles className="w-5 h-5" /> Translate
                </button>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6 border-[var(--glass-border)] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[var(--text-primary)] text-sm mb-1">Animation Speed</h4>
                <p className="text-xs text-[var(--text-muted)]">Adjust sequence playback rate</p>
              </div>
              <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--glass-border)]">
                <button 
                  onClick={() => setSpeed(2500)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${speed === 2500 ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
                >
                  0.5x
                </button>
                <button 
                  onClick={() => setSpeed(1500)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${speed === 1500 ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
                >
                  1x
                </button>
                <button 
                  onClick={() => setSpeed(750)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${speed === 750 ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
                >
                  2x
                </button>
              </div>
            </div>

            {/* How to Perform Section */}
            {sequence.length > 0 && (
              <div className="glass-card p-6 border-l-4 border-indigo-500 animate-fade-in">
                <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                  <HiOutlineQuestionMarkCircle className="w-5 h-5 text-indigo-500" />
                  How to Perform
                </h4>
                <GestureDisplay 
                  gestureId={sequence[0].word.charAt(0).toUpperCase()} 
                  size="md" 
                />
              </div>
            )}

          </div>

          {/* Right: Output Player Area */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3 pl-2">Sign Language Output</h2>
            <div className="flex-1 min-h-[500px]">
              <GestureSequencePlayer
                sequence={sequence}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                speed={speed}
              />
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
