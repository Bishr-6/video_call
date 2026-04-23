// ============================================
// Sign Language Classifier - Arabic Sign Language
// Recognizes letters, words, and common phrases
// All processing is LOCAL (Edge Computing)
// ============================================

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface ClassificationResult {
  gesture: string;
  arabic: string;
  confidence: number;
  category: 'letter' | 'word' | 'phrase' | 'number';
}

// Finger tip and base indices in MediaPipe hand landmarks
const THUMB_TIP = 4, THUMB_IP = 3, THUMB_MCP = 2, THUMB_CMC = 1;
const INDEX_TIP = 8, INDEX_DIP = 7, INDEX_PIP = 6, INDEX_MCP = 5;
const MIDDLE_TIP = 12, MIDDLE_DIP = 11, MIDDLE_PIP = 10, MIDDLE_MCP = 9;
const RING_TIP = 16, RING_DIP = 15, RING_PIP = 14, RING_MCP = 13;
const PINKY_TIP = 20, PINKY_DIP = 19, PINKY_PIP = 18, PINKY_MCP = 17;
const WRIST = 0;

function dist(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function isFingerExtended(landmarks: HandLandmark[], tip: number, pip: number, mcp: number): boolean {
  const tipToWrist = dist(landmarks[tip], landmarks[WRIST]);
  const pipToWrist = dist(landmarks[pip], landmarks[WRIST]);
  return tipToWrist > pipToWrist * 1.05;
}

function isThumbExtended(landmarks: HandLandmark[]): boolean {
  const thumbTipToIndex = dist(landmarks[THUMB_TIP], landmarks[INDEX_MCP]);
  const thumbMcpToIndex = dist(landmarks[THUMB_MCP], landmarks[INDEX_MCP]);
  return thumbTipToIndex > thumbMcpToIndex * 0.9;
}

function getFingerStates(landmarks: HandLandmark[]) {
  return {
    thumb: isThumbExtended(landmarks),
    index: isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP),
    middle: isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP),
    ring: isFingerExtended(landmarks, RING_TIP, RING_PIP, RING_MCP),
    pinky: isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP, PINKY_MCP),
  };
}

function countExtended(s: ReturnType<typeof getFingerStates>): number {
  return [s.thumb, s.index, s.middle, s.ring, s.pinky].filter(Boolean).length;
}

function fingersTouching(landmarks: HandLandmark[], a: number, b: number, threshold = 0.06): boolean {
  return dist(landmarks[a], landmarks[b]) < threshold;
}

// ============================================
// Arabic Sign Language Gesture Database
// ============================================
interface GestureDef {
  name: string;
  arabic: string;
  category: 'letter' | 'word' | 'phrase' | 'number';
  match: (lm: HandLandmark[], fs: ReturnType<typeof getFingerStates>) => number;
}

export const GESTURES: GestureDef[] = [
  // === ARABIC LETTERS ===
  { name: 'Alef', arabic: 'أ', category: 'letter', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky && !fs.thumb) return 0.9;
    return 0;
  }},
  { name: 'Ba', arabic: 'ب', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && fs.pinky && !fs.thumb) return 0.85;
    return 0;
  }},
  { name: 'Ta', arabic: 'ت', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && !fs.thumb) return 0.85;
    return 0;
  }},
  { name: 'Tha', arabic: 'ث', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && !fs.pinky && !fs.thumb) return 0.85;
    return 0;
  }},
  { name: 'Jeem', arabic: 'ج', category: 'letter', match: (lm, fs) => {
    if (fs.pinky && !fs.index && !fs.middle && !fs.ring && !fs.thumb) return 0.85;
    return 0;
  }},
  { name: 'Ha', arabic: 'ح', category: 'letter', match: (lm, fs) => {
    if (!fs.index && !fs.middle && !fs.ring && !fs.pinky && fs.thumb) return 0.8;
    return 0;
  }},
  { name: 'Kha', arabic: 'خ', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.pinky && !fs.middle && !fs.ring && !fs.thumb) return 0.85;
    return 0;
  }},
  { name: 'Dal', arabic: 'د', category: 'letter', match: (lm, fs) => {
    // Dal: Index and Thumb curved toward each other (C shape)
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      const d = dist(lm[THUMB_TIP], lm[INDEX_TIP]);
      if (d < 0.1 && lm[INDEX_TIP].y < lm[INDEX_MCP].y) return 0.85;
    }
    return 0;
  }},
  { name: 'Thal', arabic: 'ذ', category: 'letter', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky && fs.thumb) {
      const d = dist(lm[THUMB_TIP], lm[INDEX_TIP]);
      if (d > 0.08) return 0.8;
    }
    return 0;
  }},
  { name: 'Ra', arabic: 'ر', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && fs.thumb) return 0.75;
    return 0;
  }},
  { name: 'Zay', arabic: 'ز', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && !fs.pinky && fs.thumb) return 0.75;
    return 0;
  }},
  { name: 'Seen', arabic: 'س', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && fs.pinky && fs.thumb) return 0.7;
    return 0;
  }},
  { name: 'Sheen', arabic: 'ش', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && !fs.pinky && fs.thumb) {
      const spread = dist(lm[INDEX_TIP], lm[RING_TIP]);
      if (spread > 0.12) return 0.8;
    }
    return 0;
  }},
  { name: 'Sad', arabic: 'ص', category: 'letter', match: (lm, fs) => {
    if (!fs.index && !fs.middle && !fs.ring && !fs.pinky && !fs.thumb) {
      const fist = dist(lm[INDEX_TIP], lm[WRIST]);
      if (fist < 0.15) return 0.8;
    }
    return 0;
  }},
  { name: 'Dad', arabic: 'ض', category: 'letter', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      const thumbUp = lm[THUMB_TIP].y < lm[THUMB_MCP].y;
      if (thumbUp) return 0.8;
    }
    return 0;
  }},
  { name: 'Taa', arabic: 'ط', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.thumb && !fs.middle && !fs.ring && !fs.pinky) {
      if (fingersTouching(lm, THUMB_TIP, INDEX_DIP, 0.06)) return 0.8;
    }
    return 0;
  }},
  { name: 'Thaa', arabic: 'ظ', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.thumb && !fs.middle && !fs.ring && !fs.pinky) {
      if (fingersTouching(lm, THUMB_TIP, INDEX_PIP, 0.06)) return 0.8;
    }
    return 0;
  }},
  { name: 'Ain', arabic: 'ع', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && fs.pinky && !fs.thumb) {
      const cupped = dist(lm[INDEX_TIP], lm[PINKY_TIP]) < 0.1;
      if (cupped) return 0.8;
    }
    return 0;
  }},
  { name: 'Ghain', arabic: 'غ', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && fs.thumb) {
      if (fingersTouching(lm, INDEX_TIP, MIDDLE_TIP, 0.04)) return 0.8;
    }
    return 0;
  }},
  { name: 'Fa', arabic: 'ف', category: 'letter', match: (lm, fs) => {
    // Fa: Index and Thumb tips touching (forming a hole)
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      if (fingersTouching(lm, THUMB_TIP, INDEX_TIP, 0.04)) return 0.9;
    }
    return 0;
  }},
  { name: 'Qaf', arabic: 'ق', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && !fs.thumb) {
      if (fingersTouching(lm, INDEX_TIP, MIDDLE_TIP, 0.04)) return 0.8;
    }
    return 0;
  }},
  { name: 'Kaf', arabic: 'ك', category: 'letter', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && fs.thumb) {
      const spread = dist(lm[INDEX_TIP], lm[MIDDLE_TIP]);
      if (spread > 0.06) return 0.8;
    }
    return 0;
  }},
  { name: 'Lam', arabic: 'ل', category: 'letter', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      const angle = dist(lm[THUMB_TIP], lm[INDEX_TIP]);
      if (angle > 0.1) return 0.8;
    }
    return 0;
  }},
  { name: 'Meem', arabic: 'م', category: 'letter', match: (lm, fs) => {
    if (!fs.index && !fs.middle && !fs.ring && !fs.pinky && !fs.thumb) {
      if (fingersTouching(lm, THUMB_TIP, INDEX_TIP, 0.05)) return 0.75;
    }
    return 0;
  }},
  { name: 'Noon', arabic: 'ن', category: 'letter', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky && fs.thumb) {
      if (fingersTouching(lm, THUMB_TIP, MIDDLE_TIP, 0.06)) return 0.8;
    }
    return 0;
  }},
  { name: 'Ha2', arabic: 'ه', category: 'letter', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      const curl = lm[INDEX_TIP].y > lm[INDEX_PIP].y;
      if (curl) return 0.75;
    }
    return 0;
  }},
  { name: 'Waw', arabic: 'و', category: 'letter', match: (lm, fs) => {
    if (fs.thumb && fs.pinky && !fs.index && !fs.middle && !fs.ring) return 0.85;
    return 0;
  }},
  { name: 'Ya', arabic: 'ي', category: 'letter', match: (lm, fs) => {
    if (fs.pinky && fs.thumb && !fs.index && !fs.middle && !fs.ring) {
      const spread = dist(lm[THUMB_TIP], lm[PINKY_TIP]);
      if (spread > 0.15) return 0.85;
    }
    return 0;
  }},

  // === NUMBERS ===
  { name: 'Zero', arabic: '٠', category: 'number', match: (_lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'One', arabic: '١', category: 'number', match: (_lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky && !fs.thumb) return 0.7;
    return 0;
  }},
  { name: 'Two', arabic: '٢', category: 'number', match: (_lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && !fs.thumb) return 0.7;
    return 0;
  }},
  { name: 'Three', arabic: '٣', category: 'number', match: (_lm, fs) => {
    if (fs.index && fs.middle && fs.ring && !fs.pinky && !fs.thumb) return 0.7;
    return 0;
  }},
  { name: 'Four', arabic: '٤', category: 'number', match: (_lm, fs) => {
    if (fs.index && fs.middle && fs.ring && fs.pinky && !fs.thumb) return 0.7;
    return 0;
  }},
  { name: 'Five', arabic: '٥', category: 'number', match: (_lm, fs) => {
    if (fs.index && fs.middle && fs.ring && fs.pinky && fs.thumb) return 0.65;
    return 0;
  }},

  // === COMMON WORDS & PHRASES ===
  { name: 'Hello', arabic: 'مرحبا', category: 'word', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && fs.pinky && fs.thumb) {
      const palmForward = lm[MIDDLE_MCP].z < lm[WRIST].z;
      if (palmForward) return 0.8;
    }
    return 0;
  }},
  // --- قاموس الأفعال الإماراتي (🇦🇪) ---
  { name: 'Sleep', arabic: 'ينام', category: 'action', match: (lm, fs) => {
    // كف بجانب الرأس (تبسيط)
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Eat', arabic: 'يأكل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Drink', arabic: 'يشرب', category: 'action', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Read', arabic: 'يقرأ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Write', arabic: 'يكتب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Love', arabic: 'يحب', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Pray', arabic: 'يصلي', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Help', arabic: 'يساعد', category: 'action', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Open', arabic: 'يفتح', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Close', arabic: 'يغلق', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Walk', arabic: 'يمشي', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Run', arabic: 'يجري', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Think', arabic: 'يفكر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Hear', arabic: 'يسمع', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'See', arabic: 'ينظر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Talk', arabic: 'يتحدث', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Work', arabic: 'يعمل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Win', arabic: 'يفوز', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Lose', arabic: 'يخسر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Buy', arabic: 'يشتري', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Sell', arabic: 'يبيع', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Draw', arabic: 'يرسم', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Play', arabic: 'يلعب', category: 'action', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Stop', arabic: 'يتوقف', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Call', arabic: 'ينادي', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Travel', arabic: 'يسافر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Laugh', arabic: 'يضحك', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Cry', arabic: 'يبكي', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Wash', arabic: 'يغسل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Cook', arabic: 'يطبخ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Smell', arabic: 'يشم', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Taste', arabic: 'يتذوق', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Angry', arabic: 'يغضب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Warn', arabic: 'يحذر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Steal', arabic: 'يسرق', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Swim', arabic: 'يسبح', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Visit', arabic: 'يزور', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Wake Up', arabic: 'يستيقظ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Dance', arabic: 'يرقص', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Forgive', arabic: 'يسامح', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Give', arabic: 'يعطي', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Enter', arabic: 'يدخل', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Exit', arabic: 'يخرج', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Fly', arabic: 'يطير', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Drive', arabic: 'يقود', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Ask', arabic: 'يطلب', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Open Window', arabic: 'يفتح', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Sit', arabic: 'يجلس', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Stand', arabic: 'يقف', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Wait', arabic: 'ينتظر', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Start', arabic: 'يبدأ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'End', arabic: 'ينتهي', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Help Others', arabic: 'يساعد', category: 'action', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Fight', arabic: 'يحارب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Search', arabic: 'يبحث', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Find', arabic: 'يجد', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Forget', arabic: 'ينسى', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Remember', arabic: 'يتذكر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Believe', arabic: 'يؤمن', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Doubt', arabic: 'يشك', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Hope', arabic: 'يتمنى', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Dream', arabic: 'يحلم', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Succeed', arabic: 'ينجح', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Fail', arabic: 'يفشل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Change', arabic: 'يغير', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Build', arabic: 'يبني', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Destroy', arabic: 'يدمر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Hide', arabic: 'يختبئ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Show', arabic: 'يظهر', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Promise', arabic: 'يعد', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Trust', arabic: 'يثق', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Respect', arabic: 'يحترم', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Ignore', arabic: 'يتجاهل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Accept', arabic: 'يقبل', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Refuse', arabic: 'يرفض', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Choose', arabic: 'يختار', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Decide', arabic: 'يقرر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Plan', arabic: 'يخطط', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Organize', arabic: 'يرتب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Lead', arabic: 'يقود', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Follow', arabic: 'يتبع', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Wait For', arabic: 'ينتظر', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Arrive', arabic: 'يصل', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Leave', arabic: 'يغادر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Wudu', arabic: 'يتوضأ', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Pray', arabic: 'يصلي', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Plant', arabic: 'يزرع', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Water', arabic: 'يسقي', category: 'action', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Sweep', arabic: 'يمسح', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Tayamum', arabic: 'يتيمم', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Stay Up', arabic: 'يسهر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Silence', arabic: 'يسكت', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Sign', arabic: 'يوقع', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Angry', arabic: 'يغضب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Worry', arabic: 'يتضايق', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Smoke', arabic: 'يدخن', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Barbecue', arabic: 'يشوي', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Lift', arabic: 'يرفع', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Cheat', arabic: 'يخدع', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Delay', arabic: 'يؤجل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Demolish', arabic: 'يهدم', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Copy', arabic: 'ينسخ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Dig', arabic: 'يحفر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Despise', arabic: 'يحتقر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Vomit', arabic: 'يستفرغ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Dive', arabic: 'يغوص', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Refuse Obedience', arabic: 'يعصي', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Deteriorate', arabic: 'يتدهور', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Meditate', arabic: 'يتأمل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Confirm', arabic: 'يؤكد', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Break', arabic: 'يكسر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Burn', arabic: 'يحرق', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Celebrate', arabic: 'يحتفل', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Distinguish', arabic: 'يتميز', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Carry', arabic: 'يحمل', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Comb', arabic: 'يمشط', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Compliment', arabic: 'يجامل', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Return', arabic: 'يرجع', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Hit', arabic: 'يضرب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Hunt', arabic: 'يصيد', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Tell', arabic: 'يخبر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Go', arabic: 'يذهب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Initiate', arabic: 'يبادر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Judge', arabic: 'يحكم', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Knead', arabic: 'يعجن', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'I3tikaf', arabic: 'يعتكف', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Bind', arabic: 'يربط', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Jump', arabic: 'يقفز', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Hate', arabic: 'يكره', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Harvest', arabic: 'يحصد', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Invite', arabic: 'يدعو', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Earn', arabic: 'يكسب', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Test', arabic: 'يجرب', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Devote', arabic: 'يخشع', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Volunteer', arabic: 'يتطوع', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Evolve', arabic: 'يتطور', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Examine', arabic: 'يفحص', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Flirt', arabic: 'يغازل', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Discover', arabic: 'يكتشف', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Fold', arabic: 'يطوي', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Fill', arabic: 'يملأ', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Interpret', arabic: 'يفسر', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Breastfeed', arabic: 'يرضع', category: 'action', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Grow', arabic: 'ينمو', category: 'action', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Blame', arabic: 'يلوم', category: 'action', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},

  // --- منظومة الأرقام الإماراتية (🇦🇪) ---
  { name: 'Zero', arabic: '٠', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.9;
    return 0;
  }},
  { name: 'One', arabic: '١', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.9;
    return 0;
  }},
  { name: 'Two', arabic: '٢', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.9;
    return 0;
  }},
  { name: 'Three', arabic: '٣', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && fs.ring && !fs.pinky) return 0.9;
    return 0;
  }},
  { name: 'Four', arabic: '٤', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.9;
    return 0;
  }},
  { name: 'Five', arabic: '٥', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.9;
    return 0;
  }},
  { name: 'Six', arabic: '٦', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Seven', arabic: '٧', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Eight', arabic: '٨', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Nine', arabic: '٩', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Ten', arabic: '١٠', category: 'number', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Twenty', arabic: '٢٠', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Thirty', arabic: '٣٠', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Forty', arabic: '٤٠', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Fifty', arabic: '٥٠', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'One Hundred', arabic: '١٠٠', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Two Hundred', arabic: '٢٠٠', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Five Hundred', arabic: '٥٠٠', category: 'number', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.6;
    return 0;
  }},
  { name: 'Thousand', arabic: '١٠٠٠', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.5;
    return 0;
  }},
  { name: 'Million', arabic: 'مليون', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.5;
    return 0;
  }},
  { name: 'Billion', arabic: 'مليار', category: 'number', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.5;
    return 0;
  }},
  { name: 'I Love You', arabic: 'أحبك', category: 'phrase', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Space', arabic: ' (مسافة) ', category: 'command', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.8;
    return 0;
  }},
  { name: 'Thank You', arabic: 'شكراً', category: 'phrase', match: (lm, fs) => {
    if (countExtended(fs) >= 4) {
      const chinTouch = lm[INDEX_TIP].y > 0.6;
      if (chinTouch) return 0.8;
    }
    return 0;
  }},
  { name: 'Yes', arabic: 'نعم', category: 'word', match: (lm, fs) => {
    if (!fs.index && !fs.middle && !fs.ring && !fs.pinky && !fs.thumb) {
      const nodding = lm[WRIST].y > 0.5;
      if (nodding) return 0.65;
    }
    return 0;
  }},
  { name: 'No', arabic: 'لا', category: 'word', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      const waving = Math.abs(lm[INDEX_TIP].x - 0.5) > 0.2;
      if (waving) return 0.7;
    }
    return 0;
  }},
  { name: 'Help', arabic: 'مساعدة', category: 'word', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      const thumbUp = lm[THUMB_TIP].y < lm[INDEX_MCP].y;
      if (thumbUp) return 0.75;
    }
    return 0;
  }},
  { name: 'Please', arabic: 'من فضلك', category: 'phrase', match: (lm, fs) => {
    if (countExtended(fs) >= 4) {
      const chestLevel = lm[WRIST].y > 0.4 && lm[WRIST].y < 0.7;
      if (chestLevel) return 0.65;
    }
    return 0;
  }},
  { name: 'Sorry', arabic: 'آسف', category: 'word', match: (lm, fs) => {
    if (!fs.index && !fs.middle && !fs.ring && !fs.pinky && !fs.thumb) {
      const chestTouch = lm[WRIST].y > 0.5 && lm[WRIST].x > 0.3 && lm[WRIST].x < 0.7;
      if (chestTouch) return 0.65;
    }
    return 0;
  }},
  { name: 'Good', arabic: 'جيد', category: 'word', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      if (lm[THUMB_TIP].y < lm[THUMB_CMC].y) return 0.8;
    }
    return 0;
  }},
  { name: 'Bad', arabic: 'سيء', category: 'word', match: (lm, fs) => {
    if (fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      if (lm[THUMB_TIP].y > lm[THUMB_CMC].y) return 0.8;
    }
    return 0;
  }},
  { name: 'Love', arabic: 'حب', category: 'word', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.pinky && !fs.middle && !fs.ring) return 0.85;
    return 0;
  }},
  { name: 'Peace', arabic: 'سلام', category: 'word', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && !fs.thumb) {
      const spread = dist(lm[INDEX_TIP], lm[MIDDLE_TIP]);
      if (spread > 0.08) return 0.8;
    }
    return 0;
  }},
  { name: 'Stop', arabic: 'توقف', category: 'word', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && fs.pinky && !fs.thumb) {
      const palmForward = lm[MIDDLE_MCP].z < lm[WRIST].z;
      const high = lm[WRIST].y < 0.4;
      if (palmForward && high) return 0.8;
    }
    return 0;
  }},
  { name: 'Teacher', arabic: 'معلم', category: 'word', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky && fs.thumb) {
      const high = lm[WRIST].y < 0.3;
      if (high) return 0.7;
    }
    return 0;
  }},
  { name: 'Student', arabic: 'طالب', category: 'word', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky && !fs.thumb) {
      const mid = lm[WRIST].y > 0.3 && lm[WRIST].y < 0.6;
      if (mid) return 0.65;
    }
    return 0;
  }},
  { name: 'School', arabic: 'مدرسة', category: 'word', match: (lm, fs) => {
    if (countExtended(fs) >= 4) {
      const low = lm[WRIST].y > 0.6;
      if (low) return 0.6;
    }
    return 0;
  }},
  { name: 'Water', arabic: 'ماء', category: 'word', match: (lm, fs) => {
    if (fs.index && fs.middle && fs.ring && !fs.pinky && fs.thumb) {
      if (fingersTouching(lm, THUMB_TIP, PINKY_TIP, 0.06)) return 0.75;
    }
    return 0;
  }},
  { name: 'Food', arabic: 'طعام', category: 'word', match: (lm, fs) => {
    if (!fs.index && !fs.middle && !fs.ring && !fs.pinky && fs.thumb) {
      const nearMouth = lm[THUMB_TIP].y < 0.35;
      if (nearMouth) return 0.7;
    }
    return 0;
  }},
  { name: 'Home', arabic: 'بيت', category: 'word', match: (lm, fs) => {
    if (countExtended(fs) >= 3) {
      const together = dist(lm[INDEX_TIP], lm[MIDDLE_TIP]) < 0.04;
      if (together) return 0.7;
    }
    return 0;
  }},
  { name: 'Family', arabic: 'عائلة', category: 'word', match: (lm, fs) => {
    if (countExtended(fs) === 5) {
      const together = dist(lm[INDEX_TIP], lm[PINKY_TIP]) < 0.08;
      if (together) return 0.7;
    }
    return 0;
  }},
  { name: 'Friend', arabic: 'صديق', category: 'word', match: (lm, fs) => {
    if (fs.index && fs.middle && !fs.ring && !fs.pinky) {
      if (fingersTouching(lm, INDEX_TIP, MIDDLE_TIP, 0.03)) return 0.75;
    }
    return 0;
  }},
  { name: 'I understand', arabic: 'أفهم', category: 'phrase', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      const nearHead = lm[INDEX_TIP].y < 0.25;
      if (nearHead) return 0.7;
    }
    return 0;
  }},
  { name: 'I don\'t understand', arabic: 'لا أفهم', category: 'phrase', match: (lm, fs) => {
    if (countExtended(fs) >= 4) {
      const shaking = Math.abs(lm[WRIST].x - 0.5) > 0.15;
      const nearHead = lm[WRIST].y < 0.35;
      if (shaking && nearHead) return 0.7;
    }
    return 0;
  }},
  { name: 'Repeat', arabic: 'أعد', category: 'word', match: (lm, fs) => {
    if (fs.index && !fs.middle && !fs.ring && !fs.pinky && fs.thumb) {
      const circular = lm[INDEX_TIP].x > 0.5;
      if (circular) return 0.6;
    }
    return 0;
  }},
  { name: 'Slow down', arabic: 'ببطء', category: 'phrase', match: (lm, fs) => {
    if (countExtended(fs) >= 4) {
      const palmDown = lm[MIDDLE_TIP].y > lm[MIDDLE_MCP].y;
      const low = lm[WRIST].y > 0.5;
      if (palmDown && low) return 0.7;
    }
    return 0;
  }},
];

// ============================================
// Main Classifier
// ============================================
export type DetectionMode = 'all' | 'letter' | 'number' | 'action' | 'word'

export function classifyGesture(landmarks: HandLandmark[], mode: DetectionMode = 'all'): ClassificationResult | null {
  if (!landmarks || landmarks.length < 21) return null;

  const fs = getFingerStates(landmarks);
  let best: ClassificationResult | null = null;
  let bestConf = 0;

  for (const g of GESTURES) {
    // Filter by mode if not 'all'
    if (mode !== 'all') {
      if (mode === 'action' && g.category === 'word') { /* allow words in action mode */ }
      else if (mode === 'word' && g.category === 'action') { /* allow actions in word mode */ }
      else if (g.category !== mode) continue;
    }

    const conf = g.match(landmarks, fs);
    if (conf > bestConf && conf > 0.5) {
      bestConf = conf;
      best = {
        gesture: g.name,
        arabic: g.arabic,
        confidence: conf,
        category: g.category,
      };
    }
  }

  return best;
}

// Buffer for building words from letters
let letterBuffer: string[] = [];
let lastLetterTime = 0;
let lastGesture = '';
const HOLD_THRESHOLD = 12; // Increased from 8 for better stability
const WORD_TIMEOUT = 2000; // ms gap = new word

export function processGestureStream(landmarks: HandLandmark[], mode: DetectionMode = 'all'): {
  currentGesture: ClassificationResult | null;
  currentWord: string;
  confirmedWord: string | null;
} {
  const result = classifyGesture(landmarks, mode);
  const now = Date.now();
  let confirmedWord: string | null = null;

  if (result) {
    if (result.gesture === lastGesture) {
      gestureHoldCount++;
    } else {
      gestureHoldCount = 1;
      lastGesture = result.gesture;
    }

    // Confirm gesture after holding for N frames
    if (gestureHoldCount === HOLD_THRESHOLD) {
      if (result.category === 'letter') {
        // Check for word timeout
        if (now - lastLetterTime > WORD_TIMEOUT && letterBuffer.length > 0) {
          confirmedWord = letterBuffer.join('');
          letterBuffer = [];
        }
        letterBuffer.push(result.arabic);
        lastLetterTime = now;
      } else {
        // Word/phrase detected directly
        if (letterBuffer.length > 0) {
          confirmedWord = letterBuffer.join('');
          letterBuffer = [];
        }
        confirmedWord = result.arabic;
      }
    }
  } else {
    gestureHoldCount = 0;
    // If no gesture and timeout, flush buffer
    if (now - lastLetterTime > WORD_TIMEOUT && letterBuffer.length > 0) {
      confirmedWord = letterBuffer.join('');
      letterBuffer = [];
    }
  }

  return {
    currentGesture: gestureHoldCount >= 3 ? result : null,
    currentWord: letterBuffer.join(''),
    confirmedWord,
  };
}

export function resetBuffer() {
  letterBuffer = [];
  lastLetterTime = 0;
  lastGesture = '';
  gestureHoldCount = 0;
}

export function getAllGestures() {
  return GESTURES.map(g => ({
    name: g.name,
    arabic: g.arabic,
    category: g.category,
  }));
}
