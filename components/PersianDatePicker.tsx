"use client";

import type { CSSProperties } from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

type PersianDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  style?: CSSProperties;
  inputId?: string;
  "aria-label"?: string;
};

export default function PersianDatePicker({
  value,
  onChange,
  className,
  placeholder = "انتخاب تاریخ",
  disabled = false,
  required = false,
  containerClassName,
  containerStyle,
  style,
  inputId,
  "aria-label": ariaLabel,
}: PersianDatePickerProps) {
  return (
    <div className={containerClassName} style={containerStyle}>
      <DatePicker
        id={inputId}
        value={value || ""}
        onChange={(date) => onChange(date ? date.format("YYYY/MM/DD") : "")}
        calendar={persian}
        locale={persian_fa}
        className="persian-datepicker-theme"
        calendarPosition="bottom-right"
        format="YYYY/MM/DD"
        inputClass={className}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={style}
        containerClassName="w-full"
        portal
      />
    </div>
  );
}
