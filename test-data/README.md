# test-data — Massas de Teste

Arquivos utilizados nas suítes de aferição dos Business Drivers.

| Arquivo | Classe | DN | Uso |
|---|---|---|---|
| `sped-fiscal.txt` | Válida / Referência | DN1, DN2, DN3 | Cenários Blue Team — arquivo SPED Fiscal mínimo válido |
| `arquivo_vazio.txt` | Adversa / Inválida | DN1 (Red) | Validação de rejeição de arquivo vazio (0 bytes) |
| `arquivo_corrompido.bin` | Adversa / Inválida | DN1 (Red) | Validação de rejeição de arquivo binário corrompido |
| `arquivo_estrutura_invalida.txt` | Adversa / Inválida | DN1 (Red) | Validação de rejeição de estrutura não-SPED |

> **Nota**: Em ambiente real de projeto, substituir `sped-fiscal.txt` pelo
> arquivo SPED EFD/Fiscal real fornecido pelo parceiro (ASIS TaxTech).
> Os arquivos adversos devem permanecer mínimos para garantir velocidade dos testes.
