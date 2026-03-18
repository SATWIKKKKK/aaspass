import { redirect } from "next/navigation";

export default function LicenseRedirectPage() {
  redirect("/terms#license");
}
