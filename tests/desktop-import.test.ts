import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {prepareDesktopImport} from '@/lib/desktop-import'
const rawLog=readFileSync(new URL('./fixtures/desktop-complete-log.txt',import.meta.url),'utf8')
const entry={id:'desktop-queue-id',rawLog,username:'PracticePlayer',capturedAt:'2026-09-24T15:00:00Z'}
describe('desktop import preparation',()=>{
 it('uses real parser, capture date and durable id',()=>{const game=prepareDesktopImport(entry);expect(game.id).toBe(entry.id);expect(game.username).toBe('PracticePlayer');expect(game.date).toBe('9/24/2026');expect(game.rawLog).toBe(rawLog)})
 it('orients the same game for the other player',()=>{const game=prepareDesktopImport({...entry,username:'PracticeOpponent'});expect(game.username).toBe('PracticeOpponent');expect(game.opponent).toBe('PracticePlayer');expect(game.userWon).toBe(false)})
 it('parses possessive turn headings without numbered prefixes',()=>{const game=prepareDesktopImport({...entry,rawLog:rawLog.replace(/Turn # \d+ - /g,'')});expect(game.username).toBe('PracticePlayer');expect(game.opponent).toBe('PracticeOpponent')})
 it('will not attribute a log to an unrelated preferred username',()=>{expect(()=>prepareDesktopImport({...entry,username:'Unrelated'})).toThrow()})
 it('retains incomplete games for review',()=>{expect(()=>prepareDesktopImport({...entry,rawLog:rawLog.replace(/[^\n]*wins\.[^\n]*/g,'')})).toThrow(/incomplete/)})
})
