/**
 * Общие типы и константы форм входа и регистрации.
 *
 * Файлы с директивой "use server" могут экспортировать только асинхронные
 * функции, поэтому константы и типы форм живут здесь.
 */

export const MIN_PASSWORD_LENGTH = 8;

export interface AuthFormState {
  error?: string;
}
