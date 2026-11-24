const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");
const confirmation = process.env.CONFIRM_MOCK_DATA_CLEANUP;

async function main() {
  const [customers, contracts, links, bankDetails] = await Promise.all([
    prisma.customer.count(),
    prisma.contractDetails.count(),
    prisma.contractCustomer.count(),
    prisma.bankDetails.count(),
  ]);

  console.log("Mock customer/contract data cleanup");
  console.log("-----------------------------------");
  console.log(`Customer:         ${customers}`);
  console.log(`ContractDetails:  ${contracts}`);
  console.log(`ContractCustomer: ${links}`);
  console.log(`BankDetails:      ${bankDetails} (preserved; detached from deleted contracts)`);

  if (!execute) {
    console.log("\nDry run only. No data was changed.");
    console.log("To execute: CONFIRM_MOCK_DATA_CLEANUP=YES npm run cleanup:mock-customer-contract-data -- --execute");
    return;
  }

  if (confirmation !== "YES") {
    throw new Error("Execution blocked. Set CONFIRM_MOCK_DATA_CLEANUP=YES to confirm this destructive cleanup.");
  }

  const deleted = await prisma.$transaction(async (tx) => {
    // Remove association rows first, then customers and contracts.
    const deletedLinks = await tx.contractCustomer.deleteMany({});
    const deletedCustomers = await tx.customer.deleteMany({});
    const deletedContracts = await tx.contractDetails.deleteMany({});
    // BankDetails uses ON DELETE SET NULL and remains as shared bank/branch data.
    return {
      contractCustomers: deletedLinks.count,
      customers: deletedCustomers.count,
      contractDetails: deletedContracts.count,
    };
  });

  console.log("\nCleanup completed:");
  console.log(JSON.stringify(deleted, null, 2));
  console.log("BayeganiRecord, DebtDocument, DebtDiscountingRecord, and BankDetails were not deleted.");
}

main()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
