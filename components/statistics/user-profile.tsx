"use client"

import { useState } from "react"
import type { User } from "@/types/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Check, Upload } from "lucide-react"

interface UserProfileProps {
  user: User
}

export function UserProfile({ user }: UserProfileProps) {
  const [displayName, setDisplayName] = useState(user.username)
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(displayName)

  // Mock data for demonstration
  const [stats, setStats] = useState({
    wins: 24,
    losses: 16,
    winRate: 60,
    gamesPlayed: 40,
    avgTurns: 7.5,
  })

  const handleSaveName = () => {
    setDisplayName(tempName)
    setIsEditing(false)
    // In a real app, you would save this to the database
  }

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mb-2">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-white dark:bg-gray-700"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>

          {isEditing ? (
            <div className="flex items-center mt-2 w-full">
              <Input value={tempName} onChange={(e) => setTempName(e.target.value)} className="mr-2" autoFocus />
              <Button size="sm" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center mt-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-2">{displayName}</h3>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Record:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {stats.wins} - {stats.losses} ({stats.winRate}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Games Played:</span>
            <span className="font-medium text-gray-900 dark:text-white">{stats.gamesPlayed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Avg. Turns:</span>
            <span className="font-medium text-gray-900 dark:text-white">{stats.avgTurns}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
