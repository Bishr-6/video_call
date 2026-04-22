import { useEffect, useState } from 'react'
import {
  FilesetResolver,
  HandLandmarker,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision'

interface MediaPipeHandlerProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onHandDetected: (landmarks: NormalizedLandmark[] | null) => void
}

export default function MediaPipeHandler({ videoRef, onHandDetected }: MediaPipeHandlerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  let handLandmarker: HandLandmarker | null = null

  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        // تحميل MediaPipe Hand Landmarker
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm'
        )

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-studio/latest/hand_landmarker.task',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        })

        setIsLoading(false)
        console.log('✅ MediaPipe Hand Landmarker loaded successfully')

        // بدء كشف اليد
        detectHands()
      } catch (err) {
        console.error('❌ Error loading MediaPipe:', err)
        setError('Failed to load MediaPipe')
        setIsLoading(false)
      }
    }

    const detectHands = () => {
      if (!videoRef.current || !handLandmarker) return

      const video = videoRef.current
      const canvas = canvasRef.current

      const detect = () => {
        if (video.readyState === 4) {
          // Video is ready
          const results = handLandmarker.detectForVideo(video, Date.now())

          // رسم النقاط على الشاشة
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)

              // رسم كل يد تم اكتشافها
              results.landmarks.forEach((landmarks) => {
                drawHandLandmarks(ctx, landmarks)
              })
            }
          }

          // إرسال النقاط المكتشفة
          if (results.landmarks.length > 0) {
            onHandDetected(results.landmarks[0])
          } else {
            onHandDetected(null)
          }
        }

        requestAnimationFrame(detect)
      }

      detect()
    }

    initializeMediaPipe()
  }, [videoRef, onHandDetected])

  const drawHandLandmarks = (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[]) => {
    // رسم الخطوط بين النقاط
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],     // الإبهام
      [0, 5], [5, 6], [6, 7], [7, 8],     // السبابة
      [0, 9], [9, 10], [10, 11], [11, 12], // الوسطى
      [0, 13], [13, 14], [14, 15], [15, 16], // البنصر
      [0, 17], [17, 18], [18, 19], [19, 20], // الخنصر
    ]

    ctx.strokeStyle = '#0ea5e9'
    ctx.lineWidth = 2
    ctx.fillStyle = '#06b6d4'

    // رسم الخطوط
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      ctx.beginPath()
      ctx.moveTo(startPoint.x * 320, startPoint.y * 240)
      ctx.lineTo(endPoint.x * 320, endPoint.y * 240)
      ctx.stroke()
    })

    // رسم النقاط
    landmarks.forEach((landmark) => {
      ctx.beginPath()
      ctx.arc(landmark.x * 320, landmark.y * 240, 4, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  if (isLoading) {
    return <div className="text-center text-gray-600">⏳ تحميل MediaPipe...</div>
  }

  if (error) {
    return <div className="text-center text-red-600">❌ {error}</div>
  }

  return (
    <div className="hidden">
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        style={{ display: 'none' }}
      />
    </div>
  )
}
