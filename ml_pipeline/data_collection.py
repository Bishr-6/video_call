import cv2
import numpy as np
import os
import mediapipe as mp
import time

# إعداد MediaPipe
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

# دالة لاستخراج الإحداثيات وتوحيدها في مصفوفة واحدة
def extract_keypoints(results):
    lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
    rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
    return np.concatenate([lh, rh])

# دالة مساعدة لعمل التوقع ورسم النقاط
def mediapipe_detection(image, model):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False
    results = model.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return image, results

def draw_styled_landmarks(image, results):
    mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                             mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4), 
                             mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2))
    mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                             mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4), 
                             mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2))

# الإعدادات
DATA_PATH = os.path.join('MP_Data')
no_sequences = 30 # عدد مرات تكرار الحركة
sequence_length = 30 # عدد الإطارات في كل مرة

def collect_data_for_word(action):
    # إنشاء المجلدات الخاصة بهذه الكلمة
    for sequence in range(no_sequences):
        try: 
            os.makedirs(os.path.join(DATA_PATH, action, str(sequence)))
        except:
            pass

    cap = cv2.VideoCapture(0)
    
    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        print(f"\n[+] تم فتح الكاميرا لتسجيل إشارة: {action}")
        print(">> اضغط على حرف 's' في لوحة المفاتيح عندما تكون جاهزاً للبدء بالتسجيل..")
        
        # انتظار المستخدم ليضغط 's' للبدء
        while True:
            ret, frame = cap.read()
            image, results = mediapipe_detection(frame, holistic)
            draw_styled_landmarks(image, results)
            
            # عرض إرشادات على الشاشة
            cv2.putText(image, 'Press "s" to START recording', (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.imshow('Sign Language Data Collection', image)
            
            key = cv2.waitKey(10) & 0xFF
            if key == ord('s'):
                break
            elif key == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                return False

        print("\n[!] بدأ التسجيل!")
        
        for sequence in range(no_sequences):
            
            # نافذة الانتظار (بدون تجميد الشاشة) لمدة 1.5 ثانية
            start_time = time.time()
            while time.time() - start_time < 1.5:
                ret, wait_frame = cap.read()
                wait_image, wait_results = mediapipe_detection(wait_frame, holistic)
                draw_styled_landmarks(wait_image, wait_results)
                cv2.putText(wait_image, 'GET READY...', (120,200), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255, 0), 4, cv2.LINE_AA)
                cv2.putText(wait_image, f'Preparing Video {sequence+1}/{no_sequences}', (15,30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
                cv2.imshow('Sign Language Data Collection', wait_image)
                if cv2.waitKey(10) & 0xFF == ord('q'):
                    cap.release()
                    cv2.destroyAllWindows()
                    return False

            # بعد انتهاء الانتظار، نبدأ بتسجيل الـ 30 إطار
            for frame_num in range(sequence_length):
                ret, frame = cap.read()
                image, results = mediapipe_detection(frame, holistic)
                draw_styled_landmarks(image, results)
                
                cv2.putText(image, f'Recording Video {sequence+1}/{no_sequences}', (15,30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
                cv2.imshow('Sign Language Data Collection', image)
                
                keypoints = extract_keypoints(results)
                npy_path = os.path.join(DATA_PATH, action, str(sequence), str(frame_num))
                np.save(npy_path, keypoints)

                if cv2.waitKey(10) & 0xFF == ord('q'):
                    cap.release()
                    cv2.destroyAllWindows()
                    return False
                    
        cap.release()
        cv2.destroyAllWindows()
        return True

# الحلقة الرئيسية للبرنامج
if __name__ == '__main__':
    print("="*50)
    print("برنامج تسجيل إشارات لغة الإشارة (الذكاء الاصطناعي)")
    print("="*50)
    
    while True:
        word = input("\nأدخل الكلمة أو الحرف الذي تريد تسجيله (أو اكتب 'خروج' للإنهاء): ")
        
        if word.strip() == 'خروج':
            print("تم إنهاء البرنامج. شكراً لك!")
            break
            
        if word.strip() == '':
            print("الرجاء كتابة كلمة صحيحة.")
            continue
            
        success = collect_data_for_word(word.strip())
        
        if success:
            print(f"\n✅ ممتاز! تم الانتهاء من فهم إشارة '{word}' بنجاح وحفظ بياناتها.")
        else:
            print(f"\n❌ تم إيقاف تسجيل '{word}' قبل اكتماله.")
