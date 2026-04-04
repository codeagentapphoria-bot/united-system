import api from './auth.service';

export interface TransactionNote {
  id: string;
  transactionId: string;
  message: string;
  senderType: 'ADMIN' | 'SUBSCRIBER';
  senderId: string;
  isInternal: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionNoteInput {
  message: string;
  isInternal?: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export const transactionNoteService = {
  async createNote(
    transactionId: string,
    data: CreateTransactionNoteInput
  ): Promise<TransactionNote> {
    const response = await api.post(`/transactions/${transactionId}/notes`, data);
    return response.data.data;
  },

  async getNotes(transactionId: string): Promise<TransactionNote[]> {
    const response = await api.get(`/transactions/${transactionId}/notes`);
    return response.data.data;
  },

  async markAsRead(transactionId: string, noteId: string): Promise<TransactionNote> {
    const response = await api.put(`/transactions/${transactionId}/notes/${noteId}/read`);
    return response.data.data;
  },

  async markAllAsRead(transactionId: string): Promise<{ count: number }> {
    const response = await api.put(`/transactions/${transactionId}/notes/read-all`);
    return response.data.data;
  },

  async getUnreadCount(transactionId: string): Promise<number> {
    const response = await api.get(`/transactions/${transactionId}/notes/unread-count`);
    return response.data.data.count;
  },
};

