import React from 'react';
import {
  Box,
  HStack,
  Button,
  Text
} from '@chakra-ui/react';

interface CanvasToolbarProps {
  onImportTemplate: () => void;
  onResetToDefault: () => void;
  onPreview: () => void;
  onTestChoices?: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onImportTemplate,
  onResetToDefault,
  onPreview,
  onTestChoices,
  zoom,
  onZoomChange,
  onFitToScreen,
  canvasSize,
  onCanvasSizeChange
}) => {
  return (
    <Box
      bg="rgba(0, 0, 0, 0.8)"
      borderBottom="1px solid"
      borderColor="#2d2e37"
      px={4}
      py={2}
      position="absolute"
      top="0"
      left="0"
      right="0"
      zIndex={15}
    >
      <HStack justify="space-between" align="center">
        {/* 左侧操作按钮 */}
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
            onClick={onImportTemplate}
          >
            Import Template
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
            onClick={onResetToDefault}
          >
            Reset to Default
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
            onClick={onPreview}
          >
            Preview
          </Button>
          {onTestChoices && (
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
              onClick={onTestChoices}
            >
              Test Choices
            </Button>
          )}
        </HStack>

        {/* 中间画布尺寸显示 */}
        <Box>
          <Text fontSize="sm" color="#94a3b8">
            Canvas: {canvasSize.width} × {canvasSize.height}
          </Text>
        </Box>

        {/* 右侧控制按钮 */}
        <HStack gap={2}>
          {/* 画布尺寸快速设置 */}
          <HStack gap={1}>
            <Button
              size="sm"
              variant="plain"
              color="#d1d5db"
              bg="transparent"
              _hover={{ bg: '#374151', color: 'white' }}
              fontWeight="500"
              px={2}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              onClick={() => onCanvasSizeChange({ width: 800, height: 600 })}
            >
              800×600
            </Button>
            <Button
              size="sm"
              variant="plain"
              color="#d1d5db"
              bg="transparent"
              _hover={{ bg: '#374151', color: 'white' }}
              fontWeight="500"
              px={2}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              onClick={() => onCanvasSizeChange({ width: 1024, height: 768 })}
            >
              1024×768
            </Button>
            <Button
              size="sm"
              variant="plain"
              color="#d1d5db"
              bg="transparent"
              _hover={{ bg: '#374151', color: 'white' }}
              fontWeight="500"
              px={2}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              onClick={() => onCanvasSizeChange({ width: 1920, height: 1080 })}
            >
              1920×1080
            </Button>
          </HStack>

          {/* 缩放控制 */}
          <HStack gap={1}>
            <Button
              size="sm"
              variant="plain"
              color="#d1d5db"
              bg="transparent"
              _hover={{ bg: '#374151', color: 'white' }}
              fontWeight="500"
              px={2}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
            >
              -
            </Button>
            <Text fontSize="sm" color="#d1d5db" px={2}>
              {Math.round(zoom * 100)}%
            </Text>
            <Button
              size="sm"
              variant="plain"
              color="#d1d5db"
              bg="transparent"
              _hover={{ bg: '#374151', color: 'white' }}
              fontWeight="500"
              px={2}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}
            >
              +
            </Button>
            <Button
              size="sm"
              variant="plain"
              color="#d1d5db"
              bg="transparent"
              _hover={{ bg: '#374151', color: 'white' }}
              fontWeight="500"
              px={2}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              onClick={onFitToScreen}
            >
              Fit
            </Button>
            <Button
              size="sm"
              variant="plain"
              color="#d1d5db"
              bg="transparent"
              _hover={{ bg: '#374151', color: 'white' }}
              fontWeight="500"
              px={2}
              py={2}
              borderRadius="md"
              transition="all 0.2s"
              onClick={() => onZoomChange(1)}
            >
              100%
            </Button>
          </HStack>
        </HStack>
      </HStack>
    </Box>
  );
};

export default CanvasToolbar; 