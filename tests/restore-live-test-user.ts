import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const password = await bcrypt.hash("user12345", 12);

  await prisma.user.update({
    where: { email: "user@example.com" },
    data: {
      password,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  console.log("RESTORED");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });