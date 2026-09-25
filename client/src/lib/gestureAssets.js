export const gestureAssets = {
  A: {
    video: "/gestures/A.mp4",
    image: "/gestures/A.png",
    instruction: "Make a fist and place thumb on side"
  },
  B: {
    video: "/gestures/B.mp4",
    image: "/gestures/B.png",
    instruction: "Keep fingers straight and together"
  },
  C: {
    video: "/gestures/C.mp4",
    image: "/gestures/C.png",
    instruction: "Curve fingers and thumb into a C shape"
  },
  D: {
    video: "/gestures/D.mp4",
    image: "/gestures/D.png",
    instruction: "Point index finger up, curve other fingers to thumb"
  },
  E: {
    video: "/gestures/E.mp4",
    image: "/gestures/E.png",
    instruction: "Curl all fingers towards palm, tuck thumb under"
  }
};

export const getGestureAsset = (id) => {
  return gestureAssets[id] || {
    video: null,
    image: null,
    instruction: "Gesture animation coming soon"
  };
};
