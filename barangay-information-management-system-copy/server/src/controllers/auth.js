import { loginUser, forgotPassword, resetPassword, refreshToken, logoutUser } from "../services/auth.js";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, refreshToken: rawRefresh, user } = await loginUser(email, password);

    res.cookie('bims_refresh_token', rawRefresh, REFRESH_COOKIE_OPTIONS);

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
    const rawToken = req.cookies?.bims_refresh_token;
    if (!rawToken) {
      return res.status(401).json({ status: "error", message: "No refresh token" });
    }

    const { token, refreshToken: newRawRefresh, user } = await refreshToken(rawToken);

    res.cookie('bims_refresh_token', newRawRefresh, REFRESH_COOKIE_OPTIONS);

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

export const logout = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.bims_refresh_token;
    await logoutUser(rawToken);

    res.clearCookie('bims_refresh_token', {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 0,
    });

    res.status(200).json({ status: "success", message: "Logged out" });
  } catch (err) {
    next(err);
  }
};
