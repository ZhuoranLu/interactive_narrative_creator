import React, { useState, useRef } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Button,
  Badge
} from '@chakra-ui/react';

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  content: string;
  speaker?: string;
  duration: number;
  order: number;
  sceneId?: string;
  choices?: any[];
}

interface TimelineProps {
  events: TimelineEvent[];
  onEventReorder: (events: TimelineEvent[]) => void;
  onEventSelect: (eventId: string) => void;
  selectedEventId?: string;
}

const Timeline: React.FC<TimelineProps> = ({
  events,
  onEventReorder,
  onEventSelect,
  selectedEventId
}) => {
  const [draggedEvent, setDraggedEvent] = useState<TimelineEvent | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (event: TimelineEvent, e: React.DragEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedEvent) return;

    const draggedIndex = events.findIndex(event => event.id === draggedEvent.id);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    // 重新排序事件
    const newEvents = [...events];
    const [removed] = newEvents.splice(draggedIndex, 1);
    newEvents.splice(dropIndex, 0, removed);

    // 更新order属性
    const updatedEvents = newEvents.map((event, index) => ({
      ...event,
      order: index
    }));

    onEventReorder(updatedEvents);
    setDraggedEvent(null);
    setDragOverIndex(null);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'narration': return '📖';
      case 'dialogue': return '💬';
      case 'choices': return '🎯';
      case 'scene': return '🎬';
      default: return '📝';
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'narration': return 'Narration';
      case 'dialogue': return 'Dialogue';
      case 'choices': return 'Choices';
      case 'scene': return 'Scene';
      default: return type;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'narration': return 'blue';
      case 'dialogue': return 'green';
      case 'choices': return 'purple';
      case 'scene': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Box
      bg="#111318"
      border="1px solid"
      borderColor="#2d2e37"
      borderRadius="8px"
      p={4}
      h="100%"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="600" color="#f1f5f9">
          Timeline
        </Text>
        <Badge colorScheme="blue" variant="subtle">
          {events.length} Events
        </Badge>
      </Flex>

      <Box
        ref={timelineRef}
        h="calc(100% - 60px)"
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1e293b',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#475569',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#64748b',
          },
        }}
      >
        <VStack gap={2} align="stretch">
          {events.map((event, index) => (
            <Box
              key={event.id}
              draggable
              onDragStart={(e) => handleDragStart(event, e)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              bg={selectedEventId === event.id ? '#312e81' : '#1e293b'}
              border="1px solid"
              borderColor={selectedEventId === event.id ? '#6366f1' : '#374151'}
              borderRadius="6px"
              p={3}
              cursor="pointer"
              onClick={() => onEventSelect(event.id)}
              opacity={draggedEvent?.id === event.id ? 0.5 : 1}
              transform={dragOverIndex === index ? 'translateY(2px)' : 'none'}
              transition="all 0.2s ease"
              _hover={{
                bg: selectedEventId === event.id ? '#312e81' : '#334155',
                borderColor: selectedEventId === event.id ? '#6366f1' : '#4b5563'
              }}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={3}>
                  <Text fontSize="lg">{getEventIcon(event.type)}</Text>
                  <VStack align="start" gap={1}>
                    <HStack gap={2}>
                      <Text fontSize="sm" fontWeight="500" color="#f1f5f9">
                        {event.title}
                      </Text>
                      <Badge size="sm" colorScheme={getEventColor(event.type)} variant="subtle">
                        {getEventTypeName(event.type)}
                      </Badge>
                    </HStack>
                    <Text 
                      fontSize="xs" 
                      color="#94a3b8" 
                      overflow="hidden" 
                      textOverflow="ellipsis" 
                      whiteSpace="nowrap"
                      maxW="180px"
                    >
                      {event.content}
                    </Text>
                    {event.speaker && (
                      <Text fontSize="xs" color="#6366f1" fontWeight="500">
                        {event.speaker}
                      </Text>
                    )}
                  </VStack>
                </HStack>
                
                <VStack align="end" gap={1}>
                  <Text fontSize="xs" color="#64748b">
                    #{event.order + 1}
                  </Text>
                  <Text fontSize="xs" color="#64748b">
                    {event.duration}ms
                  </Text>
                </VStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

export default Timeline; 