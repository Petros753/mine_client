/**
 * Имя cookie, в котором /admin/inventory помнит последний выбранный филиал.
 *
 * Держим в отдельном модуле, а не в actions.ts, потому что файлы `"use server"`
 * в Next.js экспортируют только async-функции — вынесенный сюда const
 * может импортироваться и серверной страницей, и server action одновременно.
 */
export const INVENTORY_BRANCH_COOKIE = "inv_branchId";
