// /auth.ts
import NextAuth, { type NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"
import clientPromise from "@/lib/mongodb"
import { getServerSession } from "next-auth"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const client = await clientPromise
        const db = client.db(process.env.MONGODB_DB)
        const user = await db.collection("users").findOne({ email })

        if (!user?.passwordHash) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) (token as any).uid = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user && (token as any).uid) {
        ;(session.user as any).id = (token as any).uid
      }
      return session
    },
  },
}

// Route handler for /api/auth/[...nextauth]
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

// Your server-side helper (so your existing code can keep doing `await auth()`)
export function auth() {
  return getServerSession(authOptions)
}
