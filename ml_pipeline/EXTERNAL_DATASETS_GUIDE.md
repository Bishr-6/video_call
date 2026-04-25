# دليل دمج المصادر الخارجية - خطوة بخطوة
## Step-by-Step Guide for External Datasets Integration

---

## 🎯 الخطوة الأولى: تحضير البيانات

### 1.1 تحميل المصادر

#### KArSL (الأولوية الأولى)
```bash
# انتقل إلى موقع Kaggle وقم بالتحميل:
# https://www.kaggle.com/datasets/umdmemphis/kasl-arabic-sign-language-lexicon

# يمكنك استخدام Kaggle API:
pip install kaggle
kaggle datasets download -d umdmemphis/kasl-arabic-sign-language-lexicon
unzip kasl-arabic-sign-language-lexicon.zip -d external_data/KArSL
```

#### ArASL2018
```bash
# من Mendeley Data:
# https://data.mendeley.com/datasets/z8zr0t4jhb/4

# قم بالتحميل يدويًا ثم استخرج:
unzip ArASL2018.zip -d external_data/ArASL2018
```

#### ArYSL
```bash
# من FigShare:
# https://figshare.com/articles/ArYSL_Arabic_Sign_Language_Dataset/7440476

unzip ArYSL.zip -d external_data/ArYSL
```

#### ArabSign
```bash
# يتطلب إرسال إيميل للباحثين
# بعد الحصول على الملفات:
unzip ArabSign.zip -d external_data/ArabSign
```

#### AASL
```bash
# من Roboflow:
# https://universe.roboflow.com/

unzip AASL.zip -d external_data/AASL
```

---

## 🛠️ الخطوة الثانية: تثبيت المتطلبات

```bash
# تأكد من وجود جميع المتطلبات
pip install opencv-python mediapipe numpy tqdm scikit-learn tensorflow
```

---

## 📋 الخطوة الثالثة: إعداد التكوين

### 3.1 إنشاء ملف التكوين النموذجي

```bash
cd ml_pipeline
python batch_process_datasets.py --create-template
```

هذا سينشئ ملف `datasets_config.json` بهذا الشكل:

```json
{
  "datasets": [
    {
      "name": "KArSL",
      "type": "skeleton",
      "input_dir": "./external_data/KArSL",
      "labels": {
        "كلمة1": "word_1",
        "كلمة2": "word_2"
      },
      "enabled": true
    },
    ...
  ]
}
```

### 3.2 تحديث التكوين

عدّل `datasets_config.json` ليعكس بيانات لديك:

```json
{
  "name": "ArASL2018",
  "type": "images",
  "input_dir": "./external_data/ArASL2018",
  "labels": {
    "ح": "alef",
    "ا": "ba",
    "ت": "ta"
  },
  "enabled": true
}
```

---

## ⚙️ الخطوة الرابعة: معالجة البيانات

### 4.1 معالجة دفعية (الأسهل)

```bash
# معالجة جميع المصادر مرة واحدة
python batch_process_datasets.py

# أو مع تكوين مخصص
python batch_process_datasets.py --config custom_config.json
```

### 4.2 معالجة فردية

#### معالجة الصور
```bash
python process_external_datasets.py \
  --images ./external_data/ArASL2018/ح \
  --label "ح"
```

#### معالجة الفيديوهات
```bash
python process_external_datasets.py \
  --videos ./external_data/KArSL/word1 \
  --label "مرحبا"
```

#### معالجة ملفات Skeleton
```bash
python process_external_datasets.py \
  --skeleton ./external_data/ArabSign/sentence1 \
  --label "جملة_واحدة"
```

---

## 📊 الخطوة الخامسة: التحقق من النتائج

### 5.1 التحقق من هيكل البيانات

```bash
ls -la MP_Data/
# يجب أن ترى المجلدات بهذا الشكل:
# MP_Data/
# ├── ح/
# │   ├── 0/
# │   │   ├── 0.npy
# │   │   ├── 1.npy
# │   │   ...
# │   └── 1/
# ├── ا/
# └── مرحبا/
```

### 5.2 التحقق من الإحصائيات

```bash
cat MP_Data/processing_stats.json
cat MP_Data/datasets_info.json
```

---

## 🚀 الخطوة السادسة: التدريب على البيانات المدمجة

### 6.1 تدريب النموذج

```bash
# النموذج سيكتشف تلقائيًا جميع الفئات
python train_lstm.py
```

### 6.2 الآن النموذج يعرف جميع المصادر! ✅

---

## 📈 المقاييس المتوقعة

| المصدر | عدد الفئات | عدد التسلسلات | التأثير على الدقة |
|---|---|---|---|
| KArSL | 502 كلمة | ~75,000 | ⭐⭐⭐⭐⭐ |
| ArASL2018 | 32 حرف | 54,000 | ⭐⭐⭐⭐ |
| ArYSL | 32 + 357 | 35,000 | ⭐⭐⭐⭐ |
| ArabSign | 50 جملة | ~9,000 | ⭐⭐⭐⭐ |
| AASL | 31 حرف | 21,000 | ⭐⭐⭐ |

---

## 🐛 استكشاف الأخطاء

### مشكلة: "No images found"

```
❌ تأكد من أن مسار المجلد صحيح
✅ تحقق من أنواع الملفات (.jpg, .png, .mp4)
✅ تأكد من أن المجلد يحتوي على ملفات وليس مجلدات فقط
```

### مشكلة: "No hands detected"

```
❌ قد يكون الفيديو/الصورة بجودة منخفضة
✅ جرب تقليل min_detection_confidence في الكود
✅ تأكد من وضوح اليدين في الصورة/الفيديو
```

### مشكلة: "Memory Error"

```
❌ قد تكون البيانات كبيرة جداً
✅ معالج الملفات الكبيرة على دفعات:
```

---

## 💡 نصائح مهمة

1. **ابدأ بـ KArSL أولاً** - لديه Skeleton جاهز، لا يحتاج استخراج
2. **اختبر مع عدد صغير من الملفات** قبل معالجة كل المصادر
3. **احفظ ملف التكوين الخاص بك** لإعادة المعالجة لاحقاً
4. **تحقق من الإحصائيات** بعد المعالجة للتأكد من نجاح العملية

---

## 📚 موارد إضافية

- [MediaPipe Holistic Documentation](https://google.github.io/mediapipe/solutions/holistic.html)
- [TensorFlow LSTM Guide](https://www.tensorflow.org/guide/keras/rnn)
- [OpenCV Video Processing](https://docs.opencv.org/master/d0/da7/videoio_overview.html)

---

## ✨ النتيجة النهائية

بعد اتباع هذه الخطوات، سيصبح نموذجك قادراً على:

✅ تصنيف **502 كلمة** من KArSL
✅ التعرف على **32 حرف** من ArASL2018
✅ فهم **357 كلمة** من ArYSL
✅ ترجمة **50 جملة** من ArabSign
✅ التعامل مع **31 إشارة** من AASL

**المجموع: 197+ فئة مختلفة من لغة الإشارة العربية!** 🎉
