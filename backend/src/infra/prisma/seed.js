const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const prisma = require('./client');

dotenv.config();

const run = async ({ demo = process.argv.includes('--demo') || process.env.SEED_DEMO_DATA === 'true' } = {}) => {
  if (!demo) {
    console.log('Seed de demonstração desativado. O primeiro administrador será criado pela tela inicial.');
    return;
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Banco ja inicializado; seed ignorado.');
    return;
  }

  const password = await bcrypt.hash('Pass@1234', 10);

  const user = await prisma.user.create({
    data: {
      email: 'admin@comanda.local',
      password,
      name: 'Administrador',
      role: 'administrador'
    }
  });

  const event = await prisma.event.create({
    data: {
      name: 'Evento Demonstracao',
      description: 'Evento base para validar relatorios e operacao.',
      location: 'Comanda Flow',
      capacity: 250,
      status: 'ativo',
      startAt: new Date()
    }
  });

  await prisma.client.create({
    data: {
      name: 'Cliente Demonstracao',
      cpf: '12345678901',
      phone: '11999999999',
      email: 'cliente@comanda.local',
      birthDate: new Date('1990-06-15T12:00:00.000Z'),
      loyaltyPoints: 120,
      cashbackBalance: 15,
      tier: 'Bronze'
    }
  });

  const products = [
    { nome: 'Refrigerante 350ml', preco: 6.5, categoria: 'Bebidas', estoque: 20 },
    { nome: 'Cerveja 600ml', preco: 8, categoria: 'Bebidas', estoque: 15 },
    { nome: 'Suco Natural', preco: 7, categoria: 'Bebidas', estoque: 10 },
    { nome: 'Agua Mineral', preco: 3, categoria: 'Bebidas', estoque: 30 },
    { nome: 'Pizza Calabresa G', preco: 45, categoria: 'Pizzas', estoque: 5 },
    { nome: 'Pizza Margherita G', preco: 42, categoria: 'Pizzas', estoque: 8 },
    { nome: 'Pizza Portuguesa G', preco: 48, categoria: 'Pizzas', estoque: 6 },
    { nome: 'Pizza Quatro Queijos G', preco: 46, categoria: 'Pizzas', estoque: 7 },
    { nome: 'Hamburguer Artesanal', preco: 25, categoria: 'Lanches', estoque: 12 },
    { nome: 'Batata Frita', preco: 12, categoria: 'Acompanhamentos', estoque: 25 },
    { nome: 'Salada Caesar', preco: 18, categoria: 'Saladas', estoque: 9 },
    { nome: 'Sorvete', preco: 10, categoria: 'Sobremesas', estoque: 18 },
    { nome: 'Cafe Expresso', preco: 4, categoria: 'Bebidas', estoque: 40 },
    { nome: 'Cappuccino', preco: 8, categoria: 'Bebidas', estoque: 22 }
  ];

  await prisma.produto.createMany({ data: products });

  const bracelets = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'];
  await prisma.bracelet.createMany({
    data: bracelets.map((number, index) => ({
      number,
      type: index % 3 === 0 ? 'RFID' : index % 3 === 1 ? 'NFC' : 'QR'
    }))
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'seed',
      entity: 'System',
      metadata: JSON.stringify({ eventId: event.id })
    }
  });

  console.log('Seed concluido com sucesso');
  console.log('14 produtos cadastrados');
  console.log('10 pulseiras criadas');
  console.log('Dados de demonstração criados. Não use este seed em produção.');
};

if (require.main === module) {
  run()
    .catch((err) => {
      console.error('Erro ao fazer seed:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { run };
