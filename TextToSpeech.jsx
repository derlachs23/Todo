import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Download, Volume2, Loader2, Type, Waveform } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'

const TextToSpeech = ({ selectedModel }) => {
  const [text, setText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [requestId, setRequestId] = useState(null)
  const [error, setError] = useState('')
  const [generationTime, setGenerationTime] = useState(null)
  const [speed, setSpeed] = useState([1.0])
  const [pitch, setPitch] = useState([1.0])
  const audioRef = useRef(null)

  const maxTextLength = 1000

  const sampleTexts = [
    "Hallo, ich bin eine geklonte Stimme. Wie gefällt Ihnen meine Aussprache?",
    "Die Technologie der Stimmklonierung hat in den letzten Jahren enorme Fortschritte gemacht.",
    "Guten Tag! Heute ist ein wunderschöner Tag für neue Entdeckungen.",
    "Künstliche Intelligenz ermöglicht es uns, menschliche Stimmen mit beeindruckender Genauigkeit zu reproduzieren."
  ]

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Bitte geben Sie einen Text ein.')
      return
    }

    if (!selectedModel || !selectedModel.model_path) {
      setError('Bitte wählen Sie ein trainiertes Stimmenmodell aus.')
      return
    }

    try {
      setIsGenerating(true)
      setError('')
      setAudioUrl(null)
      setRequestId(null)
      setGenerationTime(null)

      const startTime = Date.now()

      const response = await fetch(`/api/voice-models/${selectedModel.id}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          speed: speed[0],
          pitch: pitch[0]
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setRequestId(result.request_id)
        setAudioUrl(result.audio_url)
        setGenerationTime((Date.now() - startTime) / 1000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Fehler bei der Sprachsynthese')
      }
    } catch (err) {
      setError('Netzwerkfehler bei der Sprachsynthese')
      console.error('TTS-Fehler:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = `tts_output_${Date.now()}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const insertSampleText = (sampleText) => {
    setText(sampleText)
  }

  const clearText = () => {
    setText('')
    setError('')
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Volume2 className="h-5 w-5 mr-2 text-purple-400" />
          Text zu Sprache
        </CardTitle>
        <CardDescription className="text-slate-400">
          Verwenden Sie Ihr trainiertes Modell, um Text in Sprache umzuwandeln
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
              Bitte wählen Sie zuerst ein Stimmenmodell aus.
            </AlertDescription>
          </Alert>
        )}

        {selectedModel && !selectedModel.model_path && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <AlertDescription className="text-blue-400">
              Das ausgewählte Modell muss erst trainiert werden. Laden Sie Audio-Dateien hoch und starten Sie das Training.
            </AlertDescription>
          </Alert>
        )}

        {/* Text Input */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">
              Text eingeben
            </label>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`text-xs ${
                text.length > maxTextLength ? 'border-red-500 text-red-400' : 'border-slate-500 text-slate-400'
              }`}>
                {text.length}/{maxTextLength}
              </Badge>
              {text && (
                <Button
                  onClick={clearText}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white h-6 px-2"
                >
                  Löschen
                </Button>
              )}
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Geben Sie hier den Text ein, der gesprochen werden soll..."
            className="bg-slate-700/50 border-slate-600 text-white min-h-[120px] resize-none"
            maxLength={maxTextLength}
          />

          {/* Sample Texts */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">
              Beispieltexte:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {sampleTexts.map((sampleText, index) => (
                <motion.button
                  key={index}
                  onClick={() => insertSampleText(sampleText)}
                  className="text-left p-3 rounded-lg bg-slate-700/30 border border-slate-600/50 hover:border-purple-500/50 hover:bg-slate-700/50 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <p className="text-slate-300 text-sm line-clamp-2">
                    {sampleText}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Voice Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-white flex items-center">
              <Type className="h-4 w-4 mr-2" />
              Geschwindigkeit: {speed[0].toFixed(1)}x
            </label>
            <Slider
              value={speed}
              onValueChange={setSpeed}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-white flex items-center">
              <Waveform className="h-4 w-4 mr-2" />
              Tonhöhe: {pitch[0].toFixed(1)}x
            </label>
            <Slider
              value={pitch}
              onValueChange={setPitch}
              min={0.7}
              max={1.3}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim() || !selectedModel?.model_path || text.length > maxTextLength}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 px-8"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generiere Sprache...
              </>
            ) : (
              <>
                <Volume2 className="h-5 w-5 mr-2" />
                Sprache generieren
              </>
            )}
          </Button>
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handlePlay}
                  variant="outline"
                  size="sm"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <div>
                  <p className="text-white text-sm font-medium">
                    Generierte Sprache
                  </p>
                  {generationTime && (
                    <p className="text-slate-400 text-xs">
                      Generiert in {generationTime.toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full"
              controls
            />
          </motion.div>
        )}

        {/* Model Info */}
        {selectedModel && selectedModel.model_path && (
          <div className="mt-6 p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
            <h4 className="text-white font-medium mb-2">Aktives Modell</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Name:</span>
                <span className="text-white ml-2">{selectedModel.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Qualität:</span>
                <span className="text-white ml-2">
                  {selectedModel.model_quality ? 
                    `${Math.round(selectedModel.model_quality * 100)}%` : 
                    'Unbekannt'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TextToSpeech

