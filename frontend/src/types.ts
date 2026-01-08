export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface Contract {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  total_value?: number | null;
  currency?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContractParticipant {
  contract_id: string;
  user_id: string;
  name: string;
  email: string;
  role_in_contract: string;
  signing_status: string;
  signed_at?: string | null;
}

export interface ContractEvent {
  id: string;
  contract_id: string;
  event_type: string;
  triggered_by_user_id?: string | null;
  metadata?: string | null;
  created_at: string;
}

export interface OnChainInfo {
  registered: boolean;
  onChainId?: string;
  backendId?: string;
  owner?: string;
  status?: string;
  title?: string;
  totalValue?: string;
  currency?: string;
  createdAt?: number;
  network?: string;
  managerAddress?: string;
}
