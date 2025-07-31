import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button
} from '@chakra-ui/react';
import { GameTemplate, TemplateElement } from './types';

interface SceneManagerProps {
  gameData: GameTemplate | null;
  currentSceneId: string | null;
  onSwitchScene: (sceneId: string) => void;
}

const SceneManager: React.FC<SceneManagerProps> = ({ 
  gameData, 
  currentSceneId, 
  onSwitchScene 
}) => {
  if (!gameData) {
    return (
      <Box p={4}>
        <Text color="#6b7280" fontSize="sm">
          No game data loaded
        </Text>
      </Box>
    );
  }

  return (
    <VStack gap={3} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="500" color="#e2e8f0" mb={2}>
          Scene Selector
        </Text>
        <VStack gap={2} align="stretch">
          {gameData.game_scenes.map((scene) => (
            <Button
              key={scene.scene_id}
              size="sm"
              variant="plain"
              color={currentSceneId === scene.scene_id ? '#a5b4fc' : '#d1d5db'}
              bg={currentSceneId === scene.scene_id ? '#312e81' : 'transparent'}
              _hover={{ bg: currentSceneId === scene.scene_id ? '#312e81' : '#374151' }}
              onClick={() => onSwitchScene(scene.scene_id)}
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
      </Box>

      {/* 当前场景的分支信息 */}
      {(() => {
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
                      onClick={() => choice.target_scene_id && onSwitchScene(choice.target_scene_id)}
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
  );
};

export default SceneManager; 