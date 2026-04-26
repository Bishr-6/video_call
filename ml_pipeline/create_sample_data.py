#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إنشاء بيانات تجريبية للتدريب
"""

import os
import numpy as np

def create_sample_data():
    """إنشاء بيانات تجريبية لإشارتين"""
    data_path = 'MP_Data'

    # إنشاء بيانات للحرف "ب"
    b_path = os.path.join(data_path, 'ب')
    os.makedirs(b_path, exist_ok=True)

    print("إنشاء بيانات تجريبية للحرف 'ب'...")

    for seq in range(30):  # 30 تسلسل
        seq_path = os.path.join(b_path, str(seq))
        os.makedirs(seq_path, exist_ok=True)

        for frame in range(30):  # 30 إطار لكل تسلسل
            # إنشاء بيانات عشوائية تشبه MediaPipe landmarks (126 قيمة)
            # قيم مختلفة قليلاً عن الحرف "أ" للتمييز
            data = np.random.rand(126) * 0.5 + 0.2  # قيم بين 0.2 و 0.7
            file_path = os.path.join(seq_path, f'{frame}.npy')
            np.save(file_path, data)

    print("✅ تم إنشاء بيانات تجريبية للحرف 'ب'")

    # التحقق من البيانات
    actions = []
    for item in os.listdir(data_path):
        item_path = os.path.join(data_path, item)
        if os.path.isdir(item_path):
            sequences = [s for s in os.listdir(item_path) if os.path.isdir(os.path.join(item_path, s))]
            actions.append((item, len(sequences)))

    print(f"\n📊 البيانات المتاحة الآن: {len(actions)} إشارة")
    for action, count in actions:
        print(f"  • {action}: {count} تسلسل")

    return len(actions) >= 2

if __name__ == "__main__":
    print("🔧 إنشاء بيانات تجريبية للتدريب")
    success = create_sample_data()

    if success:
        print("\n✅ البيانات جاهزة للتدريب!")
        print("💡 شغل الآن: python train_simple_model.py")
    else:
        print("\n❌ فشل في إنشاء البيانات")