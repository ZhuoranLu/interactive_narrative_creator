import React, { useEffect, useState, ChangeEvent } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Grid,
  Image,
  Flex,
  Badge,
  Input,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/accordion';
import { gameService } from '../services/gameService';
import './GameSandbox.css';

// Asset type definitions
interface AssetSlot {
  id: string;
  name: string;
  type: 'character' | 'background' | 'audio';
  status: 'empty' | 'placeholder' | 'uploaded';
  description?: string;
  currentPath?: string;
  usedInScenes?: string[];  // 记录资产在哪些场景中使用
}

interface ChapterPath {
  sceneId: string;
  title: string;
  actionDescription: string;
  branchName?: string;
}

interface DialogueAsset {
  speaker: string;
  content: string;
  voiceFile?: string;
  characterImage?: string;
}

interface ChapterAssets {
  sceneId: string;
  title: string;
  branchName: string;
  backgroundImage: string;
  dialogues: DialogueAsset[];
}

export default function GameSandbox() {
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [assetSlots, setAssetSlots] = useState<AssetSlot[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [chapterPath, setChapterPath] = useState<ChapterPath[]>([]);
  const [chapterAssets, setChapterAssets] = useState<ChapterAssets[]>([]);

  useEffect(() => {
    loadGameData();
    loadPreviewUrls();
  }, []);

  const loadPreviewUrls = async () => {
    try {
      const urls = await gameService.getPreviewUrls();
      setPreviewUrls(urls);
    } catch (err: any) {
      console.error("Failed to load preview URLs:", err.message);
    }
  };

  // 处理章节分支和资产
  const processChapterAssets = (data: any) => {
    if (!data?.game_scenes) return [];

    const chapters: ChapterAssets[] = [];
    const branchCounts = new Map<number, number>(); // 记录每个层级的分支数

    data.game_scenes.forEach((scene: any) => {
      // 获取场景的层级
      const level = scene.level || 0;
      branchCounts.set(level, (branchCounts.get(level) || 0) + 1);
      const branchNumber = branchCounts.get(level) || 1;

      // 提取对话资产
      const dialogues: DialogueAsset[] = [];
      scene.content_sequence?.forEach((content: any) => {
        if (content.type === 'dialogue' && content.speaker && content.speaker !== '旁白') {
          dialogues.push({
            speaker: content.speaker,
            content: content.text,
            voiceFile: content.voice_clip?.placeholder_file,
            characterImage: content.character_image,
          });
        }
      });

      chapters.push({
        sceneId: scene.scene_id,
        title: scene.scene_title || `场景 ${scene.scene_id}`,
        branchName: level > 0 ? `分支 ${branchNumber}` : '主线',
        backgroundImage: scene.background_image || '',
        dialogues,
      });
    });

    return chapters;
  };

  // 加载游戏数据
  const loadGameData = async () => {
    try {
      setLoading(true);
      const data = await gameService.getGameData();
      setGameData(data);
      
      // 处理章节资产
      const processedChapters = processChapterAssets(data);
      setChapterAssets(processedChapters);

      // 解析资产槽位并记录它们在哪些场景中使用
      const slots: AssetSlot[] = [];
      const assetUsage = new Map<string, Set<string>>();

      // 遍历所有场景，记录资产使用情况
      data.game_scenes?.forEach((scene: any) => {
        // 记录背景图片使用
        if (scene.background_image) {
          const bgKey = scene.background_image.split('/').pop()?.replace('.jpg', '');
          if (bgKey) {
            if (!assetUsage.has(bgKey)) {
              assetUsage.set(bgKey, new Set());
            }
            assetUsage.get(bgKey)?.add(scene.scene_id);
          }
        }

        // 记录角色立绘使用
        scene.content_sequence?.forEach((content: any) => {
          if (content.character_image) {
            const charKey = content.character_image.split('/').pop()?.replace('.png', '');
            if (charKey) {
              if (!assetUsage.has(charKey)) {
                assetUsage.set(charKey, new Set());
              }
              assetUsage.get(charKey)?.add(scene.scene_id);
            }
          }

          if (content.voice_clip?.placeholder_file) {
            const audioKey = content.voice_clip.placeholder_file.split('/').pop()?.replace('.mp3', '');
            if (audioKey) {
              if (!assetUsage.has(audioKey)) {
                assetUsage.set(audioKey, new Set());
              }
              assetUsage.get(audioKey)?.add(scene.scene_id);
            }
          }
        });
      });
      
      // 解析角色槽位
      Object.entries(data.assets?.characters || {}).forEach(([id, char]: [string, any]) => {
        slots.push({
          id,
          name: char.character_name || id,
          type: 'character',
          status: char.user_uploaded ? 'uploaded' : 'placeholder',
          description: char.character_description || '',
          currentPath: char.placeholder_image || '/placeholder-character.png',
          usedInScenes: Array.from(assetUsage.get(id) || [])
        });
      });

      // 解析背景槽位
      Object.entries(data.assets?.backgrounds || {}).forEach(([id, bg]: [string, any]) => {
        slots.push({
          id,
          name: bg.location_name || id,
          type: 'background',
          status: bg.user_uploaded ? 'uploaded' : 'placeholder',
          description: bg.background_description || '',
          currentPath: bg.placeholder_image || '/placeholder-background.png',
          usedInScenes: Array.from(assetUsage.get(id) || [])
        });
      });

      // 解析音频槽位
      Object.entries(data.assets?.audio || {}).forEach(([id, audio]: [string, any]) => {
        if (id !== 'sound_effects' && id !== 'bgm') {
          slots.push({
            id,
            name: id,
            type: 'audio',
            status: audio.user_uploaded ? 'uploaded' : 'placeholder',
            description: audio.prompt_for_ai || '',
            currentPath: audio.placeholder_file || '/placeholder-audio.mp3',
            usedInScenes: Array.from(assetUsage.get(id) || [])
          });
        }
      });

      setAssetSlots(slots);
      setError(null);
    } catch (err) {
      console.error('Failed to load game data:', err);
      setError('Failed to load game data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetUpload = async (slot: AssetSlot, file: File) => {
    try {
      setRefreshing(true);
      await gameService.uploadAsset(slot.type, slot.name, file);
      console.log('素材上传成功');
      await loadGameData();
    } catch (err) {
      console.error('素材上传失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateAI = async (slot: AssetSlot) => {
    console.log('AI生成功能即将推出，目前仅支持手动上传素材');
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

  const handleOpenPreview = () => {
    if (previewUrls?.enhanced_preview_url) {
      const baseUrl = window.location.origin.replace(`:${window.location.port}`, ':8000');
      window.open(`${baseUrl}${previewUrls.enhanced_preview_url}`, '_blank');
    }
  };

  const getSceneTitle = (sceneId: string) => {
    const scene = gameData?.game_scenes.find((s: any) => s.scene_id === sceneId);
    return scene ? scene.scene_title : sceneId;
  };

  const filterAssetsByChapter = (assets: AssetSlot[]) => {
    if (selectedChapter === 'all') {
      return assets;
    }
    return assets.filter(asset => 
      asset.usedInScenes?.includes(selectedChapter)
    );
  };

  // 根据选中的章节构建路径
  const buildChapterPath = (sceneId: string) => {
    if (!gameData || !sceneId || sceneId === 'all') {
      setChapterPath([]);
      return;
    }

    const path: ChapterPath[] = [];
    let currentSceneId = sceneId;

    while (currentSceneId) {
      // 找到当前场景
      const currentScene = gameData.game_scenes?.find((s: any) => s.scene_id === currentSceneId);
      if (!currentScene) break;

      // 找到通向当前场景的连接
      const connection = gameData.scene_connections?.find((c: any) => c.to_node_id === currentSceneId);
      
      // 将当前场景添加到路径中
      path.unshift({
        sceneId: currentSceneId,
        title: currentScene.scene_title || `场景 ${currentSceneId}`,
        actionDescription: connection?.action_description || ''
      });

      // 移动到父场景
      currentSceneId = connection?.from_node_id || '';
    }

    setChapterPath(path);
  };

  // 更新选中章节的处理函数
  const handleChapterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newChapter = e.target.value;
    setSelectedChapter(newChapter);
    if (gameData) {
      buildChapterPath(newChapter);
    }
  };

  // 在加载游戏数据后构建初始路径
  useEffect(() => {
    if (gameData && selectedChapter !== 'all') {
      buildChapterPath(selectedChapter);
    }
  }, [gameData]);

  const StatBox = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <Box textAlign="center" p={4} borderWidth="1px" borderRadius="md">
      <Text fontSize="sm" color="gray.600">{label}</Text>
      <Text fontSize="2xl" fontWeight="bold" color={color}>{value}</Text>
    </Box>
  );

  const AssetCard = ({ slot }: { slot: AssetSlot }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
      inputRef.current?.click();
    };

    return (
      <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
        <Box p={4} borderBottomWidth="1px">
          <Heading size="md">{slot.name}</Heading>
          <Badge 
            colorScheme={slot.status === 'uploaded' ? 'green' : 'yellow'}
            ml={2}
          >
            {slot.status === 'uploaded' ? '已上传' : '占位符'}
          </Badge>
        </Box>
        <Box p={4}>
          {slot.type === 'audio' ? (
            <Box className="audio-preview">
              <audio controls src={slot.currentPath}>
                <source src={slot.currentPath} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </Box>
          ) : (
            <Image
              src={slot.currentPath}
              alt={slot.name}
              className="asset-preview-image"
            />
          )}
          <Text mt={2} fontSize="sm" color="gray.600">
            {slot.description}
          </Text>
          {slot.usedInScenes && slot.usedInScenes.length > 0 && (
            <Box mt={2}>
              <Text fontSize="sm" fontWeight="bold">出现在以下章节：</Text>
              {slot.usedInScenes.map(sceneId => (
                <Badge key={sceneId} m={1} colorScheme="purple">
                  {getSceneTitle(sceneId)}
                </Badge>
              ))}
            </Box>
          )}
        </Box>
        <Box p={4} borderTopWidth="1px">
          <Flex gap="2">
            <Input
              ref={inputRef}
              type="file"
              accept={slot.type === 'audio' ? 'audio/*' : 'image/*'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAssetUpload(slot, file);
              }}
              display="none"
            />
            <Button
              onClick={handleUploadClick}
              colorScheme="blue"
            >
              上传素材
            </Button>
            <Button
              onClick={() => handleGenerateAI(slot)}
              colorScheme="purple"
            >
              AI生成
            </Button>
          </Flex>
        </Box>
      </Box>
    );
  };

  const ChapterSelector = () => {
    const chapterGroups = chapterAssets.reduce((groups: { [key: string]: ChapterAssets[] }, chapter) => {
      const level = chapter.title.match(/第(\d+)章/)?.[1] || '1';
      if (!groups[level]) {
        groups[level] = [];
      }
      groups[level].push(chapter);
      return groups;
    }, {});

    return (
      <Accordion allowMultiple defaultIndex={[0]} width="100%">
        {Object.entries(chapterGroups).map(([level, chapters]) => (
          <AccordionItem key={level}>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  第 {level} 章
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              {chapters.map((chapter) => (
                <Box
                  key={chapter.sceneId}
                  p={2}
                  cursor="pointer"
                  _hover={{ bg: "gray.100" }}
                  onClick={() => {
                    setSelectedChapter(chapter.sceneId);
                    buildChapterPath(chapter.sceneId);
                  }}
                  bg={selectedChapter === chapter.sceneId ? "purple.50" : "transparent"}
                  borderRadius="md"
                >
                  <Flex alignItems="center" justifyContent="space-between">
                    <Text>{chapter.title}</Text>
                    <Badge colorScheme={chapter.branchName === '主线' ? 'purple' : 'blue'}>
                      {chapter.branchName}
                    </Badge>
                  </Flex>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {chapter.dialogues.length} 段对话 · {
                      new Set(chapter.dialogues.map(d => d.speaker)).size
                    } 个角色
                  </Text>
                </Box>
              ))}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Container centerContent>
        <Text>加载中...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container centerContent>
        <Text color="red.500">{error}</Text>
        <Button onClick={loadGameData} mt={4}>重试</Button>
      </Container>
    );
  }

  const tabs = [
    { id: 'characters', label: '角色立绘', type: 'character' },
    { id: 'backgrounds', label: '场景背景', type: 'background' },
    { id: 'audio', label: '音频资源', type: 'audio' },
  ];

  return (
    <Box className="game-sandbox">
      <Container maxW="container.xl" py={8}>
        <Flex direction="column" gap={8}>
          {/* Header Section */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
              <Box>
                <Heading size="lg" color="purple.600" mb={1}>
                  🎮 游戏沙盒
                </Heading>
                <Text color="gray.600">
                  管理游戏素材，预览和自定义你的互动故事
                </Text>
              </Box>
              <Flex gap={3}>
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
              </Flex>
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

                <SimpleGrid columns={4} gap={4}>
                  <StatBox
                    label="场景数量"
                    value={gameData.game_scenes?.length || 0}
                    color="purple.500"
                  />
                  <StatBox
                    label="选择分支"
                    value={gameData.game_scenes?.reduce((total: number, scene: any) => 
                      total + (scene.player_choices?.length || 0), 0) || 0}
                    color="blue.500"
                  />
                  <StatBox
                    label="角色立绘"
                    value={Object.keys(gameData.assets.characters || {}).length}
                    color="green.500"
                  />
                  <StatBox
                    label="场景背景"
                    value={Object.keys(gameData.assets.backgrounds || {}).length}
                    color="orange.500"
                  />
                </SimpleGrid>
              </Box>
            )}
          </Box>

          {/* Asset Management Section */}
          <Box className="game-info-section">
            <Flex gap={8} alignItems="flex-start">
              {/* Chapter Selection Panel */}
              <Box width="300px" bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
                <Heading size="md" mb={4}>章节选择</Heading>
                <ChapterSelector />
              </Box>

              {/* Asset Management Panel */}
              <Box flex={1}>
                <Flex justifyContent="space-between" alignItems="center" mb={4}>
                  <Box>
                    <Heading size="md" mb={2}>资源管理</Heading>
                    {chapterPath.length > 0 && (
                      <Flex alignItems="center" fontSize="sm" mb={4} flexWrap="wrap">
                        {chapterPath.map((node, index) => (
                          <React.Fragment key={node.sceneId}>
                            <Box
                              as="button"
                              onClick={() => {
                                setSelectedChapter(node.sceneId);
                                buildChapterPath(node.sceneId);
                              }}
                              color={index === chapterPath.length - 1 ? "purple.500" : "gray.500"}
                              fontWeight={index === chapterPath.length - 1 ? "bold" : "normal"}
                              _hover={{ textDecoration: "underline" }}
                            >
                              {node.title}
                              {node.branchName && (
                                <Badge ml={1} colorScheme={node.branchName === '主线' ? 'purple' : 'blue'}>
                                  {node.branchName}
                                </Badge>
                              )}
                              {node.actionDescription && index < chapterPath.length - 1 && (
                                <Text
                                  as="span"
                                  fontSize="xs"
                                  color="gray.500"
                                  ml={2}
                                  fontStyle="italic"
                                >
                                  ({node.actionDescription})
                                </Text>
                              )}
                            </Box>
                            {index < chapterPath.length - 1 && (
                              <Text mx={2} color="gray.500">→</Text>
                            )}
                          </React.Fragment>
                        ))}
                      </Flex>
                    )}
                  </Box>
                </Flex>

                {/* Selected Chapter Assets */}
                {selectedChapter !== 'all' && (
                  <Box mb={6}>
                    {chapterAssets.find(c => c.sceneId === selectedChapter)?.dialogues.map((dialogue, index) => (
                      <Box
                        key={index}
                        p={4}
                        bg="white"
                        borderRadius="md"
                        border="1px"
                        borderColor="gray.200"
                        mb={2}
                      >
                        <Flex alignItems="center" gap={4}>
                          <Box width="100px" height="100px" position="relative">
                            <Image
                              src={dialogue.characterImage || '/placeholder-character.png'}
                              alt={dialogue.speaker}
                              objectFit="cover"
                              width="100%"
                              height="100%"
                              borderRadius="md"
                            />
                            <Badge
                              position="absolute"
                              bottom={2}
                              left={2}
                              colorScheme="purple"
                            >
                              {dialogue.speaker}
                            </Badge>
                          </Box>
                          <Box flex={1}>
                            <Text fontSize="sm" mb={2}>{dialogue.content}</Text>
                            {dialogue.voiceFile && (
                              <audio controls src={dialogue.voiceFile} className="w-full">
                                <source src={dialogue.voiceFile} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                          </Box>
                        </Flex>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Asset Type Tabs */}
                <Box>
                  <Flex borderBottom="1px" borderColor="gray.200" mb={4}>
                    {tabs.map((tab, index) => (
                      <Button
                        key={tab.id}
                        onClick={() => setSelectedTab(index)}
                        variant={selectedTab === index ? "solid" : "ghost"}
                        colorScheme={selectedTab === index ? "purple" : "gray"}
                        borderRadius="0"
                        borderBottom={selectedTab === index ? "2px solid" : "none"}
                        borderBottomColor="purple.500"
                        px={6}
                        py={3}
                      >
                        {tab.label} ({filterAssetsByChapter(assetSlots.filter(s => s.type === tab.type)).length})
                      </Button>
                    ))}
                  </Flex>

                  <Box p={4}>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                      {filterAssetsByChapter(assetSlots.filter(slot => slot.type === tabs[selectedTab].type))
                        .map(slot => (
                          <AssetCard key={slot.id} slot={slot} />
                        ))}
                    </SimpleGrid>
                  </Box>
                </Box>
              </Box>
            </Flex>
          </Box>

          {/* Game Preview Section */}
          <Box className="game-preview-section" bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
            <Heading size="md" mb={4}>游戏预览</Heading>
            {gameData && (
              <Box>
                <Button mt={4} colorScheme="purple" onClick={handleOpenPreview} disabled={!previewUrls}>
                  在新标签页中打开游戏预览
                </Button>
              </Box>
            )}
          </Box>
        </Flex>
      </Container>
    </Box>
  );
} 