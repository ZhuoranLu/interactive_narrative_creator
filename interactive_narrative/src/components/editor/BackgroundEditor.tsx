import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Grid
} from '@chakra-ui/react';
import { TemplateElement } from './types';

interface BackgroundEditorProps {
  elementData: TemplateElement;
  onUpdate: (updates: Partial<TemplateElement>) => void;
}

const BackgroundEditor: React.FC<BackgroundEditorProps> = ({ elementData, onUpdate }) => {
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
    onUpdate({ style: { ...elementData.style, background } });
  };

  const applyPreset = (preset: typeof colorPresets[0]) => {
    setColor1(preset.color1);
    setColor2(preset.color2);
    const background = `linear-gradient(${angle}deg, ${preset.color1} 0%, ${preset.color2} 100%)`;
    onUpdate({ style: { ...elementData.style, background } });
  };

  return (
    <VStack gap={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
          Background Type
        </Text>
        <HStack gap={2}>
          <Button
            size="sm"
            variant={bgType === 'gradient' ? 'solid' : 'outline'}
            onClick={() => setBgType('gradient')}
            bg={bgType === 'gradient' ? '#6366f1' : 'transparent'}
            color={bgType === 'gradient' ? 'white' : '#f1f5f9'}
            border="1px solid"
            borderColor="#374151"
            _hover={{ bg: bgType === 'gradient' ? '#5855eb' : '#374151' }}
          >
            Gradient
          </Button>
          <Button
            size="sm"
            variant={bgType === 'solid' ? 'solid' : 'outline'}
            onClick={() => setBgType('solid')}
            bg={bgType === 'solid' ? '#6366f1' : 'transparent'}
            color={bgType === 'solid' ? 'white' : '#f1f5f9'}
            border="1px solid"
            borderColor="#374151"
            _hover={{ bg: bgType === 'solid' ? '#5855eb' : '#374151' }}
          >
            Solid
          </Button>
        </HStack>
      </Box>

      {bgType === 'gradient' ? (
        <>
          <Box>
            <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
              Gradient Colors
            </Text>
            <HStack gap={2}>
              <Input
                type="color"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
                size="sm"
                w="60px"
                h="40px"
                p={1}
                border="1px solid"
                borderColor="#374151"
                borderRadius="md"
              />
              <Input
                type="color"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
                size="sm"
                w="60px"
                h="40px"
                p={1}
                border="1px solid"
                borderColor="#374151"
                borderRadius="md"
              />
            </HStack>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
              Gradient Angle: {angle}°
            </Text>
            <HStack gap={2}>
              <Button
                size="sm"
                onClick={() => setAngle(Math.max(0, angle - 15))}
                bg="#1e293b"
                color="#f1f5f9"
                border="1px solid"
                borderColor="#374151"
                _hover={{ bg: '#374151' }}
              >
                -15°
              </Button>
              <Input
                type="number"
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                min={0}
                max={360}
                size="sm"
                bg="#1e293b"
                border="1px solid"
                borderColor="#374151"
                color="#f1f5f9"
                textAlign="center"
              />
              <Button
                size="sm"
                onClick={() => setAngle(Math.min(360, angle + 15))}
                bg="#1e293b"
                color="#f1f5f9"
                border="1px solid"
                borderColor="#374151"
                _hover={{ bg: '#374151' }}
              >
                +15°
              </Button>
            </HStack>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
              Color Presets
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={2}>
              {colorPresets.map((preset) => (
                <Button
                  key={preset.name}
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset(preset)}
                  bg="#1e293b"
                  border="1px solid"
                  borderColor="#374151"
                  color="#f1f5f9"
                  _hover={{ bg: '#374151', borderColor: '#6366f1' }}
                >
                  {preset.name}
                </Button>
              ))}
            </Grid>
          </Box>
        </>
      ) : (
        <Box>
          <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
            Solid Color
          </Text>
          <Input
            type="color"
            value={solidColor}
            onChange={(e) => setSolidColor(e.target.value)}
            size="sm"
            w="100%"
            h="40px"
            p={1}
            border="1px solid"
            borderColor="#374151"
            borderRadius="md"
          />
        </Box>
      )}

      <Button
        size="sm"
        onClick={updateBackground}
        bg="#6366f1"
        color="white"
        _hover={{ bg: '#5855eb' }}
      >
        Apply Background
      </Button>
    </VStack>
  );
};

export default BackgroundEditor; 