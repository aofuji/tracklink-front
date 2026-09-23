# Authentication

## Objetivo

Permitir que o usuário crie uma conta, autentique-se no TrackLink e
acesse funcionalidades protegidas do frontend utilizando a API
ASP.NET Core existente.

## Escopo

A autenticação do frontend deve contemplar:

- registro de usuário;
- login;
- manutenção da sessão autenticada;
- recebimento e uso do JWT access token para endpoints protegidos;
- renovação da sessão utilizando refresh token armazenado pelo backend
  em cookie `HttpOnly`;
- logout;
- proteção de rotas privadas;
- redirecionamento de usuários não autenticados.

O access token será retornado ao Angular e mantido pelo frontend para
autenticar requisições protegidas.

O access token MUST ser mantido somente em memória durante a execução
da aplicação.

O access token MUST NOT ser persistido em `localStorage`,
`sessionStorage` ou qualquer outro armazenamento persistente acessível
por JavaScript.

O refresh token MUST NOT ser disponibilizado ao JavaScript.

O frontend MUST NOT armazenar o refresh token em `localStorage`,
`sessionStorage` ou qualquer outro armazenamento acessível por
JavaScript.

O Angular MUST NOT tentar ler o cookie do refresh token.

## Comportamentos Esperados

### Registro

O frontend MUST permitir que um novo usuário crie uma conta utilizando
o endpoint:

POST /api/auth/register

Após um registro realizado com sucesso, o usuário MUST poder seguir
para o fluxo de autenticação.

O frontend MUST apresentar uma mensagem adequada quando o registro
for rejeitado pela API, incluindo o caso de email já cadastrado.

### Login

O frontend MUST permitir autenticação utilizando:

POST /api/auth/login

Quando o login for realizado com sucesso, o frontend MUST receber e
manter em memória o access token retornado pela API.

Quando o login for realizado com sucesso, o backend MUST armazenar o
refresh token em cookie `HttpOnly`.

O frontend MUST NOT receber, ler, persistir ou expor o valor do refresh
token.

Após autenticação bem-sucedida, o usuário MUST ser direcionado para o
`returnUrl` quando ele existir e for uma rota interna válida.

Na ausência de um `returnUrl` válido, após autenticação bem-sucedida
o usuário MUST ser direcionado para:

/dashboard

O frontend MUST NOT permitir que `returnUrl` seja usado para
redirecionamento externo.

Credenciais inválidas MUST NOT criar uma sessão autenticada.

### Requisições autenticadas

Requisições para endpoints protegidos MUST enviar o access token
utilizando:

Authorization: Bearer <access-token>

A inclusão do access token SHOULD ser centralizada na infraestrutura
HTTP da aplicação e não repetida manualmente em cada feature.

O frontend MUST NOT usar o refresh token para autenticar manualmente
requisições protegidas.

### Sessão

O frontend MUST ser capaz de determinar se existe uma sessão
autenticada.

A sessão autenticada no frontend depende da disponibilidade de um
access token válido em memória ou da possibilidade de renovar a sessão
usando o cookie `HttpOnly` do refresh token.

Após reload da aplicação, o access token em memória será perdido e a
sessão MUST ser restaurada utilizando:

POST /api/auth/refresh

A restauração MUST utilizar o refresh cookie `HttpOnly` mantido pelo
backend.

Se a restauração for bem-sucedida, o novo access token retornado pela
API MUST ser mantido novamente em memória.

Se a restauração falhar, o usuário MUST ser considerado não
autenticado.

As informações do usuário autenticado SHOULD ser obtidas da API
quando necessário, utilizando:

GET /api/auth/me

Componentes individuais MUST NOT implementar sua própria lógica
independente de autenticação.

### Refresh token

Quando uma requisição protegida falhar porque o access token não é
mais válido, o frontend SHOULD tentar renovar a sessão utilizando:

POST /api/auth/refresh

A renovação da sessão MUST utilizar o refresh token armazenado pelo
backend em cookie `HttpOnly`.

O frontend MUST NOT enviar o refresh token em payload, header manual,
query string ou qualquer outro canal acessível por JavaScript.

A requisição de renovação MUST permitir o envio do cookie `HttpOnly`
conforme o contrato do backend.

Se a renovação for bem-sucedida:

1. o novo access token retornado pela API MUST substituir o access
   token anterior mantido em memória pelo frontend;
2. a requisição original SHOULD ser executada novamente.

O frontend MUST NOT executar múltiplas renovações concorrentes para
a mesma sessão quando várias requisições receberem erro de
autenticação simultaneamente.

Se a renovação falhar, a sessão local MUST ser encerrada e o usuário
MUST ser direcionado para `/login`.

### Refresh cookie

O contrato frontend/backend para o cookie de refresh token é:

- nome do cookie: `tracklink_refresh_token`;
- `HttpOnly = true`;
- `SameSite = Lax`;
- `Path = /api/auth`;
- `Domain` não definido explicitamente;
- `Secure = true` em produção;
- `Secure` pode ser `false` em desenvolvimento local HTTP;
- expiração alinhada à validade do refresh token.

O Angular MUST NOT tentar ler esse cookie.

### Logout

O frontend MUST permitir que o usuário encerre sua sessão.

O logout MUST solicitar ao backend a revogação do refresh token e a
expiração ou remoção do cookie `HttpOnly`, utilizando:

POST /api/auth/logout

O frontend MUST NOT enviar o refresh token em payload, header manual,
query string ou qualquer outro canal acessível por JavaScript.

A requisição de logout MUST permitir o envio do cookie `HttpOnly`
conforme o contrato do backend.

Após o logout, os dados locais da sessão MUST ser removidos, incluindo
o access token mantido em memória pelo frontend.

O usuário MUST ser direcionado para `/login`.

### Rotas públicas

As seguintes áreas MUST ser acessíveis sem autenticação:

- `/login`
- `/register`
- páginas públicas de acompanhamento de tracking.

Usuário já autenticado que acessar `/login` ou `/register` SHOULD
ser redirecionado para:

/dashboard

### Rotas protegidas

`/dashboard` e funcionalidades de gerenciamento dos trackings do
usuário MUST exigir autenticação.

Quando um usuário não autenticado tentar acessar uma rota protegida,
o frontend MUST direcioná-lo para `/login`.

Quando um usuário não autenticado tentar acessar uma rota protegida,
o frontend MUST preservar a rota interna solicitada como `returnUrl`.

O `returnUrl` MUST ser aceito apenas quando representar uma rota
interna válida da aplicação.

O `returnUrl` MUST NOT permitir redirecionamento externo.

## Estados e Erros

As telas relacionadas à autenticação MUST possuir estados apropriados
para:

- carregamento;
- sucesso;
- credenciais inválidas;
- email já cadastrado;
- sessão expirada;
- falha de comunicação com a API.

Durante o envio de login ou registro, o frontend MUST evitar múltiplos
envios simultâneos da mesma operação.

Mensagens apresentadas ao usuário MUST NOT expor access tokens,
refresh tokens, detalhes internos da API, stack traces ou informações
sensíveis.

## Dependências e Decisões Pendentes

Não há decisões pendentes nesta especificação.

## Fora de Escopo

Esta especificação não define:

- layout visual das telas;
- biblioteca de componentes;
- mapa;
- SignalR;
- MCP;
- criação ou atualização de tracking;
- autenticação por Google, Microsoft ou outros provedores externos;
- recuperação de senha;
- alteração de senha.
