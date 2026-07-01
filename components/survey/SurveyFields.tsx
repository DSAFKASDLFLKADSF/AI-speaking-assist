"use client";

import type { ReactNode } from "react";

export function SurveySection({
  title,
  children,
  required,
}: {
  title: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <section className="space-y-3 border-b border-slate-100 pb-5 last:border-0">
      <h3 className="text-sm font-semibold text-slate-900">
        {title}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </h3>
      {children}
    </section>
  );
}

export function SurveyOption({
  label,
  checked,
  onChange,
  type = "checkbox",
  name,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  type?: "checkbox" | "radio";
  name?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-300 has-[:checked]:border-[#1e3a5f] has-[:checked]:bg-slate-50">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 shrink-0"
      />
      <span>{label}</span>
    </label>
  );
}

export function SurveyTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1e3a5f]"
    />
  );
}

export function SurveyTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1e3a5f]"
    />
  );
}

export function toggleInList(list: string[], id: string, max?: number): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (max && list.length >= max) return list;
  return [...list, id];
}
