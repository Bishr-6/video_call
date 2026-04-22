import { useState, useRef } from 'react'

interface ControlPanelProps {
  isCallActive: boolean
  onStartCall: () => void
  onEndCall: () => void
  sessionId: string
  onSendTranscription: (text: string, language: string) => void
}

export default function ControlPanel({
  isCallActive,
  onStartCall,
  onEndCall,
  sessionId,
  onSendTranscription,
}: ControlPanelProps) {
  const [transcriptionText, setTranscriptionText] = useState('')
  const [language, setLanguage] = useState<'ar' | 'en'>('ar')
  const [showMicTranscription, setShowMicTranscription] = useState(false)
  const recognitionRef = useRef<any>(null)

  const handleSendTranscription = () => {
    if (!transcriptionText.trim()) return
    onSendTranscription(transcriptionText, language)
    setTranscriptionText('')
  }

  const handleMicTranscription = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('❌ المتصفح لا يدعم التعرف على الصوت')
      return
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = language === 'ar' ? 'ar-SA' : 'en-US'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setTranscriptionText(transcript)
          } else {
            interimTranscript += transcript
          }
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        alert(`❌ خطأ: ${event.error}`)
      }

      recognitionRef.current.onend = () => {
        setShowMicTranscription(false)
      }
    }

    if (showMicTranscription) {
      recognitionRef.current.stop()
      setShowMicTranscription(false)
    } else {
      recognitionRef.current.start()
      setShowMicTranscription(true)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">⚙️ التحكم</h2>

      {/* Call Buttons */}
      <div className="flex gap-2">
        {!isCallActive ? (
          <button
            onClick={onStartCall}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            📞 بدء المكالمة
          </button>
        ) : (
          <>
            <button
              disabled
              className="flex-1 bg-blue-600 text-white font-bold py-2 px-3 rounded-lg text-sm opacity-75"
            >
              ✅ مكالمة نشطة ({sessionId.substring(0, 6)})
            </button>
            <button
              onClick={onEndCall}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              📵 إنهاء المكالمة
            </button>
          </>
        )}
      </div>

      {/* Transcription Input */}
      {isCallActive && (
        <>
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 إرسال نص
            </label>

            {/* Language Selection */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
            >
              <option value="ar">🇸🇦 العربية</option>
              <option value="en">🇬🇧 English</option>
            </select>

            {/* Text Input */}
            <textarea
              value={transcriptionText}
              onChange={(e) => setTranscriptionText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSendTranscription()
                }
              }}
              placeholder="اكتب الرسالة هنا... أو استخدم الميكروفون"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />

            {/* Send Buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSendTranscription}
                disabled={!transcriptionText.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg transition text-sm"
              >
                📤 إرسال (Ctrl+Enter)
              </button>
              <button
                onClick={handleMicTranscription}
                className={`flex-1 font-bold py-2 px-3 rounded-lg transition text-sm ${
                  showMicTranscription
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {showMicTranscription ? '🔴 جاري التسجيل...' : '🎤 استخدم الميكروفون'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-xs text-yellow-900">
          ℹ️ <strong>ملاحظة:</strong> يمكنك نسخ النص هنا وإرساله للطرف الآخر. 
          جميع البيانات معالجة محلياً.
        </p>
      </div>
    </div>
  )
}
