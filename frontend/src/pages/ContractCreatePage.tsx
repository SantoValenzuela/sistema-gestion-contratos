/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const ContractCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [terminationDate, setTerminationDate] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload: any = {
        title,
        description: description || undefined,
        currency: currency || undefined,
        effectiveDate: effectiveDate || undefined,
        terminationDate: terminationDate || undefined,
      };

      const parsedValue = parseFloat(totalValue);
      if (!isNaN(parsedValue)) {
        payload.totalValue = parsedValue;
      }

      await api.post('/contracts', payload);

      setSuccess('Contrato creado correctamente.');
      // Para no depender de la forma exacta de la respuesta, volvemos a la lista
      setTimeout(() => {
        navigate('/contracts');
      }, 800);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        'Error al crear el contrato. Revisa los datos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>Crear contrato</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Título *
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          Descripción
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <label>
          Valor total
          <input
            type="number"
            step="0.01"
            value={totalValue}
            onChange={(e) => setTotalValue(e.target.value)}
          />
        </label>

        <label>
          Moneda
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </label>

        <label>
          Fecha de inicio (effectiveDate)
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </label>

        <label>
          Fecha de término (terminationDate)
          <input
            type="date"
            value={terminationDate}
            onChange={(e) => setTerminationDate(e.target.value)}
          />
        </label>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear contrato'}
        </button>
      </form>
    </div>
  );
};

export default ContractCreatePage;
