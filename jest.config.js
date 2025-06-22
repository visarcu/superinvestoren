// jest.config.js - Jest Configuration für RAG Tests
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: [
      '**/__tests__/**/*.+(ts|tsx|js)',
      '**/*.(test|spec).+(ts|tsx|js)'
    ],
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest'
    },
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapping: {
      '^@/(.*)$': '<rootDir>/src/$1'
    },
    testTimeout: 30000, // 30 seconds for RAG tests
    globalSetup: '<rootDir>/tests/globalSetup.js',
    globalTeardown: '<rootDir>/tests/globalTeardown.js'
  }
  
  // tests/setup.js - Test Setup File
  global.console = {
    ...console,
    // uncomment to ignore a specific log level
    // log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
  
  // Mock environment variables for tests
  process.env.NODE_ENV = 'test'
  process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'test-key'
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'
  
  // tests/globalSetup.js - Global Test Setup
  module.exports = async () => {
    console.log('🧪 Setting up RAG tests...')
    
    // Check if we have real API keys
    const hasRealKeys = process.env.PINECONE_API_KEY?.startsWith('pk-') && 
                       process.env.OPENAI_API_KEY?.startsWith('sk-')
    
    if (!hasRealKeys) {
      console.log('⚠️ Using mock API keys - some tests will be skipped')
    }
    
    // Set test index name
    process.env.TEST_INDEX_NAME = 'finclue-test-docs'
  }
  
  // tests/globalTeardown.js - Global Test Cleanup
  module.exports = async () => {
    console.log('🧹 Cleaning up RAG tests...')
    // Add any cleanup logic here
  }