// app/account/page.tsx
import { getUser } from "@/app/actions"
import { redirect } from "next/navigation"
import { StatisticsPage } from "@/components/statistics/statistics-page"

export default async function AccountPage() {
  const user = await getUser()

  // Require real auth for account
  if (!user || user.username === "Guest") {
    redirect("/")
  }

  return <StatisticsPage user={user} />
}
