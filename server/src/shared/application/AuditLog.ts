import mongoose from 'mongoose'
import { AuditEventModel } from '../infrastructure/persistence/AuditEventModel'

const SAFE_VALUE = /^[\w.:/@-]{1,200}$/

/** Persist a small allowlisted audit event; callers must never pass credentials or request bodies. */
export async function recordAuditEvent(event: {
  actorId: string
  action: string
  resourceType: string
  resourceId: string
  outcome?: 'success' | 'denied' | 'failure'
  requestId?: string
}): Promise<void> {
  if (!mongoose.isValidObjectId(event.actorId) || !SAFE_VALUE.test(event.action) || !SAFE_VALUE.test(event.resourceType) || !SAFE_VALUE.test(event.resourceId)) {
    throw new Error('Invalid audit event')
  }
  await AuditEventModel.create({ ...event, outcome: event.outcome ?? 'success' })
}
