import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Upload, Play, Download, Settings, Waveform, Sparkles, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import VoiceRecorder from './components/VoiceRecorder'
import FileUpload from './components/FileUpload'
import VoiceModelList from './components/VoiceModelList'
import TextToSpeech from './components/TextToSpeech'
import AudioVisualizer from './components/AudioVisualizer'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('record')
  const [voiceModels, setVoiceModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchVoiceModels()
  }, [])

  const fetchVoiceModels = async () => {
    try {
      const response = await fetch('/api/voice-models')
      const models = await response.json()
      setVoiceModels(models)
    } catch (error) {
      console.error('Fehler beim Laden der Stimmenmodelle:', error)
    }
  }

  const createNewModel = async (name, description) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/voice-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      })
      const newModel = await response.json()
      setVoiceModels([...voiceModels, newModel])
      setSelectedModel(newModel)
      return newModel
    } catch (error) {
      console.error('Fehler beim Erstellen des Modells:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
        <div className="relative container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <Waveform className="h-10 w-10 text-purple-400" />
                <motion.div
                  className="absolute inset-0 bg-purple-400 rounded-full opacity-20"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  VoiceClone Pro
                </h1>
                <p className="text-slate-400">Mobil-optimiert mit Parler-TTS</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Mobil-Optimiert
              </Badge>
              <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                <Settings className="h-4 w-4 mr-2" />
                Einstellungen
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Voice Models */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <VoiceModelList 
              models={voiceModels}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onCreateModel={createNewModel}
              isLoading={isLoading}
            />
          </motion.div>

          {/* Center Panel - Main Interface */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Volume2 className="h-6 w-6 mr-3 text-purple-400" />
                  Stimme klonen und verwenden
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Nehmen Sie Ihre Stimme auf oder laden Sie Audio-Dateien hoch, um ein personalisiertes TTS-Modell zu erstellen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
                    <TabsTrigger 
                      value="record" 
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Aufnehmen
                    </TabsTrigger>
                    <TabsTrigger 
                      value="upload"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Hochladen
                    </TabsTrigger>
                    <TabsTrigger 
                      value="synthesize"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Synthetisieren
                    </TabsTrigger>
                  </TabsList>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6"
                    >
                      <TabsContent value="record" className="space-y-6">
                        <VoiceRecorder 
                          selectedModel={selectedModel}
                          onRecordingComplete={() => fetchVoiceModels()}
                        />
                      </TabsContent>

                      <TabsContent value="upload" className="space-y-6">
                        <FileUpload 
                          selectedModel={selectedModel}
                          onUploadComplete={() => fetchVoiceModels()}
                        />
                      </TabsContent>

                      <TabsContent value="synthesize" className="space-y-6">
                        <TextToSpeech 
                          selectedModel={selectedModel}
                        />
                      </TabsContent>
                    </motion.div>
                  </AnimatePresence>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Audio Visualizer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-8"
        >
          <AudioVisualizer />
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="mt-16 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm"
      >
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-slate-400">
            <p>© 2025 VoiceClone Pro - Professionelle Stimmklonierung mit KI</p>
            <p className="text-sm mt-2">Entwickelt mit modernster Technologie für höchste Qualität</p>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}

export default App

