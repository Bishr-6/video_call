"""
معالجة دفعية للمصادر الخارجية
Batch Processing Multiple External Datasets

يسمح بمعالجة عدة مصادر بيانات في وقت واحد
"""

import os
import json
from pathlib import Path
from process_external_datasets import ExternalDatasetProcessor
import argparse

class BatchDatasetProcessor:
    def __init__(self, output_dir='MP_Data', sequence_length=30):
        self.processor = ExternalDatasetProcessor(output_dir, sequence_length)
        self.output_dir = output_dir
        self.config_file = 'datasets_config.json'
        self.stats = {
            'sources': {},
            'total_sequences': 0,
            'total_processed': 0
        }
    
    def create_config_template(self):
        """إنشاء ملف تكوين نموذجي"""
        config = {
            "datasets": [
                {
                    "name": "KArSL",
                    "type": "skeleton",
                    "input_dir": "./external_data/KArSL",
                    "labels": {
                        "مرحبا": "word_1",
                        "شكرا": "word_2"
                    },
                    "enabled": True
                },
                {
                    "name": "ArASL2018",
                    "type": "images",
                    "input_dir": "./external_data/ArASL2018",
                    "labels": {
                        "ح": "class_1",
                        "ا": "class_2"
                    },
                    "enabled": True
                },
                {
                    "name": "ArYSL",
                    "type": "images",
                    "input_dir": "./external_data/ArYSL",
                    "labels": {
                        "حرف1": "yemeni_1",
                        "حرف2": "yemeni_2"
                    },
                    "enabled": True
                },
                {
                    "name": "ArabSign",
                    "type": "videos",
                    "input_dir": "./external_data/ArabSign",
                    "labels": {
                        "sentence_1": "sent_1",
                        "sentence_2": "sent_2"
                    },
                    "enabled": True
                },
                {
                    "name": "AASL",
                    "type": "images",
                    "input_dir": "./external_data/AASL",
                    "labels": {
                        "letter_0": "aasl_0",
                        "letter_1": "aasl_1"
                    },
                    "enabled": True
                }
            ]
        }
        
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print(f"✅ تم إنشاء ملف التكوين: {self.config_file}")
        return config
    
    def load_config(self, config_file=None):
        """تحميل ملف التكوين"""
        if config_file is None:
            config_file = self.config_file
        
        if not os.path.exists(config_file):
            print(f"⚠️ لم يتم العثور على ملف التكوين: {config_file}")
            print("إنشاء ملف تكوين جديد...")
            return self.create_config_template()
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print(f"✅ تم تحميل التكوين من: {config_file}")
        return config
    
    def process_batch(self, config_file=None):
        """معالجة جميع المصادر في ملف التكوين"""
        config = self.load_config(config_file)
        
        print("\n" + "="*60)
        print("🚀 بدء معالجة دفعية للمصادر الخارجية")
        print("="*60)
        
        total_sequences = 0
        
        for dataset in config['datasets']:
            if not dataset['enabled']:
                print(f"\n⏭️  تم تخطي {dataset['name']} (معطل)")
                continue
            
            print(f"\n{'='*60}")
            print(f"📦 معالجة: {dataset['name']} ({dataset['type']})")
            print(f"{'='*60}")
            
            input_dir = dataset['input_dir']
            
            if not os.path.exists(input_dir):
                print(f"⚠️ المجلد غير موجود: {input_dir}")
                continue
            
            dataset_stats = {'name': dataset['name'], 'type': dataset['type'], 'sequences': 0}
            
            try:
                if dataset['type'] == 'images':
                    # معالجة كل تصنيف بشكل منفصل
                    for label_dir in os.listdir(input_dir):
                        label_path = os.path.join(input_dir, label_dir)
                        if os.path.isdir(label_path):
                            processed = self.processor.process_images_dataset(
                                label_path,
                                label=dataset['labels'].get(label_dir, label_dir)
                            )
                            dataset_stats['sequences'] += processed
                
                elif dataset['type'] == 'videos':
                    # معالجة الفيديوهات
                    for label, label_name in dataset['labels'].items():
                        label_path = os.path.join(input_dir, label)
                        if os.path.isdir(label_path):
                            processed = self.processor.process_videos_directory(label_path, label_name)
                            dataset_stats['sequences'] += processed

                elif dataset['type'] == 'skeleton':
                    # معالجة ملفات Skeleton
                    processed = self.processor.process_skeleton_dataset(input_dir, dataset['labels'])
                    dataset_stats['sequences'] += processed

                elif dataset['type'] == 'mixed':
                    # معالجة مصادر مختلطة (مثل ChaimaMansouri-ASL)
                    processed = self._process_mixed_dataset(dataset)
                    dataset_stats['sequences'] += processed

                else:
                    print(f"⚠️ نوع غير مدعوم: {dataset['type']}")
                    continue
                
                self.stats['sources'][dataset['name']] = dataset_stats
                total_sequences += dataset_stats['sequences']
            
            except Exception as e:
                print(f"❌ خطأ في معالجة {dataset['name']}: {e}")
                dataset_stats['error'] = str(e)
                self.stats['sources'][dataset['name']] = dataset_stats
        
        self.stats['total_sequences'] = total_sequences
        self._print_summary()
        self._save_stats()

    def _process_mixed_dataset(self, dataset):
        """معالجة مصادر مختلطة مثل ChaimaMansouri-ASL"""
        input_dir = dataset['input_dir']
        total_processed = 0

        try:
            # استيراد وحدة الدمج
            if 'ChaimaMansouri' in dataset['name']:
                from chaima_asl_integration import ChaimaASLIntegration
                integrator = ChaimaASLIntegration(input_dir)

                if integrator.is_ready():
                    print("🔧 معالجة باستخدام نظام ChaimaMansouri-ASL")
                    # TODO: تنفيذ معالجة البيانات عند اكتمال الاستنساخ
                    print("ℹ️ النظام قيد التطوير - سيتم إضافة المعالجة لاحقاً")
                else:
                    print("⚠️ نظام ChaimaMansouri-ASL غير جاهز")

            elif 'SIMPAC' in dataset['name']:
                from simpac_integration import SIMPACIntegration
                integrator = SIMPACIntegration(input_dir)

                print("🔧 معالجة باستخدام نظام SIMPAC-2025-43")
                # TODO: تنفيذ معالجة البيانات من SIMPAC
                print("ℹ️ سيتم إضافة معالجة البيانات من SIMPAC لاحقاً")

            return total_processed

        except ImportError as e:
            print(f"⚠️ فشل استيراد وحدة الدمج: {e}")
            return 0
        except Exception as e:
            print(f"⚠️ خطأ في معالجة المصدر المختلط: {e}")
            return 0

    def _print_summary(self):
        """طباعة ملخص المعالجة"""
        print("\n" + "="*60)
        print("📊 ملخص المعالجة")
        print("="*60)
        
        for source_name, stats in self.stats['sources'].items():
            status = "✅" if 'error' not in stats else "❌"
            print(f"{status} {stats['name']} ({stats['type']}): {stats['sequences']} تسلسل")
            if 'error' in stats:
                print(f"   خطأ: {stats['error']}")
        
        print(f"\n📈 إجمالي التسلسلات المعالجة: {self.stats['total_sequences']}")
        print(f"💾 مسار الإخراج: {self.output_dir}")
        print("="*60)
    
    def _save_stats(self):
        """حفظ إحصائيات المعالجة"""
        stats_file = os.path.join(self.output_dir, 'processing_stats.json')
        os.makedirs(self.output_dir, exist_ok=True)
        
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(self.stats, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ تم حفظ الإحصائيات في: {stats_file}")
    
    def generate_dataset_info(self):
        """إنشاء ملف معلومات عن البيانات المعالجة"""
        os.makedirs(self.output_dir, exist_ok=True)
        
        info = {
            'description': 'معلومات البيانات المعالجة من مصادر خارجية متعددة',
            'sources': [
                {
                    'name': 'KArSL',
                    'url': 'https://www.kaggle.com/datasets/umdmemphis/kasl-arabic-sign-language-lexicon',
                    'type': 'skeleton',
                    'original_format': 'mp4 + npy skeleton',
                    'conversion': 'تم تحويل Skeleton إلى صيغة موحدة'
                },
                {
                    'name': 'ArASL2018',
                    'url': 'https://data.mendeley.com/datasets/z8zr0t4jhb/4',
                    'type': 'images',
                    'original_format': 'jpg',
                    'conversion': 'تم استخراج Landmarks باستخدام MediaPipe'
                },
                {
                    'name': 'ArYSL',
                    'url': 'https://figshare.com/articles/ArYSL_Arabic_Sign_Language_Dataset/7440476',
                    'type': 'images',
                    'original_format': 'jpg/png',
                    'conversion': 'تم استخراج Landmarks باستخدام MediaPipe'
                },
                {
                    'name': 'ArabSign',
                    'url': 'Contact: arabian.asl@csci.edu',
                    'type': 'videos + skeleton',
                    'original_format': 'mp4 + npy skeleton',
                    'conversion': 'تم تحويل Skeleton إلى صيغة موحدة'
                },
                {
                    'name': 'AASL',
                    'url': 'https://universe.roboflow.com/',
                    'type': 'images',
                    'original_format': 'jpg/png',
                    'conversion': 'تم استخراج Landmarks باستخدام MediaPipe'
                },
                {
                    'name': 'SIMPAC-2025-43',
                    'url': 'https://github.com/SoftwareImpacts/SIMPAC-2025-43',
                    'type': 'videos + code + model',
                    'original_format': 'mp4 + python + pkl',
                    'conversion': 'نظام شامل جاهز للاستخدام - SVM + MediaPipe'
                },
                {
                    'name': 'ChaimaMansouri-ASL',
                    'url': 'https://github.com/ChaimaMansouri/Arabic-Sign-Language-Detection',
                    'type': 'mixed (code + model + data)',
                    'original_format': 'python + model files + images',
                    'conversion': 'نظام كشف شامل للغة الإشارة العربية'
                }
            ],
            'unified_format': {
                'description': 'الصيغة الموحدة للبيانات بعد المعالجة',
                'structure': 'MP_Data/[label]/[sequence_num]/[frame_num].npy',
                'file_format': 'numpy arrays (.npy)',
                'array_shape': '(126,) - 21 landmark * 3 coords * 2 hands',
                'frame_features': '21 nقطة لليد اليسرى + 21 نقطة لليد اليمنى'
            }
        }
        
        info_file = os.path.join(self.output_dir, 'datasets_info.json')
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(info, f, indent=2, ensure_ascii=False)
        
        print(f"✅ تم إنشاء ملف المعلومات: {info_file}")

def main():
    parser = argparse.ArgumentParser(
        description='معالجة دفعية للمصادر الخارجية لغة الإشارة العربية'
    )
    parser.add_argument('--config', help='مسار ملف التكوين')
    parser.add_argument('--output', default='MP_Data', help='مسار مجلد الإخراج')
    parser.add_argument('--create-template', action='store_true', help='إنشاء ملف تكوين نموذجي')
    parser.add_argument('--generate-info', action='store_true', help='إنشاء ملف معلومات البيانات')
    
    args = parser.parse_args()
    
    processor = BatchDatasetProcessor(output_dir=args.output)
    
    if args.create_template:
        processor.create_config_template()
    elif args.generate_info:
        processor.generate_dataset_info()
    else:
        processor.process_batch(args.config)

if __name__ == "__main__":
    main()
