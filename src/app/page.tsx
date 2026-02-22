import { redirect } from "next/navigation";

export default function Page() {
  // Server-side redirect to /register for immediate navigation
  redirect("/register");
}
