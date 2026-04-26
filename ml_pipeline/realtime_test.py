import cv2
import numpy as np
import os
import sys
import io
from tensorflow.keras.models import load_model
import mediapipe as mp

# تفعيل دعم اللغة العربية في مخرجات التيرمنال
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# إعداد MediaPipe
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

def extract_keypoints(results):
    lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
    rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
    
    # Wrist Normalization
    if np.sum(lh) != 0:
        base = lh[0:3].copy() # wrist is the first landmark (x,y,z)
        for i in range(0, len(lh), 3):
            lh[i:i+3] -= base
            
    if np.sum(rh) != 0:
        base = rh[0:3].copy()
        for i in range(0, len(rh), 3):
            rh[i:i+3] -= base
            
    return np.concatenate([lh, rh])

def draw_styled_landmarks(image, results):
    mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                             mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4), 
                             mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2))
    mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                             mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4), 
                             mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2))

# مسار البيانات
DATA_PATH = os.path.join('MP_Data')
actions = np.array([name for name in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, name))])

# الإعدادات
sequence_length = 120

print("جاري تحميل النموذج (Model)...")
model = load_model('sign_language_model.h5')
print("✅ تم تحميل النموذج بنجاح!")

# المتغيرات الخاصة بالتوقع
sequence = []
sentence = []
threshold = 0.8
last_print = ""

cap = cv2.VideoCapture(0)

with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
    print("\n🎥 الكاميرا تعمل الآن! قم بعمل إشارة لتجربتها.")
    print("اضغط على حرف 'q' لإغلاق الكاميرا.")
    print("-" * 50)
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # معالجة الصورة باستخدام MediaPipe
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = holistic.process(image)
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        # رسم الإحداثيات على الشاشة
        draw_styled_landmarks(image, results)
        
        # 1. توقع الإشارة
        keypoints = extract_keypoints(results)
        sequence.append(keypoints)
        
        # الاحتفاظ بآخر 120 إطار فقط
        sequence = sequence[-sequence_length:]
        
        # إذا لم يكتمل الـ 120 إطار (في البداية)، نقوم بتكرار الإطار الحالي ليعمل فوراً
        current_sequence = sequence.copy()
        if len(current_sequence) < sequence_length:
            while len(current_sequence) < sequence_length:
                current_sequence.insert(0, current_sequence[0])
                
        res = model.predict(np.expand_dims(current_sequence, axis=0), verbose=0)[0]
        predicted_action = actions[np.argmax(res)]
        
        # 2. عرض النتيجة
        # سنعرض دائماً أعلى توقع لكي نرى ما يفكر فيه الموديل
        current_print = f"الكلمة المتوقعة: [ {predicted_action} ] بدقة {res[np.argmax(res)]*100:.1f}%"
        
        # طباعة النتيجة فقط إذا تغيرت أو كل فترة لتجنب زحمة الشاشة
        if current_print != last_print:
            print(current_print, flush=True)
            last_print = current_print

        cv2.imshow('Sign Language AI Test', image)

        # الخروج عند الضغط على q
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
