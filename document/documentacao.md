# Documento do Sistema Digital Resiliente com Qualidade como Ativo de Software

## Módulo 9 - Grupo 3 - ASIS TaxTech by Sankhya

### Integrantes - Estudantes de Engenharia de Software

*(Ponderada individual — Sprint 1 / Semana 02)*

---

## Sumário

1. [Introdução](#1-introdução)
2. [Business Drivers (Direcionadores de Negócio)](#2-business-drivers-direcionadores-de-negócio)
3. [Documento de Requisitos como Ativo de Software](#3-documento-de-requisitos-como-ativo-de-software) *(Sprint 2)*
4. [Documento de Integração como Ativo de Software](#4-documento-de-integração-como-ativo-de-software) *(Sprint 3)*
5. [Dashboard da Qualidade como Ativo de Software](#5-dashboard-da-qualidade-como-ativo-de-software) *(Sprint 4)*
6. [Finalização e Storytelling](#6-finalização-e-storytelling) *(Sprint 5)*
7. [Referências](#7-referências)

---

# 1. Introdução

## 1.1. Contexto Institucional: ASIS by Sankhya

A **ASIS TaxTech** (Grupo Sankhya) é uma empresa de auditoria e conformidade tributária que atua no contexto brasileiro de **SPED** (Sistema Público de Escrituração Digital). Sua plataforma processa arquivos fiscais enviados por empresas, executando auditorias automáticas sobre eles e entregando resultados estruturados.

A API da ASIS (ambiente de staging) é o ponto de integração principal deste projeto. O repositório **não reimplementa** a API da ASIS — ele implementa uma **camada de aferição e evidência** sobre ela.

## 1.2. O Desafio: Qualidade como Ativo de Software

O desafio técnico do módulo é garantir que a **jornada crítica do usuário** — `upload → processamento → resultado` — permaneça confiável sob condições normais e adversas.

A abordagem adotada é a de **Business Drivers as Code** (Pressman, p. 423-427): transformar critérios de negócio em testes executáveis, versionados e rastreáveis, tornando a qualidade um ativo mensurável do software.

```
[Critério de Negócio] → [Direcionador (DN)] → [RF/RNF] → [Teste Executável] → [Evidência]
```

## 1.3. Personas, Jornada do Usuário e Problema de Negócio

### Contexto da indústria

Empresas brasileiras são obrigadas por lei a enviar arquivos SPED ao fisco. A auditoria manual desses arquivos é custosa e propensa a erros. A ASIS automatiza esse processo via API.

### Persona e enredo

**Carlos**, contador de uma empresa de médio porte, precisa enviar o SPED Fiscal mensal. Ele usa a plataforma ASIS para garantir conformidade antes da entrega ao fisco. A jornada dele depende inteiramente de três garantias: (1) o upload funcionar, (2) o processamento ocorrer, (3) o resultado ser entregue.

### Jornada do usuário (fluxo na API)

| Etapa | Endpoint | Propósito |
|---|---|---|
| 1. Upload | `POST /upload` | Enviar arquivo SPED e obter `processoId` |
| 2. Processo | `GET /processo/{processoId}` | Consultar status de processamento |
| 3. Resultado sintético | `GET /resultado/processo/{processoId}` | Obter resultado após finalização |
| 4. Resultado analítico | `GET /resultado/processo/{id}/auditoria/{audId}` | Detalhar auditoria específica |
| 5. Rastreio | `GET /arquivo/{arquivoId}` | Correlacionar arquivo com processo/resultado |

### Benefícios do projeto

- Detectar quebras de contrato de API antes que afetem usuários reais
- Documentar comportamento da API com evidências reprodutíveis
- Medir degradação de performance sob volume

### Riscos mitigados (visão resumida)

| Risco | Mitigação via DN |
|---|---|
| Upload sem processoId (processo fantasma) | DN1 Red Team |
| Resultado indisponível após processamento | DN2 Blue Team |
| Perda de rastreabilidade arquivo↔processo | DN3 |
| Degradação sob carga | DN4 |

---

# 2. Business Drivers (Direcionadores de Negócio)

> **Referência**: Pressman, R. S. *Engenharia de Software*, 8ª ed., p. 423-427  
> *"A qualidade de software é a conformidade a requisitos funcionais e de desempenho explicitamente declarados, a padrões de desenvolvimento explicitamente documentados e a características implícitas que são esperadas de todo software profissionalmente desenvolvido."*

## Mapa Rápido dos DNs

| DN | Foco | Times | Testes Principais |
|---|---|---|---|
| DN1 | Confiabilidade no upload | Blue + Red | `tests/dn1-upload-confiavel.test.js`, `tests/dn1-upload-sem-processo.test.js` |
| DN2 | Resultado após processo finalizado | Blue + Red | `tests/dn2-resultado-auditoria.test.js`, `tests/dn2-resultado-auditoria-red.test.js` |
| DN3 | Rastreabilidade e integridade do ciclo | Blue + Red | *(Sprint 2+)* |
| DN4 | Capacidade e degradação graciosa | Blue + Red | *(Sprint 2+)* |

---

## DN1 — Confiabilidade no Upload

### Descrição do Direcionador

Todo arquivo SPED enviado via `POST /upload` deve retornar um `processoId` válido e não nulo. O `processoId` é o identificador que permite toda a rastreabilidade subsequente. Sem ele, a jornada do usuário é interrompida na origem.

Adicionalmente, a API deve **rejeitar com segurança** entradas inválidas (arquivos vazios, corrompidos ou com estrutura não-SPED), sem criar processos fantasmas e sem lançar erros internos (HTTP 500).

### Regras de Negócio Codificadas

| ID | Regra | Time | Arquivo de Teste | Status |
|---|---|---|---|---|
| RN-DN1-01 | Upload com SPED válido retorna HTTP 200/201 | Blue | `dn1-upload-confiavel.test.js` | Aferível com credenciais |
| RN-DN1-02 | Resposta contém `processoId` não nulo | Blue | `dn1-upload-confiavel.test.js` | Aferível com credenciais |
| RN-DN1-03 | `processoId` retornado permite consulta imediata | Blue | `dn1-upload-confiavel.test.js` | Aferível com credenciais |
| RN-DN1-04 | Tempo de resposta < 30s (arquivo ~350 KB) | Blue | `dn1-upload-confiavel.test.js` | Aferível com credenciais |
| RN-DN1-R01 | Arquivo vazio retorna 4xx, sem `processoId` | Red | `dn1-upload-sem-processo.test.js` | Aferível com credenciais |
| RN-DN1-R02 | Arquivo corrompido retorna 4xx, sem `processoId` | Red | `dn1-upload-sem-processo.test.js` | Aferível com credenciais |
| RN-DN1-R03 | Estrutura SPED inválida retorna 4xx | Red | `dn1-upload-sem-processo.test.js` | Aferível com credenciais |
| RN-DN1-R05 | Nenhuma entrada inválida causa HTTP 500 | Red | `dn1-upload-sem-processo.test.js` | Aferível com credenciais |

### Exemplo de Código como Documentação

```javascript
// Regra RN-DN1-02: processoId não pode ser nulo
test('deve retornar processoId não nulo e não vazio', async () => {
  const resultado = await uploadArquivo(SPED_VALIDO);
  
  expect(resultado.processoId).toBeTruthy();           // não nulo/undefined/''
  expect(typeof resultado.processoId).toBe('string'); // tipo correto
  expect(resultado.processoId.length).toBeGreaterThan(0);
});
```

---

## DN2 — Confiabilidade na Geração de Resultados de Auditoria

### Descrição do Direcionador

Após um processo de auditoria ser **finalizado**, o sistema deve disponibilizar o resultado de forma confiável e estruturada. O resultado de auditoria é o **produto principal** entregue pela ASIS TaxTech — sem ele, toda a jornada do usuário é inútil.

### Regras de Negócio Codificadas

| ID | Regra | Time | Arquivo de Teste | Status |
|---|---|---|---|---|
| RN-DN2-01 | Processo finaliza dentro do tempo máximo configurado | Blue | `dn2-resultado-auditoria.test.js` | Aferível com credenciais |
| RN-DN2-02 | GET /resultado retorna HTTP 200 após finalização | Blue | `dn2-resultado-auditoria.test.js` | Aferível com credenciais |
| RN-DN2-03 | Resultado contém ao menos uma auditoria | Blue | `dn2-resultado-auditoria.test.js` | Aferível com credenciais |
| RN-DN2-04 | `processoId` no resultado corresponde ao upload | Blue | `dn2-resultado-auditoria.test.js` | Aferível com credenciais |
| RN-DN2-R01 | `processoId` inexistente retorna 404 (não 500) | Red | `dn2-resultado-auditoria-red.test.js` | Aferível com credenciais |
| RN-DN2-R02 | `processoId` malformado retorna 4xx (não 500) | Red | `dn2-resultado-auditoria-red.test.js` | Aferível com credenciais |
| RN-DN2-R03 | Resultado indisponível para processo não finalizado | Red | `dn2-resultado-auditoria-red.test.js` | Aferível com credenciais |
| RN-DN2-R04 | `auditoriaId` inexistente retorna 404 | Red | `dn2-resultado-auditoria-red.test.js` | Aferível com credenciais |

### Exemplo de Código como Documentação

```javascript
// Regra RN-DN2-01: Processo deve finalizar dentro do tempo máximo (polling)
test(`processo deve finalizar dentro de ${PROCESS_MAX_WAIT_MS/1000}s`, async () => {
  const upload = await uploadArquivo(SPED_VALIDO);
  const espera = await aguardarProcesso(upload.processoId);
  
  expect(espera.finalizado).toBe(true);     // chegou ao status terminal
});

// Regra RN-DN2-R01: 404 para processo inexistente (não 500)
test('processoId inexistente deve retornar 404', async () => {
  const resultado = await obterResultado('00000000-0000-0000-0000-000000000000');
  
  expect(resultado.status).toBe(404);
  expect(resultado.status).not.toBe(500);
});
```

---

## 2.2. Estratégia e Massa de Testes

### Técnicas de Teste Aplicadas

| Técnica | Descrição | Onde aplicada |
|---|---|---|
| **Particionamento de Equivalência** | Agrupa entradas com comportamento idêntico; testa um representante por classe | Classes de arquivo: válido, vazio, corrompido, estrutura inválida |
| **Análise de Valor Limite (BVA)** | Testa as fronteiras do domínio | HTTP 200 vs 201; exatamente no limite do timeout; 4xx vs 5xx |
| **Teste de Regressão** | Garante que o comportamento correto se mantenha após mudanças | Testes unitários executam sempre, com ou sem credenciais |
| **Blue/Red Team** | Blue = cenário feliz; Red = cenário adversário/ataque | Par Blue+Red para cada DN |
| **Teste de Polling Assíncrono** | Afere comportamento de processos de longa duração com polling | `aguardarProcesso()` no DN2 Blue |
| **Teste de Contrato de API** | Valida que a estrutura de resposta segue o contrato esperado | `processoId`, `arquivoId`, `auditorias` em todos os retornos |

### Massa de Testes

| ID | Arquivo | Classe | Tamanho | Uso | DNs |
|---|---|---|---|---|---|
| M1 | `test-data/sped-fiscal.txt` | Válida / Referência | ~400 B | Cenários Blue — estrutura SPED mínima válida | DN1, DN2 |
| M2 | `test-data/arquivo_vazio.txt` | Adversa / Inválida | 0 bytes | Teste de rejeição de arquivo vazio | DN1 Red |
| M3 | `test-data/arquivo_corrompido.bin` | Adversa / Inválida | ~12 bytes | Teste de rejeição de binário não-SPED | DN1 Red |
| M4 | `test-data/arquivo_estrutura_invalida.txt` | Adversa / Inválida | ~80 bytes | Teste de rejeição de texto sem estrutura `|registro|` | DN1 Red |
| M5 | `00000000-0000-0000-0000-000000000000` (constante) | Adversa | — | processoId inexistente para testes 404 | DN2 Red |
| M6 | `nao-e-um-uuid-valido!!!` (constante) | Adversa | — | processoId malformado para testes 4xx | DN2 Red |

> **Critério de validade de M1**: arquivo SPED começa com `|0000|` e contém registros terminais `|9999|`. Verificação automatizada no teste unitário `arquivo_estrutura_invalida.txt deve existir e não ser um SPED válido`.

### Tabela Completa de Cenários

| ID Cenário | DN | Time | Técnica | Massa | Entrada | Saída Esperada | Critério PASS |
|---|---|---|---|---|---|---|---|
| C01 | DN1 | Blue | Equivalência | M1 | SPED válido via POST /upload | HTTP 200 ou 201 | `status ∈ {200, 201}` |
| C02 | DN1 | Blue | Contrato | M1 | SPED válido via POST /upload | `processoId` não nulo | `processoId` é string não vazia |
| C03 | DN1 | Blue | Contrato | M1 | SPED válido via POST /upload | `arquivoId` para rastreabilidade | `arquivoId` é truthy |
| C04 | DN1 | Blue | Valor Limite | M1 | SPED válido (~400 B) | Resposta em < 30s | `duracao < 30_000 ms` |
| C05 | DN1 | Red | Equivalência | M2 | Arquivo vazio (0 bytes) | HTTP 4xx sem `processoId` | `status ≥ 400 && status < 500` |
| C06 | DN1 | Red | Equivalência | M3 | Arquivo binário corrompido | HTTP 4xx sem `processoId` | `status ≥ 400 && status < 500` |
| C07 | DN1 | Red | Equivalência | M4 | Estrutura SPED inválida | HTTP 4xx sem `processoId` | `status ≥ 400 && status < 500` |
| C08 | DN1 | Red | Valor Limite | M2/M3/M4 | Qualquer entrada inválida | Sem erro interno | `status ≠ 500` |
| C09 | DN2 | Blue | Polling | M1 | Ciclo completo upload→processo | Processo finaliza | `espera.finalizado === true` |
| C10 | DN2 | Blue | Contrato | M1 | GET /resultado após finalização | HTTP 200 | `status === 200` |
| C11 | DN2 | Blue | Contrato | M1 | GET /resultado após finalização | Objeto não vazio com auditorias | `temAuditorias === true` |
| C12 | DN2 | Blue | Contrato | M1 | GET /resultado após finalização | `processoId` correto no resultado | `resultado.processoId === upload.processoId` |
| C13 | DN2 | Red | Equivalência | M5 | processoId inexistente | HTTP 404 | `status === 404` |
| C14 | DN2 | Red | Valor Limite | M5 | processoId inexistente | Sem erro interno | `status ≠ 500` |
| C15 | DN2 | Red | Equivalência | M6 | processoId malformado | HTTP 4xx | `status ≥ 400 && status < 500` |
| C16 | DN2 | Red | Regressão | M1 | Resultado imediatamente após upload | Indisponível (pendente) | `status === 404 \|\| status === 202 \|\| temAuditorias === false` |
| C17 | DN2 | Red | Equivalência | M5+const | auditoriaId inexistente | HTTP 404 | `status === 404` |
| C18 | DN2 | Red | Valor Limite | M6+const | IDs malformados na rota de auditoria | Sem erro interno | `status ≠ 500` |

**Total**: 8 cenários Blue | 10 cenários Red | 5 testes unitários (sem credenciais)

### Organização dos Arquivos de Teste

```
tests/
├── dn1-upload-confiavel.test.js        ← C01–C04 (DN1 Blue) + unitários
├── dn1-upload-sem-processo.test.js     ← C05–C08 (DN1 Red) + unitários
├── dn2-resultado-auditoria.test.js     ← C09–C12 (DN2 Blue) + unitários
└── dn2-resultado-auditoria-red.test.js ← C13–C18 (DN2 Red) + unitários
```

### Padrão de Aferição (contrato de todos os testes)

Cada regra de negócio é codificada com:
1. **ID rastreável** no nome do `describe`/`test` (ex.: `RN-DN1-02`)
2. **Evidência** via `console.log` com `processoId`, `status` e `tentativas`
3. **`test.skip` automático** quando credenciais não estão configuradas — sem falsos negativos
4. **`validateStatus: () => true`** no axios — o teste, não o cliente HTTP, decide sobre erros

### Critérios de Qualidade (Definition of Done)

| Critério | Meta |
|---|---|
| Taxa de PASS nos testes unitários | 100% (executam sem credenciais) |
| Cobertura de cenários Blue por DN | 100% dos cenários felizes mapeados |
| Cobertura de cenários Red por DN | 100% dos cenários adversários mapeados |
| Rastreabilidade DN → Regra → Cenário → Teste | Verificável pela tabela acima |
| Nenhum teste usa dados não-determinísticos | Massas fixas em `test-data/`; IDs adversos são constantes |

### Execução e Geração de Evidências

```bash
# Configurar credenciais
cp .env.example .env   # preencher APP_KEY, ACCOUNT_KEY e URLs de staging

# Executar todos os testes (unitários + integração se .env preenchido)
npm run test:verbose

# Executar por DN
npm run test:dn1
npm run test:dn2

# Gerar relatório HTML → reports/html/report.html
npm run test:report
```

**Comportamento sem credenciais**: testes de integração são pulados (`skipped`); testes unitários executam normalmente.

```
Com .env:     Tests: 33 passed
Sem .env:     Tests: 8 passed, 25 skipped
```

## 2.3. Implementação em Código: Codificação como Documentação

O princípio central é que **o código de teste é a documentação da regra de negócio**. Cada arquivo de teste é autoexplicativo — um leitor que nunca viu o sistema consegue entender a regra lendo o código.

### Estrutura de Cada Arquivo de Teste

```javascript
/**
 * DN1 — Confiabilidade no Upload (Blue Team)        ← Nome do DN e do time
 *
 * Direcionador de Negócio:                          ← Contexto de negócio em prosa
 *   Todo arquivo SPED enviado via POST /upload deve retornar um processoId...
 *
 * Regras de negócio aferidas:                       ← IDs rastreáveis
 *   RN-DN1-01: Upload com arquivo SPED válido retorna HTTP 200/201
 *   RN-DN1-02: Resposta contém processoId não nulo
 *
 * Time: Blue                                        ← Contexto do time
 * Massa: test-data/sped-fiscal.txt                  ← Massa usada
 */
describe('RN-DN1-02 — processoId válido', () => {
  test('deve retornar processoId não nulo e não vazio', async () => {
    const resultado = await uploadArquivo(SPED_VALIDO);

    expect(resultado.processoId).toBeTruthy();          // não nulo
    expect(typeof resultado.processoId).toBe('string'); // tipo correto
    expect(resultado.processoId.length).toBeGreaterThan(0);
  });
});
```

### Rastreabilidade Ponta a Ponta

```
[Negócio]         [Código]                        [Evidência]
DN1               tests/dn1-upload-confiavel.test.js
  └─ RN-DN1-02      └─ describe('RN-DN1-02...')     → reports/html/report.html
                        └─ test('deve retornar...')  → PASS/FAIL com console.log
```

O `utils/api-client.js` serve como **contrato técnico**: cada função documenta em JSDoc qual regra de negócio ela serve (`DN1 / DN3`, `DN2`, etc.), tornando a rastreabilidade legível diretamente no código.

---

# 3. Documento de Requisitos como Ativo de Software

> *A ser consolidado na Sprint 2 (Semana 04)*

---

# 4. Documento de Integração como Ativo de Software

> *A ser consolidado na Sprint 3 (Semana 06)*

---

# 5. Dashboard da Qualidade como Ativo de Software

> *A ser consolidado na Sprint 4 (Semana 08)*

---

# 6. Finalização e Storytelling

> *A ser consolidado na Sprint 5 (Semana 10)*

---

# 7. Referências

- PRESSMAN, Roger S. **Engenharia de Software: Uma Abordagem Profissional**. 8ª ed. McGraw-Hill, 2016. p. 423-427.
- ASIS TaxTech. Documentação da API de Staging (acesso restrito ao grupo).
- Guia ES09 (M9) • ASIS • v7 — `document/guia/guia_es09_asis_v7.pdf`
- Jest Documentation. https://jestjs.io/docs/getting-started
- Axios Documentation. https://axios-http.com/docs/intro
