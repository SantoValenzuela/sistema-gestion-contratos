import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo">Smart Contracts</span>
          {isAuthenticated && (
            <nav className="app-nav">
              <Link to="/contracts">Contratos</Link>
            </nav>
          )}
        </div>
        <div className="app-header-right">
          {isAuthenticated && user ? (
            <>
              <span className="app-user">
                {user.name} ({user.role})
              </span>
              <button className="btn-secondary" onClick={logout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link className="btn-link" to="/login">
                Iniciar sesión
              </Link>
              <Link className="btn-link" to="/register">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
};

export default Layout;
