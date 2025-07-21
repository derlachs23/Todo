import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Activity, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const AudioVisualizer = () => {
  const [audioData, setAudioData] = useState(Array(32).fill(0))
  const [isActive, setIsActive] = useState(false)
  const animationRef = useRef(null)

  useEffect(() => {
    // Simuliere Audio-Visualisierung
    const generateRandomData = () => {
      const newData = Array(32).fill(0).map(() => Math.random() * 100)
      setAudioData(newData)
      setIsActive(Math.random() > 0.3)
    }

    const interval = setInterval(generateRandomData, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Activity className="h-5 w-5 mr-2 text-purple-400" />
          Audio-Visualisierung
        </CardTitle>
        <CardDescription className="text-slate-400">
          Echtzeitanalyse der Audioqualität und -eigenschaften
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Spektrum-Visualizer */}
          <div className="lg:col-span-2">
            <div className="h-32 flex items-end justify-center space-x-1 bg-slate-900/50 rounded-lg p-4">
              {audioData.map((value, index) => (
                <motion.div
                  key={index}
                  className="bg-gradient-to-t from-purple-600 to-blue-400 rounded-sm"
                  style={{
                    width: '8px',
                    height: `${Math.max(value * 0.8, 4)}%`,
                  }}
                  animate={{
                    height: `${Math.max(value * 0.8, 4)}%`,
                    opacity: isActive ? 1 : 0.3,
                  }}
                  transition={{
                    duration: 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Audio-Metriken */}
          <div className="space-y-4">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Signalstärke</span>
                <Zap className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {isActive ? Math.round(Math.random() * 100) : 0}%
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Frequenzbereich</span>
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-lg font-semibold text-white">
                {isActive ? '80Hz - 8kHz' : 'Inaktiv'}
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Qualität</span>
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-slate-500'}`} />
              </div>
              <div className="text-lg font-semibold text-white">
                {isActive ? 'Ausgezeichnet' : 'Bereit'}
              </div>
            </div>
          </div>
        </div>

        {/* Wellenform */}
        <div className="mt-6">
          <h4 className="text-white font-medium mb-3">Wellenform</h4>
          <div className="h-16 bg-slate-900/50 rounded-lg p-2 flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 800 60">
              {Array.from({ length: 200 }, (_, i) => {
                const x = (i / 200) * 800
                const amplitude = isActive ? Math.sin(i * 0.1) * Math.random() * 20 : 0
                const y1 = 30 - amplitude
                const y2 = 30 + amplitude
                
                return (
                  <motion.line
                    key={i}
                    x1={x}
                    y1={y1}
                    x2={x}
                    y2={y2}
                    stroke="url(#gradient)"
                    strokeWidth="1"
                    animate={{
                      y1: 30 - amplitude,
                      y2: 30 + amplitude,
                      opacity: isActive ? 0.8 : 0.3
                    }}
                    transition={{ duration: 0.1 }}
                  />
                )
              })}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AudioVisualizer

