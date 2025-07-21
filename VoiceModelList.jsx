import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, User, Trash2, Settings, Star, Clock, Mic2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

const VoiceModelList = ({ models, selectedModel, onSelectModel, onCreateModel, isLoading }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelDescription, setNewModelDescription] = useState('')
  const [error, setError] = useState('')

  const handleCreateModel = async () => {
    if (!newModelName.trim()) {
      setError('Bitte geben Sie einen Namen ein.')
      return
    }

    try {
      await onCreateModel(newModelName.trim(), newModelDescription.trim())
      setNewModelName('')
      setNewModelDescription('')
      setIsDialogOpen(false)
      setError('')
    } catch (err) {
      setError('Fehler beim Erstellen des Modells.')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unbekannt'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getQualityColor = (quality) => {
    if (quality >= 0.8) return 'text-green-400'
    if (quality >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getQualityLabel = (quality) => {
    if (quality >= 0.8) return 'Ausgezeichnet'
    if (quality >= 0.6) return 'Gut'
    if (quality >= 0.4) return 'Befriedigend'
    return 'Verbesserung nötig'
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-400" />
              Stimmenmodelle
            </CardTitle>
            <CardDescription className="text-slate-400">
              Verwalten Sie Ihre geklonten Stimmen
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Neu
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Neues Stimmenmodell erstellen</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Erstellen Sie ein neues Modell für Ihre Stimme
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {error && (
                  <Alert className="border-red-500/50 bg-red-500/10">
                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                  </Alert>
                )}
                
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Name des Modells *
                  </label>
                  <Input
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="z.B. Meine Stimme"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Beschreibung (optional)
                  </label>
                  <Textarea
                    value={newModelDescription}
                    onChange={(e) => setNewModelDescription(e.target.value)}
                    placeholder="Beschreibung des Stimmenmodells..."
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-slate-600 text-slate-300"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleCreateModel}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoading ? 'Erstellen...' : 'Erstellen'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence>
            {models.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Mic2 className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400 mb-4">
                  Noch keine Stimmenmodelle vorhanden
                </p>
                <p className="text-slate-500 text-sm">
                  Erstellen Sie Ihr erstes Modell, um zu beginnen
                </p>
              </motion.div>
            ) : (
              models.map((model, index) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedModel?.id === model.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50'
                  }`}
                  onClick={() => onSelectModel(model)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {model.name}
                      </h3>
                      {model.description && (
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                          {model.description}
                        </p>
                      )}
                    </div>
                    
                    {selectedModel?.id === model.id && (
                      <Badge className="bg-purple-600 text-white ml-2">
                        Aktiv
                      </Badge>
                    )}
                  </div>

                  {/* Model Stats */}
                  <div className="space-y-2">
                    {model.model_quality !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Qualität:</span>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={model.model_quality * 100} 
                            className="w-16 h-2"
                          />
                          <span className={`text-xs font-medium ${getQualityColor(model.model_quality)}`}>
                            {getQualityLabel(model.model_quality)}
                          </span>
                        </div>
                      </div>
                    )}

                    {model.training_duration && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Training:</span>
                        <span className="text-xs text-slate-300">
                          {Math.round(model.training_duration)}s Audio
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Erstellt:</span>
                      <span className="text-xs text-slate-300">
                        {formatDate(model.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Model Status */}
                  <div className="mt-3 pt-3 border-t border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {model.model_path ? (
                          <>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-green-400">Trainiert</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <span className="text-xs text-yellow-400">Bereit für Training</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Implement settings
                          }}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Implement delete
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Quick Stats */}
        {models.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 pt-4 border-t border-slate-700/50"
          >
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-white">
                  {models.length}
                </div>
                <div className="text-xs text-slate-400">Modelle</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-white">
                  {models.filter(m => m.model_path).length}
                </div>
                <div className="text-xs text-slate-400">Trainiert</div>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

export default VoiceModelList

