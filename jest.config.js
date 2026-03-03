/**
 * Jest Configuration — ASIS TaxTech Business Drivers as Code
 *
 * Separação por DN (Direcionador de Negócio) e por time (Blue/Red).
 * Timeout alto para acomodar polling assíncrono da API de staging.
 */
require('dotenv').config();

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: parseInt(process.env.TEST_TIMEOUT || '60000', 10),
  setupFiles: ['dotenv/config'],
  collectCoverageFrom: ['utils/**/*.js'],
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './reports/html',
        filename: 'report.html',
        openReport: false,
        pageTitle: 'ASIS TaxTech — Business Drivers as Code',
      },
    ],
  ],
  // Variáveis globais disponíveis nos testes
  globals: {
    UPLOAD_BASE_URL: process.env.UPLOAD_BASE_URL || '',
    CORE_BASE_URL: process.env.CORE_BASE_URL || '',
    RESULTADO_BASE_URL: process.env.RESULTADO_BASE_URL || '',
  },
};
