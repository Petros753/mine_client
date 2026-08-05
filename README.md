# Booking Platform — MVP (аналог YCLIENTS)

## Стек
- Next.js 15 + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL
- (далее подключим) Supabase Auth / NextAuth

## Как запустить локально

1. Установи зависимости:
   ```bash
   npm install
   ```

2. Подними PostgreSQL. Проще всего — через Docker:
   ```bash
   docker run --name booking-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=booking_platform -p 5432:5432 -d postgres:16
   ```

3. Проверь файл `.env` — там уже есть заготовка `DATABASE_URL`. Если меняешь пароль/порт в Docker-команде выше, поправь и здесь.

4. Сгенерируй клиент Prisma и накати схему на базу:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. (Опционально) Открой визуальный редактор базы:
   ```bash
   npx prisma studio
   ```

6. Запусти проект:
   ```bash
   npm run dev
   ```
   Открой http://localhost:3000

## Структура проекта

```
prisma/schema.prisma   — схема базы данных
src/app/                — страницы и роуты (Next.js App Router)
src/lib/                — вспомогательные модули (подключение к БД и т.д.)
```

## Что сделано (Этап 1)
- [x] Спроектирована схема БД: компании, филиалы, сотрудники, услуги, клиенты, записи, уведомления, лояльность, абонементы, склад, подписка

## Что дальше (Этап 2)
- [ ] Подключение Prisma Client к Next.js (src/lib/prisma.ts)
- [ ] Auth (регистрация компании/владельца)
- [ ] Админ-панель: создание филиала, услуг, сотрудников
- [ ] Публичный виджет онлайн-записи
- [ ] Календарь/журнал записи
- [ ] Дашборд с ключевыми метриками (наше отличие от YCLIENTS)
