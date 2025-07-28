#!/usr/bin/env python3
"""
简化游戏转换器 - 将故事树转换为类似恋与制作人的互动游戏格式
所有AI生成的内容使用占位符，专注于数据结构转换

功能:
1. 将故事树转换为游戏数据结构
2. 为角色立绘生成占位符
3. 为场景背景生成占位符  
4. 创建对话框系统配置
5. 生成Web游戏配置文件
"""

import json
import os
import uuid
from typing import Dict, List, Any, Optional


class SimpleGameConverter:
    """简化游戏转换器 - 使用占位符"""
    
    def __init__(self):
        self.placeholder_counter = 1
    
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
                
                # 处理角色描述
                if isinstance(char_info, dict):
                    desc = str(char_info.get("status", "")) + " " + str(char_info.get("background", ""))
                else:
                    desc = str(char_info)
                
                if desc.strip():
                    analysis["characters"][char_name]["descriptions"].append(desc.strip())
            
            # 提取场景信息
            location = world_state.get("location", {})
            if isinstance(location, dict):
                loc_name = (location.get("city_name") or 
                           location.get("specific_place", {}).get("street_name", "未知场所"))
                analysis["locations"][loc_name] = location
            else:
                analysis["locations"][f"场景{len(analysis['locations']) + 1}"] = {"description": str(location)}
            
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
    
    def generate_character_placeholders(self, characters: Dict[str, Any]) -> Dict[str, Any]:
        """生成角色立绘占位符"""
        print("🎨 生成角色立绘占位符...")
        
        art_placeholders = {}
        
        for char_name, char_info in characters.items():
            if char_info["dialogue_count"] > 0:  # 只为有对话的角色生成占位符
                # 基于角色描述生成简单的立绘描述
                all_descriptions = " ".join(char_info["descriptions"])
                
                art_placeholders[char_name] = {
                    "character_name": char_name,
                    "art_description": f"[AI生成占位符] 角色: {char_name}, 特征: {all_descriptions[:100]}...",
                    "art_style": "anime_style_dating_game",
                    "placeholder_image": f"assets/characters/{char_name.lower().replace(' ', '_')}.png",
                    "prompt_for_ai": f"请为角色 '{char_name}' 生成立绘。角色描述: {all_descriptions}。风格: 恋爱游戏动漫风格。",
                    "generation_status": "pending"
                }
                print(f"   ✅ {char_name}: 占位符已创建")
        
        return art_placeholders
    
    def generate_background_placeholders(self, locations: Dict[str, Any]) -> Dict[str, Any]:
        """生成场景背景占位符"""
        print("🏞️ 生成场景背景占位符...")
        
        bg_placeholders = {}
        
        for loc_name, loc_info in locations.items():
            # 提取场景描述
            description = ""
            if isinstance(loc_info, dict):
                description = str(loc_info.get("description", "")) + " " + str(loc_info.get("city_name", ""))
            else:
                description = str(loc_info)
            
            bg_placeholders[loc_name] = {
                "location_name": loc_name,
                "background_description": f"[AI生成占位符] 场景: {loc_name}, 描述: {description[:100]}...",
                "art_style": "cinematic_dating_game_background",
                "placeholder_image": f"assets/backgrounds/{loc_name.lower().replace(' ', '_')}.jpg",
                "prompt_for_ai": f"请为场景 '{loc_name}' 生成背景图。场景描述: {description}。风格: 恋爱游戏电影化背景。",
                "generation_status": "pending"
            }
            print(f"   ✅ {loc_name}: 占位符已创建")
        
        return bg_placeholders
    
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
                "generated_timestamp": "2025-01-26",
                "generation_note": "此版本使用占位符，可稍后替换为AI生成内容"
            },
            "assets": {
                "characters": character_art,
                "backgrounds": background_art,
                "audio": {
                    "bgm": {
                        "placeholder_file": "assets/audio/bgm_main.mp3",
                        "prompt_for_ai": "请生成悬疑浪漫风格的背景音乐",
                        "generation_status": "pending"
                    },
                    "voice_clips": {},
                    "sound_effects": {
                        "placeholder_file": "assets/audio/ui_sounds.mp3",
                        "prompt_for_ai": "请生成UI交互音效合集",
                        "generation_status": "pending"
                    }
                }
            },
            "game_scenes": [],
            "scene_connections": story_tree.get("connections", []),
            "start_scene_id": story_tree.get("root_node_id"),
            "ai_generation_tasks": {
                "character_art_count": len(character_art),
                "background_art_count": len(background_art),
                "voice_clips_needed": [],
                "music_tracks_needed": 1
            }
        }
        
        # 转换每个场景
        for node_id, node_info in story_tree.get("nodes", {}).items():
            node_data = node_info["data"]
            
            # 确定场景的背景
            world_state = node_data.get("metadata", {}).get("world_state", {})
            location = world_state.get("location", {})
            
            # 场景背景
            bg_name = "默认背景"
            if isinstance(location, dict):
                bg_name = (location.get("city_name") or 
                          location.get("specific_place", {}).get("street_name", "默认背景"))
            
            # 场景中的内容序列
            content_sequence = []
            
            # 添加主场景描述作为旁白
            content_sequence.append({
                "type": "narration",
                "text": node_data["scene"],
                "speaker": "旁白",
                "display_duration": 5000,
                "voice_clip": {
                    "placeholder_file": f"assets/audio/narration_{node_id[:8]}.mp3",
                    "prompt_for_ai": f"请为以下旁白生成配音: {node_data['scene'][:50]}...",
                    "generation_status": "pending"
                }
            })
            
            # 添加事件（按时间戳排序）
            for event in sorted(node_data.get("events", []), key=lambda x: x.get("timestamp", 0)):
                if event.get("event_type") == "dialogue" and event.get("speaker"):
                    content_sequence.append({
                        "type": "dialogue",
                        "speaker": event["speaker"],
                        "text": event["content"],
                        "character_image": character_art.get(event["speaker"], {}).get("placeholder_image", ""),
                        "voice_clip": {
                            "placeholder_file": f"assets/audio/voice_{event['speaker'].lower().replace(' ', '_')}_{len(content_sequence)}.mp3",
                            "prompt_for_ai": f"请为角色 '{event['speaker']}' 的这句话生成配音: {event['content']}",
                            "generation_status": "pending"
                        }
                    })
                    
                    # 记录需要生成的配音
                    speaker_voice = f"{event['speaker']}_voice"
                    if speaker_voice not in game_data["ai_generation_tasks"]["voice_clips_needed"]:
                        game_data["ai_generation_tasks"]["voice_clips_needed"].append(speaker_voice)
                        
                elif event.get("event_type") == "narration":
                    content_sequence.append({
                        "type": "narration",
                        "text": event["content"],
                        "speaker": "旁白",
                        "display_duration": 3000,
                        "voice_clip": {
                            "placeholder_file": f"assets/audio/narration_event_{len(content_sequence)}.mp3",
                            "prompt_for_ai": f"请为环境描述生成配音: {event['content']}",
                            "generation_status": "pending"
                        }
                    })
            
            # 选择项
            choices = []
            for action_binding in node_data.get("outgoing_actions", []):
                action = action_binding["action"]
                choice_type = ("continue" if action.get("is_key_action") and 
                             action.get("metadata", {}).get("navigation") == "continue" else "stay")
                
                choices.append({
                    "choice_id": action["id"],
                    "choice_text": action["description"],
                    "choice_type": choice_type,
                    "target_scene_id": action_binding.get("target_node_id"),
                    "immediate_response": action.get("metadata", {}).get("response", ""),
                    "effects": action.get("metadata", {}).get("effects", {}),
                    "choice_sound": {
                        "placeholder_file": "assets/audio/choice_select.mp3",
                        "generation_status": "pending"
                    }
                })
            
            # 组装游戏场景
            game_scene = {
                "scene_id": node_id,
                "scene_title": f"第{node_info.get('level', 0) + 1}章",
                "background_image": background_art.get(bg_name, {}).get("placeholder_image", "assets/backgrounds/default.jpg"),
                "background_music": "assets/audio/bgm_main.mp3",
                "content_sequence": content_sequence,
                "player_choices": choices,
                "scene_metadata": {
                    "world_state": world_state,
                    "scene_type": node_data.get("node_type", "scene"),
                    "estimated_reading_time": len(node_data["scene"]) // 10,
                    "character_count": len(set([c["speaker"] for c in content_sequence if c["type"] == "dialogue"])),
                    "choice_count": len(choices)
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
                "mobile_friendly": True,
                "libraries": ["pixi.js", "howler.js"]
            },
            "ui_config": {
                "dialogue_box": {
                    "position": "bottom",
                    "height": "25%",
                    "style": "modern_transparent",
                    "text_speed": "medium",
                    "auto_advance": False,
                    "font": "Noto Sans SC",
                    "font_size": "18px"
                },
                "choice_buttons": {
                    "style": "elegant_rounded",
                    "hover_effect": True,
                    "max_choices_visible": 4,
                    "button_height": "60px",
                    "margin": "10px"
                },
                "character_display": {
                    "position": "center_right",
                    "scale": 0.8,
                    "fade_animation": True,
                    "transition_duration": 500
                },
                "background": {
                    "transition_effect": "fade",
                    "transition_duration": 1000,
                    "parallax": False
                },
                "ui_theme": {
                    "primary_color": "#ff6b9d",
                    "secondary_color": "#4ecdc4",
                    "text_color": "#2c3e50",
                    "background_color": "rgba(255, 255, 255, 0.9)"
                }
            },
            "game_flow": {
                "start_scene": game_data["start_scene_id"],
                "save_system": True,
                "history_system": True,
                "skip_function": True,
                "auto_play": True,
                "settings_menu": True
            },
            "assets_config": {
                "preload_assets": True,
                "image_format": "webp",
                "audio_format": "mp3",
                "compression": "medium",
                "lazy_loading": True,
                "asset_paths": {
                    "characters": "assets/characters/",
                    "backgrounds": "assets/backgrounds/",
                    "audio": "assets/audio/",
                    "ui": "assets/ui/"
                }
            },
            "features": {
                "fullscreen": True,
                "screenshot": True,
                "volume_control": True,
                "text_size_control": True,
                "language_switch": False
            },
            "deployment": {
                "platform": "web",
                "build_command": "npm run build",
                "static_files": ["assets/", "fonts/", "config/"],
                "entry_point": "index.html",
                "min_requirements": "Chrome 60+, Firefox 55+, Safari 12+"
            }
        }
        
        return web_config
    
    def generate_ai_tasks_summary(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """生成AI任务总结"""
        print("📋 生成AI任务总结...")
        
        tasks = {
            "summary": {
                "total_tasks": 0,
                "estimated_time": "约2-4小时",
                "priority": "高优先级任务优先生成"
            },
            "character_art_tasks": [],
            "background_art_tasks": [],
            "voice_tasks": [],
            "music_tasks": [],
            "instructions": {
                "workflow": [
                    "1. 使用AI图像生成工具（如Midjourney、DALL-E）生成角色立绘",
                    "2. 生成场景背景图",
                    "3. 使用AI语音合成生成角色配音",
                    "4. 生成背景音乐和音效",
                    "5. 替换JSON文件中的占位符路径"
                ],
                "file_naming": "严格按照JSON中的文件名命名生成的资源",
                "quality_standards": "所有图像1920x1080以上，音频44.1kHz立体声"
            }
        }
        
        # 收集角色立绘任务
        for char_name, char_info in game_data["assets"]["characters"].items():
            tasks["character_art_tasks"].append({
                "character_name": char_name,
                "file_path": char_info["placeholder_image"],
                "prompt": char_info["prompt_for_ai"],
                "priority": "high" if char_info.get("dialogue_count", 0) > 2 else "medium"
            })
        
        # 收集背景任务
        for bg_name, bg_info in game_data["assets"]["backgrounds"].items():
            tasks["background_art_tasks"].append({
                "scene_name": bg_name,
                "file_path": bg_info["placeholder_image"], 
                "prompt": bg_info["prompt_for_ai"],
                "priority": "high"
            })
        
        # 收集配音任务
        voice_tasks = set()
        for scene in game_data["game_scenes"]:
            for content in scene["content_sequence"]:
                if "voice_clip" in content:
                    voice_tasks.add((content["speaker"], content["voice_clip"]["prompt_for_ai"][:50]))
        
        tasks["voice_tasks"] = [{"speaker": speaker, "sample_text": text} for speaker, text in voice_tasks]
        
        # 音乐任务
        tasks["music_tasks"] = [
            {
                "type": "background_music",
                "file_path": "assets/audio/bgm_main.mp3",
                "prompt": "悬疑浪漫风格的背景音乐，适合恋爱游戏",
                "duration": "3-5分钟循环"
            },
            {
                "type": "ui_sounds",
                "file_path": "assets/audio/ui_sounds.mp3", 
                "prompt": "UI交互音效合集（按钮点击、选择确认等）",
                "duration": "每个音效1-2秒"
            }
        ]
        
        # 计算总任务数
        tasks["summary"]["total_tasks"] = (
            len(tasks["character_art_tasks"]) +
            len(tasks["background_art_tasks"]) + 
            len(tasks["voice_tasks"]) +
            len(tasks["music_tasks"])
        )
        
        return tasks


def main():
    """主函数"""
    print("🎮 Simple Interactive Visual Novel Converter")
    print("=" * 60)
    print("📝 注意：此版本使用占位符，AI生成的内容稍后可以替换")
    print("=" * 60)
    
    try:
        # 初始化转换器
        converter = SimpleGameConverter()
        
        # 加载故事树
        print("📖 加载故事树数据...")
        with open('../../../../client/agent/complete_story_tree_example.json', 'r', encoding='utf-8') as f:
            story_tree = json.load(f)
        
        # 分析故事树
        analysis = converter.analyze_story_tree(story_tree)
        
        print(f"\n📊 分析结果:")
        print(f"   角色数量: {len(analysis['characters'])}")
        print(f"   场景数量: {len(analysis['locations'])}")
        print(f"   对话事件: {len(analysis['dialogue_events'])}")
        print(f"   选择点: {len(analysis['choice_points'])}")
        
        # 生成占位符
        character_art = converter.generate_character_placeholders(analysis["characters"])
        background_art = converter.generate_background_placeholders(analysis["locations"])
        
        # 转换为游戏格式
        game_data = converter.convert_to_game_format(story_tree, analysis, character_art, background_art)
        
        # 生成Web配置
        web_config = converter.generate_web_config(game_data)
        
        # 生成AI任务总结
        ai_tasks = converter.generate_ai_tasks_summary(game_data)
        
        # 保存所有文件
        with open('interactive_game_data.json', 'w', encoding='utf-8') as f:
            json.dump(game_data, f, ensure_ascii=False, indent=2)
        
        with open('web_game_config.json', 'w', encoding='utf-8') as f:
            json.dump(web_config, f, ensure_ascii=False, indent=2)
            
        with open('ai_generation_tasks.json', 'w', encoding='utf-8') as f:
            json.dump(ai_tasks, f, ensure_ascii=False, indent=2)
        
        print(f"\n🎉 游戏转换完成!")
        print(f"📁 输出文件:")
        print(f"   - interactive_game_data.json (游戏数据)")
        print(f"   - web_game_config.json (Web配置)")
        print(f"   - ai_generation_tasks.json (AI任务清单)")
        
        print(f"\n🎯 游戏特性:")
        print(f"   - {len(game_data['game_scenes'])}个互动场景")
        print(f"   - {len(character_art)}个角色立绘占位符")
        print(f"   - {len(background_art)}个背景场景占位符")
        print(f"   - {ai_tasks['summary']['total_tasks']}个AI生成任务")
        print(f"   - 完整的选择分支系统")
        print(f"   - Web端即玩即用框架")
        
        print(f"\n📋 下一步:")
        print(f"   1. 查看 ai_generation_tasks.json 了解需要AI生成的内容")
        print(f"   2. 使用AI工具生成图像、音频资源")
        print(f"   3. 替换占位符路径为实际文件")
        print(f"   4. 部署到Web服务器测试")
        
    except Exception as e:
        print(f"❌ 转换失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 