export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'transfers.use')
  const body = await parseBody(event, transferSchema)
  if (!SUPERVISOR_ROLES.includes(me.role) && me.role !== 'qc' && me.locationId && me.locationId !== body.from) {
    conflict("Faqat o'z bo'limingizdan topshira olasiz")
  }
  const transfer = await createTransfer({ ...body, sender: me.oid })
  setResponseStatus(event, 201)
  return ok(transfer)
})
