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
      case 'edit_scene': return '#2196F3';
      case 'add_event': case 'add_action': return '#4CAF50';
      case 'delete_event': case 'delete_action': return '#F44336';
      case 'update_event': case 'update_action': return '#FF9800';
      case 'rollback_point': return '#9C27B0';
      default: return '#666';
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
        top: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '15px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>
          📚 编辑历史记录
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadHistory}
            disabled={loading}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '5px 10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {loading ? '🔄' : '🔄'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '15px', flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            🔄 加载历史记录中...
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            📝 暂无编辑历史记录
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '6px',
                  padding: '12px',
                  backgroundColor: index === 0 ? '#f0f8ff' : 'white',
                  position: 'relative'
                }}
              >
                {/* Operation Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '16px',
                      marginRight: '8px'
                    }}
                  >
                    {getOperationIcon(entry.operation_type)}
                  </span>
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: getOperationColor(entry.operation_type),
                      fontSize: '13px'
                    }}
                  >
                    {entry.operation_type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {index === 0 && (
                    <span
                      style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        marginLeft: '10px'
                      }}
                    >
                      当前状态
                    </span>
                  )}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: '13px',
                    color: '#333',
                    marginBottom: '8px',
                    lineHeight: '1.4'
                  }}
                >
                  {entry.operation_description}
                </div>

                {/* Metadata */}
                <div
                  style={{
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '10px'
                  }}
                >
                  {formatDateTime(entry.created_at)}
                  {entry.affected_node_id && (
                    <span style={{ marginLeft: '10px' }}>
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
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: rollbackLoading !== null ? 'not-allowed' : 'pointer',
                        opacity: rollbackLoading !== null ? 0.6 : 1
                      }}
                    >
                      {rollbackLoading === entry.id ? '🔄 回滚中...' : '🔄 回滚到此'}
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(entry.id, entry.operation_description)}
                      disabled={rollbackLoading !== null}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: rollbackLoading !== null ? 'not-allowed' : 'pointer',
                        opacity: rollbackLoading !== null ? 0.6 : 1
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

      {/* Footer */}
      <div
        style={{
          padding: '10px 15px',
          borderTop: '1px solid #eee',
          backgroundColor: '#f8f9fa',
          borderRadius: '0 0 8px 8px',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center'
        }}
      >
        💡 最多保存5条历史记录，自动清理旧记录
      </div>
    </div>
  );
};

export default StoryHistoryPanel; 