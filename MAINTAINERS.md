# Maintainers

Este documento define as bases de manutenção do simplelikes.

## Maintainer atual

| Nome | GitHub | Contato |
|---|---|---|
| William Brendaw | [@brendaw](https://github.com/brendaw) | williambrendaw.com |

Atualmente sou o único maintainer do projeto. Todo o fluxo de contribuição passa por mim até que novos maintainers sejam nomeados.

## Políticas de manutenção

### Revisão de PRs

- Todo PR deve ser revisado e aprovado por um maintainer antes do merge
- O maintainer pode solicitar alterações, testes adicionais ou discussão na issue vinculada
- PRs que não seguem o template ou não passam nos checks de CI não são revisados

### Merge

- Apenas maintainers fazem merge
- O branch `main` é protegido — não é permitido push direto
- O merge é feito via **Squash and Merge** para manter o histórico linear
- A mensagem do squash deve seguir [Conventional Commits](https://www.conventionalcommits.org/)

### Versionamento

- O projeto segue [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`)
- A versão é inferida dos commits convencionais desde o último release
- O maintainer é responsável por decidir quando um release é cortado

### Issues

- Issues são bem-vindas para bug reports e feature requests
- O maintainer aplica labels e define prioridades
- Issues sem atividade por 60 dias podem ser fechadas por inatividade

## CI/CD Pipeline

Três workflows encadeados, cada um acionável individualmente via `workflow_dispatch`:

```
                        ┌────────────────────────────────────────────┐
                        │                   Build                    │
                        │   push: main / push: tag / w.dispatch     │
                        │                                            │
                        │  ┌──────────┐     ┌─────────────┐         │
                        │  │Typecheck │ ──► │ Unit tests  │         │
                        │  │(tsc)     │     │ (coverage   │         │
                        │  │          │     │  ≥95%)      │         │
                        │  └──────────┘     └─────────────┘         │
                        └────────────────────┬───────────────────────┘
                                             │
                                       gh workflow run
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        │
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│          Push main               │  │       Push tag v*               │
│    ┌──────────────────────┐      │  │  ┌──────────────────────┐       │
│    │  Deploy staging      │      │  │  │  Deploy production   │       │
│    └──────────┬───────────┘      │  │  └──────────┬───────────┘       │
│               ▼                  │  │             ▼                    │
│    ┌──────────────────────┐      │  │  ┌──────────────────────┐       │
│    │ Integration tests    │      │  │  │ Integration tests    │       │
│    │ (staging URL)        │      │  │  │ (production URL)     │       │
│    └──────────┬───────────┘      │  │  └──────────┬───────────┘       │
│               ▼                  │  │             ▼                    │
│    ┌──────────────────────┐      │  │  ┌──────────────────────┐       │
│    │        done          │      │  │  │  Trigger Release     │       │
│    └──────────────────────┘      │  │  └──────────┬───────────┘       │
└──────────────────────────────────┘  └─────────────┼────────────────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │      Release         │
                                           │  workflow_dispatch   │
                                           │                      │
                                           │  ┌────────────────┐  │
                                           │  │  GitHub Release │  │
                                           │  │  (CHANGELOG)    │  │
                                           │  └────────────────┘  │
                                           └──────────────────────┘
```

### Build

- **Trigger automático:** push para `main` (staging) ou tag `v*` (produção) — primeiro workflow do pipeline
- **Trigger manual:** `workflow_dispatch` com input `skip-typecheck` opcional
- **Estágios:** Typecheck → Unit tests com coverage (threshold 95%) → (se push) Trigger Deploy via `gh workflow run`
- **Uso:** pipeline de entrada — valida o código e dispara o Deploy automaticamente; `workflow_dispatch` permite validar branches sem deploy

### Deploy

- **Trigger automático:** chamado pelo Build (`gh workflow run deploy.yml -f environment=... --ref ...`)
- **Trigger manual:** `workflow_dispatch` com input `environment` (staging/production)
- **Estágios:** Deploy → Integration tests → (se produção + tag) Trigger Release
- **Integration tests:** rodam automaticamente contra a URL do ambiente deployado, usando `INTEGRATION_TEST_SECRET` para bypass do rate limit e `EXPECTED_ORIGIN` via `ALLOWED_ORIGINS` para validação CORS
- **Release trigger:** apenas em produção com tag — checa `integration-tests.result == 'success'` + `github.ref_type == 'tag'` — `gh workflow run release.yml` com `GITHUB_TOKEN`

### Release

- **Trigger:** `workflow_dispatch` apenas (manual ou via Deploy)
- **Não escuta `push: tags`** — o Deploy é o único trigger automatizado para evitar disparo duplicado
- **Estágio único:** Cria GitHub Release a partir da entrada do CHANGELOG para a tag informada

### Fluxo de release completo

1. Desenvolva e faça merge dos PRs em `main`
2. Execute `./scripts/release.sh` localmente (cria tag e faz push)
3. O push da tag dispara o pipeline automaticamente: **Build → Deploy production → Integration tests → Release**
4. Build executa Typecheck → Unit tests → dispara Deploy
5. Deploy executa Deploy production → Integration tests → trigger-release
6. trigger-release só roda se os testes integrados passarem no ambiente de produção
7. Release gera a GitHub Release com o zip de distribuição anexado

### Reprocessamento manual

Cada pipeline pode ser reexecutado manualmente pelo GitHub Actions UI:

| Pipeline | Inputs | Quando usar |
|---|---|---|
| **Build** | `skip-typecheck` (opcional) | Validar um branch específico sem deploy |
| **Deploy** | `environment` (staging/production) | Redeploy de um ambiente sem novo push |
| **Release** | `tag` (obrigatório) | Recriar GitHub Release para uma tag existente |

## GitHub Secrets

Os seguintes segredos devem estar configurados no repositório para o CI/CD funcionar:

| Secret | Finalidade |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Autenticação Wrangler para deploy em staging e production |
| `D1_STAGING_DATABASE_ID` | ID do banco D1 de staging |
| `D1_PRODUCTION_DATABASE_ID` | ID do banco D1 de production |
| `INTEGRATION_TEST_SECRET` | Header `X-Integration-Test` para bypass de rate limit nos testes integrados |
| `ALLOWED_ORIGINS` | Origem CORS esperada — validada pelos testes de integração via `EXPECTED_ORIGIN` |

**Forks** precisam configurar seus próprios segredos, especialmente `ALLOWED_ORIGINS` com sua própria origem, senão o teste de CORS falhará com a mensagem `EXPECTED_ORIGIN environment variable must be set`.

## Testes de integração

Os testes de integração em `test/integration.test.ts` batem contra o ambiente staging ou production real (`simplelikes-staging.william-brendaw.workers.dev` ou `simplelikes.william-brendaw.workers.dev`).

### No CI

Rodam automaticamente no pipeline Deploy após o deploy, contra a URL do ambiente recém-deployado. Usam `INTEGRATION_TEST_SECRET` (GitHub Secret) para bypass do rate limit.

### Localmente

**Pré-requisitos:**

- `INTEGRATION_TEST_SECRET` configurado no `.env` (mesmo valor do GitHub Secret)
- `EXPECTED_ORIGIN` configurado no `.env` (valor do `ALLOWED_ORIGINS` do ambiente — ex: `https://williambrendaw.com`)
- Staging deployada com a versão mais recente do código (o header `X-Integration-Test` é necessário para bypass do rate limit)

**Executar:**

```bash
INTEGRATION_TEST_SECRET=$(grep INTEGRATION_TEST_SECRET .env | cut -d= -f2) \
EXPECTED_ORIGIN=$(grep ALLOWED_ORIGINS .env | cut -d= -f2) \
npm run test:integration
```

Os testes são pulados automaticamente se `INTEGRATION_TEST_SECRET` não estiver definida, evitando que forks ou contribuidores acidentalmente batam na staging.

## Cobertura de código

O projeto usa `@vitest/coverage-v8` com threshold mínimo de **95%** em statements, branches, functions e lines.

**Executar:**

```bash
npm run test:coverage
```

O coverage é verificado automaticamente no Build (CI) — o pipeline quebra se o threshold não for atingido. Atualmente a base de código está em **100% de coverage**.

## Hotfix e rollback

### Hotfix

1. Crie um branch do `main`, aplique o fix, PR e merge
2. Execute `./scripts/release.sh` para gerar uma tag `v<patch>`
3. O push da tag dispara Deploy production → Integration tests → Release

### Rollback

O Wrangler não suporta rollback nativo de versões. Para reverter:

1. Faça checkout do commit ou tag anterior desejado
2. Dispare o Deploy manualmente via `workflow_dispatch` com o ref desejado e `environment: production`
3. O pipeline executa Build → Deploy → Integration tests normalmente
4. Se os testes falharem no ambiente anterior, o Release não é disparado

## Responsabilidades do maintainer

1. Revisar e mergear PRs em tempo hábil
2. Manter a esteira de CI/CD operacional
3. Planejar e executar releases
4. Responder a issues e discutir direcionamento do projeto
5. Manter a documentação do projeto atualizada
6. Garantir que a API mantenha compatibilidade quando possível

## Como se tornar um maintainer

Não há um processo formal no momento. Contribuidores frequentes e de confiança podem ser convidados a se tornar maintainers. Se você tem interesse, contribua ativamente — issues, PRs, revisões — e entre em contato.

## Decisões técnicas

Direcionamento técnico do projeto é definido pelo maintainer principal. Decisões significativas (mudanças de runtime, alterações de esquema, novos endpoints) são discutidas em issues antes da implementação.

---

*Este documento é vivo e será atualizado conforme o projeto evolui.*
