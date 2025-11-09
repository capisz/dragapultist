"use client"
import { Button } from "@/components/ui/button"

interface ImportPromptProps {
  onImport: () => void
  onCancel: () => void
}
export function ImportPrompt({ onImport, onCancel }: ImportPromptProps) {
  return (
    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
      <p className="font-bold">Pokémon TCG game log detected in clipboard!</p>
      <p className="mb-2">Would you like to import this game?</p>
      <div className="flex gap-2">
        <Button onClick={onImport}>Import Game</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
