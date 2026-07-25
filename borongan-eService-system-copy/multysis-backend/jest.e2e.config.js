module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.e2e.ts', '**/*.e2e.test.ts'],
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  passWithNoTests: true,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          types: ['jest', 'node'],
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
