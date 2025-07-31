import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  Badge,
  Grid
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import ChatAssistant from './editor/ChatAssistant';
import EffectsPanel from './editor/EffectsPanel';
import Timeline from './editor/Timeline';

interface TemplateElement {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    background?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;
    color?: string;
    opacity?: number;
    borderColor?: string;
    borderWidth?: string;
    borderStyle?: string;
  };
  content?: string;
}

interface GameTemplate {
  game_info: {
    title: string;
    description: string;
    style: string;
  };
  assets: {
    characters: Record<string, any>;
    backgrounds: Record<string, any>;
  };
  game_scenes: Array<{
    scene_id: string;
    scene_title: string;
    background_image?: string;
    background_music?: string;
    content_sequence: Array<{
      type: string;
      text: string;
      speaker: string;
      display_duration?: number;
      character_image?: string;
    }>;
    player_choices?: Array<{
      choice_id: string;
      choice_text: string;
      choice_type: string;
      target_scene_id?: string;
      immediate_response?: string;
      effects?: {
        world_state_changes?: string;
      };
    }>;
  }>;
}

// 背景编辑器组件
const BackgroundEditor: React.FC<{
  elementData: TemplateElement;
  onUpdate: (updates: Partial<TemplateElement>) => void;
}> = ({ elementData, onUpdate }) => {
  const [bgType, setBgType] = useState('gradient');
  const [color1, setColor1] = useState('#334155');
  const [color2, setColor2] = useState('#475569');
  const [angle, setAngle] = useState(135);
  const [solidColor, setSolidColor] = useState('#334155');

  // 预设的颜色组合
  const colorPresets = [
    { name: 'Slate Gray', color1: '#334155', color2: '#475569' },
    { name: 'Dark Blue', color1: '#1e293b', color2: '#334155' },
    { name: 'Purple Night', color1: '#581c87', color2: '#7c3aed' },
    { name: 'Ocean Deep', color1: '#0c4a6e', color2: '#0369a1' },
    { name: 'Forest Dark', color1: '#14532d', color2: '#166534' },
    { name: 'Sunset', color1: '#dc2626', color2: '#ea580c' }
  ];

  const updateBackground = () => {
    let background = '';
    if (bgType === 'gradient') {
      background = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
    } else {
      background = solidColor;
    }
    
    onUpdate({
      style: {
        ...elementData.style,
        background
      }
    });
  };

  useEffect(() => {
    updateBackground();
  }, [bgType, color1, color2, angle, solidColor]);

  return (
    <VStack gap={4} align="stretch">
      <Box>
        <Text fontSize="xs" color="#94a3b8" mb={2} fontWeight="500">Background Type</Text>
        <HStack gap={2}>
          <Button
            size="sm"
            variant={bgType === 'gradient' ? 'solid' : 'outline'}
            bg={bgType === 'gradient' ? '#6366f1' : 'transparent'}
            color={bgType === 'gradient' ? 'white' : '#d1d5db'}
            borderColor="#374151"
            _hover={{ bg: bgType === 'gradient' ? '#5b21b6' : '#374151' }}
            onClick={() => setBgType('gradient')}
            flex="1"
          >
            Gradient
          </Button>
          <Button
            size="sm"
            variant={bgType === 'solid' ? 'solid' : 'outline'}
            bg={bgType === 'solid' ? '#6366f1' : 'transparent'}
            color={bgType === 'solid' ? 'white' : '#d1d5db'}
            borderColor="#374151"
            _hover={{ bg: bgType === 'solid' ? '#5b21b6' : '#374151' }}
            onClick={() => setBgType('solid')}
            flex="1"
          >
            Solid
          </Button>
        </HStack>
      </Box>

      {bgType === 'gradient' ? (
        <>
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={2} fontWeight="500">Color Presets</Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={2}>
              {colorPresets.map((preset) => (
                <Button
                  key={preset.name}
                  size="xs"
                  variant="outline"
                  borderColor="#374151"
                  color="#d1d5db"
                  _hover={{ borderColor: '#6366f1' }}
                  onClick={() => {
                    setColor1(preset.color1);
                    setColor2(preset.color2);
                  }}
                >
                  <HStack gap={2}>
                    <Box
                      w="12px"
                      h="12px"
                      borderRadius="sm"
                      background={`linear-gradient(45deg, ${preset.color1}, ${preset.color2})`}
                    />
                    <Text fontSize="xs">{preset.name}</Text>
                  </HStack>
                </Button>
              ))}
            </Grid>
          </Box>

          <HStack gap={3}>
            <Box flex="1">
              <Text fontSize="xs" color="#94a3b8" mb={1}>Start Color</Text>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  w="40px"
                  h="32px"
                  p={1}
                  bg="#1e293b"
                  border="1px solid"
                  borderColor="#374151"
                  borderRadius="md"
                />
                <Input
                  size="sm"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  bg="#1e293b"
                  border="1px solid"
                  borderColor="#374151"
                  color="#f1f5f9"
                  _focus={{ borderColor: '#6366f1' }}
                  fontSize="xs"
                />
              </HStack>
            </Box>
            <Box flex="1">
              <Text fontSize="xs" color="#94a3b8" mb={1}>End Color</Text>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  w="40px"
                  h="32px"
                  p={1}
                  bg="#1e293b"
                  border="1px solid"
                  borderColor="#374151"
                  borderRadius="md"
                />
                <Input
                  size="sm"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  bg="#1e293b"
                  border="1px solid"
                  borderColor="#374151"
                  color="#f1f5f9"
                  _focus={{ borderColor: '#6366f1' }}
                  fontSize="xs"
                />
              </HStack>
            </Box>
          </HStack>

          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={2}>
              Gradient Angle: {angle}°
            </Text>
            <Input
              type="range"
              min={0}
              max={360}
              step={15}
              value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value))}
              bg="#1e293b"
              border="1px solid"
              borderColor="#374151"
              borderRadius="md"
            />
            <HStack justify="space-between" mt={1}>
              <Text fontSize="xs" color="#6b7280">0°</Text>
              <Text fontSize="xs" color="#6b7280">180°</Text>
              <Text fontSize="xs" color="#6b7280">360°</Text>
            </HStack>
          </Box>

          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={2}>Preview</Text>
            <Box
              h="40px"
              borderRadius="md"
              border="1px solid"
              borderColor="#374151"
              background={`linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`}
            />
          </Box>
        </>
      ) : (
        <>
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>Solid Color</Text>
            <HStack gap={2}>
              <Input
                type="color"
                value={solidColor}
                onChange={(e) => setSolidColor(e.target.value)}
                w="40px"
                h="32px"
                p={1}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                borderRadius="md"
              />
              <Input
                size="sm"
                value={solidColor}
                onChange={(e) => setSolidColor(e.target.value)}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
                _focus={{ borderColor: '#6366f1' }}
                fontSize="xs"
              />
            </HStack>
          </Box>

          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={2}>Preview</Text>
            <Box
              h="40px"
              borderRadius="md"
              border="1px solid"
              borderColor="#374151"
              background={solidColor}
            />
          </Box>
        </>
      )}
    </VStack>
  );
};

const TemplateEditor: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [activePanel, setActivePanel] = useState<'chat' | 'effects' | null>(null);
  const [leftTab, setLeftTab] = useState<'layers' | 'assets' | 'timeline' | 'materials'>('layers');
  const [zoom, setZoom] = useState(1);
  const [currentTemplate, setCurrentTemplate] = useState<string>('default');
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // 节点管理状态
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameTemplate | null>(null);
  const [sceneTemplates, setSceneTemplates] = useState<Record<string, TemplateElement[]>>({});
  
  const toast = useToast();

  const canvasRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 默认模板
  const defaultTemplate: TemplateElement[] = [
    {
      id: 'background',
      type: 'background',
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 },
      style: {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        opacity: 1
      }
    },
    {
      id: 'dialogue-box',
      type: 'dialogue',
      position: { x: 50, y: 400 },
      size: { width: 700, height: 150 },
      style: {
        background: 'rgba(30, 41, 59, 0.95)',
        fontSize: '14px',
        fontWeight: 'normal',
        color: '#f1f5f9',
        opacity: 0.95,
        borderColor: '#6366f1',
        borderWidth: '2px',
        borderStyle: 'solid'
      },
      content: 'This is a dialogue box example. You can edit the text content here.'
    },

    {
      id: 'character',
      type: 'character',
      position: { x: 300, y: 100 },
      size: { width: 200, height: 300 },
      style: {
        background: 'rgba(99, 102, 241, 0.2)',
        fontSize: '12px',
        color: '#4f46e5',
        opacity: 0.9,
        borderColor: '#8b5cf6',
        borderWidth: '1px',
        borderStyle: 'dashed'
      },
      content: 'Character Portrait'
    },
    {
      id: 'choices-area',
      type: 'choices',
      position: { x: 50, y: 580 },
      size: { width: 700, height: 100 },
      style: {
        background: 'rgba(30, 41, 59, 0.8)',
        fontSize: '12px',
        color: '#cbd5e1',
        opacity: 0.9,
        borderColor: '#10b981',
        borderWidth: '1px',
        borderStyle: 'solid'
      },
      content: 'Choice buttons will be displayed here'
    }
  ];

  // 初始化默认模板
  useEffect(() => {
    setElements(defaultTemplate);
  }, []);

  // 导入游戏模板
  const importGameTemplate = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/game/data');
      if (!response.ok) {
        throw new Error('Failed to fetch game data');
      }
      
      const importedGameData: GameTemplate = await response.json();
      setGameData(importedGameData);
      
      // 生成时间轴事件
      const timelineEvents = generateTimelineEvents(importedGameData);
      setTimelineEvents(timelineEvents);
      
      // 为每个场景生成模板
      const newSceneTemplates: Record<string, TemplateElement[]> = {};
      
      importedGameData.game_scenes.forEach((scene) => {
        const sceneElements: TemplateElement[] = [
          // 背景
          {
            id: 'background',
            type: 'background',
            position: { x: 0, y: 0 },
            size: { width: 800, height: 600 },
            style: {
              background: scene.background_image ? `url(${scene.background_image})` : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              opacity: 1
            }
          },
          // 场景标题
          {
            id: 'scene-title',
            type: 'text',
            position: { x: 250, y: 40 },
            size: { width: 300, height: 40 },
            style: {
              background: 'transparent',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ffffff',
              opacity: 1,
              textAlign: 'center'
            },
            content: scene.scene_title
          },
          // 角色立绘
          {
            id: 'character-portrait',
            type: 'character',
            position: { x: 550, y: 100 },
            size: { width: 200, height: 300 },
            style: {
              background: 'rgba(99, 102, 241, 0.1)',
              fontSize: '14px',
              color: '#a5b4fc',
              opacity: 0.8,
              borderColor: '#6366f1',
              borderWidth: '2px',
              borderStyle: 'solid'
            },
            content: 'Character Portrait\n(AI Generated)'
          },
          // 说话者名称
          {
            id: 'speaker-name',
            type: 'text',
            position: { x: 50, y: 400 },
            size: { width: 200, height: 30 },
            style: {
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#ff6b9d',
              opacity: 1
            },
            content: scene.content_sequence?.[0]?.speaker || 'Speaker Name'
          },
          // 对话框
          {
            id: 'dialogue-box',
            type: 'dialogue',
            position: { x: 0, y: 430 },
            size: { width: 800, height: 120 },
            style: {
              background: 'linear-gradient(135deg, rgba(44, 44, 84, 0.95) 0%, rgba(52, 58, 94, 0.95) 100%)',
              fontSize: '14px',
              fontWeight: 'normal',
              color: '#ffffff',
              opacity: 0.95,
              borderColor: '#ff6b9d',
              borderWidth: '2px 0 0 0',
              borderStyle: 'solid'
            },
            content: scene.content_sequence?.[0]?.text || 'Dialogue content will be displayed here...'
          },
          // 选择按钮 - 每个选择一个独立按钮（默认隐藏）
          ...(scene.player_choices?.map((choice, index) => ({
            id: `choice-${choice.choice_id}`,
            type: 'choice-button',
            position: { x: 400, y: 200 + (index * 60) },
            size: { width: 350, height: 50 },
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              fontSize: '12px',
              color: '#ffffff',
              opacity: 0, // 默认隐藏
              borderColor: choice.choice_type === 'continue' ? '#4ecdc4' : '#ff6b9d',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderRadius: '15px'
            },
            content: choice.choice_text
          })) || [])
        ];
        
        newSceneTemplates[scene.scene_id] = sceneElements;
      });
      
      setSceneTemplates(newSceneTemplates);
      
      // 设置第一个场景为当前场景
      if (importedGameData.game_scenes.length > 0) {
        const firstScene = importedGameData.game_scenes[0];
        setCurrentSceneId(firstScene.scene_id);
        setElements(newSceneTemplates[firstScene.scene_id]);
      }
      
      setCurrentTemplate(importedGameData.game_info.title);
      
      toast({
        title: 'Template Imported',
        description: `Successfully imported "${importedGameData.game_info.title}" template`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Failed to import template:', error);
      toast({
        title: 'Import Failed',
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // 重置为默认模板
  const resetToDefault = () => {
    setElements(defaultTemplate);
    setCurrentTemplate('default');
    toast({
      title: 'Template Reset',
      description: 'Reset to default template',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleElementClick = (elementId: string) => {
    setSelectedElement(elementId);
  };

  // 拖拽相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [dragStartElement, setDragStartElement] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    // 记录拖拽开始时的鼠标位置和元素位置
    setDragStartMouse({ x: e.clientX, y: e.clientY });
    setDragStartElement({ x: element.position.x, y: element.position.y });
    setIsDragging(true);
    setSelectedElement(elementId);
    

  };



  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string, handle: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setSelectedElement(elementId);
  };

  // 全局鼠标事件监听器
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && selectedElement) {
        // 计算鼠标移动的距离
        const deltaX = e.clientX - dragStartMouse.x;
        const deltaY = e.clientY - dragStartMouse.y;

        // 计算新位置
        const newX = dragStartElement.x + deltaX;
        const newY = dragStartElement.y + deltaY;

        // 限制在画布范围内
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;

        const maxX = 800 - element.size.width;
        const maxY = 600 - element.size.height;
        
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));

        // 直接更新元素位置
        setElements(prev => prev.map(el => 
          el.id === selectedElement ? { 
            ...el, 
            position: { x: clampedX, y: clampedY }
          } : el
        ));
      }

      if (isResizing && selectedElement) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;

        // 计算画布的实际位置（考虑缩放和居中）
        const canvasWidth = 800 * zoom;
        const canvasHeight = 600 * zoom;
        const canvasLeft = canvasRect.left + (canvasRect.width - canvasWidth) / 2;
        const canvasTop = canvasRect.top + (canvasRect.height - canvasHeight) / 2;

        // 考虑缩放因素
        const mouseX = (e.clientX - canvasLeft) / zoom;
        const mouseY = (e.clientY - canvasTop) / zoom;

        let newWidth = element.size.width;
        let newHeight = element.size.height;
        let newX = element.position.x;
        let newY = element.position.y;

        // 根据调整手柄计算新尺寸
        switch (resizeHandle) {
          case 'se':
            newWidth = Math.max(50, mouseX - element.position.x);
            newHeight = Math.max(50, mouseY - element.position.y);
            break;
          case 'sw':
            newWidth = Math.max(50, element.position.x + element.size.width - mouseX);
            newHeight = Math.max(50, mouseY - element.position.y);
            newX = mouseX;
            break;
          case 'ne':
            newWidth = Math.max(50, mouseX - element.position.x);
            newHeight = Math.max(50, element.position.y + element.size.height - mouseY);
            newY = mouseY;
            break;
          case 'nw':
            newWidth = Math.max(50, element.position.x + element.size.width - mouseX);
            newHeight = Math.max(50, element.position.y + element.size.height - mouseY);
            newX = mouseX;
            newY = mouseY;
            break;
        }

        // 限制在画布范围内
        newWidth = Math.min(newWidth, 800 - newX);
        newHeight = Math.min(newHeight, 600 - newY);

        handleElementUpdate(selectedElement, {
          position: { x: newX, y: newY },
          size: { width: newWidth, height: newHeight }
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, selectedElement, dragStartMouse, dragStartElement, resizeHandle]);

  const handleElementUpdate = (elementId: string, updates: Partial<TemplateElement>) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const handleStyleUpdate = (property: string, value: any) => {
    if (selectedElement) {
      handleElementUpdate(selectedElement, {
        style: {
          ...elements.find(el => el.id === selectedElement)?.style,
          [property]: value
        }
      });
    }
  };

  const handlePositionUpdate = (axis: 'x' | 'y', value: number) => {
    if (selectedElement) {
      const element = elements.find(el => el.id === selectedElement);
      if (element) {
        handleElementUpdate(selectedElement, {
          position: {
            ...element.position,
            [axis]: value
          }
        });
      }
    }
  };

  // AI助手回调函数
  const handleExecuteCommand = (command: any) => {
    console.log('Execute AI command:', command);
    
    switch (command.type) {
      case 'update_element':
        if (selectedElement && command.parameters) {
          Object.entries(command.parameters).forEach(([key, value]) => {
            handleStyleUpdate(key, value);
          });
        }
        break;
      case 'add_effect':
        if (command.effect_type) {
          handleApplyEffect(command.effect_type, command.config || {});
        }
        break;
      default:
        console.log('Unknown command type:', command.type);
    }
  };

  const handleApplyEffect = (effectType: string, config: any = {}) => {
    console.log('Apply effect:', effectType, 'to element:', selectedElement, 'config:', config);
    
    if (!selectedElement) {
      toast({
        title: 'No Element Selected',
        description: 'Please select an element first',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const effectName = {
      'bloodDrop': 'Blood Drop Effect',
      'particles': 'Particle System',
      'glow': 'Glow Effect',
      'ripple': 'Ripple Effect',
      'lightning': 'Lightning Effect',
      'smoke': 'Smoke Effect'
    }[effectType] || effectType;
    
    toast({
      title: 'Effect Applied',
      description: `Applied ${effectName} to ${selectedElement}`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // 时间轴事件处理函数
  const handleEventReorder = (events: any[]) => {
    setTimelineEvents(events);
    toast({
      title: 'Timeline Updated',
      description: 'Event order has been updated.',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    
    // 根据事件类型选择对应的画布元素
    const selectedEvent = timelineEvents.find(event => event.id === eventId);
    if (selectedEvent) {
      let targetElementId = null;
      
      switch (selectedEvent.type) {
        case 'scene':
          // 场景开始 - 选择场景标题
          targetElementId = 'scene-title';
          break;
        case 'dialogue':
        case 'narration':
          // 对话和旁白 - 选择对话框，隐藏选择按钮
          toggleChoiceButtons(false);
          targetElementId = 'dialogue-box';
          break;
        case 'choices':
          // 选择 - 显示所有选择按钮
          toggleChoiceButtons(true);
          targetElementId = `choice-${selectedEvent.choices?.[0]?.choice_id}`;
          break;
      }
      
      if (targetElementId) {
        setSelectedElement(targetElementId);
        
        // 更新对应元素的内容和说话者
        const updatedElements = elements.map(element => {
          if (element.id === targetElementId) {
            return { ...element, content: selectedEvent.content };
          }
          // 更新说话者名称
          if (element.id === 'speaker-name' && selectedEvent.speaker) {
            return { ...element, content: selectedEvent.speaker };
          }
          return element;
        });
        
        setElements(updatedElements);
        
        // 如果有场景ID，切换到对应场景
        if (selectedEvent.sceneId && selectedEvent.sceneId !== currentSceneId) {
          switchToScene(selectedEvent.sceneId);
          return; // 场景切换会自动处理滚动
        }
        
        // 滚动到选中的元素
        setTimeout(() => {
          if (elementRefs.current[targetElementId]) {
            elementRefs.current[targetElementId]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 100);
      }
      
      // 显示选中提示
      toast({
        title: 'Event Selected',
        description: `${selectedEvent.title}`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    }
  };



  // 控制选择按钮显示/隐藏
  const toggleChoiceButtons = (show: boolean) => {
    setElements(prev => prev.map(element => {
      if (element.type === 'choice-button') {
        return {
          ...element,
          style: {
            ...element.style,
            opacity: show ? 0.9 : 0
          }
        };
      }
      return element;
    }));
  };

  // 场景切换函数
  const switchToScene = (sceneId: string) => {
    if (!gameData || !sceneTemplates[sceneId]) return;
    
    // 保存当前场景的模板
    if (currentSceneId) {
      setSceneTemplates(prev => ({
        ...prev,
        [currentSceneId]: elements
      }));
    }
    
    setCurrentSceneId(sceneId);
    setElements(sceneTemplates[sceneId]);
    
    // 默认隐藏选择按钮
    setTimeout(() => toggleChoiceButtons(false), 100);
    
    toast({
      title: 'Scene Switched',
      description: `Switched to scene: ${gameData.game_scenes.find(s => s.scene_id === sceneId)?.scene_title}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // 从游戏数据生成时间轴事件
  const generateTimelineEvents = (gameData: GameTemplate) => {
    const events: any[] = [];
    let eventIndex = 0;

    gameData.game_scenes?.forEach((scene, sceneIndex) => {
      // 添加场景开始事件
      events.push({
        id: `scene_start_${sceneIndex}`,
        type: 'scene',
        title: `${scene.scene_title} - Scene Start`,
        content: `Scene: ${scene.scene_title}`,
        speaker: 'System',
        duration: 1000,
        order: eventIndex++,
        sceneId: scene.scene_id
      });

      // 添加所有对话和旁白事件
      scene.content_sequence?.forEach((content, contentIndex) => {
        events.push({
          id: `content_${sceneIndex}_${contentIndex}`,
          type: content.type,
          title: `${scene.scene_title} - ${content.type}`,
          content: content.text,
          speaker: content.speaker,
          duration: content.type === 'narration' ? 4000 : 3000,
          order: eventIndex++,
          sceneId: scene.scene_id
        });
      });

      // 添加选择事件
      if (scene.player_choices && scene.player_choices.length > 0) {
        events.push({
          id: `choices_${sceneIndex}`,
          type: 'choices',
          title: `${scene.scene_title} - Player Choices`,
          content: `${scene.player_choices.length} choices available`,
          speaker: 'System',
          duration: 0, // 等待用户选择
          order: eventIndex++,
          sceneId: scene.scene_id,
          choices: scene.player_choices
        });
      }
    });

    return events;
  };

  const selectedElementData = selectedElement ? elements.find(el => el.id === selectedElement) : null;

  const getElementIcon = (type: string) => {
    const icons = {
      'background': '🖼️',
      'dialogue': '💬',
      'character': '👤',
      'text': '📝',
      'button': '🔘',
      'choices': '⚡',
      'choice-button': '🔘',
      'narration': '📖'
    };
    return icons[type as keyof typeof icons] || '📦';
  };

  const getElementTypeName = (type: string) => {
    const names = {
      'background': 'Background',
      'dialogue': 'Dialogue Box',
      'character': 'Character',
      'text': 'Text',
      'button': 'Button',
      'choices': 'Choices',
      'choice-button': 'Choice Button',
      'narration': 'Narration'
    };
    return names[type as keyof typeof names] || 'Element';
  };

  return (
    <Box w="100vw" h="100vh" bg="#0c0d12">
      {/* 顶部工具栏 - 深色专业风格 */}
      <Flex 
        bg="#1a1b23" 
        px={6}
        py={3}
        borderBottom="1px solid" 
        borderColor="#2d2e37"
        align="center"
        justify="space-between"
        boxShadow="0 1px 3px 0 rgba(0, 0, 0, 0.3)"
      >
        <HStack gap={8}>
          <Text fontSize="lg" fontWeight="600" color="#f8fafc">
            Template Editor
          </Text>
                      <HStack gap={4}>
              <Button 
                size="sm" 
                variant="plain"
                color="#d1d5db"
                bg="transparent"
                _hover={{ bg: '#374151', color: 'white' }}
                fontWeight="500"
                px={3}
                py={2}
                borderRadius="md"
                transition="all 0.2s"
              >
                File
              </Button>
              <Button 
                size="sm" 
                variant="plain"
                color="#d1d5db"
                bg="transparent"
                _hover={{ bg: '#374151', color: 'white' }}
                fontWeight="500"
                px={3}
                py={2}
                borderRadius="md"
                transition="all 0.2s"
              >
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="plain"
                color="#d1d5db"
                bg="transparent"
                _hover={{ bg: '#374151', color: 'white' }}
                fontWeight="500"
                px={3}
                py={2}
                borderRadius="md"
                transition="all 0.2s"
              >
                View
              </Button>
            </HStack>
        </HStack>

        <HStack gap={3}>
          <Button 
            size="sm" 
            variant={activePanel === 'chat' ? 'solid' : 'outline'}
            bg={activePanel === 'chat' ? '#6366f1' : 'transparent'}
            color={activePanel === 'chat' ? 'white' : '#a5b4fc'}
            borderColor="#4f46e5"
            _hover={{ bg: activePanel === 'chat' ? '#5b21b6' : '#4f46e5', color: 'white' }}
            onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
            fontSize="sm"
            fontWeight="500"
          >
            AI Assistant
          </Button>
          <Button 
            size="sm" 
            variant={activePanel === 'effects' ? 'solid' : 'outline'}
            bg={activePanel === 'effects' ? '#8b5cf6' : 'transparent'}
            color={activePanel === 'effects' ? 'white' : '#c4b5fd'}
            borderColor="#7c3aed"
            _hover={{ bg: activePanel === 'effects' ? '#7c3aed' : '#8b5cf6', color: 'white' }}
            onClick={() => setActivePanel(activePanel === 'effects' ? null : 'effects')}
            fontSize="sm"
            fontWeight="500"
          >
            Effects
          </Button>
          <Box w="1px" h="6" bg="#374151" />
          <Button 
            size="sm" 
            bg="#10b981" 
            color="white" 
            _hover={{ bg: '#059669' }}
            fontWeight="500"
          >
            Publish
          </Button>
          <Button 
            size="sm" 
            variant="plain"
            color="#d1d5db"
            bg="transparent"
            _hover={{ bg: '#374151', color: 'white' }}
            fontWeight="500"
            px={3}
            py={2}
            borderRadius="md"
            transition="all 0.2s"
          >
            Preview
          </Button>
        </HStack>
      </Flex>

      <Flex h="calc(100vh - 60px)">
        {/* 左侧面板 - 深色主题 */}
        <Box 
          w="280px" 
          bg="#111318" 
          borderRight="1px solid" 
          borderColor="#2d2e37"
        >
          {/* 左侧面板头部 */}
          <Flex bg="#1a1b23" borderBottom="1px solid" borderColor="#2d2e37">
            <Button
              flex="1"
              variant="plain"
              size="sm"
              fontWeight={leftTab === 'layers' ? '600' : '400'}
              color={leftTab === 'layers' ? '#a5b4fc' : '#6b7280'}
              bg={leftTab === 'layers' ? '#312e81' : 'transparent'}
              borderRadius="0"
              onClick={() => setLeftTab('layers')}
              py={3}
              _hover={{ bg: leftTab === 'layers' ? '#312e81' : '#2d2e37' }}
            >
              Layers
            </Button>
            <Button
              flex="1"
              variant="plain"
              size="sm"
              fontWeight={leftTab === 'assets' ? '600' : '400'}
              color={leftTab === 'assets' ? '#a5b4fc' : '#6b7280'}
              bg={leftTab === 'assets' ? '#312e81' : 'transparent'}
              borderRadius="0"
              onClick={() => setLeftTab('assets')}
              py={3}
              _hover={{ bg: leftTab === 'assets' ? '#312e81' : '#2d2e37' }}
            >
              Assets
            </Button>
            <Button
              flex="1"
              variant="plain"
              size="sm"
              fontWeight={leftTab === 'timeline' ? '600' : '400'}
              color={leftTab === 'timeline' ? '#a5b4fc' : '#6b7280'}
              bg={leftTab === 'timeline' ? '#312e81' : 'transparent'}
              borderRadius="0"
              onClick={() => setLeftTab('timeline')}
              py={3}
              _hover={{ bg: leftTab === 'timeline' ? '#312e81' : '#2d2e37' }}
            >
              Timeline
            </Button>
            <Button
              flex="1"
              variant="plain"
              size="sm"
              fontWeight={leftTab === 'materials' ? '600' : '400'}
              color={leftTab === 'materials' ? '#a5b4fc' : '#6b7280'}
              bg={leftTab === 'materials' ? '#312e81' : 'transparent'}
              borderRadius="0"
              onClick={() => setLeftTab('materials')}
              py={3}
              _hover={{ bg: leftTab === 'materials' ? '#312e81' : '#2d2e37' }}
            >
              Materials
            </Button>
          </Flex>

          {/* 面板内容 */}
          <Box p={3} h="calc(100% - 60px)" overflow="hidden">
            {leftTab === 'layers' ? (
              <VStack gap={1} align="stretch">
                {elements.map((element) => (
                  <Box
                    key={element.id}
                    px={3}
                    py={2}
                    bg={selectedElement === element.id ? '#312e81' : '#1e293b'}
                    borderLeft={selectedElement === element.id ? '3px solid' : '3px solid transparent'}
                    borderColor="#6366f1"
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => handleElementClick(element.id)}
                    _hover={{ bg: selectedElement === element.id ? '#312e81' : '#334155' }}
                    transition="all 0.15s ease"
                    border="1px solid"
                    borderRightColor={selectedElement === element.id ? '#4f46e5' : '#374151'}
                    borderTopColor={selectedElement === element.id ? '#4f46e5' : '#374151'}
                    borderBottomColor={selectedElement === element.id ? '#4f46e5' : '#374151'}
                  >
                    <HStack justify="space-between">
                      <HStack gap={3}>
                        <Text fontSize="md">{getElementIcon(element.type)}</Text>
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" fontWeight="500" color="#f1f5f9">
                            {getElementTypeName(element.type)}
                          </Text>
                          <Text fontSize="xs" color="#94a3b8">
                            {element.id}
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack gap={1}>
                        <Text fontSize="xs" cursor="pointer" color="#6b7280" _hover={{ color: '#d1d5db' }}>👁️</Text>
                        <Text fontSize="xs" cursor="pointer" color="#6b7280" _hover={{ color: '#d1d5db' }}>🔓</Text>
                      </HStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            ) : leftTab === 'assets' ? (
              <VStack gap={3} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
                    Template Actions
                  </Text>
                  <VStack gap={2} align="stretch">
                    <Button
                      size="sm"
                      bg="#6366f1"
                      color="white"
                      _hover={{ bg: '#5b21b6' }}
                      onClick={importGameTemplate}
                    >
                      Import Game Template
                    </Button>
                    <Button
                      size="sm"
                      variant="plain"
                      color="#d1d5db"
                      bg="transparent"
                      _hover={{ bg: '#374151', color: 'white' }}
                      onClick={resetToDefault}
                      fontWeight="500"
                      px={3}
                      py={2}
                      borderRadius="md"
                      transition="all 0.2s"
                    >
                      Reset to Default
                    </Button>
                  </VStack>
                </Box>
                
                <Box>
                  <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
                    Current Template
                  </Text>
                  <Box
                    px={3}
                    py={2}
                    bg="#312e81"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="#4f46e5"
                  >
                    <Text fontSize="sm" color="#a5b4fc" fontWeight="500">
                      {currentTemplate}
                    </Text>
                  </Box>
                </Box>
              </VStack>
            ) : leftTab === 'timeline' ? (
              <Timeline
                events={timelineEvents}
                onEventReorder={handleEventReorder}
                onEventSelect={handleEventSelect}
                selectedEventId={selectedEventId || undefined}
              />
            ) : leftTab === 'materials' ? (
              <VStack gap={3} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
                    Scene Selector
                  </Text>
                  {gameData && (
                    <VStack gap={2} align="stretch">
                      {gameData.game_scenes.map((scene) => (
                        <Button
                          key={scene.scene_id}
                          size="sm"
                          variant="plain"
                          color={currentSceneId === scene.scene_id ? '#a5b4fc' : '#d1d5db'}
                          bg={currentSceneId === scene.scene_id ? '#312e81' : 'transparent'}
                          _hover={{ bg: currentSceneId === scene.scene_id ? '#312e81' : '#374151' }}
                          onClick={() => switchToScene(scene.scene_id)}
                          justifyContent="flex-start"
                          textAlign="left"
                          px={3}
                          py={2}
                          borderRadius="md"
                          transition="all 0.2s"
                        >
                          <VStack align="start" gap={1} w="100%">
                            <Text fontSize="sm" fontWeight="500">
                              {scene.scene_title}
                            </Text>
                            <Text fontSize="xs" color="#94a3b8">
                              {scene.content_sequence?.[0]?.text?.substring(0, 50)}...
                            </Text>
                            {scene.player_choices && scene.player_choices.length > 0 && (
                              <Text fontSize="xs" color="#10b981">
                                {scene.player_choices.length} choices available
                              </Text>
                            )}
                          </VStack>
                        </Button>
                      ))}
                    </VStack>
                  )}
                </Box>

                {/* 当前场景的分支信息 */}
                {gameData && currentSceneId && (() => {
                  const currentScene = gameData.game_scenes.find(s => s.scene_id === currentSceneId);
                  if (!currentScene?.player_choices) return null;
                  
                  return (
                    <Box>
                      <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
                        Current Scene Branches
                      </Text>
                      <VStack gap={2} align="stretch">
                        {currentScene.player_choices.map((choice, index) => (
                          <Box
                            key={choice.choice_id}
                            p={2}
                            bg="rgba(30, 41, 59, 0.8)"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="#475569"
                          >
                            <Text fontSize="xs" fontWeight="500" color="#a5b4fc" mb={1}>
                              Choice {index + 1}
                            </Text>
                            <Text fontSize="xs" color="#cbd5e1" mb={1}>
                              {choice.choice_text.length > 50 ? choice.choice_text.substring(0, 50) + '...' : choice.choice_text}
                            </Text>
                            {choice.target_scene_id && (
                              <Text 
                                fontSize="xs" 
                                color="#10b981"
                                cursor="pointer"
                                _hover={{ color: '#22c55e', textDecoration: 'underline' }}
                                onClick={() => choice.target_scene_id && switchToScene(choice.target_scene_id)}
                              >
                                → {gameData.game_scenes.find(s => s.scene_id === choice.target_scene_id)?.scene_title || 'Unknown Scene'}
                              </Text>
                            )}
                            {choice.choice_type === 'stay' && (
                              <Text fontSize="xs" color="#f59e0b">
                                → Stays in current scene
                              </Text>
                            )}
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  );
                })()}
              </VStack>
            ) : null}
          </Box>
        </Box>

        {/* 中央画布区域 */}
        <Box flex="1" bg="#0f1419" position="relative">
          {/* 画布工具栏 */}
          <Flex 
            bg="#1a1b23" 
            px={4}
            py={2}
            borderBottom="1px solid" 
            borderColor="#2d2e37"
            align="center"
            justify="center"
          >
            <HStack gap={3}>
              <Button 
                size="xs" 
                variant="plain"
                color="#d1d5db"
                bg="transparent"
                _hover={{ bg: '#374151', color: 'white' }}
                onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                fontWeight="500"
                px={2}
                py={1}
                borderRadius="md"
                transition="all 0.2s"
              >
                −
              </Button>
              <Text fontSize="xs" color="#94a3b8" minW="50px" textAlign="center" fontWeight="500">
                {Math.round(zoom * 100)}%
              </Text>
              <Button 
                size="xs" 
                variant="plain"
                color="#d1d5db"
                bg="transparent"
                _hover={{ bg: '#374151', color: 'white' }}
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                fontWeight="500"
                px={2}
                py={1}
                borderRadius="md"
                transition="all 0.2s"
              >
                +
              </Button>
              <Box w="1px" h="4" bg="#374151" mx={2} />
              <Button 
                size="xs" 
                variant="plain"
                color="#d1d5db"
                bg="transparent"
                _hover={{ bg: '#374151', color: 'white' }}
                fontWeight="500"
                px={2}
                py={1}
                borderRadius="md"
                transition="all 0.2s"
              >
                Fit
              </Button>
              <Button 
                size="xs" 
                variant="plain"
                color="#d1d5db"
                bg="transparent"
                _hover={{ bg: '#374151', color: 'white' }}
                onClick={() => setZoom(1)}
                fontWeight="500"
                px={2}
                py={1}
                borderRadius="md"
                transition="all 0.2s"
              >
                100%
              </Button>
            </HStack>
          </Flex>

          {/* 画布 */}
          <Flex align="center" justify="center" h="calc(100% - 41px)" p={8}>
            <Box
              ref={canvasRef}
              position="relative"
              w="800px"
              h="600px"
              transform={`scale(${zoom})`}
              transformOrigin="center"
              border="1px solid"
              borderColor="#374151"
              bg="#f8fafc"
              borderRadius="8px"
              boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
              overflow="hidden"
            >
              {elements
                .sort((a, b) => {
                  // 确保背景元素在最底层
                  if (a.type === 'background') return -1;
                  if (b.type === 'background') return 1;
                  return 0;
                })
                .map((element, index) => (
                <Box
                  key={element.id}
                  ref={(el: HTMLDivElement | null) => elementRefs.current[element.id] = el}
                  position="absolute"
                  left={`${element.position.x}px`}
                  top={`${element.position.y}px`}
                  width={`${element.size.width}px`}
                  height={`${element.size.height}px`}
                  bg={element.style.background}
                  color={element.style.color}
                  fontSize={element.style.fontSize}
                  fontWeight={element.style.fontWeight}
                  fontStyle={element.style.fontStyle}
                  textAlign={element.style.textAlign}
                  opacity={element.style.opacity}
                  zIndex={element.type === 'background' ? 1 : index + 2}
                  border={
                    element.style.borderStyle && element.style.borderStyle !== 'none' 
                      ? `${element.style.borderWidth || '1px'} ${element.style.borderStyle} ${element.style.borderColor || '#374151'}`
                      : selectedElement === element.id && element.type !== 'background' 
                        ? '2px solid #6366f1' 
                        : '1px solid transparent'
                  }
                  cursor={isDragging ? 'grabbing' : 'grab'}
                  onClick={() => handleElementClick(element.id)}
                  onMouseDown={(e) => handleMouseDown(e, element.id)}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  p={element.type === 'background' ? 0 : 2}
                  borderRadius={element.type === 'background' ? '8px' : 'md'}
                  transition="all 0.2s ease"
                  _hover={{
                    boxShadow: selectedElement === element.id ? '0 0 20px rgba(99, 102, 241, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {element.content && element.type !== 'background' && (
                    <Text textAlign="center" wordBreak="break-word">
                      {element.content}
                    </Text>
                  )}

                  {/* 调整手柄 */}
                  {selectedElement === element.id && element.type !== 'background' && (
                    <>
                      {/* 右下角手柄 */}
                      <Box
                        position="absolute"
                        right="-6px"
                        bottom="-6px"
                        width="12px"
                        height="12px"
                        bg="#6366f1"
                        border="2px solid white"
                        borderRadius="50%"
                        cursor="nw-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, 'se')}
                        zIndex={1000}
                      />
                      {/* 左下角手柄 */}
                      <Box
                        position="absolute"
                        left="-6px"
                        bottom="-6px"
                        width="12px"
                        height="12px"
                        bg="#6366f1"
                        border="2px solid white"
                        borderRadius="50%"
                        cursor="ne-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, 'sw')}
                        zIndex={1000}
                      />
                      {/* 右上角手柄 */}
                      <Box
                        position="absolute"
                        right="-6px"
                        top="-6px"
                        width="12px"
                        height="12px"
                        bg="#6366f1"
                        border="2px solid white"
                        borderRadius="50%"
                        cursor="sw-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, 'ne')}
                        zIndex={1000}
                      />
                      {/* 左上角手柄 */}
                      <Box
                        position="absolute"
                        left="-6px"
                        top="-6px"
                        width="12px"
                        height="12px"
                        bg="#6366f1"
                        border="2px solid white"
                        borderRadius="50%"
                        cursor="se-resize"
                        onMouseDown={(e) => handleResizeStart(e, element.id, 'nw')}
                        zIndex={1000}
                      />
                    </>
                  )}
                </Box>
              ))}
              
              {/* 背景元素的独立选择框 */}
              {selectedElement && elements.find(el => el.id === selectedElement)?.type === 'background' && (
                <Box
                  position="absolute"
                  left="0px"
                  top="0px"
                  width="100%"
                  height="100%"
                  border="3px solid #6366f1"
                  borderRadius="8px"
                  pointerEvents="none"
                  zIndex={999}
                  boxShadow="0 0 20px rgba(99, 102, 241, 0.3)"
                />
              )}
            </Box>
          </Flex>
        </Box>

        {/* 右侧属性面板 */}
        <Box 
          w="320px" 
          bg="#111318" 
          borderLeft="1px solid" 
          borderColor="#2d2e37"
          overflow="auto"
        >
          <Box px={4} py={3} borderBottom="1px solid" borderColor="#2d2e37">
            <Text fontSize="md" fontWeight="600" color="#f8fafc">
              Properties
            </Text>
          </Box>

          {selectedElementData ? (
            <Box p={4}>
              <VStack gap={6} align="stretch">
                {/* 元素信息 */}
                <Box>
                  <HStack mb={3}>
                    <Text fontSize="lg">{getElementIcon(selectedElementData.type)}</Text>
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="500" color="#f1f5f9">
                        {getElementTypeName(selectedElementData.type)}
                      </Text>
                      <Badge variant="outline" colorScheme="purple" fontSize="xs" color="#c4b5fd" borderColor="#7c3aed">
                        {selectedElementData.id}
                      </Badge>
                    </VStack>
                  </HStack>
                </Box>

                <Box w="100%" h="1px" bg="#374151" />

                {/* 位置和尺寸 */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
                    Transform
                  </Text>
                  <VStack gap={3} align="stretch">
                    <HStack gap={3}>
                      <Box flex="1">
                        <Text fontSize="xs" color="#94a3b8" mb={1}>X Position</Text>
                        <Input
                          size="sm"
                          type="number"
                          value={selectedElementData.position.x}
                          onChange={(e) => handlePositionUpdate('x', parseInt(e.target.value) || 0)}
                          bg="#1e293b"
                          border="1px solid"
                          borderColor="#374151"
                          color="#f1f5f9"
                          _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                          borderRadius="6px"
                        />
                      </Box>
                      <Box flex="1">
                        <Text fontSize="xs" color="#94a3b8" mb={1}>Y Position</Text>
                        <Input
                          size="sm"
                          type="number"
                          value={selectedElementData.position.y}
                          onChange={(e) => handlePositionUpdate('y', parseInt(e.target.value) || 0)}
                          bg="#1e293b"
                          border="1px solid"
                          borderColor="#374151"
                          color="#f1f5f9"
                          _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                          borderRadius="6px"
                        />
                      </Box>
                    </HStack>
                    <HStack gap={3}>
                      <Box flex="1">
                        <Text fontSize="xs" color="#94a3b8" mb={1}>Width</Text>
                        <Input
                          size="sm"
                          type="number"
                          value={selectedElementData.size.width}
                          onChange={(e) => handleElementUpdate(selectedElementData.id, { 
                            size: { ...selectedElementData.size, width: parseInt(e.target.value) || 0 }
                          })}
                          bg="#1e293b"
                          border="1px solid"
                          borderColor="#374151"
                          color="#f1f5f9"
                          _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                          borderRadius="6px"
                        />
                      </Box>
                      <Box flex="1">
                        <Text fontSize="xs" color="#94a3b8" mb={1}>Height</Text>
                        <Input
                          size="sm"
                          type="number"
                          value={selectedElementData.size.height}
                          onChange={(e) => handleElementUpdate(selectedElementData.id, { 
                            size: { ...selectedElementData.size, height: parseInt(e.target.value) || 0 }
                          })}
                          bg="#1e293b"
                          border="1px solid"
                          borderColor="#374151"
                          color="#f1f5f9"
                          _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                          borderRadius="6px"
                        />
                      </Box>
                    </HStack>
                  </VStack>
                </Box>

                <Box w="100%" h="1px" bg="#374151" />

                {/* 样式 */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
                    Appearance
                  </Text>
                  <VStack gap={3} align="stretch">
                    {/* 背景颜色设置 */}
                    {selectedElementData.type === 'background' ? (
                      <BackgroundEditor
                        elementData={selectedElementData}
                        onUpdate={(updates) => handleElementUpdate(selectedElementData.id, updates)}
                      />
                    ) : (
                      <Box>
                        <Text fontSize="xs" color="#94a3b8" mb={1}>Background Color</Text>
                        <HStack gap={2}>
                          <Input
                            size="sm"
                            value={selectedElementData.style.background || ''}
                            onChange={(e) => handleStyleUpdate('background', e.target.value)}
                            placeholder="rgba(0,0,0,0.5)"
                            bg="#1e293b"
                            border="1px solid"
                            borderColor="#374151"
                            color="#f1f5f9"
                            _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                            borderRadius="6px"
                            flex="1"
                          />
                          <Input
                            type="color"
                            value={selectedElementData.style.background?.replace(/[^\w]/g, '') || '#000000'}
                            onChange={(e) => handleStyleUpdate('background', e.target.value)}
                            size="sm"
                            w="50px"
                            h="32px"
                            p={0}
                            border="1px solid"
                            borderColor="#374151"
                            borderRadius="6px"
                            cursor="pointer"
                          />
                        </HStack>
                        {/* 预设背景颜色 */}
                        <HStack gap={1} mt={2}>
                          {['rgba(30, 41, 59, 0.9)', 'rgba(15, 23, 42, 0.95)', 'rgba(99, 102, 241, 0.2)', 'rgba(0, 0, 0, 0.5)', 'rgba(255, 255, 255, 0.1)'].map((bgColor) => (
                            <Box
                              key={bgColor}
                              w="20px"
                              h="20px"
                              bg={bgColor}
                              borderRadius="4px"
                              border="2px solid"
                              borderColor={selectedElementData.style.background === bgColor ? '#6366f1' : '#374151'}
                              cursor="pointer"
                              onClick={() => handleStyleUpdate('background', bgColor)}
                              _hover={{ borderColor: '#6366f1' }}
                            />
                          ))}
                        </HStack>
                      </Box>
                    )}

                    {/* 文字颜色设置 */}
                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Text Color</Text>
                      <HStack gap={2}>
                        <Input
                          size="sm"
                          value={selectedElementData.style.color || ''}
                          onChange={(e) => handleStyleUpdate('color', e.target.value)}
                          placeholder="#ffffff"
                          bg="#1e293b"
                          border="1px solid"
                          borderColor="#374151"
                          color="#f1f5f9"
                          _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                          borderRadius="6px"
                          flex="1"
                        />
                        <Input
                          type="color"
                          value={selectedElementData.style.color || '#ffffff'}
                          onChange={(e) => handleStyleUpdate('color', e.target.value)}
                          size="sm"
                          w="50px"
                          h="32px"
                          p={0}
                          border="1px solid"
                          borderColor="#374151"
                          borderRadius="6px"
                          cursor="pointer"
                        />
                      </HStack>
                      {/* 预设颜色 */}
                      <HStack gap={1} mt={2}>
                        {['#ffffff', '#000000', '#e2e8f0', '#1e293b', '#6366f1', '#ef4444', '#10b981', '#f59e0b'].map((color) => (
                          <Box
                            key={color}
                            w="20px"
                            h="20px"
                            bg={color}
                            borderRadius="4px"
                            border="2px solid"
                            borderColor={selectedElementData.style.color === color ? '#6366f1' : '#374151'}
                            cursor="pointer"
                            onClick={() => handleStyleUpdate('color', color)}
                            _hover={{ borderColor: '#6366f1' }}
                          />
                        ))}
                      </HStack>
                    </Box>

                    {/* 边框设置 */}
                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Border Color</Text>
                      <HStack gap={2}>
                        <Input
                          size="sm"
                          value={selectedElementData.style.borderColor || ''}
                          onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
                          placeholder="#374151"
                          bg="#1e293b"
                          border="1px solid"
                          borderColor="#374151"
                          color="#f1f5f9"
                          _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                          borderRadius="6px"
                          flex="1"
                        />
                        <Input
                          type="color"
                          value={selectedElementData.style.borderColor || '#374151'}
                          onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
                          size="sm"
                          w="50px"
                          h="32px"
                          p={0}
                          border="1px solid"
                          borderColor="#374151"
                          borderRadius="6px"
                          cursor="pointer"
                        />
                      </HStack>
                      {/* 预设边框颜色 */}
                      <HStack gap={1} mt={2}>
                        {['#374151', '#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff', '#000000'].map((color) => (
                          <Box
                            key={color}
                            w="20px"
                            h="20px"
                            bg={color}
                            borderRadius="4px"
                            border="2px solid"
                            borderColor={selectedElementData.style.borderColor === color ? '#6366f1' : '#374151'}
                            cursor="pointer"
                            onClick={() => handleStyleUpdate('borderColor', color)}
                            _hover={{ borderColor: '#6366f1' }}
                          />
                        ))}
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Border Width</Text>
                      <Input
                        size="sm"
                        value={selectedElementData.style.borderWidth || ''}
                        onChange={(e) => handleStyleUpdate('borderWidth', e.target.value)}
                        placeholder="e.g. 2px"
                        bg="#1e293b"
                        border="1px solid"
                        borderColor="#374151"
                        color="#f1f5f9"
                        _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                        borderRadius="6px"
                      />
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Border Style</Text>
                      <select
                        value={selectedElementData.style.borderStyle || 'solid'}
                        onChange={(e) => handleStyleUpdate('borderStyle', e.target.value)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #374151',
                          color: '#f1f5f9',
                          fontSize: '14px',
                          padding: '8px',
                          borderRadius: '6px',
                          width: '100%'
                        }}
                      >
                        <option value="none">None</option>
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                        <option value="double">Double</option>
                      </select>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Font Size</Text>
                      <Input
                        size="sm"
                        value={selectedElementData.style.fontSize || ''}
                        onChange={(e) => handleStyleUpdate('fontSize', e.target.value)}
                        placeholder="e.g. 16px"
                        bg="#1e293b"
                        border="1px solid"
                        borderColor="#374151"
                        color="#f1f5f9"
                        _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                        borderRadius="6px"
                      />
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Font Weight</Text>
                      <select
                        value={selectedElementData.style.fontWeight || 'normal'}
                        onChange={(e) => handleStyleUpdate('fontWeight', e.target.value)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #374151',
                          color: '#f1f5f9',
                          fontSize: '14px',
                          padding: '8px',
                          borderRadius: '6px',
                          width: '100%'
                        }}
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="lighter">Light</option>
                      </select>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Font Style</Text>
                      <select
                        value={selectedElementData.style.fontStyle || 'normal'}
                        onChange={(e) => handleStyleUpdate('fontStyle', e.target.value)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #374151',
                          color: '#f1f5f9',
                          fontSize: '14px',
                          padding: '8px',
                          borderRadius: '6px',
                          width: '100%'
                        }}
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                        <option value="oblique">Oblique</option>
                      </select>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>Text Align</Text>
                      <select
                        value={selectedElementData.style.textAlign || 'left'}
                        onChange={(e) => handleStyleUpdate('textAlign', e.target.value)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #374151',
                          color: '#f1f5f9',
                          fontSize: '14px',
                          padding: '8px',
                          borderRadius: '6px',
                          width: '100%'
                        }}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                        <option value="justify">Justify</option>
                      </select>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="#94a3b8" mb={1}>
                        Opacity: {Math.round((selectedElementData.style.opacity || 1) * 100)}%
                      </Text>
                      <Input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedElementData.style.opacity || 1}
                        onChange={(e) => handleStyleUpdate('opacity', parseFloat(e.target.value))}
                        bg="#1e293b"
                      />
                    </Box>
                  </VStack>
                </Box>

                {/* 内容编辑 */}
                {selectedElementData.content !== undefined && (
                  <>
                    <Box w="100%" h="1px" bg="#374151" />
                    <Box>
                      <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
                        Content
                      </Text>
                      <Textarea
                        size="sm"
                        value={selectedElementData.content}
                        onChange={(e) => handleElementUpdate(selectedElementData.id, { content: e.target.value })}
                        bg="#1e293b"
                        border="1px solid"
                        borderColor="#374151"
                        color="#f1f5f9"
                        _focus={{ borderColor: '#6366f1', bg: '#1e293b', boxShadow: '0 0 0 1px #6366f1' }}
                        placeholder="Enter content..."
                        rows={4}
                        borderRadius="6px"
                      />
                    </Box>
                  </>
                )}
              </VStack>
            </Box>
          ) : (
            <Box p={8} textAlign="center">
              <Text color="#6b7280" fontSize="sm">
                Select an element to edit its properties
              </Text>
            </Box>
          )}
        </Box>
      </Flex>

      {/* AI助手侧边面板 */}
      {activePanel === 'chat' && (
        <Box
          position="fixed"
          top="60px"
          right={0}
          w="400px"
          h="calc(100vh - 60px)"
          bg="#111318"
          borderLeft="1px solid"
          borderColor="#2d2e37"
          zIndex={1000}
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.6)"
        >
          <ChatAssistant
            projectId="demo"
            selectedElement={selectedElement || undefined}
            onExecuteCommand={handleExecuteCommand}
            onApplyEffect={handleApplyEffect}
          />
        </Box>
      )}

      {/* 特效面板 */}
      {activePanel === 'effects' && (
        <Box
          position="fixed"
          top="60px"
          right={0}
          w="350px"
          h="calc(100vh - 60px)"
          bg="#111318"
          borderLeft="1px solid"
          borderColor="#2d2e37"
          zIndex={1000}
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.6)"
        >
          <EffectsPanel
            onApplyEffect={handleApplyEffect}
            selectedElement={selectedElement || undefined}
          />
        </Box>
      )}


    </Box>
  );
};

export default TemplateEditor; 