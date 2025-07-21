import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Square, Play, Pause, RotateCcw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

const VoiceRecorder = ({ selectedModel, onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const startRecording = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      })

      // Audio-Kontext für Visualisierung
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      const chunks = []
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Timer starten
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Audio-Level-Visualisierung
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255 * 100)
          animationRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }
      updateAudioLevel()

    } catch (err) {
      setError('Mikrofon-Zugriff verweigert. Bitte erlauben Sie den Zugriff auf das Mikrofon.')
      console.error('Fehler beim Zugriff auf Mikrofon:', err)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      setAudioLevel(0)
    }
  }

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      const url = URL.createObjectURL(audioBlob)
      audioRef.current.src = url
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const resetRecording = () => {
    setAudioBlob(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setAudioLevel(0)
    if (audioRef.current) {
      audioRef.current.src = ''
    }
  }

  const uploadRecording = async () => {
    if (!audioBlob || !selectedModel) {
      setError('Bitte wählen Sie ein Stimmenmodell aus und nehmen Sie Audio auf.')
      return
    }

    try {
      setIsUploading(true)
      setError('')

      // Konvertiere Blob zu Base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1]
        
        const response = await fetch(`/api/voice-models/${selectedModel.id}/record-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio_data: base64Data
          }),
        })

        if (response.ok) {
          const result = await response.json()
          onRecordingComplete()
          resetRecording()
          setError('')
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Fehler beim Hochladen der Aufnahme')
        }
      }
      reader.readAsDataURL(audioBlob)
    } catch (err) {
      setError('Fehler beim Hochladen der Aufnahme')
      console.error('Upload-Fehler:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Mic className="h-5 w-5 mr-2 text-purple-400" />
          Stimme aufnehmen
        </CardTitle>
        <CardDescription className="text-slate-400">
          Nehmen Sie mindestens 30 Sekunden hochwertiges Audio auf für beste Ergebnisse
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {!selectedModel && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertDescription className="text-yellow-400">
              Bitte wählen Sie zuerst ein Stimmenmodell aus oder erstellen Sie ein neues.
            </AlertDescription>
          </Alert>
        )}

        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-6">
          {/* Audio Level Visualizer */}
          <motion.div 
            className="relative w-32 h-32 flex items-center justify-center"
            animate={{ scale: isRecording ? 1.1 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm"></div>
            <motion.div
              className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-500/30 to-blue-500/30"
              animate={{ 
                scale: isRecording ? 1 + (audioLevel / 100) * 0.3 : 1,
                opacity: isRecording ? 0.8 : 0.4
              }}
              transition={{ duration: 0.1 }}
            />
            <Button
              onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : startRecording}
              disabled={!selectedModel}
              size="lg"
              className={`relative z-10 w-16 h-16 rounded-full ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isRecording ? (
                isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>
          </motion.div>

          {/* Recording Info */}
          <div className="text-center space-y-2">
            <div className="text-2xl font-mono text-white">
              {formatTime(recordingTime)}
            </div>
            {isRecording && (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 text-sm">
                  {isPaused ? 'Pausiert' : 'Aufnahme läuft'}
                </span>
              </div>
            )}
            {recordingTime > 0 && (
              <Progress 
                value={Math.min((recordingTime / 60) * 100, 100)} 
                className="w-48 h-2"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {isRecording && (
              <Button
                onClick={stopRecording}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
                <Square className="h-4 w-4 mr-2" />
                Stoppen
              </Button>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button
                  onClick={isPlaying ? pausePlayback : playRecording}
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                >
                  {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPlaying ? 'Pausieren' : 'Abspielen'}
                </Button>

                <Button
                  onClick={resetRecording}
                  variant="outline"
                  className="border-slate-500/50 text-slate-400 hover:bg-slate-500/20"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Zurücksetzen
                </Button>

                <Button
                  onClick={uploadRecording}
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Hochladen...' : 'Hochladen'}
                </Button>
              </>
            )}
          </div>

          {/* Quality Indicators */}
          {recordingTime > 0 && (
            <div className="flex space-x-4 text-sm">
              <Badge variant={recordingTime >= 30 ? "default" : "secondary"}>
                Dauer: {recordingTime >= 30 ? '✓' : '⚠'} {recordingTime}s
              </Badge>
              <Badge variant={audioLevel > 20 ? "default" : "secondary"}>
                Pegel: {audioLevel > 20 ? '✓' : '⚠'} {Math.round(audioLevel)}%
              </Badge>
            </div>
          )}
        </div>

        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}

export default VoiceRecorder

