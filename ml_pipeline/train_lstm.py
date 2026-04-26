import numpy as np
import os
import sys
import io
from sklearn.model_selection import train_test_split

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import TensorBoard

# مسار البيانات
DATA_PATH = os.path.join('MP_Data')

# قراءة الكلمات التي تم تسجيلها تلقائياً من أسماء المجلدات
if not os.path.exists(DATA_PATH):
    print(f"Error: {DATA_PATH} not found. Please run the processing script first.")
    exit()

actions = np.array([name for name in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, name))])
print("\nDetected Actions:", actions)

if len(actions) < 2:
    print("\nError: You need at least 2 actions.")
    exit()

# الإعدادات
sequence_length = 120

# تحويل الكلمات إلى أرقام
label_map = {label:num for num, label in enumerate(actions)}

print("\nProcessing and Augmenting data...")

print("\nProcessing and Augmenting data...")

def normalize_frame(frame):
    lh = frame[0:63].reshape(21, 3)
    rh = frame[63:126].reshape(21, 3)
    if np.sum(lh) != 0:
        base = lh[0].copy()
        lh = lh - base
    if np.sum(rh) != 0:
        base = rh[0].copy()
        rh = rh - base
    return np.concatenate([lh.flatten(), rh.flatten()])

def augment_data(sequence, num_augmented=15):
    augmented_sequences = []
    augmented_sequences.append(sequence) # 0. Original
    
    for _ in range(num_augmented):
        aug_seq = []
        scale = np.random.uniform(0.9, 1.1)
        for frame in sequence:
            # Shift and jitter (shift is less impactful now since we normalized, but adds variation to relative distances)
            new_frame = frame * scale + np.random.normal(0, 0.002, size=frame.shape)
            # if a hand was originally zero, keep it zero
            if np.sum(frame[0:63]) == 0: new_frame[0:63] = 0
            if np.sum(frame[63:126]) == 0: new_frame[63:126] = 0
            aug_seq.append(new_frame)
        augmented_sequences.append(aug_seq)
    return augmented_sequences

sequences, labels = [], []
for action in actions:
    action_path = os.path.join(DATA_PATH, action)
    sequences_in_action = os.listdir(action_path)
    for seq_folder in sequences_in_action:
        try:
            window = []
            for frame_num in range(sequence_length):
                res = np.load(os.path.join(action_path, seq_folder, "{}.npy".format(frame_num)))
                # 1. تطبيق المعايرة
                norm_res = normalize_frame(res)
                window.append(norm_res)
            
            # Apply Data Augmentation
            aug_windows = augment_data(window, num_augmented=15)
            for aw in aug_windows:
                sequences.append(aw)
                labels.append(label_map[action])
                
        except Exception as e:
            pass # تخطي المجلدات غير المكتملة

# تحويل البيانات إلى مصفوفات Numpy
X = np.array(sequences)
y = to_categorical(labels).astype(int)

# تقسيم البيانات
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.05)

# بناء النموذج
from tensorflow.keras.layers import Conv1D, MaxPooling1D, BatchNormalization, Flatten, Reshape, Bidirectional, Dropout
num_features = X_train.shape[2] 

model = Sequential()
model.add(Conv1D(64, 3, activation='relu', padding='same', input_shape=(sequence_length, num_features)))
model.add(MaxPooling1D(2))
model.add(BatchNormalization())
model.add(Conv1D(128, 3, activation='relu', padding='same'))
model.add(MaxPooling1D(2))
model.add(BatchNormalization())
model.add(Conv1D(256, 3, activation='relu', padding='same'))
model.add(MaxPooling1D(2))
model.add(Flatten())

# حساب الحجم للطبقة التالية تلقائياً
cnn_output_size = ((sequence_length // 2) // 2) // 2
model.add(Reshape((cnn_output_size, 256)))  

model.add(Bidirectional(LSTM(128, return_sequences=True)))
model.add(Dropout(0.5))
model.add(Bidirectional(LSTM(64, return_sequences=False)))
model.add(Dropout(0.5))
model.add(Dense(64, activation='relu'))
model.add(Dense(actions.shape[0], activation='softmax'))

model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

print("\nStarting training...")
model.fit(X_train, y_train, epochs=100, batch_size=8) 

print("\nTraining complete!")
model.save('sign_language_model.h5')
print("Model saved as 'sign_language_model.h5'")

