/**
 * DN2 — Confiabilidade na Geração de Resultados de Auditoria (Red Team)
 *
 * Direcionador de Negócio:
 *   A API deve se comportar de forma previsível e segura em condições adversas.
 *   Tentativas de obter resultado de processos inexistentes, não finalizados ou
 *   com IDs malformados devem ser tratadas graciosamente, sem erros 500.
 *
 * Regras de negócio aferidas:
 *   RN-DN2-R01: processoId inexistente retorna 404 (não 500)
 *   RN-DN2-R02: processoId com formato inválido retorna 4xx (não 500)
 *   RN-DN2-R03: Resultado NÃO deve estar disponível para processo ainda em andamento
 *   RN-DN2-R04: auditoriaId inexistente retorna 404 (não 500)
 *
 * Time: Red (cenários adversários — IDs inválidos, processo não finalizado)
 */

'use strict';

const path = require('path');
const {
  credenciaisConfiguradas,
  uploadArquivo,
  obterResultado,
  obterResultadoAuditoria,
} = require('../utils/api-client');

const SPED_VALIDO = path.resolve(__dirname, '../test-data/sped-fiscal.txt');
const SKIP = !credenciaisConfiguradas();
const skip = SKIP ? test.skip : test;

const PROCESSO_ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000';
const PROCESSO_ID_MALFORMADO  = 'nao-e-um-uuid-valido!!!';
const AUDITORIA_ID_INEXISTENTE = '00000000-0000-0000-0000-000000000001';

describe('DN2 — Resultado de Auditoria (Red Team)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN2-R01 — processoId inexistente', () => {
    skip('GET /resultado com processoId inexistente deve retornar 404', async () => {
      const resultado = await obterResultado(PROCESSO_ID_INEXISTENTE);

      expect(resultado.status).toBe(404);
    });

    skip('não deve retornar 500 para processoId inexistente', async () => {
      const resultado = await obterResultado(PROCESSO_ID_INEXISTENTE);

      expect(resultado.status).not.toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN2-R02 — processoId malformado', () => {
    skip('GET /resultado com processoId malformado deve retornar 4xx', async () => {
      const resultado = await obterResultado(PROCESSO_ID_MALFORMADO);

      expect(resultado.status).toBeGreaterThanOrEqual(400);
      expect(resultado.status).toBeLessThan(500);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN2-R03 — Resultado não disponível para processo em andamento', () => {
    skip(
      'imediatamente após upload, resultado deve retornar 404 ou indicar processo pendente',
      async () => {
        // Upload inicia o processo; sem aguardar finalização, resultado não deve estar disponível
        const upload = await uploadArquivo(SPED_VALIDO);
        expect(upload.processoId).toBeTruthy();

        // Consulta resultado IMEDIATAMENTE (sem polling)
        const resultado = await obterResultado(upload.processoId);

        // Regra: resultado de processo não finalizado deve ser 404 ou ter indicação de pendência
        const processoNaoPronto =
          resultado.status === 404 ||
          resultado.status === 202 ||
          resultado.data?.status === 'PENDENTE' ||
          resultado.data?.status === 'EM_PROCESSAMENTO' ||
          resultado.temAuditorias === false;

        console.log(
          `[DN2-Red] processoId=${upload.processoId} | ` +
          `status HTTP=${resultado.status} | ` +
          `processoStatus=${resultado.data?.status ?? 'N/A'}`
        );

        expect(processoNaoPronto).toBe(true);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('RN-DN2-R04 — auditoriaId inexistente', () => {
    skip('GET /resultado/.../auditoria com id inexistente deve retornar 404', async () => {
      const resultado = await obterResultadoAuditoria(
        PROCESSO_ID_INEXISTENTE,
        AUDITORIA_ID_INEXISTENTE
      );

      expect(resultado.status).toBe(404);
    });

    skip('GET /resultado/.../auditoria com IDs inválidos não deve retornar 500', async () => {
      const resultado = await obterResultadoAuditoria(
        PROCESSO_ID_MALFORMADO,
        'auditoria-invalida'
      );

      expect(resultado.status).not.toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Testes unitários (sem credenciais) — validam constantes e exports
  describe('Constantes e contrato Red Team (unit)', () => {
    test('IDs inválidos usados nos testes são strings não vazias', () => {
      expect(PROCESSO_ID_INEXISTENTE).toBeTruthy();
      expect(PROCESSO_ID_MALFORMADO).toBeTruthy();
      expect(AUDITORIA_ID_INEXISTENTE).toBeTruthy();
    });

    test('obterResultadoAuditoria está exportado no api-client', () => {
      const { obterResultadoAuditoria: fn } = require('../utils/api-client');
      expect(typeof fn).toBe('function');
    });
  });
});
