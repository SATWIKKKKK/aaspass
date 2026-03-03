import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/jpg",
  "video/mp4", "video/quicktime",
];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// POST /api/upload — upload a file to Cloudinary and return its secure URL
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Image upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
    }

    // Build signed upload params
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "aaspass";
    // Params must be sorted alphabetically
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash("sha1")
      .update(`${paramsToSign}${apiSecret}`)
      .digest("hex");

    // Build multipart form to send to Cloudinary
    const cldForm = new FormData();
    cldForm.append("file", file);
    cldForm.append("api_key", apiKey);
    cldForm.append("timestamp", String(timestamp));
    cldForm.append("signature", signature);
    cldForm.append("folder", folder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: "POST", body: cldForm }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || uploadData.error) {
      console.error("Cloudinary error:", uploadData);
      return NextResponse.json(
        { error: uploadData.error?.message || "Upload to Cloudinary failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: uploadData.secure_url,
      publicId: uploadData.public_id,
      resourceType: uploadData.resource_type,
    });
  } catch (error: unknown) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
