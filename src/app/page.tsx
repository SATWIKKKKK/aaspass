import { redirect } from "next/navigation";

// Server-side: instantly redirect root visits to the role chooser
export default function Page() {
  redirect("/register");
}
