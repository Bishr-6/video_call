import { useEffect, useRef, useState } from 'react'

interface VideoCallProps {
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  isCallActive: boolean
}

export default function VideoCall({ localVideoRef, remoteVideoRef, isCallActive }: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
  })

  useEffect(() => {
    if (!isCallActive) return

    const startMedia = async () => {
      try {
        // Request permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })

        setLocalStream(stream)
        setPermissions({ camera: true, microphone: true })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        console.log('✅ Local media stream started')
      } catch (error) {
        console.error('❌ Error accessing media devices:', error)
        alert('⚠️ لا يمكن الوصول للكاميرا أو الميكروفون\nCannot access camera or microphone')
      }
    }

    startMedia()

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isCallActive, localVideoRef])

  return (
    <div className="space-y-4">
      {/* Local Video */}
      <div className="bg-black rounded-lg overflow-hidden shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-96 object-cover"
        />
        <div className="bg-gray-900 px-4 py-2">
          <p className="text-white text-sm">
            📹 {permissions.camera ? '✅ الكاميرا' : '❌ كاميرا'} • 
            {permissions.microphone ? ' ✅ الميكروفون' : ' ❌ ميكروفون'}
          </p>
        </div>
      </div>

      {/* Remote Video */}
      {isCallActive && (
        <div className="bg-black rounded-lg overflow-hidden shadow-lg">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-96 object-cover"
          />
          <div className="bg-gray-900 px-4 py-2">
            <p className="text-white text-sm">📹 الطرف الآخر • Remote User</p>
          </div>
        </div>
      )}

      {/* Accessibility Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>ملاحظة الخصوصية:</strong> تُعالج جميع البيانات محلياً على جهازك. 
          لا يتم إرسال الفيديو إلى الخادم.
        </p>
      </div>
    </div>
  )
}
