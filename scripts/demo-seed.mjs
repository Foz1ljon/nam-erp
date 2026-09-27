#!/usr/bin/env node
// NamMotors ERP — demo data generator.
//
// Runs the whole factory through the REAL API, step by step, as the employee responsible for each step
// (supply receives raw materials, the foundry casts and hands over, fettling cleans, QC inspects, CNC machines,
// the store issues parts, assembly winds and assembles, painters paint and pack, sales managers work leads,
// B2B clients and orders). Every stock check, permission and validation of the real app applies.
// Each simulated day is then moved to its date in the past so reports and charts show a history.
//
//   pnpm demo:seed                 # against http://localhost:3000
//   BASE_URL=http://host:3000 DAYS=21 pnpm demo:seed
//   pnpm demo:seed --force         # run again even if demo data was already generated
//
// Requires the demo users created by the first start (NUXT_SEED_DEMO=true) with their default passwords.

import mongoose from 'mongoose'

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const MONGO = process.env.NUXT_MONGO_URI || 'mongodb://127.0.0.1:27017/nammotors'
const DAYS = Number(process.env.DAYS || 14)
const ADMIN_PASSWORD = process.env.NUXT_ADMIN_PASSWORD || 'admin123'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'nammotors'
const FORCE = process.argv.includes('--force')
const TZ_OFFSET_MS = 5 * 3600_000 // Asia/Tashkent

// ---------------------------------------------------------------- deterministic randomness
let seed = 20260928
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = (list) => list[Math.floor(rand() * list.length)]
const chance = (p) => rand() < p

// ---------------------------------------------------------------- API client (one session per employee)
const sessions = {}
async function login(username) {
  const password = username === 'admin' ? ADMIN_PASSWORD : DEMO_PASSWORD
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(`"${username}" sifatida kirib bo'lmadi (${res.status}). Demo hodimlar va parollarini tekshiring.`)
  sessions[username] = res.headers.get('set-cookie').split(';')[0]
}

async function api(user, method, path, body) {
  if (!sessions[user]) await login(user)
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie: sessions[user] },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${user} ${method} ${path} → ${res.status}: ${json.message ?? json.statusMessage}`)
  return json.data
}

// ---------------------------------------------------------------- reference data
let L = {} // location code → id
let I = {} // item code → item
const qty = (code, n) => ({ item: I[code]._id, qty: n })

function bomInputs(outputs, stage) {
  const totals = new Map()
  for (const { code, n } of outputs) {
    for (const line of I[code].bom.filter((b) => b.stage === stage)) {
      const id = line.component._id
      totals.set(id, Math.round(((totals.get(id) ?? 0) + line.qty * n) * 1000) / 1000)
    }
  }
  return [...totals].map(([item, q]) => ({ item, qty: q }))
}

const outs = (list) => list.filter((o) => o.n > 0).map((o) => qty(o.code, o.n))

async function operation(user, stage, { source, target, outputs, inputs, wastes = [], qc = false, afterQc, handoverTo, note }) {
  return api(user, 'POST', '/api/operations', {
    stage,
    sourceLocation: L[source],
    targetLocation: L[target],
    qcRequired: qc,
    afterQcLocation: qc ? L[afterQc] : null,
    handoverTo: handoverTo ? L[handoverTo] : null,
    inputs: inputs ?? bomInputs(outputs, stage),
    outputs: outs(outputs),
    wastes,
    note,
  })
}

async function accept(user, transferId) {
  if (transferId) await api(user, 'POST', `/api/transfers/${transferId}/accept`)
}

async function handover(sender, receiver, from, to, lines, note) {
  const t = await api(sender, 'POST', '/api/transfers', { from: L[from], to: L[to], lines: lines.filter((l) => l.qty > 0), note })
  await accept(receiver, t._id)
}

const DEFECTS = {
  cleaning: ["G'ovaklik (rakovina)", 'Yoriq', "To'liq quyilmagan", "Qum qoldig'i"],
  assembly: ['Izolyatsiya qarshiligi past', 'Shovqin / tebranish', "O'lcham mos emas"],
  packaging: ["Sinovdan o'tmadi", 'Shovqin / tebranish'],
}

/** QC inspects every pending output; a few pieces are rejected with realistic reasons. */
async function inspectAll(rejectRate) {
  const pending = await api('sifat', 'GET', '/api/qc/pending')
  for (const op of pending) {
    for (const out of op.outputs) {
      const remaining = out.qty - out.inspectedQty
      if (remaining <= 0) continue
      const rejected = remaining >= 3 && chance(rejectRate) ? 1 : 0
      const isCasting = out.item.type === 'casting'
      await api('sifat', 'POST', '/api/qc', {
        operation: op._id,
        item: out.item._id,
        passedQty: remaining - rejected,
        rejectedQty: rejected,
        rejectAction: rejected ? (isCasting ? 'scrap' : 'rework') : null,
        scrapItem: rejected && isCasting ? I['QR-BRAK']._id : null,
        defectReason: rejected ? pick(DEFECTS[op.stage] ?? DEFECTS.cleaning) : undefined,
        passedLocation: op.afterQcLocation._id,
        note: op.stage === 'packaging' ? "To'liq sinov: kuchlanish, tok, izolyatsiya, shovqin" : undefined,
      })
    }
  }
}

// ---------------------------------------------------------------- one production day
async function productionDay(day) {
  const motors = 3 + Math.floor(rand() * 3) // 3–5
  const pumps = 1 + Math.floor(rand() * 3) // 1–3
  const cast = { korpus: motors + 2, shit: motors * 2 + 2, nk: pumps + 1, nq: pumps + 1 }

  // Supply: raw material to the foundry every other day
  if (day % 2 === 0) await handover('taminot', 'liteyka', 'XOMASHYO', 'LITEYKA', [qty('XM-CHUGUN', 700)], 'Smena uchun chugun')

  // Foundry: melt and pour; most castings go straight to fettling, two housings stay for direct sale
  const casting = [
    { code: 'Q-KORPUS-80', n: cast.korpus },
    { code: 'Q-SHIT-80', n: cast.shit },
    { code: 'Q-NASOS-KORPUS', n: cast.nk },
    { code: 'Q-NASOS-QOPQOQ', n: cast.nq },
  ]
  const castOp = await operation('liteyka', 'casting', {
    source: 'LITEYKA', target: 'LITEYKA', outputs: casting,
    wastes: [qty('QR-LITNIK', Math.round(cast.korpus * 1.6 + cast.shit * 0.4))],
    note: `Pech №${1 + (day % 2)}, ${day % 2 ? 'ikkinchi' : 'birinchi'} smena`,
  })
  const toFettling = casting.map((c) => ({ ...c, n: c.code === 'Q-KORPUS-80' ? c.n - (day % 3 === 0 ? 2 : 0) : c.n }))
  await handover('liteyka', 'pishka', 'LITEYKA', 'PISHKA', outs(toFettling), `${castOp.number} quymalari`)

  // Fettling: clean, return sprues/sand scrap to the foundry, send to QC → CNC
  await operation('pishka', 'cleaning', {
    source: 'PISHKA', target: 'PISHKA', outputs: toFettling, qc: true, afterQc: 'CHPU',
    wastes: [qty('QR-QIRINDI', Math.round(toFettling.reduce((s, c) => s + c.n, 0) * 0.7))],
  })
  await inspectAll(0.35)

  // CNC: thread cutting on whatever passed QC, hand semi-finished parts to the store
  const cncStock = Object.fromEntries((await api('chpu', 'GET', `/api/stock?location=${L.CHPU}`)).map((s) => [s.item.code, s.qty]))
  const machined = [
    { code: 'YT-KORPUS-80', n: cncStock['Q-KORPUS-80'] ?? 0 },
    { code: 'YT-SHIT-80', n: cncStock['Q-SHIT-80'] ?? 0 },
    { code: 'YT-NASOS-KORPUS', n: cncStock['Q-NASOS-KORPUS'] ?? 0 },
    { code: 'YT-NASOS-QOPQOQ', n: cncStock['Q-NASOS-QOPQOQ'] ?? 0 },
  ].filter((m) => m.n > 0)
  if (machined.length) {
    const cnc = await operation('chpu', 'cnc', {
      source: 'CHPU', target: 'CHPU', outputs: machined, handoverTo: 'SKLAD',
      wastes: [qty('QR-QIRINDI', Math.round(machined.reduce((s, m) => s + m.n, 0) * 0.5))],
    })
    await accept('ombor', cnc.handover?._id)
  }

  // Store issues parts and materials for today's motors and pumps to the assembly shop
  await handover('ombor', 'yiguv', 'SKLAD', 'YIGUV', [
    qty('YT-KORPUS-80', motors), qty('YT-SHIT-80', motors * 2), qty('D-ROTOR-80', motors),
    qty('D-PODSHIPNIK-6204', motors * 2 + pumps * 2), qty('D-PARRAK-80', motors), qty('D-KLEMMA', motors),
    qty('D-BOLT-KOMPLEKT', motors + pumps),
    qty('M-SIM-1.0', Math.round(motors * 2.2 * 10) / 10), qty('M-JELEZA', motors * 6), qty('M-LAK', Math.round(motors * 0.3 * 10) / 10),
    qty('YT-NASOS-KORPUS', pumps), qty('YT-NASOS-QOPQOQ', pumps), qty('D-NASOS-PARRAK', pumps), qty('D-NASOS-VAL', pumps), qty('D-SALNIK', pumps),
  ], "Kunlik yig'uv komplekti")

  // Assembly shop: winding, then assembly → QC → paint shop
  await operation('yiguv', 'winding', { source: 'YIGUV', target: 'YIGUV', outputs: [{ code: 'YT-STATOR-80', n: motors }] })
  await operation('yiguv', 'assembly', {
    source: 'YIGUV', target: 'YIGUV', qc: true, afterQc: 'BOYOQ',
    outputs: [{ code: 'T-AIR80-1.5', n: motors }, { code: 'T-NASOS-50', n: pumps }],
  })
  await inspectAll(0.25)

  // Paint shop: paint, label (serial numbers) and pack; motors get a full test, pumps go straight to the warehouse
  const paintStock = Object.fromEntries((await api('boyoq', 'GET', `/api/stock?location=${L.BOYOQ}`)).map((s) => [s.item.code, s.qty]))
  const m = paintStock['T-AIR80-1.5'] ?? 0
  const p = paintStock['T-NASOS-50'] ?? 0
  await handover('ombor', 'boyoq', 'SKLAD', 'BOYOQ', [
    qty('M-KRASKA', Math.round((m * 0.4 + p * 0.3) * 10) / 10), qty('M-QUTI', m + p), qty('M-BIRKA', m + p),
  ], "Bo'yoq va qadoq materiallari")
  const finished = [{ code: 'T-AIR80-1.5', n: m }, { code: 'T-NASOS-50', n: p }]
  await operation('boyoq', 'painting', { source: 'BOYOQ', target: 'BOYOQ', outputs: finished })
  if (m) await operation('boyoq', 'packaging', { source: 'BOYOQ', target: 'BOYOQ', outputs: [{ code: 'T-AIR80-1.5', n: m }], qc: true, afterQc: 'TAYYOR' })
  if (p) {
    const pack = await operation('boyoq', 'packaging', { source: 'BOYOQ', target: 'BOYOQ', outputs: [{ code: 'T-NASOS-50', n: p }], handoverTo: 'TAYYOR' })
    await accept('ombor', pack.handover?._id)
  }
  await inspectAll(0.15)
  return { motors: m, pumps: p }
}

// ---------------------------------------------------------------- supply
const SUPPLIER_LINES = [
  ['Olmaliq KMK', [['XM-CHUGUN', 3000, 7600], ['XM-POLAT-LOM', 500, 4900], ['XM-FERROSIL', 40, 18500]]],
  ['Elektrosim Toshkent MChJ', [['M-SIM-1.0', 80, 146000], ['M-JELEZA', 250, 21500], ['M-LAK', 20, 41000]]],
  ['Podshipnik Servis', [['D-PODSHIPNIK-6204', 150, 18500], ['D-ROTOR-80', 30, 212000], ['D-SALNIK', 25, 35500], ['D-NASOS-PARRAK', 25, 48500]]],
]
async function receipt(counterparties, supplierName, lines) {
  const supplier = counterparties.find((c) => c.name === supplierName)
  const raw = lines.every(([code]) => code.startsWith('XM-'))
  await api('taminot', 'POST', '/api/receipts', {
    supplier: supplier?._id,
    location: L[raw ? 'XOMASHYO' : 'SKLAD'],
    note: `Yuk xati №${Math.floor(1000 + rand() * 9000)}, avto ${pick(['01', '40', '50'])} ${String.fromCharCode(65 + Math.floor(rand() * 26))} ${Math.floor(100 + rand() * 900)} ${pick(['AA', 'BA', 'CA'])}`,
    lines: lines.map(([code, n, price]) => ({ item: I[code]._id, qty: n, price })),
  })
}

// ---------------------------------------------------------------- CRM & sales
const CLIENTS = [
  { name: "Farg'ona Suv Servis", legalName: "«FARG'ONA SUV SERVIS» MChJ", inn: '301234567', segment: 'utility', region: "Farg'ona", director: 'Qodirov A.', bankName: 'Agrobank', bankAccount: '20208000900123456001', mfo: '00873', creditLimit: 30_000_000, paymentTermsDays: 30, phone: '+998 73 244 00 11' },
  { name: 'Chust Tegirmon', legalName: '«CHUST TEGIRMON» XK', inn: '302987654', segment: 'factory', region: 'Namangan', director: 'Yusupov B.', bankName: 'Ipoteka bank', bankAccount: '20208000400987654002', mfo: '00400', creditLimit: 20_000_000, paymentTermsDays: 15, phone: '+998 69 555 12 34' },
  { name: 'Motor Market', legalName: '«MOTOR MARKET» MChJ', inn: '303456789', segment: 'dealer', region: 'Toshkent', director: 'Karimov D.', bankName: 'Kapitalbank', bankAccount: '20208000100456789003', mfo: '01088', creditLimit: 60_000_000, paymentTermsDays: 45, phone: '+998 71 200 45 67' },
  { name: 'Andijon Agro Klaster', legalName: '«ANDIJON AGRO KLASTER» MChJ', inn: '304111222', segment: 'agro', region: 'Andijon', director: 'Nazarov S.', bankName: 'Hamkorbank', bankAccount: '20208000500111222004', mfo: '00083', creditLimit: 25_000_000, paymentTermsDays: 30, phone: '+998 74 223 88 00' },
  { name: 'Qurilish Invest', legalName: '«QURILISH INVEST» AJ', inn: '305333444', segment: 'construction', region: 'Samarqand', director: 'Rahimov O.', bankName: 'Asakabank', bankAccount: '20208000700333444005', mfo: '00873', creditLimit: 15_000_000, paymentTermsDays: 10, phone: '+998 66 233 10 20' },
]

const LEADS = [
  ['10 ta AIR80 dvigatel (tegirmon uchun)', 'Jasur Tursunov', '+998 93 111 22 33', 'Chust Tegirmon', 'phone', 24_500_000, 'AIR80 1.5 kVt'],
  ['Fermer xo\'jaligi uchun 6 ta nasos', 'Dilshod Aliyev', '+998 94 555 66 77', null, 'telegram', 11_100_000, 'Nasos 50'],
  ['Diler shartnomasi: oyiga 30 ta dvigatel', 'Bekzod Karimov', '+998 90 777 88 99', 'Motor Market', 'exhibition', 73_500_000, 'AIR80'],
  ['Suv inshooti uchun nasos stansiyasi', 'Anvar Qodirov', '+998 73 244 00 11', "Farg'ona Suv Servis", 'website', 37_000_000, 'Nasos 50'],
  ['Quyma korpuslar (ta\'mirlash uchun)', 'Sardor Nazarov', '+998 91 234 56 78', 'Andijon Agro Klaster', 'instagram', 5_200_000, 'Q-KORPUS-80'],
  ['Qurilish maydoni uchun 3 ta nasos', 'Olim Rahimov', '+998 97 321 65 43', 'Qurilish Invest', 'referral', 5_550_000, 'Nasos 50'],
  ['Issiqxona sug\'orish tizimi', 'Nodira Yusupova', '+998 99 888 77 66', null, 'instagram', 7_400_000, 'Nasos 50'],
  ['Zavod ventilyatsiyasi uchun dvigatellar', 'Rustam Ergashev', '+998 95 444 33 22', 'Namangan Tekstil', 'phone', 19_600_000, 'AIR80'],
]

async function crmAndSales(counterparties) {
  const clientIds = {}
  for (const c of CLIENTS) {
    const existing = counterparties.find((x) => x.name === c.name)
    const doc = existing ?? (await api('sotuv', 'POST', '/api/counterparties', {
      ...c, type: 'customer', kind: 'b2b', contactPerson: c.director, contractNumber: `NM-${Math.floor(10 + rand() * 80)}/2026`,
      contractDate: new Date(Date.now() - (60 + rand() * 200) * 86_400_000).toISOString(),
    }))
    clientIds[c.name] = doc._id
  }
  const leads = []
  for (const [title, contactName, phone, company, source, amount, interest] of LEADS) {
    const lead = await api('sotuv', 'POST', '/api/leads', { title, contactName, phone, company: company ?? undefined, source, estimatedAmount: amount, productInterest: interest })
    leads.push({ ...lead, title, company })
  }
  return { clientIds, leads }
}

async function leadActivity(lead, step) {
  const texts = [
    ['call', "Qo'ng'iroq qildim: ehtiyoj, quvvat va muddatni aniqladik"],
    ['message', "Telegram orqali texnik pasport va narxlar ro'yxatini yubordim"],
    ['meeting', "Zavodga tashrif: ishlab chiqarishni ko'rsatdik, namunalarni sinab ko'rishdi"],
    ['task', "Tijorat taklifini tayyorlab yuborish"],
    ['note', "Mijoz 30 kunlik to'lov muddatini so'radi, rahbar bilan kelishiladi"],
  ]
  const [type, text] = texts[step % texts.length]
  await api('sotuv', 'POST', `/api/leads/${lead._id}/activities`, { type, text, dueAt: type === 'task' ? new Date(Date.now() + 2 * 86_400_000).toISOString() : null })
}

async function saleOrder(customerId, lines, { leadId, pay = 1, discount = 0 }) {
  const order = await api('sotuv', 'POST', '/api/sales', { customer: customerId, lead: leadId ?? null, discount, lines })
  await api('sotuv', 'POST', `/api/sales/${order._id}/status`, { action: 'confirm' })
  await api('sotuv', 'POST', `/api/sales/${order._id}/ship`)
  const full = await api('sotuv', 'GET', `/api/sales/${order._id}`)
  if (pay > 0) {
    const amount = Math.round((full.total * pay) / 1000) * 1000
    if (amount > 0) await api('sotuv', 'POST', `/api/sales/${order._id}/payments`, { amount: Math.min(amount, full.total), method: pick(['transfer', 'transfer', 'cash', 'card']) })
    if (pay >= 1) await api('sotuv', 'POST', `/api/sales/${order._id}/status`, { action: 'complete' })
  }
  return order
}

// ---------------------------------------------------------------- moving a simulated day into the past
const TIMESTAMPED = ['operations', 'transfers', 'qcinspections', 'stockmoves', 'receipts', 'adjustments', 'salesorders', 'leads', 'counterparties', 'productunits', 'conversations', 'chatmessages']

function dayWindow(daysAgo) {
  const now = Date.now()
  const tashkentMidnight = Math.floor((now + TZ_OFFSET_MS) / 86_400_000) * 86_400_000 - TZ_OFFSET_MS
  const start = tashkentMidnight - daysAgo * 86_400_000 + 8 * 3600_000 // 08:00
  let end = start + 10 * 3600_000 // 18:00
  if (daysAgo === 0) end = Math.min(end, now - 60_000)
  return daysAgo === 0 && end <= start ? [tashkentMidnight + 60_000, now - 60_000] : [start, end]
}

/** Maps every timestamp written during [batchStart, batchEnd] onto the working hours of the target day. */
async function backdate(db, batchStart, batchEnd, daysAgo) {
  const [from, to] = dayWindow(daysAgo)
  const span = Math.max(1, batchEnd - batchStart)
  const scale = (to - from) / span
  const map = (expr) => ({ $cond: [{ $and: [{ $gte: [expr, new Date(batchStart)] }, { $lte: [expr, new Date(batchEnd)] }] }, { $add: [new Date(from), { $multiply: [{ $subtract: [expr, new Date(batchStart)] }, scale] }] }, expr] })
  const inBatch = { $gte: new Date(batchStart), $lte: new Date(batchEnd) }
  for (const name of TIMESTAMPED) {
    const col = db.collection(name)
    await col.updateMany({ $or: [{ createdAt: inBatch }, { updatedAt: inBatch }, { resolvedAt: inBatch }, { shippedAt: inBatch }, { soldAt: inBatch }, { lastMessageAt: inBatch }] }, [
      {
        $set: {
          createdAt: map('$createdAt'),
          updatedAt: map('$updatedAt'),
          ...(name === 'transfers' ? { resolvedAt: map('$resolvedAt') } : {}),
          ...(name === 'salesorders' ? { shippedAt: map('$shippedAt'), payments: { $map: { input: '$payments', as: 'p', in: { $mergeObjects: ['$$p', { date: map('$$p.date') }] } } } } : {}),
          ...(name === 'productunits' ? { soldAt: map('$soldAt') } : {}),
          ...(name === 'conversations' ? { lastMessageAt: map('$lastMessageAt') } : {}),
          ...(name === 'leads' ? { activities: { $map: { input: '$activities', as: 'a', in: { $mergeObjects: ['$$a', { createdAt: map('$$a.createdAt') }] } } } } : {}),
        },
      },
    ])
  }
}

// ---------------------------------------------------------------- Telegram / Instagram demo conversations
async function demoConversations(db, leads) {
  const sotuv = await db.collection('users').findOne({ username: 'sotuv' })
  const now = new Date()
  const profiles = [
    { type: 'telegram', name: '@nammotors_sotuv (demo)', capture: 'new_contacts', telegram: { userId: '700000001', username: 'nammotors_sotuv', phone: '+998901112233', displayName: 'Sotuv menejeri' } },
    { type: 'instagram', name: '@nammotors.uz (demo)', capture: 'new_contacts', instagram: { igUserId: '17841400000000999', username: 'nammotors.uz', displayName: 'NamMotors' } },
  ]
  const ids = {}
  for (const p of profiles) {
    const res = await db.collection('channels').findOneAndUpdate(
      { type: p.type, owner: sotuv._id, name: p.name },
      { $set: { ...p, owner: sotuv._id, active: true, status: 'connected', lastError: null, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: 'after' },
    )
    ids[p.type] = res._id
  }
  const chats = [
    ['telegram', 'Dilshod Aliyev', 'dilshod_fermer', '+998945556677', 1, [
      ['in', "Assalomu alaykum. 50-lik nasosdan 6 ta kerak edi, fermer xo'jaligiga. Narxi qancha?"],
      ['out', "Va alaykum assalom! Nasos 50 — 1 850 000 so'm, 6 ta olsangiz 3% chegirma. Yetkazib berish Namangan ichida bepul."],
      ['in', "Kafolat qancha? Suv chuqurligi 12 metr, yetadimi?"],
      ['out', "Kafolat 12 oy. 12 metrgacha bemalol yetadi, texnik pasportini yubordim."],
      ['in', "Yaxshi, ertaga to'lov qilaman. Hisob-faktura kerak bo'ladi"],
    ]],
    ['instagram', 'Nodira Yusupova', 'nodira.greenhouse', null, 6, [
      ['in', "Salom! Issiqxona sug'orishi uchun nasos kerak, 4 ta. Bor bo'lsa manzil tashlang"],
      ['out', "Assalomu alaykum! Omborda bor. Manzil: Namangan sh., sanoat zonasi. Qo'ng'iroq qiling: +998 69 000 00 00"],
      ['in', "Rahmat, dam olish kuni kelsam bo'ladimi?"],
    ]],
    ['instagram', 'Sardor Nazarov', 'sardor_agro', null, 4, [
      ['in', "Dvigatel korpusi alohida quyma holida sotiladimi? Ta'mirlash uchun kerak"],
      ['out', "Ha, AIR80 korpusi quyma holida 260 000 so'm. Nechta kerak?"],
      ['in', '5 ta'],
    ]],
    ['telegram', 'Jasur Tursunov', 'jasur_chust', '+998931112233', 0, [
      ['in', "Tijorat taklifini oldim, 10 ta AIR80 uchun kelishdik. Shartnoma tayyorlaysizmi?"],
    ]],
  ]
  for (const [type, name, username, phone, leadIdx, messages] of chats) {
    const lead = leads[leadIdx]
    const unread = messages.at(-1)[0] === 'in' ? 1 : 0
    const conv = await db.collection('conversations').findOneAndUpdate(
      { channel: ids[type], externalChatId: `demo-${username}` },
      {
        $set: {
          channelType: type, contactName: name, contactUsername: username, contactPhone: phone, manager: sotuv._id,
          lead: lead ? new mongoose.Types.ObjectId(lead._id) : null, lastMessageAt: now, lastMessageText: messages.at(-1)[1].slice(0, 200), unread, updatedAt: now,
        },
        $setOnInsert: { channel: ids[type], externalChatId: `demo-${username}`, createdAt: now, businessConnectionId: null, accessHash: null },
      },
      { upsert: true, returnDocument: 'after' },
    )
    await db.collection('chatmessages').deleteMany({ conversation: conv._id })
    await db.collection('chatmessages').insertMany(messages.map(([direction, text], i) => ({
      conversation: conv._id, direction, text, status: direction === 'in' ? 'received' : 'sent',
      user: direction === 'out' ? sotuv._id : null, externalId: `demo-${username}-${i}`,
      createdAt: new Date(now.getTime() - (messages.length - i) * 17 * 60_000),
    })))
  }
}

// ---------------------------------------------------------------- main
async function main() {
  console.log(`NamMotors demo: ${BASE}, ${DAYS} kun`)
  await mongoose.connect(MONGO)
  const db = mongoose.connection.db
  const flag = await db.collection('settings').findOne({ _id: 'demo' })
  if (flag && !FORCE) {
    console.log(`Demo ma'lumotlar allaqachon yaratilgan (${flag.value?.seededAt}). Qayta yaratish: pnpm demo:seed --force`)
    await mongoose.disconnect()
    return
  }

  for (const u of ['admin', 'taminot', 'ombor', 'liteyka', 'pishka', 'chpu', 'yiguv', 'boyoq', 'sifat', 'sotuv', 'rahbar']) await login(u)
  L = Object.fromEntries((await api('admin', 'GET', '/api/locations')).map((l) => [l.code, l._id]))
  I = Object.fromEntries((await api('admin', 'GET', '/api/items')).map((i) => [i.code, i]))
  let counterparties = await api('admin', 'GET', '/api/counterparties')

  // CRM base (clients and leads) — dated at the start of the period
  let t0 = Date.now()
  const { clientIds, leads } = await crmAndSales(counterparties)
  counterparties = await api('admin', 'GET', '/api/counterparties')
  await backdate(db, t0 - 1, Date.now() + 1, DAYS)

  const leadPlan = [
    // [lead index, day it closes as an order, customer]
    [0, 3, 'Chust Tegirmon'],
    [3, 7, "Farg'ona Suv Servis"],
    [5, 10, 'Qurilish Invest'],
  ]
  let produced = { motors: 0, pumps: 0 }
  for (let d = DAYS - 1; d >= 0; d--) {
    const dayIndex = DAYS - 1 - d
    t0 = Date.now()
    if (dayIndex % 4 === 0) {
      const [supplier, lines] = SUPPLIER_LINES[(dayIndex / 4) % SUPPLIER_LINES.length]
      await receipt(counterparties, supplier, lines)
    }
    const out = await productionDay(dayIndex)
    produced.motors += out.motors
    produced.pumps += out.pumps

    // Sales managers: follow up leads every day
    for (let k = 0; k < 2; k++) await leadActivity(pick(leads), dayIndex + k)
    if (dayIndex === 1) await api('sotuv', 'PATCH', `/api/leads/${leads[1]._id}/status`, { status: 'contacted' })
    if (dayIndex === 2) await api('sotuv', 'PATCH', `/api/leads/${leads[2]._id}/status`, { status: 'qualified' })
    if (dayIndex === 5) await api('sotuv', 'PATCH', `/api/leads/${leads[6]._id}/status`, { status: 'contacted' })
    if (dayIndex === 8) await api('sotuv', 'PATCH', `/api/leads/${leads[7]._id}/status`, { status: 'lost', lostReason: 'Narx qimmatlik qildi, Xitoy mahsulotini oldi' })
    if (dayIndex === 9) await api('sotuv', 'PATCH', `/api/leads/${leads[4]._id}/status`, { status: 'proposal' })

    for (const [li, closeDay, customer] of leadPlan) {
      if (dayIndex !== closeDay) continue
      const lead = leads[li]
      await api('sotuv', 'POST', `/api/leads/${lead._id}/convert`)
      const isPump = /nasos/i.test(lead.title)
      const n = li === 0 ? 10 : isPump ? 3 : 4
      await saleOrder(clientIds[customer], [{ item: I[isPump ? 'T-NASOS-50' : 'T-AIR80-1.5']._id, location: L.TAYYOR, qty: n, price: isPump ? 1_850_000 : 2_450_000 }], { leadId: lead._id, pay: li === 3 ? 0.5 : 1, discount: li === 0 ? 500_000 : 0 })
    }
    // Regular dealer orders, castings sold straight from the foundry, semi-finished parts from the store
    if (dayIndex % 3 === 2) {
      await saleOrder(clientIds['Motor Market'], [
        { item: I['T-AIR80-1.5']._id, location: L.TAYYOR, qty: 3, price: 2_400_000 },
        { item: I['T-NASOS-50']._id, location: L.TAYYOR, qty: 1, price: 1_820_000 },
      ], { pay: pick([1, 0.6, 0]) })
    }
    if (dayIndex % 3 === 0 && dayIndex > 0) {
      await saleOrder(clientIds['Andijon Agro Klaster'], [{ item: I['Q-KORPUS-80']._id, location: L.LITEYKA, qty: 2, price: 260_000 }], { pay: 1 })
    }
    if (dayIndex === 6) {
      await saleOrder(counterparties.find((c) => c.name === 'Agro Servis MChJ')._id, [{ item: I['YT-SHIT-80']._id, location: L.SKLAD, qty: 6, price: 75_000 }], { pay: 1 })
    }
    await backdate(db, t0 - 1, Date.now() + 1, d)
    process.stdout.write(`  ${DAYS - d}/${DAYS} kun: ${out.motors} dvigatel, ${out.pumps} nasos\n`)
  }

  // Today: something still in progress so every screen shows live work
  t0 = Date.now()
  const openCast = await operation('liteyka', 'casting', { source: 'LITEYKA', target: 'LITEYKA', outputs: [{ code: 'Q-KORPUS-80', n: 4 }, { code: 'Q-SHIT-80', n: 8 }], wastes: [qty('QR-LITNIK', 9)], note: 'Bugungi birinchi smena' })
  await api('liteyka', 'POST', '/api/transfers', { from: L.LITEYKA, to: L.PISHKA, lines: [qty('Q-KORPUS-80', 4), qty('Q-SHIT-80', 8)], note: `${openCast.number} — qabul kutilmoqda` })
  // Monthly stock count in the store: three labels were found missing
  const labels = (await api('ombor', 'GET', `/api/stock?location=${L.SKLAD}&item=${I['M-BIRKA']._id}`))[0]?.qty ?? 0
  await api('ombor', 'POST', '/api/adjustments', { location: L.SKLAD, note: 'Oylik inventarizatsiya', lines: [{ item: I['M-BIRKA']._id, actualQty: Math.max(0, labels - 3) }] })
  const draft = await api('sotuv', 'POST', '/api/sales', { customer: clientIds['Motor Market'], lines: [{ item: I['T-AIR80-1.5']._id, location: L.TAYYOR, qty: 5, price: 2_400_000 }], note: "Keyingi haftaga, to'lovdan keyin jo'natiladi" })
  await api('sotuv', 'POST', `/api/sales/${draft._id}/status`, { action: 'confirm' })
  await api('sotuv', 'POST', '/api/sales', { customer: clientIds['Qurilish Invest'], lead: leads[5]._id, lines: [{ item: I['T-NASOS-50']._id, location: L.TAYYOR, qty: 2, price: 1_850_000 }], note: 'Qoralama — mijoz tasdiqlashini kutyapmiz' })
  await demoConversations(db, leads)
  await backdate(db, t0 - 1, Date.now() + 1, 0)

  await db.collection('settings').updateOne({ _id: 'demo' }, { $set: { value: { seededAt: new Date().toISOString(), days: DAYS } } }, { upsert: true })
  const count = async (c) => db.collection(c).countDocuments()
  console.log(`\nTayyor: ${produced.motors} dvigatel va ${produced.pumps} nasos ishlab chiqarildi.`)
  console.log(`operatsiyalar ${await count('operations')}, topshirishlar ${await count('transfers')}, sifat tekshiruvlari ${await count('qcinspections')}, sotuvlar ${await count('salesorders')}, lidlar ${await count('leads')}, mijozlar ${await count('counterparties')}, seriya raqamlari ${await count('productunits')}, ombor harakatlari ${await count('stockmoves')}`)
  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error('\nXato:', error.message)
  await mongoose.disconnect().catch(() => undefined)
  process.exit(1)
})
