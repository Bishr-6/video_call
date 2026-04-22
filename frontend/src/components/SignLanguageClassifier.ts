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

const GESTURES: GestureDef[] = [
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
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky && fingersTouching(lm, THUMB_TIP, INDEX_TIP, 0.08)) return 0.85;
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
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) {
      if (fingersTouching(lm, THUMB_TIP, INDEX_TIP, 0.05)) return 0.85;
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
  { name: 'Mother', arabic: 'أمي', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Father', arabic: 'أبي', category: 'word', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Family', arabic: 'عائلة', category: 'word', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Friend', arabic: 'صديق', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && fs.index && fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'School', arabic: 'مدرسة', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Book', arabic: 'كتاب', category: 'word', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Teacher', arabic: 'أستاذ', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Pen', arabic: 'قلم', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Happy', arabic: 'سعيد', category: 'word', match: (lm, fs) => {
    if (fs.thumb && fs.index && fs.middle && fs.ring && fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Sick', arabic: 'مريض', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && !fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Hungry', arabic: 'جوعان', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'Thirsty', arabic: 'عطشان', category: 'word', match: (lm, fs) => {
    if (!fs.thumb && fs.index && !fs.middle && !fs.ring && !fs.pinky) return 0.7;
    return 0;
  }},
  { name: 'I Love You', arabic: 'أحبك', category: 'phrase', match: (lm, fs) => {
    if (fs.thumb && fs.index && !fs.middle && !fs.ring && fs.pinky) return 0.8;
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
export function classifyGesture(landmarks: HandLandmark[]): ClassificationResult | null {
  if (!landmarks || landmarks.length < 21) return null;

  const fs = getFingerStates(landmarks);
  let best: ClassificationResult | null = null;
  let bestConf = 0;

  for (const g of GESTURES) {
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
let gestureHoldCount = 0;
const HOLD_THRESHOLD = 8; // frames to confirm a gesture
const WORD_TIMEOUT = 2000; // ms gap = new word

export function processGestureStream(landmarks: HandLandmark[]): {
  currentGesture: ClassificationResult | null;
  currentWord: string;
  confirmedWord: string | null;
} {
  const result = classifyGesture(landmarks);
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
