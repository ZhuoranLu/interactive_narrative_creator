import React, { useState, useEffect } from 'react';
import { authService, Project } from '../services/authService';
import './StoryExampleModal.css';

interface StoryExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExample: (project: Project) => void;
}

const StoryExampleModal: React.FC<StoryExampleModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectExample 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadUserProjects();
    }
  }, [isOpen]);

  const loadUserProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const userProjects = await authService.getUserProjects();
      setProjects(userProjects);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    onSelectExample(project);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="story-modal-overlay" onClick={onClose}>
      <div className="story-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="story-modal-header">
          <h2>选择故事示例</h2>
          <button className="story-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="story-modal-body">
          {loading && (
            <div className="story-loading-container">
              <div className="story-spinner"></div>
              <p>正在加载您的故事示例...</p>
            </div>
          )}

          {error && (
            <div className="story-error-container">
              <p className="story-error-message">错误: {error}</p>
              <button onClick={loadUserProjects} className="story-retry-button">
                重试
              </button>
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="story-no-projects">
              <p>您还没有创建任何故事示例。</p>
              <p>开始创建您的第一个故事吧！</p>
            </div>
          )}

          {!loading && !error && projects.length > 0 && (
            <div className="story-projects-grid">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="story-project-card"
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="story-project-title">{project.title}</div>
                  <div className="story-project-description">
                    {project.description || '无描述'}
                  </div>
                  <div className="story-project-meta">
                    <div className="story-project-setting">
                      世界设定: {project.world_setting || '未设置'}
                    </div>
                    <div className="story-project-characters">
                      角色: {project.characters.length > 0 ? project.characters.join(', ') : '无'}
                    </div>
                    <div className="story-project-date">
                      创建时间: {new Date(project.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryExampleModal; 