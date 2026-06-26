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

### Releases

- Releases são publicados automaticamente ao push de uma tag `v*`
- O script `scripts/release.sh` orquestra o processo: detecta versão, gera CHANGELOG, cria tag e push
- O script `scripts/setup.sh` automatiza o setup local: detecta D1 databases, gera `.env`, aplica schema
- Mudanças que não afetam `src/` (docs, CI, scripts) não geram release
- Ver `RELEASING.md` para o fluxo completo

### Issues

- Issues são bem-vindas para bug reports e feature requests
- O maintainer aplica labels e define prioridades
- Issues sem atividade por 60 dias podem ser fechadas por inatividade

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
