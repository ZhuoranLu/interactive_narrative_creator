import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import { TemplateElement, GameTemplate } from './editor/types';

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  content: string;
  speaker?: string;
  duration: number;
  order: number;
  sceneId?: string;
  choices?: any[];
}
import Toolbar from './editor/Toolbar';
import Canvas from './editor/Canvas';
import PropertiesPanel from './editor/PropertiesPanel';
import SceneManager from './editor/SceneManager';
import ChatAssistant from './editor/ChatAssistant';
import EffectsPanel from './editor/EffectsPanel';
import Timeline from './editor/Timeline';

const TemplateEditorRefactored: React.FC = () => {
  // 状态管理
  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'chat' | 'effects' | null>(null);
  const [leftTab, setLeftTab] = useState<'layers' | 'assets' | 'timeline' | 'materials'>('layers');
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentTemplate, setCurrentTemplate] = useState<string>('default');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  // 保存基础画布尺寸（800x600）下的原始元素位置
  const [baseElements, setBaseElements] = useState<TemplateElement[]>([]);

  // 处理画布尺寸变化
  const handleCanvasSizeChange = (newSize: { width: number; height: number }) => {
    console.log('Canvas size changing from:', canvasSize, 'to:', newSize);
    
    // 避免重复调用
    if (canvasSize.width === newSize.width && canvasSize.height === newSize.height) {
      console.log('Canvas size unchanged, skipping update');
      return;
    }
    
    setCanvasSize(newSize);
    
    // 强制更新背景元素到左上角(0,0)并覆盖整个画布
    setElements(prev => {
      const updated = prev.map(element => {
        if (element.type === 'background') {
          console.log('Forcing background to align at (0,0) with size:', newSize);
          const updatedElement = {
            ...element,
            position: { x: 0, y: 0 }, // 强制左上角对齐
            size: { width: newSize.width, height: newSize.height } // 强制覆盖整个画布
          };
          console.log('Updated background element:', updatedElement);
          return updatedElement;
        }
        return element; // 其他元素保持不变
      });
      console.log('Updated elements count:', updated.length);
      return updated;
    });
  };
  
  // 节点管理状态
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameTemplate | null>(null);
  const [sceneTemplates, setSceneTemplates] = useState<Record<string, TemplateElement[]>>({});
  
  const toast = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 默认模板
  const getDefaultTemplate = (size: { width: number; height: number }): TemplateElement[] => [
    {
      id: 'background',
      type: 'background',
      position: { x: 0, y: 0 },
      size: { width: size.width, height: size.height },
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

  // 初始化默认模板 - 只在组件挂载时执行一次
  useEffect(() => {
    const defaultElements = getDefaultTemplate(canvasSize);
    setElements(defaultElements);
    setBaseElements(defaultElements); // 同时设置为基础元素
  }, []); // 移除canvasSize依赖

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
            size: { width: canvasSize.width, height: canvasSize.height },
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
              fontSize: '12px',
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
        description: `Imported ${importedGameData.game_scenes.length} scenes successfully`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to import template:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import game template',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  // 重置到默认模板
  const resetToDefault = () => {
    const defaultElements = getDefaultTemplate(canvasSize);
    setElements(defaultElements);
    setBaseElements(defaultElements); // 更新基础元素
    setCurrentTemplate('default');
    setSelectedElement(null);
    setCurrentSceneId(null);
    setGameData(null);
    setSceneTemplates({});
    setTimelineEvents([]);
  };

  // 元素点击处理
  const handleElementClick = (elementId: string) => {
    setSelectedElement(elementId);
  };

  // 鼠标事件处理
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string>('');

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    // 获取画布的实际位置和缩放信息
    const canvasContainer = canvasRef.current;
    if (!canvasContainer) return;
    
    const canvasElement = canvasContainer.querySelector('[data-canvas-content]') as HTMLElement;
    if (!canvasElement) return;
    
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // 计算相对于画布内容的坐标
    const contentScale = Math.min(800 / canvasSize.width, 600 / canvasSize.height, 1);
    const scaledCanvasWidth = canvasSize.width * contentScale;
    const scaledCanvasHeight = canvasSize.height * contentScale;
    
    // 计算画布内容在容器中的偏移
    const canvasOffsetX = (800 - scaledCanvasWidth) / 2;
    const canvasOffsetY = (600 - scaledCanvasHeight) / 2;
    
    // 计算鼠标在画布内容坐标系中的位置
    const mouseX = (e.clientX - canvasRect.left - canvasOffsetX) / contentScale;
    const mouseY = (e.clientY - canvasRect.top - canvasOffsetY) / contentScale;
    
    const offsetX = mouseX - element.position.x;
    const offsetY = mouseY - element.position.y;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string, handle: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    setResizeHandle(handle);
    setIsResizing(true);
  };

  // 全局鼠标事件
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const selectedElementData = elements.find(el => el.id === selectedElement);
      if (!selectedElementData) return;

      if (isDragging) {
        // 背景元素可以拖动，但会自动重置到(0,0)位置
        if (selectedElementData.type === 'background') {
          // 背景元素拖动后自动重置到左上角
          setElements(prev => prev.map(el => 
            el.id === selectedElement 
              ? { ...el, position: { x: 0, y: 0 } }
              : el
          ));
          return;
        }
        
        // 获取画布的实际位置和缩放信息
        const canvasContainer = canvasRef.current;
        if (!canvasContainer) return;
        
        const canvasElement = canvasContainer.querySelector('[data-canvas-content]') as HTMLElement;
        if (!canvasElement) return;
        
        const canvasRect = canvasElement.getBoundingClientRect();
        
        // 计算相对于画布内容的坐标
        const contentScale = Math.min(800 / canvasSize.width, 600 / canvasSize.height, 1);
        const scaledCanvasWidth = canvasSize.width * contentScale;
        const scaledCanvasHeight = canvasSize.height * contentScale;
        
        // 计算画布内容在容器中的偏移
        const canvasOffsetX = (800 - scaledCanvasWidth) / 2;
        const canvasOffsetY = (600 - scaledCanvasHeight) / 2;
        
        // 计算鼠标在画布内容坐标系中的位置
        const mouseX = (e.clientX - canvasRect.left - canvasOffsetX) / contentScale;
        const mouseY = (e.clientY - canvasRect.top - canvasOffsetY) / contentScale;
        
        const newX = mouseX - dragOffset.x;
        const newY = mouseY - dragOffset.y;
        
        // 边界检查 - 使用动态画布尺寸
        const maxX = canvasSize.width - selectedElementData.size.width;
        const maxY = canvasSize.height - selectedElementData.size.height;
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));

        setElements(prev => prev.map(el => 
          el.id === selectedElement 
            ? { ...el, position: { x: clampedX, y: clampedY } }
            : el
        ));
      }

      if (isResizing) {
        // 背景元素可以调整大小，但会自动重置为画布尺寸
        if (selectedElementData.type === 'background') {
          console.log('Background element resize - resetting to canvas size');
          setElements(prev => prev.map(el => 
            el.id === selectedElement 
              ? { 
                  ...el, 
                  position: { x: 0, y: 0 },
                  size: { width: canvasSize.width, height: canvasSize.height }
                }
              : el
          ));
          return;
        }
        
        // 获取画布的实际位置和缩放信息
        const canvasContainer = canvasRef.current;
        if (!canvasContainer) return;
        
        const containerRect = canvasContainer.getBoundingClientRect();
        const canvasElement = canvasContainer.querySelector('[data-canvas-content]') as HTMLElement;
        if (!canvasElement) return;
        
        const canvasRect = canvasElement.getBoundingClientRect();
        
        // 计算相对于画布内容的坐标
        const contentScale = Math.min(800 / canvasSize.width, 600 / canvasSize.height, 1);
        const scaledCanvasWidth = canvasSize.width * contentScale;
        const scaledCanvasHeight = canvasSize.height * contentScale;
        
        // 计算画布内容在容器中的偏移
        const canvasOffsetX = (800 - scaledCanvasWidth) / 2;
        const canvasOffsetY = (600 - scaledCanvasHeight) / 2;
        
        // 计算鼠标在画布内容坐标系中的位置
        const mouseX = (e.clientX - canvasRect.left - canvasOffsetX) / contentScale;
        const mouseY = (e.clientY - canvasRect.top - canvasOffsetY) / contentScale;
        
        let newWidth = selectedElementData.size.width;
        let newHeight = selectedElementData.size.height;
        let newX = selectedElementData.position.x;
        let newY = selectedElementData.position.y;

        // 根据手柄调整大小
        if (resizeHandle.includes('e')) {
          newWidth = Math.max(50, mouseX - selectedElementData.position.x);
        }
        if (resizeHandle.includes('w')) {
          const deltaX = selectedElementData.position.x - mouseX;
          newWidth = Math.max(50, selectedElementData.size.width + deltaX);
          newX = Math.min(mouseX, selectedElementData.position.x + selectedElementData.size.width - 50);
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(50, mouseY - selectedElementData.position.y);
        }
        if (resizeHandle.includes('n')) {
          const deltaY = selectedElementData.position.y - mouseY;
          newHeight = Math.max(50, selectedElementData.size.height + deltaY);
          newY = Math.min(mouseY, selectedElementData.position.y + selectedElementData.size.height - 50);
        }

        // 边界检查 - 确保元素不会超出画布
        const maxX = canvasSize.width - newWidth;
        const maxY = canvasSize.height - newHeight;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        setElements(prev => prev.map(el => 
          el.id === selectedElement 
            ? { 
                ...el, 
                position: { x: newX, y: newY },
                size: { width: newWidth, height: newHeight }
              }
            : el
        ));
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, selectedElement, elements, zoom, dragOffset, resizeHandle, canvasSize]);

  // 元素更新处理
  const handleElementUpdate = (elementId: string, updates: Partial<TemplateElement>) => {
    setElements(prev => prev.map(el => {
      if (el.id === elementId) {
        // 如果是背景元素，确保位置和大小正确
        if (el.type === 'background') {
          return {
            ...el,
            ...updates,
            position: { x: 0, y: 0 }, // 背景始终在(0,0)
            size: { width: canvasSize.width, height: canvasSize.height } // 背景始终覆盖整个画布
          };
        }
        return { ...el, ...updates };
      }
      return el;
    }));
  };

  // 控制选择按钮显示/隐藏
  const toggleChoiceButtons = (show: boolean) => {
    console.log('Toggling choice buttons:', show);
    setElements(prev => {
      const choiceButtons = prev.filter(el => el.type === 'choice-button');
      console.log('Found choice buttons:', choiceButtons.length);
      
      return prev.map(element => {
        if (element.type === 'choice-button') {
          console.log('Updating choice button:', element.id, 'opacity to:', show ? 0.9 : 0);
          return {
            ...element,
            style: {
              ...element.style,
              opacity: show ? 0.9 : 0
            }
          };
        }
        return element;
      });
    });
  };

  // 添加一个测试函数来手动显示选择按钮
  const testShowChoices = () => {
    console.log('Testing show choices...');
    toggleChoiceButtons(true);
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
    const events: TimelineEvent[] = [];
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

  // 时间轴事件处理
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    
    const selectedEvent = timelineEvents.find(event => event.id === eventId);
    if (selectedEvent) {
      let targetElementId = null;
      
      switch (selectedEvent.type) {
        case 'scene':
          targetElementId = 'scene-title';
          break;
        case 'dialogue':
        case 'narration':
          toggleChoiceButtons(false);
          targetElementId = 'dialogue-box';
          break;
        case 'choices':
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
          return;
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
      
      toast({
        title: 'Event Selected',
        description: `${selectedEvent.title}`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const handleEventReorder = (events: TimelineEvent[]) => {
    setTimelineEvents(events);
  };

  // 其他处理函数
  const handleExecuteCommand = (command: any) => {
    console.log('Executing command:', command);
    toast({
      title: 'Command Executed',
      description: 'AI command executed successfully',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleApplyEffect = (effectType: string, config: any = {}) => {
    console.log('Applying effect:', effectType, config);
    toast({
      title: 'Effect Applied',
      description: `${effectType} effect applied successfully`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handlePreview = () => {
    toast({
      title: 'Preview',
      description: 'Preview functionality coming soon',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleFitToScreen = () => {
    setZoom(1);
  };

  // 切换AI Assistant面板
  const handleToggleAIAssistant = () => {
    setActivePanel(activePanel === 'chat' ? null : 'chat');
  };

  // 切换Effects面板
  const handleToggleEffects = () => {
    setActivePanel(activePanel === 'effects' ? null : 'effects');
  };

  const selectedElementData = selectedElement ? elements.find(el => el.id === selectedElement) : null;

  return (
    <Box bg="#111318" minH="100vh">
      {/* 工具栏 */}
      <Toolbar
        currentTemplate={currentTemplate}
        onImportTemplate={importGameTemplate}
        onResetToDefault={resetToDefault}
        onPreview={handlePreview}
        onTestChoices={testShowChoices}
        onToggleAIAssistant={handleToggleAIAssistant}
        onToggleEffects={handleToggleEffects}
        activePanel={activePanel}
        zoom={zoom}
        onZoomChange={setZoom}
        onFitToScreen={handleFitToScreen}
        canvasSize={canvasSize}
        onCanvasSizeChange={handleCanvasSizeChange}
      />

      <Flex>
        {/* 左侧面板 */}
        <Box
          w="300px"
          bg="#1e293b"
          borderRight="1px solid"
          borderColor="#374151"
          h="calc(100vh - 60px)"
          overflowY="auto"
        >
          {/* 标签页 */}
          <HStack gap={0} borderBottom="1px solid" borderColor="#374151">
            {(['layers', 'assets', 'timeline', 'materials'] as const).map((tab) => (
              <Button
                key={tab}
                flex="1"
                variant="plain"
                size="sm"
                fontWeight={leftTab === tab ? '600' : '400'}
                color={leftTab === tab ? '#a5b4fc' : '#6b7280'}
                bg={leftTab === tab ? '#312e81' : 'transparent'}
                borderRadius="0"
                onClick={() => setLeftTab(tab)}
                py={3}
                _hover={{ bg: leftTab === tab ? '#312e81' : '#2d2e37' }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </HStack>

          {/* 标签页内容 */}
          <Box p={4}>
            {leftTab === 'layers' ? (
              <VStack gap={3} align="stretch">
                {elements.map((element) => (
                  <Button
                    key={element.id}
                    size="sm"
                    variant="plain"
                    color={selectedElement === element.id ? '#a5b4fc' : '#d1d5db'}
                    bg={selectedElement === element.id ? '#312e81' : 'transparent'}
                    _hover={{ bg: selectedElement === element.id ? '#312e81' : '#374151' }}
                    onClick={() => setSelectedElement(element.id)}
                    justifyContent="flex-start"
                    textAlign="left"
                    px={3}
                    py={2}
                    borderRadius="md"
                    transition="all 0.2s"
                  >
                    <HStack gap={2} align="center">
                      <Text fontSize="sm">
                        {element.type === 'background' && '🖼️'}
                        {element.type === 'dialogue' && '💬'}
                        {element.type === 'character' && '👤'}
                        {element.type === 'text' && '📝'}
                        {element.type === 'choice-button' && '🔘'}
                        {element.type === 'choices' && '⚡'}
                      </Text>
                      <VStack align="start" gap={0} flex={1}>
                        <Text fontSize="sm" fontWeight="500">
                          {element.id}
                        </Text>
                        <Text fontSize="xs" color="#94a3b8">
                          {element.type}
                        </Text>
                      </VStack>
                    </HStack>
                  </Button>
                ))}
              </VStack>
            ) : leftTab === 'assets' ? (
              <VStack gap={3} align="stretch">
                <Text fontSize="sm" color="#6b7280">
                  Assets panel coming soon...
                </Text>
              </VStack>
            ) : leftTab === 'timeline' ? (
              <Timeline
                events={timelineEvents}
                onEventReorder={handleEventReorder}
                onEventSelect={handleEventSelect}
                selectedEventId={selectedEventId || undefined}
              />
            ) : leftTab === 'materials' ? (
              <SceneManager
                gameData={gameData}
                currentSceneId={currentSceneId}
                onSwitchScene={switchToScene}
              />
            ) : null}
          </Box>
        </Box>

        {/* 主画布区域 */}
        <Box flex="1" position="relative">
          <Canvas
            elements={elements}
            selectedElement={selectedElement}
            zoom={zoom}
            canvasSize={canvasSize}
            onCanvasSizeChange={handleCanvasSizeChange}
            onElementClick={handleElementClick}
            onMouseDown={handleMouseDown}
            onResizeStart={handleResizeStart}
            elementRefs={elementRefs}
            onImportTemplate={importGameTemplate}
            onResetToDefault={resetToDefault}
            onPreview={handlePreview}
            onTestChoices={testShowChoices}
            onZoomChange={setZoom}
            onFitToScreen={handleFitToScreen}
            canvasRef={canvasRef}
          />
        </Box>

        {/* 右侧属性面板 */}
        <Box
          w="350px"
          bg="#1e293b"
          borderLeft="1px solid"
          borderColor="#374151"
          h="calc(100vh - 60px)"
          overflowY="auto"
        >
                  <PropertiesPanel
          selectedElement={selectedElementData || null}
          onUpdate={handleElementUpdate}
        />
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

export default TemplateEditorRefactored; 