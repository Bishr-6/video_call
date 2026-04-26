import cv2
import numpy as np
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import mediapipe as mp

# إعداد MediaPipe
mp_holistic = mp.solutions.holistic

def extract_keypoints(results):
    lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
    rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
    return np.concatenate([lh, rh])

def mediapipe_detection(image, model):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False
    results = model.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return image, results

# الإعدادات
VIDEO_DIR = r'c:\Users\HP ENVY 15\Downloads\signals'
DATA_PATH = os.path.join('MP_Data')
SEQUENCE_LENGTH = 120 # زيادة لـ 120 إطار (4 ثواني تقريباً في حال 30 إطار/ثانية)

def process_all_videos():
    if not os.path.exists(VIDEO_DIR):
        print(f"Error: Directory not found: {VIDEO_DIR}")
        return

    # إنشاء مجلد البيانات إذا لم يكن موجوداً
    if not os.path.exists(DATA_PATH):
        os.makedirs(DATA_PATH)

    videos = [f for f in os.listdir(VIDEO_DIR) if f.endswith('.mp4')]
    print(f"Found {len(videos)} videos.")

    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        for video_name in videos:
            action = video_name.replace('.mp4', '')
            video_path = os.path.join(VIDEO_DIR, video_name)
            
            print(f"Processing: {action}...")
            
            cap = cv2.VideoCapture(video_path)
            frames = []
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # معالجة الإطار واستخراج النقاط
                image, results = mediapipe_detection(frame, holistic)
                keypoints = extract_keypoints(results)
                frames.append(keypoints)
            
            cap.release()
            
            if len(frames) < SEQUENCE_LENGTH:
                print(f"Warning: Video '{action}' too short ({len(frames)} frames). Skipping or repeating frames.")
                if len(frames) == 0:
                    continue
                # تكرار آخر إطار لتكملة الـ 30
                while len(frames) < SEQUENCE_LENGTH:
                    frames.append(frames[-1])
            
            # سنأخذ أول 120 إطار لتغطية 4 ثواني
            final_frames = frames[:SEQUENCE_LENGTH]
            
            # إذا كان الفيديو أقصر من المطلوب، نكرر الإطارات
            if len(final_frames) < SEQUENCE_LENGTH:
                while len(final_frames) < SEQUENCE_LENGTH:
                    final_frames.append(final_frames[-1])
            
            # حفظ كـ "Sequence 0" لهذا الحرف
            # ملاحظة: إذا أردت تدريب قوي، يفضل أن يكون لكل حرف أكثر من فيديو واحد (Sequences 0, 1, 2...)
            sequence_path = os.path.join(DATA_PATH, action, '0')
            if not os.path.exists(sequence_path):
                os.makedirs(sequence_path)
                
            for frame_num, keypoints in enumerate(final_frames):
                npy_path = os.path.join(sequence_path, f"{frame_num}.npy")
                np.save(npy_path, keypoints)
            
            print(f"Done: {action} data saved.")

if __name__ == '__main__':
    process_all_videos()
