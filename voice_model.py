from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from src.models.user import db



class VoiceModel(db.Model):
    __tablename__ = 'voice_models'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Modell-spezifische Felder
    model_path = db.Column(db.String(255))  # Pfad zum trainierten Modell
    sample_audio_path = db.Column(db.String(255))  # Pfad zur Beispielaudio
    training_duration = db.Column(db.Float)  # Dauer des Trainingsaudios in Sekunden
    model_quality = db.Column(db.Float, default=0.0)  # Qualitätsbewertung 0-1
    
    # Metadaten als JSON
    model_metadata = db.Column(db.Text)  # JSON-String für zusätzliche Metadaten
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'model_path': self.model_path,
            'sample_audio_path': self.sample_audio_path,
            'training_duration': self.training_duration,
            'model_quality': self.model_quality,
            'metadata': json.loads(self.model_metadata) if self.model_metadata else {}
        }

class AudioSample(db.Model):
    __tablename__ = 'audio_samples'
    
    id = db.Column(db.Integer, primary_key=True)
    voice_model_id = db.Column(db.Integer, db.ForeignKey('voice_models.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.Float)  # Dauer in Sekunden
    sample_rate = db.Column(db.Integer)  # Sample-Rate
    file_size = db.Column(db.Integer)  # Dateigröße in Bytes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Audio-Qualitätsmetriken
    noise_level = db.Column(db.Float)  # Rauschpegel
    signal_quality = db.Column(db.Float)  # Signalqualität
    
    voice_model = db.relationship('VoiceModel', backref=db.backref('audio_samples', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'voice_model_id': self.voice_model_id,
            'filename': self.filename,
            'file_path': self.file_path,
            'duration': self.duration,
            'sample_rate': self.sample_rate,
            'file_size': self.file_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'noise_level': self.noise_level,
            'signal_quality': self.signal_quality
        }

class TTSRequest(db.Model):
    __tablename__ = 'tts_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    voice_model_id = db.Column(db.Integer, db.ForeignKey('voice_models.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    output_path = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processing_time = db.Column(db.Float)  # Verarbeitungszeit in Sekunden
    status = db.Column(db.String(50), default='pending')  # pending, processing, completed, failed
    
    voice_model = db.relationship('VoiceModel', backref=db.backref('tts_requests', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'voice_model_id': self.voice_model_id,
            'text': self.text,
            'output_path': self.output_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processing_time': self.processing_time,
            'status': self.status
        }

