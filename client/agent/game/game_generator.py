#!/usr/bin/env python3
"""
互动游戏生成器 - 基于故事树生成类似恋与制作人的互动游戏

功能:
1. 将故事树转换为游戏数据结构
2. 生成角色立绘描述
3. 生成场景背景描述
4. 创建对话框系统
5. 生成Web游戏配置文件
"""

import json
import sys
import os
import uuid
from typing import Dict, List, Any, Optional

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)  # agent目录
grandparent_dir = os.path.dirname(parent_dir)  # client目录
project_root = os.path.dirname(grandparent_dir)  # 项目根目录
sys.path.insert(0, project_root)
sys.path.insert(0, parent_dir)  # 添加agent目录到路径
sys.path.insert(0, grandparent_dir)

from narrative_generator import NarrativeGenerator
from llm_client import LLMClient


class GameGenerator:
    """互动游戏生成器"""
    
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client
        self.narrative_generator = NarrativeGenerator(llm_client)
    
    def analyze_story_tree(self, story_tree: Dict[str, Any]) -> Dict[str, Any]:
        """分析故事树，提取游戏元素"""
        print("🔍 分析故事树结构...")
        
        analysis = {
            "game_metadata": {
                "title": story_tree.get("metadata", {}).get("title", "互动故事"),
                "description": story_tree.get("metadata", {}).get("description", ""),
                "total_scenes": len(story_tree.get("nodes", {})),
                "total_choices": len(story_tree.get("connections", []))
            },
            "characters": {},
            "locations": {},
            "scenes": [],
            "dialogue_events": [],
            "choice_points": []
        }
        
        # 分析所有节点
        for node_id, node_info in story_tree.get("nodes", {}).items():
            node_data = node_info["data"]
            world_state = node_data.get("metadata", {}).get("world_state", {})
            
            # 提取角色信息
            characters = world_state.get("characters", {})
            for char_name, char_info in characters.items():
                if char_name not in analysis["characters"]:
                    analysis["characters"][char_name] = {
                        "name": char_name,
                        "descriptions": [],
                        "dialogue_count": 0
                    }
                
                # 处理角色描述（可能是字符串或字典）
                if isinstance(char_info, dict):
                    desc = char_info.get("status", "") + " " + char_info.get("background", "")
                else:
                    desc = str(char_info)
                
                if desc.strip():
                    analysis["characters"][char_name]["descriptions"].append(desc.strip())
            
            # 提取场景信息
            location = world_state.get("location", {})
            if isinstance(location, dict):
                loc_name = location.get("city_name") or location.get("specific_place", {}).get("street_name", "未知场所")
                analysis["locations"][loc_name] = location
            else:
                analysis["locations"]["场景" + str(len(analysis["locations"]))] = {"description": str(location)}
            
            # 收集对话事件
            for event in node_data.get("events", []):
                if event.get("event_type") == "dialogue" and event.get("speaker"):
                    analysis["dialogue_events"].append({
                        "scene_id": node_id,
                        "speaker": event["speaker"],
                        "content": event["content"],
                        "timestamp": event.get("timestamp", 0)
                    })
                    
                    # 增加角色对话计数
                    speaker = event["speaker"]
                    if speaker in analysis["characters"]:
                        analysis["characters"][speaker]["dialogue_count"] += 1
            
            # 分析选择点
            for action_binding in node_data.get("outgoing_actions", []):
                action = action_binding["action"]
                if action.get("is_key_action") and action.get("metadata", {}).get("navigation") == "continue":
                    analysis["choice_points"].append({
                        "scene_id": node_id,
                        "choice_text": action["description"],
                        "choice_id": action["id"],
                        "target_scene": action_binding.get("target_node_id")
                    })
        
        return analysis
    
    def generate_character_art_descriptions(self, characters: Dict[str, Any]) -> Dict[str, Any]:
        """生成角色立绘描述"""
        print("🎨 生成角色立绘描述...")
        
        art_descriptions = {}
        
        for char_name, char_info in characters.items():
            if char_info["dialogue_count"] > 0:  # 只为有对话的角色生成立绘
                # 合并角色描述
                all_descriptions = " ".join(char_info["descriptions"])
                
                prompt = f"""
你是专业的角色设计师。根据以下角色信息，生成详细的立绘描述，适合用于AI图像生成。

角色名称: {char_name}
角色描述: {all_descriptions}

请生成以下内容：
1. 外观描述（年龄、身材、发型、服装等）
2. 表情和姿态
3. 画风建议（适合恋爱游戏风格）
4. 配色方案

格式要求：详细但简洁，适合AI绘图工具理解。
"""

                messages = [
                    {"role": "system", "content": "你是专业的角色设计师，擅长为恋爱游戏创建角色立绘描述。"},
                    {"role": "user", "content": prompt}
                ]
                
                try:
                    art_desc = self.llm_client.generate_response(messages)
                    art_descriptions[char_name] = {
                        "character_name": char_name,
                        "art_description": art_desc,
                        "art_style": "anime_style_dating_game",
                        "placeholder_image": f"placeholder_character_{char_name.lower().replace(' ', '_')}.png"
                    }
                    print(f"   ✅ {char_name}: 立绘描述已生成")
                except Exception as e:
                    print(f"   ❌ {char_name}: 生成失败 - {e}")
                    art_descriptions[char_name] = {
                        "character_name": char_name,
                        "art_description": f"角色: {char_name}, 描述: {all_descriptions}",
                        "art_style": "anime_style_dating_game",
                        "placeholder_image": f"placeholder_character_{char_name.lower().replace(' ', '_')}.png"
                    }
        
        return art_descriptions
    
    def generate_background_art_descriptions(self, locations: Dict[str, Any]) -> Dict[str, Any]:
        """生成场景背景描述"""
        print("🏞️ 生成场景背景描述...")
        
        bg_descriptions = {}
        
        for loc_name, loc_info in locations.items():
            # 提取场景描述
            description = ""
            if isinstance(loc_info, dict):
                description = loc_info.get("description", "") + " " + loc_info.get("city_name", "")
            else:
                description = str(loc_info)
            
            prompt = f"""
你是专业的场景设计师。根据以下场景信息，生成详细的背景图描述，适合用于AI图像生成。

场景名称: {loc_name}
场景描述: {description}

请生成以下内容：
1. 环境细节（建筑、光线、氛围等）
2. 时间和天气
3. 画风建议（适合恋爱游戏场景）
4. 构图建议

格式要求：详细描述，适合AI绘图工具理解，营造浪漫或悬疑氛围。
"""

            messages = [
                {"role": "system", "content": "你是专业的场景设计师，擅长为恋爱游戏创建浪漫唯美的背景。"},
                {"role": "user", "content": prompt}
            ]
            
            try:
                bg_desc = self.llm_client.generate_response(messages)
                bg_descriptions[loc_name] = {
                    "location_name": loc_name,
                    "background_description": bg_desc,
                    "art_style": "cinematic_dating_game_background",
                    "placeholder_image": f"placeholder_bg_{loc_name.lower().replace(' ', '_')}.png"
                }
                print(f"   ✅ {loc_name}: 背景描述已生成")
            except Exception as e:
                print(f"   ❌ {loc_name}: 生成失败 - {e}")
                bg_descriptions[loc_name] = {
                    "location_name": loc_name,
                    "background_description": f"场景: {loc_name}, 描述: {description}",
                    "art_style": "cinematic_dating_game_background",
                    "placeholder_image": f"placeholder_bg_{loc_name.lower().replace(' ', '_')}.png"
                }
        
        return bg_descriptions
    
    def convert_to_game_format(self, story_tree: Dict[str, Any], analysis: Dict[str, Any], 
                             character_art: Dict[str, Any], background_art: Dict[str, Any]) -> Dict[str, Any]:
        """将故事树转换为游戏格式"""
        print("🎮 转换为游戏数据格式...")
        
        game_data = {
            "game_info": {
                "title": analysis["game_metadata"]["title"],
                "description": analysis["game_metadata"]["description"],
                "version": "1.0.0",
                "style": "interactive_visual_novel",
                "generated_timestamp": "2025-01-26"
            },
            "assets": {
                "characters": character_art,
                "backgrounds": background_art,
                "audio": {
                    "bgm": "placeholder_bgm.mp3",
                    "voice_clips": {},
                    "sound_effects": "placeholder_sfx.mp3"
                }
            },
            "game_scenes": [],
            "scene_connections": story_tree.get("connections", []),
            "start_scene_id": story_tree.get("root_node_id")
        }
        
        # 转换每个场景
        for node_id, node_info in story_tree.get("nodes", {}).items():
            node_data = node_info["data"]
            
            # 确定场景的背景和角色
            world_state = node_data.get("metadata", {}).get("world_state", {})
            location = world_state.get("location", {})
            
            # 场景背景
            bg_name = "默认背景"
            if isinstance(location, dict):
                bg_name = location.get("city_name") or location.get("specific_place", {}).get("street_name", "默认背景")
            
            # 场景中的对话
            dialogue_sequence = []
            narration_sequence = []
            
            # 添加主场景描述作为旁白
            narration_sequence.append({
                "type": "narration",
                "text": node_data["scene"],
                "speaker": "旁白",
                "display_duration": 5000
            })
            
            # 添加事件
            for event in sorted(node_data.get("events", []), key=lambda x: x.get("timestamp", 0)):
                if event.get("event_type") == "dialogue" and event.get("speaker"):
                    dialogue_sequence.append({
                        "type": "dialogue",
                        "speaker": event["speaker"],
                        "text": event["content"],
                        "character_image": character_art.get(event["speaker"], {}).get("placeholder_image", ""),
                        "voice_clip": f"placeholder_voice_{event['speaker'].lower().replace(' ', '_')}.mp3"
                    })
                elif event.get("event_type") == "narration":
                    narration_sequence.append({
                        "type": "narration",
                        "text": event["content"],
                        "speaker": "旁白",
                        "display_duration": 3000
                    })
            
            # 选择项
            choices = []
            for action_binding in node_data.get("outgoing_actions", []):
                action = action_binding["action"]
                choice_type = "continue" if action.get("is_key_action") and action.get("metadata", {}).get("navigation") == "continue" else "stay"
                
                choices.append({
                    "choice_id": action["id"],
                    "choice_text": action["description"],
                    "choice_type": choice_type,
                    "target_scene_id": action_binding.get("target_node_id"),
                    "immediate_response": action.get("metadata", {}).get("response", ""),
                    "effects": action.get("metadata", {}).get("effects", {})
                })
            
            # 组装游戏场景
            game_scene = {
                "scene_id": node_id,
                "scene_title": f"第{node_info.get('level', 0) + 1}章",
                "background_image": background_art.get(bg_name, {}).get("placeholder_image", "placeholder_bg_default.png"),
                "background_music": "placeholder_bgm.mp3",
                "content_sequence": narration_sequence + dialogue_sequence,
                "player_choices": choices,
                "scene_metadata": {
                    "world_state": world_state,
                    "scene_type": node_data.get("node_type", "scene"),
                    "estimated_reading_time": len(node_data["scene"]) // 10  # 估算阅读时间（秒）
                }
            }
            
            game_data["game_scenes"].append(game_scene)
        
        return game_data
    
    def generate_web_config(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """生成Web游戏配置"""
        print("🌐 生成Web游戏配置...")
        
        web_config = {
            "game_engine": {
                "type": "web_visual_novel",
                "framework": "html5_canvas",
                "responsive": True,
                "mobile_friendly": True
            },
            "ui_config": {
                "dialogue_box": {
                    "position": "bottom",
                    "height": "25%",
                    "style": "modern_transparent",
                    "text_speed": "medium",
                    "auto_advance": False
                },
                "choice_buttons": {
                    "style": "elegant_rounded",
                    "hover_effect": True,
                    "max_choices_visible": 4
                },
                "character_display": {
                    "position": "center_right",
                    "scale": 0.8,
                    "fade_animation": True
                },
                "background": {
                    "transition_effect": "fade",
                    "transition_duration": 1000
                }
            },
            "game_flow": {
                "start_scene": game_data["start_scene_id"],
                "save_system": True,
                "history_system": True,
                "skip_function": True,
                "auto_play": True
            },
            "assets_config": {
                "preload_assets": True,
                "image_format": "webp",
                "audio_format": "mp3",
                "compression": "medium"
            },
            "deployment": {
                "platform": "web",
                "build_command": "npm run build",
                "static_files": ["images/", "audio/", "fonts/"],
                "api_endpoints": []
            }
        }
        
        return web_config


def main():
    """主函数"""
    print("🎮 Interactive Visual Novel Generator")
    print("=" * 60)
    
    try:
        # 初始化
        llm_client = LLMClient()
        game_gen = GameGenerator(llm_client)
        
        # 加载故事树
        print("📖 加载故事树数据...")
        with open('complete_story_tree_example.json', 'r', encoding='utf-8') as f:
            story_tree = json.load(f)
        
        # 分析故事树
        analysis = game_gen.analyze_story_tree(story_tree)
        
        print(f"\n📊 分析结果:")
        print(f"   角色数量: {len(analysis['characters'])}")
        print(f"   场景数量: {len(analysis['locations'])}")
        print(f"   对话事件: {len(analysis['dialogue_events'])}")
        print(f"   选择点: {len(analysis['choice_points'])}")
        
        # 生成艺术资源描述
        character_art = game_gen.generate_character_art_descriptions(analysis["characters"])
        background_art = game_gen.generate_background_art_descriptions(analysis["locations"])
        
        # 转换为游戏格式
        game_data = game_gen.convert_to_game_format(story_tree, analysis, character_art, background_art)
        
        # 生成Web配置
        web_config = game_gen.generate_web_config(game_data)
        
        # 保存游戏数据
        with open('interactive_game_data.json', 'w', encoding='utf-8') as f:
            json.dump(game_data, f, ensure_ascii=False, indent=2)
        
        with open('web_game_config.json', 'w', encoding='utf-8') as f:
            json.dump(web_config, f, ensure_ascii=False, indent=2)
        
        print(f"\n🎉 游戏生成完成!")
        print(f"📁 输出文件:")
        print(f"   - interactive_game_data.json (游戏数据)")
        print(f"   - web_game_config.json (Web配置)")
        
        print(f"\n🎯 游戏特性:")
        print(f"   - {len(game_data['game_scenes'])}个互动场景")
        print(f"   - {len(character_art)}个角色立绘")
        print(f"   - {len(background_art)}个背景场景")
        print(f"   - 完整的选择分支系统")
        print(f"   - Web端即玩即用")
        
    except Exception as e:
        print(f"❌ 游戏生成失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 