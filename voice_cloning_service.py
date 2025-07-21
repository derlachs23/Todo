import os
import time
import json
import logging
from typing import Optional, Dict, Any, List
from .parler_tts_service import ParlerTTSService
from .audio_processing_service import AudioProcessingService

logger = logging.getLogger(__name__)

class VoiceCloningService:
    """
    Hauptservice für Stimmklonierung mit mobil-optimiertem Parler-TTS.
    """
    
    def __init__(self):
        self.parler_tts = ParlerTTSService()
        self.audio_processor = AudioProcessingService()
        self.models_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
        self.processed_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'processed')
        
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)
        
        logger.info("VoiceCloningService mit Parler-TTS initialisiert")
    
    def train_voice_model(self, audio_files: List[str], model_name: str) -> Dict[str, Any]:
        """
        Trainiert ein Stimmenmodell mit Parler-TTS.
        Optimiert für minimales Audiomaterial und mobile Geräte.
        """
        try:
            logger.info(f"Starte Training für Modell: {model_name}")
            
            # Audio-Dateien vorverarbeiten
            processed_files = []
            total_duration = 0
            
            for audio_file in audio_files:
                if not os.path.exists(audio_file):
                    logger.warning(f"Audio-Datei nicht gefunden: {audio_file}")
                    continue
                
                # Audio verarbeiten und verbessern
                processed_path = self.audio_processor.process_audio(
                    audio_file, 
                    os.path.join(self.processed_dir, f"processed_{os.path.basename(audio_file)}")
                )
                
                processed_files.append(processed_path)
                
                # Dauer berechnen
                import librosa
                audio, sr = librosa.load(processed_path, sr=None)
                total_duration += len(audio) / sr
            
            if not processed_files:
                raise Exception("Keine gültigen Audio-Dateien für Training verfügbar")
            
            if total_duration < 3.0:
                logger.warning(f"Kurze Audio-Dauer ({total_duration:.1f}s). Empfohlen: mindestens 3 Sekunden")
            
            # Stimmenprofil mit Parler-TTS erstellen
            voice_profile = self.parler_tts.create_voice_profile(processed_files, model_name)
            
            # Training-Ergebnis
            result = {
                'model_name': model_name,
                'model_path': voice_profile.get('reference_audio_path'),
                'profile_path': os.path.join(self.models_dir, f"{model_name}_profile.json"),
                'training_duration': total_duration,
                'quality_score': voice_profile.get('quality_score', 0.8),
                'audio_files_count': len(processed_files),
                'model_type': 'parler-tts-mini-multilingual',
                'mobile_optimized': True,
                'supports_german': True,
                'training_time': time.time(),
                'status': 'completed'
            }
            
            logger.info(f"Training abgeschlossen für {model_name}")
            return result
            
        except Exception as e:
            logger.error(f"Fehler beim Training: {str(e)}")
            raise
    
    def synthesize_speech(self, text: str, model_path: str, 
                         speed: float = 1.0, pitch: float = 1.0) -> str:
        """
        Generiert Sprache mit dem trainierten Modell.
        """
        try:
            # Profil-Pfad ableiten
            model_dir = os.path.dirname(model_path)
            model_name = os.path.basename(model_path).replace('_reference.wav', '')
            profile_path = os.path.join(model_dir, f"{model_name}_profile.json")
            
            if not os.path.exists(profile_path):
                raise Exception(f"Stimmenprofil nicht gefunden: {profile_path}")
            
            # Sprache mit Parler-TTS generieren
            output_path = self.parler_tts.synthesize_speech(text, profile_path, speed, pitch)
            
            logger.info(f"Sprache erfolgreich generiert: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Fehler bei der Sprachsynthese: {str(e)}")
            raise
    
    def get_model_info(self, model_path: str) -> Dict[str, Any]:
        """Gibt Informationen über ein trainiertes Modell zurück."""
        try:
            model_dir = os.path.dirname(model_path)
            model_name = os.path.basename(model_path).replace('_reference.wav', '')
            profile_path = os.path.join(model_dir, f"{model_name}_profile.json")
            
            if os.path.exists(profile_path):
                with open(profile_path, 'r', encoding='utf-8') as f:
                    profile = json.load(f)
                return profile
            else:
                return {'error': 'Modell-Informationen nicht verfügbar'}
                
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Modell-Informationen: {str(e)}")
            return {'error': str(e)}
    
    def list_available_models(self) -> List[Dict[str, Any]]:
        """Listet alle verfügbaren Stimmenmodelle auf."""
        models = []
        
        try:
            for filename in os.listdir(self.models_dir):
                if filename.endswith('_profile.json'):
                    profile_path = os.path.join(self.models_dir, filename)
                    
                    with open(profile_path, 'r', encoding='utf-8') as f:
                        profile = json.load(f)
                    
                    models.append({
                        'name': profile.get('name'),
                        'profile_path': profile_path,
                        'reference_path': profile.get('reference_audio_path'),
                        'quality_score': profile.get('quality_score'),
                        'duration': profile.get('duration'),
                        'created_at': profile.get('created_at'),
                        'model_type': profile.get('model_type')
                    })
            
            return sorted(models, key=lambda x: x.get('created_at', 0), reverse=True)
            
        except Exception as e:
            logger.error(f"Fehler beim Auflisten der Modelle: {str(e)}")
            return []
    
    def delete_model(self, model_name: str) -> bool:
        """Löscht ein Stimmenmodell."""
        try:
            profile_path = os.path.join(self.models_dir, f"{model_name}_profile.json")
            reference_path = os.path.join(self.models_dir, f"{model_name}_reference.wav")
            
            deleted_files = []
            
            if os.path.exists(profile_path):
                os.remove(profile_path)
                deleted_files.append(profile_path)
            
            if os.path.exists(reference_path):
                os.remove(reference_path)
                deleted_files.append(reference_path)
            
            if deleted_files:
                logger.info(f"Modell {model_name} gelöscht: {deleted_files}")
                return True
            else:
                logger.warning(f"Modell {model_name} nicht gefunden")
                return False
                
        except Exception as e:
            logger.error(f"Fehler beim Löschen des Modells: {str(e)}")
            return False
    
    def get_service_info(self) -> Dict[str, Any]:
        """Gibt Informationen über den Service zurück."""
        parler_info = self.parler_tts.get_model_info()
        
        return {
            'service_name': 'VoiceCloningService',
            'version': '2.0.0',
            'tts_engine': parler_info,
            'features': {
                'voice_cloning': True,
                'german_language': True,
                'mobile_optimized': True,
                'minimal_audio_required': True,
                'real_time_processing': True,
                'audio_enhancement': True
            },
            'supported_formats': ['wav', 'mp3', 'flac', 'm4a', 'ogg'],
            'max_text_length': 1000,
            'min_audio_duration': 3.0,
            'recommended_audio_duration': 30.0
        }

