"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import UploadLoadingOverlay from "@/components/UploadLoadingOverlay";

export default function DebtDocumentsUploadPage() {
  const router = useRouter();

  const [customerId, setCustomerId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!customerId.trim()) {
      setError("شناسه قرارداد را وارد کنید.");
      return;
    }

    if (!file) {
      setError("فایل Excel را انتخاب کنید.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("customerId", customerId);
      formData.append("file", file);

      const response = await fetch(
        "/api/debt-documents/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "خطا در بارگذاری فایل",
        );
      }

      setSuccess(
        `${result.count} سند با موفقیت ثبت شد.`,
      );

      setTimeout(() => {
        router.push(`/template/${result.customerId}`);
      }, 1000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطا در بارگذاری فایل",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <UploadLoadingOverlay
        open={loading}
        title="در حال بارگذاری اسناد..."
        description="فایل Excel در حال پردازش و اسناد در حال ثبت هستند. لطفاً منتظر بمانید."
      />
      <div dir="rtl" className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          بارگذاری اسناد خرید دین
        </h1>

        <p className="mt-2 text-gray-600">
          فایل Excel شامل چک‌ها و اسناد تجاری قرارداد خرید دین
          را بارگذاری کنید.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* Customer ID */}

        <div className="mb-6">
          <label
            htmlFor="customerId"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            شناسه قرارداد
          </label>

          <input
            id="customerId"
            type="number"
            value={customerId}
            onChange={(event) =>
              setCustomerId(event.target.value)
            }
            disabled={loading}
            placeholder="مثلاً 39"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <p className="mt-2 text-xs text-gray-500">
            شناسه همان عددی است که در URL قرارداد مشاهده
            می‌کنید؛ مثلاً /template/39
          </p>
        </div>

        {/* Excel */}

        <div className="mb-6">
          <label
            htmlFor="file"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            فایل Excel اسناد
          </label>

          <input
            id="file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
            className="block w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
          />

          {file && (
            <p className="mt-2 text-sm text-gray-600">
              فایل انتخاب‌شده:
              <span className="mr-1 font-medium">
                {file.name}
              </span>
            </p>
          )}
        </div>

        {/* Excel format */}

        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <h2 className="mb-3 font-bold">
            ساختار Excel
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-2">
                    نوع سند
                  </th>

                  <th className="border p-2">
                    تاریخ سررسید
                  </th>

                  <th className="border p-2">
                    شماره سریال
                  </th>

                  <th className="border p-2">
                    مبلغ اسمی سند
                  </th>

                  <th className="border p-2">
                    متعهد
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="border p-2">
                    چک
                  </td>

                  <td className="border p-2">
                    ۱۴۰۵/۰۸/۲۰
                  </td>

                  <td className="border p-2">
                    123456
                  </td>

                  <td className="border p-2">
                    1,000,000,000
                  </td>

                  <td className="border p-2">
                    نام متعهد
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Buttons */}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "در حال بارگذاری..."
              : "بارگذاری اسناد"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            انصراف
          </button>
        </div>
      </form>
      </div>
    </>
  );
}