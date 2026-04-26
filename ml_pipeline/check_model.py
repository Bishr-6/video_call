import os
import sys
sys.path.insert(0, 'C:\\Users\\HP ENVY 15\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages')

def check_model():
    print("🧪 فحص النموذج المدرب")
    print("=" * 40)

    # فحص وجود النموذج
    model_path = 'sign_language_model.h5'
    if os.path.exists(model_path):
        size = os.path.getsize(model_path) / (1024 * 1024)  # حجم بالميجابايت
        print(f"✅ النموذج موجود: {model_path}")
        print(f"   حجم الملف: {size:.2f} MB")
    else:
        print(f"❌ النموذج غير موجود: {model_path}")
        return

    # فحص البيانات
    data_path = 'MP_Data'
    if os.path.exists(data_path):
        actions = []
        for item in os.listdir(data_path):
            item_path = os.path.join(data_path, item)
            if os.path.isdir(item_path):
                sequences = [s for s in os.listdir(item_path) if os.path.isdir(os.path.join(item_path, s))]
                actions.append((item, len(sequences)))

        print(f"✅ البيانات موجودة: {len(actions)} إشارة")
        for action, count in actions:
            print(f"  • {action}: {count} تسلسل")
    else:
        print(f"❌ مجلد البيانات غير موجود: {data_path}")

    print("\n🎉 النظام جاهز للترجمة!")
    print("💡 يمكنك الآن تشغيل التطبيق الرئيسي")

if __name__ == "__main__":
    check_model()