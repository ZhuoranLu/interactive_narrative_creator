import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Textarea,
  IconButton
} from '@chakra-ui/react';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatAssistantProps {
  projectId: string;
  selectedElement?: string;
  onExecuteCommand: (command: any) => void;
  onApplyEffect: (effectType: string, config?: any) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  projectId,
  selectedElement,
  onExecuteCommand,
  onApplyEffect
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I\'m your AI design assistant. I can help you modify elements, apply effects, and enhance your template. What would you like to work on?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: generateAIResponse(inputValue, selectedElement),
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const generateAIResponse = (userInput: string, selectedElement?: string): string => {
    const input = userInput.toLowerCase();
    
    if (!selectedElement) {
      return "Please select an element first, then I can help you modify it. Click on any element in the canvas to get started.";
    }

    if (input.includes('glow') || input.includes('shine')) {
      onApplyEffect('glow', { intensity: 0.8, color: '#6366f1' });
      return `Applied glow effect to ${selectedElement}. The element now has a subtle blue glow that enhances its visibility.`;
    } else if (input.includes('particle') || input.includes('sparkle')) {
      onApplyEffect('particles', { count: 50, type: 'sparkle' });
      return `Added particle effects to ${selectedElement}. Beautiful sparkle particles are now animated around the element.`;
    } else if (input.includes('blood') || input.includes('red')) {
      onApplyEffect('bloodDrop', { intensity: 0.6 });
      return `Applied blood drop effect to ${selectedElement}. This creates a dramatic visual impact for intense scenes.`;
    } else if (input.includes('bigger') || input.includes('larger')) {
      onExecuteCommand({ type: 'update_element', parameters: { fontSize: '20px' } });
      return `Increased the font size of ${selectedElement}. The text should now be more prominent and easier to read.`;
    } else if (input.includes('smaller')) {
      onExecuteCommand({ type: 'update_element', parameters: { fontSize: '12px' } });
      return `Reduced the font size of ${selectedElement}. The text is now more compact and subtle.`;
    } else if (input.includes('transparent') || input.includes('fade')) {
      onExecuteCommand({ type: 'update_element', parameters: { opacity: '0.5' } });
      return `Made ${selectedElement} semi-transparent. This creates a subtle, layered effect in your design.`;
    } else if (input.includes('opaque') || input.includes('solid')) {
      onExecuteCommand({ type: 'update_element', parameters: { opacity: '1' } });
      return `Made ${selectedElement} fully opaque. The element is now clearly visible and prominent.`;
    }

    return `I understand you want to modify "${selectedElement}". You can ask me to:
    
• Apply visual effects (glow, particles, blood drops)
• Change text size (make it bigger/smaller)
• Adjust transparency (make it transparent/opaque)
• Modify colors and styling

What specific change would you like to make?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <VStack h="100%" gap={0} bg="#111318">
      {/* Header */}
      <Box
        w="100%"
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="#2d2e37"
        bg="#1a1b23"
      >
        <HStack justify="space-between" align="center">
          <Text fontSize="md" fontWeight="600" color="#f8fafc">
            AI Assistant
          </Text>
        </HStack>
      </Box>

      {/* Messages Area */}
      <Box
        flex="1"
        w="100%"
        overflowY="auto"
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
        <VStack gap={4} p={4} align="stretch">
          {messages.map((message) => (
            <Flex
              key={message.id}
              justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
              w="100%"
            >
              <Box
                maxW="85%"
                px={3}
                py={2}
                borderRadius="lg"
                bg={message.sender === 'user' ? '#6366f1' : '#1e293b'}
                color={message.sender === 'user' ? 'white' : '#e2e8f0'}
                border={message.sender === 'assistant' ? '1px solid #374151' : 'none'}
                boxShadow={message.sender === 'user' ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)' : '0 2px 4px -1px rgba(0, 0, 0, 0.3)'}
              >
                <Text fontSize="sm" lineHeight="1.5" whiteSpace="pre-wrap">
                  {message.content}
                </Text>
                <Text
                  fontSize="xs"
                  color={message.sender === 'user' ? 'rgba(255, 255, 255, 0.7)' : '#6b7280'}
                  mt={1}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </Box>
            </Flex>
          ))}

          {isLoading && (
            <Flex justify="flex-start" w="100%">
              <Box
                maxW="85%"
                px={3}
                py={2}
                borderRadius="lg"
                bg="#1e293b"
                border="1px solid #374151"
              >
                                 <HStack gap={1}>
                   <Box
                     w="6px"
                     h="6px"
                     bg="#6366f1"
                     borderRadius="full"
                     animation="pulse 1.5s ease-in-out infinite"
                   />
                   <Box
                     w="6px"
                     h="6px"
                     bg="#6366f1"
                     borderRadius="full"
                     animation="pulse 1.5s ease-in-out 0.3s infinite"
                   />
                   <Box
                     w="6px"
                     h="6px"
                     bg="#6366f1"
                     borderRadius="full"
                     animation="pulse 1.5s ease-in-out 0.6s infinite"
                   />
                 </HStack>
              </Box>
            </Flex>
          )}
          
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input Area */}
      <Box
        w="100%"
        p={4}
        borderTop="1px solid"
        borderColor="#2d2e37"
        bg="#1a1b23"
      >
                 <VStack gap={3}>
           {selectedElement && (
             <Box
               w="100%"
               px={3}
               py={2}
               bg="#312e81"
               borderRadius="md"
               border="1px solid #4f46e5"
             >
               <Text fontSize="xs" color="#a5b4fc" fontWeight="500">
                 Selected: {selectedElement}
               </Text>
             </Box>
           )}
           
           <HStack w="100%" gap={2}>
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what you want to change..."
              size="sm"
              minH="40px"
              maxH="120px"
              resize="none"
              bg="#0f1419"
              border="1px solid"
              borderColor="#374151"
              color="#f1f5f9"
              _placeholder={{ color: '#6b7280' }}
              _focus={{
                borderColor: '#6366f1',
                bg: '#0f1419',
                boxShadow: '0 0 0 1px #6366f1'
              }}
              borderRadius="md"
            />
                         <Button
               onClick={handleSendMessage}
               disabled={!inputValue.trim() || isLoading}
               bg="#6366f1"
               color="white"
               _hover={{ bg: '#5b21b6' }}
               _disabled={{ bg: '#374151', color: '#6b7280' }}
               size="sm"
               borderRadius="md"
               minW="40px"
               px={2}
             >
               ↗
             </Button>
          </HStack>
          
          <Text fontSize="xs" color="#6b7280" textAlign="center">
            Press Shift + Enter for new line
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};

export default ChatAssistant; 