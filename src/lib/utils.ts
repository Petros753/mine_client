import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Collator для сортировки в таблицах. Явно пинит локаль, потому что
// String#localeCompare без аргумента спрашивает окружение: Node без LANG
// отвечает en-US и ставит Latin перед Cyrillic, а браузер русского юзера
// отвечает ru-RU и делает наоборот. Без пиннинга SSR-порядок таблицы
// расходится с клиентским → hydration mismatch на любой смеси Ф/Latin.
const collator = new Intl.Collator("ru", { sensitivity: "base" });

/** Сравнение строк для сортировки: одинаково на сервере и в браузере. */
export function compareStrings(a: string, b: string): number {
  return collator.compare(a, b);
}
