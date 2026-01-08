/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import type {
  Contract,
  ContractParticipant,
  ContractEvent,
  OnChainInfo,
} from '../types';
import { useAuth } from '../hooks/useAuth';

interface ContractDetailResponse {
  contract: Contract;
  participants: ContractParticipant[];
  events: ContractEvent[];
}

const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [contract, setContract] = useState<Contract | null>(null);
  const [participants, setParticipants] = useState<ContractParticipant[]>([]);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [onChain, setOnChain] = useState<OnChainInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ContractDetailResponse>(`/contracts/${id}`);
      setContract(res.data.contract);
      setParticipants(res.data.participants);
      setEvents(res.data.events);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        'Error al cargar el detalle del contrato.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnChain = async () => {
    if (!id) return;
    setLoadingOnChain(true);
    try {
      const res = await api.get<{ contract: any; onChain: OnChainInfo }>(
        `/contracts/${id}/onchain`
      );
      setOnChain(res.data.onChain);
    } catch (err) {
      console.error('Error cargando info on-chain', err);
    } finally {
      setLoadingOnChain(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchOnChain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p>Cargando contrato...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!contract) return <p>Contrato no encontrado.</p>;

  // Lógica para saber qué acciones puede hacer el usuario actual
  const currentParticipant = participants.find(
    (p) => p.user_id === user?.id
  );

  const isOwner = currentParticipant?.role_in_contract === 'CREATOR';

    const canInvite =
    isOwner &&
    !['REJECTED', 'COMPLETED', 'CANCELLED', 'ACTIVE'].includes(
      contract.status
    ) &&
    !(onChain && onChain.registered);


  const canSubmit =
    isOwner && contract.status === 'DRAFT';

  const canAcceptReject =
    currentParticipant &&
    currentParticipant.role_in_contract !== 'CREATOR' &&
    contract.status === 'IN_REVIEW' &&
    currentParticipant.signing_status === 'PENDING';

  const resetActionMessages = () => {
    setActionError(null);
    setActionMessage(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!inviteEmail.trim()) {
      setActionError('Debes escribir un correo para invitar.');
      return;
    }

    resetActionMessages();
    setActionLoading(true);
    try {
      await api.post(`/contracts/${id}/invite`, { email: inviteEmail.trim() });
      setActionMessage('Contraparte invitada correctamente.');
      setInviteEmail('');
      await fetchDetail();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        'Error al invitar la contraparte.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    resetActionMessages();
    setActionLoading(true);
    try {
      await api.post(`/contracts/${id}/submit`);
      setActionMessage('Contrato enviado a revisión.');
      await fetchDetail();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        'Error al enviar el contrato a revisión.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!id) return;
    resetActionMessages();
    setActionLoading(true);
    try {
      await api.post(`/contracts/${id}/accept`);
      setActionMessage('Has aceptado el contrato.');
      await fetchDetail();
      await fetchOnChain();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        'Error al aceptar el contrato.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    resetActionMessages();
    setActionLoading(true);
    try {
      await api.post(`/contracts/${id}/reject`);
      setActionMessage('Has rechazado el contrato.');
      await fetchDetail();
      await fetchOnChain();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        'Error al rechazar el contrato.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="contract-detail">
      <div className="page-header">
        <h1>{contract.title}</h1>
        <span className="card-status">Estado: {contract.status}</span>
      </div>

      {contract.description && <p>{contract.description}</p>}

      {contract.currency && contract.total_value != null && (
        <p>
          <strong>Valor:</strong> {contract.total_value} {contract.currency}
        </p>
      )}

      {/* Acciones */}
      <section className="actions-section">
        <h2>Acciones</h2>

        {actionError && <p className="error-text">{actionError}</p>}
        {actionMessage && <p className="success-text">{actionMessage}</p>}

        {isOwner && (
          <p className="hint-text">
            Eres el creador de este contrato. Puedes invitar contrapartes y
            enviarlo a revisión.
          </p>
        )}

        {canInvite && (
          <form className="invite-form" onSubmit={handleInvite}>
            <label>
              Invitar contraparte (email)
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </label>
            <button
              className="btn-secondary btn-small"
              type="submit"
              disabled={actionLoading}
            >
              {actionLoading ? 'Invitando...' : 'Invitar'}
            </button>
          </form>
        )}

        {canSubmit && (
          <button
            className="btn-primary btn-small"
            onClick={handleSubmitForReview}
            disabled={actionLoading}
          >
            {actionLoading ? 'Enviando...' : 'Enviar a revisión'}
          </button>
        )}

        {canAcceptReject && (
          <div className="actions-row">
            <button
              className="btn-primary btn-small"
              onClick={handleAccept}
              disabled={actionLoading}
            >
              {actionLoading ? 'Procesando...' : 'Aceptar contrato'}
            </button>
            <button
              className="btn-danger btn-small"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? 'Procesando...' : 'Rechazar contrato'}
            </button>
          </div>
        )}

        {!isOwner && !canAcceptReject && (
          <p className="hint-text">
            No hay acciones disponibles para tu rol en el estado actual.
          </p>
        )}
      </section>

      <section>
        <h2>Participantes</h2>
        {participants.length === 0 ? (
          <p>No hay participantes registrados.</p>
        ) : (
          <ul className="simple-list">
            {participants.map((p) => (
              <li key={p.user_id}>
                <strong>{p.name}</strong> ({p.email}) —{' '}
                {p.role_in_contract} — firma: {p.signing_status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Eventos</h2>
        {events.length === 0 ? (
          <p>No hay eventos aún.</p>
        ) : (
          <ul className="simple-list">
            {events.map((e) => (
              <li key={e.id}>
                <strong>{e.event_type}</strong> —{' '}
                {new Date(e.created_at).toLocaleString()}
                {e.metadata && <div className="event-meta">{e.metadata}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Estado en blockchain</h2>
        {loadingOnChain && <p>Consultando blockchain...</p>}
        {!loadingOnChain && onChain && (
          <>
            {!onChain.registered ? (
              <p>Este contrato aún no está registrado on-chain.</p>
            ) : (
              <div className="onchain-box">
                <p>
                  <strong>Registrado:</strong> Sí
                </p>
                <p>
                  <strong>On-chain ID:</strong> {onChain.onChainId}
                </p>
                <p>
                  <strong>Estado on-chain:</strong> {onChain.status}
                </p>
                <p>
                  <strong>Owner:</strong> {onChain.owner}
                </p>
                <p>
                  <strong>Red:</strong> {onChain.network}
                </p>
                <p>
                  <strong>Manager:</strong> {onChain.managerAddress}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default ContractDetailPage;
