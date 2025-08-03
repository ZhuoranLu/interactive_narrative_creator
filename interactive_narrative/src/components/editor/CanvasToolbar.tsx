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
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onImportTemplate,
  onResetToDefault,
  zoom,
  onZoomChange,
  onFitToScreen,
  canvasSize,
  onCanvasSizeChange
}) => {
  const canvasSizes = [
    { width: 800, height: 600, label: '800×600 (4:3)' },
    { width: 1024, height: 768, label: '1024×768 (4:3)' },
    { width: 1280, height: 720, label: '1280×720 (16:9)' },
    { width: 1920, height: 1080, label: '1920×1080 (16:9)' },
    { width: 2560, height: 1440, label: '2560×1440 (16:9)' },
    { width: 3840, height: 2160, label: '3840×2160 (4K)' },
    { width: 640, height: 480, label: '640×480 (4:3)' },
    { width: 320, height: 240, label: '320×240 (4:3)' }
  ];

  const selectStyle = {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #374151',
    borderRadius: '4px',
    color: '#f1f5f9',
    outline: 'none',
    transition: 'all 0.2s',
    cursor: 'pointer',
    minWidth: '120px'
  };

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
        </HStack>

        {/* 中间画布尺寸显示 */}
        <Box>
          <Text fontSize="sm" color="#94a3b8">
            Canvas: {canvasSize.width} × {canvasSize.height}
          </Text>
        </Box>

        {/* 右侧控制按钮 */}
        <HStack gap={2}>
          {/* 画布尺寸下拉选择 */}
          <Box>
            <select
              style={selectStyle}
              value={`${canvasSize.width}×${canvasSize.height}`}
              onChange={(e) => {
                const [width, height] = e.target.value.split('×').map(Number);
                onCanvasSizeChange({ width, height });
              }}
            >
              {canvasSizes.map((size) => (
                <option key={`${size.width}×${size.height}`} value={`${size.width}×${size.height}`}>
                  {size.label}
                </option>
              ))}
            </select>
          </Box>

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