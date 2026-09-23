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

## Comportamentos Esperados

### Acesso autenticado

O frontend MUST NOT iniciar o fluxo de compartilhamento quando não
houver uma sessão autenticada.

Quando um usuário não autenticado tentar iniciar um compartilhamento,
o frontend MUST aplicar o comportamento de rotas e sessão definido em
`specs/authentication.md`.

O fluxo de compartilhamento MUST NOT implementar uma lógica
independente de autenticação.

### Permissão de localização

Antes de criar um tracking, o frontend MUST solicitar ou obter
permissão de geolocalização do navegador.

O frontend MUST tratar a ausência de suporte à Geolocation API no
navegador.

Se a permissão for negada, revogada, perdida ou não puder ser obtida,
o frontend MUST informar que o compartilhamento não pode continuar com
localização ativa.

O frontend MUST NOT criar um tracking apenas com permissão concedida.
A criação depende também de uma posição inicial válida.

### Obtenção da posição inicial

Antes de chamar `POST /api/tracking`, o frontend MUST obter uma posição
inicial válida do navegador.

Um tracking MUST NOT ser criado se uma posição inicial válida não
puder ser obtida.

A posição inicial MUST incluir latitude e longitude.

Latitude e longitude iniciais MUST ser enviadas ao criar o tracking:

```http
POST /api/tracking
```

O formato exato do payload de criação é `TBD`, exceto pela obrigação de
incluir latitude e longitude.

Erros da Geolocation API durante a obtenção da posição inicial MUST
ser tratados antes de qualquer tentativa de criação do tracking.

### Criação do tracking

Ao criar um tracking, o frontend MUST chamar:

```http
POST /api/tracking
```

A requisição MUST ser autenticada com o access token conforme definido
em `specs/authentication.md`.

Se a criação for bem-sucedida, o frontend MUST manter o token público
retornado pela API para esse tracking.

O token retornado pela API MUST ser usado nas atualizações e no
encerramento do mesmo tracking.

Se `POST /api/tracking` falhar, o frontend MUST NOT apresentar o
tracking como criado ou ativo.

### Acompanhamento da posição

Após uma criação bem-sucedida, o frontend SHOULD acompanhar novas
posições do navegador enquanto o compartilhamento estiver ativo.

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

O frontend MUST impedir múltiplos fluxos locais concorrentes para o
mesmo compartilhamento.

### Atualização da API

Quando uma nova posição válida for enviada para a API, o frontend MUST
chamar:

```http
PUT /api/tracking/{token}
```

A atualização MUST enviar latitude e longitude da posição a ser
registrada.

O formato exato do payload de atualização é `TBD`, exceto pela
obrigação de incluir latitude e longitude.

Se `PUT /api/tracking/{token}` falhar, o frontend MUST tratar a falha e
MUST NOT apresentar essa atualização como concluída.

A política de retry para falhas de atualização é `TBD`.

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

Depois de encerrado, o frontend MUST parar de enviar novas posições
para esse tracking.

Se `DELETE /api/tracking/{token}` falhar, o frontend MUST informar que
o compartilhamento não foi encerrado e MUST NOT apresentar o
encerramento como concluído.

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
- falha ao encerrar compartilhamento.

O frontend MUST tratar erros da Geolocation API, incluindo falhas de
permissão, indisponibilidade de posição e timeout quando aplicável ao
método de captura escolhido.

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

Mensagens de erro MUST NOT expor tokens completos, stack traces ou
detalhes internos da API.

## Dependências e Decisões Pendentes

- TBD: intervalo ou frequência de atualização da localização.
- TBD: uso de `watchPosition()` ou outra estratégia para acompanhar
  mudanças de posição.
- TBD: opções da Geolocation API, incluindo `enableHighAccuracy`,
  `timeout` e `maximumAge`.
- TBD: comportamento esperado quando o navegador estiver em
  background.
- TBD: política de retry para falhas de criação, atualização ou
  encerramento.
- TBD: distância mínima necessária para enviar uma nova posição.
- TBD: persistência local do tracking ativo após reload, fechamento de
  aba ou reabertura do navegador.
- TBD: formato exato do payload de `POST /api/tracking`.
- TBD: formato exato do payload de `PUT /api/tracking/{token}`.
- TBD: formato exato da resposta de criação, além da obrigação de
  retornar um token público.
- TBD: destino ou tela exibida após criação bem-sucedida do tracking.
- TBD: formato das mensagens apresentadas ao usuário.
- TBD: comportamento de reconciliação quando o encerramento retornar
  tracking não encontrado.

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
- expiração automática do tracking.
