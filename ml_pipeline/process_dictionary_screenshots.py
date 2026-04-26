import cv2
import numpy as np
import mediapipe as mp
import os
from pathlib import Path

# إعداد MediaPipe
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

def extract_keypoints(results):
    """استخراج إحداثيات الأيدي من الصورة"""
    lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
    rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
    return np.concatenate([lh, rh])

def mediapipe_detection(image, model):
    """كشف اليدين في الصورة"""
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False
    results = model.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return image, results

def process_screenshots_from_folder(action_name, screenshots_folder_path):
    """
    معالجة جميع لقطات الشاشة في مجلد معين
    
    المتطلبات:
    - screenshots_folder_path: مسار المجلد الذي يحتوي على صور لقطات الشاشة
    - action_name: اسم الإشارة (مثل: "مرحبا", "شكراً", إلخ)
    """
    
    DATA_PATH = os.path.join('MP_Data')
    sequence_length = 30
    
    # التحقق من وجود المجلد
    if not os.path.exists(screenshots_folder_path):
        print(f"❌ خطأ: المجلد '{screenshots_folder_path}' غير موجود")
        return False
    
    # الحصول على قائمة الصور
    image_files = sorted([f for f in os.listdir(screenshots_folder_path) 
                         if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))])
    
    if len(image_files) == 0:
        print(f"❌ لم نجد صور في المجلد '{screenshots_folder_path}'")
        return False
    
    print(f"\n📸 عدد الصور المكتشفة: {len(image_files)}")
    
    # إنشاء مجلدات البيانات
    sequence_num = 0
    frame_num = 0
    current_sequence_dir = os.path.join(DATA_PATH, action_name, str(sequence_num))
    os.makedirs(current_sequence_dir, exist_ok=True)
    
    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        for idx, image_file in enumerate(image_files):
            image_path = os.path.join(screenshots_folder_path, image_file)
            
            try:
                # قراءة الصورة
                image = cv2.imread(image_path)
                if image is None:
                    print(f"⚠️  تحذير: لم نستطع قراءة الصورة {image_file}")
                    continue
                
                # كشف اليدين
                processed_image, results = mediapipe_detection(image, holistic)
                
                # التحقق من وجود اليدين
                has_hands = (results.left_hand_landmarks is not None) or (results.right_hand_landmarks is not None)
                
                if has_hands:
                    # استخراج الإحداثيات
                    keypoints = extract_keypoints(results)
                    
                    # حفظ البيانات
                    npy_path = os.path.join(current_sequence_dir, str(frame_num))
                    np.save(npy_path, keypoints)
                    
                    print(f"✅ [{idx+1}/{len(image_files)}] {image_file} - تم حفظ الإطار {frame_num}")
                    
                    frame_num += 1
                    
                    # إذا وصلنا إلى 30 إطار، ننتقل للسلسلة التالية
                    if frame_num >= sequence_length:
                        sequence_num += 1
                        frame_num = 0
                        current_sequence_dir = os.path.join(DATA_PATH, action_name, str(sequence_num))
                        os.makedirs(current_sequence_dir, exist_ok=True)
                        print(f"\n📂 انتقلنا للسلسلة {sequence_num}")
                else:
                    print(f"⚠️  [{idx+1}/{len(image_files)}] {image_file} - لم نكتشف أي يد فيها (تخطيتها)")
            
            except Exception as e:
                print(f"❌ خطأ في معالجة {image_file}: {str(e)}")
                continue
    
    print(f"\n✅ اكتمل معالجة جميع الصور!")
    print(f"   - تم حفظ {sequence_num} سلسلة (sequences)")
    print(f"   - كل سلسلة تحتوي على حتى 30 إطار")
    return True

if __name__ == '__main__':
    print("="*60)
    print("معالج لقطات الشاشة من قاموس لغة الإشارة")
    print("="*60)
    
    # مثال على الاستخدام:
    # ضع صورك في مجلد مثل: screenshots/hello
    
    while True:
        action = input("\nأدخل اسم الإشارة (مثل: 'مرحبا', 'شكراً'): ").strip()
        if action == 'خروج':
            break
        
        screenshots_path = input(f"أدخل مسار مجلد الصور للإشارة '{action}': ").strip()
        
        if process_screenshots_from_folder(action, screenshots_path):
            print(f"✨ تم معالجة صور '{action}' بنجاح!")
            print(f"📁 يمكنك الآن تشغيل: python train_lstm.py")
        else:
            print(f"❌ فشلت معالجة صور '{action}'")
