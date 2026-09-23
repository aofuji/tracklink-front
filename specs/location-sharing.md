# Location Sharing

## Objetivo

Definir o comportamento do frontend para iniciar, manter, atualizar e
encerrar um compartilhamento de localização do usuário autenticado no
TrackLink, usando a Geolocation API do navegador e os endpoints de
tracking existentes na API.

O fluxo coberto por esta especificação é:

```text
permissão de localização -> obtenção da posição -> criação do tracking -> acompanhamento da posição -> atualização da API -> encerramento
```

## Escopo

O compartilhamento de localização MUST permitir que um usuário
autenticado:

- solicite ou obtenha permissão de geolocalização do navegador;
- obtenha uma posição inicial válida antes de criar um tracking;
- crie um tracking enviando latitude e longitude iniciais;
- mantenha o token público retornado pela API após a criação;
- acompanhe novas posições enquanto o compartilhamento estiver ativo;
- envie atualizações de localização para o tracking ativo;
- encerre o compartilhamento iniciado;
- trate estados de permissão, captura de localização, API e
  encerramento.

O usuário MUST estar autenticado para iniciar um compartilhamento de
localização.

O frontend MUST depender do comportamento definido em
`specs/authentication.md` para determinar se existe uma sessão
autenticada e para enviar o access token em requisições protegidas.

O frontend MUST usar os seguintes endpoints existentes:

```http
POST /api/tracking
PUT /api/tracking/{token}
DELETE /api/tracking/{token}
```

`POST /api/tracking` e `PUT /api/tracking/{token}` MUST ser chamados
como requisições autenticadas.

O tracking criado MUST pertencer ao usuário autenticado.

A autenticação, inclusão de Bearer token, refresh token e tratamento
global de sessão continuam sendo responsabilidade da infraestrutura
definida em `specs/authentication.md`.

## Comportamentos Esperados

### Acesso autenticado

O frontend MUST NOT iniciar o fluxo de compartilhamento quando não
houver uma sessão autenticada.

Quando um usuário não autenticado tentar iniciar um compartilhamento,
o frontend MUST aplicar o comportamento de rotas e sessão definido em
`specs/authentication.md`.

O fluxo de compartilhamento MUST NOT implementar uma lógica
independente de autenticação.

### Rota do fluxo

A rota protegida para iniciar e manter o compartilhamento local MUST
ser:

```text
/tracking/new
```

Essa rota MUST exigir autenticação e MUST usar o comportamento definido
em `specs/authentication.md` para usuários não autenticados.

O Dashboard MUST navegar para `/tracking/new` por meio da ação
"Novo compartilhamento".

Quando a futura rota pública `/tracking/:token` for adicionada,
`/tracking/new` MUST ter precedência no roteamento para que `new` não
seja interpretado como um token público.

### Permissão de localização

Antes de criar um tracking, o frontend MUST solicitar ou obter
permissão de geolocalização do navegador.

O frontend MUST tratar a ausência de suporte à Geolocation API no
navegador.

A posição inicial MUST ser obtida utilizando:

```text
navigator.geolocation.getCurrentPosition()
```

As chamadas à Geolocation API MUST usar as seguintes opções:

```ts
enableHighAccuracy: true
timeout: 10000
maximumAge: 5000
```

Se a permissão for negada, revogada, perdida ou não puder ser obtida,
o frontend MUST informar com mensagem específica e segura que a
permissão de localização foi negada ou está indisponível.

Permissão de geolocalização negada MUST impedir a criação do tracking.

Quando a permissão for negada, o frontend SHOULD permitir que o
usuário tente novamente após ajustar a permissão no navegador.

O frontend MUST NOT criar um tracking apenas com permissão concedida.
A criação depende também de uma posição inicial válida.

### Obtenção da posição inicial

Antes de chamar `POST /api/tracking`, o frontend MUST obter uma posição
inicial válida do navegador usando `getCurrentPosition()`.

Um tracking MUST NOT ser criado se uma posição inicial válida não
puder ser obtida.

A posição inicial MUST incluir latitude e longitude.

Latitude e longitude iniciais MUST ser enviadas ao criar o tracking:

```http
POST /api/tracking
```

O payload de criação MUST enviar somente os campos suportados pelo
contrato atual do backend:

```json
{
  "latitude": 0,
  "longitude": 0
}
```

O frontend MUST NOT adicionar `accuracy`, timestamp ou outros campos
ao payload de criação sem suporte explícito do backend.

Erros da Geolocation API durante a obtenção da posição inicial MUST
ser tratados antes de qualquer tentativa de criação do tracking.

Timeout ou indisponibilidade temporária da localização antes da criação
MUST impedir a criação e MUST gerar mensagem específica e segura.

### Criação do tracking

Ao criar um tracking, o frontend MUST chamar:

```http
POST /api/tracking
```

A requisição MUST ser autenticada com o access token conforme definido
em `specs/authentication.md`.

Se a criação for bem-sucedida, o frontend MUST manter o token público
retornado pela API para esse tracking.

Com o contrato conhecido no projeto, a resposta de criação MUST conter
pelo menos o campo `token`. Nenhum outro campo de resposta deve ser
assumido pelo frontend sem suporte explícito do backend.

O token retornado pela API MUST ser usado nas atualizações e no
encerramento do mesmo tracking.

Após criação bem-sucedida, o frontend MUST manter o usuário em uma
tela ou estado de compartilhamento ativo, sem mapa.

Se `POST /api/tracking` falhar, o frontend MUST NOT apresentar o
tracking como criado ou ativo.

O frontend MUST NOT fazer retry automático de `POST /api/tracking`.

### Acompanhamento da posição

Após uma criação bem-sucedida, o frontend MUST acompanhar novas
posições do navegador enquanto o compartilhamento estiver ativo usando:

```text
navigator.geolocation.watchPosition()
```

O watcher MUST usar as mesmas opções definidas para a Geolocation API:

```ts
enableHighAccuracy: true
timeout: 10000
maximumAge: 5000
```

Enquanto o compartilhamento estiver ativo, novas posições válidas do
navegador devem poder atualizar o tracking usando:

```http
PUT /api/tracking/{token}
```

O `token` usado na URL MUST ser o token retornado pela criação do
tracking.

A requisição de atualização MUST ser autenticada com o access token
conforme definido em `specs/authentication.md`.

O frontend MUST NOT tentar atualizar um tracking quando não houver
token mantido para ele.

O frontend MUST permitir somente um fluxo local de compartilhamento
ativo por vez.

O frontend MUST limpar o watcher ao finalizar o fluxo de
compartilhamento ou destruir a tela responsável.

O funcionamento em background é best effort: o frontend MUST NOT
prometer atualizações contínuas quando o navegador ou o sistema
operacional suspender a execução.

O frontend MUST NOT pausar deliberadamente o compartilhamento em
resposta a `visibilitychange`.

O frontend MUST NOT persistir o tracking ativo em `localStorage` ou
`sessionStorage` no MVP.

Após reload da aplicação, fechamento de aba ou reabertura do navegador,
o frontend MUST NOT retomar automaticamente o watcher anterior.

### Atualização da API

Quando uma nova posição válida for enviada para a API, o frontend MUST
chamar:

```http
PUT /api/tracking/{token}
```

A atualização MUST enviar latitude e longitude da posição a ser
registrada.

O payload de atualização MUST enviar somente os campos suportados pelo
contrato atual do backend:

```json
{
  "latitude": 0,
  "longitude": 0
}
```

O frontend MUST NOT adicionar `accuracy`, timestamp ou outros campos
ao payload de atualização sem suporte explícito do backend.

O frontend MUST NOT enviar cada callback recebido de `watchPosition()`.

O frontend MUST enviar uma nova posição quando pelo menos uma das
seguintes condições for satisfeita:

- houver deslocamento de pelo menos 10 metros desde a última posição
  enviada com sucesso;
- tiverem passado pelo menos 10 segundos desde o último envio.

Se `PUT /api/tracking/{token}` falhar, o frontend MUST tratar a falha e
MUST NOT apresentar essa atualização como concluída.

Se `PUT /api/tracking/{token}` falhar por erro temporário, o frontend
MUST NOT encerrar automaticamente o tracking. Uma posição futura que
satisfaça os critérios de envio pode tentar atualizar novamente.

Se `PUT /api/tracking/{token}` indicar que o tracking não existe, está
inativo ou está expirado, o frontend MUST parar o watcher e informar
que o compartilhamento não está mais ativo.

Timeout ou indisponibilidade temporária da Geolocation API durante um
compartilhamento já criado MUST NOT encerrar automaticamente o
tracking.

### Encerramento

O usuário MUST poder encerrar o compartilhamento.

Para encerrar o compartilhamento, o frontend MUST chamar:

```http
DELETE /api/tracking/{token}
```

O `token` usado na URL MUST ser o token do tracking ativo mantido após
a criação.

O frontend MUST NOT tentar encerrar um compartilhamento quando não
houver token mantido para o tracking.

O frontend MUST NOT fazer retry automático de
`DELETE /api/tracking/{token}`.

Ao encerrar com sucesso, o frontend MUST limpar o watcher e finalizar
o estado local de compartilhamento ativo.

Depois de encerrado, o frontend MUST parar de enviar novas posições
para esse tracking.

Se `DELETE /api/tracking/{token}` retornar que o tracking não foi
encontrado, o frontend MUST limpar o watcher, finalizar o fluxo local e
informar com mensagem específica e segura que o tracking não foi
encontrado.

Se `DELETE /api/tracking/{token}` falhar por outro motivo, o frontend
MUST informar que o compartilhamento não foi encerrado e MUST NOT
apresentar o encerramento como concluído.

## Estados e Erros

O frontend MUST representar estados coerentes para:

- usuário não autenticado;
- solicitação de permissão de localização;
- permissão de localização negada, perdida ou indisponível;
- obtenção da posição inicial;
- erro ao obter posição inicial;
- criação do tracking em andamento;
- tracking criado e compartilhamento ativo;
- atualização de localização em andamento, quando aplicável;
- falha ao atualizar localização;
- encerramento em andamento;
- compartilhamento encerrado;
- tracking não encontrado, inativo ou expirado durante atualização;
- falha ao encerrar compartilhamento.

O frontend MUST tratar erros da Geolocation API, incluindo falhas de
permissão, indisponibilidade de posição e timeout.

O frontend MUST tratar perda ou negação da permissão de localização
durante um compartilhamento ativo.

Se a permissão de localização for perdida durante um compartilhamento
ativo, o frontend MUST parar de apresentar novas posições como
atualizadas até que uma nova posição válida possa ser obtida e enviada
com sucesso.

Se uma atualização de localização falhar na API, o frontend MUST
distinguir a posição obtida localmente da posição confirmada pela API.

Se a API responder que a sessão não é válida ou não está autorizada,
o frontend MUST aplicar o comportamento de sessão definido em
`specs/authentication.md`.

Mensagens ao usuário MUST ser específicas e seguras para:

- permissão de localização negada;
- localização indisponível;
- timeout ao obter localização;
- falha de criação do tracking;
- falha de atualização de localização;
- tracking não encontrado, inativo ou expirado durante atualização;
- falha de encerramento;
- tracking não encontrado durante encerramento.

Mensagens de erro MUST NOT expor tokens completos, stack traces ou
detalhes internos da API.

## Dependências e Decisões Pendentes

Não há decisões pendentes nesta especificação.

## Fora de Escopo

Esta especificação não define:

- implementação Angular;
- componentes Angular;
- services Angular;
- guards Angular;
- interceptors;
- bibliotecas de UI;
- layout visual, mapa, cores ou ícones;
- página pública de acompanhamento de tracking;
- listagem de trackings no Dashboard;
- detalhes de autenticação além da dependência de
  `specs/authentication.md`;
- alteração de contratos do backend;
- endpoints adicionais;
- SignalR, WebSocket ou atualização em tempo real para espectadores;
- compartilhamento com destinatários específicos;
- expiração automática do tracking;
- persistência local do tracking ativo no MVP.
