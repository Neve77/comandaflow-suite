# Scripts

- `build/`: criação de chaves, preparação do runtime e empacotamento Windows.
- `database/`: aplicação das migrações Prisma em Windows ou Linux.
- `deploy/`: implantação Docker, verificação, backup, restauração e atualização.
- `tests/`: validações de assinatura, atualização e executáveis empacotados.

Os comandos públicos ficam no `package.json` da raiz. Os scripts de implantação devem ser executados a partir de qualquer caminho; eles resolvem internamente a raiz do projeto.

O script de restauração substitui o banco do ambiente selecionado e sempre solicita confirmação. Defina `COMPOSE_FILE` para operar com um arquivo Compose diferente do padrão `docker-compose.prod.yml`.
