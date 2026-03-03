/**
 * DN1 — Confiabilidade no Upload (Blue Team)
 *
 * Direcionador de Negócio:
 *   Todo arquivo SPED enviado via POST /upload deve retornar um processoId
 *   válido e não nulo, garantindo que a jornada de auditoria possa continuar.
 *   A confiabilidade no ponto de entrada é o fundamento de toda a rastreabilidade.
 *
 * Regras de negócio aferidas:
 *   RN-DN1-01: Upload com arquivo SPED válido retorna HTTP 200/201
 *   RN-DN1-02: Resposta contém processoId não nulo
 *   RN-DN1-03: processoId retornado permite consulta imediata de status
 *   RN-DN1-04: Tempo de resposta do upload inferior a 30 segundos
 *
 * Time: Blue (cenário feliz — arquivo SPED válido)
 * Massa: test-data/sped-fiscal.txt (SPED Fiscal válido)
 */

'use strict';

const path = require('path');
const {
  credenciaisConfiguradas,
  uploadArquivo,
  consultarProcesso,
} = require('../utils/api-client');

const SPED_VALIDO = path.resolve(__dirname, '../test-data/sped-fiscal.txt');
const SKIP = !credenciaisConfiguradas();
const skip = SKIP ? test.skip : test;

describe('DN1 — Upload Confiável (Blue Team)', () => {
  let contexto = {};

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN1-01 / RN-DN1-02 — Upload retorna processoId válido', () => {
    skip('deve responder HTTP 200 ou 201 ao receber arquivo SPED válido', async () => {
      const inicio = Date.now();
      const resultado = await uploadArquivo(SPED_VALIDO);
      const duracao = Date.now() - inicio;

      // Armazena para testes subsequentes neste suite
      contexto.processoId = resultado.processoId;
      contexto.arquivoId  = resultado.arquivoId;
      contexto.duracao    = duracao;

      expect([200, 201]).toContain(resultado.status);
    });

    skip('deve retornar processoId não nulo e não vazio', async () => {
      const resultado = await uploadArquivo(SPED_VALIDO);

      expect(resultado.processoId).toBeTruthy();
      expect(typeof resultado.processoId).toBe('string');
      expect(resultado.processoId.length).toBeGreaterThan(0);

      contexto.processoId = resultado.processoId;
    });

    skip('deve retornar arquivoId para rastreabilidade (DN3)', async () => {
      const resultado = await uploadArquivo(SPED_VALIDO);

      // arquivoId é a âncora de rastreabilidade (DN3)
      expect(resultado.arquivoId).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN1-03 — processoId permite consulta imediata de status', () => {
    skip('deve ser possível consultar /processo/{processoId} logo após o upload', async () => {
      const upload = await uploadArquivo(SPED_VALIDO);
      expect(upload.processoId).toBeTruthy();

      const processo = await consultarProcesso(upload.processoId);

      // Processo pode estar em qualquer status inicial (não deve ser 404)
      expect(processo.status).not.toBe(404);
      expect(processo.processoStatus).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN1-04 — Tempo de resposta do upload', () => {
    skip('upload deve completar em menos de 30 segundos (arquivo ~350 KB)', async () => {
      const inicio = Date.now();
      await uploadArquivo(SPED_VALIDO);
      const duracao = Date.now() - inicio;

      expect(duracao).toBeLessThan(30_000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Testes unitários (não requerem credenciais) — validam a lógica do cliente
  describe('Contrato do api-client (unit — sem credenciais)', () => {
    test('credenciaisConfiguradas() retorna boolean', () => {
      expect(typeof credenciaisConfiguradas()).toBe('boolean');
    });

    test('uploadArquivo rejeita se o arquivo não existir', async () => {
      await expect(
        uploadArquivo('/caminho/inexistente/arquivo.txt')
      ).rejects.toThrow();
    });
  });
});
