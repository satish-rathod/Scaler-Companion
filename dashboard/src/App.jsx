import { useState, useEffect } from 'react'
import { healthCheck } from './services/api'
import { Activity } from 'lucide-react'

function App() {
  const [status, setStatus] = useState('Checking...')

  useEffect(() => {
    healthCheck()
      .then(data => setStatus(`Backend Status: ${data.status} (v${data.version})`))
      .catch(err => setStatus(`Error connecting to backend: ${err.message}`))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">Scaler Companion V2</h1>
        </div>
        <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <p className="font-mono text-sm text-gray-600">{status}</p>
        </div>
      </div>
    </div>
  )
}

export default App
