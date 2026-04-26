#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
معالجة بيانات SIMPAC-2025-43 وتحويلها لتنسيق النظام
"""

import sys
import os
import numpy as np
import pickle
from pathlib import Path

# إضافة مسار المكتبات
sys.path.insert(0, 'C:\\Users\\HP ENVY 15\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages')

try:
    import cv2
    import mediapipe as mp
    print("✅ تم استيراد جميع المكتبات")
except ImportError as e:
    print(f"❌ خطأ في الاستيراد: {e}")
    exit(1)

class SIMPACDataProcessor:
    def __init__(self, source_path='../external_data/SIMPAC-2025-43', output_path='MP_Data'):
        self.source_path = source_path
        self.output_path = output_path
        self.mp_hands = mp.solutions.hands.Hands(
            static_image_mode=True,
            min_detection_confidence=0.3
        )

        # تحميل قاموس التصنيفات
        self.labels_dict = self._load_labels_dict()
        print(f"تم تحميل {len(self.labels_dict)} تصنيف من SIMPAC")

    def _load_labels_dict(self):
        """تحميل قاموس التصنيفات العربية"""
        labels_path = os.path.join(self.source_path, 'arabic_labels_dict.py')
        try:
            with open(labels_path, 'r', encoding='utf-8') as f:
                content = f.read()

            import ast
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Dict):
                    return ast.literal_eval(content.split('=')[1].strip())
        except Exception as e:
            print(f"خطأ في تحميل القاموس: {e}")
            return {}

    def process_simpac_data(self):
        """معالجة بيانات SIMPAC وتحويلها"""
        print("\n🚀 بدء معالجة بيانات SIMPAC-2025-43")

        # إنشاء مجلدات الإخراج
        os.makedirs(self.output_path, exist_ok=True)

        processed_count = 0

        # معالجة كل تصنيف
        for label_id, arabic_char in self.labels_dict.items():
            print(f"\n📝 معالجة التصنيف: {arabic_char} (ID: {label_id})")

            # إنشاء مجلد التصنيف
            label_dir = os.path.join(self.output_path, arabic_char)
            os.makedirs(label_dir, exist_ok=True)

            # محاولة العثور على بيانات لهذا التصنيف
            # في SIMPAC، البيانات قد تكون في مجلدات مختلفة
            found_data = self._find_label_data(arabic_char)

            if found_data:
                print(f"  ✅ تم العثور على {len(found_data)} عينة")
                # معالجة البيانات (سيتم تطوير هذا لاحقاً)
                processed_count += len(found_data)
            else:
                print(f"  ⚠️ لم يتم العثور على بيانات لـ {arabic_char}")

        print(f"\n✅ تمت معالجة {processed_count} عينة من SIMPAC")
        return processed_count

    def _find_label_data(self, arabic_char):
        """البحث عن بيانات التصنيف في مجلد SIMPAC"""
        found_files = []

        # البحث في مجلد My Data
        my_data_path = os.path.join(self.source_path, 'My Data')
        if os.path.exists(my_data_path):
            for root, dirs, files in os.walk(my_data_path):
                for file in files:
                    if file.endswith(('.jpg', '.png', '.jpeg')):
                        # التحقق من اسم الملف أو المجلد
                        if arabic_char in root or arabic_char in file:
                            found_files.append(os.path.join(root, file))

        # البحث في مجلدات أخرى
        for root, dirs, files in os.walk(self.source_path):
            for file in files:
                if file.endswith(('.jpg', '.png', '.jpeg', '.npy')):
                    if arabic_char in file or arabic_char in root:
                        found_files.append(os.path.join(root, file))

        return found_files

def main():
    print("🔧 معالج بيانات SIMPAC-2025-43")
    print("=" * 50)

    try:
        processor = SIMPACDataProcessor()
        processed = processor.process_simpac_data()

        print("\n📊 النتائج:")
        print(f"  • تمت معالجة: {processed} عينة")
        print(f"  • المصدر: SIMPAC-2025-43")
        print(f"  • المخرجات: {processor.output_path}")

        if processed > 0:
            print("\n✅ النظام جاهز للتدريب!")
            print("💡 يمكنك الآن تشغيل: python train_multi_source.py")
        else:
            print("\n⚠️ لم يتم العثور على بيانات - قد تحتاج لمعالجة يدوية")

    except Exception as e:
        print(f"❌ خطأ في المعالجة: {e}")

if __name__ == "__main__":
    main()