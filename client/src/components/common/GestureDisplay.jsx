"use client";

import React, { useRef, useState, useEffect } from 'react';
import { HiOutlineArrowPath, HiOutlineInformationCircle } from 'react-icons/hi2';
import { getGestureAsset } from '@/lib/gestureAssets';

/**
 * GestureDisplay Component
 * 
 * Displays an ASL gesture video or image with instructions.
 * Handles replay, loading errors, and consistent responsive sizing.
 * 
 * @param {Object} props
 * @param {string} props.gestureId - The ID of the gesture (e.g., 'A', 'B')
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.size] - size of the display ('sm', 'md', 'lg', 'full')
 * @param {boolean} [props.showInstructions] - whether to show the instruction text
 * @param {boolean} [props.showReplay] - whether to show the replay button
 */
export default function GestureDisplay({ 
  gestureId, 
  className = "", 
  size = "md",
  showInstructions = true,
  showReplay = true
}) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const asset = getGestureAsset(gestureId);

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-full aspect-square max-w-[300px]",
    lg: "w-full aspect-square max-w-[450px]",
    full: "w-full h-full"
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
      setError(false);
    }
  };

  const handleVideoError = () => {
    setError(true);
  };

  // Implement 3-second pause between loops
  const handleVideoEnded = () => {
    setIsPlaying(false);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }, 3000);
  };

  useEffect(() => {
    // Reset state when gestureId changes
    setError(false);
    setIsPlaying(true);
  }, [gestureId]);

  if (!asset.video && !asset.image) {
    return (
      <div className={`glass-card flex flex-col items-center justify-center p-6 text-center ${sizeClasses[size]} ${className}`}>
        <HiOutlineInformationCircle className="w-12 h-12 text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-secondary)] font-medium">Gesture animation coming soon</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className={`overflow-hidden relative group ${sizeClasses[size]} flex items-center justify-center`}>
        {asset.video && !error ? (
          <video
            ref={videoRef}
            src={asset.video}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          />
        ) : asset.image ? (
          <img 
            src={asset.image} 
            alt={`Sign for ${gestureId}`}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="flex flex-col items-center p-6 text-center">
             <HiOutlineInformationCircle className="w-12 h-12 text-[var(--text-muted)] mb-4" />
             <p className="text-[var(--text-secondary)] font-medium">Gesture animation coming soon</p>
          </div>
        )}

        {/* Replay Overlay */}
        {showReplay && (
          <button 
            onClick={handleReplay}
            className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            title="Watch Again"
          >
            <HiOutlineArrowPath className={`w-5 h-5 ${!isPlaying ? 'animate-spin-slow' : ''}`} />
          </button>
        )}

        {/* Status indicator */}
        {!isPlaying && !error && asset.video && (
           <div className="absolute top-4 right-4 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)] text-white animate-pulse">
             Repeating Soon...
           </div>
        )}
      </div>

      {showInstructions && (
        <div className="glass-sm p-4 border-l-4 border-[var(--primary)]">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Instruction</p>
          <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
            {asset.instruction}
          </p>
        </div>
      )}
    </div>
  );
}
