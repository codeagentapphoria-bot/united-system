import api from './auth.service';

export interface UploadResponse {
  url: string;
  filename: string;
  transactionId?: string;
}

export const uploadService = {
  /**
   * Upload a file for a transaction document
   * @param file - The file to upload
   * @returns Promise with upload response containing URL
   */
  async uploadTransactionDocument(file: File): Promise<UploadResponse> {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        'Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX'
      );
    }

    const formData = new FormData();
    formData.append('file', file);

    // Upload to temporary location for new transactions
    // Subscribers can upload files before creating the transaction
    const endpoint = '/upload/transactions/documents';

    const response = await api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  /**
   * Upload multiple files
   * @param files - Array of files to upload
   * @returns Promise with array of upload responses
   */
  async uploadMultipleFiles(files: File[]): Promise<UploadResponse[]> {
    const uploadPromises = files.map((file) => this.uploadTransactionDocument(file));
    return Promise.all(uploadPromises);
  },

  /**
   * Upload a profile picture for the resident (direct upload via backend)
   * @param file - The file to upload
   * @returns Promise with upload response containing URL
   */
  async uploadResidentProfilePicture(file: File): Promise<UploadResponse> {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed types: JPG, PNG, GIF, WebP');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload/resident/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },
};

