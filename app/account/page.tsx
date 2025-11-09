import { getUser } from "@/app/actions"
import { redirect } from "next/navigation"
import { StatisticsPage } from "@/components/statistics/statistics-page"

export default async function AccountPage() {
  const user = await getUser()

  if (!user) {
    redirect("/")
  }

  return <StatisticsPage user={user} />
}
