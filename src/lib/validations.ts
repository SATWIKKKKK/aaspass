import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  aadharNo: z.string().optional(),
  role: z.enum(["STUDENT", "OWNER"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const propertySchema = z.object({
  name: z.string().min(2, "Property name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  serviceType: z.enum(["HOSTEL", "PG", "LIBRARY", "COACHING", "MESS", "LAUNDRY", "GYM", "COWORKING"]),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6).max(6, "Pincode must be 6 digits"),
  price: z.number().positive("Price must be positive"),
  isAC: z.boolean().default(false),
  hasWifi: z.boolean().default(false),
  forGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  occupancy: z.number().int().positive().optional().nullable(),
  foodIncluded: z.boolean().default(false),
  laundryIncluded: z.boolean().default(false),
  hasMedical: z.boolean().default(false),
  nearbyLandmark: z.string().optional(),
  distanceMarket: z.string().optional(),
  distanceInstitute: z.string().optional(),
  nearbyMess: z.string().optional(),
  nearbyLaundry: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  rules: z.string().optional(),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
});

export const complaintSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  propertyId: z.string().optional(),
  bookingId: z.string().optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  propertyId: z.string(),
});

export const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10).max(15).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  aadharNo: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type ComplaintInput = z.infer<typeof complaintSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
