-- Move contract classification from Customer to ContractDetails.
ALTER TABLE "ContractDetails"
  ADD COLUMN "contractType" "ContractType" NOT NULL DEFAULT 'MORABAHA',
  ADD COLUMN "loanType" "LoanType";
