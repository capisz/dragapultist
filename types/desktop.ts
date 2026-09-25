import type { GameDraftContract } from '@/lib/game-contract'
import type { DesktopQueuedLog } from '@/lib/desktop-import'
export type DesktopStatus = { version:1; signedIn:boolean; accountId:string|null; enabled:boolean; username:string; notifications:boolean; launchAtLogin:boolean; queued:number; state:string; error:string|null; review:Array<{id:string;reason:string;capturedAt:string;username:string}> }
export type DesktopSettings = Partial<Pick<DesktopStatus,'enabled'|'username'|'notifications'|'launchAtLogin'>>
export interface DesktopBridge {
 version:1
 status():Promise<DesktopStatus>
 configure(value:DesktopSettings):Promise<DesktopStatus>
 next():Promise<DesktopQueuedLog|null>
 submit(id:string,game:GameDraftContract):Promise<{saved:boolean;duplicate?:boolean}>
 needsReview(id:string,reason:string):Promise<DesktopStatus>
 retry(id:string,username:string):Promise<DesktopStatus>
 inspect(id:string):Promise<string>
 onStatus(callback:(status:DesktopStatus)=>void):()=>void
}
declare global { interface Window { dragapultistDesktop?:DesktopBridge } }
