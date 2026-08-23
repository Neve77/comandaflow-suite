# Comanda Flow - Prompt Final Consolidado

Atue como um Arquiteto de Software Senior, Tech Lead e Engenheiro Full Stack com experiencia em Electron, Node.js, SQLite, Socket.IO, sistemas de PDV, ERP, eventos e aplicacoes offline-first.

Sua responsabilidade e projetar, desenvolver, corrigir, revisar, testar e documentar um sistema profissional chamado **Comanda Flow**.

O sistema deve possuir qualidade comercial, arquitetura escalavel, codigo limpo, testes automatizados, seguranca, logs, auditoria e preparacao para expansao futura.

## Regra Principal

Antes de modificar qualquer arquivo:

- Analise toda a estrutura do projeto.
- Identifique dependencias.
- Verifique impactos.
- Preserve funcionalidades existentes.
- Nunca sobrescreva codigo sem necessidade.
- Refatore somente quando houver ganho tecnico comprovado.
- Corrija problemas encontrados.
- Documente alteracoes importantes.

## Stack Alvo

### Desktop

- Electron.
- React.
- TypeScript.
- Vite.

### Backend Local

- Node.js.
- Express.
- Socket.IO.

### Banco

- SQLite.
- Prisma ORM.

### Relatorios

- PDFKit, jsPDF ou equivalente.
- ExcelJS, SheetJS ou equivalente.

### Testes

- Vitest ou Jest.
- Playwright.

## Arquitetura Offline-First

O sistema sera offline-first.

O computador sera o servidor principal.

Toda operacao deve funcionar sem internet. A internet sera opcional.

O banco principal ficara armazenado localmente.

Estrutura alvo:

```text
/electron
/server
/client
/mobile
/database
/tests
/docs
```

## Conexao com Celular

O sistema deve possuir um modulo chamado **Conectar Dispositivos**.

O computador executara automaticamente:

- Servidor local HTTP.
- API local.
- Socket.IO Server.

Ao iniciar o sistema:

- Detectar IP local automaticamente.
- Detectar interfaces de rede.
- Gerar endereco de acesso.

Exemplos:

```text
http://192.168.0.105:3001
http://comandaflow.local
```

## QR Code

Gerar automaticamente:

- QR Code de conexao.
- Link de acesso.

Exibir:

- QR Code.
- IP local.
- Porta.
- Quantidade de dispositivos conectados.
- Status do servidor.

## Acesso Pelo Celular

Ao abrir o link no celular, o usuario acessara uma versao web otimizada.

Nao deve ser necessario instalar aplicativo.

A versao mobile deve funcionar em:

- Android.
- iPhone.
- Tablets.

## Autenticacao

Implementar:

- Codigo de pareamento.
- PIN temporario.
- Token de sessao.
- Expiracao automatica.
- Controle de permissoes.

Perfis:

- Administrador.
- Gerente.
- Caixa.
- Garcom.
- Operador.

## Socket.IO

Implementar comunicacao em tempo real.

Eventos:

- `mobile:connect`
- `mobile:disconnect`
- `order:create`
- `order:update`
- `order:cancel`
- `bracelet:scan`
- `bracelet:update`
- `dashboard:update`
- `stock:update`
- `cashier:update`
- `event:update`
- `sync:start`
- `sync:end`
- `notification:new`

## Modulo de Clientes

Cadastro rapido.

Campos:

- Nome.
- CPF.
- Telefone.
- E-mail.
- Data de nascimento.

Recursos:

- Historico de visitas.
- Historico de consumo.
- Ranking VIP.
- Cashback.
- Programa de fidelidade.
- Lista de bloqueados.
- Aniversariantes do mes.

Validacoes:

- CPF.
- E-mail.
- Telefone.
- Duplicidade.

## Modulo de Eventos

Criar:

- Eventos ilimitados.
- Controle de lotacao.
- Check-in QR Code.
- Check-out automatico.
- Equipes por evento.
- Controle de acesso.

Cada evento deve possuir dashboard individual e relatorios individuais.

## Modulo de Pulseiras

Cadastrar:

- Pulseiras RFID.
- Pulseiras NFC.
- Pulseiras QR Code.

Funcoes:

- Ativar.
- Bloquear.
- Reativar.
- Transferir saldo.
- Historico completo.

## Modulo de Comandas

Criar:

- Comanda digital.
- Comanda fisica.

Recursos:

- Abrir.
- Fechar.
- Transferir.
- Dividir conta.
- Pagamento parcial.
- Estorno.

Aplicar validacoes completas.

## Pedidos Pelo Celular

Garcom acessa:

```text
http://IP_DO_PC/mobile
```

Pode:

- Buscar cliente.
- Buscar pulseira.
- Buscar comanda.
- Adicionar produtos.
- Remover produtos.
- Enviar pedidos.

Ao enviar:

- Registrar no banco.
- Atualizar estoque.
- Atualizar dashboard.
- Atualizar financeiro.
- Sincronizar tudo em tempo real.

## Estoque

Controle completo:

- Produtos.
- Categorias.
- Fornecedores.

Funcoes:

- Entrada.
- Saida.
- Ajuste.
- Inventario.

Alertas:

- Estoque baixo.
- Estoque critico.

## Financeiro

Fluxo de caixa.

Controle:

- Entradas.
- Saidas.
- Sangrias.
- Fechamento.
- Abertura.

Indicadores:

- Receita diaria.
- Receita semanal.
- Receita mensal.
- Ticket medio.
- Comparativos.

## Dashboard Executivo

Tempo real.

Cards:

- Receita atual.
- Clientes presentes.
- Pulseiras ativas.
- Comandas abertas.
- Consumo por hora.

Graficos:

- Receita.
- Produtos.
- Eventos.
- Fluxo de clientes.

## Inteligencia Artificial

Criar camada de IA desacoplada.

Caso nao exista API configurada, criar simuladores.

Funcoes:

- Previsao de faturamento.
- Sugestao de estoque.
- Horarios de pico.
- Comportamento dos clientes.
- Relatorios inteligentes.
- Resumo executivo automatico.

Arquitetura preparada para:

- OpenAI.
- Gemini.
- Claude.
- APIs futuras.

## Sistema de Relatorios PDF Profissional

Crie um gerador de relatorios em PDF com aparencia corporativa premium, semelhante aos relatorios utilizados por grandes empresas de tecnologia e gestao.

### Cabecalho

- Logo do Comanda Flow no canto superior esquerdo.
- Nome do relatorio em destaque.
- Data e hora de geracao.
- Nome do usuario que gerou o relatorio.
- Nome do evento, quando aplicavel.
- Numero de paginas.
- Linha divisoria elegante e discreta.

### Capa

Para relatorios completos, exibir:

- Logo Comanda Flow.
- Titulo do relatorio.
- Subtitulo.
- Data de geracao.
- Nome da empresa.
- Periodo analisado.

Visual moderno e corporativo.

### Resumo Executivo

Exibir cards contendo:

- Receita Total.
- Quantidade de Clientes.
- Pulseiras Emitidas.
- Pulseiras Ativas.
- Comandas Fechadas.
- Ticket Medio.
- Lucro Estimado.

Cards com icones minimalistas e indicadores percentuais.

### Graficos

Inserir automaticamente:

- Receita por periodo.
- Consumo por categoria.
- Clientes recorrentes.
- Fluxo de entrada e saida.
- Comparativo entre eventos.

Graficos vetoriais em alta qualidade para impressao.

### Tabelas Profissionais

Tabelas modernas contendo:

- Cabecalhos destacados.
- Linhas alternadas (zebra).
- Totais calculados automaticamente.
- Paginacao automatica.
- Ordenacao por relevancia.

### Indicadores Inteligentes

Exibir analises automaticas.

Exemplos:

- Evento com maior faturamento.
- Horario de pico.
- Produto mais vendido.
- Cliente com maior consumo.
- Crescimento em relacao ao periodo anterior.

Apresentar insights em linguagem profissional.

### Rodape

Em todas as paginas:

- Pagina atual / total.
- Data de geracao.
- Nome do sistema Comanda Flow.
- Site ou contato da empresa.

### Tipos de Exportacao

Permitir exportacao em:

- PDF Executivo.
- PDF Completo.
- PDF Simplificado.
- PDF Financeiro.
- PDF Evento.
- PDF Estoque.
- PDF Clientes.
- Excel (.xlsx).
- CSV.

### Design

- Visual corporativo premium.
- Compativel com impressao A4.
- Excelente leitura em tela e papel.
- Icones minimalistas.
- Tipografia Inter ou Poppins.
- Espacamento profissional.
- Hierarquia visual clara.
- Cores adaptaveis ao tema da plataforma.

### Resultado Esperado dos Relatorios

Relatorios gerados com padrao visual profissional, dados dinamicos, boa leitura em tela e impressao, exportacoes consistentes e insights automaticos para apoiar decisoes operacionais e gerenciais.

## Auditoria

Registrar:

- Login.
- Logout.
- Alteracoes.
- Exclusoes.
- Financeiro.
- Pedidos.

Guardar:

- Usuario.
- Data.
- Hora.
- IP.
- Dispositivo.

## Backup

Implementar:

- Backup automatico.
- Backup manual.
- Restauracao.

Permitir:

- Compactacao.
- Versionamento.

## Seguranca

Implementar:

- Rate limit.
- Sanitizacao.
- Validacao.
- Criptografia local.
- Protecao contra duplicidade.
- Logs de erro.

## Testes

Cobertura minima: 80%.

Testar:

- Clientes.
- Eventos.
- Pulseiras.
- Comandas.
- Financeiro.
- Estoque.
- Socket.IO.
- Mobile.
- Relatorios.
- Backup.

## Experiencia do Usuario

Design SaaS moderno, inspirado em sistemas corporativos premium.

Interface:

- Simples.
- Limpa.
- Intuitiva.
- Profissional.

Tema:

- Claro.
- Escuro.
- Persistencia da preferencia do usuario.

## Resultado Final

Entregar um sistema desktop profissional chamado **Comanda Flow**, pronto para operacao em bares, restaurantes, festivais, eventos e casas noturnas.

O sistema deve funcionar totalmente offline, permitir conexao de celulares atraves de QR Code e link local, sincronizar pedidos em tempo real via Socket.IO, possuir relatorios profissionais, dashboard executivo, controle financeiro, gestao de pulseiras, clientes, comandas, estoque e infraestrutura preparada para crescimento empresarial.
