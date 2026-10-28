const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Authoritative 30-row list from «باجه ها.xlsx».
const counters = [
  {
    "code": "1357",
    "name": "بجستان"
  },
  {
    "code": "1358",
    "name": "گناباد"
  },
  {
    "code": "300",
    "name": "نامشخص"
  },
  {
    "code": "40044",
    "name": "نوقاب"
  },
  {
    "code": "40828",
    "name": "فخرآباد"
  },
  {
    "code": "41391",
    "name": "زین آباد"
  },
  {
    "code": "42960",
    "name": "منصوری"
  },
  {
    "code": "44806",
    "name": "فودنجان"
  },
  {
    "code": "45172",
    "name": "جزین"
  },
  {
    "code": "46005",
    "name": "یونسی"
  },
  {
    "code": "48135",
    "name": "قنبرآباد"
  },
  {
    "code": "48251",
    "name": "کاخک"
  },
  {
    "code": "48465",
    "name": "روشناوند"
  },
  {
    "code": "50773",
    "name": "نوق"
  },
  {
    "code": "52399",
    "name": "ریاب"
  },
  {
    "code": "52523",
    "name": "باغ آسیا"
  },
  {
    "code": "53967",
    "name": "بیمرغ"
  },
  {
    "code": "55378",
    "name": "بیلند"
  },
  {
    "code": "56038",
    "name": "زیبد"
  },
  {
    "code": "56516",
    "name": "بیدخت"
  },
  {
    "code": "56660",
    "name": "مند"
  },
  {
    "code": "60936",
    "name": "نوده پشنگ"
  },
  {
    "code": "61242",
    "name": "ماراندیز"
  },
  {
    "code": "61807",
    "name": "قوژد"
  },
  {
    "code": "61880",
    "name": "سردق"
  },
  {
    "code": "64508",
    "name": "دلویی"
  },
  {
    "code": "65537",
    "name": "کلات"
  },
  {
    "code": "66250",
    "name": "گیسوربالا"
  },
  {
    "code": "68088",
    "name": "بهاباد"
  },
  {
    "code": "68156",
    "name": "رهن"
  }
];

async function main() {
  const count = await prisma.$transaction(async (tx) => {
    // Replace the reference list so obsolete codes/names from earlier imports are removed.
    await tx.bajehCode.deleteMany();
    await tx.bajehCode.createMany({ data: counters });
    return tx.bajehCode.count();
  });

  console.log(`جدول bajehCode با ${count} باجه از فایل مرجع به‌روزرسانی شد.`);
}

main()
  .catch((error) => {
    console.error("خطا در به‌روزرسانی جدول bajehCode:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
