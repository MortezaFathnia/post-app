import { ContractType, CustomerType, LoanType, Prisma } from "@prisma/client";
import type { DbExcelRow } from "./types";

function value(row: DbExcelRow, header: string): string | null {
  const raw = row[header];
  if (raw === undefined || raw === null) return null;
  const result = String(raw).trim();
  return result.length ? result : null;
}

function firstValue(row: DbExcelRow, headers: string[]): string | null {
  for (const header of headers) {
    const result = value(row, header);
    if (result) return result;
  }
  return null;
}

function mapLoanType(row: DbExcelRow): LoanType | null {
  const normalize = (input: string | null) => (input ?? "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();

  // Some DB sheets use «نوع تسهیلات(انتخاب شود)» for the product (e.g. مرابحه),
  // while «نحوه بازپرداخت(انتخاب شود)» identifies the schedule (یکجا/اقساطی).
  // Prefer an explicit schedule label when present, otherwise fall back to repayment method.
  const explicit = normalize(firstValue(row, ["نوع تسهیلات(انتخاب شود)", "نوع تسهیلات", "نوع وام"]));
  if (explicit.includes("سررسیدی")) return LoanType.MATURITY;
  if (explicit === "اقساط" || explicit.includes("تسهیلات اقساط") || explicit.startsWith("اقساط ")) {
    return LoanType.INSTALLMENT;
  }

  const repayment = normalize(firstValue(row, ["نحوه بازپرداخت(انتخاب شود)", "نحوه بازپرداخت"]));
  if (!repayment) return null;
  if (["یکجا", "یکجایی", "سررسیدی", "در سررسید"].includes(repayment) || repayment.includes("سررسیدی")) {
    return LoanType.MATURITY;
  }
  if (repayment.includes("اقساط")) return LoanType.INSTALLMENT;
  return null;
}

function mapGuarantor(row: DbExcelRow, n: 1 | 2 | 3) {
  const suffix = String(n);
  const variants: Record<string, string[]> = {
    Name: [`نام و نام خانوادگی ضامن${suffix}`, `نام و نام خانوادگی ضامن ${suffix}`],
    NationalCode: [`کدملی/شناسه ملی ضامن ${suffix}`, `کدملی/شناسه ملی ضامن${suffix}`],
    PostalCode: [`کد پستی ضامن ${suffix}`, `کد پستی ضامن${suffix}`],
    BirthCertificate: [`شماره شناسنامه/ثبت ضامن${suffix}`, `شماره شناسنامه/ثبت ضامن ${suffix}`],
    BirthCertificateSerial: [`سریال شناسنامه ضامن${suffix}`, `سریال شناسنامه ضامن ${suffix}`],
    BirthDate: [`تاریخ تولد/ثبت ضامن${suffix}`, `تاریخ تولد/ثبت ضامن ${suffix}`],
    FatherName: [`نام پدر ضامن${suffix}`, `نام پدر ضامن ${suffix}`],
    BirthPlace: [`صادر/محل ثبت ضامن${suffix}`, `صادره/محل ثبت ضامن${suffix}`],
    Residence: [`مقیم ضامن ${suffix}`, `مقیم ضامن${suffix}`],
    Address: [`آدرس منزل ضامن ${suffix}`, `آدرس منزل ضامن${suffix}`],
    WorkAddress: [`آدرس محل کار ضامن ${suffix}`, `آدرس محل کار ضامن${suffix}`],
    Landline: [`تلفن منزل ضامن ${suffix}`, `تلفن منزل ضامن${suffix}`],
    WorkPhone: [`تلفن محل کار ضامن ${suffix}`, `تلفن محل کار ضامن${suffix}`],
    Mobile: [`موبایل ضامن${suffix}`, `موبایل ضامن ${suffix}`],
    Occupation: [`شغل ضامن ${suffix}`, `شغل ضامن${suffix}`],
    AccountNumber: [`شماره حساب ضامن ${suffix}`, `شماره حساب ضامن${suffix}`],
    AccountOpeningDate: [`تاریخ افتتاح حساب ضامن${suffix}`, `تاریخ افتتاح حساب ضامن ${suffix}`],
    LongTermDepositNumber: [`شماره سپرده بلندمدت ضامن ${suffix}`, `شماره سپرده بلند مدت ضامن ${suffix}`],
    LongTermDepositAmount: [`مبلغ سپرده بلندمدت ضامن ${suffix}`, `مبلغ سپرده بلند مدت ضامن ${suffix}`],
    CustomerNumber: [`شماره مشتری ضامن${suffix}`, `شماره مشتری ضامن ${suffix}`],
  };

  return Object.fromEntries(
    Object.entries(variants).map(([field, headers]) => [
      `guarantor${suffix}${field}`,
      firstValue(row, headers),
    ]),
  );
}

export function mapDbExcelRow(row: DbExcelRow, fileName: string, excelRowNumber: number) {
  const debtorName = value(row, "نام و نام خانوادگی مدیون");
  const loanType = mapLoanType(row);

  const mapped = {
    type: CustomerType.INDIVIDUAL,
    contractType: ContractType.MORABAHA,
    loanType,

    name: debtorName,
    nationalCode: value(row, "کدملی/شناسه ملی مدیون"),
    postalCode: value(row, "کد پستی مدیون"),
    birthCertificateNumber: value(row, "شماره شناسنامه/ثبت مدیون"),
    birthCertificateSerial: value(row, "سریال شناسنامه مدیون"),
    birthDate: value(row, "تاریخ تولد/ثبت مدیون"),
    fatherName: value(row, "نام پدر مدیون"),
    birthPlace: firstValue(row, ["صادره/محل ثبت مدیون", "صادر/محل ثبت مدیون"]),
    address: value(row, "آدرس منزل مدیون"),
    workAddress: value(row, "آدرس محل کار مدیون"),
    landline: value(row, "تلفن منزل مدیون"),
    workPhone: value(row, "تلفن محل کار مدیون"),
    mobile: value(row, "موبایل مدیون"),
    occupation: value(row, "شغل مدیون"),
    debtorAccountNumber: value(row, "شماره حساب مدیون"),
    debtorAccountOpeningDate: value(row, "تاریخ افتتاح حساب مدیون"),
    debtorLongTermDepositNumber: firstValue(row, ["شماره سپرده بلند مدت مدیون", "شماره سپرده بلندمدت مدیون"]),
    debtorLongTermDepositAmount: value(row, "مبلغ سپرده بلند مدت مدیون"),
    debtorCustomerNumber: value(row, "شماره مشتری مدیون"),

    requestDate: value(row, "تاریخ درخواست"),
    requestNumber: value(row, "شماره درخواست"),
    approvalDate: value(row, "تاریخ مصوبه"),
    approvalNumber: value(row, "شماره مصوبه"),
    contractDate: value(row, "تاریخ قرارداد/اعطاء"),
    maturityDate: value(row, "تاریخ سررسید"),
    contractNumber: value(row, "قرارداد(شماره پیگیری بانک مرکزی)"),
    contractCode: value(row, "شماره اندیکاتور(برای فرم قرارداد)"),

    facilityAmount: value(row, "مبلغ تسهیلات اعطایی(سهم بانک)"),
    prepayment: value(row, "پیش دریافت(سهم20%مشتری)"),
    payableAmount: value(row, "مبلغ تسهیلات/فاکتور(سهم بانک و پیش دریافت)"),
    facilityDescription: value(row, "مورد مصرف(انتخاب شود)"),
    economicSector: value(row, "بخش اقتصادی"),
    useOfFunds: value(row, "مورد مصرف(انتخاب شود)"),
    transactionDescription: value(row, "شرح معامله و مشخصات فاکتور"),
    interestRate: value(row, "نرخ تسهیلات"),
    latePaymentRate: value(row, "نرخ وجه التزام تاخیر تادیه"),
    contractDuration: value(row, "مدت تسهیلات(به ماه)"),
    repaymentMethod: value(row, "نحوه بازپرداخت(انتخاب شود)"),
    gracePeriod: value(row, "دوران تنفس"),
    installmentInterval: value(row, "فاصله اقساط مبادله ای"),
    firstInstallmentDate: value(row, "تاریخ سررسید اولین قسط"),
    installmentAmount: value(row, "قسط تسهیلات مرابحه/جعاله"),
    firstQardInstallmentDate: value(row, "سررسید اولین قسط قرض الحسنه"),
    bankParticipationPercent: value(row, "درصد شراکت بانک در تسهیلات مشارکتی"),
    proposedPartnershipProfit: value(row, "سود پیشنهادی تسهیلات مشارکتی"),
    proposedMudarabahProfit: value(row, "سود پیشنهادی تسهیلات مضاربه"),
    collateralType: value(row, "نوع وثیقه"),
    collateralDescription: value(row, "توضیحات کامل وثیقه"),

    bankName: value(row, "نام بانک"),
    branchName: value(row, "نام شعبه"),
    branchPostalCode: value(row, "کد پستی"),
    branchPhone: value(row, "تلفن شعبه"),
    branchCode: value(row, "کد شعبه"),
    branchManager: value(row, "رییس شعبه"),
    branchAddress: value(row, "آدرس شعبه"),
    counterName: value(row, "نام باجه"),
    counterCode: value(row, "کد باجه"),
    brokerName: value(row, "نام کارگزار"),
    brokerCustomerCode: value(row, "کدمعرف(شماره مشتری کارگزار)"),

    ...mapGuarantor(row, 1),
    ...mapGuarantor(row, 2),
    ...mapGuarantor(row, 3),

    dbExcelData: row as unknown as Prisma.InputJsonObject,
    dbExcelSourceFile: fileName,
    dbExcelSourceRow: excelRowNumber,
  };

  return mapped;
}
