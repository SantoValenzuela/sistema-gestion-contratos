/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import api from '../api/client';
import type { Contract } from '../types';
import { Link } from 'react-router-dom';

const ContractsListPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await api.get('/contracts');
        setContracts(res.data.contracts || []);
      } catch (err: any) {
        console.error(err);
        const msg =
          err?.response?.data?.message || 'Error al cargar contratos.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  if (loading) return <p>Cargando contratos...</p>;

  if (error) return <p className="error-text">{error}</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Mis contratos</h1>
        <Link to="/contracts/new" className="btn-primary btn-small">
          + Nuevo contrato
        </Link>
      </div>

      {contracts.length === 0 ? (
        <p>No tienes contratos todavía. Crea uno para empezar.</p>
      ) : (
        <div className="card-list">
          {contracts.map((c) => (
            <Link key={c.id} to={`/contracts/${c.id}`} className="card">
              <h2>{c.title}</h2>
              <p className="card-status">Estado: {c.status}</p>
              {c.currency && c.total_value != null && (
                <p>
                  Valor: {c.total_value} {c.currency}
                </p>
              )}
              {c.description && (
                <p className="card-description">
                  {c.description.length > 120
                    ? c.description.slice(0, 120) + '...'
                    : c.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractsListPage;
