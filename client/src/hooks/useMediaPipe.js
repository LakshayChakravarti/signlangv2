import { useEffect, useRef, useState, useCallback } from "react";

// Module-level lock to prevent concurrent initialization across components
let isMediaPipeInitializing = false;

/**
 * Hook to initialize and manage MediaPipe Hands with a native camera feed.
 * @param {HTMLVideoElement} videoRef - Ref to the video element
 * @param {boolean} isRunning - whether tracking should actively process frames
 * @param {Function} onLandmarks - callback for real-time landmark updates (prevents re-render loops)
 */
export default function useMediaPipe(videoRef, isRunning = true, onLandmarks = null) {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // Landmarks are now stored in a Ref to avoid high-frequency re-renders
  const landmarksRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const isComponentMounted = useRef(true);
  const lastUpdateRef = useRef(0);
  const onResultsRef = useRef(null);

  // Callback passed to MediaPipe to handle results
  const onResults = useCallback((results) => {
    if (!isRunning || !isComponentMounted.current) return;

    // STEP 1: THROTTLE UPDATES (Only update every 100ms for heavy processing)
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;

    let newLandmarks = null;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lms = results.multiHandLandmarks[0];
      if (lms.length >= 21) {
        newLandmarks = lms.slice(0, 21);
      }
    }

    // STEP 2: UPDATE REF (NO STATE UPDATE = NO RENDER LOOP)
    landmarksRef.current = newLandmarks;
    
    // STEP 3: DIRECT EMISSION
    if (onLandmarks) {
        onLandmarks(newLandmarks);
    }
    
    lastUpdateRef.current = now;
  }, [isRunning, onLandmarks]);

  // Maintain a ref to the latest onResults to avoid re-initializing MediaPipe
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    isComponentMounted.current = true;
    if (!videoRef || !videoRef.current) return;

    const initMediaPipe = async (retries = 0) => {
      // 1. Wait for any previous instance to finish cleaning up
      if (isMediaPipeInitializing) {
        setTimeout(() => initMediaPipe(retries), 500);
        return;
      }

      try {
        isMediaPipeInitializing = true;
        
        // --- 1. Initialize MediaPipe Hands via Global Object (Turbopack Bypass) ---
        const handsCtor = window.Hands || window.mpHands?.Hands;
        
        if (!handsCtor) {
          if (retries < 15) { // Wait up to 7.5 seconds for the static script to load
            console.log(`[useMediaPipe] Waiting for local static script /mediapipe/hands.js... (${retries + 1}/15)`);
            isMediaPipeInitializing = false; // Release lock for retry
            setTimeout(() => initMediaPipe(retries + 1), 500);
            return;
          }
          throw new Error("Local static script '/mediapipe/hands.js' failed to load or attach to window.");
        }
        
        console.log("[useMediaPipe] Starting Native WebCam & MediaPipe Initialization...");

        const hands = new handsCtor({
          locateFile: (file) => `/mediapipe/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((res) => {
          if (onResultsRef.current) onResultsRef.current(res);
        });
        await hands.initialize(); // Ensure Wasm is ready
        handsRef.current = hands;

        // --- 2. Initialize Native WebCam Stream ---
        async function startCamera() {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user" 
              },
              audio: false
            });

            if (videoRef.current) {
              streamRef.current = stream;
              videoRef.current.srcObject = stream;
              
              videoRef.current.onloadeddata = () => {
                setCameraReady(true);
              };

              await videoRef.current.play();
            }
          } catch (err) {
            console.error("Camera error:", err);
            setCameraError("Camera access denied or not available");
            throw err;
          }
        }

        await startCamera();

        // --- 3. Start Processing Loop ---
        const processFrame = async () => {
          if (!isRunning || !isComponentMounted.current || !handsRef.current || !videoRef.current) return;
          
          // STEP 2 — HANDLE VIDEO NOT READY
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animationFrameIdRef.current = requestAnimationFrame(processFrame);
            return;
          }

          try {
            // Send the current video frame to MediaPipe
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            // Ignore safe transient read errors on rapid unmounts
          }
          
          // Loop
          animationFrameIdRef.current = requestAnimationFrame(processFrame);
        };
        
        // Start the recursively calling loop
        processFrame();
        
        console.log("[useMediaPipe] Native Camera & Hands ready.");
      } catch (err) {
        console.error("[useMediaPipe] Setup Error:", err);
        if (isComponentMounted.current) {
          setCameraError(err.message || "Failed to access Native Camera or load models.");
        }
      } finally {
        isMediaPipeInitializing = false;
      }
    };

    if (isRunning) {
      initMediaPipe();
    }

    return () => {
      isComponentMounted.current = false;
      console.log("[useMediaPipe] Cleaning up Native Camera & MediaPipe resources...");
      
      // Stop Animation Loop
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      
      // Stop WebCam Stream Tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      // Clear Video Src
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Deallocate MediaPipe Memory
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      
      setCameraReady(false);
    };
  }, [videoRef, isRunning]); 

  return { cameraReady, landmarks: landmarksRef.current, cameraError };
}
