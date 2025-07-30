from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Any, Dict, List
import json
import uuid
from pathlib import Path
from datetime import datetime
import subprocess

from app.schemas.game import GameAssetUpload, AIGenerationRequest, GameDataResponse
from app.deps import get_current_user, GAME_DIR, game_assets_path

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/data")
def get_game_data():
    """Get current game data"""
    try:
        game_data_path = GAME_DIR / "interactive_game_data.json"
        if not game_data_path.exists():
            raise HTTPException(status_code=404, detail="Game data not found")
        
        with open(game_data_path, 'r', encoding='utf-8') as f:
            game_data = json.load(f)
        
        return GameDataResponse(**game_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load game data: {str(e)}")


@router.get("/config")
def get_game_config():
    """Get game configuration"""
    try:
        config_path = GAME_DIR / "web_game_config.json"
        if not config_path.exists():
            raise HTTPException(status_code=404, detail="Game config not found")
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load game config: {str(e)}")


@router.get("/ai-tasks")
def get_ai_tasks():
    """Get AI generation tasks"""
    try:
        tasks_path = GAME_DIR / "ai_generation_tasks.json"
        if not tasks_path.exists():
            raise HTTPException(status_code=404, detail="AI tasks not found")
        
        with open(tasks_path, 'r', encoding='utf-8') as f:
            tasks = json.load(f)
        
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load AI tasks: {str(e)}")


@router.post("/assets/upload")
async def upload_game_asset(
    asset_type: str,
    asset_name: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload game asset (image/audio)"""
    try:
        # Validate asset type
        if asset_type not in ["character", "background", "audio"]:
            raise HTTPException(status_code=400, detail="Invalid asset type")
        
        # Create asset directory
        asset_dir = game_assets_path / asset_type / "user_uploads"
        asset_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{asset_name}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = asset_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update game data with new asset
        game_data_path = GAME_DIR / "interactive_game_data.json"
        if game_data_path.exists():
            with open(game_data_path, 'r', encoding='utf-8') as f:
                game_data = json.load(f)
            
            # Add user asset to game data
            if asset_type == "character":
                game_data["assets"]["characters"][asset_name] = {
                    "character_name": asset_name,
                    "user_uploaded": True,
                    "image_path": f"/game-assets/{asset_type}/user_uploads/{unique_filename}",
                    "uploaded_by": current_user.username,
                    "uploaded_at": datetime.now().isoformat()
                }
            elif asset_type == "background":
                game_data["assets"]["backgrounds"][asset_name] = {
                    "location_name": asset_name,
                    "user_uploaded": True,
                    "image_path": f"/game-assets/{asset_type}/user_uploads/{unique_filename}",
                    "uploaded_by": current_user.username,
                    "uploaded_at": datetime.now().isoformat()
                }
            
            # Save updated game data
            with open(game_data_path, 'w', encoding='utf-8') as f:
                json.dump(game_data, f, ensure_ascii=False, indent=2)
        
        return {
            "message": "Asset uploaded successfully",
            "asset_path": f"/game-assets/{asset_type}/user_uploads/{unique_filename}",
            "asset_name": asset_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload asset: {str(e)}")


@router.post("/assets/generate")
async def generate_ai_asset(
    request: AIGenerationRequest,
    current_user = Depends(get_current_user)
):
    """Generate asset using AI"""
    try:
        # This is a placeholder - in real implementation, you would:
        # 1. Use actual AI service (DALL-E, Midjourney, etc.)
        # 2. Generate the asset based on the prompt
        # 3. Save the generated file
        
        # For now, return a mock response
        asset_id = uuid.uuid4().hex[:8]
        mock_path = f"/game-assets/{request.asset_type}/ai_generated/mock_{asset_id}.png"
        
        # Create AI generated directory
        ai_dir = game_assets_path / request.asset_type / "ai_generated"
        ai_dir.mkdir(parents=True, exist_ok=True)
        
        return {
            "message": "AI generation request submitted",
            "asset_id": asset_id,
            "asset_path": mock_path,
            "prompt": request.prompt,
            "style": request.style,
            "status": "generating",
            "estimated_completion": "2-5 minutes"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate asset: {str(e)}")


@router.get("/assets/{asset_type}")
def list_game_assets(asset_type: str):
    """List all assets of a specific type"""
    try:
        if asset_type not in ["character", "background", "audio"]:
            raise HTTPException(status_code=400, detail="Invalid asset type")
        
        # Load current game data
        game_data_path = GAME_DIR / "interactive_game_data.json"
        if not game_data_path.exists():
            return {"assets": []}
        
        with open(game_data_path, 'r', encoding='utf-8') as f:
            game_data = json.load(f)
        
        assets = game_data.get("assets", {}).get(f"{asset_type}s", {})
        
        # Add file existence check
        asset_list = []
        for name, info in assets.items():
            asset_info = {
                "name": name,
                "info": info,
                "exists": True  # In real implementation, check file existence
            }
            asset_list.append(asset_info)
        
        return {"assets": asset_list}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list assets: {str(e)}")


@router.post("/regenerate")
async def regenerate_game_data():
    """Regenerate game data from the story tree"""
    try:
        # Run the game converter
        result = subprocess.run(
            ["python3", "simple_game_converter.py"],
            cwd=GAME_DIR,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=500, 
                detail=f"Game generation failed: {result.stderr}"
            )
        
        return {
            "message": "Game data regenerated successfully",
            "output": result.stdout
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate game: {str(e)}")


@router.get("/preview")
def get_game_preview_url():
    """Get game preview URL"""
    return {
        "preview_url": "/game-preview/demo_game.html",
        "enhanced_preview_url": "/game-preview/enhanced_demo_game.html"
    } 