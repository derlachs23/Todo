import os
import numpy as np
import librosa
import soundfile as sf
import scipy.signal
from scipy.io import wavfile
import base64
import io
import uuid
from typing import Dict, Any, Tuple
import noisereduce as nr

class AudioProcessingService:
    """Service für professionelle Audioverarbeitung und -verbesserung"""
    
    def __init__(self):
        self.target_sample_rate = 22050
        self.upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
        self.processed_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'processed')
        
        # Erstelle Verzeichnisse
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)
    
    def analyze_audio(self, file_path: str) -> Dict[str, Any]:
        """Analysiere Audio-Datei und extrahiere Qualitätsmetriken"""
        try:
            # Lade Audio
            y, sr = librosa.load(file_path, sr=None)
            
            # Grundlegende Informationen
            duration = len(y) / sr
            
            # Berechne RMS (Root Mean Square) für Lautstärke
            rms = librosa.feature.rms(y=y)[0]
            avg_rms = np.mean(rms)
            
            # Berechne Spektrogramm für Frequenzanalyse
            stft = librosa.stft(y)
            magnitude = np.abs(stft)
            
            # Schätze Rauschpegel
            noise_level = self._estimate_noise_level(y, sr)
            
            # Berechne Signalqualität
            signal_quality = self._calculate_signal_quality(y, sr, noise_level)
            
            # Spektrale Merkmale
            spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
            spectral_bandwidth = np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr))
            spectral_rolloff = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))
            
            # Zero Crossing Rate
            zcr = np.mean(librosa.feature.zero_crossing_rate(y))
            
            # Dynamikbereich
            dynamic_range = np.max(rms) - np.min(rms)
            
            return {
                'duration': duration,
                'sample_rate': sr,
                'channels': 1 if y.ndim == 1 else y.shape[0],
                'avg_rms': float(avg_rms),
                'noise_level': float(noise_level),
                'signal_quality': float(signal_quality),
                'spectral_centroid': float(spectral_centroid),
                'spectral_bandwidth': float(spectral_bandwidth),
                'spectral_rolloff': float(spectral_rolloff),
                'zero_crossing_rate': float(zcr),
                'dynamic_range': float(dynamic_range)
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'duration': 0,
                'sample_rate': 0,
                'noise_level': 1.0,
                'signal_quality': 0.0
            }
    
    def _estimate_noise_level(self, y: np.ndarray, sr: int) -> float:
        """Schätze den Rauschpegel im Audio"""
        # Verwende die ersten und letzten 0.5 Sekunden als Rausch-Referenz
        noise_duration = min(0.5, len(y) / sr / 4)
        noise_samples = int(noise_duration * sr)
        
        if noise_samples > 0:
            # Anfang und Ende des Audios
            noise_start = y[:noise_samples]
            noise_end = y[-noise_samples:]
            noise_reference = np.concatenate([noise_start, noise_end])
            
            # RMS des Rauschens
            noise_rms = np.sqrt(np.mean(noise_reference**2))
            return min(noise_rms, 1.0)
        
        return 0.1  # Fallback-Wert
    
    def _calculate_signal_quality(self, y: np.ndarray, sr: int, noise_level: float) -> float:
        """Berechne die Signalqualität (0-1)"""
        # Signal-zu-Rausch-Verhältnis
        signal_rms = np.sqrt(np.mean(y**2))
        if noise_level > 0:
            snr = signal_rms / noise_level
            snr_score = min(snr / 10.0, 1.0)  # Normalisiere auf 0-1
        else:
            snr_score = 1.0
        
        # Dynamikbereich
        rms = librosa.feature.rms(y=y)[0]
        dynamic_range = np.max(rms) - np.min(rms)
        dynamic_score = min(dynamic_range * 10, 1.0)
        
        # Spektrale Klarheit
        stft = librosa.stft(y)
        magnitude = np.abs(stft)
        spectral_clarity = np.mean(magnitude) / (np.std(magnitude) + 1e-8)
        clarity_score = min(spectral_clarity / 100.0, 1.0)
        
        # Kombiniere Scores
        quality = (snr_score * 0.5 + dynamic_score * 0.3 + clarity_score * 0.2)
        return min(quality, 1.0)
    
    def enhance_audio(self, input_path: str) -> str:
        """Verbessere Audio-Qualität mit professionellen Tools"""
        try:
            # Lade Audio
            y, sr = librosa.load(input_path, sr=None)
            
            # 1. Rauschunterdrückung
            y_denoised = self._reduce_noise(y, sr)
            
            # 2. Normalisierung
            y_normalized = self._normalize_audio(y_denoised)
            
            # 3. Kompression für gleichmäßige Lautstärke
            y_compressed = self._apply_compression(y_normalized)
            
            # 4. EQ für bessere Sprachklarheit
            y_eq = self._apply_voice_eq(y_compressed, sr)
            
            # 5. Resampling auf Ziel-Sample-Rate
            if sr != self.target_sample_rate:
                y_resampled = librosa.resample(y_eq, orig_sr=sr, target_sr=self.target_sample_rate)
            else:
                y_resampled = y_eq
            
            # Speichere verbessertes Audio
            filename = f"enhanced_{uuid.uuid4()}.wav"
            output_path = os.path.join(self.processed_dir, filename)
            sf.write(output_path, y_resampled, self.target_sample_rate)
            
            return output_path
            
        except Exception as e:
            print(f"Fehler bei der Audio-Verbesserung: {e}")
            return input_path  # Fallback: Originaldatei zurückgeben
    
    def _reduce_noise(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Rauschunterdrückung"""
        try:
            # Verwende noisereduce Bibliothek
            y_denoised = nr.reduce_noise(y=y, sr=sr, prop_decrease=0.8)
            return y_denoised
        except:
            # Fallback: Einfacher Hochpassfilter
            nyquist = sr / 2
            low_cutoff = 80 / nyquist  # 80 Hz Hochpass
            b, a = scipy.signal.butter(4, low_cutoff, btype='high')
            return scipy.signal.filtfilt(b, a, y)
    
    def _normalize_audio(self, y: np.ndarray) -> np.ndarray:
        """Audio-Normalisierung"""
        # Peak-Normalisierung
        peak = np.max(np.abs(y))
        if peak > 0:
            y_normalized = y / peak * 0.95  # Lasse etwas Headroom
        else:
            y_normalized = y
        
        # RMS-Normalisierung für konsistente Lautstärke
        target_rms = 0.2
        current_rms = np.sqrt(np.mean(y_normalized**2))
        if current_rms > 0:
            rms_factor = target_rms / current_rms
            y_normalized = y_normalized * rms_factor
        
        return y_normalized
    
    def _apply_compression(self, y: np.ndarray) -> np.ndarray:
        """Dynamikkompression für gleichmäßige Lautstärke"""
        # Einfache Kompression
        threshold = 0.5
        ratio = 4.0
        
        # Berechne Envelope
        envelope = np.abs(y)
        
        # Glättung der Envelope
        envelope_smooth = scipy.signal.savgol_filter(envelope, 101, 3)
        
        # Kompression anwenden
        compressed = np.where(
            envelope_smooth > threshold,
            threshold + (envelope_smooth - threshold) / ratio,
            envelope_smooth
        )
        
        # Anwenden auf Original-Signal
        gain = np.where(envelope_smooth > 0, compressed / envelope_smooth, 1.0)
        return y * gain
    
    def _apply_voice_eq(self, y: np.ndarray, sr: int) -> np.ndarray:
        """EQ für bessere Sprachklarheit"""
        # Boost für Sprachfrequenzen (1-4 kHz)
        nyquist = sr / 2
        
        # Hochpass bei 80 Hz
        high_low = 80 / nyquist
        b_hp, a_hp = scipy.signal.butter(2, high_low, btype='high')
        y_hp = scipy.signal.filtfilt(b_hp, a_hp, y)
        
        # Boost bei 2-3 kHz (Sprachklarheit)
        low_freq = 2000 / nyquist
        high_freq = 3000 / nyquist
        b_boost, a_boost = scipy.signal.butter(2, [low_freq, high_freq], btype='band')
        boost_signal = scipy.signal.filtfilt(b_boost, a_boost, y_hp)
        
        # Kombiniere Original mit Boost
        y_eq = y_hp + 0.3 * boost_signal
        
        # Tiefpass bei 8 kHz (Anti-Aliasing)
        low_pass = 8000 / nyquist
        if low_pass < 1.0:
            b_lp, a_lp = scipy.signal.butter(4, low_pass, btype='low')
            y_eq = scipy.signal.filtfilt(b_lp, a_lp, y_eq)
        
        return y_eq
    
    def process_recorded_audio(self, audio_data: str, model_id: int) -> str:
        """Verarbeite aufgenommene Audio-Daten"""
        try:
            # Dekodiere Base64-Audio-Daten
            audio_bytes = base64.b64decode(audio_data)
            
            # Konvertiere zu numpy array
            audio_io = io.BytesIO(audio_bytes)
            
            # Versuche verschiedene Formate
            try:
                # WAV-Format
                sr, y = wavfile.read(audio_io)
                y = y.astype(np.float32)
                if y.dtype == np.int16:
                    y = y / 32768.0
                elif y.dtype == np.int32:
                    y = y / 2147483648.0
            except:
                # Fallback: Verwende librosa
                audio_io.seek(0)
                y, sr = librosa.load(audio_io, sr=None)
            
            # Speichere Rohdaten
            raw_filename = f"recording_{model_id}_{uuid.uuid4()}.wav"
            raw_path = os.path.join(self.upload_dir, raw_filename)
            sf.write(raw_path, y, sr)
            
            # Verbessere Audio
            enhanced_path = self.enhance_audio(raw_path)
            
            return enhanced_path
            
        except Exception as e:
            raise Exception(f"Fehler bei der Verarbeitung der Aufnahme: {e}")
    
    def convert_format(self, input_path: str, output_format: str = 'wav') -> str:
        """Konvertiere Audio-Format"""
        try:
            y, sr = librosa.load(input_path, sr=None)
            
            filename = f"converted_{uuid.uuid4()}.{output_format}"
            output_path = os.path.join(self.processed_dir, filename)
            
            sf.write(output_path, y, sr)
            return output_path
            
        except Exception as e:
            raise Exception(f"Fehler bei der Format-Konvertierung: {e}")
    
    def trim_silence(self, input_path: str, threshold_db: float = -40) -> str:
        """Entferne Stille am Anfang und Ende"""
        try:
            y, sr = librosa.load(input_path, sr=None)
            
            # Trimme Stille
            y_trimmed, _ = librosa.effects.trim(y, top_db=-threshold_db)
            
            filename = f"trimmed_{uuid.uuid4()}.wav"
            output_path = os.path.join(self.processed_dir, filename)
            sf.write(output_path, y_trimmed, sr)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Fehler beim Trimmen: {e}")
    
    def get_audio_info(self, file_path: str) -> Dict[str, Any]:
        """Hole detaillierte Audio-Informationen"""
        try:
            y, sr = librosa.load(file_path, sr=None)
            
            # Grundlegende Informationen
            duration = len(y) / sr
            file_size = os.path.getsize(file_path)
            
            # Spektrale Analyse
            stft = librosa.stft(y)
            magnitude = np.abs(stft)
            
            # Frequenzbereich
            freqs = librosa.fft_frequencies(sr=sr)
            freq_magnitude = np.mean(magnitude, axis=1)
            dominant_freq = freqs[np.argmax(freq_magnitude)]
            
            # Tempo und Beat
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            
            return {
                'duration': duration,
                'sample_rate': sr,
                'file_size': file_size,
                'channels': 1 if y.ndim == 1 else y.shape[0],
                'dominant_frequency': float(dominant_freq),
                'tempo': float(tempo),
                'beat_count': len(beats),
                'max_amplitude': float(np.max(np.abs(y))),
                'rms': float(np.sqrt(np.mean(y**2)))
            }
            
        except Exception as e:
            return {'error': str(e)}

