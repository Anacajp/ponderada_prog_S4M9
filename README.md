# Business Drivers as Code — Ponderada S4M9

> **Projeto**: ASIS TaxTech by Sankhya — Auditoria Tributária SPED  
> **Módulo 9 | Sprint 1 | Semana 02** — Inteli (Instituto de Tecnologia e Liderança)  
> **Stack**: Node.js + Jest + Axios + jest-html-reporters

---

## O que é este repositório

Este repositório **não implementa a API da ASIS**. Ele implementa uma **camada de aferição e evidência** sobre a API de staging da ASIS TaxTech, transformando regras de negócio em testes executáveis, versionados e rastreáveis.

> *"A qualidade de software é a conformidade a requisitos funcionais e de desempenho explicitamente declarados..."*  
> — Pressman, *Engenharia de Software*, 8ª ed., p. 423

---

## Estrutura do Projeto

```
ponderada_prog_S4M9/
│
├── document/
│   └── documentacao.md              ← Documento principal contínuo do projeto
│
├── tests/
│   ├── dn1-upload-confiavel.test.js         ← DN1 Blue Team
│   ├── dn1-upload-sem-processo.test.js      ← DN1 Red Team
│   ├── dn2-resultado-auditoria.test.js      ← DN2 Blue Team
│   └── dn2-resultado-auditoria-red.test.js  ← DN2 Red Team
│
├── utils/
│   └── api-client.js                ← Cliente canônico da API ASIS
│
├── test-data/
│   ├── sped-fiscal.txt              ← Massa válida (Blue Team)
│   ├── arquivo_vazio.txt            ← Massa adversa (0 bytes)
│   ├── arquivo_corrompido.bin       ← Massa adversa (binário)
│   └── arquivo_estrutura_invalida.txt ← Massa adversa (não-SPED)
│
├── reports/                         ← Evidências de execução (geradas pelo Jest)
│
├── .env.example                     ← Template de configuração de ambiente
├── jest.config.js
└── package.json
```

---

## Business Drivers Implementados

### Jornada Crítica do Usuário

```
[Carlos envia SPED] → POST /upload → GET /processo/{id} (polling) → GET /resultado/{id}
                         ↑ DN1                ↑ DN2/DN3                    ↑ DN2
```

### DN1 — Confiabilidade no Upload

Todo upload de arquivo SPED deve retornar um `processoId` válido. Entradas inválidas devem ser rejeitadas com 4xx, sem criar processos fantasmas e sem erros internos (500).

| Regra | Time | O que afere |
|---|---|---|
| RN-DN1-01/02 | Blue | HTTP 200/201 + `processoId` não nulo |
| RN-DN1-03 | Blue | `processoId` permite consulta imediata de status |
| RN-DN1-04 | Blue | Resposta em < 30s |
| RN-DN1-R01/02/03 | Red | Arquivo vazio/corrompido/inválido → 4xx, sem `processoId` |
| RN-DN1-R05 | Red | Nenhuma entrada inválida causa HTTP 500 |

### DN2 — Confiabilidade na Geração de Resultados

Após o processamento, o resultado de auditoria deve estar disponível, estruturado e associado ao `processoId` correto.

| Regra | Time | O que afere |
|---|---|---|
| RN-DN2-01 | Blue | Processo finaliza dentro do timeout configurado |
| RN-DN2-02/03 | Blue | HTTP 200 + resultado com auditorias |
| RN-DN2-04 | Blue | `processoId` no resultado = `processoId` do upload |
| RN-DN2-R01/02 | Red | IDs inexistentes/malformados → 404, não 500 |
| RN-DN2-R03 | Red | Resultado indisponível para processo não finalizado |
| RN-DN2-R04 | Red | `auditoriaId` inexistente → 404 |

---

## Como Executar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar credenciais (necessário para testes de integração)

```bash
cp .env.example .env
# Editar .env com as credenciais reais da API ASIS staging
```

### 3. Executar testes

```bash
# Todos os testes (testes unitários sempre executam; integração exige .env)
npm test

# Com saída detalhada
npm run test:verbose

# Apenas DN1
npm run test:dn1

# Apenas DN2
npm run test:dn2

# Gerar relatório HTML em reports/html/report.html
npm run test:report
```

### Comportamento sem credenciais

Os testes de integração (Blue/Red que chamam a API) são automaticamente pulados com `test.skip` quando as variáveis de ambiente não estão configuradas. Os testes unitários (validação de contratos, massas de teste) executam normalmente.

```
Tests: 5 passed, 20 skipped (sem .env)
Tests: 25 passed (com .env + API disponível)
```

---

## Rastreabilidade

Cada regra de negócio tem um ID rastreável `RN-{DN}-{número}` que aparece:
- No nome do `describe`/`test` no código
- Na tabela de regras do `document/documentacao.md`
- No relatório HTML gerado pelo Jest

Referência completa: **[document/documentacao.md](./document/documentacao.md)**

---

## Referências

- PRESSMAN, R. S. **Engenharia de Software**, 8ª ed. McGraw-Hill, 2016. p. 423-427
- Guia ES09 ASIS v7 — `document/guia/guia_es09_asis_v7.pdf`
- [Jest Docs](https://jestjs.io) · [Axios Docs](https://axios-http.com)
