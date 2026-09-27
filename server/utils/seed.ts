import { Types } from 'mongoose'
import type { ItemType, LocationType, ProductKind, Role, Unit } from '../../shared/utils/constants'
import { LOC } from '../../shared/utils/constants'
import type { Stage } from '../../shared/utils/stages'

const LOCATIONS: { code: string; name: string; type: LocationType }[] = [
  { code: LOC.RAW, name: 'Xomashyo ombori', type: 'warehouse' },
  { code: LOC.FOUNDRY, name: 'Liteyka (quyish sexi)', type: 'production' },
  { code: LOC.FETTLING, name: 'Pishka stroy (tozalash)', type: 'production' },
  { code: LOC.CNC, name: 'CHPU sexi', type: 'production' },
  { code: LOC.STORE, name: 'Sklad (yarim tayyor va materiallar)', type: 'warehouse' },
  { code: LOC.ASSEMBLY, name: "Yig'uv bo'limi", type: 'production' },
  { code: LOC.PAINT, name: "Bo'yoq va qadoqlash", type: 'production' },
  { code: LOC.QC, name: 'Sifat nazorati', type: 'qc' },
  { code: LOC.FINISHED, name: 'Tayyor mahsulot ombori', type: 'warehouse' },
  { code: LOC.DEFECT, name: 'Brak izolyatori', type: 'defect' },
]

interface SeedItem {
  code: string
  name: string
  type: ItemType
  unit: Unit
  productKind?: ProductKind
  unitWeightKg?: number
  price?: number
  cost?: number
  minStock?: number
  serialTracked?: boolean
  bom?: [code: string, qty: number, stage: Stage][]
}

const ITEMS: SeedItem[] = [
  // Xomashyo
  { code: 'XM-CHUGUN', name: 'Chugun (quyma temir)', type: 'raw', unit: 'kg', cost: 7_500, minStock: 1000 },
  { code: 'XM-POLAT-LOM', name: "Po'lat lom", type: 'raw', unit: 'kg', cost: 4_800, minStock: 300 },
  { code: 'XM-ALYUMIN', name: 'Alyuminiy', type: 'raw', unit: 'kg', cost: 32_000, minStock: 100 },
  { code: 'XM-FERROSIL', name: 'Ferrosilitsiy', type: 'raw', unit: 'kg', cost: 18_000, minStock: 50 },
  // Qirindi / brak
  { code: 'QR-QIRINDI', name: 'Metall qirindi', type: 'scrap', unit: 'kg' },
  { code: 'QR-BRAK', name: 'Brak quyma (qayta eritish)', type: 'scrap', unit: 'kg' },
  { code: 'QR-LITNIK', name: 'Litnik va ortiqcha quyma', type: 'scrap', unit: 'kg' },
  // Quymalar
  { code: 'Q-KORPUS-80', name: 'Dvigatel korpusi AIR80 (quyma)', type: 'casting', unit: 'dona', unitWeightKg: 18, price: 260_000, bom: [['XM-CHUGUN', 20.5, 'casting'], ['Q-KORPUS-80', 1, 'cleaning']] },
  { code: 'Q-SHIT-80', name: 'Podshipnik shiti 80 (quyma)', type: 'casting', unit: 'dona', unitWeightKg: 3.5, price: 55_000, bom: [['XM-CHUGUN', 4.2, 'casting'], ['Q-SHIT-80', 1, 'cleaning']] },
  { code: 'Q-NASOS-KORPUS', name: 'Nasos korpusi 50 (quyma)', type: 'casting', unit: 'dona', unitWeightKg: 12, price: 180_000, bom: [['XM-CHUGUN', 13.8, 'casting'], ['Q-NASOS-KORPUS', 1, 'cleaning']] },
  { code: 'Q-NASOS-QOPQOQ', name: "Nasos qopqog'i 50 (quyma)", type: 'casting', unit: 'dona', unitWeightKg: 4, price: 62_000, bom: [['XM-CHUGUN', 4.8, 'casting'], ['Q-NASOS-QOPQOQ', 1, 'cleaning']] },
  // Materiallar
  { code: 'M-SIM-1.0', name: 'Obmotka simi PETV 1.0 mm', type: 'material', unit: 'kg', cost: 145_000, minStock: 50 },
  { code: 'M-JELEZA', name: 'Elektrotexnik po\'lat (jeleza)', type: 'material', unit: 'kg', cost: 21_000, minStock: 200 },
  { code: 'M-LAK', name: 'Impregnatsiya laki', type: 'material', unit: 'l', cost: 40_000, minStock: 20 },
  { code: 'M-KRASKA', name: "Bo'yoq (emal)", type: 'material', unit: 'kg', cost: 38_000, minStock: 30 },
  { code: 'M-QUTI', name: 'Qadoq qutisi', type: 'material', unit: 'dona', cost: 12_000, minStock: 50 },
  { code: 'M-BIRKA', name: 'Model birkasi (shildik)', type: 'material', unit: 'dona', cost: 2_500, minStock: 100 },
  // Sotib olinadigan detallar
  { code: 'D-PODSHIPNIK-6204', name: 'Podshipnik 6204', type: 'component', unit: 'dona', cost: 18_000, minStock: 100 },
  { code: 'D-PARRAK-80', name: 'Ventilyator parragi 80', type: 'component', unit: 'dona', cost: 9_000, minStock: 50 },
  { code: 'D-ROTOR-80', name: 'Rotor AIR80 (val bilan)', type: 'component', unit: 'dona', cost: 210_000, minStock: 20 },
  { code: 'D-KLEMMA', name: 'Klemma qutisi', type: 'component', unit: 'dona', cost: 25_000, minStock: 50 },
  { code: 'D-BOLT-KOMPLEKT', name: 'Bolt-gayka komplekti', type: 'component', unit: 'komplekt', cost: 6_000, minStock: 100 },
  { code: 'D-NASOS-PARRAK', name: 'Nasos krilchatkasi (parrak) 50', type: 'component', unit: 'dona', cost: 48_000, minStock: 30 },
  { code: 'D-SALNIK', name: 'Mexanik salnik', type: 'component', unit: 'dona', cost: 35_000, minStock: 30 },
  { code: 'D-NASOS-VAL', name: 'Nasos vali', type: 'component', unit: 'dona', cost: 55_000, minStock: 30 },
  // Yarim tayyor
  { code: 'YT-KORPUS-80', name: 'Dvigatel korpusi AIR80 (ishlov berilgan)', type: 'semi', unit: 'dona', unitWeightKg: 17, price: 340_000, bom: [['Q-KORPUS-80', 1, 'cnc']] },
  { code: 'YT-SHIT-80', name: 'Podshipnik shiti 80 (ishlov berilgan)', type: 'semi', unit: 'dona', unitWeightKg: 3.2, price: 75_000, bom: [['Q-SHIT-80', 1, 'cnc']] },
  { code: 'YT-NASOS-KORPUS', name: 'Nasos korpusi 50 (ishlov berilgan)', type: 'semi', unit: 'dona', unitWeightKg: 11.5, price: 240_000, bom: [['Q-NASOS-KORPUS', 1, 'cnc']] },
  { code: 'YT-NASOS-QOPQOQ', name: "Nasos qopqog'i 50 (ishlov berilgan)", type: 'semi', unit: 'dona', unitWeightKg: 3.8, price: 85_000, bom: [['Q-NASOS-QOPQOQ', 1, 'cnc']] },
  { code: 'YT-STATOR-80', name: 'Stator AIR80 (obmotkali)', type: 'semi', unit: 'dona', unitWeightKg: 8.5, bom: [['M-SIM-1.0', 2.2, 'winding'], ['M-JELEZA', 6, 'winding'], ['M-LAK', 0.3, 'winding']] },
  // Tayyor mahsulot
  {
    code: 'T-AIR80-1.5',
    name: 'Elektr dvigatel AIR80 1.5 kVt 3000 ayl/min',
    type: 'finished',
    unit: 'dona',
    productKind: 'motor',
    unitWeightKg: 32,
    price: 2_450_000,
    minStock: 10,
    serialTracked: true,
    bom: [
      ['YT-KORPUS-80', 1, 'assembly'],
      ['YT-STATOR-80', 1, 'assembly'],
      ['YT-SHIT-80', 2, 'assembly'],
      ['D-ROTOR-80', 1, 'assembly'],
      ['D-PODSHIPNIK-6204', 2, 'assembly'],
      ['D-PARRAK-80', 1, 'assembly'],
      ['D-KLEMMA', 1, 'assembly'],
      ['D-BOLT-KOMPLEKT', 1, 'assembly'],
      ['T-AIR80-1.5', 1, 'painting'],
      ['M-KRASKA', 0.4, 'painting'],
      ['T-AIR80-1.5', 1, 'packaging'],
      ['M-QUTI', 1, 'packaging'],
      ['M-BIRKA', 1, 'packaging'],
    ],
  },
  {
    code: 'T-NASOS-50',
    name: 'Suv nasosi 50 (markazdan qochma)',
    type: 'finished',
    unit: 'dona',
    productKind: 'pump',
    unitWeightKg: 21,
    price: 1_850_000,
    minStock: 10,
    serialTracked: true,
    bom: [
      ['YT-NASOS-KORPUS', 1, 'assembly'],
      ['YT-NASOS-QOPQOQ', 1, 'assembly'],
      ['D-NASOS-PARRAK', 1, 'assembly'],
      ['D-NASOS-VAL', 1, 'assembly'],
      ['D-SALNIK', 1, 'assembly'],
      ['D-PODSHIPNIK-6204', 2, 'assembly'],
      ['D-BOLT-KOMPLEKT', 1, 'assembly'],
      ['T-NASOS-50', 1, 'painting'],
      ['M-KRASKA', 0.3, 'painting'],
      ['T-NASOS-50', 1, 'packaging'],
      ['M-QUTI', 1, 'packaging'],
      ['M-BIRKA', 1, 'packaging'],
    ],
  },
]

export const DEMO_PASSWORD = 'nammotors'

export const DEMO_USERS: { username: string; fullName: string; role: Role; location?: string }[] = [
  { username: 'rahbar', fullName: 'Rahbariyat', role: 'director' },
  { username: 'ombor', fullName: 'Omborchi', role: 'warehouse', location: LOC.STORE },
  { username: 'taminot', fullName: "Ta'minotchi", role: 'supply', location: LOC.RAW },
  { username: 'liteyka', fullName: 'Liteyka quyuvchi', role: 'foundry', location: LOC.FOUNDRY },
  { username: 'pishka', fullName: 'Pishka stroy ishchisi', role: 'fettling', location: LOC.FETTLING },
  { username: 'chpu', fullName: 'CHPU operatori', role: 'cnc', location: LOC.CNC },
  { username: 'yiguv', fullName: "Yig'uvchi", role: 'assembly', location: LOC.ASSEMBLY },
  { username: 'boyoq', fullName: "Bo'yoqchi / qadoqchi", role: 'painter', location: LOC.PAINT },
  { username: 'sifat', fullName: 'Sifat nazoratchisi', role: 'qc', location: LOC.QC },
  { username: 'sotuv', fullName: 'Sotuv menejeri', role: 'sales' },
]

const OPENING_STOCK: [location: string, code: string, qty: number][] = [
  [LOC.RAW, 'XM-CHUGUN', 8000],
  [LOC.RAW, 'XM-POLAT-LOM', 1500],
  [LOC.RAW, 'XM-ALYUMIN', 300],
  [LOC.RAW, 'XM-FERROSIL', 120],
  [LOC.FOUNDRY, 'XM-CHUGUN', 1200],
  [LOC.STORE, 'M-SIM-1.0', 250],
  [LOC.STORE, 'M-JELEZA', 900],
  [LOC.STORE, 'M-LAK', 60],
  [LOC.STORE, 'M-KRASKA', 120],
  [LOC.STORE, 'M-QUTI', 300],
  [LOC.STORE, 'M-BIRKA', 600],
  [LOC.STORE, 'D-PODSHIPNIK-6204', 400],
  [LOC.STORE, 'D-PARRAK-80', 150],
  [LOC.STORE, 'D-ROTOR-80', 80],
  [LOC.STORE, 'D-KLEMMA', 150],
  [LOC.STORE, 'D-BOLT-KOMPLEKT', 300],
  [LOC.STORE, 'D-NASOS-PARRAK', 90],
  [LOC.STORE, 'D-SALNIK', 90],
  [LOC.STORE, 'D-NASOS-VAL', 90],
  [LOC.STORE, 'YT-KORPUS-80', 25],
  [LOC.STORE, 'YT-SHIT-80', 60],
  [LOC.STORE, 'YT-NASOS-KORPUS', 20],
  [LOC.STORE, 'YT-NASOS-QOPQOQ', 20],
  [LOC.FINISHED, 'T-AIR80-1.5', 12],
  [LOC.FINISHED, 'T-NASOS-50', 8],
]

export async function seedDatabase({ demo }: { demo: boolean }) {
  if (await LocationModel.exists({})) return
  console.info('[seed] initialising database…')

  await LocationModel.insertMany(LOCATIONS.map((l, order) => ({ ...l, order })))
  const locations = new Map((await LocationModel.find().lean()).map((l) => [l.code, l._id]))

  await ItemModel.insertMany(ITEMS.map(({ bom: _bom, ...item }) => item))
  const items = new Map((await ItemModel.find().lean()).map((i) => [i.code, i._id]))
  for (const item of ITEMS.filter((i) => i.bom?.length)) {
    await ItemModel.updateOne(
      { code: item.code },
      { bom: item.bom!.map(([code, qty, stage]) => ({ component: items.get(code), qty, stage })) },
    )
  }

  const adminPassword = process.env.NUXT_ADMIN_PASSWORD || 'admin123'
  const admin = await UserModel.create({
    username: 'admin',
    fullName: 'Administrator',
    role: 'admin',
    passwordHash: await hashPassword(adminPassword),
  })

  if (!demo) return

  const demoHash = await hashPassword(DEMO_PASSWORD)
  await UserModel.insertMany(
    DEMO_USERS.map((u) => ({
      ...u,
      location: u.location ? locations.get(u.location) : null,
      passwordHash: demoHash,
    })),
  )

  // Opening balances are posted through inventory adjustments so the ledger stays consistent.
  const byLocation = Map.groupBy(OPENING_STOCK, ([loc]) => loc)
  for (const [code, rows] of byLocation) {
    const location = locations.get(code)!
    const number = await nextNumber('INV')
    const doc = await AdjustmentModel.create({
      number,
      location,
      user: admin._id,
      note: "Boshlang'ich qoldiq",
      lines: rows.map(([, itemCode, qty]) => ({ item: items.get(itemCode), expectedQty: 0, actualQty: qty })),
    })
    await applyMoves(
      rows.map(([, itemCode, qty]) => ({ item: items.get(itemCode)!, location, qty })),
      { docType: 'adjustment', docId: doc._id as Types.ObjectId, docNumber: number, user: admin._id, note: "Boshlang'ich qoldiq" },
    )
  }

  await CounterpartyModel.insertMany([
    { name: 'Olmaliq KMK', type: 'supplier', inn: '200941518', phone: '+998 70 612 00 00', address: 'Olmaliq sh.', contactPerson: 'Savdo bo\'limi' },
    { name: 'Elektrosim Toshkent MChJ', type: 'supplier', inn: '305112874', phone: '+998 71 200 11 22', address: 'Toshkent sh.' },
    { name: 'Podshipnik Servis', type: 'supplier', phone: '+998 90 123 45 67', address: 'Toshkent sh.' },
    { name: 'Agro Servis MChJ', type: 'customer', inn: '307744120', phone: '+998 69 225 33 44', address: 'Namangan sh.', contactPerson: 'Akmal aka' },
    { name: 'Suvoqova Qurilish', type: 'customer', phone: '+998 91 345 67 89', address: "Farg'ona sh." },
  ])

  const sales = await UserModel.findOne({ username: 'sotuv' }).lean()
  await LeadModel.insertMany([
    { title: '20 ta AIR80 dvigatel', contactName: 'Jasur', phone: '+998 93 111 22 33', company: 'Chust Tegirmon', source: 'phone', status: 'new', manager: sales?._id, estimatedAmount: 49_000_000, productInterest: 'AIR80 1.5 kVt' },
    { title: "Fermer xo'jaligi uchun nasoslar", contactName: 'Dilshod', phone: '+998 94 555 66 77', source: 'telegram', status: 'contacted', manager: sales?._id, estimatedAmount: 18_500_000, productInterest: 'Nasos 50' },
    { title: 'Quyma korpuslar (dilerlik)', contactName: 'Bekzod', company: 'Motor Market', source: 'exhibition', status: 'proposal', manager: sales?._id, estimatedAmount: 26_000_000, productInterest: 'Q-KORPUS-80 quyma' },
  ])

  console.info('[seed] demo data created')
}
