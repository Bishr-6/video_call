import numpy as np
import os
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import TensorBoard

# مسار البيانات
DATA_PATH = os.path.join('MP_Data')

# قراءة الكلمات التي تم تسجيلها تلقائياً من أسماء المجلدات
actions = np.array([name for name in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, name))])
print("\n🔍 الكلمات/الحروف المكتشفة لتدريب الذكاء الاصطناعي:", actions)

if len(actions) < 2:
    print("\n❌ خطأ: يجب أن يكون لديك إشارتين (حرفين أو كلمتين) على الأقل لكي يستطيع الذكاء الاصطناعي التمييز بينهما.")
    print("الرجاء تشغيل سكريبت data_collection.py وتسجيل حركة أخرى إضافية.")
    exit()

# الإعدادات
no_sequences = 30
sequence_length = 30

# تحويل الكلمات إلى أرقام (Label Encoding)
label_map = {label:num for num, label in enumerate(actions)}

print("\n⚙️ جاري تجهيز ومعالجة البيانات...")
sequences, labels = [], []
for action in actions:
    for sequence in np.array(os.listdir(os.path.join(DATA_PATH, action))).astype(int):
        window = []
        for frame_num in range(sequence_length):
            res = np.load(os.path.join(DATA_PATH, action, str(sequence), "{}.npy".format(frame_num)))
            window.append(res)
        sequences.append(window)
        labels.append(label_map[action])

# تحويل البيانات إلى مصفوفات Numpy
X = np.array(sequences)
y = to_categorical(labels).astype(int)

# تقسيم البيانات إلى قسم للتدريب وقسم للاختبار (95% تدريب، 5% اختبار)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.05)

# ----------------- بناء العقل الاصطناعي (LSTM) -----------------
print("\n🧠 جاري بناء الشبكة العصبية (LSTM)...")
log_dir = os.path.join('Logs')
tb_callback = TensorBoard(log_dir=log_dir)

model = Sequential()
# الطبقة الأولى LSTM
model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(sequence_length, 126)))
# الطبقة الثانية LSTM
model.add(LSTM(128, return_sequences=True, activation='relu'))
# الطبقة الثالثة LSTM
model.add(LSTM(64, return_sequences=False, activation='relu'))
# طبقات عادية لفهم البيانات بشكل أفضل
model.add(Dense(64, activation='relu'))
model.add(Dense(32, activation='relu'))
# طبقة الإخراج (النتيجة النهائية)
model.add(Dense(actions.shape[0], activation='softmax'))

# تجميع النموذج
model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

# بدء عملية التدريب (التعلم)
print("\n🚀 بدء عملية التعلم والتدريب... (قد يستغرق بضع دقائق حسب سرعة جهازك)")
model.fit(X_train, y_train, epochs=200, callbacks=[tb_callback])

print("\n✅ التدريب اكتمل بنجاح!")
# حفظ "العقل الاصطناعي" في ملف
model.save('sign_language_model.h5')
print("تم حفظ النموذج النهائي باسم 'sign_language_model.h5'")
print("يمكننا الآن ربطه بالكاميرا للترجمة الفورية!")
