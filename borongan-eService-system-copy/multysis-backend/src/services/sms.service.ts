import twilio from 'twilio';
import { addDevLog } from './dev.service';

// Twilio configuration from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID?.trim();
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER?.trim();

// Initialize Twilio client (only if valid credentials are provided)
let twilioClient: twilio.Twilio | null = null;

// Validate Twilio credentials before initializing
const isTwilioConfigured = (): boolean => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return false;
  }

  // Twilio Account SID must start with "AC"
  if (!TWILIO_ACCOUNT_SID.startsWith('AC')) {
    console.warn('⚠️  Invalid TWILIO_ACCOUNT_SID format. Account SID must start with "AC".');
    return false;
  }

  return true;
};

if (isTwilioConfigured()) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  } catch (error: any) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Twilio initialization failed. Please check your Twilio credentials.');
    }
    console.warn(
      '⚠️  Continuing without Twilio (development mode). SMS functionality will not work.'
    );
  }
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Twilio credentials not configured. SMS functionality will not work.');
  } else {
    console.warn(
      '⚠️  Twilio credentials not configured. SMS functionality disabled (development mode).'
    );
  }
}

/**
 * Check if OTP is enabled via environment variable
 * @returns true if OTP is enabled, false otherwise
 */
export const isOtpEnabled = (): boolean => {
  // Check environment variable first (explicit control)
  const otpEnabledEnv = process.env.OTP_ENABLED?.toLowerCase();
  if (otpEnabledEnv === 'false' || otpEnabledEnv === '0' || otpEnabledEnv === 'no') {
    return false;
  }
  if (otpEnabledEnv === 'true' || otpEnabledEnv === '1' || otpEnabledEnv === 'yes') {
    // If explicitly enabled, also check if Twilio is configured
    return twilioClient !== null && isTwilioConfigured();
  }

  // Default: check if Twilio is configured (backward compatibility)
  return twilioClient !== null && isTwilioConfigured();
};

/**
 * Check if Twilio is configured and available
 * @returns true if Twilio is properly configured, false otherwise
 */
export const isTwilioAvailable = (): boolean => {
  return twilioClient !== null && isTwilioConfigured();
};

/**
 * Format Philippine phone number from 09XXXXXXXXX to +639XXXXXXXXX
 * @param phoneNumber - Phone number in format 09XXXXXXXXX or +639XXXXXXXXX
 * @returns Formatted phone number in +639XXXXXXXXX format
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any whitespace
  const cleaned = phoneNumber.trim();

  // If already in international format, return as is
  if (cleaned.startsWith('+639')) {
    return cleaned;
  }

  // If starts with 09, convert to +639
  if (cleaned.startsWith('09')) {
    return `+63${cleaned.substring(1)}`;
  }

  // If starts with 639 (without +), add +
  if (cleaned.startsWith('639')) {
    return `+${cleaned}`;
  }

  // If starts with +63 but not +639, assume it's correct format
  if (cleaned.startsWith('+63')) {
    return cleaned;
  }

  // Default: assume it needs +63 prefix
  return `+63${cleaned}`;
};

/**
 * Send OTP via SMS using Twilio
 * @param phoneNumber - Phone number in format 09XXXXXXXXX or +639XXXXXXXXX
 * @param otp - 6-digit OTP code
 * @throws Error if Twilio is not configured or SMS sending fails
 */
export const sendOtpSms = async (phoneNumber: string, otp: string): Promise<void> => {
  if (!twilioClient) {
    throw new Error(
      'Twilio is not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.'
    );
  }

  if (!TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured.');
  }

  // Format phone number to international format
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Create SMS message
  const message = `Your City of Borongan login code is: ${otp}. Valid for 5 minutes.`;

  try {
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(`✅ OTP SMS sent to ${formattedPhone}`);
  } catch (error: any) {
    console.error('❌ Failed to send OTP SMS:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Unknown error';

    if (error.code === 21211) {
      errorMessage = 'Invalid "To" phone number. Please check the phone number format.';
    } else if (error.code === 21212) {
      errorMessage =
        'Invalid "From" phone number. Please verify your TWILIO_PHONE_NUMBER in environment variables.';
    } else if (error.code === 21408) {
      errorMessage =
        'Permission to send SMS denied. Your Twilio account may be a trial account or the recipient number is not verified.';
    } else if (error.message?.includes('cannot be sent with the current combination')) {
      errorMessage =
        'Cannot send SMS with this phone number combination. This usually means:\n' +
        '1. You are using a Twilio trial account (can only send to verified numbers)\n' +
        '2. Your "From" number is not verified for international SMS\n' +
        '3. Your account does not have international SMS enabled\n' +
        'Please verify your Twilio account settings and phone number capabilities.';
    }

    // Log SMS failure to dev dashboard
    addDevLog('error', 'SMS sending failed', {
      phoneNumber: formattedPhone,
      error: errorMessage,
      errorCode: error.code,
    });

    throw new Error(`Failed to send OTP SMS: ${errorMessage}`);
  }
};
