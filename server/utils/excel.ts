import ExcelJS from 'exceljs'
import type { Types } from 'mongoose'

export interface ExcelSheet {
  name: string
  title?: string
  columns: string[]
  rows: (string | number | boolean | null)[][]
}

const MAX_ROWS = 10_000

/** Columns holding identifiers stay text even when they look numeric (STIR, phone, account, codes). */
const ID_COLUMN = /stir|inn|jshshir|tel|phone|hisob|account|mfo|oked|kod|code|№|raqam|seriya|serial|id\b/i

/** Models often send numbers as strings; turn "1250000" / "12.5" into real numbers for sums and filters. */
function cellValue(v: unknown, textColumn: boolean): string | number | boolean {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return textColumn ? String(v) : v
  const s = String(v).trim()
  const compact = s.replace(/[\s\u00a0]/g, '')
  if (!textColumn && /^-?(0|[1-9]\d{0,14})([.,]\d+)?$/.test(compact)) return Number(compact.replace(',', '.'))
  return s
}
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function safeSheetName(name: string, used: Set<string>) {
  let base = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Varaq'
  let candidate = base
  for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = `${base.slice(0, 25)} ${i}`
  used.add(candidate.toLowerCase())
  return candidate
}

/** Builds a formatted .xlsx (bold header, frozen first row, auto widths, number formats) and stores it. */
export async function createExcelFile(input: { filename: string; sheets: ExcelSheet[]; user: Types.ObjectId; chat?: Types.ObjectId | null }) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NamMotors ERP'
  workbook.created = new Date()
  const used = new Set<string>()

  for (const sheet of input.sheets) {
    const ws = workbook.addWorksheet(safeSheetName(sheet.name, used), { views: [{ state: 'frozen', ySplit: sheet.title ? 2 : 1 }] })
    let headerRowNumber = 1
    if (sheet.title) {
      ws.addRow([sheet.title]).font = { bold: true, size: 13 }
      ws.mergeCells(1, 1, 1, Math.max(1, sheet.columns.length))
      headerRowNumber = 2
    }
    const header = ws.addRow(sheet.columns)
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.alignment = { vertical: 'middle', wrapText: true }
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } }
    })

    const textColumns = sheet.columns.map((c) => ID_COLUMN.test(c))
    for (const row of sheet.rows.slice(0, MAX_ROWS)) {
      const r = ws.addRow((Array.isArray(row) ? row : []).map((v, i) => cellValue(v, textColumns[i] ?? false)))
      r.eachCell((cell) => {
        if (typeof cell.value === 'number') cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.###'
      })
    }

    sheet.columns.forEach((title, i) => {
      const lengths = [title.length, ...sheet.rows.slice(0, 500).map((r) => String(r[i] ?? '').length)]
      ws.getColumn(i + 1).width = Math.min(60, Math.max(10, Math.max(...lengths) + 2))
    })
    ws.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: Math.max(1, sheet.columns.length) } }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const name = `${input.filename.replace(/\.xlsx$/i, '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 80) || 'hisobot'}.xlsx`
  const file = await GeneratedFileModel.create({ name, mime: XLSX_MIME, size: buffer.length, data: buffer, user: input.user, chat: input.chat ?? null })
  return { id: String(file._id), name, url: `/api/ai/files/${file._id}` }
}
