import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.argv[2] || 'test+2@example.com';

(async () => {
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      console.log('NOT FOUND');
      process.exitCode = 2;
      return;
    }
    console.log('FOUND', JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }));
  } catch (err) {
    console.error('ERROR', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
