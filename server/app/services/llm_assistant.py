import json
import re
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.agent.llm_client import LLMClient


class LLMAssistant:
    """
    LLM助手服务，用于处理AI对话和生成编辑器命令
    """
    
    def __init__(self):
        try:
            self.llm_client = LLMClient()
            self.use_real_llm = True
        except Exception as e:
            print(f"LLM客户端初始化失败，使用模拟模式: {e}")
            self.llm_client = None
            self.use_real_llm = False
            
        self.effect_patterns = {
            r'血滴|血液|滴血|流血': 'bloodDrop',
            r'粒子|颗粒|星星|闪烁': 'particles',
            r'发光|光晕|光效|辉光': 'glow',
            r'涟漪|水波|波纹|扩散': 'ripple',
            r'闪电|雷电|电光': 'lightning',
            r'烟雾|雾气|云雾': 'smoke'
        }
        
        self.style_patterns = {
            r'背景|底色|背景色': 'background',
            r'透明|透明度|不透明度': 'opacity',
            r'位置|坐标|移动': 'position',
            r'大小|尺寸|宽高': 'size',
            r'颜色|色彩': 'color'
        }
        
        self.color_patterns = {
            r'红色|红|crimson': '#EF4444',
            r'蓝色|蓝|blue': '#3B82F6',
            r'绿色|绿|green': '#10B981',
            r'黄色|黄|yellow': '#FBBF24',
            r'紫色|紫|purple': '#8B5CF6',
            r'橙色|橘色|orange': '#F97316',
            r'黑色|黑|black': '#000000',
            r'白色|白|white': '#FFFFFF',
            r'灰色|灰|gray': '#6B7280'
        }

    async def process_message(
        self, 
        message: str, 
        project_id: str, 
        selected_element: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        处理用户消息并生成响应和命令
        """
        # 分析用户意图
        intent = self._analyze_intent(message)
        
        # 如果有真实的LLM客户端，尝试生成更智能的响应
        if self.use_real_llm and self.llm_client:
            try:
                llm_result = await self._generate_llm_response(message, intent, selected_element, context)
                if llm_result:
                    return llm_result
            except Exception as e:
                print(f"LLM响应生成失败，使用规则响应: {e}")
        
        # 降级到规则基础的响应
        response_text = self._generate_response(message, intent, selected_element)
        commands = self._generate_commands(message, intent, selected_element)
        suggestions = self._generate_suggestions(intent, selected_element)
        
        return {
            "response": response_text,
            "commands": commands,
            "suggestions": suggestions,
            "intent": intent
        }

    def _analyze_intent(self, message: str) -> Dict[str, Any]:
        """
        分析用户意图
        """
        message_lower = message.lower()
        
        intent = {
            "type": "unknown",
            "action": None,
            "target": None,
            "parameters": {}
        }
        
        # 检测特效相关意图
        for pattern, effect_type in self.effect_patterns.items():
            if re.search(pattern, message_lower):
                intent["type"] = "add_effect"
                intent["action"] = "add"
                intent["target"] = effect_type
                intent["parameters"] = self._extract_effect_parameters(message, effect_type)
                break
        
        # 检测样式修改意图
        if intent["type"] == "unknown":
            for pattern, style_type in self.style_patterns.items():
                if re.search(pattern, message_lower):
                    intent["type"] = "update_style"
                    intent["action"] = "update"
                    intent["target"] = style_type
                    intent["parameters"] = self._extract_style_parameters(message, style_type)
                    break
        
        # 检测创建/添加意图
        if re.search(r'添加|创建|制作|生成', message_lower):
            if intent["type"] == "unknown":
                intent["type"] = "create_element"
                intent["action"] = "create"
        
        # 检测调整/修改意图
        if re.search(r'调整|修改|改变|设置', message_lower):
            if intent["type"] == "unknown":
                intent["type"] = "update_element"
                intent["action"] = "update"
        
        return intent

    def _extract_effect_parameters(self, message: str, effect_type: str) -> Dict[str, Any]:
        """
        从消息中提取特效参数
        """
        params = {}
        message_lower = message.lower()
        
        # 提取颜色
        for pattern, color in self.color_patterns.items():
            if re.search(pattern, message_lower):
                params["color"] = color
                break
        
        # 提取数值参数
        numbers = re.findall(r'\d+', message)
        if numbers:
            if effect_type == 'particles':
                params["count"] = int(numbers[0])
            elif effect_type in ['bloodDrop', 'smoke']:
                params["dropCount"] = int(numbers[0])
            elif effect_type == 'glow':
                params["intensity"] = float(numbers[0]) / 10
        
        # 特效特定的默认配置
        defaults = {
            'bloodDrop': {'dropCount': 20, 'speed': 2, 'color': '#dc2626', 'size': 3},
            'particles': {'count': 50, 'speed': 1, 'color': '#60a5fa', 'size': 2},
            'glow': {'color': '#ff6b9d', 'intensity': 0.8, 'blur': 20},
            'ripple': {'color': 'rgba(255, 255, 255, 0.6)', 'duration': 0.6, 'scale': 4},
            'lightning': {'color': '#8b5cf6', 'frequency': 2000, 'duration': 200},
            'smoke': {'particleCount': 30, 'speed': 0.5, 'color': '#64748b', 'opacity': 0.7}
        }
        
        # 合并默认配置和提取的参数
        default_config = defaults.get(effect_type, {})
        return {**default_config, **params}

    def _extract_style_parameters(self, message: str, style_type: str) -> Dict[str, Any]:
        """
        从消息中提取样式参数
        """
        params = {}
        message_lower = message.lower()
        
        if style_type == 'background':
            # 提取背景颜色
            for pattern, color in self.color_patterns.items():
                if re.search(pattern, message_lower):
                    params["background"] = color
                    break
            
            # 检测渐变
            if re.search(r'渐变|gradient', message_lower):
                params["background"] = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        
        elif style_type == 'opacity':
            # 提取透明度值
            opacity_match = re.search(r'(\d+)%?', message)
            if opacity_match:
                value = int(opacity_match.group(1))
                if value > 1:  # 如果是百分比
                    params["opacity"] = value / 100
                else:
                    params["opacity"] = value
        
        elif style_type == 'position':
            # 提取位置坐标
            numbers = re.findall(r'\d+', message)
            if len(numbers) >= 2:
                params["x"] = int(numbers[0])
                params["y"] = int(numbers[1])
        
        elif style_type == 'size':
            # 提取尺寸
            numbers = re.findall(r'\d+', message)
            if len(numbers) >= 2:
                params["width"] = int(numbers[0])
                params["height"] = int(numbers[1])
            elif len(numbers) == 1:
                size = int(numbers[0])
                params["width"] = size
                params["height"] = size
        
        return params

    def _generate_response(
        self, 
        message: str, 
        intent: Dict[str, Any], 
        selected_element: Optional[str]
    ) -> str:
        """
        生成AI响应文本
        """
        if not selected_element and intent["type"] in ["add_effect", "update_style", "update_element"]:
            return "🎯 请先选择一个元素，然后我就可以为它添加特效或修改样式了！\n\n你可以点击画布中的任何元素来选中它。"
        
        responses = {
            "add_effect": self._generate_effect_response(intent, selected_element),
            "update_style": self._generate_style_response(intent, selected_element),
            "create_element": self._generate_create_response(message),
            "update_element": self._generate_update_response(intent, selected_element),
            "unknown": self._generate_help_response(message)
        }
        
        return responses.get(intent["type"], responses["unknown"])

    def _generate_effect_response(self, intent: Dict[str, Any], selected_element: str) -> str:
        """
        生成特效相关响应
        """
        effect_type = intent["target"]
        element = selected_element
        
        effect_names = {
            'bloodDrop': '血滴特效',
            'particles': '粒子系统',
            'glow': '发光效果',
            'ripple': '涟漪效果',
            'lightning': '闪电效果',
            'smoke': '烟雾效果'
        }
        
        effect_name = effect_names.get(effect_type, '特效')
        
        return f"✨ 太棒了！我正在为元素 '{element}' 添加{effect_name}！\n\n🎮 这个特效会让你的游戏更加生动有趣。你可以通过以下方式进一步调整：\n\n• 说 \"调整颜色为红色\" 来改变特效颜色\n• 说 \"增加粒子数量\" 来调整强度\n• 说 \"减慢速度\" 来调整动画速度"

    def _generate_style_response(self, intent: Dict[str, Any], selected_element: str) -> str:
        """
        生成样式修改响应
        """
        style_type = intent["target"]
        element = selected_element
        
        style_names = {
            'background': '背景样式',
            'opacity': '透明度',
            'position': '位置',
            'size': '尺寸',
            'color': '颜色'
        }
        
        style_name = style_names.get(style_type, '样式')
        
        return f"🎨 好的！我正在为元素 '{element}' 调整{style_name}！\n\n💡 你还可以尝试：\n• \"设置透明度为50%\"\n• \"移动到坐标100,200\"\n• \"改变大小为300x200\""

    def _generate_create_response(self, message: str) -> str:
        """
        生成创建元素响应
        """
        return "🛠️ 我理解你想要创建新的元素！\n\n目前你可以：\n• 从左侧组件库拖拽新元素到画布\n• 选择现有元素进行修改\n• 通过特效面板添加各种视觉效果\n\n告诉我你想要创建什么类型的元素，我会指导你完成！"

    def _generate_update_response(self, intent: Dict[str, Any], selected_element: str) -> str:
        """
        生成更新元素响应
        """
        return f"🔧 我正在为元素 '{selected_element}' 进行调整！\n\n你可以在右侧属性面板中看到实时更新，或者继续告诉我你想要的具体改变。"

    def _generate_help_response(self, message: str) -> str:
        """
        生成帮助响应
        """
        return """🤖 我是你的AI设计助手！我可以帮你：

🎭 **添加特效**：
• "给对话框添加血滴特效"
• "为背景添加粒子系统"
• "创建发光边框效果"

🎨 **调整样式**：
• "把背景改成红色渐变"
• "设置透明度为70%"
• "移动元素到中央"

💡 **提示**：
• 先选择一个元素，然后描述你想要的效果
• 使用具体的描述，比如颜色、位置、大小等
• 我会自动生成相应的代码和配置

试试选择一个元素，然后告诉我你想要什么效果吧！✨"""

    def _generate_commands(
        self, 
        message: str, 
        intent: Dict[str, Any], 
        selected_element: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        生成执行命令
        """
        if not selected_element and intent["type"] in ["add_effect", "update_style", "update_element"]:
            return []
        
        commands = []
        
        if intent["type"] == "add_effect":
            commands.append({
                "type": "add_effect",
                "effect_type": intent["target"],
                "target_element": selected_element,
                "config": intent["parameters"]
            })
        
        elif intent["type"] == "update_style":
            style_type = intent["target"]
            params = intent["parameters"]
            
            if style_type == "background" and "background" in params:
                commands.append({
                    "type": "update_element",
                    "target_element": selected_element,
                    "property": "backgroundColor",
                    "value": params["background"]
                })
            
            elif style_type == "opacity" and "opacity" in params:
                commands.append({
                    "type": "update_element",
                    "target_element": selected_element,
                    "property": "opacity",
                    "value": params["opacity"]
                })
            
            elif style_type == "position":
                if "x" in params:
                    commands.append({
                        "type": "update_element",
                        "target_element": selected_element,
                        "property": "posX",
                        "value": params["x"]
                    })
                if "y" in params:
                    commands.append({
                        "type": "update_element",
                        "target_element": selected_element,
                        "property": "posY",
                        "value": params["y"]
                    })
            
            elif style_type == "size":
                if "width" in params:
                    commands.append({
                        "type": "update_element",
                        "target_element": selected_element,
                        "property": "width",
                        "value": params["width"]
                    })
                if "height" in params:
                    commands.append({
                        "type": "update_element",
                        "target_element": selected_element,
                        "property": "height",
                        "value": params["height"]
                    })
        
        return commands

    def _generate_suggestions(
        self, 
        intent: Dict[str, Any], 
        selected_element: Optional[str]
    ) -> List[str]:
        """
        生成建议
        """
        base_suggestions = [
            "添加血滴特效",
            "创建粒子背景",
            "设置发光边框",
            "调整透明度"
        ]
        
        if not selected_element:
            return [
                "选择一个元素",
                "查看组件库",
                "打开特效面板",
                "尝试拖拽组件"
            ]
        
        if intent["type"] == "add_effect":
            return [
                "调整特效颜色",
                "修改动画速度",
                "添加另一个特效",
                "预览最终效果"
            ]
        
        elif intent["type"] == "update_style":
            return [
                "修改背景颜色",
                "调整元素位置",
                "改变元素大小",
                "设置透明度"
            ]
        
        return base_suggestions

    async def _generate_llm_response(
        self, 
        message: str, 
        intent: Dict[str, Any], 
        selected_element: Optional[str],
        context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        使用真实LLM生成响应
        """
        if not self.llm_client:
            return None
            
        # 构建LLM提示
        system_prompt = """你是一个专业的游戏界面设计助手。你可以帮助用户：
1. 添加WebGL特效（血滴、粒子、发光、涟漪、闪电、烟雾）
2. 调整元素样式（背景、透明度、位置、大小、颜色）
3. 创建和修改UI元素

请根据用户的需求，生成JSON格式的响应，包含：
- response: 友好的回复文本
- commands: 执行命令列表
- suggestions: 建议操作列表

可用的特效类型：bloodDrop, particles, glow, ripple, lightning, smoke
可用的样式属性：background, opacity, position, size, color

当前选中的元素: {selected_element}
用户意图分析: {intent}""".format(
            selected_element=selected_element or "无",
            intent=json.dumps(intent, ensure_ascii=False)
        )
        
        user_prompt = f"用户请求: {message}"
        
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # 使用JSON格式响应
            llm_response = self.llm_client.generate_json_response(messages, temperature=0.7)
            
            if llm_response and isinstance(llm_response, dict):
                # 验证和补充响应
                response = {
                    "response": llm_response.get("response", "我正在处理您的请求..."),
                    "commands": llm_response.get("commands", []),
                    "suggestions": llm_response.get("suggestions", []),
                    "intent": intent
                }
                
                # 如果LLM没有生成命令，使用规则生成
                if not response["commands"]:
                    response["commands"] = self._generate_commands(message, intent, selected_element)
                
                # 如果LLM没有生成建议，使用规则生成
                if not response["suggestions"]:
                    response["suggestions"] = self._generate_suggestions(intent, selected_element)
                
                return response
            
        except Exception as e:
            print(f"LLM响应处理失败: {e}")
        
        return None


# 创建全局实例
llm_assistant = LLMAssistant() 