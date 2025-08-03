import React from 'react';
import {
  Box,
  HStack,
  Button,
  Text
} from '@chakra-ui/react';

interface ToolbarProps {
  currentTemplate: string;
  onToggleAIAssistant: () => void;
  onToggleEffects: () => void;
  activePanel: 'chat' | 'effects' | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTemplate,
  onToggleAIAssistant,
  onToggleEffects,
  activePanel,
  zoom,
  onZoomChange,
  onFitToScreen,
  canvasSize,
  onCanvasSizeChange
}) => {

  return (
    <Box
      bg="#111318"
      borderBottom="1px solid"
      borderColor="#2d2e37"
      px={4}
      py={2}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <HStack justify="space-between" align="center">
        {/* 左侧按钮组 */}
        <HStack gap={2}>
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

        {/* 中间状态显示 */}
        <Box>
          <Text fontSize="sm" color="#6b7280">
            Template: {currentTemplate}
          </Text>
        </Box>

        {/* 右侧操作按钮 */}
        <HStack gap={2}>
          <Button
            size="sm"
            variant={activePanel === 'chat' ? 'solid' : 'plain'}
            color={activePanel === 'chat' ? 'white' : '#d1d5db'}
            bg={activePanel === 'chat' ? '#6366f1' : 'transparent'}
            _hover={{ bg: activePanel === 'chat' ? '#5855eb' : '#374151', color: 'white' }}
            fontWeight="500"
            px={3}
            py={2}
            borderRadius="md"
            transition="all 0.2s"
            onClick={onToggleAIAssistant}
          >
            AI Assistant
          </Button>
          <Button
            size="sm"
            variant={activePanel === 'effects' ? 'solid' : 'plain'}
            color={activePanel === 'effects' ? 'white' : '#d1d5db'}
            bg={activePanel === 'effects' ? '#6366f1' : 'transparent'}
            _hover={{ bg: activePanel === 'effects' ? '#5855eb' : '#374151', color: 'white' }}
            fontWeight="500"
            px={3}
            py={2}
            borderRadius="md"
            transition="all 0.2s"
            onClick={onToggleEffects}
          >
            Effects
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
};

export default Toolbar; 