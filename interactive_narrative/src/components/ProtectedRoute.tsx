import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  isAuthenticated 
}) => {
  if (!isAuthenticated) {
    // 如果用户未登录，重定向到登录页面
    return <Navigate to="/login" replace />;
  }

  // 如果用户已登录，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute; 