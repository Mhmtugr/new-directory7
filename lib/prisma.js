import { PrismaClient } from '@prisma/client';

// PrismaClient'ın singletion instance'ını oluştur
// Bu sayede hot-reloading sırasında çoklu bağlantı oluşmayacak
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;
