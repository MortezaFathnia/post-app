import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("اطلاعات ارسالی معتبر نیست.");
  const input = body as Record<string, unknown>;
  const code = normalizePersianText(String(input.code ?? "").trim());
  const name = normalizeCounterName(String(input.name ?? "").trim());
  if (!code || !name) throw new Error("کد باجه و نام باجه الزامی هستند.");
  if (!/^\d+$/.test(code)) throw new Error("کد باجه باید فقط شامل عدد باشد.");
  return { code, name };
}

function updateCounterJson(
  input: unknown,
  oldCode: string,
  oldName: string,
  newCode: string,
  newName: string,
): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;

  const data = { ...(input as Record<string, unknown>) };
  const oldLabel = `${oldCode}-${oldName}`;
  const newLabel = `${newCode}-${newName}`;

  for (const key of ["کد باجه", "باجه", "counterCode"]) {
    if (String(data[key] ?? "").trim() === oldCode) data[key] = newCode;
  }
  for (const key of ["نام باجه", "counterName"]) {
    if (String(data[key] ?? "").trim() === oldName) data[key] = newName;
  }
  for (const key of ["کد باجه-نام باجه", "counterLabel"]) {
    if (String(data[key] ?? "").trim() === oldLabel) data[key] = newLabel;
  }
  for (const key of ["کد بایگانی", "کد بایگانی جدید", "archiveCode"]) {
    const value = String(data[key] ?? "").trim();
    if (value.startsWith(`${oldCode}-`)) data[key] = `${newCode}${value.slice(oldCode.length)}`;
  }

  return data;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: "شناسه باجه نامعتبر است." }, { status: 400 });
    const { code, name } = normalizeInput(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.bajehCode.findUnique({ where: { id } });
      if (!current) throw new Error("باجه پیدا نشد.");

      const duplicate = await tx.bajehCode.findFirst({ where: { code, NOT: { id } } });
      if (duplicate) throw new Error(`کد باجه «${code}» قبلاً ثبت شده است.`);

      const oldLabel = `${current.code}-${current.name}`;
      const newLabel = `${code}-${name}`;

      const bayeganiRecords = await tx.bayeganiRecord.findMany({
        where: {
          OR: [
            { counterCode: current.code },
            { counterLabel: oldLabel },
          ],
        },
        select: { id: true, rawData: true, archiveCode: true },
      });

      for (const record of bayeganiRecords) {
        const rawData = updateCounterJson(record.rawData, current.code, current.name, code, name);
        const archiveCode = record.archiveCode?.startsWith(`${current.code}-`)
          ? `${code}${record.archiveCode.slice(current.code.length)}`
          : record.archiveCode;

        await tx.bayeganiRecord.update({
          where: { id: record.id },
          data: {
            counterCode: code,
            counterName: name,
            counterLabel: newLabel,
            ...(archiveCode !== record.archiveCode ? { archiveCode } : {}),
            ...(rawData ? { rawData: rawData as never } : {}),
          },
        });
      }

      const customers = await tx.customer.findMany({
        where: {
          OR: [
            { counterCode: current.code },
            { AND: [{ counterCode: null }, { counterName: current.name }] },
          ],
        },
        select: { id: true, dbExcelData: true },
      });

      for (const customer of customers) {
        const dbExcelData = updateCounterJson(customer.dbExcelData, current.code, current.name, code, name);
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            counterCode: code,
            counterName: name,
            ...(dbExcelData ? { dbExcelData: dbExcelData as never } : {}),
          },
        });
      }

      const debtRecords = await tx.debtDiscountingRecord.findMany({
        where: {
          OR: [
            { counterLabel: oldLabel },
            { counterLabel: { startsWith: `${current.code}-` } },
          ],
        },
        select: { id: true, counterLabel: true, rawData: true },
      });

      for (const record of debtRecords) {
        const updatedLabel = record.counterLabel.startsWith(`${current.code}-`)
          ? `${code}${record.counterLabel.slice(current.code.length)}`
          : newLabel;
        const rawData = updateCounterJson(record.rawData, current.code, current.name, code, name);
        await tx.debtDiscountingRecord.update({
          where: { id: record.id },
          data: {
            counterLabel: updatedLabel,
            ...(rawData ? { rawData: rawData as never } : {}),
          },
        });
      }

      const counter = await tx.bajehCode.update({ where: { id }, data: { code, name } });
      return {
        counter,
        updatedBayeganiRecords: bayeganiRecords.length,
        updatedCustomers: customers.length,
        updatedDebtDiscountingRecords: debtRecords.length,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ویرایش باجه ناموفق بود.";
    const status = message.includes("الزامی") || message.includes("باید فقط") || message.includes("معتبر نیست")
      ? 400
      : message.includes("قبلاً ثبت شده") ? 409
      : message.includes("پیدا نشد") ? 404
      : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: "شناسه باجه نامعتبر است." }, { status: 400 });
    const current = await prisma.bajehCode.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: "باجه پیدا نشد." }, { status: 404 });
    await prisma.bajehCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "حذف باجه ناموفق بود." }, { status: 500 });
  }
}
