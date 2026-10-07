'use client'

import { useRef, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command'
import { ArchetypeIconPair } from './archetype-icon-pair'

export type DeckListOption = { value: string; label: string; archetypeId?: string | null }

// Uses the same menu surface and keyboard interaction as Prize Mapper.
export function DeckListSelect({ value, onValueChange, options, label, disabled = false, id }: {
  value: string; onValueChange: (value: string) => void; options: DeckListOption[];
  label: string; disabled?: boolean; id?: string;
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const [listId, setListId] = useState<string>()
  const selected = options.find(option => option.value === value)
  return <Popover modal open={open && !disabled} onOpenChange={next => { setOpen(next); if (!next) setQuery('') }}>
    <PopoverTrigger asChild><button ref={trigger} id={id} type="button" role="combobox" aria-label={label}
      aria-expanded={open && !disabled} aria-controls={open && !disabled ? listId : undefined} aria-haspopup="listbox"
      disabled={disabled} className="archetype-combobox deck-list-combobox" onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') { setQuery(event.key); setOpen(true) }
      }}><span>{selected?.label ?? options[0]?.label}</span><ChevronsUpDown size={16} aria-hidden /></button></PopoverTrigger>
    <PopoverContent className="archetype-popover deck-list-popover" align="start" collisionPadding={12}
      onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}>
      <Command label={`Search ${label.toLowerCase()}`} loop filter={(_value, search, keywords) => keywords?.[0]?.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ? 1 : 0}>
        <CommandInput aria-label={`Search ${label.toLowerCase()}`} placeholder="Search decklists…" value={query} onValueChange={setQuery} />
        <CommandList ref={list => { if (list) setListId(list.id) }} aria-label={label}>
          <CommandEmpty>No matching decklists.</CommandEmpty>
          {options.map((option, index) => <CommandItem key={option.value} value={`deck-option-${index}`} keywords={[option.label]}
            onSelect={() => { onValueChange(option.value); setOpen(false); setQuery('') }}>
            {option.archetypeId && <ArchetypeIconPair archetypeId={option.archetypeId} size={30} localSprites />}
            <span>{option.label}</span>{option.value === value && <Check size={14} aria-hidden />}
          </CommandItem>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}
