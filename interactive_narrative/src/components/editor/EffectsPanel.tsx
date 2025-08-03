import React from 'react';
import { Box, Text, Button, VStack, HStack } from '@chakra-ui/react';

interface Effect {
  type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface EffectsPanelProps {
  onApplyEffect: (effectType: string, config?: any) => void;
  selectedElement?: string;
}

const EffectsPanel: React.FC<EffectsPanelProps> = ({ 
  onApplyEffect, 
  selectedElement 
}) => {
  const effects: Effect[] = [
    {
      type: 'bloodDrop',
      name: 'Blood Drop',
      description: 'Realistic blood drop animation',
      icon: '🩸',
      color: '#EF4444'
    },
    {
      type: 'particles',
      name: 'Particle System',
      description: 'Dynamic particle background',
      icon: '✨',
      color: '#F59E0B'
    },
    {
      type: 'glow',
      name: 'Glow Effect',
      description: 'Soft glowing border',
      icon: '💫',
      color: '#06B6D4'
    },
    {
      type: 'ripple',
      name: 'Ripple Effect',
      description: 'Water ripple on click',
      icon: '🌊',
      color: '#3B82F6'
    },
    {
      type: 'lightning',
      name: 'Lightning',
      description: 'Dramatic lightning animation',
      icon: '⚡',
      color: '#8B5CF6'
    },
    {
      type: 'smoke',
      name: 'Smoke',
      description: 'Slow drifting smoke',
      icon: '💨',
      color: '#6B7280'
    }
  ];

  const handleApplyEffect = (effect: Effect) => {
    if (!selectedElement) {
      return;
    }
    
    onApplyEffect(effect.type, {
      name: effect.name,
      target: selectedElement,
      intensity: 0.7,
      duration: 3000
    });
  };

  return (
    <Box h="100%" bg="#111318" display="flex" flexDirection="column">
      {/* Header */}
      <Box 
        px={4} 
        py={3} 
        borderBottom="1px solid" 
        borderColor="#2d2e37"
        bg="#1a1b23"
      >
        <HStack justify="space-between" align="center">
          <Text fontSize="md" fontWeight="600" color="#f8fafc">
            Effects Library
          </Text>
          {selectedElement && (
            <Box 
              px={2} 
              py={1} 
              bg="#312e81" 
              borderRadius="md"
              border="1px solid"
              borderColor="#4f46e5"
            >
              <Text fontSize="xs" color="#a5b4fc" fontWeight="500">
                {selectedElement}
              </Text>
            </Box>
          )}
        </HStack>
      </Box>

      {/* Effects List */}
      <Box 
        flex="1" 
        overflowY="auto" 
        px={4} 
        py={3}
        bg="#0f1419"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1a1b23',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#374151',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#4b5563',
          },
        }}
      >
        {selectedElement ? (
          <VStack gap={3} align="stretch">
            <Text fontSize="xs" color="#6b7280" fontWeight="500" mb={2}>
              Apply to selected element:
            </Text>
            
            {effects.map((effect) => (
              <Box
                key={effect.type}
                bg="#1e293b"
                p={3}
                borderRadius="md"
                border="1px solid"
                borderColor="#374151"
                cursor="pointer"
                transition="all 0.15s ease"
                _hover={{
                  borderColor: '#6366f1',
                  boxShadow: '0 2px 4px #6366f133',
                  transform: 'translateY(-1px)'
                }}
                onClick={() => handleApplyEffect(effect)}
              >
                <HStack gap={3} align="start">
                  <Text fontSize="lg">{effect.icon}</Text>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="500" color="#f1f5f9" mb={1}>
                      {effect.name}
                    </Text>
                    <Text fontSize="xs" color="#94a3b8" lineHeight="1.3">
                      {effect.description}
                    </Text>
                  </Box>
                  <Box 
                    w="3" 
                    h="3" 
                    borderRadius="full" 
                    bg={effect.color}
                    opacity="0.8"
                  />
                </HStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Box 
            textAlign="center" 
            py={12}
            px={4}
          >
            <Text fontSize="lg" color="#6b7280" mb={2}>
              🎯
            </Text>
            <Text fontSize="sm" color="#9ca3af" fontWeight="500" mb={1}>
              No element selected
            </Text>
            <Text fontSize="xs" color="#6b7280">
              Select an element on the canvas to apply effects
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box 
        px={4} 
        py={3} 
        borderTop="1px solid" 
        borderColor="#2d2e37"
        bg="#1a1b23"
      >
        <Text fontSize="xs" color="#6b7280" textAlign="center">
          Effects are applied instantly to the selected element
        </Text>
      </Box>
    </Box>
  );
};

export default EffectsPanel; 