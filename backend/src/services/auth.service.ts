import prisma from '../data-access/prisma';
import { Role } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { AuthUser } from '../types';

export async function loginUser(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const token = signToken(authUser);
  return { token, user: authUser };
}

export async function registerStaffUser(data: {
  name: string;
  email: string;
  password: string;
  role?: Role;
}): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  if (existing) {
    throw new AppError('A user with this email address already exists.', 409);
  }

  const passwordHash = await hashPassword(data.password);
  const newUser = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role || Role.staff,
    },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
  };
}
