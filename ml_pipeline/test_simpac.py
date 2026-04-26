#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار سريع لنظام SIMPAC-2025-43
"""

import sys
import os

# إضافة مسار المكتبات
sys.path.insert(0, 'C:\\Users\\HP ENVY 15\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages')

try:
    import pickle
    import numpy as np
    import cv2
    import mediapipe as mp
    print("✅ تم استيراد جميع المكتبات بنجاح!")
except ImportError as e:
    print(f"❌ خطأ في الاستيراد: {e}")
    exit(1)

print("\n=== اختبار دمج نظام SIMPAC-2025-43 ===")

class SIMPACIntegration:
    def __init__(self, base_path='../external_data/SIMPAC-2025-43'):
        self.base_path = base_path
        self.model_path = os.path.join(base_path, 'Training Model', 'svm_letters_classifier.p')
        self.labels_dict_path = os.path.join(base_path, 'arabic_labels_dict.py')

        self.labels_dict = self._load_labels_dict()
        self.model = self._load_model()

        print(f"تم تحميل نظام SIMPAC-2025-43 بنجاح. عدد التصنيفات: {len(self.labels_dict)}")

    def _load_labels_dict(self):
        try:
            with open(self.labels_dict_path, 'r', encoding='utf-8') as f:
                content = f.read()

            import ast
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Dict):
                    return ast.literal_eval(content.split('=')[1].strip())
        except Exception as e:
            print(f"خطأ في تحميل قاموس التصنيفات: {e}")
            return {}

    def _load_model(self):
        try:
            with open(self.model_path, 'rb') as f:
                model_data = pickle.load(f)
                return model_data['model']
        except FileNotFoundError:
            print(f"لم يتم العثور على النموذج في {self.model_path}")
            return None
        except Exception as e:
            print(f"خطأ في تحميل النموذج: {e}")
            return None

    def get_supported_gestures(self):
        return list(self.labels_dict.values())

    def get_model_info(self):
        return {
            'name': 'SIMPAC-2025-43 SVM Model',
            'type': 'Support Vector Machine',
            'supported_gestures': len(self.labels_dict),
            'gestures_list': self.get_supported_gestures(),
            'model_loaded': self.model is not None,
            'research_paper': 'Static Arabic Sign Language Recognition in Real Time Using Machine Learning and MediaPipe',
            'conference': '2024 1st International Conference on Emerging Technologies for Dependable Internet of Things (ICETI)',
            'doi': '10.1109/ICETI63946.2024.10777193'
        }

# اختبار النظام
try:
    integrator = SIMPACIntegration()
    info = integrator.get_model_info()

    print(f"النموذج محمل: {info['model_loaded']}")
    print(f"عدد الإشارات المدعومة: {info['supported_gestures']}")
    print(f"الإشارات: {', '.join(info['gestures_list'][:10])}...")
    print(f"العنوان: {info['research_paper']}")
    print(f"المؤتمر: {info['conference']}")
    print(f"DOI: {info['doi']}")
    print("\n✅ تم الاختبار بنجاح!")

except Exception as e:
    print(f"❌ خطأ في الاختبار: {e}")