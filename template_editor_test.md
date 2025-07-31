# 🎨 模板编辑器启动和测试指南

## 🚀 快速启动

### 1. 启动后端服务
```bash
cd /Users/xfleezy/Desktop/research/interactive_narrative_creator/server
./dev.sh
```

### 2. 启动前端服务
```bash
cd /Users/xfleezy/Desktop/research/interactive_narrative_creator/interactive_narrative
npm run dev
```

### 3. 访问编辑器
1. 打开浏览器访问: `http://localhost:5173`
2. 使用演示账户登录:
   - 用户名: `demo_user`
   - 密码: `demo123`
3. 点击导航栏中的 **🎨 模板编辑器**

## 🧪 测试功能

### ✅ 基础功能测试

#### 1. 元素选择和属性调整
- [ ] 点击画布中的不同元素（背景、对话框、角色等）
- [ ] 查看右侧属性面板是否显示对应属性
- [ ] 调整位置坐标（X, Y）
- [ ] 修改尺寸（宽度、高度）
- [ ] 改变背景颜色
- [ ] 调整透明度滑块

#### 2. AI助手对话测试
点击 **🤖 AI助手** 按钮，尝试以下对话：

**特效测试：**
```
✅ "给对话框添加血滴特效"
✅ "为背景添加粒子系统"
✅ "创建发光边框效果"
✅ "添加50个蓝色粒子"
✅ "制作涟漪点击效果"
```

**样式调整测试：**
```
✅ "把背景改成红色渐变"
✅ "设置透明度为70%"
✅ "移动元素到坐标100,200"
✅ "改变大小为300x200"
✅ "调整颜色为蓝色"
```

#### 3. WebGL特效面板测试
点击 **🪄 WebGL特效** 按钮：
- [ ] 选择一个元素（如对话框）
- [ ] 点击"血滴特效"
- [ ] 点击"粒子系统"
- [ ] 点击"发光效果"
- [ ] 点击"涟漪效果"
- [ ] 点击"闪电效果"
- [ ] 点击"烟雾效果"

#### 4. 实时协作测试（可选）
- [ ] 打开两个浏览器窗口
- [ ] 在一个窗口中修改元素
- [ ] 查看另一个窗口是否实时同步

### 🔧 后端API测试

#### 1. 测试编辑器API
```bash
# 获取模板列表
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/editor/templates

# 测试AI助手
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"project_id":"demo","message":"给对话框添加血滴特效","selected_element":"dialogue-box"}' \
  http://localhost:8000/api/editor/assistant/chat
```

#### 2. 测试LLM客户端集成
```bash
cd /Users/xfleezy/Desktop/research/interactive_narrative_creator/server
python -c "
from app.services.llm_assistant import llm_assistant
import asyncio

async def test_llm():
    result = await llm_assistant.process_message(
        message='给对话框添加血滴特效',
        project_id='demo',
        selected_element='dialogue-box'
    )
    print('LLM响应:', result)

asyncio.run(test_llm())
"
```

## 🐛 常见问题排查

### 1. 编辑器页面空白
**检查：**
```bash
# 1. 检查前端控制台错误
# 打开浏览器开发者工具 (F12) 查看Console

# 2. 检查后端服务
curl http://localhost:8000/api/editor/templates
```

### 2. AI助手无响应
**检查：**
```bash
# 1. 检查LLM客户端初始化
cd /Users/xfleezy/Desktop/research/interactive_narrative_creator/server
python -c "from app.agent.llm_client import LLMClient; client = LLMClient(); print('✅ LLM客户端正常')"

# 2. 检查服务日志
tail -f logs/server.log  # 如果有日志文件
```

### 3. WebSocket连接失败
**检查：**
```bash
# 检查WebSocket端点
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  ws://localhost:8000/api/editor/projects/demo/live
```

### 4. 特效不显示
**检查：**
```javascript
// 在浏览器控制台执行
console.log('WebGL支持:', !!window.WebGLRenderingContext);
console.log('Canvas元素:', document.querySelectorAll('canvas'));
```

## 📋 测试检查单

### 基础功能 ✅
- [ ] 页面正常加载
- [ ] 导航菜单显示模板编辑器链接
- [ ] 画布显示游戏元素
- [ ] 元素可以选择（高亮边框）
- [ ] 属性面板显示和更新
- [ ] 缩放控制工作正常

### AI助手功能 ✅
- [ ] 聊天面板打开
- [ ] 可以发送消息
- [ ] AI回复正常
- [ ] 命令执行成功
- [ ] 建议按钮工作

### 特效系统 ✅
- [ ] 特效面板打开
- [ ] 所有6种特效可选择
- [ ] 特效应用到选中元素
- [ ] 特效配置参数生效
- [ ] 视觉效果正常显示

### 高级功能 ✅
- [ ] WebSocket实时同步
- [ ] 项目保存/导出
- [ ] 错误处理和降级
- [ ] 响应式设计适配

## 🎯 性能测试

### 1. 大量元素测试
- 创建10+个元素
- 测试选择响应速度
- 测试属性更新性能

### 2. 特效性能测试
- 同时应用多个特效
- 测试动画流畅度
- 监控内存使用

### 3. WebSocket压力测试
- 快速连续操作
- 测试消息队列处理
- 验证连接稳定性

## 📊 成功标准

### ✅ 必须通过：
1. 所有基础功能正常工作
2. AI助手能理解并执行基本命令
3. 至少3种特效能正常显示
4. 元素属性调整实时生效

### 🌟 理想状态：
1. LLM集成完全工作
2. 所有6种特效完美运行
3. WebSocket实时协作稳定
4. 响应时间 < 200ms

---

## 🚀 开始测试！

准备好了吗？让我们开始测试这个强大的模板编辑器！

1. **启动服务** → 按照上面的步骤启动前后端
2. **打开编辑器** → 访问 http://localhost:5173/template-editor  
3. **跟着检查单** → 逐项测试功能
4. **报告问题** → 记录任何异常或错误

**祝你测试愉快！🎮✨** 