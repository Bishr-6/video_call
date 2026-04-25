"""
معالجة المصادر الخارجية لبيانات لغة الإشارة العربية
Processing External Arabic Sign Language Datasets

يدعم:
- صور (ArASL, ArYSL, AASL)
- فيديوهات (KArSL, ArabSign)
- ملفات Skeleton جاهزة
"""

import cv2
import numpy as np
import os
import mediapipe as mp
from pathlib import Path
import argparse
from tqdm import tqdm
import json

# إعداد MediaPipe
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

class ExternalDatasetProcessor:
    def __init__(self, output_dir='MP_Data', sequence_length=30):
        self.output_dir = output_dir
        self.sequence_length = sequence_length
        self.mp_holistic = mp_holistic
        
    def extract_keypoints(self, results):
        """استخراج نقاط المفاصل من نتائج MediaPipe"""
        try:
            lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
            rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
            return np.concatenate([lh, rh])
        except Exception as e:
            print(f"❌ خطأ في استخراج Keypoints: {e}")
            return np.zeros(126)
    
    def mediapipe_detection(self, image, holistic_model):
        """الكشف عن نقاط المفاصل باستخدام MediaPipe"""
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = holistic_model.process(image)
        image.flags.writeable = True
        return results
    
    # ==================== معالجة الصور ====================
    def process_images_dataset(self, input_dir, label=None, min_hands_detected=0.5):
        """
        معالجة مجموعة من الصور واستخراج Landmarks
        
        Args:
            input_dir: مسار مجلد الصور
            label: اسم الفئة (حرف أو كلمة)
            min_hands_detected: نسبة الحد الأدنى من الأيدي المكتشفة
        """
        if label is None:
            label = os.path.basename(input_dir)
        
        output_action_dir = os.path.join(self.output_dir, label)
        os.makedirs(output_action_dir, exist_ok=True)
        
        image_files = [f for f in os.listdir(input_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if not image_files:
            print(f"⚠️ لم يتم العثور على صور في: {input_dir}")
            return 0
        
        print(f"\n📸 معالجة مجموعة الصور: {label}")
        print(f"عدد الصور: {len(image_files)}")
        
        processed_count = 0
        sequence_count = len(os.listdir(output_action_dir)) if os.path.exists(output_action_dir) else 0
        
        with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
            for idx, image_file in enumerate(tqdm(image_files, desc=f"معالجة {label}")):
                try:
                    image_path = os.path.join(input_dir, image_file)
                    image = cv2.imread(image_path)
                    
                    if image is None:
                        continue
                    
                    results = self.mediapipe_detection(image, holistic)
                    keypoints = self.extract_keypoints(results)
                    
                    # تحقق من وجود يدين مكتشفة
                    if results.left_hand_landmarks or results.right_hand_landmarks:
                        # حفظ كل صورة كتسلسل منفصل (sequence واحد = صورة واحدة)
                        seq_dir = os.path.join(output_action_dir, str(sequence_count))
                        os.makedirs(seq_dir, exist_ok=True)
                        
                        np.save(os.path.join(seq_dir, '0.npy'), keypoints)
                        sequence_count += 1
                        processed_count += 1
                except Exception as e:
                    print(f"⚠️ خطأ في معالجة الصورة {image_file}: {e}")
                    continue
        
        print(f"✅ تم معالجة {processed_count} صورة من {len(image_files)}")
        return processed_count
    
    # ==================== معالجة الفيديوهات ====================
    def process_video_file(self, video_path, label, sequence_num=0, stride=1):
        """
        معالجة ملف فيديو واستخراج Landmarks
        
        Args:
            video_path: مسار ملف الفيديو
            label: اسم الفئة (حرف أو كلمة)
            sequence_num: رقم التسلسل
            stride: خطوة أخذ العينات (كل كام فريم)
        """
        output_action_dir = os.path.join(self.output_dir, label)
        os.makedirs(output_action_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"❌ خطأ: لم يتم فتح الفيديو: {video_path}")
            return False
        
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        print(f"📹 معالجة الفيديو: {os.path.basename(video_path)}")
        print(f"عدد الإطارات: {frame_count}, FPS: {fps:.1f}")
        
        seq_dir = os.path.join(output_action_dir, str(sequence_num))
        os.makedirs(seq_dir, exist_ok=True)
        
        keypoints_list = []
        frame_num = 0
        keypoints_saved = 0
        
        with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
            while True:
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                if frame_num % stride != 0:
                    frame_num += 1
                    continue
                
                results = self.mediapipe_detection(frame, holistic)
                keypoints = self.extract_keypoints(results)
                keypoints_list.append(keypoints)
                
                # حفظ إذا وصلنا إلى طول التسلسل
                if len(keypoints_list) >= self.sequence_length:
                    for i, kp in enumerate(keypoints_list[:self.sequence_length]):
                        np.save(os.path.join(seq_dir, f'{i}.npy'), kp)
                    keypoints_saved += 1
                    keypoints_list = []
                
                frame_num += 1
        
        cap.release()
        print(f"✅ تم استخراج {keypoints_saved} تسلسل من الفيديو")
        return keypoints_saved > 0
    
    def process_videos_directory(self, input_dir, label=None):
        """معالجة مجلد يحتوي على فيديوهات متعددة"""
        if label is None:
            label = os.path.basename(input_dir)
        
        video_files = [f for f in os.listdir(input_dir) if f.lower().endswith(('.mp4', '.avi', '.mov', '.webm'))]
        
        if not video_files:
            print(f"⚠️ لم يتم العثور على فيديوهات في: {input_dir}")
            return 0
        
        print(f"\n🎬 معالجة مجموعة الفيديوهات: {label}")
        print(f"عدد الفيديوهات: {len(video_files)}")
        
        total_sequences = 0
        for idx, video_file in enumerate(video_files):
            try:
                video_path = os.path.join(input_dir, video_file)
                if self.process_video_file(video_path, label, sequence_num=idx):
                    total_sequences += 1
            except Exception as e:
                print(f"⚠️ خطأ في معالجة الفيديو {video_file}: {e}")
                continue
        
        return total_sequences
    
    # ==================== معالجة Skeleton Files ====================
    def process_skeleton_files(self, input_dir, label=None):
        """
        معالجة ملفات Skeleton جاهزة (من KArSL أو ArabSign)
        يتوقع هيكل: input_dir/video_1/skeleton.npy أو similar
        """
        if label is None:
            label = os.path.basename(input_dir)
        
        output_action_dir = os.path.join(self.output_dir, label)
        os.makedirs(output_action_dir, exist_ok=True)
        
        skeleton_files = []
        for root, dirs, files in os.walk(input_dir):
            for file in files:
                if file.endswith('.npy'):
                    skeleton_files.append(os.path.join(root, file))
        
        if not skeleton_files:
            print(f"⚠️ لم يتم العثور على ملفات Skeleton في: {input_dir}")
            return 0
        
        print(f"\n💀 معالجة ملفات Skeleton: {label}")
        print(f"عدد الملفات: {len(skeleton_files)}")
        
        sequence_count = len(os.listdir(output_action_dir)) if os.path.exists(output_action_dir) else 0
        
        for idx, skeleton_file in enumerate(tqdm(skeleton_files, desc=f"نسخ {label}")):
            try:
                skeleton_data = np.load(skeleton_file)
                
                # التعامل مع أشكال مختلفة من البيانات
                if skeleton_data.ndim == 1:
                    # بيانات إطار واحد
                    seq_dir = os.path.join(output_action_dir, str(sequence_count))
                    os.makedirs(seq_dir, exist_ok=True)
                    np.save(os.path.join(seq_dir, '0.npy'), skeleton_data)
                    sequence_count += 1
                
                elif skeleton_data.ndim == 2:
                    # بيانات متسلسلة (إطارات متعددة)
                    seq_dir = os.path.join(output_action_dir, str(sequence_count))
                    os.makedirs(seq_dir, exist_ok=True)
                    for frame_idx, frame_data in enumerate(skeleton_data[:self.sequence_length]):
                        np.save(os.path.join(seq_dir, f'{frame_idx}.npy'), frame_data)
                    sequence_count += 1
            
            except Exception as e:
                print(f"⚠️ خطأ في معالجة {skeleton_file}: {e}")
                continue
        
        print(f"✅ تم معالجة {len(skeleton_files)} ملف Skeleton")
        return len(skeleton_files)

# ==================== واجهة سطر الأوامر ====================
def main():
    parser = argparse.ArgumentParser(
        description='معالجة مصادر لغة الإشارة العربية الخارجية',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
أمثلة الاستخدام:
  python process_external_datasets.py --images /path/to/ArASL --label "ح"
  python process_external_datasets.py --videos /path/to/KArSL --label "مرحبا"
  python process_external_datasets.py --skeleton /path/to/ArabSign --label "جملة_1"
        """
    )
    
    parser.add_argument('--images', help='مسار مجلد الصور')
    parser.add_argument('--videos', help='مسار مجلد الفيديوهات')
    parser.add_argument('--skeleton', help='مسار مجلد ملفات Skeleton')
    parser.add_argument('--label', help='اسم الفئة (حرف/كلمة)')
    parser.add_argument('--output', default='MP_Data', help='مسار مجلد الإخراج')
    parser.add_argument('--sequence-length', type=int, default=30, help='طول التسلسل')
    
    args = parser.parse_args()
    
    processor = ExternalDatasetProcessor(output_dir=args.output, sequence_length=args.sequence_length)
    
    if args.images:
        processor.process_images_dataset(args.images, args.label)
    elif args.videos:
        processor.process_videos_directory(args.videos, args.label)
    elif args.skeleton:
        processor.process_skeleton_files(args.skeleton, args.label)
    else:
        print("❌ يجب تحديد أحد الخيارات: --images أو --videos أو --skeleton")
        parser.print_help()

if __name__ == "__main__":
    main()
