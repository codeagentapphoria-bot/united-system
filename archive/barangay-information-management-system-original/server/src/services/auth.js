import User from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { generateToken } from "../config/jwt.js";
import { sendEmail } from "../utils/email.js";
import crypto from "crypto";

export const loginUser = async (email, password) => {
  const user = await User.findByEmail(email);

  if (!user || !(await User.comparePassword(password, user.password))) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.target_id) {
    throw new ApiError(400, "User is missing target_id");
  }
  const token = generateToken({
    userId: user.id,
    email: user.email,
    target_type: user.target_type,
    target_id: user.target_id,
    role: user.role,
    name: user.full_name,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      target_type: user.target_type,
      target_id: user.target_id,
      role: user.role,
      name: user.full_name,
      picture_path: user.picture_path,
    },
  };
};

export const refreshToken = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (!user.target_id) {
    throw new ApiError(400, "User is missing target_id");
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    target_type: user.target_type,
    target_id: user.target_id,
    role: user.role,
    name: user.full_name,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      target_type: user.target_type,
      target_id: user.target_id,
      role: user.role,
      name: user.full_name,
      picture_path: user.picture_path,
    },
  };
};

export const forgotPassword = async (email) => {
  const user = await User.findByEmail(email);

  if (!user) {
    throw new ApiError(404, "User not found with this email");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save reset token to user
  await User.updateResetToken(user.id, resetToken, resetTokenExpiry);

  // Send email with reset code
  const resetCode = resetToken.substring(0, 6).toUpperCase();

  const emailContent = {
    to: email,
    subject: "Password Reset Code - BIMS",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIMS Password Reset</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .reset-code {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            border: 2px solid #4CAF50;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .reset-code h2 {
            color: #1f2937;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 20px 0;
        }
        .code-display {
            background-color: #ffffff;
            border: 2px dashed #4CAF50;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
        }
        .code-display h1 {
            color: #4CAF50;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            margin: 0;
            font-family: 'Courier New', monospace;
        }
        .expiry-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 25px 0;
        }
        .expiry-note p {
            color: #92400e;
            font-size: 14px;
            margin: 0;
            text-align: center;
        }
        .security-note {
            background-color: #fee2e2;
            border: 1px solid #ef4444;
            border-radius: 8px;
            padding: 15px;
            margin: 25px 0;
        }
        .security-note p {
            color: #991b1b;
            font-size: 14px;
            margin: 0;
            text-align: center;
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .header h1 {
                font-size: 24px;
            }
            .code-display h1 {
                font-size: 28px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
            <p>Barangay Information Management System</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
                Hello,
            </h2>
            
            <p style="color: #6b7280; font-size: 16px; margin: 0 0 20px 0;">
                You have requested to reset your password for the Barangay Information Management System (BIMS).
            </p>
            
            <div class="reset-code">
                <h2>Your Reset Code</h2>
                <div class="code-display">
                    <h1>${resetCode}</h1>
                </div>
                <p style="color: #4b5563; font-size: 14px; margin: 0;">
                    Enter this code in the password reset form
                </p>
            </div>
            
            <div class="expiry-note">
                <p><strong>⏰ This code will expire in 10 minutes</strong></p>
            </div>
            
            <div class="security-note">
                <p><strong>🔒 Security:</strong> If you didn't request this password reset, please ignore this email and contact your administrator.</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>BIMS Team</strong></p>
            <p>Barangay Information Management System</p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>`,
    text: `Password Reset Code: ${resetCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this password reset, please ignore this email.`,
  };

  await sendEmail(emailContent);

  return { message: "Reset code sent to email" };
};

export const resetPassword = async (email, resetCode, newPassword) => {
  const user = await User.findByEmail(email);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.reset_token || !user.reset_token_expiry) {
    throw new ApiError(
      400,
      "No reset token found. Please request a new reset code."
    );
  }

  if (new Date() > user.reset_token_expiry) {
    throw new ApiError(
      400,
      "Reset token has expired. Please request a new reset code."
    );
  }

  // Check if reset code matches (first 6 characters of reset token)
  const expectedCode = user.reset_token.substring(0, 6).toUpperCase();
  if (resetCode.toUpperCase() !== expectedCode) {
    throw new ApiError(400, "Invalid reset code");
  }

  // Update password and clear reset token
  await User.updatePassword(user.id, newPassword);
  await User.clearResetToken(user.id);

  return { message: "Password reset successful" };
};
