from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Any, Optional, Dict, List
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
import logging
from datetime import datetime, timedelta
import jwt
import os

from app.agent.llm_client import LLMClient
from app.database import get_db, create_tables
from app.repositories import (
    NarrativeRepository, NodeRepository, EventRepository, 
    ActionRepository, WorldStateRepository, NarrativeGraphRepository
)
from app.user_repositories import UserRepository, TokenRepository, SessionRepository, UserPreferencesRepository

logger = logging.getLogger(__name__)

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# Global LLM client instance
llm_client_instance = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup
    global llm_client_instance
    llm_client_instance = LLMClient()
    
    # Create database tables
    create_tables()
    logger.info("Database tables created")
    logger.info("LLM client initialized on startup")
    
    yield
    
    # Shutdown
    logger.info("Application shutting down")

app = FastAPI(lifespan=lifespan)

def get_llm_client() -> LLMClient:
    """Dependency to get LLM client instance"""
    if llm_client_instance is None:
        raise HTTPException(status_code=500, detail="LLM client not initialized")
    return llm_client_instance

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for requests and responses
class ProjectCreateRequest(BaseModel):
    title: str
    description: str = ""
    world_setting: str = ""
    characters: List[str] = []
    style: str = ""

class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    world_setting: str
    characters: List[str]
    style: str
    start_node_id: Optional[str]
    created_at: str
    updated_at: str

class NarrativePayload(BaseModel):
    request_type: str
    context: Dict[str, Any]
    current_node: Optional[Dict[str, Any]] = None
    user_input: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    project_id: Optional[str] = None

class NarrativeResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None

class SaveGraphRequest(BaseModel):
    project_id: Optional[str] = None
    graph_data: Dict[str, Any]
    world_state: Optional[Dict[str, Any]] = None

# ====================
# USER AUTHENTICATION MODELS
# ====================

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    is_premium: bool
    token_balance: int
    created_at: datetime

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None

# ====================
# AUTHENTICATION FUNCTIONS
# ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        if username is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = TokenData(username=username, user_id=user_id)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data

def get_current_user(token_data: TokenData = Depends(verify_token), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    user_repo = UserRepository(db)
    user = user_repo.get_user_by_id(token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return user

@app.get("/")
def read_root():
    return {"message": "Interactive Narrative API is running"}

# Database management endpoints
@app.post("/projects", response_model=ProjectResponse)
def create_project(request: ProjectCreateRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new narrative project"""
    try:
        narrative_repo = NarrativeRepository(db)
        project = narrative_repo.create_project(
            title=request.title,
            description=request.description,
            world_setting=request.world_setting,
            characters=request.characters,
            style=request.style,
            owner_id=current_user.id
        )
        
        return ProjectResponse(
            id=project.id,
            title=project.title,
            description=project.description or "",
            world_setting=project.world_setting or "",
            characters=project.characters or [],
            style=project.style or "",
            start_node_id=project.start_node_id,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")

@app.get("/projects", response_model=List[ProjectResponse])
def get_all_projects(db: Session = Depends(get_db)):
    """Get all narrative projects"""
    try:
        narrative_repo = NarrativeRepository(db)
        projects = narrative_repo.get_all_projects()
        
        return [
            ProjectResponse(
                id=project.id,
                title=project.title,
                description=project.description or "",
                world_setting=project.world_setting or "",
                characters=project.characters or [],
                style=project.style or "",
                start_node_id=project.start_node_id,
                created_at=project.created_at.isoformat(),
                updated_at=project.updated_at.isoformat()
            )
            for project in projects
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching projects: {str(e)}")

@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Get a specific project"""
    try:
        narrative_repo = NarrativeRepository(db)
        project = narrative_repo.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return ProjectResponse(
            id=project.id,
            title=project.title,
            description=project.description or "",
            world_setting=project.world_setting or "",
            characters=project.characters or [],
            style=project.style or "",
            start_node_id=project.start_node_id,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project: {str(e)}")

@app.get("/user/projects", response_model=List[ProjectResponse])
def get_user_projects(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get projects owned by the current user"""
    try:
        narrative_repo = NarrativeRepository(db)
        projects = narrative_repo.get_projects_by_owner(current_user.id)
        
        return [
            ProjectResponse(
                id=project.id,
                title=project.title,
                description=project.description or "",
                world_setting=project.world_setting or "",
                characters=project.characters or [],
                style=project.style or "",
                start_node_id=project.start_node_id,
                created_at=project.created_at.isoformat(),
                updated_at=project.updated_at.isoformat()
            )
            for project in projects
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user projects: {str(e)}")

@app.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete a project"""
    try:
        narrative_repo = NarrativeRepository(db)
        success = narrative_repo.delete_project(project_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {"message": f"Project {project_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting project: {str(e)}")

@app.post("/save_graph")
def save_narrative_graph(request: SaveGraphRequest, db: Session = Depends(get_db)):
    """Save a narrative graph to the database"""
    try:
        graph_repo = NarrativeGraphRepository(db)
        
        # Here you would convert the graph_data to a NarrativeGraph object
        # For now, just save basic info
        narrative_repo = NarrativeRepository(db)
        
        if request.project_id:
            # Update existing project
            project = narrative_repo.get_project(request.project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            project_id = request.project_id
        else:
            # Create new project
            project = narrative_repo.create_project(
                title=request.graph_data.get("title", "Untitled Story"),
                description="Saved narrative graph"
            )
            project_id = project.id

        # Save world state if provided
        if request.world_state:
            world_state_repo = WorldStateRepository(db)
            world_state_repo.save_world_state(
                project_id=project_id,
                current_node_id=request.world_state.get("current_node_id"),
                state_data=request.world_state
            )

        return {
            "success": True,
            "project_id": project_id,
            "message": "Graph saved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving graph: {str(e)}")

@app.get("/load_graph/{project_id}")
def load_narrative_graph(project_id: str, db: Session = Depends(get_db)):
    """Load a narrative graph from the database"""
    try:
        graph_repo = NarrativeGraphRepository(db)
        world_state_repo = WorldStateRepository(db)
        
        # Load the narrative graph
        graph = graph_repo.load_narrative_graph(project_id)
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Load world state
        world_state = world_state_repo.get_world_state(project_id)
        
        return {
            "success": True,
            "data": {
                "graph": graph.to_dict() if hasattr(graph, 'to_dict') else {},
                "world_state": world_state.state_data if world_state else {}
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading graph: {str(e)}")

@app.get("/user/projects/{project_id}/story-tree")
def load_user_project_story_tree(project_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Load a user's project as a story tree structure"""
    try:
        # First verify the project belongs to the current user
        narrative_repo = NarrativeRepository(db)
        project = narrative_repo.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: You don't own this project")
        
        # Load nodes, events, and actions for this project
        node_repo = NodeRepository(db)
        event_repo = EventRepository(db)
        action_repo = ActionRepository(db)
        
        nodes = node_repo.get_nodes_by_project(project_id)
        
        # Build story tree structure
        story_tree = {
            "nodes": {},
            "connections": [],
            "root_node_id": project.start_node_id
        }
        
        for node in nodes:
            # Get events for this node
            events = event_repo.get_events_by_node(node.id)
            
            # Get action bindings for this node (outgoing actions)
            outgoing_actions = []
            for action_binding in node.outgoing_actions:
                action_data = {
                    "action": {
                        "id": action_binding.action.id,
                        "description": action_binding.action.description,
                        "is_key_action": action_binding.action.is_key_action,
                        "metadata": action_binding.action.meta_data or {}
                    },
                    "target_node_id": action_binding.target_node_id,
                    "target_event": None
                }
                outgoing_actions.append(action_data)
                
                # Build connection data if target node exists
                if action_binding.target_node_id:
                    connection = {
                        "from_node_id": node.id,
                        "to_node_id": action_binding.target_node_id,
                        "action_id": action_binding.action.id,
                        "action_description": action_binding.action.description
                    }
                    story_tree["connections"].append(connection)
            
            # Convert node to story tree format
            story_tree["nodes"][node.id] = {
                "id": node.id,
                "level": node.level,
                "type": node.node_type,
                "parent_node_id": node.parent_node_id,
                "data": {
                    "scene": node.scene,
                    "events": [
                        {
                            "id": event.id,
                            "speaker": event.speaker,
                            "content": event.content,
                            "event_type": event.event_type,
                            "timestamp": event.timestamp
                        }
                        for event in events
                    ],
                    "outgoing_actions": outgoing_actions
                }
            }
        
        return {
            "success": True,
            "data": story_tree
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading project story tree: {str(e)}")

@app.post("/narrative", response_model=NarrativeResponse)
def handle_narrative_request(payload: NarrativePayload, llm_client: LLMClient = Depends(get_llm_client), db: Session = Depends(get_db)):
    """
    Unified endpoint for all narrative operations.
    Handles structured payloads and routes to appropriate business logic.
    """
    logger.warning(f"Received payload: {payload}")
    try:
        # LLM client is now injected as a dependency
        logger.info(f"Received payload: {payload}")

        # Route based on request_type
        if payload.request_type == "bootstrap_node":
            # Handle story bootstrap
            idea = payload.context.get("idea", payload.user_input)
            if not idea:
                raise HTTPException(status_code=400, detail="Missing idea for bootstrap_node")
            
            # TODO: Call your NarrativeGenerator.bootstrap_node() here
            # For now, return a mock response
            
            result = {
                "node": {
                    "scene": f"Generated story based on: {idea}",
                    "events": [],
                    "actions": []
                },
                "world_state": {}
            }
            
            # Auto-save to database if project_id provided
            if payload.project_id:
                try:
                    graph_repo = NarrativeGraphRepository(db)
                    # Create a simple node and save it
                    # This would be replaced with actual NarrativeGenerator integration
                    pass
                except Exception as save_error:
                    logger.error(f"Error auto-saving: {save_error}")
            
            return NarrativeResponse(
                success=True,
                data=result,
                message=f"Story bootstrapped with idea: {idea}"
            )
        
        elif payload.request_type == "generate_next_node":
            # Handle next node generation
            world_state = payload.context.get("world_state", {})
            selected_action = payload.context.get("selected_action")
            
            # TODO: Call your NarrativeGenerator.generate_next_node() here
            result = {
                "node": {
                    "scene": "Generated next scene",
                    "events": [],
                    "actions": []
                },
                "world_state": world_state
            }
            
            return NarrativeResponse(
                success=True,
                data=result,
                message="Next node generated"
            )
        
        elif payload.request_type == "apply_action":
            # Handle action application
            action_id = payload.context.get("action_id")
            world_state = payload.context.get("world_state", {})
            
            if not action_id:
                raise HTTPException(status_code=400, detail="Missing action_id for apply_action")
            
            # TODO: Call your NarrativeGenerator.apply_action() here
            result = {
                "next_node": None,  # or new node if action causes jump
                "world_state": world_state,
                "response_text": f"Applied action: {action_id}"
            }
            
            return NarrativeResponse(
                success=True,
                data=result,
                message=f"Action {action_id} applied"
            )
        
        elif payload.request_type == "regenerate_part":
            # Handle content regeneration
            part_type = payload.context.get("part_type")
            additional_context = payload.context.get("additional_context", "")
            
            if not part_type:
                raise HTTPException(status_code=400, detail="Missing part_type for regenerate_part")
            
            # TODO: Call your NarrativeEditor.regenerate_part() here
            result = {
                "node": payload.current_node,  # Updated node
                "regenerated_part": part_type
            }
            
            return NarrativeResponse(
                success=True,
                data=result,
                message=f"Regenerated {part_type}"
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown request_type: {payload.request_type}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return NarrativeResponse(
            success=False,
            error=str(e),
            message="Internal server error"
        )

# Keep legacy endpoints for backward compatibility (optional)
@app.post("/generate_story")
def generate_story(request: dict):
    return {"message": "Use /narrative endpoint with request_type='bootstrap_node'"}

@app.post("/continue_story")
def continue_story(request: dict):
    return {"message": "Use /narrative endpoint with request_type='generate_next_node'"}

@app.post("/generate_plot")
def generate_plot(request: dict):
    return {"message": "Use /narrative endpoint with request_type='regenerate_part'"}


# ====================
# USER AUTHENTICATION ENDPOINTS
# ====================

@app.post("/auth/login", response_model=LoginResponse)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """User login endpoint"""
    user_repo = UserRepository(db)
    
    # Get user by username
    user = user_repo.get_user_by_username(user_credentials.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not user_repo.verify_password(user, user_credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id}, 
        expires_delta=access_token_expires
    )
    
    # Update last login
    user_repo.update_last_login(user.id)
    
    # Create user response
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_premium=user.is_premium,
        token_balance=user.token_balance,
        created_at=user.created_at
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@app.post("/auth/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """User registration endpoint"""
    user_repo = UserRepository(db)
    
    # Check if username already exists
    if user_repo.get_user_by_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    if user_repo.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    try:
        user = user_repo.create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name
        )
        
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_premium=user.is_premium,
            token_balance=user.token_balance,
            created_at=user.created_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        is_premium=current_user.is_premium,
        token_balance=current_user.token_balance,
        created_at=current_user.created_at
    )

@app.post("/auth/logout")
def logout(current_user = Depends(get_current_user)):
    """User logout endpoint"""
    # In a more sophisticated implementation, you would invalidate the token
    # For now, we'll just return a success message
    return {"message": "Successfully logged out"}

@app.get("/auth/token-balance")
def get_token_balance(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's current token balance"""
    token_repo = TokenRepository(db)
    balance = token_repo.get_user_balance(current_user.id)
    return {"user_id": current_user.id, "token_balance": balance}