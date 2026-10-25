"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import UploadLoadingOverlay from "@/components/UploadLoadingOverlay";

type UploadResponse = {
  success: boolean;
  id?: number;
  error?: string;
};

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [contractNumber, setContractNumber] = useState("");
  const [contractCode, setContractCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!contractNumber.trim()) {
      setError("شماره قرارداد الزامی است.");
      return;
    }

    if (!file) {
      setError("لطفاً فایل Excel را انتخاب کنید.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("contractNumber", contractNumber.trim());
      formData.append("contractCode", contractCode.trim());

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result =
        (await response.json()) as UploadResponse;

      if (!response.ok || !result.success || !result.id) {
        throw new Error(
          result.error || "خطا در ثبت قرارداد",
        );
      }

      router.push(`/template/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ثبت قرارداد",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <UploadLoadingOverlay
        open={loading}
        title="در حال ثبت قرارداد..."
        description="فایل Excel در حال بارگذاری و اطلاعات قرارداد در حال ذخیره‌سازی است. لطفاً منتظر بمانید."
      />
      <div dir="rtl" className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          ثبت قرارداد جدید
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          اطلاعات قرارداد را وارد کرده و فایل Excel را
          آپلود کنید.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          <div className="space-y-6">
            {/* Contract Number */}
            <div>
              <label
                htmlFor="contractNumber"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                شماره قرارداد
                <span className="mr-1 text-red-500">*</span>
              </label>

              <input
                id="contractNumber"
                type="text"
                value={contractNumber}
                onChange={(event) =>
                  setContractNumber(event.target.value)
                }
                placeholder="شماره قرارداد را وارد کنید"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading}
              />
            </div>

            {/* Contract Code */}
            <div>
              <label
                htmlFor="contractCode"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                کد قرارداد
                <span className="mr-1 text-xs text-gray-400">
                  (اختیاری)
                </span>
              </label>

              <input
                id="contractCode"
                type="text"
                value={contractCode}
                onChange={(event) =>
                  setContractCode(event.target.value)
                }
                placeholder="کد قرارداد را وارد کنید"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading}
              />
            </div>

            {/* Excel */}
            <div>
              <label
                htmlFor="excelFile"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                فایل Excel
                <span className="mr-1 text-red-500">*</span>
              </label>

              <input
                id="excelFile"
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) =>
                  setFile(event.target.files?.[0] ?? null)
                }
                disabled={loading}
                className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white text-sm text-gray-700 file:mr-4 file:rounded-r-lg file:border-0 file:border-l file:border-gray-300 file:bg-gray-50 file:px-4 file:py-3 file:text-sm file:font-medium"
              />

              <p className="mt-2 text-xs text-gray-500">
                فایل Excel باید فقط شامل یک قرارداد باشد.
              </p>

              {file && (
                <p className="mt-2 text-sm text-green-600">
                  فایل انتخاب‌شده: {file.name}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/contracts")
                }
                disabled={loading}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "در حال ثبت..."
                  : "ثبت قرارداد"}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </>
  );
}