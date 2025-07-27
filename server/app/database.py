"""
Database configuration and models for Interactive Narrative Creator
"""

from sqlalchemy import create_engine, Column, String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
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


class NarrativeProject(Base):
    """Represents a narrative project/story"""
    __tablename__ = "narrative_projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text)
    world_setting = Column(Text)
    characters = Column(JSON)  # List of character names
    style = Column(String)
    start_node_id = Column(String, ForeignKey("narrative_nodes.id"))
    meta_data = Column(JSON)  # Renamed from metadata to avoid SQLAlchemy conflict
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - specify foreign_keys to avoid ambiguity
    nodes = relationship("NarrativeNode", foreign_keys="NarrativeNode.project_id", back_populates="project", cascade="all, delete-orphan")
    start_node = relationship("NarrativeNode", foreign_keys=[start_node_id], post_update=True)


class NarrativeNode(Base):
    """Represents a narrative node in the graph"""
    __tablename__ = "narrative_nodes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("narrative_projects.id"), nullable=False)
    scene = Column(Text, nullable=False)
    node_type = Column(String, default="scene")  # "scene" or "event"
    level = Column(Integer, default=0)
    parent_node_id = Column(String, ForeignKey("narrative_nodes.id"))
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