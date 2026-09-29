"use client"

import { useRef, useState } from 'react'
import { ChevronsUpDown, Check } from 'lucide-react'
import { ARCHETYPE_RULES, AVAILABLE_ARCHETYPE_IDS, formatArchetypeLabel, isCurrentStandardArchetype, isCustomArchetypeId, matchesArchetypeSearch } from '@/utils/archetype-mapping'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from './ui/command'
import { ArchetypeIconPair } from './archetype-icon-pair'

export function ArchetypeSelector({ value, onValueChange, label = 'Archetype', emptyValue = '', emptyLabel = 'Choose an archetype…', availableIds = [], counts }: {
  value: string; onValueChange: (value: string) => void; label?: string; emptyValue?: string; emptyLabel?: string;
  availableIds?: string[]; counts?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const [listId, setListId] = useState<string>()
  // Saved historical values still render in the trigger, but do not re-enter
  // the current catalog through a selected value or the match-history list.
  const ids = [...new Set([
    ...availableIds.filter(id => isCurrentStandardArchetype(id) || isCustomArchetypeId(id)),
    ...AVAILABLE_ARCHETYPE_IDS,
    ...(value && value !== emptyValue && isCustomArchetypeId(value) ? [value] : []),
  ])]
  function choose(id: string) { onValueChange(id); setOpen(false); setQuery('') }
  // Give this portaled list its own scroll boundary when nested in a modal dialog.
  // Otherwise the parent dialog can block wheel/touch events outside its content.
  return <Popover modal open={open} onOpenChange={next => { setOpen(next); if (!next) setQuery('') }}>
    <PopoverTrigger asChild><button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={open ? listId : undefined} aria-haspopup="listbox"
      className="archetype-combobox" onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') { setQuery(event.key); setOpen(true) }
      }}>
      {value && value !== emptyValue && <ArchetypeIconPair archetypeId={value} size={40} />}
      <span>{value && value !== emptyValue ? formatArchetypeLabel(value) : emptyLabel}</span><ChevronsUpDown size={16} aria-hidden />
    </button></PopoverTrigger>
    <PopoverContent className="archetype-popover" align="start" collisionPadding={12} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}>
      <Command label={`Search ${label.toLowerCase()}`} loop filter={(value, search, keywords) => matchesArchetypeSearch(value, search, keywords) ? 1 : 0}>
        <CommandInput aria-label={`Search current Standard ${label.toLowerCase()}`} placeholder="Search Standard archetypes…" value={query} onValueChange={setQuery} />
        <CommandList ref={list => { if (list) setListId(list.id) }} aria-label={label}>
          <CommandEmpty>No matching archetypes.</CommandEmpty>
          <CommandItem value="Not set Unknown Clear" onSelect={() => choose(emptyValue)}>{emptyLabel}</CommandItem>
          {ids.map(id => { const rule = ARCHETYPE_RULES.find(rule => rule.id === id); return <CommandItem key={id} value={id} keywords={[formatArchetypeLabel(id), ...(rule?.aliases ?? [])]} onSelect={() => choose(id)}>
            <ArchetypeIconPair archetypeId={id} size={40} /><span>{formatArchetypeLabel(id)}</span>
            {counts?.[id] !== undefined && <small>{counts[id]} games</small>}{value === id && <Check size={14} aria-hidden />}
          </CommandItem> })}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}
