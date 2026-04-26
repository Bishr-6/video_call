#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
معالجة فئات القاموس الإماراتي للغة الإشارة
UAE Sign Language Dictionary Category Processor

هذا السكريبت يساعدك على إنشاء بنية المجلدات للفئات الموجودة في قاموس
UAE Sign Language Dictionary، ثم معالجتها باستخدام MediaPipe وتحويلها إلى
هيئة `MP_Data` للتدريب.
"""

import os
from pathlib import Path
from process_external_datasets import ExternalDatasetProcessor

UAE_CATEGORIES = [
    'الأرقام',
    'الأفعال الشائعة',
    'الحروف الهجائية',
    'السمات والمواقف',
    'العائلة',
    'المطابخ الشعبية',
    'المعالم والمواقع',
    'الملابس وأدوات النظافة',
    'الوزارات والإدارات',
    'الاتجاهات والمواقع',
    'الألقاب والمهن',
    'الألوان',
    'البيت وملحقاته',
    'التربية والتعليم',
    'الحيوانات',
    'الرياضة',
    'الصحة',
    'المحيط والبيئة',
    'النباتات'
]

EXTERNAL_DIR = Path('external_data/UAE_Sign_Dictionary')
OUTPUT_DIR = Path('MP_Data')
SEQUENCE_LENGTH = 30


def create_uae_category_directories(base_dir=EXTERNAL_DIR):
    """إنشاء مجلدات فئات القاموس الإماراتي"""
    base_dir.mkdir(parents=True, exist_ok=True)
    for category in UAE_CATEGORIES:
        category_dir = base_dir / category
        category_dir.mkdir(exist_ok=True)
    print(f"✅ تم إنشاء بنية مجلدات الفئات في: {base_dir}")
    print("📌 الآن ضع صور أو فيديوهات كل فئة داخل المجلد الخاص بها.")


def process_uae_category_images(base_dir=EXTERNAL_DIR, output_dir=OUTPUT_DIR):
    """معالجة جميع الفئات المتوفرة في مجلد القاموس الإماراتي"""
    processor = ExternalDatasetProcessor(output_dir=str(output_dir), sequence_length=SEQUENCE_LENGTH)

    if not base_dir.exists():
        print(f"❌ لم يتم العثور على المجلد: {base_dir}")
        return

    total_processed = 0
    for category in UAE_CATEGORIES:
        category_path = base_dir / category
        if not category_path.exists():
            print(f"⚠️ الفئة غير موجودة بعد: {category}")
            continue

        # معالجة الصور داخل كل فئة
        processed = processor.process_images_dataset(str(category_path), label=category)
        total_processed += processed

    print("\n" + "="*60)
    print(f"✅ انتهت معالجة فئات UAE Dictionary. إجمالي الصور المعالجة: {total_processed}")
    print(f"🔧 البيانات جاهزة الآن في: {output_dir}")


def print_usage():
    print("استخدام:")
    print("  python process_uae_categories.py --create-folders")
    print("  python process_uae_categories.py --process")


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='معالجة فئات قاموس لغة الإشارة الإماراتي')
    parser.add_argument('--create-folders', action='store_true', help='إنشاء مجلدات الفئات داخل external_data/UAE_Sign_Dictionary')
    parser.add_argument('--process', action='store_true', help='معالجة الصور الموجودة في المجلدات إلى MP_Data')
    parser.add_argument('--output', type=str, default=str(OUTPUT_DIR), help='مسار مجلد الإخراج')
    parser.add_argument('--input', type=str, default=str(EXTERNAL_DIR), help='مسار مجلد القاموس الإماراتي')
    args = parser.parse_args()

    EXTERNAL_DIR = Path(args.input)
    OUTPUT_DIR = Path(args.output)

    if args.create_folders:
        create_uae_category_directories(EXTERNAL_DIR)
    elif args.process:
        process_uae_category_images(EXTERNAL_DIR, OUTPUT_DIR)
    else:
        print_usage()