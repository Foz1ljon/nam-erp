import type { PermissionState } from '@capacitor/core'
import { registerPlugin } from '@capacitor/core'

/** "new_contacts": numbers saved in the phone book stay private unless they already are a lead. */
export type CaptureMode = 'new_contacts' | 'all'
export type CallDirection = 'in' | 'out' | 'missed' | 'rejected'

export interface SyncedCall {
  phone: string
  name?: string
  direction: CallDirection
  /** Epoch milliseconds. */
  startedAt: number
  duration: number
  /** lead: attached to a CRM lead; private: skipped (personal call); error: will be retried. */
  result: 'lead' | 'private' | 'error'
  recording: 'uploaded' | 'not_found' | 'none'
  error?: string
}

export interface SyncStatus {
  configured: boolean
  baseUrl?: string
  userName?: string
  capture: CaptureMode
  running: boolean
  lastSyncAt?: number
  lastError?: string
  recent: SyncedCall[]
}

export interface CallSyncPermissions {
  callLog: PermissionState
  phone: PermissionState
  contacts: PermissionState
  audio: PermissionState
}

export interface CallSyncPlugin {
  /** Stores the server address and device token natively, so the background worker can sync without the UI. */
  configure(options: { baseUrl: string; token: string; userName: string; capture: CaptureMode }): Promise<void>
  setCapture(options: { capture: CaptureMode }): Promise<void>
  clearConfig(): Promise<void>
  getToken(): Promise<{ token?: string }>
  syncNow(): Promise<void>
  getStatus(): Promise<SyncStatus>
  checkPermissions(): Promise<CallSyncPermissions>
  requestPermissions(): Promise<CallSyncPermissions>
  /** Opens the system screen that lets the app run in the background (important on Xiaomi/Samsung). */
  openBatterySettings(): Promise<void>
}

export const CallSync = registerPlugin<CallSyncPlugin>('CallSync')
