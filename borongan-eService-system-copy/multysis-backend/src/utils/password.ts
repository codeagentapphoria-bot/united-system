import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a temporary password for new users
 * Format: 2 uppercase letters + 2 lowercase letters + 4 digits
 * Example: Ab12345678
 */
export const generateTempPassword = (): string => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Excluding l and o
  const digits = '0123456789';

  const getRandom = (chars: string) => chars.charAt(Math.floor(Math.random() * chars.length));

  return (
    getRandom(uppercase) +
    getRandom(lowercase) +
    getRandom(digits) +
    getRandom(digits) +
    getRandom(digits) +
    getRandom(digits) +
    getRandom(digits) +
    getRandom(digits)
  );
};

/**
 * Generate a 4-digit PIN
 */
export const generatePin = (): string => {
  const digits = '0123456789';
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return pin;
};
