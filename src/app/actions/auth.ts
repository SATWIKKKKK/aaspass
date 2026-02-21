"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { signIn } from "@/lib/auth";

export async function registerUser(data: RegisterInput) {
  try {
    const validated = registerSchema.parse(data);

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validated.email },
          { phone: validated.phone },
        ],
      },
    });

    if (existing) {
      return { error: "User with this email or phone already exists" };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        gender: validated.gender,
        password: hashedPassword,
        aadharNo: validated.aadharNo || null,
        role: validated.role,
      },
    });

    return { success: true, userId: user.id };
  } catch (error: any) {
    if (error.issues) {
      return { error: error.issues[0].message };
    }
    return { error: "Registration failed. Please try again." };
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { error: result.error };
    }

    return { success: true };
  } catch (error: any) {
    return { error: "Invalid credentials" };
  }
}
