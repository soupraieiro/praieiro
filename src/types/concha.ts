export interface ConchaBalance {
  id: string;
  client_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  total_deposited: number;
  reais_balance: number;
  created_at: string;
  updated_at: string;
}

export interface ConchaLedgerEvent {
  event_id: string;
  tx_id: string | null;
  event_type: string;
  event_data: {
    client_id: string;
    operation: string;
    previous_balance: number;
    new_balance: number;
    balance_delta: number;
    total_earned?: number;
    total_spent?: number;
    reais_balance?: number;
    timestamp: string;
  };
  event_checksum: string;
  previous_event_checksum: string | null;
  sequence_number: number;
  actor_id: string | null;
  actor_type: string | null;
  ip_hash: string | null;
  created_at: string;
}

export interface ConchaWebhookResult {
  success: boolean;
  transaction_id?: string;
  satoshi_hash?: string;
  operation?: string;
  amount?: number;
  previous_balance?: number;
  new_balance?: number;
  source?: string;
  timestamp?: string;
  error_code?: string;
  message?: string;
  webhook_id?: string;
  webhook_type?: string;
}
