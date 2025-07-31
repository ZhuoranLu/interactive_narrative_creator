# 🎮 Interactive Narrative Template Editor

这是一个强大的可视化游戏模板编辑器，允许用户通过拖拽、属性调整和AI助手来创建和编辑互动小说游戏模板。

## 🏗️ 系统架构

```
📦 Template Editor System
├── 🎨 Frontend (React + Chakra UI)
│   ├── TemplateEditor.tsx        # 主编辑器组件
│   ├── ChatAssistant.tsx         # AI聊天助手
│   ├── EffectsPanel.tsx          # WebGL特效面板
│   └── README.md                 # 说明文档
├── 🔧 Backend (FastAPI)
│   ├── routers/
│   │   └── editor.py             # 编辑器API路由
│   ├── schemas/
│   │   └── editor.py             # 数据模型定义
│   ├── services/
│   │   └── llm_assistant.py      # LLM助手服务
│   └── deps.py                   # 共享依赖
└── 🎯 Features
    ├── 可视化编辑器
    ├── 实时协作 (WebSocket)
    ├── AI助手集成
    ├── WebGL特效系统
    └── 模板导出功能
```

## ✨ 核心功能

### 🎨 可视化编辑器
- **拖拽操作**: 从组件库拖拽元素到画布
- **属性面板**: 实时调整位置、尺寸、样式等属性
- **图层管理**: 管理元素层级、可见性、锁定状态
- **缩放控制**: 支持画布缩放和适配不同屏幕尺寸

### 🤖 AI设计助手
- **自然语言理解**: 理解用户的设计需求
- **智能命令生成**: 自动生成对应的编辑命令
- **实时建议**: 提供相关的设计建议和快捷操作
- **上下文感知**: 根据选中元素提供针对性建议

### ✨ WebGL特效系统
- **血滴特效**: 逼真的血滴滴落动画
- **粒子系统**: 动态粒子背景效果
- **发光效果**: 柔和的发光边缘
- **涟漪效果**: 点击产生的水波纹扩散
- **闪电效果**: 戏剧性的闪电背景
- **烟雾效果**: 缓慢飘散的烟雾动画

### 🔄 实时协作
- **WebSocket连接**: 实时同步编辑状态
- **多用户支持**: 支持多人同时编辑
- **操作广播**: 实时广播元素更新和特效添加

## 🚀 使用方法

### 启动编辑器
```bash
# 1. 启动后端服务
cd server
./dev.sh

# 2. 启动前端服务
cd interactive_narrative
npm run dev

# 3. 访问编辑器
# http://localhost:5173/editor
```

### 基本操作

#### 1. 选择和编辑元素
```typescript
// 点击画布中的元素进行选择
// 在右侧属性面板中调整属性
// 或使用AI助手进行智能调整
```

#### 2. AI助手对话示例
```
用户: "给对话框添加血滴特效"
AI: "✨ 太棒了！我正在为元素 'dialogue-box' 添加血滴特效！"

用户: "把背景改成红色渐变"  
AI: "🎨 好的！我正在为元素 'background' 调整背景样式！"

用户: "设置透明度为50%"
AI: "🔧 我正在为元素调整透明度属性！"
```

#### 3. 特效应用
```typescript
// 1. 选择目标元素
// 2. 打开特效面板 (🪄 按钮)
// 3. 选择想要的特效
// 4. 或通过AI助手描述特效需求
```

## 🛠️ 开发指南

### 添加新特效
```typescript
// 1. 在 EffectsPanel.tsx 中添加特效定义
const newEffect = {
  type: 'customEffect',
  name: '自定义特效',
  description: '特效描述',
  icon: FaIcon,
  color: '#color'
};

// 2. 在 llm_assistant.py 中添加识别模式
self.effect_patterns[r'自定义|特殊'] = 'customEffect'

// 3. 实现特效渲染逻辑
function applyCustomEffect(element, config) {
  // 特效实现代码
}
```

### 扩展AI助手能力
```python
# 在 llm_assistant.py 中添加新的意图识别
def _analyze_intent(self, message: str):
    # 添加新的模式匹配
    if re.search(r'新功能|特殊操作', message_lower):
        intent["type"] = "new_feature"
        # 处理逻辑
    return intent
```

### 创建新组件类型
```typescript
// 1. 在 editor.py schemas 中定义数据模型
class NewElementType(BaseModel):
    # 属性定义

// 2. 在前端添加组件渲染逻辑
const renderNewElement = (element) => {
  // 渲染逻辑
};

// 3. 更新组件库和图标映射
```

## 📡 API 接口

### 编辑器API
```bash
# 获取模板列表
GET /api/editor/templates

# 创建项目
POST /api/editor/projects

# 更新元素
PUT /api/editor/projects/{id}/elements/{elementId}

# 添加特效
POST /api/editor/projects/{id}/effects

# AI助手对话
POST /api/editor/assistant/chat

# 实时编辑 (WebSocket)
WS /api/editor/projects/{id}/live
```

### 请求示例
```javascript
// AI助手对话
const response = await fetch('/api/editor/assistant/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    project_id: 'demo',
    message: '给聊天框添加血滴特效',
    selected_element: 'dialogue-box'
  })
});

// 添加特效
const effectResponse = await fetch('/api/editor/projects/demo/effects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'bloodDrop',
    name: '血滴特效',
    config: { dropCount: 20, speed: 2, color: '#dc2626' },
    target_element: 'dialogue-box'
  })
});
```

## 🎯 AI助手使用技巧

### 支持的命令类型

#### 特效相关
```
✅ "给对话框添加血滴特效"
✅ "为背景添加粒子系统"  
✅ "创建发光边框效果"
✅ "添加50个蓝色粒子"
✅ "制作涟漪点击效果"
```

#### 样式调整
```
✅ "把背景改成红色渐变"
✅ "设置透明度为70%"
✅ "移动元素到坐标100,200"
✅ "改变大小为300x200"
✅ "调整颜色为蓝色"
```

#### 智能建议
```
✅ AI会根据当前选中元素提供相关建议
✅ 支持上下文感知的操作推荐
✅ 提供快捷操作按钮
```

## 🔧 配置选项

### 特效配置参数
```typescript
interface EffectConfig {
  // 血滴特效
  bloodDrop: {
    dropCount: number;    // 血滴数量 (默认: 20)
    speed: number;        // 下落速度 (默认: 2)
    color: string;        // 颜色 (默认: '#dc2626')
    size: number;         // 大小 (默认: 3)
  };
  
  // 粒子系统
  particles: {
    count: number;        // 粒子数量 (默认: 50)
    speed: number;        // 移动速度 (默认: 1)
    color: string;        // 颜色 (默认: '#60a5fa')
    size: number;         // 大小 (默认: 2)
  };
  
  // 发光效果
  glow: {
    color: string;        // 发光颜色 (默认: '#ff6b9d')
    intensity: number;    // 强度 (默认: 0.8)
    blur: number;         // 模糊半径 (默认: 20)
  };
}
```

### 画布配置
```typescript
interface ViewportConfig {
  width: number;          // 画布宽度 (默认: 1920)
  height: number;         // 画布高度 (默认: 1080)
  scale: number;          // 缩放比例 (默认: 0.4)
}
```

## 🐛 故障排除

### 常见问题

#### WebSocket连接失败
```bash
# 检查后端服务是否运行
curl http://localhost:8000/api/editor/templates

# 检查WebSocket端点
# ws://localhost:8000/api/editor/projects/demo/live
```

#### AI助手无响应
```python
# 检查LLM助手服务
python -c "from app.services.llm_assistant import llm_assistant; print('✅ 服务正常')"

# 查看日志输出
tail -f logs/server.log
```

#### 特效不显示
```javascript
// 检查浏览器控制台错误
// 确认WebGL支持
console.log(!!window.WebGLRenderingContext);

// 检查Canvas元素
document.querySelectorAll('canvas');
```

## 🚀 未来规划

### 即将推出的功能
- [ ] 更多WebGL特效预设
- [ ] 高级动画时间轴编辑器
- [ ] 3D元素支持
- [ ] 音频特效集成
- [ ] 实时预览优化
- [ ] 模板市场
- [ ] 协作权限管理
- [ ] 版本历史和回滚

### 技术优化
- [ ] 性能优化和代码分割
- [ ] PWA支持
- [ ] 移动端适配
- [ ] 离线编辑能力
- [ ] 更智能的AI助手

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献指南

欢迎贡献代码！请查看 CONTRIBUTING.md 了解详细的贡献指南。

---

**Happy Coding! 🎮✨** 