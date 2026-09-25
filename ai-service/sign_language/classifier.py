import numpy as np

class SignClassifier:
    def __init__(self, run_cnn_fn=None):
        self.run_cnn_fn = run_cnn_fn
        
    def predict(self, landmarks, image=None):
        """
        Returns (predicted_class, confidence, top3)
        """
        cls, conf, top3 = None, 0.0, []
        
        # Option A (Preferred): ML Model
        if self.run_cnn_fn and image is not None:
            try:
                cls, conf, top3 = self.run_cnn_fn(image)
                if conf >= 0.55:
                    return cls, conf, top3
            except Exception as e:
                pass
                
        # Option B (Fallback): Rule-based classifier
        h_cls, h_conf = self.heuristic(landmarks)
        
        if h_conf > conf:
            cls = h_cls
            conf = h_conf
            top3 = [{"label": cls, "confidence": conf}]
            
        return cls, conf, top3
        
    def heuristic(self, landmarks):
        if not landmarks or len(landmarks) < 21:
            return "nothing", 0.0
            
        pts = np.array([[lm.get("x",0), lm.get("y",0), lm.get("z",0)] for lm in landmarks])
        
        # Calculate Euclidean distances from wrist (0)
        dist_to_wrist = np.linalg.norm(pts - pts[0], axis=1)
        
        # Reference distance (wrist to middle finger base) for scaling
        ref_dist = dist_to_wrist[9] if dist_to_wrist[9] > 0 else 0.1
        
        # Finger tips: 4 (thumb), 8 (index), 12 (middle), 16 (ring), 20 (pinky)
        # Finger bases: 2 (thumb), 5 (index), 9 (middle), 13 (ring), 17 (pinky)
        tips = [8, 12, 16, 20]
        bases = [5, 9, 13, 17]
        
        # Calculate curl: distance from tip to wrist / reference distance
        # Lower value means more curled
        curls = [dist_to_wrist[t] / ref_dist for t in tips]
        
        # Finger is "up" if its tip is far from wrist
        up = [c > 1.2 for c in curls]
        ii, mi, ri, pi = up
        
        # Thumb specific logic
        thumb_tip = pts[4]
        thumb_base = pts[2]
        thumb_ext = np.linalg.norm(thumb_tip - thumb_base) / ref_dist
        thumb_up = pts[4][1] < pts[2][1]
        
        # GESTURE A: Closed fist, thumb out
        # Stricter: All fingers must be tightly curled (curls < 1.0)
        # Thumb must be extended horizontally or tucked against index
        is_fist = all(c < 1.0 for c in curls)
        if is_fist and thumb_ext > 0.4:
            # Check if thumb is not pointing straight up (which would be 'S' or something else)
            return "A", 0.92
            
        # GESTURE B: Flat palm, all fingers up
        if all(up) and thumb_ext > 0.3:
            return "B", 0.90
            
        # GESTURE C: All fingers partially curved
        is_curved = all(0.8 < c < 1.2 for c in curls)
        if is_curved:
            return "C", 0.88
            
        # HELLO/OPEN PALM
        if all(up) and thumb_ext > 0.6:
            return "HELLO", 0.85
            
        # Anti-false-positive for A (Reject if palm is open)
        if any(up):
            return "nothing", 0.1
                
        return "nothing", 0.38
