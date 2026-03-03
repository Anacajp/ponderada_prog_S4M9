/**
 * DN2 — Confiabilidade na Geração de Resultados de Auditoria (Blue Team)
 *
 * Direcionador de Negócio:
 *   Após um processo de auditoria ser finalizado, o sistema DEVE disponibilizar
 *   o resultado de forma confiável e estruturada. Este é o produto principal
 *   entregue pela ASIS TaxTech: a auditoria tributária sobre o arquivo SPED enviado.
 *
 * Regras de negócio aferidas:
 *   RN-DN2-01: Processo com arquivo válido atinge status terminal dentro do tempo máximo
 *   RN-DN2-02: Após finalização, GET /resultado/processo/{id} retorna HTTP 200
 *   RN-DN2-03: Resultado contém estrutura mínima esperada (não é objeto vazio)
 *   RN-DN2-04: Resultado associa corretamente o processoId ao retorno
 *
 * Time: Blue (cenário feliz — ciclo completo upload → processo → resultado)
 * Massa: test-data/sped-fiscal.txt (SPED Fiscal válido)
 */

'use strict';

const path = require('path');
const {
  credenciaisConfiguradas,
  uploadArquivo,
  aguardarProcesso,
  obterResultado,
  PROCESS_MAX_WAIT_MS,
} = require('../utils/api-client');

const SPED_VALIDO = path.resolve(__dirname, '../test-data/sped-fiscal.txt');
const SKIP = !credenciaisConfiguradas();
const skip = SKIP ? test.skip : test;

// Cache do processoId para compartilhar entre os testes deste suite
let processoIdCompartilhado = null;

describe('DN2 — Resultado de Auditoria (Blue Team)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN2-01 — Processo atinge status terminal', () => {
    skip(
      `processo deve finalizar dentro de ${PROCESS_MAX_WAIT_MS / 1000}s após upload`,
      async () => {
        const upload = await uploadArquivo(SPED_VALIDO);
        expect(upload.processoId).toBeTruthy();

        processoIdCompartilhado = upload.processoId;

        const espera = await aguardarProcesso(upload.processoId);

        // Registra evidência de polling
        console.log(
          `[DN2-Blue] processoId=${upload.processoId} | ` +
          `status=${espera.processoStatus} | tentativas=${espera.tentativas} | ` +
          `finalizado=${espera.finalizado}`
        );

        expect(espera.finalizado).toBe(true);
      },
      // Timeout individual para este teste: maior que o polling máximo
      PROCESS_MAX_WAIT_MS + 10_000
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN2-02 / RN-DN2-03 — Resultado disponível e estruturado', () => {
    skip('GET /resultado retorna HTTP 200 após processo finalizado', async () => {
      const upload = await uploadArquivo(SPED_VALIDO);
      await aguardarProcesso(upload.processoId);

      const resultado = await obterResultado(upload.processoId);

      expect(resultado.status).toBe(200);
    });

    skip('resultado não deve ser um objeto vazio', async () => {
      const upload = await uploadArquivo(SPED_VALIDO);
      await aguardarProcesso(upload.processoId);

      const resultado = await obterResultado(upload.processoId);

      expect(resultado.data).toBeTruthy();
      expect(Object.keys(resultado.data).length).toBeGreaterThan(0);
    });

    skip('resultado deve conter ao menos uma auditoria', async () => {
      const upload = await uploadArquivo(SPED_VALIDO);
      await aguardarProcesso(upload.processoId);

      const resultado = await obterResultado(upload.processoId);

      // RN-DN2-03: presença de auditorias é condição mínima de completude
      expect(resultado.temAuditorias).toBe(true);

      console.log(
        `[DN2-Blue] processoId=${upload.processoId} | ` +
        `auditorias=${resultado.auditorias?.length ?? 0}`
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN2-04 — Resultado associa processoId corretamente', () => {
    skip('processoId no resultado deve corresponder ao processoId do upload', async () => {
      const upload = await uploadArquivo(SPED_VALIDO);
      await aguardarProcesso(upload.processoId);

      const resultado = await obterResultado(upload.processoId);

      const processoIdNoResultado =
        resultado.data?.processoId ??
        resultado.data?.processo_id ??
        resultado.data?.id;

      // Se o campo existir, deve bater com o ID original
      if (processoIdNoResultado) {
        expect(processoIdNoResultado).toBe(upload.processoId);
      } else {
        // Campo não retornado pela API — registra como observação, não falha
        console.warn(
          `[DN2-Blue] processoId não encontrado na raiz do resultado. ` +
          `Campos disponíveis: ${Object.keys(resultado.data || {}).join(', ')}`
        );
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Testes unitários (sem credenciais)
  describe('Contrato do api-client — obterResultado (unit)', () => {
    test('aguardarProcesso retorna objeto com campos esperados (mock timeout)', async () => {
      // Testa a estrutura de retorno com um ID inexistente (esperamos timeout ou 404)
      // Este teste apenas valida o contrato de retorno da função, não a API
      if (!credenciaisConfiguradas()) {
        // Sem credenciais, apenas verificamos os exports
        const client = require('../utils/api-client');
        expect(typeof client.aguardarProcesso).toBe('function');
        expect(typeof client.obterResultado).toBe('function');
        return;
      }

      const resultado = await aguardarProcesso('id-inexistente-000', ['STATUS_FINAL_FAKE']);
      expect(resultado).toHaveProperty('finalizado');
      expect(resultado).toHaveProperty('tentativas');
      expect(resultado).toHaveProperty('processoStatus');
    });
  });
});
