import React from 'react';
import { Box } from '@chakra-ui/react';
import TemplateEditor from '../components/TemplateEditor';

const TemplateEditorPage: React.FC = () => {
  return (
    <Box w="100vw" h="100vh" bg="gray.900">
      <TemplateEditor />
    </Box>
  );
};

export default TemplateEditorPage; 