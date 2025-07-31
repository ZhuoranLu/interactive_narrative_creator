import React, { useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Input,
  Button
} from '@chakra-ui/react';
import { TemplateElement } from './types';
import CanvasToolbar from './CanvasToolbar';

interface CanvasProps {
  elements: TemplateElement[];
  selectedElement: string | null;
  zoom: number;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
  onElementClick: (elementId: string) => void;
  onMouseDown: (e: React.MouseEvent, elementId: string) => void;
  onResizeStart: (e: React.MouseEvent, elementId: string, handle: string) => void;
  elementRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  onImportTemplate: () => void;
  onResetToDefault: () => void;
  onPreview: () => void;
  onTestChoices?: () => void;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedElement,
  zoom,
  canvasSize,
  onCanvasSizeChange,
  onElementClick,
  onMouseDown,
  onResizeStart,
  elementRefs,
  onImportTemplate,
  onResetToDefault,
  onPreview,
  onTestChoices,
  onZoomChange,
  onFitToScreen,
  canvasRef
}) => {

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



  // 计算内容缩放比例
  const getContentScale = () => {
    const scaleX = 800 / canvasSize.width;
    const scaleY = 600 / canvasSize.height;
    return Math.min(scaleX, scaleY, 1); // 不超过1，避免放大
  };

  const contentScale = getContentScale();

  return (
    <Box
      ref={canvasRef}
      flex="1"
      bg="#0f172a"
      position="relative"
      overflow="auto"
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="calc(100vh - 120px)"
    >
      {/* 画布工具栏 */}
      <CanvasToolbar
        onImportTemplate={onImportTemplate}
        onResetToDefault={onResetToDefault}
        onPreview={onPreview}
        onTestChoices={onTestChoices}
        zoom={zoom}
        onZoomChange={onZoomChange}
        onFitToScreen={onFitToScreen}
        canvasSize={canvasSize}
        onCanvasSizeChange={onCanvasSizeChange}
      />


      {/* 画布容器 - 固定大小 */}
      <Box
        position="relative"
        w="800px"
        h="600px"
        bg="transparent"
        transform={`scale(${zoom})`}
        transformOrigin="center center"
        style={{
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid #374151',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* 内容区域 - 可调整大小 */}
        <Box
          data-canvas-content
          position="relative"
          w={`${canvasSize.width}px`}
          h={`${canvasSize.height}px`}
          bg="transparent"
          style={{
            transformOrigin: 'center',
            transform: `scale(${contentScale})`,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          {/* 背景元素 - 强制左上角对齐 */}
          {elements.filter(element => element.type === 'background').map((element) => (
            <Box
              key={element.id}
              ref={(el: HTMLDivElement | null) => (elementRefs.current[element.id] = el)}
              position="absolute"
              left={`${element.position.x}px`}
              top={`${element.position.y}px`}
              width={`${element.size.width}px`}
              height={`${element.size.height}px`}
              style={{
                ...element.style,
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                boxSizing: 'border-box',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                textAlign: (element.style.textAlign as any) || 'left'
              }}
              onClick={() => onElementClick(element.id)}
              onMouseDown={(e) => onMouseDown(e, element.id)}
            >
              {/* 元素内容 */}
              <Text
                fontSize="inherit"
                fontWeight="inherit"
                color="inherit"
                textAlign="inherit"
                style={{ fontStyle: element.style.fontStyle }}
              >
                {element.content || `${getElementTypeName(element.type)}`}
              </Text>

              {/* 选择框 */}
              {selectedElement === element.id && (
                <Box
                  position="absolute"
                  top="-2px"
                  left="-2px"
                  right="-2px"
                  bottom="-2px"
                  border="2px solid #6366f1"
                  borderRadius="4px"
                  pointerEvents="none"
                  zIndex={10}
                >
                  {/* 调整大小的手柄 */}
                  <Box
                    position="absolute"
                    top="-4px"
                    left="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="nw-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'nw')}
                  />
                  <Box
                    position="absolute"
                    top="-4px"
                    right="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="ne-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'ne')}
                  />
                  <Box
                    position="absolute"
                    bottom="-4px"
                    left="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="sw-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'sw')}
                  />
                  <Box
                    position="absolute"
                    bottom="-4px"
                    right="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="se-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'se')}
                  />
                </Box>
              )}

              {/* 元素类型标签 */}
              <Box
                position="absolute"
                top="-20px"
                left="0"
                bg="rgba(0, 0, 0, 0.8)"
                color="white"
                px={2}
                py={1}
                borderRadius="4px"
                fontSize="10px"
                opacity={selectedElement === element.id ? 1 : 0}
                transition="opacity 0.2s"
                pointerEvents="none"
              >
                {getElementIcon(element.type)} {getElementTypeName(element.type)}
              </Box>
            </Box>
          ))}

          {/* 其他元素 */}
          {elements.filter(element => element.type !== 'background').map((element) => (
            <Box
              key={element.id}
              ref={(el: HTMLDivElement | null) => (elementRefs.current[element.id] = el)}
              position="absolute"
              left={`${element.position.x}px`}
              top={`${element.position.y}px`}
              width={`${element.size.width}px`}
              height={`${element.size.height}px`}
              style={{
                ...element.style,
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                boxSizing: 'border-box',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                textAlign: (element.style.textAlign as any) || 'left'
              }}
              onClick={() => onElementClick(element.id)}
              onMouseDown={(e) => onMouseDown(e, element.id)}
            >
              {/* 元素内容 */}
              <Text
                fontSize="inherit"
                fontWeight="inherit"
                color="inherit"
                textAlign="inherit"
                style={{ fontStyle: element.style.fontStyle }}
              >
                {element.content || `${getElementTypeName(element.type)}`}
              </Text>

              {/* 选择框 */}
              {selectedElement === element.id && (
                <Box
                  position="absolute"
                  top="-2px"
                  left="-2px"
                  right="-2px"
                  bottom="-2px"
                  border="2px solid #6366f1"
                  borderRadius="4px"
                  pointerEvents="none"
                  zIndex={10}
                >
                  {/* 调整大小的手柄 */}
                  <Box
                    position="absolute"
                    top="-4px"
                    left="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="nw-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'nw')}
                  />
                  <Box
                    position="absolute"
                    top="-4px"
                    right="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="ne-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'ne')}
                  />
                  <Box
                    position="absolute"
                    bottom="-4px"
                    left="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="sw-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'sw')}
                  />
                  <Box
                    position="absolute"
                    bottom="-4px"
                    right="-4px"
                    width="8px"
                    height="8px"
                    bg="#6366f1"
                    borderRadius="50%"
                    cursor="se-resize"
                    onMouseDown={(e) => onResizeStart(e, element.id, 'se')}
                  />
                </Box>
              )}

              {/* 元素类型标签 */}
              <Box
                position="absolute"
                top="-20px"
                left="0"
                bg="rgba(0, 0, 0, 0.8)"
                color="white"
                px={2}
                py={1}
                borderRadius="4px"
                fontSize="10px"
                opacity={selectedElement === element.id ? 1 : 0}
                transition="opacity 0.2s"
                pointerEvents="none"
              >
                {getElementIcon(element.type)} {getElementTypeName(element.type)}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 缩放指示器 */}
      <Box
        position="absolute"
        bottom="20px"
        right="20px"
        bg="rgba(0, 0, 0, 0.8)"
        color="white"
        px={3}
        py={2}
        borderRadius="8px"
        fontSize="sm"
      >
        <VStack gap={1} align="start">
          <Text fontSize="xs">View Zoom: {Math.round(zoom * 100)}%</Text>
          <Text fontSize="xs">Content Scale: {Math.round(contentScale * 100)}%</Text>
        </VStack>
      </Box>
    </Box>
  );
};

export default Canvas; 