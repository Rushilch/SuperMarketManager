import prisma from '../data-access/prisma';
import { AppError } from '../utils/AppError';

export async function getAllCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });
}

export async function getCustomerById(id: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!customer) {
    throw new AppError(`Customer with ID ${id} not found.`, 404);
  }

  return customer;
}

export async function getCustomerByPhone(phone: string) {
  const cleanPhone = phone.trim();
  if (!cleanPhone) {
    throw new AppError('Phone number is required for lookup.', 400);
  }

  // Find by exact match or substring/suffix
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: cleanPhone },
        { phone: { contains: cleanPhone.replace(/[\s\-\(\)]/g, '') } },
      ],
    },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  return customer;
}

export async function createCustomer(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}) {
  const trimmedName = data.name.trim();
  const trimmedEmail = data.email?.toLowerCase().trim() || null;
  const trimmedPhone = data.phone?.trim() || null;

  if (trimmedEmail) {
    const existingEmail = await prisma.customer.findUnique({
      where: { email: trimmedEmail },
    });
    if (existingEmail) {
      throw new AppError(`Customer with email "${trimmedEmail}" already exists.`, 409);
    }
  }

  if (trimmedPhone) {
    const existingPhone = await prisma.customer.findUnique({
      where: { phone: trimmedPhone },
    });
    if (existingPhone) {
      throw new AppError(`Customer with phone "${trimmedPhone}" already exists.`, 409);
    }
  }

  return prisma.customer.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      address: data.address?.trim() || null,
      loyaltyPoints: 10, // Initial welcome loyalty bonus
    },
  });
}
