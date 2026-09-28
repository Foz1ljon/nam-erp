import { z } from 'zod'
import { CALL_DIRECTIONS } from '../../../../shared/utils/constants'

const schema = z.object({
  deviceCallId: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(3).max(40),
  contactName: z.string().trim().max(200).optional(),
  inContacts: z.boolean().default(false),
  direction: z.enum(CALL_DIRECTIONS),
  startedAt: z.coerce.date(),
  duration: z.number().int().min(0).max(86_400).default(0),
  capture: z.enum(['new_contacts', 'all']).default('new_contacts'),
})

/**
 * One call from the phone's call log. `tracked: false` means the call is private and the app must not
 * upload its recording; `needsRecording` asks the app to send the audio file.
 */
export default defineEventHandler(async (event) => {
  const { device } = await requireDevice(event)
  const body = await parseBody(event, schema)
  const call = await recordPhoneCall(device, body)
  if (!call) return ok({ tracked: false as const, callId: null, leadId: null, needsRecording: false })
  return ok({
    tracked: true as const,
    callId: String(call._id),
    leadId: String(call.lead),
    needsRecording: !call.recording && !call.recordingDeletedAt && call.duration > 0,
  })
})
