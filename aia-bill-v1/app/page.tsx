// Root page — redirect to the admin dashboard
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/admin");
}
