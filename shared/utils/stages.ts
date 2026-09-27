import type { ItemType, LocationCode, Role } from './constants'
import { LOC } from './constants'

export const STAGES = ['casting', 'cleaning', 'cnc', 'winding', 'assembly', 'painting', 'packaging'] as const
export type Stage = (typeof STAGES)[number]

export interface StageConfig {
  key: Stage
  label: string
  department: string
  description: string
  roles: Role[]
  /** Location the inputs are consumed from. */
  source: LocationCode
  /** Location the outputs land in when QC is not required. */
  target: LocationCode
  /** Where QC-passed goods are sent by default. */
  afterQc: LocationCode
  /** Department the finished work is handed over to (receiver must accept). Null when work stays in place. */
  next: LocationCode | null
  qcDefault: boolean
  inputTypes: ItemType[]
  outputTypes: ItemType[]
  /** Scrap / sprues / rejected castings that return to the foundry. */
  wasteAllowed: boolean
  /** Generate serial numbers (labels) for serial-tracked outputs. */
  serials: boolean
}

export const STAGE_CONFIG: Record<Stage, StageConfig> = {
  casting: {
    key: 'casting',
    label: 'Quyish',
    department: 'Liteyka',
    description: "Chugun va metallar eritilib qoliplarga quyiladi. Natija: quyma (kg / dona).",
    roles: ['foundry'],
    source: LOC.FOUNDRY,
    target: LOC.FOUNDRY,
    afterQc: LOC.FETTLING,
    next: LOC.FETTLING,
    qcDefault: false,
    inputTypes: ['raw', 'scrap'],
    outputTypes: ['casting'],
    wasteAllowed: true,
    serials: false,
  },
  cleaning: {
    key: 'cleaning',
    label: 'Tozalash',
    department: 'Pishka stroy',
    description: "Quymalardan qum va shlaklar tozalanadi. Brak, ortiqcha quyma va qirindilar liteykaga qaytadi. Sifat nazorati tekshiradi.",
    roles: ['fettling'],
    source: LOC.FETTLING,
    target: LOC.FETTLING,
    afterQc: LOC.CNC,
    next: LOC.CNC,
    qcDefault: true,
    inputTypes: ['casting'],
    outputTypes: ['casting'],
    wasteAllowed: true,
    serials: false,
  },
  cnc: {
    key: 'cnc',
    label: 'Mexanik ishlov (rezba)',
    department: 'CHPU',
    description: "CHPU stanoklarida rezbalar ochiladi, quyma yarim tayyor mahsulotga aylanadi va omborga topshiriladi.",
    roles: ['cnc'],
    source: LOC.CNC,
    target: LOC.CNC,
    afterQc: LOC.STORE,
    next: LOC.STORE,
    qcDefault: false,
    inputTypes: ['casting'],
    outputTypes: ['semi'],
    wasteAllowed: true,
    serials: false,
  },
  winding: {
    key: 'winding',
    label: 'Obmotka',
    department: "Yig'uv bo'limi",
    description: "Stator jelezasiga obmotka simi o'raladi.",
    roles: ['assembly'],
    source: LOC.ASSEMBLY,
    target: LOC.ASSEMBLY,
    afterQc: LOC.ASSEMBLY,
    next: null,
    qcDefault: false,
    inputTypes: ['semi', 'material', 'component'],
    outputTypes: ['semi'],
    wasteAllowed: false,
    serials: false,
  },
  assembly: {
    key: 'assembly',
    label: "Yig'ish",
    department: "Yig'uv bo'limi",
    description: "Korpusga detallar yig'iladi: elektr dvigatel yoki suv nasosi. Keyin sifat nazoratidan o'tadi.",
    roles: ['assembly'],
    source: LOC.ASSEMBLY,
    target: LOC.ASSEMBLY,
    afterQc: LOC.PAINT,
    next: LOC.PAINT,
    qcDefault: true,
    inputTypes: ['semi', 'component', 'material'],
    outputTypes: ['finished'],
    wasteAllowed: false,
    serials: false,
  },
  painting: {
    key: 'painting',
    label: "Bo'yash",
    department: "Bo'yoq va qadoqlash",
    description: "Yig'ilgan mahsulot bo'yaladi.",
    roles: ['painter'],
    source: LOC.PAINT,
    target: LOC.PAINT,
    afterQc: LOC.PAINT,
    next: null,
    qcDefault: false,
    inputTypes: ['finished', 'material'],
    outputTypes: ['finished'],
    wasteAllowed: false,
    serials: false,
  },
  packaging: {
    key: 'packaging',
    label: 'Birka va qadoqlash',
    department: "Bo'yoq va qadoqlash",
    description: "Model birkasi (seriya raqami) yopishtiriladi va qadoqlanadi. Elektr dvigatellar to'liq sinovdan o'tib omborga ketadi.",
    roles: ['painter'],
    source: LOC.PAINT,
    target: LOC.PAINT,
    afterQc: LOC.FINISHED,
    next: LOC.FINISHED,
    qcDefault: false,
    inputTypes: ['finished', 'material'],
    outputTypes: ['finished'],
    wasteAllowed: false,
    serials: true,
  },
}

export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value)
}
