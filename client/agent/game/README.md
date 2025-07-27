# 🎮 互动视觉小说游戏生成系统

基于故事树自动生成类似「恋与制作人」风格的互动游戏，支持AI资源生成和Web端一键部署。

## 📋 系统概览

本系统将复杂的故事树数据转换为完整的Web互动游戏，包含：
- 📚 **故事内容**：多分支剧情、角色对话、环境描述
- 🎨 **视觉资源**：角色立绘、场景背景（AI生成）
- 🔊 **音频内容**：配音、背景音乐、音效（AI生成）
- 🎮 **游戏机制**：选择分支、存档系统、自动播放

## 🏗️ 文件结构

```
game/
├── simple_game_converter.py     # 核心转换器
├── demo_game.html              # 演示游戏页面
├── interactive_game_data.json  # 游戏数据
├── web_game_config.json       # Web配置
├── ai_generation_tasks.json   # AI任务清单
└── README.md                   # 本文件
```

## 🚀 快速开始

### 1. 生成游戏数据
```bash
cd game
python3 simple_game_converter.py
```

### 2. 预览游戏
```bash
# 启动本地服务器（任选其一）
python3 -m http.server 8080
# 或
npx serve .

# 在浏览器访问
http://localhost:8080/demo_game.html
```

### 3. 生成AI资源（可选）
查看 `ai_generation_tasks.json` 文件，使用AI工具生成：
- 角色立绘图片
- 场景背景图片  
- 角色配音音频
- 背景音乐

## 📊 生成的游戏数据结构

### interactive_game_data.json
```json
{
  "game_info": {
    "title": "游戏标题",
    "style": "interactive_visual_novel"
  },
  "assets": {
    "characters": { /* 角色立绘占位符 */ },
    "backgrounds": { /* 场景背景占位符 */ },
    "audio": { /* 音频占位符 */ }
  },
  "game_scenes": [
    {
      "scene_id": "场景ID", 
      "scene_title": "章节标题",
      "content_sequence": [ /* 对话和旁白序列 */ ],
      "player_choices": [ /* 玩家选择项 */ ]
    }
  ]
}
```

### 游戏场景结构
每个场景包含：
- **背景图片**：场景氛围图
- **内容序列**：旁白→对话→环境描述
- **角色立绘**：说话角色的立绘图
- **选择分支**：continue（跳转）/ stay（留在原地）

## 🎨 AI资源生成指南

### 角色立绘生成
```json
{
  "character_name": "角色名",
  "prompt_for_ai": "请为角色生成立绘...",
  "placeholder_image": "assets/characters/角色名.png"
}
```

**推荐AI工具**：
- Midjourney: `/imagine [角色描述] anime style dating game character`
- DALL-E 3: 使用详细的角色描述prompt
- Stable Diffusion: 使用动漫风格模型

### 场景背景生成
```json
{
  "location_name": "场景名",
  "prompt_for_ai": "请为场景生成背景图...",
  "placeholder_image": "assets/backgrounds/场景名.jpg"
}
```

**推荐设置**：
- 分辨率：1920x1080 或更高
- 风格：电影化、动漫风格
- 氛围：浪漫、悬疑、唯美

### 配音生成
使用AI语音合成工具：
- **角色配音**：为每个角色选择合适的声线
- **旁白配音**：中性、磁性的叙述声
- **格式要求**：MP3, 44.1kHz, 立体声

## 🌐 Web部署配置

### 基础部署
1. 将生成的文件上传到Web服务器
2. 确保JSON文件可以被正确加载
3. 配置CORS策略（如需要）

### 高级配置
参考 `web_game_config.json`：
- 响应式设计支持
- 移动设备优化
- 资源预加载策略
- 音频播放配置

## 🎮 游戏功能特性

### 核心功能
- ✅ **多分支剧情**：根据选择进入不同路径
- ✅ **角色对话系统**：带立绘的对话框
- ✅ **环境描述**：沉浸式场景营造
- ✅ **选择反馈**：即时响应和状态变化

### 高级功能
- ✅ **自动播放**：自动推进剧情
- ✅ **存档系统**：本地存储游戏进度
- ✅ **进度指示**：显示游戏进度
- ✅ **键盘控制**：空格/回车继续

### 待扩展功能
- 🔄 **多语言支持**
- 🔄 **角色好感度系统**  
- 🔄 **成就系统**
- 🔄 **回想模式**

## 🛠️ 自定义开发

### 修改游戏风格
编辑 `demo_game.html` 中的CSS：
```css
:root {
  --primary-color: #ff6b9d;    /* 主色调 */
  --secondary-color: #4ecdc4;  /* 辅助色 */
  --background: linear-gradient(...); /* 背景渐变 */
}
```

### 添加新功能
在 `GameEngine` 类中扩展：
```javascript
class GameEngine {
  // 添加新的游戏机制
  addNewFeature() {
    // 实现代码
  }
}
```

### 资源热替换
直接替换占位符文件：
```bash
# 替换角色立绘
cp new_character.png assets/characters/角色名.png

# 替换背景图
cp new_background.jpg assets/backgrounds/场景名.jpg
```

## 📈 性能优化建议

### 资源优化
- **图片压缩**：使用WebP格式
- **音频压缩**：合理的比特率设置
- **预加载策略**：关键资源优先加载

### 代码优化
- **懒加载**：大型资源按需加载
- **缓存策略**：利用浏览器缓存
- **压缩打包**：使用构建工具压缩

## 🚨 注意事项

1. **文件路径**：确保所有资源路径正确
2. **CORS策略**：本地文件需要HTTP服务器
3. **音频格式**：不同浏览器支持差异
4. **移动适配**：注意触摸交互体验
5. **性能监控**：大型游戏需要性能优化

## 📞 技术支持

遇到问题时的调试步骤：
1. 检查浏览器控制台错误
2. 验证JSON文件格式正确性
3. 确认资源文件路径
4. 测试不同浏览器兼容性

## 🎯 使用场景

- **故事创作者**：快速将文字故事转换为互动游戏
- **游戏开发者**：原型设计和概念验证
- **教育应用**：互动教学内容制作
- **娱乐项目**：个人创意项目实现

---

💡 **提示**：这是一个演示版本，可根据具体需求进行功能扩展和样式定制。 