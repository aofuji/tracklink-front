# TrackLink Web

## Visão geral

TrackLink é uma aplicação para compartilhar localização em tempo real por meio de links públicos de acompanhamento.

Este repositório contém o frontend Angular do TrackLink. Ele integra com a API ASP.NET Core TrackLink para autenticação, criação e gerenciamento de trackings, histórico de localização e atualizações em tempo real via SignalR.

## Funcionalidades atuais

- Registro e login de usuários.
- Autenticação com JWT access token.
- Refresh token mantido pelo backend em cookie `HttpOnly`.
- Restauração de sessão após reload usando o endpoint de refresh.
- Dashboard protegido com a lista de trackings do usuário autenticado.
- Criação de novo compartilhamento de localização.
- Uso da Geolocation API do navegador.
- Atualização da posição durante um compartilhamento ativo.
- Encerramento de tracking pelo proprietário.
- Página pública `/tracking/:token` para acompanhamento sem autenticação.
- Mapa com Leaflet e OpenStreetMap.
- Exibição do histórico disponível como rota.
- Atualizações em tempo real via SignalR.
- Tratamento de tracking inexistente, encerrado/inativo e expirado.

## Stack

Versões declaradas em `package.json`:

- Angular: `^22.1.0`
- Angular CLI: `^22.1.6`
- TypeScript: `~6.0.2`
- RxJS: `~7.8.0`
- Leaflet: `^1.9.4`
- `@types/leaflet`: `^1.9.22`
- `@microsoft/signalr`: `^10.0.11`
- OpenStreetMap: usado como provedor de tiles do mapa

## Arquitetura

Estrutura principal:

```text
src/app/
├── core/
│   ├── api/
│   ├── auth/
│   ├── geolocation/
│   ├── map/
│   └── tracking/
└── features/
    ├── auth/
    ├── dashboard/
    ├── location-sharing/
    └── public-tracking/
```

Resumo das responsabilidades:

- `core/auth/`: estado de autenticação, guards, interceptor JWT, restauração de sessão e logout.
- `core/geolocation/`: encapsulamento da Geolocation API e cálculo de distância.
- `core/map/`: integração específica do mapa público com Leaflet.
- `core/tracking/`: contratos, chamadas REST de tracking e integração SignalR.
- `features/auth/`: telas de login e registro.
- `features/dashboard/`: área protegida com trackings do usuário.
- `features/location-sharing/`: fluxo local de criação e atualização de compartilhamento.
- `features/public-tracking/`: página pública de acompanhamento por token.

## Rotas principais

Rotas existentes em `src/app/app.routes.ts`:

| Rota | Acesso | Descrição |
| --- | --- | --- |
| `/login` | Pública para usuários anônimos | Login |
| `/register` | Pública para usuários anônimos | Registro |
| `/dashboard` | Protegida | Lista e gerenciamento dos trackings do usuário |
| `/tracking/new` | Protegida | Início e manutenção de um compartilhamento local |
| `/tracking/:token` | Pública | Visualização pública de um tracking |

A rota `/tracking/new` deve permanecer antes de `/tracking/:token` para que `new` não seja interpretado como token público.

## Autenticação

O frontend mantém o access token somente em memória durante a execução da aplicação. O token é anexado às requisições protegidas pelo interceptor HTTP como `Authorization: Bearer <access-token>`.

O refresh token não é lido nem armazenado pelo Angular. Ele fica sob controle do backend em cookie `HttpOnly`. Após reload, o frontend tenta restaurar a sessão via `POST /api/auth/refresh`; em caso de sucesso, o novo access token volta a ser mantido em memória.

Tokens não são persistidos em `localStorage`, `sessionStorage` ou outro armazenamento acessível por JavaScript.

Os endpoints públicos de tracking usam opt-out explícito de autenticação no interceptor, para não dependerem de sessão autenticada, Bearer token, refresh ou redirect para login.

## Rastreamento

Fluxo geral:

```text
Geolocation API
→ REST API
→ TrackLink backend
→ SignalR
→ página pública
→ Leaflet
```

No compartilhamento local, o frontend obtém uma posição inicial com `getCurrentPosition()`, cria o tracking via REST e passa a acompanhar novas posições com `watchPosition()`.

A atualização para a API não envia cada callback do navegador. Uma nova posição é enviada quando houver deslocamento de pelo menos 10 metros desde a última posição confirmada pela API ou quando tiverem passado pelo menos 10 segundos desde o último envio confirmado.

A página pública carrega o estado atual via REST, carrega o histórico do tracking ativo, desenha a rota no Leaflet e acompanha novas posições via SignalR. Ao receber encerramento em tempo real, mantém a última localização e a rota visíveis.

## Como executar

Instale as dependências:

```bash
npm install
```

Execute o servidor de desenvolvimento:

```bash
npm start
```

A aplicação Angular roda localmente no servidor do Angular CLI, normalmente em `http://localhost:4200/`.

O backend TrackLink ASP.NET Core precisa estar disponível no endereço configurado em `src/app/core/api/api.config.ts`. Atualmente o frontend usa:

```text
http://localhost:5258
```

## Testes

Execute os testes unitários com o script real do projeto:

```bash
npm test
```

## Build

Gere o build de produção com:

```bash
npm run build
```

Os artefatos são gerados em `dist/`.

## Backend

Este frontend depende da API TrackLink ASP.NET Core para:

- registro, login, refresh, logout e usuário autenticado;
- criação, atualização, listagem e encerramento de trackings;
- consulta pública de tracking por token;
- histórico público de localização;
- hub SignalR `/hubs/tracking` para atualizações em tempo real.

## Specs

Os requisitos comportamentais das features ficam em `specs/`.

O projeto está sendo desenvolvido com abordagem Spec-Driven Development:

```text
spec → plano → implementação → testes → validação contra a spec
```

As specs atuais cobrem autenticação, dashboard, compartilhamento de localização e visualização pública de tracking.
