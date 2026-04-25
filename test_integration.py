#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
اختبار سريع لعملية التكامل
Quick Test for Integration Process

يختبر جميع المكونات الجديدة
"""

import os
import sys
import json
import numpy as np
from pathlib import Path

def test_imports():
    """اختبار استيراد المكتبات الأساسية"""
    print("\n" + "="*70)
    print("🔍 اختبار المكتبات المطلوبة...")
    print("="*70)
    
    required_packages = {
        'cv2': 'opencv-python',
        'numpy': 'numpy',
        'mediapipe': 'mediapipe',
        'tensorflow': 'tensorflow',
        'sklearn': 'scikit-learn',
        'tqdm': 'tqdm'
    }
    
    missing = []
    for module, package in required_packages.items():
        try:
            __import__(module)
            print(f"✅ {package:20} موجود")
        except ImportError:
            print(f"❌ {package:20} غير موجود")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️ المكتبات المفقودة: {', '.join(missing)}")
        print(f"قم بتثبيتها باستخدام:")
        for package in missing:
            print(f"  pip install {package}")
        return False
    
    print("\n✅ جميع المكتبات موجودة!")
    return True

def test_file_structure():
    """اختبار وجود جميع الملفات الجديدة"""
    print("\n" + "="*70)
    print("📁 اختبار هيكل الملفات...")
    print("="*70)
    
    required_files = {
        'ml_pipeline/process_external_datasets.py': '✨ معالج البيانات الخارجية',
        'ml_pipeline/batch_process_datasets.py': '✨ المعالج الدفعي',
        'ml_pipeline/train_multi_source.py': '✨ التدريب المحسّن',
        'ml_pipeline/datasets_config.json': '⚙️ ملف التكوين',
        'DATASETS_INTEGRATION.md': '📄 التوثيق',
        'EXTERNAL_DATASETS_GUIDE.md': '📖 الدليل الشامل',
        'EXTERNAL_DATASETS_COMPLETE_GUIDE.md': '📚 الدليل الكامل',
        'SOURCES_INTEGRATION_SUMMARY.md': '📋 الملخص'
    }
    
    missing = []
    for filepath, description in required_files.items():
        if os.path.exists(filepath):
            print(f"✅ {description:30} {filepath}")
        else:
            print(f"❌ {description:30} {filepath}")
            missing.append(filepath)
    
    if missing:
        print(f"\n⚠️ ملفات مفقودة: {len(missing)}")
        return False
    
    print("\n✅ جميع الملفات موجودة!")
    return True

def test_config_file():
    """اختبار ملف التكوين"""
    print("\n" + "="*70)
    print("⚙️ اختبار ملف التكوين...")
    print("="*70)
    
    config_file = 'ml_pipeline/datasets_config.json'
    
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print(f"✅ تم تحميل {config_file}")
        print(f"   الإصدار: {config.get('version', 'غير محدد')}")
        print(f"   عدد المصادر: {len(config.get('datasets', []))}")
        
        for dataset in config.get('datasets', []):
            status = "🟢 مفعل" if dataset.get('enabled') else "🔴 معطل"
            print(f"   {status} {dataset.get('name', 'Unknown'):20} ({dataset.get('type')})")
        
        return True
    except Exception as e:
        print(f"❌ خطأ في قراءة التكوين: {e}")
        return False

def test_data_structure():
    """اختبار هيكل البيانات الموجودة"""
    print("\n" + "="*70)
    print("📂 اختبار البيانات الموجودة...")
    print("="*70)
    
    mp_data_dir = 'ml_pipeline/MP_Data'
    
    if not os.path.exists(mp_data_dir):
        print(f"⚠️ لم يتم العثور على {mp_data_dir}")
        print("هذا طبيعي إذا لم تقم بجمع البيانات بعد")
        return True
    
    labels = [d for d in os.listdir(mp_data_dir) 
              if os.path.isdir(os.path.join(mp_data_dir, d))]
    
    print(f"✅ عدد الفئات: {len(labels)}")
    
    total_sequences = 0
    total_frames = 0
    
    for label in labels[:5]:  # عرض أول 5 فقط
        label_path = os.path.join(mp_data_dir, label)
        sequences = [d for d in os.listdir(label_path) 
                    if os.path.isdir(os.path.join(label_path, d))]
        
        seq_count = len(sequences)
        total_sequences += seq_count
        
        # عد الإطارات في أول تسلسل
        if sequences:
            first_seq_path = os.path.join(label_path, sequences[0])
            frames = len([f for f in os.listdir(first_seq_path) if f.endswith('.npy')])
            total_frames += frames
            print(f"   {label:20} {seq_count:3} تسلسل | ~{frames} إطار")
    
    print(f"\n✅ إجمالي: {total_sequences} تسلسل")
    return True

def test_mp_data_sample():
    """اختبار تحميل عينة من البيانات"""
    print("\n" + "="*70)
    print("🧪 اختبار تحميل عينة بيانات...")
    print("="*70)
    
    mp_data_dir = 'ml_pipeline/MP_Data'
    
    if not os.path.exists(mp_data_dir):
        print("⚠️ لا توجد بيانات بعد")
        return True
    
    labels = [d for d in os.listdir(mp_data_dir) 
              if os.path.isdir(os.path.join(mp_data_dir, d))]
    
    if not labels:
        print("⚠️ لا توجد فئات في البيانات")
        return True
    
    # تحميل أول فئة
    label = labels[0]
    label_path = os.path.join(mp_data_dir, label)
    sequences = [d for d in os.listdir(label_path) 
                if os.path.isdir(os.path.join(label_path, d))]
    
    if not sequences:
        print("⚠️ لا توجد تسلسلات في الفئة الأولى")
        return True
    
    # تحميل أول تسلسل
    seq_path = os.path.join(label_path, sequences[0])
    npy_files = sorted([f for f in os.listdir(seq_path) if f.endswith('.npy')],
                       key=lambda x: int(x.split('.')[0]))
    
    try:
        # تحميل أول إطار
        first_frame = np.load(os.path.join(seq_path, npy_files[0]))
        
        print(f"✅ تم تحميل عينة:")
        print(f"   الفئة: {label}")
        print(f"   التسلسل: {sequences[0]}")
        print(f"   عدد الإطارات: {len(npy_files)}")
        print(f"   شكل البيانات: {first_frame.shape}")
        print(f"   نوع البيانات: {first_frame.dtype}")
        
        if first_frame.shape == (126,):
            print("✅ البيانات في الصيغة الصحيحة (21 نقطة × 3 좌표 × 2 يد)")
        else:
            print(f"⚠️ شكل البيانات غير متوقع: {first_frame.shape}")
        
        return True
    except Exception as e:
        print(f"❌ خطأ في تحميل البيانات: {e}")
        return False

def run_all_tests():
    """تشغيل جميع الاختبارات"""
    print("\n" + "🌍 اختبار تكامل المصادر الخارجية".center(70, "="))
    
    tests = [
        ("المكتبات", test_imports),
        ("هيكل الملفات", test_file_structure),
        ("ملف التكوين", test_config_file),
        ("هيكل البيانات", test_data_structure),
        ("عينة البيانات", test_mp_data_sample)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n❌ خطأ في اختبار {test_name}: {e}")
            results[test_name] = False
    
    # ملخص النتائج
    print("\n" + "="*70)
    print("📊 ملخص النتائج")
    print("="*70)
    
    for test_name, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {test_name:20}")
    
    total = len(results)
    passed = sum(1 for r in results.values() if r)
    
    print(f"\n{passed}/{total} اختبار نجح")
    
    if passed == total:
        print("\n🎉 جميع الاختبارات نجحت!")
        print("\n📚 الخطوات التالية:")
        print("1. اقرأ EXTERNAL_DATASETS_GUIDE.md")
        print("2. حمل البيانات من المصادر الخارجية")
        print("3. عدّل datasets_config.json")
        print("4. شغّل: python ml_pipeline/batch_process_datasets.py")
        print("5. شغّل: python ml_pipeline/train_multi_source.py")
    else:
        print("\n⚠️ بعض الاختبارات لم تنجح")
        print("تحقق من الأخطاء أعلاه")
    
    return passed == total

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    success = run_all_tests()
    sys.exit(0 if success else 1)
