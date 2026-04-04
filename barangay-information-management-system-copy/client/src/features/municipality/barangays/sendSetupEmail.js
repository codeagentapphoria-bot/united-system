import api from "@/utils/api";
import { buildSetupLink } from "./buildSetupLink";

export async function sendSetupEmail({
  barangayName,
  barangayCode,
  fullName,
  email,
  toast,
  barangayId,
}) {
  const setupLink = await buildSetupLink({
    barangayName,
    barangayCode,
    barangayId,
    fullName,
    email,
  });
  
  const subject = `Welcome to BIMS - Complete Your Barangay Admin Setup`;
  
  const body = `Hi ${fullName},

You have been registered as the admin for Barangay ${barangayName} (${barangayCode}) in the Barangay Information Management System (BIMS).

To complete your account setup, please click the link below:
${setupLink}

This link will allow you to:
• Set your password
• Upload your profile picture
• Complete your account setup

If you did not expect this email, you can safely ignore it.

Best regards,
BIMS Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIMS Account Setup</title>
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
        .welcome-section {
            margin-bottom: 30px;
        }
        .welcome-section h2 {
            color: #1f2937;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 15px 0;
        }
        .welcome-section p {
            color: #6b7280;
            font-size: 16px;
            margin: 0 0 20px 0;
        }
        .barangay-info {
            background-color: #f3f4f6;
            border-left: 4px solid #4CAF50;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        .barangay-info h3 {
            color: #1f2937;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 10px 0;
        }
        .barangay-info p {
            color: #4b5563;
            font-size: 16px;
            margin: 5px 0;
        }
        .setup-button {
            display: inline-block;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 4px 6px -1px rgba(76, 175, 80, 0.3);
            transition: all 0.3s ease;
        }
        .setup-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px -1px rgba(76, 175, 80, 0.4);
        }
        .features-list {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .features-list h4 {
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 15px 0;
        }
        .features-list ul {
            margin: 0;
            padding-left: 20px;
        }
        .features-list li {
            color: #4b5563;
            font-size: 14px;
            margin: 8px 0;
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
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 25px 0;
        }
        .security-note p {
            color: #92400e;
            font-size: 14px;
            margin: 0;
            text-align: center;
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
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to BIMS</h1>
            <p>Barangay Information Management System</p>
        </div>
        
        <div class="content">
            <div class="welcome-section">
                <h2>Hello ${fullName}!</h2>
                <p>You have been successfully registered as the administrator for your barangay in the Barangay Information Management System (BIMS).</p>
            </div>
            
            <div class="barangay-info">
                <h3>Your Barangay Details</h3>
                <p><strong>Barangay Name:</strong> ${barangayName}</p>
                <p><strong>Barangay Code:</strong> ${barangayCode}</p>
            </div>
            
            <div class="features-list">
                <h4>Complete your account setup to access:</h4>
                <ul>
                    <li>Resident management and records</li>
                    <li>Household information tracking</li>
                    <li>Barangay statistics and reports</li>
                    <li>Document generation and certificates</li>
                    <li>Administrative tools and settings</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${setupLink}" class="setup-button text-white" style="color: white;">
                    Complete Account Setup
                </a>
            </div>
            
            <div class="security-note">
                <p><strong>Security Note:</strong> If you did not expect this email, please ignore it and contact your system administrator.</p>
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
</html>`;

  const SMTP_FROM = import.meta.env.VITE_SMTP_FROM || undefined;
  
  try {
    // Validate email format before sending
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Show loading state
    toast({ 
      title: "Sending setup email...", 
      description: "Please wait while we send the email to the barangay admin." 
    });

    const response = await api.post("/send-setup-email", {
      to: email,
      subject,
      body,
      html,
      from: SMTP_FROM,
    });

    // Success notification with more details
    toast({ 
      title: "Setup email sent successfully!", 
      description: `Email sent to ${email}. The admin has 48 hours to complete setup.`,
      duration: 5000
    });

    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error("Email sending error:", error);
    
    let errorMessage = "Failed to send setup email";
    let errorDescription = "Please try again or contact support if the problem persists.";
    
    // Provide specific error messages based on error type
    if (error.response?.status === 400) {
      errorMessage = "Invalid email address";
      errorDescription = "Please check the email format and try again.";
    } else if (error.response?.status === 500) {
      errorMessage = "Email service temporarily unavailable";
      errorDescription = "Our email service is experiencing issues. Please try again in a few minutes.";
    } else if (error.message === "Invalid email format") {
      errorMessage = "Invalid email format";
      errorDescription = "Please enter a valid email address.";
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = "Network connection error";
      errorDescription = "Please check your internet connection and try again.";
    } else if (error.response?.data?.message?.includes('SMTP')) {
      errorMessage = "Email server configuration error";
      errorDescription = "There's an issue with our email server. Please contact support.";
    }

    toast({ 
      title: errorMessage, 
      description: errorDescription,
      variant: "destructive",
      duration: 7000
    });

    return { success: false, error: errorMessage };
  }
}
