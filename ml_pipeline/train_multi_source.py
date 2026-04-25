"""
تدريب نموذج LSTM على بيانات من مصادر متعددة
Training LSTM on Multiple Source Datasets

يدعم:
- البيانات المجمعة محليًا
- البيانات من KArSL
- البيانات من ArASL2018
- البيانات من ArYSL
- وغيرها من المصادر المعالجة
"""

import numpy as np
import os
from pathlib import Path
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import TensorBoard, EarlyStopping
from tensorflow.keras.optimizers import Adam
import json
from collections import defaultdict

class MultiSourceLSTMTrainer:
    def __init__(self, data_path='MP_Data', sequence_length=30):
        self.data_path = data_path
        self.sequence_length = sequence_length
        self.label_map = {}
        self.reverse_label_map = {}
        self.action_stats = defaultdict(lambda: {'count': 0, 'source': 'unknown'})
    
    def discover_actions_with_sources(self):
        """اكتشاف جميع الإشارات من جميع المصادر"""
        actions = []
        
        for action_folder in os.listdir(self.data_path):
            action_path = os.path.join(self.data_path, action_folder)
            if os.path.isdir(action_path):
                # تحديد المصدر بناءً على اسم الفئة
                source = self._determine_source(action_folder)
                
                num_sequences = len([f for f in os.listdir(action_path) 
                                    if os.path.isdir(os.path.join(action_path, f))])
                
                actions.append(action_folder)
                self.action_stats[action_folder] = {
                    'count': num_sequences,
                    'source': source
                }
        
        return np.array(sorted(actions))
    
    def _determine_source(self, action_name):
        """تحديد مصدر البيانات من اسم الفئة"""
        # يمكن تحسين هذا بناءً على اتفاقية التسمية
        keywords = {
            'word_': 'KArSL',
            'sent_': 'ArabSign',
            'yemeni_': 'ArYSL',
            'aasl_': 'AASL',
            'alef': 'ArASL2018',
            'ba': 'ArASL2018',
        }
        
        for key, source in keywords.items():
            if key in action_name.lower():
                return source
        
        return 'Local/Unknown'
    
    def load_data_with_validation(self):
        """تحميل البيانات مع التحقق من السلامة"""
        print("\n🔍 اكتشاف جميع الإشارات من جميع المصادر...")
        actions = self.discover_actions_with_sources()
        
        print(f"\n📊 إجمالي الإشارات المكتشفة: {len(actions)}")
        print("\n📋 قائمة المصادر والفئات:")
        print("-" * 70)
        
        sources_dict = defaultdict(list)
        for action in actions:
            source = self.action_stats[action]['source']
            count = self.action_stats[action]['count']
            sources_dict[source].append((action, count))
            print(f"  {action:20} | {count:3} تسلسل | المصدر: {source}")
        
        print("\n" + "="*70)
        print("📈 ملخص المصادر:")
        print("="*70)
        for source, items in sorted(sources_dict.items()):
            total = sum(count for _, count in items)
            print(f"  {source:20} | {len(items):3} فئة  | {total:5} تسلسل")
        
        if len(actions) < 2:
            print("\n❌ خطأ: يجب أن يكون لديك إشارتين على الأقل!")
            return None, None, None
        
        # تحويل إلى أرقام
        self.label_map = {label: num for num, label in enumerate(actions)}
        self.reverse_label_map = {num: label for label, num in self.label_map.items()}
        
        print(f"\n⚙️ جاري تحميل البيانات...")
        sequences, labels = [], []
        
        for action in actions:
            action_path = os.path.join(self.data_path, action)
            sequence_dirs = [d for d in os.listdir(action_path) 
                           if os.path.isdir(os.path.join(action_path, d))]
            
            for sequence in sequence_dirs:
                sequence_path = os.path.join(action_path, sequence)
                window = []
                
                # تحميل كل إطار في التسلسل
                frame_files = sorted([f for f in os.listdir(sequence_path) if f.endswith('.npy')],
                                   key=lambda x: int(x.split('.')[0]))
                
                for frame_num in range(self.sequence_length):
                    if frame_num < len(frame_files):
                        frame_path = os.path.join(sequence_path, frame_files[frame_num])
                        try:
                            keypoints = np.load(frame_path)
                            window.append(keypoints)
                        except Exception as e:
                            print(f"⚠️ خطأ في تحميل {frame_path}: {e}")
                            window.append(np.zeros(126))
                    else:
                        # ملء البيانات الناقصة بأصفار
                        window.append(np.zeros(126))
                
                if len(window) == self.sequence_length:
                    sequences.append(np.array(window))
                    labels.append(self.label_map[action])
        
        X = np.array(sequences)
        y = to_categorical(labels).astype(int)
        
        print(f"✅ تم تحميل {len(X)} تسلسل من {len(actions)} فئة")
        return X, y, actions
    
    def build_model(self, num_actions, learning_rate=0.001):
        """بناء نموذج LSTM محسّن"""
        print("\n🧠 بناء نموذج LSTM محسّن...")
        
        model = Sequential([
            LSTM(64, return_sequences=True, activation='relu', 
                 input_shape=(self.sequence_length, 126)),
            Dropout(0.2),
            
            LSTM(128, return_sequences=True, activation='relu'),
            Dropout(0.2),
            
            LSTM(64, return_sequences=False, activation='relu'),
            Dropout(0.2),
            
            Dense(128, activation='relu'),
            Dropout(0.3),
            
            Dense(64, activation='relu'),
            Dropout(0.2),
            
            Dense(32, activation='relu'),
            
            Dense(num_actions, activation='softmax')
        ])
        
        optimizer = Adam(learning_rate=learning_rate)
        model.compile(optimizer=optimizer, 
                     loss='categorical_crossentropy', 
                     metrics=['categorical_accuracy'])
        
        print("✅ تم بناء النموذج")
        print(model.summary())
        
        return model
    
    def train(self, X, y, actions, epochs=200, batch_size=32):
        """تدريب النموذج"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.1, random_state=42
        )
        
        print(f"\n📊 معلومات التقسيم:")
        print(f"  بيانات التدريب: {len(X_train)} تسلسل")
        print(f"  بيانات الاختبار: {len(X_test)} تسلسل")
        print(f"  عدد الفئات: {y_train.shape[1]}")
        
        log_dir = os.path.join('Logs')
        os.makedirs(log_dir, exist_ok=True)
        
        callbacks = [
            TensorBoard(log_dir=log_dir, histogram_freq=1),
            EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
        ]
        
        model = self.build_model(len(actions))
        
        print(f"\n🚀 بدء التدريب على {len(actions)} فئة من مصادر متعددة...")
        print("=" * 70)
        
        history = model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(X_test, y_test),
            callbacks=callbacks,
            verbose=1
        )
        
        # تقييم النموذج
        train_loss, train_acc = model.evaluate(X_train, y_train, verbose=0)
        test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
        
        print("\n" + "=" * 70)
        print("✅ التدريب اكتمل!")
        print(f"  دقة التدريب: {train_acc*100:.2f}%")
        print(f"  دقة الاختبار: {test_acc*100:.2f}%")
        print("=" * 70)
        
        # حفظ النموذج
        model_path = 'sign_language_model.h5'
        model.save(model_path)
        print(f"✅ تم حفظ النموذج في: {model_path}")
        
        # حفظ معلومات التصنيفات
        self._save_labels_info()
        
        return model, history
    
    def _save_labels_info(self):
        """حفظ معلومات التصنيفات والمصادر"""
        info = {
            'label_map': self.label_map,
            'reverse_label_map': self.reverse_label_map,
            'action_stats': {
                action: {
                    'count': stats['count'],
                    'source': stats['source']
                }
                for action, stats in self.action_stats.items()
            },
            'total_actions': len(self.label_map),
            'sequence_length': self.sequence_length
        }
        
        with open('labels_info.json', 'w', encoding='utf-8') as f:
            json.dump(info, f, indent=2, ensure_ascii=False)
        
        print("✅ تم حفظ معلومات التصنيفات في: labels_info.json")

def main():
    print("\n" + "="*70)
    print("🌍 تدريب نموذج LSTM على بيانات من مصادر خارجية متعددة")
    print("="*70)
    
    trainer = MultiSourceLSTMTrainer(data_path='MP_Data', sequence_length=30)
    
    # تحميل البيانات
    X, y, actions = trainer.load_data_with_validation()
    
    if X is None:
        return
    
    # التدريب
    model, history = trainer.train(X, y, actions, epochs=200)
    
    print("\n" + "="*70)
    print("🎉 اكتمل التدريب على جميع المصادر!")
    print(f"النموذج يعرف الآن {len(actions)} إشارة من مصادر مختلفة")
    print("="*70)

if __name__ == "__main__":
    main()
