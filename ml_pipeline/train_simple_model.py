#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
تدريب نموذج بسيط للترجمة باستخدام البيانات المتاحة
"""

import sys
import os

# إضافة مسار المكتبات
sys.path.insert(0, 'C:\\Users\\HP ENVY 15\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages')

try:
    import numpy as np
    import tensorflow as tf
    from sklearn.model_selection import train_test_split
    from tensorflow.keras.utils import to_categorical
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import TensorBoard
    print("✅ تم استيراد جميع المكتبات")
except ImportError as e:
    print(f"❌ خطأ في الاستيراد: {e}")
    exit(1)

def check_available_data():
    """فحص البيانات المتاحة"""
    data_path = 'MP_Data'

    if not os.path.exists(data_path):
        print(f"❌ مجلد البيانات غير موجود: {data_path}")
        return []

    actions = []
    for item in os.listdir(data_path):
        item_path = os.path.join(data_path, item)
        if os.path.isdir(item_path):
            # عد التسلسلات المتاحة
            sequences = [s for s in os.listdir(item_path) if os.path.isdir(os.path.join(item_path, s))]
            if sequences:
                actions.append((item, len(sequences)))

    print(f"📊 البيانات المتاحة: {len(actions)} إشارة")
    for action, count in actions:
        print(f"  • {action}: {count} تسلسل")

    return actions

def create_simple_model(num_classes, sequence_length=30, feature_length=126):
    """إنشاء نموذج بسيط للتدريب"""
    model = Sequential([
        LSTM(64, return_sequences=True, activation='relu', input_shape=(sequence_length, feature_length)),
        LSTM(128, return_sequences=True, activation='relu'),
        LSTM(64, return_sequences=False, activation='relu'),
        Dense(64, activation='relu'),
        Dense(32, activation='relu'),
        Dense(num_classes, activation='softmax')
    ])

    model.compile(
        optimizer='Adam',
        loss='categorical_crossentropy',
        metrics=['categorical_accuracy']
    )

    return model

def train_model():
    """تدريب النموذج"""
    print("\n🤖 بدء تدريب النموذج...")

    # فحص البيانات
    actions = check_available_data()
    if len(actions) < 2:
        print("❌ تحتاج إلى إشارتين على الأقل للتدريب")
        return False

    data_path = 'MP_Data'
    sequence_length = 30

    # تحضير البيانات
    sequences, labels = [], []
    label_map = {action: i for i, (action, _) in enumerate(actions)}

    print("\n📥 تحميل البيانات...")
    for action, _ in actions:
        action_path = os.path.join(data_path, action)
        for sequence_str in os.listdir(action_path):
            sequence_path = os.path.join(action_path, sequence_str)
            if os.path.isdir(sequence_path):
                window = []
                for frame_num in range(sequence_length):
                    frame_path = os.path.join(sequence_path, f"{frame_num}.npy")
                    if os.path.exists(frame_path):
                        res = np.load(frame_path)
                        window.append(res)
                    else:
                        # إذا كان الإطار مفقود، استخدم مصفوفة صفرية
                        window.append(np.zeros(126))

                if len(window) == sequence_length:
                    sequences.append(window)
                    labels.append(label_map[action])

    if not sequences:
        print("❌ لا توجد بيانات كافية للتدريب")
        return False

    # تحويل البيانات
    X = np.array(sequences)
    y = to_categorical(labels).astype(int)

    print(f"📊 شكل البيانات: X={X.shape}, y={y.shape}")

    # تقسيم البيانات
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    # إنشاء النموذج
    num_classes = len(actions)
    model = create_simple_model(num_classes)

    # تدريب النموذج
    print("\n🚀 بدء التدريب...")
    history = model.fit(
        X_train, y_train,
        epochs=50,
        batch_size=16,
        validation_data=(X_test, y_test)
        # إزالة TensorBoard مؤقتاً
    )

    # حفظ النموذج
    model.save('sign_language_model.h5')
    print("\n✅ تم حفظ النموذج: sign_language_model.h5")

    # تقييم النموذج
    loss, accuracy = model.evaluate(X_test, y_test)
    print(f"📊 دقة النموذج على بيانات الاختبار: {accuracy:.2f}")
    print(f"📊 الخسارة: {loss:.2f}")
    return True

def main():
    print("🎯 تدريب نموذج لغة الإشارة")
    print("=" * 50)

    success = train_model()

    if success:
        print("\n🎉 تم تدريب النموذج بنجاح!")
        print("💡 يمكنك الآن استخدام النظام للترجمة")
        print("🔧 شغل: python app.py (أو الخادم الخاص بك)")
    else:
        print("\n❌ فشل في تدريب النموذج")
        print("💡 تأكد من وجود بيانات كافية في مجلد MP_Data")

if __name__ == "__main__":
    main()