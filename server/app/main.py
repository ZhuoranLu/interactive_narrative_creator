from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional, Dict, List
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
import logging

from app.agent.llm_client import LLMClient
from app.database import get_db, create_tables
from app.repositories import (
    NarrativeRepository, NodeRepository, EventRepository, 
    ActionRepository, WorldStateRepository, NarrativeGraphRepository
)

logger = logging.getLogger(__name__)

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

@app.get("/")
def read_root():
    return {"message": "Interactive Narrative API is running"}

# Database management endpoints
@app.post("/projects", response_model=ProjectResponse)
def create_project(request: ProjectCreateRequest, db: Session = Depends(get_db)):
    """Create a new narrative project"""
    try:
        narrative_repo = NarrativeRepository(db)
        project = narrative_repo.create_project(
            title=request.title,
            description=request.description,
            world_setting=request.world_setting,
            characters=request.characters,
            style=request.style
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