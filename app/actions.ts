"use server"

import { cookies } from "next/headers"
import type { AuthResponse, User } from "@/types/auth"

// In a real app, you'd want to use a database
const users: User[] = [
  {
    id: "admin",
    email: "admin@example.com",
    username: "Admin",
    verified: true,
  },
]

export async function signUp(formData: FormData): Promise<AuthResponse> {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const username = formData.get("username") as string

    if (!email || !password || !username) {
      throw new Error("Invalid form data")
    }

    // Check if user already exists
    if (users.some((user) => user.email === email || user.username === username)) {
      throw new Error("User already exists")
    }

    // Create new user
    const newUser: User = {
      id: Math.random().toString(36).slice(2),
      email,
      username,
      verified: true, // Set to true by default for testing
    }

    users.push(newUser)

    // Automatically log in the new user
    cookies().set("userId", newUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return {
      success: true,
      message: "Account created and logged in successfully",
      user: newUser,
    }
  } catch (error) {
    console.error("Sign up error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred during sign up",
    }
  }
}

export async function login(formData: FormData): Promise<AuthResponse> {
  try {
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
      throw new Error("Invalid login credentials")
    }

    // Find the user
    const user = users.find((u) => u.username === username)

    if (!user) {
      throw new Error("Invalid credentials")
    }

    // In a real app, you'd check the password here

    cookies().set("userId", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return {
      success: true,
      message: "Logged in successfully",
      user,
    }
  } catch (error) {
    console.error("Login error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred during login",
    }
  }
}

export async function loginAsGuest(): Promise<User> {
  const guestUser: User = {
    id: "guest",
    email: "guest@example.com",
    username: "Guest",
    verified: false,
  }

  cookies().set("userId", guestUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 1 day
  })

  return guestUser
}

export async function logout(): Promise<void> {
  cookies().delete("userId")
}

export async function getUser(): Promise<User | null> {
  const userId = cookies().get("userId")?.value
  if (userId === "guest") {
    return {
      id: "guest",
      email: "guest@example.com",
      username: "Guest",
      verified: false,
    }
  }
  return users.find((user) => user.id === userId) || null
}
