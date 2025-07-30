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
from pathlib import Path
import re


def extract_characters_from_text(text):
    """从文本中提取说话的角色名称"""
    # 使用正则表达式匹配对话中的说话者
    speakers = re.findall(r'"speaker":\s*"([^"]+)"', text)
    # 从world_state的characters字段中提取角色
    characters_in_state = re.findall(r'"characters":\s*{([^}]+)}', text)
    char_names = []
    for state in characters_in_state:
        names = re.findall(r'"([^"]+)":', state)
        char_names.extend(names)
    
    # 合并所有找到的角色名称并去重
    all_characters = set(speakers + char_names)
    # 过滤掉"旁白"和空字符串
    return [char for char in all_characters if char and char != "旁白"]

def convert_story_to_game():
    # 读取故事树数据
    story_tree_path = Path(__file__).parent / "../../../../client/agent/complete_story_tree_example.json"
    print(f"Reading story tree from: {story_tree_path.resolve()}")
    
    with open(story_tree_path, 'r', encoding='utf-8') as f:
        story_data = json.load(f)

    # 初始化游戏数据结构
    game_data = {
        "game_info": {
            "title": "深夜来电",
            "description": "完整的故事树结构示例",
            "version": "1.0.0",
            "style": "interactive_visual_novel",
            "generated_timestamp": "2025-01-26",
            "generation_note": "此版本使用占位符，可稍后替换为AI生成内容"
        },
        "assets": {
            "characters": {},
            "backgrounds": {},
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
        "scene_connections": story_data.get("connections", []),
        "start_scene_id": story_data.get("root_node_id", "")
    }

    # 收集所有场景中出现的角色
    all_characters = set()
    all_backgrounds = set()

    # 处理每个场景节点
    for node_id, node_info in story_data.get("nodes", {}).items():
        node_text = json.dumps(node_info, ensure_ascii=False)
        characters_in_scene = extract_characters_from_text(node_text)
        all_characters.update(characters_in_scene)

        # 从场景元数据中提取背景信息
        if "data" in node_info and "metadata" in node_info["data"]:
            world_state = node_info["data"]["metadata"].get("world_state", {})
            location = world_state.get("location", "")
            if location:
                all_backgrounds.add(location)

    print(f"Found characters: {all_characters}")
    print(f"Found backgrounds: {all_backgrounds}")

    # 创建角色资产
    for character in all_characters:
        game_data["assets"]["characters"][character] = {
            "character_name": character,
            "character_description": f"[AI生成占位符] 角色: {character}, 描述: 待生成...",
            "art_style": "anime_dating_game_character",
            "placeholder_image": f"assets/characters/{character}.png",
            "prompt_for_ai": f"请为角色 '{character}' 生成立绘。风格: 恋爱游戏动漫风格。",
            "generation_status": "pending",
            "expressions": ["default", "happy", "sad", "angry", "surprised"]  # 默认表情列表
        }

    # 创建背景资产
    for location in all_backgrounds:
        location_key = f"场景{len(game_data['assets']['backgrounds']) + 1}"
        game_data["assets"]["backgrounds"][location_key] = {
            "location_name": location_key,
            "background_description": f"[AI生成占位符] 场景: {location_key}, 描述: {location}",
            "art_style": "cinematic_dating_game_background",
            "placeholder_image": f"assets/backgrounds/{location_key}.jpg",
            "prompt_for_ai": f"请为场景 '{location_key}' 生成背景图。场景描述: {location} 。风格: 恋爱游戏电影化背景。",
            "generation_status": "pending"
        }

    # 处理每个场景的内容
    for node_id, node_info in story_data.get("nodes", {}).items():
        node_data = node_info["data"]
        game_scene = {
            "scene_id": node_id,
            "scene_title": f"第{node_info.get('level', 0) + 1}章",
            "background_image": "assets/backgrounds/default.jpg",
            "background_music": "assets/audio/bgm_main.mp3",
            "content_sequence": [],
            "scene_metadata": node_data.get("metadata", {}),
            "player_choices": []
        }

        # 为场景选择合适的背景
        if "metadata" in node_data:
            world_state = node_data["metadata"].get("world_state", {})
            location = world_state.get("location", "")
            if location:
                # 找到对应的背景资产
                for bg_key, bg_data in game_data["assets"]["backgrounds"].items():
                    if location in bg_data["background_description"]:
                        game_scene["background_image"] = bg_data["placeholder_image"]
                        break

        # 处理场景内容序列
        # 首先添加主场景描述作为旁白
        game_scene["content_sequence"].append({
            "type": "narration",
            "text": node_data["scene"],
            "speaker": "旁白",
            "display_duration": 5000,
            "voice_clip": {
                "placeholder_file": f"assets/audio/narration_{node_id[:8]}.mp3",
                "prompt_for_ai": f"请为以下旁白生成配音: {node_data['scene'][:100]}...",
                "generation_status": "pending"
            }
        })

        # 处理其他事件
        for event in node_data.get("events", []):
            content_item = {
                "type": event.get("event_type", ""),
                "text": event.get("content", ""),
                "speaker": event.get("speaker", ""),
                "display_duration": 3000
            }

            # 如果是对话且有说话者（不是旁白），添加角色图片
            if event["event_type"] == "dialogue" and event["speaker"] and event["speaker"] != "旁白":
                character_data = game_data["assets"]["characters"].get(event["speaker"])
                if character_data:
                    content_item["character_image"] = character_data["placeholder_image"]

            # 为对话和旁白添加语音配音
            voice_key = f"voice_{event['speaker']}_{len(game_scene['content_sequence'])}"
            content_item["voice_clip"] = {
                "placeholder_file": f"assets/audio/{voice_key}.mp3",
                "prompt_for_ai": f"请为{event['event_type']}生成配音: {event['content'][:100]}...",
                "generation_status": "pending"
            }
            game_data["assets"]["audio"]["voice_clips"][voice_key] = content_item["voice_clip"]

            game_scene["content_sequence"].append(content_item)

        # 处理选择项
        for action_binding in node_data.get("outgoing_actions", []):
            action = action_binding["action"]
            choice = {
                "choice_id": action["id"],
                "choice_text": action["description"],
                "choice_type": "continue" if action.get("is_key_action") else "stay",
                "target_scene_id": action_binding.get("target_node_id"),
                "immediate_response": action.get("metadata", {}).get("response", ""),
                "effects": action.get("metadata", {}).get("effects", {}),
                "choice_sound": {
                    "placeholder_file": "assets/audio/choice_select.mp3",
                    "generation_status": "pending"
                }
            }
            game_scene["player_choices"].append(choice)

        game_data["game_scenes"].append(game_scene)

    # 生成AI任务列表
    ai_tasks = {
        "character_art_count": len(game_data["assets"]["characters"]),
        "background_art_count": len(game_data["assets"]["backgrounds"]),
        "voice_clips_needed": [
            f"{char}_voice" for char in game_data["assets"]["characters"].keys()
        ],
        "music_tracks_needed": 1
    }

    print("\nSaving game data...")
    # 保存游戏数据
    with open('interactive_game_data.json', 'w', encoding='utf-8') as f:
        json.dump(game_data, f, ensure_ascii=False, indent=2)

    print("Saving AI tasks...")
    # 保存AI任务列表
    with open('ai_generation_tasks.json', 'w', encoding='utf-8') as f:
        json.dump(ai_tasks, f, ensure_ascii=False, indent=2)

    print("Game data and AI tasks generated successfully!")
    print(f"Characters found: {len(all_characters)}")
    print(f"Backgrounds found: {len(all_backgrounds)}")

if __name__ == "__main__":
    convert_story_to_game() 