import { loginUser, forgotPassword, resetPassword, refreshToken } from "../services/auth.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await loginUser(email, password);

    res.status(200).json({
      status: "success",
      token,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const refreshUserToken = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { token, user } = await refreshToken(userId);

    res.status(200).json({
      status: "success",
      token,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await forgotPassword(email);

    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const resetPasswordWithCode = async (req, res, next) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    const result = await resetPassword(email, resetCode, newPassword);

    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};
