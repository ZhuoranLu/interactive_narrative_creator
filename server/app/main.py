from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional, Dict
from app.agent.llm_client import LLMClient
import logging
logger = logging.getLogger(__name__)
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NarrativePayload(BaseModel):
    request_type: str
    context: Dict[str, Any]
    current_node: Optional[Dict[str, Any]] = None
    user_input: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NarrativeResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Interactive Narrative API is running"}

@app.post("/narrative", response_model=NarrativeResponse)
def handle_narrative_request(payload: NarrativePayload):
    """
    Unified endpoint for all narrative operations.
    Handles structured payloads and routes to appropriate business logic.
    """
    logger.warning(f"Received payload: {payload}")
    try:
        # Initialize LLM client (you can move this to a service layer later)
        llm_client = LLMClient()
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