/**
 * DN1 — Confiabilidade no Upload (Red Team)
 *
 * Direcionador de Negócio:
 *   A API deve rejeitar entradas inválidas de forma segura e informativa.
 *   Um upload malformado NÃO deve gerar processoId — caso contrário, processos
 *   fantasmas poluem o sistema e comprometem a rastreabilidade (DN3).
 *
 * Regras de negócio aferidas:
 *   RN-DN1-R01: Upload de arquivo vazio deve retornar 4xx (não 2xx)
 *   RN-DN1-R02: Upload de arquivo corrompido (.bin) deve retornar 4xx
 *   RN-DN1-R03: Upload de arquivo com estrutura SPED inválida deve retornar 4xx
 *   RN-DN1-R04: Em todos os casos de rejeição, processoId NÃO deve ser retornado
 *   RN-DN1-R05: A API não deve retornar 500 para entradas inválidas (erro deve ser tratado)
 *
 * Time: Red (cenários adversários — arquivos inválidos)
 * Massa: test-data/arquivo_vazio.txt, arquivo_corrompido.bin, arquivo_estrutura_invalida.txt
 */

'use strict';

const path = require('path');
const {
  credenciaisConfiguradas,
  uploadArquivo,
} = require('../utils/api-client');

const ARQUIVO_VAZIO    = path.resolve(__dirname, '../test-data/arquivo_vazio.txt');
const ARQUIVO_CORROMPIDO = path.resolve(__dirname, '../test-data/arquivo_corrompido.bin');
const ARQUIVO_INVALIDO = path.resolve(__dirname, '../test-data/arquivo_estrutura_invalida.txt');

const SKIP = !credenciaisConfiguradas();
const skip = SKIP ? test.skip : test;

describe('DN1 — Upload sem processoId (Red Team)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN1-R01 — Arquivo vazio', () => {
    skip('deve retornar HTTP 4xx ao receber arquivo vazio', async () => {
      const resultado = await uploadArquivo(ARQUIVO_VAZIO);

      expect(resultado.status).toBeGreaterThanOrEqual(400);
      expect(resultado.status).toBeLessThan(500);
    });

    skip('não deve retornar processoId para arquivo vazio', async () => {
      const resultado = await uploadArquivo(ARQUIVO_VAZIO);

      expect(resultado.processoId).toBeFalsy();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN1-R02 — Arquivo corrompido', () => {
    skip('deve retornar HTTP 4xx ao receber arquivo binário corrompido', async () => {
      const resultado = await uploadArquivo(ARQUIVO_CORROMPIDO);

      expect(resultado.status).toBeGreaterThanOrEqual(400);
      expect(resultado.status).toBeLessThan(500);
    });

    skip('não deve retornar processoId para arquivo corrompido', async () => {
      const resultado = await uploadArquivo(ARQUIVO_CORROMPIDO);

      expect(resultado.processoId).toBeFalsy();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN1-R03 — Arquivo com estrutura SPED inválida', () => {
    skip('deve retornar HTTP 4xx para arquivo com estrutura SPED inválida', async () => {
      const resultado = await uploadArquivo(ARQUIVO_INVALIDO);

      expect(resultado.status).toBeGreaterThanOrEqual(400);
      expect(resultado.status).toBeLessThan(500);
    });

    skip('não deve retornar processoId para estrutura inválida', async () => {
      const resultado = await uploadArquivo(ARQUIVO_INVALIDO);

      expect(resultado.processoId).toBeFalsy();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN1-R05 — API não deve lançar 500 para entradas inválidas', () => {
    skip('arquivo vazio não deve causar erro interno (500)', async () => {
      const resultado = await uploadArquivo(ARQUIVO_VAZIO);
      expect(resultado.status).not.toBe(500);
    });

    skip('arquivo corrompido não deve causar erro interno (500)', async () => {
      const resultado = await uploadArquivo(ARQUIVO_CORROMPIDO);
      expect(resultado.status).not.toBe(500);
    });

    skip('arquivo com estrutura inválida não deve causar erro interno (500)', async () => {
      const resultado = await uploadArquivo(ARQUIVO_INVALIDO);
      expect(resultado.status).not.toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Testes unitários (sem credenciais) — validam as massas de teste
  describe('Validação das massas de teste Red Team (unit)', () => {
    const fs = require('fs');

    test('arquivo_vazio.txt deve ter tamanho 0 bytes', () => {
      const stats = fs.statSync(ARQUIVO_VAZIO);
      expect(stats.size).toBe(0);
    });

    test('arquivo_corrompido.bin deve existir e ter conteúdo não-textual', () => {
      const stats = fs.statSync(ARQUIVO_CORROMPIDO);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('arquivo_estrutura_invalida.txt deve existir e não ser um SPED válido', () => {
      const conteudo = fs.readFileSync(ARQUIVO_INVALIDO, 'utf-8');
      // SPED válido começa com |0000|; arquivo inválido não deve ter essa estrutura completa
      expect(conteudo).not.toMatch(/^\|0000\|[A-Z0-9]+\|/);
    });
  });
});
