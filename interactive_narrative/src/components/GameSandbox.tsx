import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Spinner,
  Grid
} from '@chakra-ui/react';
import { gameService, GameData } from '../services/gameService';
import './GameSandbox.css';

const GameSandbox: React.FC = () => {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gameService.getGameData();
      setGameData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game data');
      console.error('Failed to load game data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateGame = async () => {
    try {
      setRefreshing(true);
      await gameService.regenerateGameData();
      await loadGameData();
      console.log('Game data regenerated successfully');
    } catch (err) {
      console.error('Failed to regenerate game data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="purple.500" />
          <Text mt={4} fontSize="lg" color="gray.600">加载游戏数据中...</Text>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box p={4} bg="red.50" border="1px" borderColor="red.200" borderRadius="md">
          <Text fontWeight="bold" color="red.600">加载游戏数据失败</Text>
          <Text fontSize="sm" color="red.500" mt={1}>{error}</Text>
          <Button mt={3} onClick={loadGameData} size="sm" colorScheme="red">
            重试
          </Button>
        </Box>
      </Container>
    );
  }

  const tabs = ['🎨 素材管理', '🤖 AI 生成器', '🎮 游戏预览'];

  return (
    <Container maxW="container.xl" py={6}>
      <Box>
        {/* Header */}
        <Box mb={6}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Heading size="lg" color="purple.600" mb={1}>
                🎮 游戏沙盒
              </Heading>
              <Text color="gray.600">
                管理游戏素材，预览和自定义你的互动故事
              </Text>
            </Box>
            
            <Box display="flex" gap={3}>
              <Button
                onClick={loadGameData}
                variant="outline"
                colorScheme="blue"
                size="sm"
              >
                🔄 刷新数据
              </Button>
              <Button
                onClick={handleRegenerateGame}
                colorScheme="purple"
                disabled={refreshing}
                size="sm"
              >
                {refreshing ? "⏳ 生成中..." : "⚡ 重新生成"}
              </Button>
            </Box>
          </Box>

          {/* Game Info Card */}
          {gameData && (
            <Box p={6} bg="white" border="1px" borderColor="gray.200" borderRadius="lg" mb={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                  <Heading size="md" mb={1}>{gameData.game_info.title}</Heading>
                  <Text fontSize="sm" color="gray.600">
                    {gameData.game_info.description}
                  </Text>
                </Box>
                <Box bg="purple.500" color="white" px={3} py={1} borderRadius="md" fontSize="sm">
                  {gameData.game_info.version}
                </Box>
              </Box>
              
              <Grid templateColumns="repeat(4, 1fr)" gap={4}>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                    {gameData.game_scenes?.length || 0}
                  </Text>
                  <Text fontSize="sm" color="gray.600">场景数量</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                    {gameData.game_scenes?.reduce((total, scene) => 
                      total + (scene.player_choices?.length || 0), 0) || 0}
                  </Text>
                  <Text fontSize="sm" color="gray.600">选择分支</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {Object.keys(gameData.assets.characters || {}).length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">角色立绘</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                    {Object.keys(gameData.assets.backgrounds || {}).length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">场景背景</Text>
                </Box>
              </Grid>
            </Box>
          )}
        </Box>

        {/* Tabs */}
        <Box>
          {/* Tab List */}
          <Box display="flex" borderBottom="1px" borderColor="gray.200" mb={4}>
            {tabs.map((tab, index) => (
              <Button
                key={index}
                onClick={() => setActiveTab(index)}
                variant={activeTab === index ? "solid" : "ghost"}
                colorScheme={activeTab === index ? "purple" : "gray"}
                borderRadius="0"
                borderBottom={activeTab === index ? "2px solid" : "none"}
                borderBottomColor="purple.500"
                px={6}
                py={3}
              >
                {tab}
              </Button>
            ))}
          </Box>

          {/* Tab Content */}
          <Box>
            {activeTab === 0 && (
              <Box p={6} bg="gray.50" borderRadius="md">
                <Text fontSize="lg" fontWeight="semibold" mb={2}>素材管理功能</Text>
                <Text color="gray.600" mb={4}>
                  这里将提供角色立绘、场景背景、音频文件的上传和管理功能
                </Text>
                {gameData && (
                  <Box>
                    <Text fontWeight="semibold" mb={3}>当前素材统计：</Text>
                    <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                      <Box p={3} bg="white" borderRadius="md">
                        <Text fontWeight="semibold" color="green.600">角色立绘</Text>
                        <Text>{Object.keys(gameData.assets.characters || {}).length} 个</Text>
                      </Box>
                      <Box p={3} bg="white" borderRadius="md">
                        <Text fontWeight="semibold" color="blue.600">场景背景</Text>
                        <Text>{Object.keys(gameData.assets.backgrounds || {}).length} 个</Text>
                      </Box>
                      <Box p={3} bg="white" borderRadius="md">
                        <Text fontWeight="semibold" color="purple.600">音频文件</Text>
                        <Text>{Object.keys(gameData.assets.audio || {}).length} 个</Text>
                      </Box>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <Box p={6} bg="gray.50" borderRadius="md">
                <Text fontSize="lg" fontWeight="semibold" mb={2}>AI 生成器</Text>
                <Text color="gray.600" mb={4}>
                  这里将提供 AI 自动生成游戏素材的功能
                </Text>
                <Text fontSize="sm" color="gray.500">
                  支持的生成类型：角色立绘、场景背景、配音音频、背景音乐
                </Text>
              </Box>
            )}

            {activeTab === 2 && (
              <Box p={6} bg="gray.50" borderRadius="md">
                <Text fontSize="lg" fontWeight="semibold" mb={2}>游戏预览</Text>
                <Text color="gray.600" mb={4}>
                  这里将提供实时游戏预览功能
                </Text>
                {gameData && (
                  <Box>
                    <Text fontWeight="semibold" mb={3}>游戏场景列表：</Text>
                    <Box>
                      {gameData.game_scenes?.map((scene, index) => (
                        <Box key={scene.scene_id} p={3} bg="white" borderRadius="md" mb={2} 
                             border="1px" borderColor="gray.200">
                          <Text fontWeight="semibold">{scene.scene_title}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {scene.player_choices?.length || 0} 个选择分支
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            场景ID: {scene.scene_id}
                          </Text>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default GameSandbox; 