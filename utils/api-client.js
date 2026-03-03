/**
 * utils/api-client.js — Cliente Canônico da API ASIS TaxTech
 *
 * Centraliza toda comunicação com a API de staging da ASIS.
 * Todos os testes devem usar este cliente para garantir consistência
 * de headers, tratamento de erros e rastreabilidade.
 *
 * Endpoints cobertos:
 *   POST /upload                                          → DN1, DN3
 *   GET  /processo/{processoId}                          → DN1, DN2, DN3
 *   GET  /resultado/processo/{processoId}                → DN2, DN3
 *   GET  /resultado/processo/{processoId}/auditoria/{id} → DN3
 *   GET  /arquivo/{arquivoId}                            → DN3
 */

'use strict';

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// ─── Configuração de ambiente ─────────────────────────────────────────────────
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || process.env.API_UPLOAD_URL || '';
const CORE_BASE_URL   = process.env.CORE_BASE_URL   || process.env.API_CORE_URL   || '';
const RESULTADO_BASE_URL = process.env.RESULTADO_BASE_URL || process.env.API_RESULTADO_URL || '';

const APP_KEY     = process.env.APP_KEY     || '';
const ACCOUNT_KEY = process.env.ACCOUNT_KEY || '';

const PROCESS_MAX_WAIT_MS   = (parseInt(process.env.PROCESS_MAX_WAIT_SECONDS || '120', 10)) * 1000;
const PROCESS_POLL_INTERVAL = parseInt(process.env.PROCESS_POLL_INTERVAL_MS || '3000', 10);

// ─── Headers de autenticação ──────────────────────────────────────────────────
function authHeaders() {
  return {
    'app-key': APP_KEY,
    'account-key': ACCOUNT_KEY,
  };
}

/**
 * Verifica se as credenciais estão configuradas.
 * Testes podem chamar isso para decidir se pulam (skip) ou falham.
 */
function credenciaisConfiguradas() {
  return Boolean(APP_KEY && ACCOUNT_KEY && UPLOAD_BASE_URL && CORE_BASE_URL && RESULTADO_BASE_URL);
}

// ─── DN1 / DN3: Upload de arquivo SPED ───────────────────────────────────────

/**
 * Faz upload de um arquivo SPED para a API.
 *
 * Regra de negócio (DN1):
 *   Todo upload bem-sucedido DEVE retornar um processoId não nulo.
 *
 * @param {string} caminhoArquivo - Caminho absoluto ou relativo do arquivo
 * @param {string} [nomeArquivo]  - Nome a exibir no upload (default: basename)
 * @returns {Promise<{ processoId: string, arquivoId: string, status: number, data: object }>}
 */
async function uploadArquivo(caminhoArquivo, nomeArquivo) {
  const form = new FormData();
  const nome = nomeArquivo || path.basename(caminhoArquivo);
  form.append('file', fs.createReadStream(caminhoArquivo), { filename: nome });

  const response = await axios.post(
    `${UPLOAD_BASE_URL}/upload`,
    form,
    {
      headers: {
        ...authHeaders(),
        ...form.getHeaders(),
      },
      validateStatus: () => true, // nunca lançar exceção de HTTP; deixar o teste decidir
    }
  );

  return {
    status: response.status,
    data: response.data,
    processoId: response.data?.processoId ?? response.data?.processo_id ?? null,
    arquivoId: response.data?.arquivoId ?? response.data?.arquivo_id ?? null,
  };
}

// ─── DN1 / DN2 / DN3: Consulta de processo com polling ───────────────────────

/**
 * Consulta o status atual de um processo (sem polling).
 *
 * @param {string} processoId
 * @returns {Promise<{ status: number, data: object, processoStatus: string }>}
 */
async function consultarProcesso(processoId) {
  const response = await axios.get(
    `${CORE_BASE_URL}/processo/${processoId}`,
    {
      headers: authHeaders(),
      validateStatus: () => true,
    }
  );

  return {
    status: response.status,
    data: response.data,
    processoStatus: response.data?.status ?? response.data?.situacao ?? null,
  };
}

/**
 * Aguarda um processo atingir status terminal (FINALIZADO ou equivalente de erro)
 * fazendo polling periódico.
 *
 * Regra de negócio (DN2 / DN3):
 *   Um processo de auditoria DEVE atingir um status terminal dentro do tempo máximo configurado.
 *
 * @param {string} processoId
 * @param {string[]} [statusTerminais] - Lista de status que encerram o polling
 * @returns {Promise<{ finalizado: boolean, processoStatus: string, tentativas: number, data: object }>}
 */
async function aguardarProcesso(processoId, statusTerminais = ['FINALIZADO', 'CONCLUIDO', 'ERRO', 'FALHA']) {
  const inicio = Date.now();
  let tentativas = 0;
  let ultimaResposta = null;

  while (Date.now() - inicio < PROCESS_MAX_WAIT_MS) {
    tentativas += 1;
    const resultado = await consultarProcesso(processoId);
    ultimaResposta = resultado;

    const statusNormalizado = (resultado.processoStatus || '').toUpperCase();
    if (statusTerminais.some((s) => statusNormalizado.includes(s))) {
      return {
        finalizado: true,
        processoStatus: resultado.processoStatus,
        tentativas,
        data: resultado.data,
      };
    }

    await new Promise((r) => setTimeout(r, PROCESS_POLL_INTERVAL));
  }

  return {
    finalizado: false,
    processoStatus: ultimaResposta?.processoStatus ?? 'TIMEOUT',
    tentativas,
    data: ultimaResposta?.data ?? null,
  };
}

// ─── DN2: Resultado sintético e analítico ─────────────────────────────────────

/**
 * Obtém o resultado sintético de auditoria de um processo finalizado.
 *
 * Regra de negócio (DN2):
 *   O resultado DEVE estar disponível após o processo ser finalizado,
 *   e DEVE conter ao menos processoId + lista de auditorias.
 *
 * @param {string} processoId
 * @returns {Promise<{ status: number, data: object, temAuditorias: boolean }>}
 */
async function obterResultado(processoId) {
  const response = await axios.get(
    `${RESULTADO_BASE_URL}/resultado/processo/${processoId}`,
    {
      headers: authHeaders(),
      validateStatus: () => true,
    }
  );

  const auditorias =
    response.data?.auditorias ??
    response.data?.auditoria ??
    response.data?.results ??
    null;

  return {
    status: response.status,
    data: response.data,
    temAuditorias: Array.isArray(auditorias) && auditorias.length > 0,
    auditorias,
  };
}

/**
 * Obtém o resultado analítico de uma auditoria específica.
 *
 * @param {string} processoId
 * @param {string} auditoriaId
 * @returns {Promise<{ status: number, data: object }>}
 */
async function obterResultadoAuditoria(processoId, auditoriaId) {
  const response = await axios.get(
    `${RESULTADO_BASE_URL}/resultado/processo/${processoId}/auditoria/${auditoriaId}`,
    {
      headers: authHeaders(),
      validateStatus: () => true,
    }
  );

  return {
    status: response.status,
    data: response.data,
  };
}

// ─── DN3: Rastreabilidade — consulta de arquivo ───────────────────────────────

/**
 * Consulta os metadados de um arquivo enviado, correlacionando-o com processo/resultado.
 *
 * Regra de negócio (DN3):
 *   Todo arquivo enviado DEVE ser rastreável pelo arquivoId retornado no upload.
 *
 * @param {string} arquivoId
 * @returns {Promise<{ status: number, data: object }>}
 */
async function consultarArquivo(arquivoId) {
  const response = await axios.get(
    `${CORE_BASE_URL}/arquivo/${arquivoId}`,
    {
      headers: authHeaders(),
      validateStatus: () => true,
    }
  );

  return {
    status: response.status,
    data: response.data,
  };
}

module.exports = {
  credenciaisConfiguradas,
  uploadArquivo,
  consultarProcesso,
  aguardarProcesso,
  obterResultado,
  obterResultadoAuditoria,
  consultarArquivo,
  // Exporta constantes para uso nos testes
  PROCESS_MAX_WAIT_MS,
  PROCESS_POLL_INTERVAL,
};
