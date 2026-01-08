import React, { type JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ContractsListPage from './pages/ContractsListPage';
import ContractDetailPage from './pages/ContractDetailPage';
import ContractCreatePage from './pages/ContractCreatePage';
import { useAuth } from './hooks/useAuth';

const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/contracts"
          element={
            <PrivateRoute>
              <ContractsListPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/contracts/new"
          element={
            <PrivateRoute>
              <ContractCreatePage />
            </PrivateRoute>
          }
        />

        <Route
          path="/contracts/:id"
          element={
            <PrivateRoute>
              <ContractDetailPage />
            </PrivateRoute>
          }
        />

        <Route path="/" element={<Navigate to="/contracts" replace />} />
        <Route path="*" element={<p>Página no encontrada</p>} />
      </Routes>
    </Layout>
  );
};

export default App;
