import os
import sys
sys.path.insert(0, 'C:\\Users\\HP ENVY 15\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages')

try:
    import numpy as np
    print("numpy متوفر")
except:
    print("numpy غير متوفر")
    exit()

# إنشاء بيانات للحرف 'ب'
b_path = 'MP_Data/ب'
os.makedirs(b_path, exist_ok=True)

print('إنشاء بيانات تجريبية للحرف ب...')

for seq in range(30):
    seq_path = os.path.join(b_path, str(seq))
    os.makedirs(seq_path, exist_ok=True)

    for frame in range(30):
        # بيانات مختلفة عن الحرف 'أ'
        data = np.random.rand(126) * 0.3 + 0.4  # قيم بين 0.4 و 0.7
        np.save(os.path.join(seq_path, f'{frame}.npy'), data)

print('✅ تم إنشاء البيانات')

# فحص البيانات
actions = []
for item in os.listdir('MP_Data'):
    item_path = os.path.join('MP_Data', item)
    if os.path.isdir(item_path):
        sequences = [s for s in os.listdir(item_path) if os.path.isdir(os.path.join(item_path, s))]
        actions.append((item, len(sequences)))

print(f'البيانات المتاحة: {len(actions)} إشارة')
for action, count in actions:
    print(f'  • {action}: {count} تسلسل')