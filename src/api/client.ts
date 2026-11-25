// The request owner the ported starmap code reads/writes. The plugin scopes all
// backend calls by profile name (the app's connection registry is not exposed
// to a disk plugin), so `connectionId` stays undefined.
import { atom } from 'nanostores'

export interface RequestScope {
  connectionId?: string
  profile?: string
}

export const $apiRequestScope = atom<RequestScope>({ profile: undefined })

export function setRequestScope(scope: RequestScope): void {
  $apiRequestScope.set(scope)
}
