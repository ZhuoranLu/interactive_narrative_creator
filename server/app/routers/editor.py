from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import Any, Dict, List, Optional
import json
import uuid
from pathlib import Path
from datetime import datetime

from app.deps import get_current_user, GAME_DIR
from app.schemas.editor import (
    TemplateElement, TemplateConfig, EditorProject, 
    WebGLEffect, ChatMessage, EffectCommand
)

router = APIRouter(prefix="/api/editor", tags=["editor"])

# 编辑器项目存储
editor_projects = {}
# WebSocket连接管理
active_connections: List[WebSocket] = []


@router.get("/templates")
def list_templates():
    """获取可用的游戏模板列表"""
    templates_dir = GAME_DIR / "templates"
    templates_dir.mkdir(exist_ok=True)
    
    templates = []
    for template_file in templates_dir.glob("*.json"):
        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                template_data = json.load(f)
                templates.append({
                    "id": template_file.stem,
                    "name": template_data.get("name", template_file.stem),
                    "description": template_data.get("description", ""),
                    "preview_image": template_data.get("preview_image", ""),
                    "created_at": template_data.get("created_at", ""),
                    "elements_count": len(template_data.get("elements", []))
                })
        except Exception as e:
            continue
    
    # 如果没有模板，返回默认模板
    if not templates:
        templates.append({
            "id": "enhanced_demo",
            "name": "Enhanced Demo Template",
            "description": "基于enhanced_demo_game.html的默认模板",
            "preview_image": "/game-preview/enhanced_demo_preview.jpg",
            "created_at": datetime.now().isoformat(),
            "elements_count": 12
        })
    
    return {"templates": templates}


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    """获取特定模板的详细配置"""
    if template_id == "enhanced_demo":
        # 从enhanced_demo_game.html解析默认配置
        return get_default_template_config()
    
    template_file = GAME_DIR / "templates" / f"{template_id}.json"
    if not template_file.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    
    with open(template_file, 'r', encoding='utf-8') as f:
        return json.load(f)


@router.post("/projects")
def create_project(
    template_id: str,
    project_name: str,
    current_user = Depends(get_current_user)
):
    """创建新的编辑器项目"""
    project_id = str(uuid.uuid4())
    
    # 获取模板配置
    template_config = get_template(template_id)
    
    project = {
        "id": project_id,
        "name": project_name,
        "template_id": template_id,
        "owner_id": current_user.id,
        "config": template_config,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "version": "1.0.0"
    }
    
    editor_projects[project_id] = project
    return project


@router.get("/projects/{project_id}")
def get_project(project_id: str, current_user = Depends(get_current_user)):
    """获取编辑器项目"""
    if project_id not in editor_projects:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = editor_projects[project_id]
    if project["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return project


@router.put("/projects/{project_id}/elements/{element_id}")
def update_element(
    project_id: str,
    element_id: str,
    element_data: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    """更新模板元素配置"""
    project = get_project(project_id, current_user)
    
    # 查找并更新元素
    elements = project["config"]["elements"]
    for element in elements:
        if element["id"] == element_id:
            element.update(element_data)
            project["updated_at"] = datetime.now().isoformat()
            break
    else:
        raise HTTPException(status_code=404, detail="Element not found")
    
    return {"message": "Element updated successfully", "element": element}


@router.post("/projects/{project_id}/effects")
async def add_webgl_effect(
    project_id: str,
    effect_data: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    """添加WebGL特效"""
    project = get_project(project_id, current_user)
    
    effect_id = str(uuid.uuid4())
    effect = {
        "id": effect_id,
        "type": effect_data.get("type", "particle"),
        "name": effect_data.get("name", f"Effect {effect_id[:8]}"),
        "config": effect_data.get("config", {}),
        "target_element": effect_data.get("target_element", ""),
        "enabled": True,
        "created_at": datetime.now().isoformat()
    }
    
    if "effects" not in project["config"]:
        project["config"]["effects"] = []
    
    project["config"]["effects"].append(effect)
    project["updated_at"] = datetime.now().isoformat()
    
    # 通知WebSocket连接的客户端
    await broadcast_update(project_id, {
        "type": "effect_added",
        "effect": effect
    })
    
    return effect


@router.delete("/projects/{project_id}/effects/{effect_id}")
async def remove_effect(
    project_id: str,
    effect_id: str,
    current_user = Depends(get_current_user)
):
    """移除特效"""
    project = get_project(project_id, current_user)
    
    effects = project["config"].get("effects", [])
    project["config"]["effects"] = [e for e in effects if e["id"] != effect_id]
    project["updated_at"] = datetime.now().isoformat()
    
    await broadcast_update(project_id, {
        "type": "effect_removed",
        "effect_id": effect_id
    })
    
    return {"message": "Effect removed successfully"}


@router.post("/projects/{project_id}/export")
def export_template(project_id: str, current_user = Depends(get_current_user)):
    """导出模板为HTML文件"""
    project = get_project(project_id, current_user)
    
    # 生成HTML
    html_content = generate_html_from_config(project["config"])
    
    # 保存到文件
    export_dir = GAME_DIR / "exports"
    export_dir.mkdir(exist_ok=True)
    
    filename = f"{project['name']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    filepath = export_dir / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return {
        "message": "Template exported successfully",
        "filename": filename,
        "download_url": f"/game-preview/exports/{filename}"
    }


@router.websocket("/projects/{project_id}/live")
async def websocket_live_editor(websocket: WebSocket, project_id: str):
    """WebSocket连接用于实时编辑"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理不同类型的消息
            if message["type"] == "element_update":
                await broadcast_update(project_id, message, exclude=websocket)
            elif message["type"] == "effect_update":
                await broadcast_update(project_id, message, exclude=websocket)
            elif message["type"] == "cursor_move":
                await broadcast_update(project_id, message, exclude=websocket)
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)


# LLM助手API
@router.post("/assistant/chat")
async def chat_with_assistant(
    request_data: dict,
    current_user = Depends(get_current_user)
):
    """与LLM助手对话"""
    project_id = request_data.get("project_id")
    message = request_data.get("message")
    selected_element = request_data.get("selected_element")
    
    project = get_project(project_id, current_user)
    
    # 使用LLM助手处理消息
    response = await process_llm_command(message, project, selected_element)
    
    return {
        "response": response["text"],
        "commands": response.get("commands", []),
        "suggestions": response.get("suggestions", [])
    }


# 辅助函数
def get_default_template_config():
    """获取默认模板配置"""
    return {
        "name": "Enhanced Demo Template",
        "description": "基于enhanced_demo_game.html的可视化小说模板",
        "version": "1.0.0",
        "viewport": {
            "width": 1920,
            "height": 1080
        },
        "elements": [
            {
                "id": "background",
                "type": "background",
                "name": "场景背景",
                "position": {"x": 0, "y": 0},
                "size": {"width": "100%", "height": "100%"},
                "style": {
                    "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    "transition": "all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                }
            },
            {
                "id": "character",
                "type": "character",
                "name": "角色立绘",
                "position": {"x": "8%", "y": "8%"},
                "size": {"width": "350px", "height": "500px"},
                "style": {
                    "background": "var(--glass-bg)",
                    "border": "2px solid var(--glass-border)",
                    "borderRadius": "20px",
                    "backdropFilter": "blur(20px)"
                }
            },
            {
                "id": "dialogue-box",
                "type": "dialogue",
                "name": "对话框",
                "position": {"x": 0, "y": "70%"},
                "size": {"width": "100%", "height": "30%"},
                "style": {
                    "background": "linear-gradient(135deg, rgba(44, 44, 84, 0.95) 0%, rgba(52, 58, 94, 0.95) 100%)",
                    "backdropFilter": "blur(20px)",
                    "borderTop": "3px solid var(--glass-border)"
                }
            },
            {
                "id": "scene-title",
                "type": "text",
                "name": "场景标题",
                "position": {"x": "50%", "y": "40px"},
                "style": {
                    "fontFamily": "'Cinzel', serif",
                    "fontSize": "28px",
                    "fontWeight": "600",
                    "color": "white",
                    "textShadow": "0 4px 8px rgba(0, 0, 0, 0.8)",
                    "transform": "translateX(-50%)"
                }
            },
            {
                "id": "choices-container",
                "type": "choices",
                "name": "选择容器",
                "position": {"x": "5%", "y": "35%"},
                "size": {"width": "450px", "height": "auto"},
                "style": {}
            }
        ],
        "effects": [],
        "animations": [],
        "webgl_config": {
            "enabled": true,
            "antialias": true,
            "alpha": true,
            "preserveDrawingBuffer": false
        }
    }


def generate_html_from_config(config: Dict[str, Any]) -> str:
    """根据配置生成HTML代码"""
    # TODO: 实现模板生成逻辑
    # 这里返回一个基础HTML结构
    return """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated Game Template</title>
        <!-- Generated CSS and JS will be here -->
    </head>
    <body>
        <!-- Generated game elements will be here -->
    </body>
    </html>
    """


async def process_llm_command(message: str, project: Dict[str, Any], selected_element: str = None) -> Dict[str, Any]:
    """处理LLM指令"""
    from app.services.llm_assistant import llm_assistant
    
    try:
        # 使用LLM助手处理消息
        result = await llm_assistant.process_message(
            message=message,
            project_id=project.get("id", "demo"),
            selected_element=selected_element,
            context={
                "elements": project.get("config", {}).get("elements", []),
                "effects": project.get("config", {}).get("effects", [])
            }
        )
        
        return {
            "text": result["response"],
            "commands": result["commands"],
            "suggestions": result["suggestions"]
        }
        
    except Exception as e:
        # 降级到模拟响应
        return {
            "text": f"我理解您想要：{message}。正在为您生成相应的效果...",
            "commands": [
                {
                    "type": "add_effect",
                    "effect_type": "particle",
                    "config": {"color": "red", "count": 100}
                }
            ],
            "suggestions": [
                "尝试添加粒子特效",
                "调整对话框透明度",
                "更改背景渐变色"
            ]
        }


async def broadcast_update(project_id: str, message: Dict[str, Any], exclude: WebSocket = None):
    """广播更新消息给所有连接的客户端"""
    message["project_id"] = project_id
    message["timestamp"] = datetime.now().isoformat()
    
    disconnected = []
    for connection in active_connections:
        if connection != exclude:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.append(connection)
    
    # 清理断开的连接
    for connection in disconnected:
        active_connections.remove(connection) 