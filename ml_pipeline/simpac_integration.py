#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SIMPAC-2025-43 Integration Module
دمج نظام SIMPAC-2025-43 في النظام الرئيسي

هذا النظام يدعم:
- 28 حرف عربي (أ-ي + ة)
- 2 كلمة شائعة (لا، ال)
- 11 رقم (٠-١٠)
"""

import os
import pickle
import numpy as np
import cv2
import mediapipe as mp
from typing import List, Dict, Tuple, Optional
import logging

# إعداد السجل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SIMPACIntegration:
    """فئة لدمج نظام SIMPAC-2025-43"""

    def __init__(self, base_path: str = "./external_data/SIMPAC-2025-43"):
        self.base_path = base_path
        self.model_path = os.path.join(base_path, "Training Model", "svm_letters_classifier.p")
        self.labels_dict_path = os.path.join(base_path, "arabic_labels_dict.py")

        # تحميل قاموس التصنيفات
        self.labels_dict = self._load_labels_dict()

        # تحميل النموذج
        self.model = self._load_model()

        # إعداد MediaPipe
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils

        logger.info(f"تم تحميل نظام SIMPAC-2025-43 بنجاح. عدد التصنيفات: {len(self.labels_dict)}")

    def _load_labels_dict(self) -> Dict[int, str]:
        """تحميل قاموس التصنيفات العربية"""
        try:
            # قراءة الملف وتحليل القاموس
            with open(self.labels_dict_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # استخراج القاموس من النص
            import ast
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Dict):
                    return ast.literal_eval(content.split('=')[1].strip())
        except Exception as e:
            logger.error(f"خطأ في تحميل قاموس التصنيفات: {e}")
            return {}

    def _load_model(self):
        """تحميل نموذج SVM المدرب"""
        try:
            with open(self.model_path, 'rb') as f:
                model_data = pickle.load(f)
                return model_data['model']
        except FileNotFoundError:
            logger.warning(f"لم يتم العثور على النموذج في {self.model_path}")
            return None
        except Exception as e:
            logger.error(f"خطأ في تحميل النموذج: {e}")
            return None

    def extract_landmarks(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        استخراج النقاط المميزة من الصورة

        Args:
            image: صورة RGB

        Returns:
            مصفوفة النقاط المميزة (42 قيمة لكل يد) أو None
        """
        try:
            data_aux = []
            x_ = []
            y_ = []

            # معالجة الصورة بـ MediaPipe
            with self.mp_hands.Hands(
                static_image_mode=True,
                min_detection_confidence=0.3,
                max_num_hands=1
            ) as hands:
                results = hands.process(image)

                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        # استخراج إحداثيات x, y لكل نقطة
                        for landmark in hand_landmarks.landmark:
                            x_.append(landmark.x)
                            y_.append(landmark.y)

                        # حساب المسافات النسبية
                        if x_ and y_:
                            min_x, min_y = min(x_), min(y_)
                            for i in range(len(hand_landmarks.landmark)):
                                data_aux.append(x_[i] - min_x)
                                data_aux.append(y_[i] - min_y)

                    return np.array(data_aux).reshape(1, -1)

        except Exception as e:
            logger.error(f"خطأ في استخراج النقاط المميزة: {e}")

        return None

    def predict(self, image: np.ndarray) -> Tuple[Optional[str], Optional[float]]:
        """
        التنبؤ بالإشارة من الصورة

        Args:
            image: صورة RGB

        Returns:
            tuple: (التصنيف العربي, درجة الثقة) أو (None, None)
        """
        if self.model is None:
            logger.warning("النموذج غير محمل")
            return None, None

        # استخراج النقاط المميزة
        landmarks = self.extract_landmarks(image)
        if landmarks is None:
            return None, None

        try:
            # التنبؤ
            prediction = self.model.predict(landmarks)[0]
            probabilities = self.model.predict_proba(landmarks)[0]

            # الحصول على أعلى احتمالية
            confidence = np.max(probabilities)

            # تحويل الرقم إلى نص عربي
            arabic_text = self.labels_dict.get(prediction, str(prediction))

            return arabic_text, float(confidence)

        except Exception as e:
            logger.error(f"خطأ في التنبؤ: {e}")
            return None, None

    def get_supported_gestures(self) -> List[str]:
        """الحصول على قائمة الإشارات المدعومة"""
        return list(self.labels_dict.values())

    def get_model_info(self) -> Dict:
        """معلومات النموذج"""
        return {
            "name": "SIMPAC-2025-43 SVM Model",
            "type": "Support Vector Machine",
            "supported_gestures": len(self.labels_dict),
            "gestures_list": self.get_supported_gestures(),
            "model_loaded": self.model is not None,
            "research_paper": "Static Arabic Sign Language Recognition in Real Time Using Machine Learning and MediaPipe",
            "conference": "2024 1st International Conference on Emerging Technologies for Dependable Internet of Things (ICETI)",
            "doi": "10.1109/ICETI63946.2024.10777193"
        }

def test_integration():
    """اختبار دمج النظام"""
    try:
        integrator = SIMPACIntegration()

        # طباعة معلومات النظام
        info = integrator.get_model_info()
        print("=== معلومات نظام SIMPAC-2025-43 ===")
        print(f"النموذج محمل: {info['model_loaded']}")
        print(f"عدد الإشارات المدعومة: {info['supported_gestures']}")
        print(f"الإشارات: {', '.join(info['gestures_list'][:10])}...")

        print("\n=== تفاصيل البحث العلمي ===")
        print(f"العنوان: {info['research_paper']}")
        print(f"المؤتمر: {info['conference']}")
        print(f"DOI: {info['doi']}")

        return True

    except Exception as e:
        logger.error(f"فشل اختبار الدمج: {e}")
        return False

if __name__ == "__main__":
    test_integration()