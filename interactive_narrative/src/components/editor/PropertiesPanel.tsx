import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Button
} from '@chakra-ui/react';
import { TemplateElement } from './types';
import BackgroundEditor from './BackgroundEditor';

interface PropertiesPanelProps {
  selectedElement: TemplateElement | null;
  onUpdate: (elementId: string, updates: Partial<TemplateElement>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedElement, onUpdate }) => {
  if (!selectedElement) {
    return (
      <Box p={8} textAlign="center">
        <Text color="#6b7280" fontSize="sm">
          Select an element to edit its properties
        </Text>
      </Box>
    );
  }

  const handleStyleUpdate = (property: string, value: any) => {
    onUpdate(selectedElement.id, {
      style: { ...selectedElement.style, [property]: value }
    });
  };

  const handlePositionUpdate = (axis: 'x' | 'y', value: number) => {
    onUpdate(selectedElement.id, {
      position: { ...selectedElement.position, [axis]: value }
    });
  };

  const handleSizeUpdate = (axis: 'width' | 'height', value: number) => {
    onUpdate(selectedElement.id, {
      size: { ...selectedElement.size, [axis]: value }
    });
  };

  return (
    <VStack gap={4} align="stretch" p={4}>
      {/* 元素信息 */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color="#e2e8f0" mb={3}>
          Element Properties
        </Text>
        <VStack gap={3} align="stretch">
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Type: {selectedElement.type}
            </Text>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              ID: {selectedElement.id}
            </Text>
          </Box>
        </VStack>
      </Box>

      {/* 位置调整 */}
      <Box>
        <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
          Transform
        </Text>
        <VStack gap={3} align="stretch">
          <HStack gap={2}>
            <Box flex={1}>
              <Text fontSize="xs" color="#94a3b8" mb={1}>
                X Position
              </Text>
              <Input
                type="number"
                size="sm"
                value={selectedElement.position.x}
                onChange={(e) => handlePositionUpdate('x', Number(e.target.value))}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="xs" color="#94a3b8" mb={1}>
                Y Position
              </Text>
              <Input
                type="number"
                size="sm"
                value={selectedElement.position.y}
                onChange={(e) => handlePositionUpdate('y', Number(e.target.value))}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
              />
            </Box>
          </HStack>
          <HStack gap={2}>
            <Box flex={1}>
              <Text fontSize="xs" color="#94a3b8" mb={1}>
                Width
              </Text>
              <Input
                type="number"
                size="sm"
                value={selectedElement.size.width}
                onChange={(e) => handleSizeUpdate('width', Number(e.target.value))}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="xs" color="#94a3b8" mb={1}>
                Height
              </Text>
              <Input
                type="number"
                size="sm"
                value={selectedElement.size.height}
                onChange={(e) => handleSizeUpdate('height', Number(e.target.value))}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
              />
            </Box>
          </HStack>
        </VStack>
      </Box>

      {/* 样式调整 */}
      <Box>
        <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
          Style
        </Text>
        <VStack gap={3} align="stretch">
          {/* 字体大小 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Font Size
            </Text>
            <Input
              size="sm"
              value={selectedElement.style.fontSize || '14px'}
              onChange={(e) => handleStyleUpdate('fontSize', e.target.value)}
              bg="#1e293b"
              border="1px solid"
              borderColor="#374151"
              color="#f1f5f9"
            />
          </Box>

          {/* 字体粗细 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Font Weight
            </Text>
            <HStack gap={2}>
              {['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((weight) => (
                <Button
                  key={weight}
                  size="xs"
                  variant={selectedElement.style.fontWeight === weight ? 'solid' : 'outline'}
                  onClick={() => handleStyleUpdate('fontWeight', weight)}
                  bg={selectedElement.style.fontWeight === weight ? '#6366f1' : 'transparent'}
                  color={selectedElement.style.fontWeight === weight ? 'white' : '#f1f5f9'}
                  border="1px solid"
                  borderColor="#374151"
                  _hover={{ bg: selectedElement.style.fontWeight === weight ? '#5855eb' : '#374151' }}
                >
                  {weight}
                </Button>
              ))}
            </HStack>
          </Box>

          {/* 字体样式 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Font Style
            </Text>
            <HStack gap={2}>
              {['normal', 'italic', 'oblique'].map((style) => (
                <Button
                  key={style}
                  size="xs"
                  variant={selectedElement.style.fontStyle === style ? 'solid' : 'outline'}
                  onClick={() => handleStyleUpdate('fontStyle', style)}
                  bg={selectedElement.style.fontStyle === style ? '#6366f1' : 'transparent'}
                  color={selectedElement.style.fontStyle === style ? 'white' : '#f1f5f9'}
                  border="1px solid"
                  borderColor="#374151"
                  _hover={{ bg: selectedElement.style.fontStyle === style ? '#5855eb' : '#374151' }}
                >
                  {style}
                </Button>
              ))}
            </HStack>
          </Box>

          {/* 文本对齐 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Text Align
            </Text>
            <HStack gap={2}>
              {['left', 'center', 'right', 'justify'].map((align) => (
                <Button
                  key={align}
                  size="xs"
                  variant={selectedElement.style.textAlign === align ? 'solid' : 'outline'}
                  onClick={() => handleStyleUpdate('textAlign', align)}
                  bg={selectedElement.style.textAlign === align ? '#6366f1' : 'transparent'}
                  color={selectedElement.style.textAlign === align ? 'white' : '#f1f5f9'}
                  border="1px solid"
                  borderColor="#374151"
                  _hover={{ bg: selectedElement.style.textAlign === align ? '#5855eb' : '#374151' }}
                >
                  {align}
                </Button>
              ))}
            </HStack>
          </Box>

          {/* 颜色设置 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Text Color
            </Text>
            <HStack gap={2}>
              <Input
                type="color"
                value={selectedElement.style.color || '#ffffff'}
                onChange={(e) => handleStyleUpdate('color', e.target.value)}
                size="sm"
                w="60px"
                h="32px"
                p={1}
                border="1px solid"
                borderColor="#374151"
                borderRadius="md"
              />
              <Input
                size="sm"
                value={selectedElement.style.color || '#ffffff'}
                onChange={(e) => handleStyleUpdate('color', e.target.value)}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
                flex={1}
              />
            </HStack>
          </Box>

          {/* 背景颜色 */}
          {selectedElement.type !== 'background' && (
            <Box>
              <Text fontSize="xs" color="#94a3b8" mb={1}>
                Background Color
              </Text>
              <HStack gap={2}>
                <Input
                  type="color"
                  value={selectedElement.style.background || '#000000'}
                  onChange={(e) => handleStyleUpdate('background', e.target.value)}
                  size="sm"
                  w="60px"
                  h="32px"
                  p={1}
                  border="1px solid"
                  borderColor="#374151"
                  borderRadius="md"
                />
                <Input
                  size="sm"
                  value={selectedElement.style.background || '#000000'}
                  onChange={(e) => handleStyleUpdate('background', e.target.value)}
                  bg="#1e293b"
                  border="1px solid"
                  borderColor="#374151"
                  color="#f1f5f9"
                  flex={1}
                />
              </HStack>
            </Box>
          )}

          {/* 透明度 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Opacity: {Math.round((selectedElement.style.opacity || 1) * 100)}%
            </Text>
            <Input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={selectedElement.style.opacity || 1}
              onChange={(e) => handleStyleUpdate('opacity', parseFloat(e.target.value))}
              bg="#1e293b"
            />
          </Box>
        </VStack>
      </Box>

      {/* 边框设置 */}
      <Box>
        <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
          Border
        </Text>
        <VStack gap={3} align="stretch">
          {/* 边框颜色 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Border Color
            </Text>
            <HStack gap={2}>
              <Input
                type="color"
                value={selectedElement.style.borderColor || '#000000'}
                onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
                size="sm"
                w="60px"
                h="32px"
                p={1}
                border="1px solid"
                borderColor="#374151"
                borderRadius="md"
              />
              <Input
                size="sm"
                value={selectedElement.style.borderColor || '#000000'}
                onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
                flex={1}
              />
            </HStack>
          </Box>

          {/* 边框宽度 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Border Width
            </Text>
            <Input
              size="sm"
              value={selectedElement.style.borderWidth || '0px'}
              onChange={(e) => handleStyleUpdate('borderWidth', e.target.value)}
              bg="#1e293b"
              border="1px solid"
              borderColor="#374151"
              color="#f1f5f9"
            />
          </Box>

          {/* 边框样式 */}
          <Box>
            <Text fontSize="xs" color="#94a3b8" mb={1}>
              Border Style
            </Text>
            <HStack gap={2}>
              {['none', 'solid', 'dashed', 'dotted', 'double'].map((style) => (
                <Button
                  key={style}
                  size="xs"
                  variant={selectedElement.style.borderStyle === style ? 'solid' : 'outline'}
                  onClick={() => handleStyleUpdate('borderStyle', style)}
                  bg={selectedElement.style.borderStyle === style ? '#6366f1' : 'transparent'}
                  color={selectedElement.style.borderStyle === style ? 'white' : '#f1f5f9'}
                  border="1px solid"
                  borderColor="#374151"
                  _hover={{ bg: selectedElement.style.borderStyle === style ? '#5855eb' : '#374151' }}
                >
                  {style}
                </Button>
              ))}
            </HStack>
          </Box>
        </VStack>
      </Box>

      {/* 背景编辑器（仅对背景元素） */}
      {selectedElement.type === 'background' && (
        <Box>
          <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
            Background Editor
          </Text>
          <BackgroundEditor
            elementData={selectedElement}
            onUpdate={(updates) => onUpdate(selectedElement.id, updates)}
          />
        </Box>
      )}

      {/* 内容编辑 */}
      {selectedElement.content !== undefined && (
        <>
          <Box w="100%" h="1px" bg="#374151" />
          <Box>
            <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={3}>
              Content
            </Text>
            <Textarea
              size="sm"
              value={selectedElement.content}
              onChange={(e) => onUpdate(selectedElement.id, { content: e.target.value })}
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
  );
};

export default PropertiesPanel; 