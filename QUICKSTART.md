# 🚀 دليل البدء السريع - Quick Start Guide

## 5 دقائق إلى البدء | Get Started in 5 Minutes

### Step 1: تحضير البيئة (1 دقيقة)

```bash
# تأكد من تثبيت Node.js
node --version  # يجب أن تكون ≥ 16
npm --version   # يجب أن تكون ≥ 8
```

### Step 2: تثبيت المشروع (2 دقيقة)

```bash
cd SignLanguageComm

# Backend
cd backend
npm install

# Frontend (في terminal جديد)
cd ../frontend
npm install
```

### Step 3: بدء الخادم (1 دقيقة)

```bash
# Terminal 1: Backend
cd backend
npm run dev

# يجب أن ترى:
# 🚀 Server running on http://localhost:5000
# ✅ WebSocket server ready
```

### Step 4: بدء التطبيق (1 دقيقة)

```bash
# Terminal 2: Frontend
cd frontend
npm run dev

# يجب أن ترى:
# ✅ ready on http://localhost:3000
```

### Step 5: جرّب الآن!

افتح متصفح وذهب إلى: **http://localhost:3000**

---

## 🧪 اختبار سريع

```bash
# تحقق من أن الخادم يعمل
curl http://localhost:5000/health

# النتيجة المتوقعة:
# {
#   "status": "healthy",
#   "timestamp": "2026-04-22T10:30:00Z",
#   "activeSessions": 0
# }
```

---

## ⚙️ متغيرات البيئة

### Backend (.env)

```bash
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

## 📁 ملفات مهمة

| الملف | الوصف |
|------|--------|
| `backend/server.js` | الخادم الرئيسي |
| `frontend/src/App.tsx` | المكون الرئيسي |
| `docs/ARCHITECTURE.md` | المعمارية |

---

## 🐛 استكشاف المشاكل الشائعة

### ❌ الخادم لا يبدأ

```bash
# قد يكون المنفذ مستخدماً
# جرّب:
npx kill-port 5000
npm run dev
```

### ❌ الاتصال لا يعمل

```javascript
// فتح DevTools (F12)
// انظر إلى Console للأخطاء
// تحقق من أن الخادم يعمل: http://localhost:5000/health
```

### ❌ الكاميرا لا تعمل

```javascript
// في المتصفح
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log(devices))
// يجب أن ترى الكاميرا والميكروفون
```

---

## 🎯 الخطوات التالية

1. ✅ فهم [ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. ✅ تعديل [frontend/src/App.tsx](frontend/src/App.tsx)
3. ✅ إضافة ميزات جديدة
4. ✅ الاختبار والنشر

---

## 📚 موارد مفيدة

- [React Documentation](https://react.dev)
- [Node.js API](https://nodejs.org/api/)
- [Socket.io Guide](https://socket.io/docs/)
- [MediaPipe](https://developers.google.com/mediapipe)

---

## 💬 هل تحتاج مساعدة؟

- اقرأ [DEPLOYMENT.md](docs/DEPLOYMENT.md)
- افتح Issue على GitHub
- اتصل بنا: support@your-domain.com

---

**Happy coding! 🎉**
