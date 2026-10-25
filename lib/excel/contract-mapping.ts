import { ContractType, CustomerType, LoanType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getValue, nullable } from "./excel-utils";

type ExcelRow = Record<string, unknown>;

export function getContractType(row: ExcelRow): ContractType {
  const value = getValue(row, "نوع قرارداد")
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .toLowerCase();

  switch (value) {
    case "مرابحه":
    case "morabaha":
      return ContractType.MORABAHA;

    case "کارت اعتباری":
    case "credit card":
    case "credit-card":
    case "credit_card":
      return ContractType.CREDIT_CARD;

    case "خرید دین":
    case "debt discounting":
    case "debt-discounting":
    case "debt_discounting":
      return ContractType.DEBT_DISCOUNTING;

    default:
      throw new Error(
        `نوع قرارداد نامعتبر است: "${value || "(خالی)"}". ` +
        "مقادیر مجاز: مرابحه، مرابحه کارت اعتباری، خرید دین"
      );
  }
}

export function getLoanType(row: ExcelRow): LoanType | null {
  const value = getValue(row, "نوع تسهیلات").trim();

  if (!value) {
    return null;
  }

  switch (value) {
    case "سررسیدی":
      return LoanType.MATURITY;

    case "اقساط":
      return LoanType.INSTALLMENT;

    default:
      throw new Error(`نوع تسهیلات نامعتبر است: ${value}`);
  }
}

export function getCustomerType(row: ExcelRow): CustomerType {
  const value = getValue(row, "نوع مشتری").trim();

  if (value === "حقوقی" || value.toLowerCase() === "company") {
    return CustomerType.COMPANY;
  }

  return CustomerType.INDIVIDUAL;
}

export function mapContractRow(
  row: ExcelRow,
): Prisma.CustomerCreateInput {
  return {
    type: getCustomerType(row),
    contractType: getContractType(row),
    loanType: getLoanType(row),

    name: nullable(getValue(row, "نام")),
    fatherName: nullable(getValue(row, "نام پدر")),
    birthDate: nullable(getValue(row, "تاریخ تولد")),
    birthCertificateNumber: nullable(
      getValue(row, "شماره شناسنامه"),
    ),
    birthPlace: nullable(getValue(row, "محل تولد")),
    birthCertificateSerial: nullable(
      getValue(row, "سریال شناسنامه"),
    ),
    nationalCode: nullable(getValue(row, "کد ملی")),

    companyName: nullable(getValue(row, "نام شرکت")),
    registrationNumber: nullable(
      getValue(row, "شماره ثبت"),
    ),
    registrationDate: nullable(
      getValue(row, "تاریخ ثبت"),
    ),
    registrationOffice: nullable(
      getValue(row, "محل ثبت"),
    ),
    companyEconomicCode: nullable(
      getValue(row, "کد اقتصادی"),
    ),
    companyNationalId: nullable(
      getValue(row, "شناسه ملی"),
    ),

    postalCode: nullable(getValue(row, "کد پستی")),
    address: nullable(getValue(row, "نشانی")),
    landline: nullable(getValue(row, "تلفن")),
    mobile: nullable(getValue(row, "تلفن همراه")),
    email: nullable(getValue(row, "ایمیل")),

    branchName: nullable(getValue(row, "نام شعبه")),
    branchAddress: nullable(
      getValue(row, "آدرس شعبه"),
    ),
    bankRepresentative: nullable(
      getValue(row, "نماینده بانک"),
    ),

    facilityDescription: nullable(
      getValue(row, "شرح تسهیلات"),
    ),
    requestDate: nullable(
      getValue(row, "تاریخ درخواست"),
    ),

    salePrice: nullable(getValue(row, "قیمت فروش")),
    salePriceWords: nullable(
      getValue(row, "قیمت فروش به حروف"),
    ),
    purchasePrice: nullable(
      getValue(row, "قیمت خرید"),
    ),
    profitAmount: nullable(
      getValue(row, "مبلغ سود"),
    ),
    interestRate: nullable(
      getValue(row, "نرخ سود"),
    ),
    prepayment: nullable(
      getValue(row, "پیش پرداخت"),
    ),
    payableAmount: nullable(
      getValue(row, "مبلغ قابل پرداخت"),
    ),

    installmentCount: nullable(
      getValue(row, "تعداد اقساط"),
    ),
    firstInstallmentDate: nullable(
      getValue(row, "تاریخ اولین قسط"),
    ),
    installmentInterval: nullable(
      getValue(row, "فاصله اقساط"),
    ),
    contractDuration: nullable(
      getValue(row, "مدت قرارداد"),
    ),
    installmentAmount: nullable(
      getValue(row, "مبلغ قسط"),
    ),

    latePaymentBaseRate: nullable(
      getValue(row, "نرخ پایه وجه التزام"),
    ),
    latePaymentRate: nullable(
      getValue(row, "نرخ وجه التزام"),
    ),

    collateralType: nullable(
      getValue(row, "نوع تضمین"),
    ),
    collateralDescription: nullable(
      getValue(row, "شرح تضمین"),
    ),
    collateralValue: nullable(
      getValue(row, "ارزش تضمین"),
    ),

    guarantor1Name: nullable(
      getValue(row, "نام ضامن اول"),
    ),
    guarantor1FatherName: nullable(
      getValue(row, "نام پدر ضامن اول"),
    ),
    guarantor1NationalCode: nullable(
      getValue(row, "کد ملی ضامن اول"),
    ),
    guarantor1Address: nullable(
      getValue(row, "آدرس ضامن اول"),
    ),
    guarantor1PostalCode: nullable(
      getValue(row, "کد پستی ضامن اول"),
    ),
    guarantor1Landline: nullable(
      getValue(row, "تلفن ضامن اول"),
    ),
    guarantor1Mobile: nullable(
      getValue(row, "موبایل ضامن اول"),
    ),

    guarantor2Name: nullable(
      getValue(row, "نام ضامن دوم"),
    ),
    guarantor2FatherName: nullable(
      getValue(row, "نام پدر ضامن دوم"),
    ),
    guarantor2NationalCode: nullable(
      getValue(row, "کد ملی ضامن دوم"),
    ),
    guarantor2Address: nullable(
      getValue(row, "آدرس ضامن دوم"),
    ),
    guarantor2PostalCode: nullable(
      getValue(row, "کد پستی ضامن دوم"),
    ),
    guarantor2Landline: nullable(
      getValue(row, "تلفن ضامن دوم"),
    ),
    guarantor2Mobile: nullable(
      getValue(row, "موبایل ضامن دوم"),
    ),

    guarantor3Name: nullable(
      getValue(row, "نام ضامن سوم"),
    ),
    guarantor3FatherName: nullable(
      getValue(row, "نام پدر ضامن سوم"),
    ),
    guarantor3NationalCode: nullable(
      getValue(row, "کد ملی ضامن سوم"),
    ),
    guarantor3Address: nullable(
      getValue(row, "آدرس ضامن سوم"),
    ),
    guarantor3PostalCode: nullable(
      getValue(row, "کد پستی ضامن سوم"),
    ),
    guarantor3Landline: nullable(
      getValue(row, "تلفن ضامن سوم"),
    ),
    guarantor3Mobile: nullable(
      getValue(row, "موبایل ضامن سوم"),
    ),

    articleCount: nullable(
      getValue(row, "تعداد مواد"),
    ),
    tabagheCount: nullable(
      getValue(row, "تعداد تبصره"),
    ),
    copyCount: nullable(
      getValue(row, "تعداد نسخه"),
    ),
  };
}