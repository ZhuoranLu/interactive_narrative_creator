import React, { useState, useEffect } from 'react';
import { narrativeService, HistoryEntry, ProjectHistory } from '../services/narrativeService';

interface StoryHistoryPanelProps {
  projectId: string;
  onRollback?: (snapshotId: string) => void;
  onError?: (error: string) => void;
  isVisible?: boolean;
  onClose?: () => void;
}

const StoryHistoryPanel: React.FC<StoryHistoryPanelProps> = ({
  projectId,
  onRollback,
  onError,
  isVisible = true,
  onClose
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const historyData: ProjectHistory = await narrativeService.getProjectHistory(projectId);
      setHistory(historyData.history);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load history';
      if (onError) {
        onError(errorMessage);
      }
      console.error('Failed to load history:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (snapshotId: string, description: string) => {
    if (!projectId) return;

    const confirmRollback = window.confirm(
      `确定要回滚到以下状态吗？\n\n"${description}"\n\n这将撤销之后的所有更改！`
    );

    if (!confirmRollback) return;

    setRollbackLoading(snapshotId);
    try {
      await narrativeService.rollbackToSnapshot(projectId, { snapshot_id: snapshotId });
      
      // Reload history to reflect the rollback
      await loadHistory();
      
      if (onRollback) {
        onRollback(snapshotId);
      }

      alert('✅ 成功回滚到历史状态！');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
      if (onError) {
        onError(errorMessage);
      }
      alert(`❌ 回滚失败: ${errorMessage}`);
    } finally {
      setRollbackLoading(null);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string, description: string) => {
    const confirmDelete = window.confirm(
      `确定要删除这个历史记录吗？\n\n"${description}"\n\n删除后将无法恢复！`
    );

    if (!confirmDelete) return;

    try {
      await narrativeService.deleteSnapshot(projectId, snapshotId);
      await loadHistory();
      alert('✅ 历史记录已删除');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      if (onError) {
        onError(errorMessage);
      }
      alert(`❌ 删除失败: ${errorMessage}`);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'edit_scene': return '📝';
      case 'add_event': return '➕';
      case 'delete_event': return '🗑️';
      case 'add_action': return '⚡';
      case 'delete_action': return '❌';
      case 'update_event': return '✏️';
      case 'update_action': return '🔧';
      case 'rollback_point': return '🔄';
      default: return '📋';
    }
  };

  const getOperationColor = (operationType: string) => {
    switch (operationType) {
      case 'edit_scene': return 'var(--macaron-blue)';
      case 'add_event': case 'add_action': return 'var(--macaron-green)';
      case 'delete_event': case 'delete_action': return 'var(--macaron-red)';
      case 'update_event': case 'update_action': return 'var(--macaron-orange)';
      case 'rollback_point': return 'var(--macaron-purple)';
      default: return 'var(--text-muted)';
    }
  };

  useEffect(() => {
    if (isVisible && projectId) {
      loadHistory();
    }
  }, [projectId, isVisible]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        width: '420px',
        maxHeight: '85vh',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: '20px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, var(--macaron-blue) 0%, var(--macaron-purple) 100%)',
          borderRadius: '20px 20px 0 0',
          color: 'white'
        }}
      >
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          📚 编辑历史记录
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={loadHistory}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            {loading ? '🔄' : '🔄'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(245, 101, 101, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'var(--macaron-red)';
                (e.target as HTMLElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'rgba(245, 101, 101, 0.9)';
                (e.target as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        padding: '20px 24px', 
        flex: 1, 
        overflow: 'auto',
        background: 'var(--card-bg)'
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px 20px', 
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--border-light)',
              borderTop: '3px solid var(--macaron-blue)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ fontWeight: '500' }}>🔄 加载历史记录中...</span>
          </div>
        ) : history.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px 20px', 
            color: 'var(--text-secondary)',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            📝 暂无编辑历史记录
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  border: '2px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: index === 0 
                    ? 'linear-gradient(135deg, var(--macaron-blue-hover) 0%, rgba(144, 205, 244, 0.1) 100%)'
                    : 'var(--card-bg)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  borderColor: index === 0 ? 'var(--macaron-blue)' : 'var(--border-light)'
                }}
              >
                {/* Operation Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontSize: '18px',
                      marginRight: '10px'
                    }}
                  >
                    {getOperationIcon(entry.operation_type)}
                  </span>
                  <span
                    style={{
                      fontWeight: '600',
                      color: getOperationColor(entry.operation_type),
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {entry.operation_type.replace(/_/g, ' ')}
                  </span>
                  {index === 0 && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, var(--macaron-green) 0%, var(--macaron-green-hover) 100%)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        marginLeft: '12px',
                        fontWeight: '600',
                        boxShadow: '0 2px 4px rgba(104, 211, 145, 0.3)'
                      }}
                    >
                      当前状态
                    </span>
                  )}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                    lineHeight: '1.5',
                    fontWeight: '500'
                  }}
                >
                  {entry.operation_description}
                </div>

                {/* Metadata */}
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    fontWeight: '500'
                  }}>
                    🕒 {formatDateTime(entry.created_at)}
                  </span>
                  {entry.affected_node_id && (
                    <span style={{ 
                      background: 'var(--secondary-bg)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)'
                    }}>
                      节点: {entry.affected_node_id.substring(0, 8)}...
                    </span>
                  )}
                </div>

                {/* Actions */}
                {index > 0 && (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleRollback(entry.id, entry.operation_description)}
                      disabled={rollbackLoading !== null}
                      style={{
                        background: rollbackLoading !== null 
                          ? 'var(--border-medium)' 
                          : 'linear-gradient(135deg, var(--macaron-green) 0%, var(--macaron-green-hover) 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: rollbackLoading !== null ? 'not-allowed' : 'pointer',
                        opacity: rollbackLoading !== null ? 0.6 : 1,
                        boxShadow: rollbackLoading !== null 
                          ? 'none' 
                          : '0 2px 8px rgba(104, 211, 145, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (rollbackLoading === null) {
                          (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(104, 211, 145, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (rollbackLoading === null) {
                          (e.target as HTMLElement).style.transform = 'translateY(0)';
                          (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(104, 211, 145, 0.3)';
                        }
                      }}
                    >
                      {rollbackLoading === entry.id ? '🔄 回滚中...' : '🔄 回滚到此'}
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(entry.id, entry.operation_description)}
                      disabled={rollbackLoading !== null}
                      style={{
                        background: rollbackLoading !== null 
                          ? 'var(--border-medium)' 
                          : 'linear-gradient(135deg, var(--macaron-red) 0%, var(--macaron-red-hover) 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: rollbackLoading !== null ? 'not-allowed' : 'pointer',
                        opacity: rollbackLoading !== null ? 0.6 : 1,
                        boxShadow: rollbackLoading !== null 
                          ? 'none' 
                          : '0 2px 8px rgba(245, 101, 101, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (rollbackLoading === null) {
                          (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(245, 101, 101, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (rollbackLoading === null) {
                          (e.target as HTMLElement).style.transform = 'translateY(0)';
                          (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(245, 101, 101, 0.3)';
                        }
                      }}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Custom scrollbar styles for the content area */}
      <style>
        {`
          div[style*="overflow: auto"]::-webkit-scrollbar {
            width: 6px;
          }
          
          div[style*="overflow: auto"]::-webkit-scrollbar-track {
            background: var(--border-light);
            border-radius: 3px;
          }
          
          div[style*="overflow: auto"]::-webkit-scrollbar-thumb {
            background: var(--border-medium);
            border-radius: 3px;
          }
          
          div[style*="overflow: auto"]::-webkit-scrollbar-thumb:hover {
            background: var(--text-muted);
          }
        `}
      </style>
    </div>
  );
};

export default StoryHistoryPanel; 