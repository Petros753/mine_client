"use client";

import { useActionState, useState } from "react";
import type { AuthFormState } from "@/lib/auth-forms";

export interface CredentialsField {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  hint?: string;
}

interface CredentialsFormProps {
  action: (
    prevState: AuthFormState,
    formData: FormData
  ) => Promise<AuthFormState>;
  fields: CredentialsField[];
  submitLabel: string;
  pendingLabel: string;
}

export function CredentialsForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
}: CredentialsFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    {}
  );

  // Поля контролируемые: React сбрасывает неконтролируемую форму после
  // выполнения action, и после ошибки пришлось бы вводить всё заново
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.id, ""]))
  );

  return (
    <form action={formAction} className="space-y-5">
      {fields.map((field) => (
        <div key={field.id}>
          <label
            htmlFor={field.id}
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {field.label} *
          </label>
          <input
            id={field.id}
            name={field.id}
            type={field.type ?? "text"}
            required
            autoComplete={field.autoComplete}
            placeholder={field.placeholder}
            minLength={field.minLength}
            value={values[field.id] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }))
            }
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm"
          />
          {field.hint && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {field.hint}
            </p>
          )}
        </div>
      ))}

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
