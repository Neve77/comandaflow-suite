# ComandaFlow Restaurante no iOS via Sideloadly

Esta versao usa o mesmo sistema do restaurante dentro de um aplicativo iOS nativo com Capacitor. Ela nao depende da App Store. O Sideloadly assina e instala o arquivo `.ipa` no iPhone usando um computador Windows.

## Antes de gerar o IPA

O iPhone nao executa o backend Node.js e o banco de dados que acompanham o aplicativo Windows. Mantenha o ComandaFlow aberto no computador do restaurante. Sem dominio, conecte o iPhone e o computador a mesma rede Wi-Fi e use o IP privado do computador com a porta `3002`, por exemplo:

```text
http://192.168.0.127:3002
```

O aplicativo aceita HTTP somente em enderecos privados (`10.x.x.x`, `172.16-31.x.x` e `192.168.x.x`). Enderecos externos continuam exigindo HTTPS. Nao use `127.0.0.1`: no iPhone esse endereco aponta para o proprio aparelho.

## Gerar o IPA sem possuir um Mac

1. Envie o projeto para um repositorio privado no GitHub.
2. Abra a aba **Actions**.
3. Escolha **Gerar IPA para Sideloadly**.
4. Clique em **Run workflow**.
5. Ao terminar, baixe o artefato **ComandaFlow-Restaurante-iOS-Sideloadly**.
6. Extraia o `.ipa` e o arquivo `.sha256` no Windows.

A automacao usa um executor macOS apenas para compilar o projeto Xcode. O arquivo resultante permanece sem assinatura para que o Sideloadly aplique a assinatura do Apple ID usado na instalacao.

## Instalar pelo Sideloadly

1. Instale o Sideloadly pelo site oficial: https://sideloadly.io/
2. Conecte o iPhone por USB e confirme **Confiar neste computador**.
3. Arraste o arquivo `ComandaFlow-Restaurante-2.4.6-iOS-Pro-Local.ipa` para o Sideloadly.
4. Informe o Apple ID e inicie a instalacao.
5. No iPhone, habilite o Modo de Desenvolvedor ou confie no perfil quando o iOS solicitar.
6. Abra o ComandaFlow, permita o acesso a **Rede Local** e informe o endereco do computador, incluindo `:3002`.

Se o iPhone nao encontrar o servidor, confirme que o ComandaFlow esta aberto no Windows, que os dois dispositivos estao na mesma rede e que o firewall permite conexoes TCP locais na porta `3002`.

Para criar a regra restrita a rede local, abra o PowerShell como administrador na pasta do projeto e execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\enable-restaurant-lan.ps1
```

Com um Apple ID gratuito, o aplicativo precisa ser renovado a cada 7 dias. O recurso de atualizacao automatica do Sideloadly pode renovar a assinatura quando o iPhone encontra o computador por USB ou Wi-Fi. Uma conta Apple Developer paga permite uma assinatura com validade maior.

## Atualizar o aplicativo

Gere um novo `.ipa` pela mesma automacao e instale por cima da versao anterior usando o mesmo Apple ID e Bundle ID. O aplicativo preserva a configuracao local, mas backups operacionais devem continuar sendo feitos pelo computador do restaurante.

## Comandos locais

No Windows, estes comandos validam o frontend e mantem o projeto Xcode sincronizado:

```powershell
npm run prepare:ios
npm run test:ios
```

A compilacao final do `.ipa` nao ocorre no Windows; ela e feita pelo workflow macOS descrito acima.
