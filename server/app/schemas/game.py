from pydantic import BaseModel
from typing import Any, Optional, Dict, List


class GameAssetUpload(BaseModel):
    asset_type: str  # "character", "background", "audio"
    asset_name: str
    description: Optional[str] = None


class AIGenerationRequest(BaseModel):
    asset_type: str  # "character", "background", "audio"
    prompt: str
    style: Optional[str] = "anime_style"
    

class GameDataResponse(BaseModel):
    game_info: Dict[str, Any]
    assets: Dict[str, Any]
    game_scenes: List[Dict[str, Any]] 