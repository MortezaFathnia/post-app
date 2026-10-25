const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const counters = [["66250","گیسور بالا"],["68156","رهن"],["68088","بهاباد"],["46005","یونسی"],["52523","باغ آسیا"],["48465","روشناوند"],["65537","کلات"],["61880","سردق"],["61242","ماراندیز"],["48251","کاخک"],["40044","نوقاب"],["61807","قوژد"],["56038","زيبد"],["51963","روچی"],["1538","گناباد"],["55378","بیلند"],["44806","فودنجان"],["56516","بیدخت"],["56660","مند"],["60936","نوده پشنگ"],["50773","نوق"],["40828","فخر آباد"],["42960","منصوری"],["41391","زین آباد"],["46005","یونسی"],["300","نامشخص"],["53967","بیمرغ"],["64508","دلویی"]];

async function main() {
  let imported = 0;

  for (const [code, name] of counters) {
    await prisma.bajehCode.upsert({
      where: { code_name: { code, name } },
      create: { code, name },
      update: {},
    });
    imported += 1;
  }

  console.log(`Processed ${imported} counter rows from the Excel list.`);
}

main()
  .catch((error) => {
    console.error("Failed to import counter list:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
