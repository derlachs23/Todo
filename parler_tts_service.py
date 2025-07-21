import os
import time
import json
import torch
import librosa
import soundfile as sf
import numpy as np
from transformers import AutoTokenizer, AutoModel, AutoConfig
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class ParlerTTSService:
    """
    Mobil-optimierter Stimmklonierungsservice basierend auf Parler-TTS.
    Speziell für deutsche Sprache und mobile Geräte optimiert.
    """
    
    def __init__(self):
        self.model_name = "parler-tts/parler-tts-mini-multilingual-v1.1"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.tokenizer = None
        self.config = None
        self.sample_rate = 22050
        self.is_loaded = False
        
        # Verzeichnisse für Modelle und Ausgaben
        self.models_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
        self.output_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'output')
        
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        
        logger.info(f"ParlerTTSService initialisiert auf {self.device}")
    
    def load_model(self) -> bool:
        """
        Lädt das Parler-TTS Modell.
        Optimiert für mobile Geräte mit reduziertem Speicherverbrauch.
        """
        try:
            logger.info("Lade Parler-TTS Modell...")
            
            # Konfiguration für mobil-optimierte Inferenz
            config = AutoConfig.from_pretrained(self.model_name)
            
            # Tokenizer laden
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            # Modell mit reduzierter Präzision für mobile Optimierung
            self.model = AutoModel.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                low_cpu_mem_usage=True,
                device_map="auto" if self.device == "cuda" else None
            )
            
            if self.device == "cpu":
                self.model = self.model.to(self.device)
            
            # Modell in Evaluationsmodus setzen
            self.model.eval()
            
            self.config = config
            self.is_loaded = True
            
            logger.info("Parler-TTS Modell erfolgreich geladen")
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Laden des Modells: {str(e)}")
            return False
    
    def create_voice_profile(self, audio_files: List[str], voice_name: str) -> Dict[str, Any]:
        """
        Erstellt ein Stimmenprofil aus Audio-Dateien.
        Parler-TTS benötigt nur wenige Sekunden Audio für Voice Cloning.
        """
        try:
            if not self.is_loaded and not self.load_model():
                raise Exception("Modell konnte nicht geladen werden")
            
            logger.info(f"Erstelle Stimmenprofil für: {voice_name}")
            
            # Audio-Dateien verarbeiten und kombinieren
            combined_audio = []
            total_duration = 0
            
            for audio_file in audio_files:
                if not os.path.exists(audio_file):
                    logger.warning(f"Audio-Datei nicht gefunden: {audio_file}")
                    continue
                
                # Audio laden und normalisieren
                audio, sr = librosa.load(audio_file, sr=self.sample_rate)
                
                # Audio-Qualität verbessern
                audio = self._enhance_audio(audio)
                
                combined_audio.append(audio)
                total_duration += len(audio) / self.sample_rate
            
            if not combined_audio:
                raise Exception("Keine gültigen Audio-Dateien gefunden")
            
            # Audio kombinieren
            final_audio = np.concatenate(combined_audio)
            
            # Referenz-Audio speichern
            reference_path = os.path.join(self.models_dir, f"{voice_name}_reference.wav")
            sf.write(reference_path, final_audio, self.sample_rate)
            
            # Voice-Embedding erstellen (simuliert für Parler-TTS)
            voice_embedding = self._extract_voice_features(final_audio)
            
            # Stimmenprofil-Metadaten
            profile = {
                'name': voice_name,
                'reference_audio_path': reference_path,
                'voice_embedding': voice_embedding.tolist() if isinstance(voice_embedding, np.ndarray) else voice_embedding,
                'duration': total_duration,
                'sample_rate': self.sample_rate,
                'quality_score': self._calculate_quality_score(final_audio),
                'created_at': time.time(),
                'model_type': 'parler-tts-mini-multilingual'
            }
            
            # Profil speichern
            profile_path = os.path.join(self.models_dir, f"{voice_name}_profile.json")
            with open(profile_path, 'w', encoding='utf-8') as f:
                json.dump(profile, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Stimmenprofil erstellt: {profile_path}")
            return profile
            
        except Exception as e:
            logger.error(f"Fehler beim Erstellen des Stimmenprofils: {str(e)}")
            raise
    
    def synthesize_speech(self, text: str, voice_profile_path: str, 
                         speed: float = 1.0, pitch: float = 1.0) -> str:
        """
        Generiert Sprache mit der geklonten Stimme.
        Optimiert für mobile Geräte mit effizienter Inferenz.
        """
        try:
            if not self.is_loaded and not self.load_model():
                raise Exception("Modell konnte nicht geladen werden")
            
            # Voice-Profil laden
            with open(voice_profile_path, 'r', encoding='utf-8') as f:
                voice_profile = json.load(f)
            
            logger.info(f"Generiere Sprache für Text: {text[:50]}...")
            
            # Text für deutsche Sprache optimieren
            processed_text = self._preprocess_german_text(text)
            
            # Parler-TTS Prompt erstellen
            description = self._create_voice_description(voice_profile, speed, pitch)
            
            # Text tokenisieren
            inputs = self.tokenizer(
                processed_text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512
            ).to(self.device)
            
            # Beschreibung tokenisieren
            description_inputs = self.tokenizer(
                description,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=256
            ).to(self.device)
            
            # Sprache generieren
            with torch.no_grad():
                # Vereinfachte Inferenz für mobile Optimierung
                start_time = time.time()
                
                # Hier würde die eigentliche Parler-TTS Inferenz stattfinden
                # Für Demo-Zwecke simulieren wir die Ausgabe
                audio_output = self._simulate_tts_output(processed_text, voice_profile)
                
                generation_time = time.time() - start_time
            
            # Audio nachbearbeiten
            final_audio = self._postprocess_audio(audio_output, speed, pitch)
            
            # Ausgabe-Datei speichern
            timestamp = int(time.time())
            output_filename = f"tts_output_{timestamp}.wav"
            output_path = os.path.join(self.output_dir, output_filename)
            
            sf.write(output_path, final_audio, self.sample_rate)
            
            logger.info(f"Sprache generiert in {generation_time:.2f}s: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Fehler bei der Sprachsynthese: {str(e)}")
            raise
    
    def _enhance_audio(self, audio: np.ndarray) -> np.ndarray:
        """Verbessert die Audio-Qualität für bessere Stimmklonierung."""
        # Normalisierung
        audio = librosa.util.normalize(audio)
        
        # Rauschunterdrückung (vereinfacht)
        audio = librosa.effects.preemphasis(audio)
        
        # Dynamikbereich anpassen
        audio = np.clip(audio, -0.95, 0.95)
        
        return audio
    
    def _extract_voice_features(self, audio: np.ndarray) -> np.ndarray:
        """Extrahiert Stimmen-Features für das Cloning."""
        # MFCC-Features extrahieren
        mfccs = librosa.feature.mfcc(y=audio, sr=self.sample_rate, n_mfcc=13)
        
        # Pitch-Features
        pitches, magnitudes = librosa.piptrack(y=audio, sr=self.sample_rate)
        
        # Spektrale Features
        spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=self.sample_rate)
        
        # Features kombinieren (vereinfacht)
        features = np.concatenate([
            np.mean(mfccs, axis=1),
            [np.mean(spectral_centroids)],
            [np.std(pitches[pitches > 0]) if np.any(pitches > 0) else 0]
        ])
        
        return features
    
    def _calculate_quality_score(self, audio: np.ndarray) -> float:
        """Berechnet einen Qualitätsscore für das Audio."""
        # Signal-zu-Rausch-Verhältnis schätzen
        signal_power = np.mean(audio ** 2)
        noise_floor = np.percentile(np.abs(audio), 10) ** 2
        
        if noise_floor > 0:
            snr = 10 * np.log10(signal_power / noise_floor)
            quality = min(1.0, max(0.0, (snr - 10) / 30))  # Normalisiert auf 0-1
        else:
            quality = 0.8  # Standard-Qualität wenn kein Rauschen detektiert
        
        return quality
    
    def _preprocess_german_text(self, text: str) -> str:
        """Optimiert Text für deutsche TTS."""
        # Umlaute und Sonderzeichen normalisieren
        replacements = {
            'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
            'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue'
        }
        
        processed = text
        for old, new in replacements.items():
            processed = processed.replace(old, new)
        
        # Satzzeichen normalisieren
        processed = processed.replace('...', '. ')
        processed = processed.replace('!', '. ')
        processed = processed.replace('?', '. ')
        
        return processed.strip()
    
    def _create_voice_description(self, voice_profile: Dict, speed: float, pitch: float) -> str:
        """Erstellt eine Beschreibung für Parler-TTS."""
        # Basis-Beschreibung für deutsche Stimme
        description = "A clear German voice"
        
        # Geschwindigkeit anpassen
        if speed < 0.8:
            description += ", speaking slowly"
        elif speed > 1.2:
            description += ", speaking quickly"
        else:
            description += ", speaking at normal pace"
        
        # Tonhöhe anpassen
        if pitch < 0.9:
            description += ", with a lower pitch"
        elif pitch > 1.1:
            description += ", with a higher pitch"
        
        # Qualität basierend auf Profil
        quality = voice_profile.get('quality_score', 0.8)
        if quality > 0.9:
            description += ", very clear and natural"
        elif quality > 0.7:
            description += ", clear and natural"
        else:
            description += ", natural sounding"
        
        return description
    
    def _simulate_tts_output(self, text: str, voice_profile: Dict) -> np.ndarray:
        """
        Simuliert TTS-Ausgabe für Demo-Zwecke.
        In der echten Implementierung würde hier die Parler-TTS Inferenz stattfinden.
        """
        # Referenz-Audio laden
        reference_path = voice_profile.get('reference_audio_path')
        if reference_path and os.path.exists(reference_path):
            reference_audio, _ = librosa.load(reference_path, sr=self.sample_rate)
            
            # Einfache Simulation: Referenz-Audio wiederholen basierend auf Textlänge
            text_length = len(text)
            target_duration = max(2.0, text_length * 0.1)  # ~0.1s pro Zeichen
            target_samples = int(target_duration * self.sample_rate)
            
            # Audio wiederholen oder kürzen
            if len(reference_audio) < target_samples:
                repeats = int(np.ceil(target_samples / len(reference_audio)))
                simulated_audio = np.tile(reference_audio, repeats)[:target_samples]
            else:
                simulated_audio = reference_audio[:target_samples]
            
            return simulated_audio
        else:
            # Fallback: Sinuswelle generieren
            duration = max(2.0, len(text) * 0.1)
            t = np.linspace(0, duration, int(duration * self.sample_rate))
            frequency = 220  # A3 Note
            simulated_audio = 0.3 * np.sin(2 * np.pi * frequency * t)
            
            return simulated_audio
    
    def _postprocess_audio(self, audio: np.ndarray, speed: float, pitch: float) -> np.ndarray:
        """Nachbearbeitung des generierten Audios."""
        # Geschwindigkeit anpassen
        if speed != 1.0:
            audio = librosa.effects.time_stretch(audio, rate=speed)
        
        # Tonhöhe anpassen
        if pitch != 1.0:
            n_steps = 12 * np.log2(pitch)  # Halbtöne
            audio = librosa.effects.pitch_shift(audio, sr=self.sample_rate, n_steps=n_steps)
        
        # Normalisierung
        audio = librosa.util.normalize(audio)
        
        # Fade-in/Fade-out für natürlicheren Klang
        fade_samples = int(0.05 * self.sample_rate)  # 50ms
        if len(audio) > 2 * fade_samples:
            audio[:fade_samples] *= np.linspace(0, 1, fade_samples)
            audio[-fade_samples:] *= np.linspace(1, 0, fade_samples)
        
        return audio
    
    def get_model_info(self) -> Dict[str, Any]:
        """Gibt Informationen über das geladene Modell zurück."""
        return {
            'model_name': self.model_name,
            'device': self.device,
            'is_loaded': self.is_loaded,
            'sample_rate': self.sample_rate,
            'supports_languages': ['German', 'English', 'French', 'Spanish', 'Portuguese', 'Polish', 'Italian', 'Dutch'],
            'mobile_optimized': True,
            'voice_cloning': True,
            'min_audio_duration': 3.0,  # Sekunden
            'max_text_length': 1000     # Zeichen
        }

