import api from "@/utils/api";

export const accountsService = {
  // Get all users for the current target (municipality or barangay)
  async getUsers() {
    try {
      const response = await api.get("/users");
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch users");
    }
  },

  // Get users by target type and ID
  async getUsersByTarget(targetType, targetId) {
    try {
      const response = await api.get(`/target/${targetType}/${targetId}/users`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch users");
    }
  },

  // Create a new user
  async createUser(userData) {
    try {
      let response;
      
      // Check if userData is FormData (for file uploads)
      if (userData instanceof FormData) {
        response = await api.post("/user", userData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await api.post("/user", userData);
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to create user");
    }
  },

  // Update an existing user
  async updateUser(userId, userData) {
    try {
      let response;
      
      // Check if userData is FormData (for file uploads)
      if (userData instanceof FormData) {
        response = await api.put(`/${userId}/user`, userData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await api.put(`/${userId}/user`, userData);
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update user");
    }
  },

  // Delete a user
  async deleteUser(userId) {
    try {
      const response = await api.delete(`/${userId}/user`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to delete user");
    }
  },

  // Get user info by ID
  async getUserInfo(userId) {
    try {
      const response = await api.get(`/${userId}/user`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch user info"
      );
    }
  },

  // Get user by email
  async getUserByEmail(email) {
    try {
      const response = await api.get(
        `/user/by-email?email=${encodeURIComponent(email)}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch user by email"
      );
    }
  },
};
