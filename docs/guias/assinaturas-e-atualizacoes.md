# ComandaFlow 2.3.1 — assinaturas e atualizações online

Esta versão gera dois aplicativos Windows separados:

- `ComandaFlow-Setup-2.3.1.exe`: aplicativo instalado no restaurante assinante.
- `ComandaFlow-Gestor-Setup-2.3.1.exe`: painel privado usado para cadastrar assinantes e publicar atualizações.

## Como o controle online funciona

O **ComandaFlow Gestor** transforma o computador do proprietário no servidor de assinaturas enquanto ele estiver aberto. Os aplicativos dos restaurantes consultam esse computador periodicamente por um endereço HTTPS fixo.

```text
ComandaFlow do restaurante
          ↓ internet
endereço HTTPS fixo / túnel seguro
          ↓
ComandaFlow Gestor no seu PC (porta local 3012)
```

Não é necessário contratar um servidor separado, mas estas condições são obrigatórias:

1. O computador do Gestor deve estar ligado, conectado e com o aplicativo aberto para receber consultas e aplicar novas decisões.
2. Um túnel HTTPS com endereço fixo deve encaminhar as conexões para `http://127.0.0.1:3012`. Pode ser um Cloudflare Tunnel nomeado, domínio reservado do ngrok ou solução equivalente.
3. O endereço não pode mudar depois que as chaves forem emitidas.
4. Não exponha diretamente a porta 3012 do roteador sem HTTPS.

Se o Gestor ficar indisponível, o restaurante continua funcionando pelo período de tolerância configurado (24 horas por padrão). Depois disso, o cliente pede conexão para validar a assinatura. Para usar o Gestor somente de vez em quando, aumente a tolerância, sabendo que uma tolerância maior também aumenta o tempo possível de uso sem contato com seu PC.

## Primeira configuração do Gestor

1. Instale e abra o **ComandaFlow Gestor** somente no computador do proprietário.
2. No primeiro acesso, informe seu nome, e-mail e uma senha forte com pelo menos 10 caracteres.
3. Configure e inicie o túnel HTTPS fixo apontando para `http://127.0.0.1:3012`.
4. No painel, clique em **Configurar servidor**, cole o endereço público e defina a tolerância offline.
5. Use **Novo assinante** para cadastrar o estabelecimento e o contato responsável.
6. Clique em **Emitir**, escolha plano, validade e limite de computadores.
7. Copie a chave `CF3-...` e envie ao assinante junto com o instalador normal.

Não envie o instalador do Gestor a clientes. Ele contém a chave privada usada para emitir assinaturas válidas.

## Primeira configuração do restaurante

1. O cliente instala `ComandaFlow-Setup-2.3.1.exe`.
2. No primeiro acesso, cria o administrador local do restaurante.
3. O aplicativo começa com 14 dias de avaliação.
4. Em **Configurações > Assinatura do ComandaFlow**, cola a chave `CF3-...` e ativa.
5. O computador recebe uma identificação própria e passa a consultar o Gestor automaticamente.

## Suspensão, prazo, mensagem e reativação

No assinante, clique em **Suspender** e escolha:

- **Bloquear imediatamente:** o restaurante perde acesso na próxima sincronização, normalmente em até 1 minuto.
- **Liberar até o prazo:** o sistema continua aberto, mostra a mensagem definida e bloqueia automaticamente na data e hora escolhidas.

Depois de aplicar a suspensão, o painel mostra a mensagem pronta para copiar e enviar ao cliente. A mesma mensagem aparece dentro do aplicativo do restaurante.

Use **Ativar** para retirar a suspensão. A mudança chega na próxima sincronização. Para renovar a validade, emita uma nova chave e envie ao cliente.

Chaves antigas `CF2-...` continuam funcionando offline, mas não aceitam bloqueio remoto. Para colocar um cliente antigo sob controle online, emita e ative uma nova chave `CF3-...`.

## Publicar atualização para os restaurantes

1. Gere ou receba o novo instalador de clientes, por exemplo `ComandaFlow-Setup-2.4.0.exe`.
2. Abra o Gestor e clique em **Publicar nova versão**.
3. Informe a mesma versão do arquivo, descreva as mudanças e selecione o instalador `.exe`.
4. Escolha se a atualização será opcional ou obrigatória.
5. Clique em **Publicar atualização** e aguarde o envio e a verificação chegarem a 100%.

Os restaurantes consultam novas versões automaticamente. Quando houver atualização, o aplicativo mostra as mudanças e as opções **Baixar atualização** e **Instalar e reiniciar**. Durante o download, seu PC, o Gestor e o túnel HTTPS precisam permanecer ligados.

Antes de abrir o instalador, o cliente confere:

- assinatura criptográfica Ed25519 do manifesto;
- hash SHA-256 e tamanho completo do arquivo;
- número da versão, aceitando somente uma versão superior à instalada.

O instalador substitui os arquivos do programa, mas preserva o banco do restaurante em `%APPDATA%\ComandaFlow`.

Importante: a linha 2.3 é a primeira que contém o atualizador. Restaurantes que ainda usam 2.2.0 ou anterior precisam instalar a 2.3.1 manualmente uma única vez. Depois disso, as próximas versões podem ser distribuídas pelo Gestor.

## Dados e segurança

- Dados do cliente: `%APPDATA%\ComandaFlow\data\comandaflow.db`
- Dados do Gestor: `%APPDATA%\ComandaFlowGestor\data\comandaflow.db`
- Configuração e identidade local: arquivo `runtime-config.json` na pasta `data`
- Chave privada de construção: `.secrets\license-private.pem`
- Chave pública distribuída: `build\license-public.pem`

Mantenha backup criptografado do banco do Gestor e da pasta `.secrets`. Use senha forte no Gestor e proteja a conta do serviço de túnel com autenticação em dois fatores.

## Gerar novamente os instaladores

Na pasta `comandaflow-2.0`:

```powershell
npm run release:windows
```

Saídas:

- `dist\client\ComandaFlow-Setup-2.3.1.exe`
- `dist\manager\ComandaFlow-Gestor-Setup-2.3.1.exe`

Testes principais:

```powershell
npm --prefix backend test
npm run test:subscriptions
npm run test:package:client
npm run test:package:manager
npm run test:package:online
```

## Assinatura digital do Windows

Os instaladores locais ainda não possuem certificado de assinatura de código. O Windows pode mostrar um aviso do SmartScreen. Para distribuição comercial ampla, assine os dois instaladores com um certificado de code signing da empresa.
