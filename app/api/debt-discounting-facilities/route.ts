import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const allowedStatuses = ["فعال", "تسویه شده"];

export async function GET(request: NextRequest) {
  try {
    const p=request.nextUrl.searchParams,page=Math.max(1,Number(p.get("page")||1)),pageSize=Math.min(100,Math.max(10,Number(p.get("pageSize")||20)));
    const search=(p.get("search")||"").trim(),filterType=p.get("filterType")||"",filterValue=(p.get("filterValue")||"").trim();
    const fields=["facilityTitle","facilityNumber","counterLabel","serial","status","startDate","endDate"] as const;
    const normalize=(v:string)=>v.replace(/[۰-۹٠-٩]/g,d=>{const x="۰۱۲۳۴۵۶۷۸۹".indexOf(d);return String(x>=0?x:"٠١٢٣٤٥٦٧٨٩".indexOf(d));});
    const terms=[...new Set([search,normalize(search)].filter(Boolean))];
    const where:Prisma.DebtDiscountingFacilityWhereInput={};
    if(terms.length)where.OR=terms.flatMap(t=>[...fields.map(f=>({[f]:{contains:t,mode:"insensitive" as const}})),...(Number.isInteger(Number(t))&&Number(t)>0?[{id:Number(t)},{contractId:Number(t)}]:[])]);
    const filterFields:Record<string,keyof Prisma.DebtDiscountingFacilityWhereInput>={facilityTitle:"facilityTitle",facilityNumber:"facilityNumber",contractId:"contractId",counterLabel:"counterLabel",serial:"serial",status:"status",startDate:"startDate",endDate:"endDate"};
    const field=filterFields[filterType];
    if(field&&filterValue){
      if(filterType === "contractId" && !Number.isInteger(Number(normalize(filterValue)))) {
        return NextResponse.json({success:true,records:[],total:0,page,pageSize});
      }
      const conditions = filterType === "contractId"
        ? [{ contractId: Number(normalize(filterValue)) }]
        : [...new Set([filterValue,normalize(filterValue)])].map(t=>({[field]:{contains:t,mode:"insensitive" as const}}));
      if(where.OR){where.AND=[{OR:where.OR},{OR:conditions}];delete where.OR;}else where.OR=conditions;
    }
    const [records,total]=await Promise.all([
      prisma.debtDiscountingFacility.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*pageSize,take:pageSize,include:{contract:{select:{id:true,facilityNumber:true,facilityTitle:true,customerNumber:true}}}}),
      prisma.debtDiscountingFacility.count({where})
    ]);
    return NextResponse.json({success:true,records,total,page,pageSize});
  }catch(error){console.error("Debt discounting facilities list error:",error);return NextResponse.json({success:false,error:"خطا در دریافت فهرست تسهیلات خرید دین"},{status:500});}
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      contractId?: number | string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };
    const contractId = Number(body.contractId);
    const status = body.status || "فعال";
    const startDate = String(body.startDate || "").trim();
    const endDate = String(body.endDate || "").trim();

    if (!Number.isInteger(contractId) || contractId <= 0 ||
        !allowedStatuses.includes(status) || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "رکورد بایگانی، وضعیت و تاریخ شروع و پایان را بررسی کنید." },
        { status: 400 },
      );
    }

    const source = await prisma.bayeganiRecord.findUnique({
      where: { id: contractId },
      select: { facilityNumber: true, facilityTitle: true, counterLabel: true, serial: true },
    });
    if (!source) {
      return NextResponse.json({ success: false, error: "رکورد بایگانی پیدا نشد." }, { status: 404 });
    }

    const record = await prisma.debtDiscountingFacility.create({
      data: {
        contractId,
        facilityNumber: source.facilityNumber,
        facilityTitle: source.facilityTitle,
        counterLabel: source.counterLabel,
        serial: source.serial,
        status,
        startDate,
        endDate,
      },
    });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Debt discounting facility create error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "ثبت تسهیلات خرید دین ناموفق بود." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: number | string; status?: string };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0 || !body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "شناسه یا وضعیت تسهیلات معتبر نیست." },
        { status: 400 },
      );
    }

    const record = await prisma.debtDiscountingFacility.update({
      where: { id },
      data: { status: body.status },
      select: { id: true, status: true },
    });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Debt discounting facility status update error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود." },
      { status: 500 },
    );
  }
}
