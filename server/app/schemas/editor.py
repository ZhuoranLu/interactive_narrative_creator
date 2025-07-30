from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Union
from datetime import datetime


class Position(BaseModel):
    x: Union[str, int, float]
    y: Union[str, int, float]


class Size(BaseModel):
    width: Union[str, int, float]
    height: Union[str, int, float]


class TemplateElement(BaseModel):
    id: str
    type: str  # background, character, dialogue, text, choices, etc.
    name: str
    position: Position
    size: Optional[Size] = None
    style: Dict[str, Any] = {}
    properties: Dict[str, Any] = {}
    visible: bool = True
    locked: bool = False
    z_index: int = 0


class WebGLEffect(BaseModel):
    id: str
    type: str  # particle, shader, lighting, etc.
    name: str
    config: Dict[str, Any]
    target_element: Optional[str] = None
    enabled: bool = True
    created_at: str


class Animation(BaseModel):
    id: str
    name: str
    type: str  # css, gsap, custom
    target_element: str
    keyframes: List[Dict[str, Any]]
    duration: float = 1.0
    delay: float = 0.0
    repeat: int = 0
    easing: str = "ease"


class Viewport(BaseModel):
    width: int = 1920
    height: int = 1080
    scale: float = 1.0


class WebGLConfig(BaseModel):
    enabled: bool = True
    antialias: bool = True
    alpha: bool = True
    preserveDrawingBuffer: bool = False


class TemplateConfig(BaseModel):
    name: str
    description: str = ""
    version: str = "1.0.0"
    viewport: Viewport
    elements: List[TemplateElement]
    effects: List[WebGLEffect] = []
    animations: List[Animation] = []
    webgl_config: WebGLConfig
    custom_css: str = ""
    custom_js: str = ""


class EditorProject(BaseModel):
    id: str
    name: str
    template_id: str
    owner_id: str
    config: TemplateConfig
    created_at: str
    updated_at: str
    version: str = "1.0.0"


class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: str
    project_id: Optional[str] = None


class EffectCommand(BaseModel):
    type: str  # add_effect, remove_effect, update_element, etc.
    effect_type: Optional[str] = None
    target_element: Optional[str] = None
    config: Dict[str, Any] = {}
    parameters: Dict[str, Any] = {}


class LLMResponse(BaseModel):
    text: str
    commands: List[EffectCommand] = []
    suggestions: List[str] = []
    generated_code: Optional[str] = None


# 请求/响应模型
class CreateProjectRequest(BaseModel):
    template_id: str
    project_name: str


class UpdateElementRequest(BaseModel):
    element: TemplateElement


class AddEffectRequest(BaseModel):
    effect: WebGLEffect


class ChatRequest(BaseModel):
    message: str
    project_id: str


class ExportRequest(BaseModel):
    format: str = "html"  # html, json, zip
    include_assets: bool = True
    minify: bool = False 