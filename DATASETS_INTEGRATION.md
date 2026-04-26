# دليل دمج المصادر الخارجية للبيانات
## Integration Guide for External Arabic Sign Language Datasets

---

## 📊 المصادر المدعومة

### 1. **KArSL** - الأكبر والأشمل
- **النوع**: فيديو + Skeleton (نقاط المفاصل) + عمق
- **الحجم**: 502 كلمة | 75,300 مقطع فيديو
- **المعلمون**: 3 معلمين × 50 تكرار لكل كلمة
- **الرابط**: https://www.kaggle.com/datasets/umdmemphis/kasl-arabic-sign-language-lexicon
- **الصيغة المدعومة**: `.mp4` أو ملفات Skeleton جاهزة
- **الملاءمة**: ⭐⭐⭐⭐⭐ (الأفضل - يحتوي على Skeleton جاهز)

### 2. **ArASL2018** - الحروف العربية (الأشهر)
- **النوع**: صور (Images)
- **الحجم**: 54,049 صورة | 32 حرف/إشارة
- **المنصة**: Mendeley Data
- **الرابط**: https://data.mendeley.com/datasets/z8zr0t4jhb/4
- **الصيغة**: `.jpg`
- **الملاءمة**: ⭐⭐⭐ (يتطلب استخراج Landmarks)

### 3. **ArYSL** - اللهجة اليمنية
- **النوع**: صور (Images)
- **الحجم**: 35,900 صورة | 32 فئة + 357 كلمة
- **المنصة**: FigShare
- **الرابط**: https://figshare.com/articles/ArYSL_Arabic_Sign_Language_Dataset/7440476
- **الصيغة**: `.jpg` / `.png`
- **الملاءمة**: ⭐⭐⭐ (يتطلب استخراج Landmarks)

### 4. **ArabSign** - جمل متصلة (مستوى متقدم)
- **النوع**: فيديو + Skeleton + عمق
- **الحجم**: 9,335 عينة | 50 جملة | 155 إشارة
- **المنصة**: CSCI Lab (يتطلب إيميل)
- **الصيغة**: `.mp4` + `.npy` (Skeleton)
- **الملاءمة**: ⭐⭐⭐⭐⭐ (متقدم - للجمل الكاملة)

### 6. **SIMPAC-2025-43** - نظام شامل للتعرف على لغة الإشارة العربية
- **النوع**: فيديو + كود + نموذج مدرب
- **الحجم**: نظام كامل مع بيانات تجريبية
- **المنصة**: GitHub (Software Impacts)
- **الرابط**: https://github.com/SoftwareImpacts/SIMPAC-2025-43
- **الصيغة**: Python + MediaPipe + Deep Learning
- **الملاءمة**: ⭐⭐⭐⭐⭐ (نظام كامل جاهز للاستخدام)

### 7. **ChaimaMansouri-ASL** - نظام كشف لغة الإشارة العربية
- **النوع**: كود + نموذج + بيانات تجريبية
- **الحجم**: نظام كامل مع تطبيق
- **المنصة**: GitHub
- **الرابط**: https://github.com/ChaimaMansouri/Arabic-Sign-Language-Detection
- **الصيغة**: Python + Machine Learning
- **الملاءمة**: ⭐⭐⭐⭐⭐ (نظام كامل مع تطبيق)

---

## 🔄 كيفية معالجة كل نوع بيانات

### معالجة الصور (ArASL, ArYSL, AASL)
```
صور JPG/PNG
    ↓
استخراج Landmarks باستخدام MediaPipe
    ↓
تحويل إلى Sequences (تسلسلات)
    ↓
حفظ كـ .npy files
    ↓
تدريب LSTM
```

### معالجة الفيديوهات (KArSL, ArabSign)
```
فيديو MP4
    ↓
استخراج Frames
    ↓
استخراج Landmarks من كل Frame
    ↓
تجميع في Sequences
    ↓
حفظ كـ .npy files
    ↓
تدريب LSTM
```

---

## 📂 هيكل المجلدات المتوقع

```
ML_Data/
├── KArSL/
│   ├── كلمة1/
│   │   ├── video_1.mp4
│   │   └── skeleton_1.npy
│   └── كلمة2/
├── ArASL/
│   ├── ح/
│   │   ├── image1.jpg
│   │   └── image2.jpg
│   └── ا/
├── ArYSL/
│   ├── class_1/
│   │   └── *.jpg
│   └── class_2/
├── ArabSign/
│   ├── جملة_1/
│   │   ├── video.mp4
│   │   └── skeleton.npy
│   └── جملة_2/
├── AASL/
│   ├── letter_0/
│   │   └── *.jpg
│   └── letter_1/
└── MP_Data/ (البيانات المحلية المجمعة)
    ├── كلمة_محلية_1/
    └── كلمة_محلية_2/
```

---

## 🛠️ الخطوات التالية

يجب إنشاء السكريبتات التالية:

1. ✅ `process_images.py` - معالجة الصور واستخراج Landmarks
2. ✅ `process_videos.py` - معالجة الفيديوهات واستخراج Landmarks
3. ✅ `process_skeleton.py` - معالجة ملفات Skeleton الجاهزة
4. ✅ `convert_external_to_npy.py` - تحويل جميع المصادر الخارجية إلى صيغة .npy موحدة
5. ✅ `train_multi_source.py` - تدريب النموذج على بيانات من مصادر متعددة

---

## ⚙️ الملاءمة مع الكود الحالي

| نوع البيانات | معالجة مطلوبة | التعقيد | الأولوية |
|---|---|---|---|
| صور (ArASL, ArYSL, AASL) | ✅ استخراج Landmarks | متوسط | عالية |
| فيديو + Skeleton (KArSL, ArabSign) | ⚠️ تحويل صيغة | منخفض | عالية جداً |
| فيديو عادي | ✅ استخراج Landmarks | متوسط | متوسطة |

**الأولوية الأولى**: KArSL و ArabSign (لأنهما يحتويان على Skeleton جاهز)
**الأولوية الثانية**: صور (ArASL, ArYSL, AASL)
