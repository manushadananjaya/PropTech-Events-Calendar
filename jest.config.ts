import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./", // Path to your Next.js app
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"], // Path to setup file
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1", // Alias for module resolution
  },
  testEnvironment: "jest-environment-jsdom", // Browser-like testing environment
};

export default createJestConfig(customJestConfig);
