export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'channels.use')
  const channel = await loadOwnChannel(me, paramId(event))
  const body = await parseBody(event, channelUpdateSchema)
  await ChannelModel.updateOne({ _id: channel._id }, { greeting: body.greeting ?? '', capture: body.capture })
  return ok({ _id: channel._id })
})
