const { PrismaClient, Prisma } = require("@prisma/client");

const p = new PrismaClient();

console.log("PrismaClient:", !!PrismaClient);
console.log("Prisma:", !!Prisma);
console.log("$transaction:", typeof p.$transaction);

console.log(
  "models:",
  Object.keys(p)
    .filter((k) => !k.startsWith("_"))
    .sort()
    .join(", ")
);

p.$disconnect();
