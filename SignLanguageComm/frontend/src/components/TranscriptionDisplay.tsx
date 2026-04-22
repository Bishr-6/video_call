import { useState } from 'react'

interface TranscriptionDisplayProps {
  transcriptions: Array<{
    text: string
    timestamp: number
    sender: 'local' | 'remote'
    language: string
  }>
}

export default function TranscriptionDisplay({ transcriptions }: TranscriptionDisplayProps) {
  const [filter, setFilter] = useState<'all' | 'local' | 'remote'>('all')

  const filtered = transcriptions.filter((t) => {
    if (filter === 'all') return true
    return t.sender === filter
  })

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">📝 النصوص المترجمة</h2>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'local', 'remote'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type === 'all' && '📋 الكل'}
            {type === 'local' && '👤 أنت'}
            {type === 'remote' && '👥 الآخر'}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">لا توجد رسائل بعد</p>
        ) : (
          filtered.map((trans, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg text-sm ${
                trans.sender === 'local'
                  ? 'bg-blue-100 text-blue-900 text-right'
                  : 'bg-green-100 text-green-900 text-right'
              }`}
            >
              <div className="font-semibold">
                {trans.sender === 'local' ? '👤 أنت:' : '👥 الآخر:'}
              </div>
              <div className="mt-1">{trans.text}</div>
              <div className="text-xs opacity-70 mt-1">{formatTime(trans.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
