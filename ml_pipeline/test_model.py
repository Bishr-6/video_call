import os
import sys
import numpy as np
sys.path.insert(0, 'C:\\Users\\HP ENVY 15\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages')

from tensorflow.keras.models import load_model

def test_model():
    print("🧪 اختبار النموذج المدرب")
    print("=" * 40)

    # تحميل النموذج
    try:
        model = load_model('sign_language_model.h5')
        print("✅ تم تحميل النموذج")
    except Exception as e:
        print(f"❌ خطأ في تحميل النموذج: {e}")
        return

    # تحميل البيانات
    actions = ['أ', 'ب']
    sequences = []
    labels = []

    for action_idx, action in enumerate(actions):
        action_path = f'MP_Data/{action}'
        if not os.path.exists(action_path):
            print(f"❌ مجلد {action} غير موجود")
            continue

        for seq in range(5):  # اختبار أول 5 تسلسلات فقط
            seq_path = os.path.join(action_path, str(seq))
            if not os.path.exists(seq_path):
                continue

            window = []
            for frame_num in range(30):
                frame_path = os.path.join(seq_path, f'{frame_num}.npy')
                if os.path.exists(frame_path):
                    res = np.load(frame_path)
                    window.append(res)

            if len(window) == 30:
                sequences.append(window)
                labels.append(action_idx)

    if not sequences:
        print("❌ لا توجد بيانات للاختبار")
        return

    X_test = np.array(sequences)
    y_test = np.array(labels)

    print(f"📊 شكل البيانات: X={X_test.shape}, y={y_test.shape}")

    # التنبؤ
    predictions = model.predict(X_test)
    predicted_classes = np.argmax(predictions, axis=1)

    print("\n🔍 نتائج الاختبار:")
    correct = 0
    for i, (pred, true) in enumerate(zip(predicted_classes, y_test)):
        action_pred = actions[pred]
        action_true = actions[true]
        status = "✅" if pred == true else "❌"
        print(f"  تسلسل {i+1}: المتوقع={action_pred}, الحقيقي={action_true} {status}")
        if pred == true:
            correct += 1

    accuracy = correct / len(y_test)
    print(f"\n📈 الدقة: {accuracy:.2%} ({correct}/{len(y_test)})")

    if accuracy >= 0.8:
        print("\n🎉 النموذج جاهز للترجمة!")
    else:
        print("\n⚠️  النموذج يحتاج تحسين")

if __name__ == "__main__":
    test_model()