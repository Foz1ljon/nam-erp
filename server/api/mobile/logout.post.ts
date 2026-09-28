export default defineEventHandler(async (event) => {
  const { device } = await requireDevice(event)
  await MobileDeviceModel.updateOne({ _id: device._id }, { active: false })
  return ok(null)
})
