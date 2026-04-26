#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
أمثلة عملية لاستخدام معالجات البيانات الخارجية
Practical Examples for External Data Processors

يوضح كيفية استخدام جميع المعالجات بطرق مختلفة
"""

import os
import sys

# ==================== مثال 1: معالجة صور ArASL ====================

def example_1_process_arasil_images():
    """
    مثال: معالجة صور الحروف من ArASL2018
    """
    print("\n" + "="*70)
    print("مثال 1: معالجة صور ArASL2018")
    print("="*70)
    
    from ml_pipeline.process_external_datasets import ExternalDatasetProcessor
    
    processor = ExternalDatasetProcessor(
        output_dir='MP_Data',
        sequence_length=30
    )
    
    # معالجة مجلد يحتوي على صور الحرف "ح"
    processor.process_images_dataset(
        input_dir='./external_data/ArASL2018/ح',
        label='ح'  # اسم الحرف
    )
    
    print("✅ اكتملت معالجة صور الحرف 'ح'")

# ==================== مثال 2: معالجة فيديوهات KArSL ====================

def example_2_process_karasl_videos():
    """
    مثال: معالجة فيديوهات الكلمات من KArSL
    """
    print("\n" + "="*70)
    print("مثال 2: معالجة فيديوهات KArSL")
    print("="*70)
    
    from ml_pipeline.process_external_datasets import ExternalDatasetProcessor
    
    processor = ExternalDatasetProcessor(
        output_dir='MP_Data',
        sequence_length=30
    )
    
    # معالجة مجلد يحتوي على فيديوهات الكلمة "مرحبا"
    num_sequences = processor.process_videos_directory(
        input_dir='./external_data/KArSL/مرحبا',
        label='مرحبا'
    )
    
    print(f"✅ تم معالجة {num_sequences} تسلسل من كلمة 'مرحبا'")

# ==================== مثال 3: معالجة ملفات Skeleton ====================

def example_3_process_skeleton_files():
    """
    مثال: معالجة ملفات Skeleton الجاهزة من ArabSign
    """
    print("\n" + "="*70)
    print("مثال 3: معالجة ملفات Skeleton من ArabSign")
    print("="*70)
    
    from ml_pipeline.process_external_datasets import ExternalDatasetProcessor
    
    processor = ExternalDatasetProcessor(
        output_dir='MP_Data',
        sequence_length=30
    )
    
    # معالجة ملفات Skeleton للجملة الأولى
    processor.process_skeleton_files(
        input_dir='./external_data/ArabSign/sentence_1',
        label='sent_1'
    )
    
    print("✅ اكتملت معالجة ملفات Skeleton")

# ==================== مثال 4: معالجة دفعية ====================

def example_4_batch_processing():
    """
    مثال: معالجة دفعية لجميع المصادر
    """
    print("\n" + "="*70)
    print("مثال 4: معالجة دفعية شاملة")
    print("="*70)
    
    from ml_pipeline.batch_process_datasets import BatchDatasetProcessor
    
    processor = BatchDatasetProcessor(
        output_dir='MP_Data',
        sequence_length=30
    )
    
    # 1. إنشاء ملف تكوين
    print("\n1️⃣ إنشاء ملف التكوين...")
    config = processor.create_config_template()
    
    # 2. معالجة البيانات
    print("\n2️⃣ معالجة البيانات...")
    processor.process_batch(config_file='datasets_config.json')
    
    # 3. إنشاء معلومات البيانات
    print("\n3️⃣ إنشاء ملف المعلومات...")
    processor.generate_dataset_info()
    
    print("\n✅ اكتملت المعالجة الدفعية!")

# ==================== مثال 5: التدريب على بيانات متعددة المصادر ====================

def example_5_train_multi_source():
    """
    مثال: تدريب نموذج على بيانات من مصادر مختلفة
    """
    print("\n" + "="*70)
    print("مثال 5: التدريب على مصادر متعددة")
    print("="*70)
    
    from ml_pipeline.train_multi_source import MultiSourceLSTMTrainer
    
    trainer = MultiSourceLSTMTrainer(
        data_path='MP_Data',
        sequence_length=30
    )
    
    # 1. تحميل البيانات
    print("\n1️⃣ تحميل البيانات...")
    X, y, actions = trainer.load_data_with_validation()
    
    if X is None:
        print("❌ لا توجد بيانات!")
        return
    
    # 2. التدريب
    print("\n2️⃣ بدء التدريب...")
    model, history = trainer.train(
        X, y, actions,
        epochs=50,  # عدد أقل للاختبار السريع
        batch_size=32
    )
    
    print("\n✅ اكتمل التدريب!")

# ==================== مثال 6: معالجة فئات قاموس لغة الإشارة الإماراتي ====================

def example_6_process_uae_dictionary():
    """
    مثال: معالجة فئات قاموس لغة الإشارة الإماراتي من مجلد الصور.
    """
    print("\n" + "="*70)
    print("مثال 6: معالجة فئات قاموس لغة الإشارة الإماراتي")
    print("="*70)

    from ml_pipeline.process_uae_categories import process_uae_category_images

    process_uae_category_images(
        base_dir='./external_data/UAE_Sign_Dictionary',
        output_dir='MP_Data'
    )

    print("✅ انتهت معالجة فئات القاموس الإماراتي")

# ==================== مثال 7: معالجة مخصصة بخيارات متقدمة ====================

def example_7_advanced_options():
    """
    مثال: معالجة مع خيارات متقدمة
    """
    print("\n" + "="*70)
    print("مثال 6: خيارات متقدمة")
    print("="*70)
    
    from ml_pipeline.process_external_datasets import ExternalDatasetProcessor
    
    processor = ExternalDatasetProcessor(
        output_dir='MP_Data',
        sequence_length=45  # تسلسل أطول
    )
    
    # معالجة مع معدل أخذ عينات مختلف
    print("معالجة فيديو مع stride=2 (كل إطار ثاني)...")
    processor.process_video_file(
        video_path='./video.mp4',
        label='custom_word',
        sequence_num=0,
        stride=2  # خذ كل إطار ثاني
    )
    
    print("✅ اكتملت المعالجة مع الخيارات المتقدمة!")

# ==================== مثال 7: معالجة محمية بمعالجة الأخطاء ====================

def example_7_error_handling():
    """
    مثال: معالجة آمنة مع التعامل مع الأخطاء
    """
    print("\n" + "="*70)
    print("مثال 7: معالجة الأخطاء")
    print("="*70)
    
    from ml_pipeline.process_external_datasets import ExternalDatasetProcessor
    
    processor = ExternalDatasetProcessor(
        output_dir='MP_Data',
        sequence_length=30
    )
    
    # قائمة من المجلدات
    labels = ['ح', 'ا', 'ت']
    
    for label in labels:
        try:
            print(f"\nمعالجة: {label}")
            
            processor.process_images_dataset(
                input_dir=f'./external_data/ArASL/{label}',
                label=label
            )
            
            print(f"✅ اكتملت معالجة {label}")
        
        except FileNotFoundError:
            print(f"⚠️ المجلد غير موجود: {label}")
        
        except Exception as e:
            print(f"❌ خطأ في معالجة {label}: {e}")
            continue
    
    print("\n✅ انتهت المعالجة الآمنة!")

# ==================== مثال 8: مراقبة التقدم ====================

def example_8_progress_monitoring():
    """
    مثال: مراقبة التقدم والإحصائيات
    """
    print("\n" + "="*70)
    print("مثال 8: مراقبة التقدم")
    print("="*70)
    
    import json
    
    # قراءة إحصائيات المعالجة
    try:
        with open('MP_Data/processing_stats.json', 'r', encoding='utf-8') as f:
            stats = json.load(f)
        
        print("\n📊 إحصائيات المعالجة:")
        print(f"إجمالي التسلسلات: {stats['total_sequences']}")
        
        print("\n📋 التفاصيل حسب المصدر:")
        for source_name, stats_data in stats['sources'].items():
            print(f"  {source_name}: {stats_data['sequences']} تسلسل")
    
    except FileNotFoundError:
        print("⚠️ لم يتم العثور على ملف الإحصائيات")
        print("تأكد من تشغيل المعالج أولاً")

# ==================== مثال 9: التدريب مع التحقق من البيانات ====================

def example_9_validate_training():
    """
    مثال: التدريب مع التحقق من سلامة البيانات
    """
    print("\n" + "="*70)
    print("مثال 9: التدريب مع التحقق")
    print("="*70)
    
    import numpy as np
    from ml_pipeline.train_multi_source import MultiSourceLSTMTrainer
    
    trainer = MultiSourceLSTMTrainer(data_path='MP_Data', sequence_length=30)
    
    # تحميل البيانات
    X, y, actions = trainer.load_data_with_validation()
    
    if X is not None:
        # فحص البيانات
        print(f"\n✅ فحص البيانات:")
        print(f"  عدد التسلسلات: {X.shape[0]}")
        print(f"  طول التسلسل: {X.shape[1]}")
        print(f"  عدد الميزات: {X.shape[2]}")
        print(f"  عدد الفئات: {y.shape[1]}")
        
        # التحقق من القيم
        print(f"\n  الحد الأدنى للقيمة: {X.min():.3f}")
        print(f"  الحد الأقصى للقيمة: {X.max():.3f}")
        print(f"  المتوسط: {X.mean():.3f}")
        
        # الفئات
        print(f"\n  الفئات المكتشفة: {len(actions)}")
        for i, action in enumerate(actions[:5]):
            count = (y[:, i] == 1).sum()
            print(f"    {action}: {count} عينة")

# ==================== قائمة الأمثلة ====================

EXAMPLES = {
    '1': ('معالجة صور ArASL2018', example_1_process_arasil_images),
    '2': ('معالجة فيديوهات KArSL', example_2_process_karasl_videos),
    '3': ('معالجة ملفات Skeleton', example_3_process_skeleton_files),
    '4': ('معالجة دفعية شاملة', example_4_batch_processing),
    '5': ('التدريب على مصادر متعددة', example_5_train_multi_source),
    '6': ('خيارات متقدمة', example_6_advanced_options),
    '7': ('معالجة الأخطاء', example_7_error_handling),
    '8': ('مراقبة التقدم', example_8_progress_monitoring),
    '9': ('التدريب مع التحقق', example_9_validate_training),
}

def main():
    """القائمة الرئيسية"""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("\n" + "🌍 أمثلة استخدام معالجات البيانات الخارجية".center(70, "="))
    
    print("\n اختر المثال الذي تريد تشغيله:\n")
    
    for key, (description, _) in EXAMPLES.items():
        print(f"  {key}. {description}")
    
    print(f"  0. الخروج")
    
    choice = input("\nاختيارك: ").strip()
    
    if choice == '0':
        return
    
    if choice in EXAMPLES:
        _, example_func = EXAMPLES[choice]
        try:
            example_func()
        except Exception as e:
            print(f"\n❌ خطأ: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("❌ اختيار غير صحيح")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # تشغيل مثال محدد من سطر الأوامر
        example_num = sys.argv[1]
        if example_num in EXAMPLES:
            _, example_func = EXAMPLES[example_num]
            example_func()
        else:
            print(f"❌ مثال غير موجود: {example_num}")
    else:
        # عرض القائمة التفاعلية
        main()
