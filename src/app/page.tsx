import { redirect } from "next/navigation";

// Server-side: send visitors to the public home page
export default function Page() {
  redirect("/home");
}
