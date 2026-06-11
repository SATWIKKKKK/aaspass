import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { parseSpreadsheetFile, type SpreadsheetRow } from "@/lib/spreadsheet-import";
import {
  createPropertyForAccount,
  findOrCreateOwnerForImport,
  SuperAdminCreationError,
  type OwnerImportInput,
} from "@/lib/superadmin-creation";

export const runtime = "nodejs";

const HEADER_ALIASES: Record<string, keyof OwnerImportInput> = {
  owner: "ownerName",
  ownername: "ownerName",
  ownerfullname: "ownerName",
  landlordname: "ownerName",
  ownerphone: "ownerPhone",
  ownercontact: "ownerPhone",
  ownercontactnumber: "ownerPhone",
  contact: "ownerPhone",
  contactnumber: "ownerPhone",
  mobilenumber: "ownerPhone",
  mobile: "ownerPhone",
  phone: "ownerPhone",
  owneremail: "ownerEmail",
  email: "ownerEmail",
  ownergender: "ownerGender",
  property: "name",
  propertyname: "name",
  servicename: "name",
  name: "name",
  servicetype: "serviceType",
  propertytype: "serviceType",
  type: "serviceType",
  description: "description",
  rent: "price",
  monthlyrent: "price",
  price: "price",
  amount: "price",
  gstrate: "gstRate",
  gst: "gstRate",
  address: "address",
  city: "city",
  state: "state",
  pincode: "pincode",
  pin: "pincode",
  status: "status",
  googlemapslink: "googleMapsLink",
  googlemaplink: "googleMapsLink",
  mapslink: "googleMapsLink",
  maplink: "googleMapsLink",
  googlemapsurl: "googleMapsLink",
  mapsurl: "googleMapsLink",
  mapurl: "googleMapsLink",
  locationlink: "googleMapsLink",
  locationurl: "googleMapsLink",
  coordinates: "googleMapsLink",
  latitude: "latitude",
  lat: "latitude",
  longitude: "longitude",
  lng: "longitude",
  long: "longitude",
  landmark: "nearbyLandmark",
  nearbylandmark: "nearbyLandmark",
  distancemarket: "distanceMarket",
  marketdistance: "distanceMarket",
  distanceinstitute: "distanceInstitute",
  institutedistance: "distanceInstitute",
  ac: "isAC",
  isac: "isAC",
  wifi: "hasWifi",
  haswifi: "hasWifi",
  gender: "forGender",
  forgender: "forGender",
  genderpreference: "forGender",
  occupancy: "occupancy",
  food: "foodIncluded",
  foodincluded: "foodIncluded",
  laundry: "laundryIncluded",
  laundryincluded: "laundryIncluded",
  medical: "hasMedical",
  hasmedical: "hasMedical",
  nearbymess: "nearbyMess",
  nearbylaundry: "nearbyLaundry",
  capacity: "capacity",
  totalcapacity: "capacity",
  availablerooms: "availableRooms",
  availableseats: "availableRooms",
  available: "availableRooms",
  closingtime: "closingTime",
  rules: "rules",
  cancellationpolicy: "cancellationPolicy",
  amenities: "customAmenities",
  customamenities: "customAmenities",
  imageurls: "imageUrls",
  images: "imageUrls",
  photos: "imageUrls",
};

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeRow(row: SpreadsheetRow): OwnerImportInput {
  const normalized: OwnerImportInput = {};

  for (const [header, value] of Object.entries(row)) {
    const mapped = HEADER_ALIASES[normalizeHeader(header)];
    if (mapped && value !== "") normalized[mapped] = value;
  }

  return normalized;
}

function missingRequired(input: OwnerImportInput) {
  const required: Array<[keyof OwnerImportInput, string]> = [
    ["ownerName", "Owner Name"],
    ["ownerPhone", "Owner Contact Number"],
    ["name", "Property Name"],
    ["serviceType", "Service Type"],
    ["price", "Price"],
    ["address", "Address"],
    ["city", "City"],
    ["state", "State"],
    ["pincode", "Pincode"],
  ];

  return required
    .filter(([key]) => !String(input[key] || "").trim())
    .map(([, label]) => label);
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Excel file is required" }, { status: 400 });
    }

    const rows = await parseSpreadsheetFile(file);
    const nonEmptyRows = rows.filter((row) => Object.values(row).some((value) => value.trim()));

    if (nonEmptyRows.length === 0) {
      return NextResponse.json({ error: "No property rows found in the file" }, { status: 400 });
    }

    if (nonEmptyRows.length > 200) {
      return NextResponse.json({ error: "Bulk upload supports up to 200 rows at a time" }, { status: 400 });
    }

    const results = [];
    let created = 0;
    let failed = 0;
    let ownersCreated = 0;

    for (let index = 0; index < nonEmptyRows.length; index += 1) {
      const rowNumber = index + 2;
      const input = normalizeRow(nonEmptyRows[index]);
      const missing = missingRequired(input);

      if (missing.length > 0) {
        failed += 1;
        results.push({
          row: rowNumber,
          status: "failed",
          error: `Missing required columns: ${missing.join(", ")}`,
        });
        continue;
      }

      try {
        const ownerResult = await findOrCreateOwnerForImport(input, authResult.admin.id);
        const propertyResult = await createPropertyForAccount(
          { ...input, ownerId: ownerResult.owner.id },
          authResult.admin.id,
          `Bulk property import row ${rowNumber}`
        );

        created += 1;
        if (ownerResult.created) ownersCreated += 1;

        results.push({
          row: rowNumber,
          status: "created",
          propertyId: propertyResult.property.id,
          propertyName: propertyResult.property.name,
          ownerId: ownerResult.owner.id,
          ownerName: ownerResult.owner.name,
          ownerEmail: ownerResult.owner.email,
          ownerPhone: ownerResult.owner.phone,
          ownerCreated: ownerResult.created,
          ownerPromoted: ownerResult.promoted || propertyResult.promoted,
          generatedPassword: ownerResult.generatedPassword,
        });
      } catch (error) {
        failed += 1;
        results.push({
          row: rowNumber,
          status: "failed",
          propertyName: String(input.name || ""),
          ownerName: String(input.ownerName || ""),
          error: error instanceof SuperAdminCreationError ? error.message : "Failed to create property",
        });
      }
    }

    return NextResponse.json({
      success: failed === 0,
      summary: {
        total: nonEmptyRows.length,
        created,
        failed,
        ownersCreated,
      },
      results,
    });
  } catch (error) {
    console.error("Bulk property import error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to import properties",
    }, { status: 500 });
  }
}
