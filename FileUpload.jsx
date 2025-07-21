import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, File, X, Check, AlertCircle, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

const FileUpload = ({ selectedModel, onUploadComplete }) => {
  const [files, setFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/m4a', 'audio/ogg']
  const maxFileSize = 50 * 1024 * 1024 // 50MB

  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      return 'Ungültiger Dateityp. Erlaubt sind: WAV, MP3, FLAC, M4A, OGG'
    }
    if (file.size > maxFileSize) {
      return 'Datei zu groß. Maximum: 50MB'
    }
    return null
  }

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).map(file => {
      const error = validateFile(file)
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        error,
        status: error ? 'error' : 'pending'
      }
    })

    setFiles(prev => [...prev, ...newFiles])
    setError('')
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = async () => {
    if (!selectedModel) {
      setError('Bitte wählen Sie zuerst ein Stimmenmodell aus.')
      return
    }

    const validFiles = files.filter(f => !f.error && f.status === 'pending')
    if (validFiles.length === 0) {
      setError('Keine gültigen Dateien zum Hochladen.')
      return
    }

    setIsUploading(true)
    setError('')

    for (const fileObj of validFiles) {
      try {
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        ))

        const formData = new FormData()
        formData.append('audio', fileObj.file)

        const xhr = new XMLHttpRequest()
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100
            setUploadProgress(prev => ({
              ...prev,
              [fileObj.id]: progress
            }))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 201) {
            setFiles(prev => prev.map(f => 
              f.id === fileObj.id ? { ...f, status: 'completed' } : f
            ))
            setUploadProgress(prev => ({
              ...prev,
              [fileObj.id]: 100
            }))
          } else {
            const errorData = JSON.parse(xhr.responseText)
            setFiles(prev => prev.map(f => 
              f.id === fileObj.id ? { 
                ...f, 
                status: 'error', 
                error: errorData.error || 'Upload fehlgeschlagen' 
              } : f
            ))
          }
        }

        xhr.onerror = () => {
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { 
              ...f, 
              status: 'error', 
              error: 'Netzwerkfehler beim Upload' 
            } : f
          ))
        }

        xhr.open('POST', `/api/voice-models/${selectedModel.id}/upload-audio`)
        xhr.send(formData)

        // Warte auf Abschluss des aktuellen Uploads
        await new Promise((resolve) => {
          xhr.onloadend = resolve
        })

      } catch (err) {
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { 
            ...f, 
            status: 'error', 
            error: 'Unerwarteter Fehler' 
          } : f
        ))
      }
    }

    setIsUploading(false)
    onUploadComplete()
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      default:
        return <File className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'border-green-500/50 bg-green-500/10'
      case 'error':
        return 'border-red-500/50 bg-red-500/10'
      case 'uploading':
        return 'border-blue-500/50 bg-blue-500/10'
      default:
        return 'border-slate-600/50 bg-slate-700/30'
    }
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Upload className="h-5 w-5 mr-2 text-purple-400" />
          Audio-Dateien hochladen
        </CardTitle>
        <CardDescription className="text-slate-400">
          Laden Sie hochwertige Audio-Dateien hoch (WAV, MP3, FLAC, M4A, OGG)
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

        {/* Drop Zone */}
        <motion.div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-purple-400 bg-purple-500/10' 
              : 'border-slate-600 hover:border-slate-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".wav,.mp3,.flac,.m4a,.ogg"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={!selectedModel}
          />
          
          <motion.div
            animate={{ y: dragActive ? -5 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Music className="h-12 w-12 mx-auto mb-4 text-purple-400" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Dateien hier ablegen oder klicken zum Auswählen
            </h3>
            <p className="text-slate-400 text-sm">
              Unterstützte Formate: WAV, MP3, FLAC, M4A, OGG (max. 50MB)
            </p>
          </motion.div>
        </motion.div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-white font-medium">Ausgewählte Dateien</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((fileObj) => (
                <motion.div
                  key={fileObj.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(fileObj.status)}`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(fileObj.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {fileObj.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span>{formatFileSize(fileObj.size)}</span>
                        <Badge variant="outline" className="text-xs">
                          {fileObj.type.split('/')[1].toUpperCase()}
                        </Badge>
                      </div>
                      {fileObj.error && (
                        <p className="text-red-400 text-xs mt-1">{fileObj.error}</p>
                      )}
                      {fileObj.status === 'uploading' && uploadProgress[fileObj.id] && (
                        <Progress 
                          value={uploadProgress[fileObj.id]} 
                          className="mt-2 h-1"
                        />
                      )}
                    </div>
                  </div>
                  
                  {fileObj.status === 'pending' && (
                    <Button
                      onClick={() => removeFile(fileObj.id)}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
              <div className="text-sm text-slate-400">
                {files.filter(f => !f.error && f.status === 'pending').length} Datei(en) bereit zum Upload
              </div>
              <Button
                onClick={uploadFiles}
                disabled={isUploading || !selectedModel || files.filter(f => !f.error && f.status === 'pending').length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Hochladen...' : 'Alle hochladen'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FileUpload

