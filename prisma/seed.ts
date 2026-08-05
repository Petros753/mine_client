import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Компания
  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: {
      id: "demo-company",
      name: "Салон красоты «Элегант»",
      industry: "BEAUTY",
    },
  });

  // Филиал
  const branch = await prisma.branch.upsert({
    where: { id: "demo-branch" },
    update: {},
    create: {
      id: "demo-branch",
      companyId: company.id,
      name: "Филиал на Арбате",
      address: "ул. Арбат, 15",
      phone: "+7 (999) 123-45-67",
    },
  });

  // Услуги
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: "service-haircut" },
      update: {},
      create: {
        id: "service-haircut",
        branchId: branch.id,
        name: "Женская стрижка",
        description: "Стрижка любой сложности",
        durationMinutes: 90,
        price: 2500,
      },
    }),
    prisma.service.upsert({
      where: { id: "service-coloring" },
      update: {},
      create: {
        id: "service-coloring",
        branchId: branch.id,
        name: "Окрашивание",
        description: "Окрашивание в один тон",
        durationMinutes: 120,
        price: 4500,
      },
    }),
    prisma.service.upsert({
      where: { id: "service-manicure" },
      update: {},
      create: {
        id: "service-manicure",
        branchId: branch.id,
        name: "Маникюр",
        description: "Классический маникюр с покрытием",
        durationMinutes: 60,
        price: 1800,
      },
    }),
  ]);

  // Сотрудники
  const user1 = await prisma.user.upsert({
    where: { email: "anna@example.com" },
    update: {},
    create: {
      email: "anna@example.com",
      firstName: "Анна",
      lastName: "Иванова",
      passwordHash: "temp",
      role: "EMPLOYEE",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "maria@example.com" },
    update: {},
    create: {
      email: "maria@example.com",
      firstName: "Мария",
      lastName: "Петрова",
      passwordHash: "temp",
      role: "EMPLOYEE",
    },
  });

  const employee1 = await prisma.employee.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      branchId: branch.id,
      position: "Стилист-парикмахер",
    },
  });

  const employee2 = await prisma.employee.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      branchId: branch.id,
      position: "Мастер маникюра",
    },
  });

  // Связь сотрудников с услугами
  await prisma.employeeService.upsert({
    where: {
      employeeId_serviceId: {
        employeeId: employee1.id,
        serviceId: services[0].id,
      },
    },
    update: {},
    create: {
      employeeId: employee1.id,
      serviceId: services[0].id,
    },
  });

  await prisma.employeeService.upsert({
    where: {
      employeeId_serviceId: {
        employeeId: employee1.id,
        serviceId: services[1].id,
      },
    },
    update: {},
    create: {
      employeeId: employee1.id,
      serviceId: services[1].id,
    },
  });

  await prisma.employeeService.upsert({
    where: {
      employeeId_serviceId: {
        employeeId: employee2.id,
        serviceId: services[2].id,
      },
    },
    update: {},
    create: {
      employeeId: employee2.id,
      serviceId: services[2].id,
    },
  });

  // Клиенты
  const client1 = await prisma.client.upsert({
    where: { id: "client-1" },
    update: {},
    create: {
      id: "client-1",
      branchId: branch.id,
      firstName: "Елена",
      lastName: "Сидорова",
      phone: "+7 (999) 111-22-33",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "client-2" },
    update: {},
    create: {
      id: "client-2",
      branchId: branch.id,
      firstName: "Ольга",
      lastName: "Кузнецова",
      phone: "+7 (999) 444-55-66",
    },
  });

  // Записи на сегодня
  const today = new Date();
  today.setHours(10, 0, 0, 0);

  await prisma.appointment.upsert({
    where: { id: "appointment-1" },
    update: {},
    create: {
      id: "appointment-1",
      branchId: branch.id,
      clientId: client1.id,
      employeeId: employee1.id,
      serviceId: services[0].id,
      startAt: today,
      endAt: new Date(today.getTime() + 90 * 60000),
      status: "CONFIRMED",
      price: 2500,
    },
  });

  const today2 = new Date();
  today2.setHours(14, 0, 0, 0);

  await prisma.appointment.upsert({
    where: { id: "appointment-2" },
    update: {},
    create: {
      id: "appointment-2",
      branchId: branch.id,
      clientId: client2.id,
      employeeId: employee2.id,
      serviceId: services[2].id,
      startAt: today2,
      endAt: new Date(today2.getTime() + 60 * 60000),
      status: "CONFIRMED",
      price: 1800,
    },
  });

  console.log("✅ Seed выполнен успешно!");
  console.log(`   Компания: ${company.name}`);
  console.log(`   Филиал: ${branch.name}`);
  console.log(`   Услуги: ${services.length}`);
  console.log(`   Сотрудники: 2`);
  console.log(`   Записи на сегодня: 2`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
