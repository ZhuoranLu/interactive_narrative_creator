"""
Database configuration and models for Interactive Narrative Creator
"""

from sqlalchemy import create_engine, Column, String, Text, Integer, Boolean, DateTime, ForeignKey, JSON, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
from typing import Dict, Any, Optional, List
import json
import uuid
import os
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Get the directory containing this file
    current_dir = Path(__file__).parent
    # Look for .env file in the server directory (parent of app)
    env_path = current_dir.parent / '.env'
    load_dotenv(env_path)
except ImportError:
    # dotenv not available, skip loading
    pass

# Database URL configuration
# Priority: Environment variable > PostgreSQL default > SQLite fallback
def get_database_url():
    # Check if DATABASE_URL environment variable is set
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    
    # Default PostgreSQL configuration
    pg_user = os.getenv("POSTGRES_USER", "postgres")
    pg_password = os.getenv("POSTGRES_PASSWORD", "password")
    pg_host = os.getenv("POSTGRES_HOST", "localhost")
    pg_port = os.getenv("POSTGRES_PORT", "5432")
    pg_db = os.getenv("POSTGRES_DB", "narrative_creator")
    
    return f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"

DATABASE_URL = get_database_url()

# Create engine with PostgreSQL optimizations
engine_kwargs = {
    "echo": os.getenv("DEBUG", "False").lower() == "true"
}

# Add PostgreSQL-specific configurations
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,  # Enables automatic reconnection
        "pool_recycle": 3600   # Recycle connections every hour
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


# ====================
# USER MANAGEMENT MODELS
# ====================

class User(Base):
    """User account management"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    
    # Token/Credit system
    token_balance = Column(Integer, default=1000)  # Starting tokens
    total_tokens_purchased = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    
    # Profile information
    avatar_url = Column(String(255))
    bio = Column(Text)
    preferred_language = Column(String(10), default='en')
    timezone = Column(String(50), default='UTC')
    
    # Account timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)
    email_verified_at = Column(DateTime)
    
    # Relationships
    projects = relationship("NarrativeProject", back_populates="owner", cascade="all, delete-orphan")
    token_transactions = relationship("TokenTransaction", back_populates="user", cascade="all, delete-orphan")
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    collaborations = relationship("ProjectCollaborator", foreign_keys="ProjectCollaborator.user_id", back_populates="user")


class TokenTransaction(Base):
    """Track token usage and purchases"""
    __tablename__ = "token_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Transaction details
    transaction_type = Column(String(20), nullable=False)  # 'purchase', 'usage', 'refund', 'bonus'
    amount = Column(Integer, nullable=False)  # Positive for credits, negative for usage
    balance_after = Column(Integer, nullable=False)
    
    # Usage context
    project_id = Column(String, ForeignKey("narrative_projects.id"))
    operation_type = Column(String(50))  # 'generate_scene', 'generate_dialogue', 'ai_suggestion'
    operation_details = Column(JSON)  # Store details about what was generated
    
    # Payment information (for purchases)
    payment_method = Column(String(50))  # 'stripe', 'paypal', 'admin_grant'
    payment_reference = Column(String(255))  # External payment ID
    
    # Metadata
    description = Column(Text)
    meta_data = Column(JSON)  # Renamed from metadata to avoid SQLAlchemy conflict
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="token_transactions")
    project = relationship("NarrativeProject", foreign_keys=[project_id])


class UserSession(Base):
    """Track user login sessions and JWT tokens"""
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Session details
    token_hash = Column(String(255), unique=True, nullable=False)  # Hashed JWT token
    refresh_token_hash = Column(String(255), unique=True)
    
    # Session metadata
    device_info = Column(JSON)  # Browser, OS, device type
    ip_address = Column(String(45))  # IPv4 or IPv6
    location = Column(JSON)  # City, country, etc.
    
    # Session lifecycle
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="user_sessions")


class UserPreferences(Base):
    """User application preferences and settings"""
    __tablename__ = "user_preferences"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    
    # UI Preferences
    theme = Column(String(20), default='light')  # 'light', 'dark', 'auto'
    language = Column(String(10), default='en')
    
    # Narrative Generation Preferences
    default_story_style = Column(String(50))
    preferred_ai_model = Column(String(50))
    creativity_level = Column(Float, default=0.7)  # 0.0 to 1.0
    
    # Notification Preferences
    email_notifications = Column(Boolean, default=True)
    project_sharing_notifications = Column(Boolean, default=True)
    marketing_emails = Column(Boolean, default=False)
    
    # Advanced Settings
    auto_save_interval = Column(Integer, default=30)  # seconds
    max_concurrent_projects = Column(Integer, default=5)
    api_rate_limit = Column(Integer, default=100)  # requests per hour
    
    # Custom preferences (flexible JSON field)
    custom_settings = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="preferences")


class ProjectCollaborator(Base):
    """Project collaboration management"""
    __tablename__ = "project_collaborators"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("narrative_projects.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Collaboration details
    role = Column(String(20), default='viewer')  # 'owner', 'editor', 'commenter', 'viewer'
    permissions = Column(JSON)  # Detailed permissions
    
    # Invitation details
    invited_by = Column(String, ForeignKey("users.id"))
    invited_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Activity tracking
    last_activity = Column(DateTime)
    contributions_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("NarrativeProject", back_populates="collaborators")
    user = relationship("User", foreign_keys=[user_id], back_populates="collaborations")
    inviter = relationship("User", foreign_keys=[invited_by])
    
    # Unique constraint to prevent duplicate collaborations
    __table_args__ = (
        Index('ix_project_user_unique', 'project_id', 'user_id', unique=True),
    )


# ====================
# NARRATIVE MODELS (UPDATED)
# ====================

class NarrativeProject(Base):
    """Represents a narrative project/story"""
    __tablename__ = "narrative_projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # User ownership
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Project basic info
    title = Column(String, nullable=False)
    description = Column(Text)
    world_setting = Column(Text)
    characters = Column(JSON)  # List of character names
    style = Column(String)
    start_node_id = Column(String, ForeignKey("narrative_nodes.id"))
    
    # Project settings
    is_public = Column(Boolean, default=False)
    is_collaborative = Column(Boolean, default=False)
    max_collaborators = Column(Integer, default=5)
    
    # Usage tracking
    total_tokens_used = Column(Integer, default=0)
    node_count = Column(Integer, default=0)
    last_accessed = Column(DateTime, default=datetime.utcnow)
    
    # Metadata and timestamps
    meta_data = Column(JSON)  # Renamed from metadata to avoid SQLAlchemy conflict
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - specify foreign_keys to avoid ambiguity
    owner = relationship("User", back_populates="projects")
    nodes = relationship("NarrativeNode", foreign_keys="NarrativeNode.project_id", back_populates="project", cascade="all, delete-orphan")
    start_node = relationship("NarrativeNode", foreign_keys=[start_node_id], post_update=True)
    collaborators = relationship("ProjectCollaborator", back_populates="project", cascade="all, delete-orphan")


class NarrativeNode(Base):
    """Represents a narrative node in the graph"""
    __tablename__ = "narrative_nodes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("narrative_projects.id"), nullable=False)
    scene = Column(Text, nullable=False)
    node_type = Column(String, default="scene")  # "scene" or "event"
    level = Column(Integer, default=0)
    parent_node_id = Column(String, ForeignKey("narrative_nodes.id"))
    
    # Generation tracking
    tokens_used = Column(Integer, default=0)
    generation_model = Column(String(50))  # Which AI model was used
    generation_params = Column(JSON)  # Model parameters used
    
    meta_data = Column(JSON)  # Renamed from metadata to avoid SQLAlchemy conflict
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - specify foreign_keys to avoid ambiguity
    project = relationship("NarrativeProject", foreign_keys=[project_id], back_populates="nodes")
    events = relationship("NarrativeEvent", back_populates="node", cascade="all, delete-orphan")
    outgoing_actions = relationship("ActionBinding", foreign_keys="ActionBinding.source_node_id", back_populates="source_node", cascade="all, delete-orphan")
    parent_node = relationship("NarrativeNode", foreign_keys=[parent_node_id], remote_side=[id])
    child_nodes = relationship("NarrativeNode", foreign_keys=[parent_node_id], back_populates="parent_node")


class NarrativeEvent(Base):
    """Represents an event within a narrative node"""
    __tablename__ = "narrative_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id = Column(String, ForeignKey("narrative_nodes.id"), nullable=False)
    speaker = Column(String, default="")
    content = Column(Text, nullable=False)
    description = Column(Text, default="")  # For backward compatibility
    timestamp = Column(Integer, default=0)
    event_type = Column(String, default="dialogue")  # "dialogue" or "narration"
    
    # Generation tracking
    tokens_used = Column(Integer, default=0)
    generation_model = Column(String(50))
    
    meta_data = Column(JSON)  # Renamed from metadata to avoid SQLAlchemy conflict
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    node = relationship("NarrativeNode", back_populates="events")
    actions = relationship("Action", back_populates="event", cascade="all, delete-orphan")


class Action(Base):
    """Represents a player action"""
    __tablename__ = "actions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("narrative_events.id"))
    description = Column(Text, nullable=False)
    is_key_action = Column(Boolean, default=False)
    
    # Generation tracking
    tokens_used = Column(Integer, default=0)
    generation_model = Column(String(50))
    
    meta_data = Column(JSON)  # Renamed from metadata to avoid SQLAlchemy conflict
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("NarrativeEvent", back_populates="actions")
    bindings = relationship("ActionBinding", back_populates="action", cascade="all, delete-orphan")


class ActionBinding(Base):
    """Represents a bound action with its target"""
    __tablename__ = "action_bindings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action_id = Column(String, ForeignKey("actions.id"), nullable=False)
    source_node_id = Column(String, ForeignKey("narrative_nodes.id"), nullable=False)
    target_node_id = Column(String, ForeignKey("narrative_nodes.id"))
    target_event_id = Column(String, ForeignKey("narrative_events.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships - specify foreign_keys to avoid ambiguity
    action = relationship("Action", back_populates="bindings")
    source_node = relationship("NarrativeNode", foreign_keys=[source_node_id], back_populates="outgoing_actions")
    target_node = relationship("NarrativeNode", foreign_keys=[target_node_id])
    target_event = relationship("NarrativeEvent", foreign_keys=[target_event_id])


class WorldState(Base):
    """Represents the world state for a narrative project"""
    __tablename__ = "world_states"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("narrative_projects.id"), nullable=False)
    current_node_id = Column(String, ForeignKey("narrative_nodes.id"))
    state_data = Column(JSON)  # The actual world state as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("NarrativeProject")
    current_node = relationship("NarrativeNode")


# Database session dependency
def get_db() -> Session:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create all tables
def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine) 