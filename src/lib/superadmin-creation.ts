import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const SERVICE_TYPES = ["HOSTEL", "PG", "LIBRARY", "COACHING", "MESS", "LAUNDRY", "GYM", "COWORKING"] as const;
const PROPERTY_STATUSES = ["DRAFT", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const;
const ROLES = ["STUDENT", "OWNER"] as const;
const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

type ServiceType = (typeof SERVICE_TYPES)[number];
type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
type Role = (typeof ROLES)[number];
type Gender = (typeof GENDERS)[number];
type PropertyLookupClient = Pick<typeof prisma, "property"> | Pick<Prisma.TransactionClient, "property">;

export interface AdminAccountInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  role?: unknown;
  gender?: unknown;
  aadharNo?: unknown;
  image?: unknown;
}

export interface AdminPropertyInput {
  ownerId?: unknown;
  name?: unknown;
  serviceType?: unknown;
  description?: unknown;
  price?: unknown;
  gstRate?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  pincode?: unknown;
  status?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  nearbyLandmark?: unknown;
  distanceMarket?: unknown;
  distanceInstitute?: unknown;
  isAC?: unknown;
  hasWifi?: unknown;
  forGender?: unknown;
  occupancy?: unknown;
  foodIncluded?: unknown;
  laundryIncluded?: unknown;
  hasMedical?: unknown;
  nearbyMess?: unknown;
  nearbyLaundry?: unknown;
  cancellationPolicy?: unknown;
  rules?: unknown;
  customAmenities?: unknown;
  capacity?: unknown;
  availableRooms?: unknown;
  closingTime?: unknown;
  imageUrls?: unknown;
}

export interface OwnerImportInput extends AdminPropertyInput {
  ownerName?: unknown;
  ownerEmail?: unknown;
  ownerPhone?: unknown;
  ownerGender?: unknown;
}

export class SuperAdminCreationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SuperAdminCreationError";
    this.status = status;
  }
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizePhone(value: unknown): string {
  return text(value).replace(/[^\d]/g, "");
}

function normalizeEmail(value: unknown): string {
  return text(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function generateRandomPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function generatedEmail(prefix: string, name: string, phone: string) {
  const base = slugify(name).replace(/^-+|-+$/g, "").slice(0, 28) || prefix;
  const suffix = phone || randomBytes(4).toString("hex");
  return `${prefix}.${base}.${suffix}@aaspass.local`;
}

function parseRole(value: unknown): Role {
  const normalized = text(value).toUpperCase();
  if (ROLES.includes(normalized as Role)) return normalized as Role;
  throw new SuperAdminCreationError("Role must be STUDENT or OWNER");
}

function parseGender(value: unknown): Gender | null {
  const normalized = text(value).toUpperCase();
  if (!normalized) return null;
  if (GENDERS.includes(normalized as Gender)) return normalized as Gender;
  if (["BOY", "BOYS", "MALE", "M"].includes(normalized)) return "MALE";
  if (["GIRL", "GIRLS", "FEMALE", "F"].includes(normalized)) return "FEMALE";
  if (["OTHER", "ANY", "COED", "CO-ED"].includes(normalized)) return "OTHER";
  throw new SuperAdminCreationError("Gender must be MALE, FEMALE, or OTHER");
}

function parseServiceType(value: unknown): ServiceType {
  const normalized = text(value).toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, ServiceType> = {
    ACCOMMODATION: "HOSTEL",
    HOSTELS: "HOSTEL",
    PAYING_GUEST: "PG",
    TIFFIN: "MESS",
    TIFFIN_SERVICE: "MESS",
    STUDY_ROOM: "LIBRARY",
    STUDY_ROOMS: "LIBRARY",
    COWORK: "COWORKING",
    CO_WORKING: "COWORKING",
  };
  const resolved = aliases[normalized] || normalized;
  if (SERVICE_TYPES.includes(resolved as ServiceType)) return resolved as ServiceType;
  throw new SuperAdminCreationError("Invalid service type");
}

function parseStatus(value: unknown): PropertyStatus {
  const normalized = text(value).toUpperCase();
  if (!normalized) return "VERIFIED";
  if (["ACTIVE", "APPROVED", "PUBLISHED"].includes(normalized)) return "VERIFIED";
  if (PROPERTY_STATUSES.includes(normalized as PropertyStatus)) return normalized as PropertyStatus;
  throw new SuperAdminCreationError("Invalid property status");
}

function parseGenderPreference(value: unknown): Gender | null {
  const normalized = text(value).toUpperCase();
  if (!normalized || ["ANY", "ALL", "COED", "CO-ED", "NA", "N/A"].includes(normalized)) return null;
  if (GENDERS.includes(normalized as Gender)) return normalized as Gender;
  if (["BOY", "BOYS", "MALE", "M"].includes(normalized)) return "MALE";
  if (["GIRL", "GIRLS", "FEMALE", "F"].includes(normalized)) return "FEMALE";
  if (normalized === "OTHER") return "OTHER";
  throw new SuperAdminCreationError("Invalid gender preference");
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = text(value).toLowerCase();
  return ["1", "true", "yes", "y", "included", "available"].includes(normalized);
}

function parseNumber(value: unknown, field: string, required = false): number | null {
  const raw = text(value).replace(/,/g, "");
  if (!raw) {
    if (required) throw new SuperAdminCreationError(`${field} is required`);
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new SuperAdminCreationError(`${field} must be a number`);
  return parsed;
}

function parseInteger(value: unknown, field: string): number | null {
  const parsed = parseNumber(value, field);
  if (parsed === null) return null;
  return Math.trunc(parsed);
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }
  return text(value)
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseImageUrls(value: unknown): string[] {
  return parseStringArray(value).filter((url) => /^https?:\/\//i.test(url));
}

async function uniquePropertySlug(name: string, db: PropertyLookupClient): Promise<string> {
  const base = slugify(name).replace(/^-+|-+$/g, "") || `service-${Date.now()}`;
  let slug = base;
  let index = 2;

  while (await db.property.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}

export async function createAccountBySuperAdmin(input: AdminAccountInput, superadminId: string) {
  const name = text(input.name);
  if (name.length < 2) throw new SuperAdminCreationError("Name must be at least 2 characters");

  const role = parseRole(input.role || "STUDENT");
  const phone = normalizePhone(input.phone);
  const emailFromInput = normalizeEmail(input.email);
  const email = emailFromInput || (phone ? generatedEmail(role.toLowerCase(), name, phone) : "");

  if (!email || !isValidEmail(email)) throw new SuperAdminCreationError("Valid email or phone is required");
  if (phone && phone.length < 10) throw new SuperAdminCreationError("Phone must be at least 10 digits");

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { id: true },
  });

  if (existing) {
    throw new SuperAdminCreationError("User with this email or phone already exists", 409);
  }

  const suppliedPassword = text(input.password);
  if (suppliedPassword && suppliedPassword.length < 6) {
    throw new SuperAdminCreationError("Password must be at least 6 characters");
  }
  const password = suppliedPassword || generateRandomPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const gender = parseGender(input.gender);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        gender,
        password: passwordHash,
        aadharNo: text(input.aadharNo) || null,
        role,
        image: text(input.image) || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        gender: true,
        createdAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        superadminId,
        actionType: "CREATE_USER",
        targetType: "USER",
        targetId: created.id,
        targetName: created.name,
        afterValue: JSON.stringify({ email: created.email, phone: created.phone, role: created.role }),
      },
    });

    return created;
  });

  return {
    user,
    generatedPassword: suppliedPassword ? null : password,
    generatedEmail: emailFromInput ? null : email,
  };
}

export async function findOrCreateOwnerForImport(input: OwnerImportInput, superadminId: string) {
  const ownerName = text(input.ownerName);
  const ownerPhone = normalizePhone(input.ownerPhone);
  const ownerEmailFromInput = normalizeEmail(input.ownerEmail);
  const ownerEmail = ownerEmailFromInput || (ownerPhone ? generatedEmail("owner", ownerName || "owner", ownerPhone) : "");

  if (ownerName.length < 2) throw new SuperAdminCreationError("Owner name is required");
  if (!ownerPhone || ownerPhone.length < 10) throw new SuperAdminCreationError("Owner contact number is required");
  if (!ownerEmail || !isValidEmail(ownerEmail)) throw new SuperAdminCreationError("Owner email is invalid");

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: ownerPhone },
        { email: ownerEmail },
      ],
    },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (existing.role !== "OWNER") updates.role = "OWNER";
    if (!existing.phone) updates.phone = ownerPhone;

    if (Object.keys(updates).length > 0) {
      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: existing.id },
          data: updates,
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        });
        await tx.auditLog.create({
          data: {
            superadminId,
            actionType: "PROMOTE_USER_TO_OWNER",
            targetType: "USER",
            targetId: user.id,
            targetName: user.name,
            beforeValue: JSON.stringify({ role: existing.role, phone: existing.phone }),
            afterValue: JSON.stringify({ role: user.role, phone: user.phone }),
            reason: "Bulk property import",
          },
        });
        return user;
      });

      return { owner: updated, created: false, promoted: existing.role !== "OWNER", generatedPassword: null };
    }

    return { owner: existing, created: false, promoted: false, generatedPassword: null };
  }

  const password = generateRandomPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const gender = parseGender(input.ownerGender);

  const owner = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        gender,
        password: passwordHash,
        role: "OWNER",
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });

    await tx.auditLog.create({
      data: {
        superadminId,
        actionType: "CREATE_USER",
        targetType: "USER",
        targetId: created.id,
        targetName: created.name,
        afterValue: JSON.stringify({ email: created.email, phone: created.phone, role: created.role }),
        reason: "Bulk property import",
      },
    });

    return created;
  });

  return { owner, created: true, promoted: false, generatedPassword: password };
}

export async function createPropertyForAccount(input: AdminPropertyInput, superadminId: string, reason?: string) {
  const ownerId = text(input.ownerId);
  if (!ownerId) throw new SuperAdminCreationError("Owner account is required");

  const name = text(input.name);
  if (name.length < 2) throw new SuperAdminCreationError("Property name is required");

  const serviceType = parseServiceType(input.serviceType);
  const price = parseNumber(input.price, "Price", true)!;
  if (price <= 0) throw new SuperAdminCreationError("Price must be positive");

  const address = text(input.address);
  const city = text(input.city);
  const state = text(input.state);
  const pincode = text(input.pincode);
  if (!address || !city || !state || !pincode) {
    throw new SuperAdminCreationError("Address, city, state, and pincode are required");
  }

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!owner) throw new SuperAdminCreationError("Owner account not found", 404);

  const status = parseStatus(input.status);
  const imageUrls = parseImageUrls(input.imageUrls);

  const result = await prisma.$transaction(async (tx) => {
    let ownerAfter = owner;
    let promoted = false;

    if (owner.role !== "OWNER") {
      ownerAfter = await tx.user.update({
        where: { id: owner.id },
        data: { role: "OWNER" },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      });
      promoted = true;

      await tx.auditLog.create({
        data: {
          superadminId,
          actionType: "PROMOTE_USER_TO_OWNER",
          targetType: "USER",
          targetId: owner.id,
          targetName: owner.name,
          beforeValue: JSON.stringify({ role: owner.role }),
          afterValue: JSON.stringify({ role: "OWNER" }),
          reason: reason || "Property assigned by super admin",
        },
      });
    }

    const slug = await uniquePropertySlug(name, tx);
    const property = await tx.property.create({
      data: {
        name,
        slug,
        serviceType,
        description: text(input.description) || `Service listed by AasPass Super Admin for ${city}.`,
        price,
        gstRate: parseNumber(input.gstRate, "GST rate") ?? 18,
        address,
        city,
        state,
        pincode,
        latitude: parseNumber(input.latitude, "Latitude"),
        longitude: parseNumber(input.longitude, "Longitude"),
        nearbyLandmark: text(input.nearbyLandmark) || null,
        distanceMarket: text(input.distanceMarket) || null,
        distanceInstitute: text(input.distanceInstitute) || null,
        isAC: parseBoolean(input.isAC),
        hasWifi: parseBoolean(input.hasWifi),
        forGender: parseGenderPreference(input.forGender),
        occupancy: parseInteger(input.occupancy, "Occupancy"),
        foodIncluded: parseBoolean(input.foodIncluded),
        laundryIncluded: parseBoolean(input.laundryIncluded),
        hasMedical: parseBoolean(input.hasMedical),
        nearbyMess: text(input.nearbyMess) || null,
        nearbyLaundry: text(input.nearbyLaundry) || null,
        cancellationPolicy: text(input.cancellationPolicy) || null,
        rules: text(input.rules) || null,
        customAmenities: parseStringArray(input.customAmenities),
        capacity: parseInteger(input.capacity, "Capacity"),
        availableRooms: parseInteger(input.availableRooms, "Available rooms"),
        closingTime: text(input.closingTime) || null,
        status,
        ownerId: ownerAfter.id,
        images: imageUrls.length
          ? {
              create: imageUrls.map((url, index) => ({
                url,
                isWideShot: index === 0,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, role: true } },
        images: { select: { id: true, url: true } },
      },
    });

    if (status === "VERIFIED") {
      const expiryDate = new Date(ownerAfter.createdAt.getTime() + 90 * 24 * 60 * 60 * 1000);
      const isFreePublish = new Date() < expiryDate;

      await tx.servicePublishingFee.create({
        data: {
          propertyId: property.id,
          ownerId: ownerAfter.id,
          serviceType,
          amount: 0,
          isFreePublish,
          paidAt: isFreePublish ? new Date() : null,
          expiresAt: isFreePublish ? expiryDate : null,
          status: "active",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        superadminId,
        actionType: "CREATE_SERVICE",
        targetType: "SERVICE",
        targetId: property.id,
        targetName: property.name,
        afterValue: JSON.stringify({
          ownerId: ownerAfter.id,
          ownerEmail: ownerAfter.email,
          serviceType,
          status,
          price,
        }),
        reason: reason || "Property created by super admin",
      },
    });

    return { property, owner: ownerAfter, promoted };
  });

  return result;
}
