import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard component - Redirects to the main layout
 */
const Dashboard = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/', { replace: true });
  }, [navigate]);
  
  return null;
};

export default Dashboard;