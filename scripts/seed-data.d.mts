import type { Bank, Buy, Cash, Group, Subscription } from '../src/domain/types'
export declare const DEMO_EMAIL: string
export declare const DEMO_PASSWORD: string
export declare function buildSample(today?: Date): {
  Cash: Cash[]
  Group: Group[]
  Buy: Buy[]
  Bank: Bank[]
  Subscription: Subscription[]
}
