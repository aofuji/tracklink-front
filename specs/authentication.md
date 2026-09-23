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
- envio do JWT access token para endpoints protegidos;
- renovação da sessão utilizando refresh token;
- logout;
- proteção de rotas privadas;
- redirecionamento de usuários não autenticados.

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

Quando o login for realizado com sucesso, o frontend MUST receber
e manter os tokens retornados pela API.

Após autenticação bem-sucedida, o usuário MUST ser direcionado para:

/dashboard

Credenciais inválidas MUST NOT criar uma sessão autenticada.

### Requisições autenticadas

Requisições para endpoints protegidos MUST enviar o access token
utilizando:

Authorization: Bearer <access-token>

A inclusão do access token SHOULD ser centralizada na infraestrutura
HTTP da aplicação e não repetida manualmente em cada feature.

### Sessão

O frontend MUST ser capaz de determinar se existe uma sessão
autenticada.

As informações do usuário autenticado SHOULD ser obtidas da API
quando necessário, utilizando:

GET /api/auth/me

Componentes individuais MUST NOT implementar sua própria lógica
independente de autenticação.

### Refresh token

Quando uma requisição protegida falhar porque o access token não é
mais válido, o frontend SHOULD tentar renovar a sessão utilizando:

POST /api/auth/refresh

Se a renovação for bem-sucedida:

1. os novos tokens retornados pela API MUST substituir os anteriores;
2. a requisição original SHOULD ser executada novamente.

O frontend MUST NOT executar múltiplas renovações concorrentes para
a mesma sessão quando várias requisições receberem erro de
autenticação simultaneamente.

Se a renovação falhar, a sessão local MUST ser encerrada e o usuário
MUST ser direcionado para `/login`.

### Logout

O frontend MUST permitir que o usuário encerre sua sessão.

O refresh token atual MUST ser enviado para:

POST /api/auth/logout

Após o logout, os dados locais da sessão MUST ser removidos.

O usuário MUST ser direcionado para `/login`.

### Rotas públicas

As seguintes áreas MUST ser acessíveis sem autenticação:

- `/login`
- `/register`
- páginas públicas de acompanhamento de tracking.

### Rotas protegidas

`/dashboard` e funcionalidades de gerenciamento dos trackings do
usuário MUST exigir autenticação.

Quando um usuário não autenticado tentar acessar uma rota protegida,
o frontend MUST direcioná-lo para `/login`.

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

Mensagens apresentadas ao usuário MUST NOT expor tokens, detalhes
internos da API, stack traces ou informações sensíveis.

## Dependências e Decisões Pendentes

- TBD: estratégia de armazenamento do access token no navegador.
- TBD: estratégia de armazenamento do refresh token no navegador.
- TBD: comportamento de `/login` e `/register` quando o usuário já
  estiver autenticado.
- TBD: preservação ou não da URL originalmente solicitada após o login.

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