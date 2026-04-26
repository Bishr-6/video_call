#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🚀 سكريبت شامل لمعالجة وتدريب جميع الفيديوهات - مُحدّث لـ MediaPipe 0.10.33
تم تعديل المسارات لضمان التوافق مع Windows و Python 3.12
"""

import os

# 1. إخفاء رسائل التحذير الخاصة بـ TensorFlow و oneDNN (اختياري لكن مريح للعين)
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import sys
import cv2
import numpy as np
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Conv1D, MaxPooling1D, BatchNormalization, Flatten, Reshape, Bidirectional, Dropout
from tensorflow.keras.callbacks import TensorBoard
from sklearn.model_selection import train_test_split

# 2. تصحيح استيراد MediaPipe (الحل النهائي لمشكلة AttributeError)
import mediapipe as mp

# نستخدم الاستيراد المباشر من المجلدات الداخلية لضمان الوصول للحلول
try:
    import mediapipe.python.solutions.holistic as mp_holistic
    import mediapipe.python.solutions.drawing_utils as mp_drawing
    import mediapipe.python.solutions.drawing_styles as mp_drawing_styles
except ImportError:
    # في حال فشل الاستيراد المباشر، نستخدم الطريقة التقليدية
    mp_holistic = mp.solutions.holistic
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles

# ملاحظة: الآن في بقية الكود استخدم المتغيرات (mp_holistic) و (mp_drawing) مباشرة
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

def extract_keypoints(hand_landmarks_list):
    """استخراج إحداثيات الأيدي من MediaPipe Hands"""
    keypoints = []

    # اليد اليسرى (أول كائن)
    if len(hand_landmarks_list) > 0:
        left_hand = hand_landmarks_list[0]
        for lm in left_hand.landmark:
            keypoints.extend([lm.x, lm.y, lm.z])
    else:
        keypoints.extend([0] * 63)  # 21 نقطة * 3 إحداثيات

    # اليد اليمنى (ثاني كائن)
    if len(hand_landmarks_list) > 1:
        right_hand = hand_landmarks_list[1]
        for lm in right_hand.landmark:
            keypoints.extend([lm.x, lm.y, lm.z])
    else:
        keypoints.extend([0] * 63)

    return np.array(keypoints)

def process_videos_batch(videos_folder_path, data_path='MP_Data', sequence_length=30):
    """معالجة جميع الفيديوهات في مجلد باستخدام MediaPipe Hands"""

    if not os.path.exists(videos_folder_path):
        print(f"❌ خطأ: المجلد '{videos_folder_path}' غير موجود")
        return False

    # الحصول على قائمة الفيديوهات
    video_files = sorted([f for f in os.listdir(videos_folder_path)
                         if f.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv'))])

    if len(video_files) == 0:
        print(f"❌ لم نجد فيديوهات في المجلد '{videos_folder_path}'")
        return False

    print(f"\n{'='*70}")
    print(f"🎬 سكريبت معالجة وتدريب الفيديوهات الشامل")
    print(f"{'='*70}")
    print(f"📊 عدد الفيديوهات المكتشفة: {len(video_files)}")
    print(f"{'='*70}\n")

    # إنشاء مجلد البيانات الرئيسي
    os.makedirs(data_path, exist_ok=True)

    total_sequences = 0
    total_frames = 0
    actions_list = []

    # إنشاء Hands detector
    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as hands:

        for video_idx, video_file in enumerate(video_files, 1):
            # استخراج اسم الحرف من اسم الفيديو
            action_name = Path(video_file).stem
            video_path = os.path.join(videos_folder_path, video_file)

            print(f"[{video_idx}/{len(video_files)}] 📽️  معالجة: {video_file}")
            print(f"   الحرف/الكلمة: '{action_name}'")

            try:
                cap = cv2.VideoCapture(video_path)
                total_frames_video = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = cap.get(cv2.CAP_PROP_FPS)

                if total_frames_video == 0:
                    print(f"   ⚠️  تحذير: لم يتم قراءة الفيديو بشكل صحيح")
                    continue

                print(f"   📊 المعلومات: {total_frames_video} إطار @ {fps:.1f} FPS")

                # إنشاء مجلد البيانات للحرف
                action_dir = os.path.join(data_path, action_name)
                os.makedirs(action_dir, exist_ok=True)

                sequence_num = 0
                current_sequence_frames = 0
                current_sequence_dir = os.path.join(action_dir, str(sequence_num))
                os.makedirs(current_sequence_dir, exist_ok=True)

                frame_count = 0
                detected_hands_count = 0

                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    # تحويل الصورة
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = hands.process(frame_rgb)

                    if results.multi_hand_landmarks:
                        keypoints = extract_keypoints(results.multi_hand_landmarks)
                        npy_path = os.path.join(current_sequence_dir, str(current_sequence_frames))
                        np.save(npy_path, keypoints)

                        current_sequence_frames += 1
                        detected_hands_count += 1
                        total_frames += 1

                        if current_sequence_frames >= sequence_length:
                            sequence_num += 1
                            current_sequence_frames = 0
                            current_sequence_dir = os.path.join(action_dir, str(sequence_num))
                            os.makedirs(current_sequence_dir, exist_ok=True)
                            total_sequences += 1

                    frame_count += 1

                cap.release()

                print(f"   ✅ تمت المعالجة")
                print(f"   ✓ إجمالي الإطارات: {frame_count}")
                print(f"   ✓ إطارات اليدين المكتشفة: {detected_hands_count}")
                print(f"   ✓ السلاسل المحفوظة: {sequence_num + 1}")

                if detected_hands_count > 0:
                    actions_list.append(action_name)
                    print(f"   ✨ تم حفظ '{action_name}' بنجاح\n")
                else:
                    print(f"   ⚠️  تحذير: لم تُكتشف أي يد\n")

            except Exception as e:
                print(f"   ❌ خطأ: {str(e)}\n")
                continue

    print(f"{'='*70}")
    print(f"✅ اكتملت معالجة جميع الفيديوهات!")
    print(f"{'='*70}")
    print(f"📊 الإحصائيات:")
    print(f"   - عدد الحروف/الكلمات: {len(actions_list)}")
    print(f"   - إجمالي السلاسل: {total_sequences}")
    print(f"   - إجمالي الإطارات: {total_frames}")
    print(f"{'='*70}\n")

    if len(actions_list) < 2:
        print(f"❌ خطأ: يجب أن يكون لديك على الأقل حرفين بيانات صحيحة")
        return False

    return True, actions_list

def train_model(data_path='MP_Data'):
    """تدريب النموذج على جميع البيانات"""

    print(f"\n{'='*70}")
    print(f"🧠 بدء عملية التدريب")
    print(f"{'='*70}\n")

    # قراءة الكلمات من أسماء المجلدات
    actions = np.array([name for name in os.listdir(data_path)
                       if os.path.isdir(os.path.join(data_path, name))])

    if len(actions) < 2:
        print(f"❌ خطأ: يجب أن يكون لديك على الأقل حرفين للتدريب")
        return False

    print(f"🔍 الحروف/الكلمات المكتشفة:")
    for i, action in enumerate(actions, 1):
        print(f"   {i}. {action}")
    print()

    # الإعدادات
    sequence_length = 30

    # تحويل إلى أرقام
    label_map = {label: num for num, label in enumerate(actions)}

    print(f"⚙️  جاري تجهيز ومعالجة البيانات...")
    sequences, labels = [], []

    for action in actions:
        action_path = os.path.join(data_path, action)
        sequences_in_action = os.listdir(action_path)

        for sequence in sorted([int(s) for s in sequences_in_action if s.isdigit()]):
            window = []
            sequence_path = os.path.join(action_path, str(sequence))

            for frame_num in range(sequence_length):
                npy_file = os.path.join(sequence_path, f"{frame_num}.npy")
                if os.path.exists(npy_file):
                    res = np.load(npy_file)
                else:
                    res = np.zeros(126)  # 21 نقطة * 3 إحداثيات * 2 يد
                window.append(res)

            sequences.append(window)
            labels.append(label_map[action])

    # تحويل إلى مصفوفات
    X = np.array(sequences)
    y = to_categorical(labels).astype(int)

    print(f"   ✓ عدد السلاسل: {len(sequences)}")
    print(f"   ✓ شكل البيانات: {X.shape}")
    print(f"   ✓ شكل التصنيفات: {y.shape}\n")

    # تقسيم البيانات
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.05)

    # بناء النموذج
    print(f"🧠 جاري بناء الشبكة العصبية...")

    log_dir = os.path.join('Logs')
    os.makedirs(log_dir, exist_ok=True)
    tb_callback = TensorBoard(log_dir=log_dir)

    num_features = X_train.shape[2]

    model = Sequential()

    # طبقات الاستخراج الفراغي
    model.add(Conv1D(64, 3, activation='relu', padding='same', input_shape=(sequence_length, num_features)))
    model.add(MaxPooling1D(2))
    model.add(BatchNormalization())

    model.add(Conv1D(128, 3, activation='relu', padding='same'))
    model.add(MaxPooling1D(2))
    model.add(BatchNormalization())

    model.add(Conv1D(256, 3, activation='relu', padding='same'))
    model.add(MaxPooling1D(2))
    model.add(Flatten())

    # التحويل للتحليل الزمني
    model.add(Reshape((sequence_length // 8, 256)))

    # طبقات التحليل الزمني
    model.add(Bidirectional(LSTM(128, return_sequences=True)))
    model.add(Dropout(0.5))
    model.add(Bidirectional(LSTM(64, return_sequences=False)))
    model.add(Dropout(0.5))

    # الطبقات النهائية
    model.add(Dense(64, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(actions.shape[0], activation='softmax'))

    # تجميع النموذج
    model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

    print(f"✅ تم بناء النموذج\n")

    # التدريب
    print(f"🚀 بدء التدريب...")
    print(f"{'='*70}\n")

    history = model.fit(X_train, y_train, epochs=200, callbacks=[tb_callback], verbose=1)

    print(f"\n{'='*70}")
    print(f"✅ التدريب اكتمل!")
    print(f"{'='*70}\n")

    # حفظ النموذج
    model.save('sign_language_model.h5')
    print(f"💾 تم حفظ النموذج: 'sign_language_model.h5'")

    # معلومات التقييم
    test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"📊 دقة الاختبار: {test_accuracy*100:.2f}%")

    # حفظ خريطة التصنيفات
    import json
    with open('label_map.json', 'w', encoding='utf-8') as f:
        json.dump(label_map, f, ensure_ascii=False, indent=2)
    print(f"📄 تم حفظ خريطة الحروف: 'label_map.json'\n")

    return True

def main():
    """البرنامج الرئيسي"""

    import argparse

    parser = argparse.ArgumentParser(description='معالجة وتدريب الفيديوهات الشامل')
    parser.add_argument('videos_folder', nargs='?',
                       help='مسار مجلد الفيديوهات')

    args = parser.parse_args()

    # الحصول على مسار المجلد
    if args.videos_folder:
        videos_folder = args.videos_folder
    else:
        videos_folder = input("\n📁 أدخل مسار مجلد الفيديوهات: ").strip()

    # معالجة الفيديوهات
    result = process_videos_batch(videos_folder)

    if not result:
        print("\n❌ فشلت المعالجة")
        sys.exit(1)

    # التدريب
    if not train_model():
        print("\n❌ فشل التدريب")
        sys.exit(1)

    print(f"\n{'='*70}")
    print(f"🎉 اكتمل كل شيء بنجاح!")
    print(f"{'='*70}")
    print(f"يمكنك الآن استخدام النموذج في التطبيق!")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()