// Serialized shapes returned by the API (ObjectIds are strings, dates are ISO strings).
import type {
  ActivityType,
  CallDirection,
  ChannelStatus,
  ChannelType,
  ClientKind,
  ClientSegment,
  CounterpartyType,
  MessageDirection,
  DocType,
  ItemType,
  LeadSource,
  LeadStatus,
  LocationType,
  PaymentMethod,
  ProductKind,
  ProductUnitStatus,
  QcStatus,
  RejectAction,
  Role,
  SalesStatus,
  TransferStatus,
  Unit,
} from '../utils/constants'
import type { Stage } from '../utils/stages'

export interface ApiResponse<T> {
  success: true
  data: T
}

export interface Paginated<T> {
  items: T[]
  total: number
}

export interface BaseDoc {
  _id: string
}

export interface LocationDto extends BaseDoc {
  code: string
  name: string
  type: LocationType
  active: boolean
  order: number
}

export interface UserRef extends BaseDoc {
  fullName: string
  username: string
  role: Role
}

export interface UserDto extends UserRef {
  phone?: string
  location?: LocationDto | null
  active: boolean
  createdAt: string
}

export interface BomLineDto {
  component: ItemRef
  qty: number
  stage: Stage
}

export interface ItemRef extends BaseDoc {
  code: string
  name: string
  unit: Unit
  type: ItemType
  productKind?: ProductKind | null
  unitWeightKg?: number | null
  serialTracked?: boolean
}

export interface ItemDto extends ItemRef {
  price: number
  cost: number
  minStock: number
  description?: string
  active: boolean
  bom: BomLineDto[]
}

export interface CounterpartyDto extends BaseDoc {
  name: string
  type: CounterpartyType
  kind: ClientKind
  segment?: ClientSegment | null
  manager?: string | UserRef | null
  inn?: string
  legalName?: string
  director?: string
  bankName?: string
  bankAccount?: string
  mfo?: string
  oked?: string
  vatCode?: string
  phone?: string
  email?: string
  website?: string
  telegram?: string
  instagram?: string
  region?: string
  address?: string
  contactPerson?: string
  contractNumber?: string
  contractDate?: string | null
  paymentTermsDays?: number
  creditLimit?: number
  note?: string
  createdAt: string
}

export interface ClientListRow extends CounterpartyDto {
  stats: { orders: number; total: number; paid: number; debt: number; lastOrderAt: string | null; openLeads: number }
}

export interface ClientDetails {
  client: CounterpartyDto & { manager?: UserRef | null }
  stats: ClientListRow['stats']
  orders: Pick<SalesOrderDto, '_id' | 'number' | 'status' | 'total' | 'paidAmount' | 'createdAt' | 'shippedAt'>[]
  payments: (PaymentDto & { orderNumber: string; orderId: string })[]
  leads: Pick<LeadDto, '_id' | 'title' | 'status' | 'estimatedAmount' | 'createdAt'>[]
  conversations: Pick<ConversationDto, '_id' | 'channelType' | 'contactName' | 'lastMessageAt' | 'lastMessageText'>[]
  topItems: { item: ItemRef; qty: number; amount: number }[]
}

export interface ChannelDto extends BaseDoc {
  type: ChannelType
  name: string
  owner: UserRef
  active: boolean
  status: ChannelStatus
  lastError?: string | null
  greeting?: string
  capture: 'new_contacts' | 'all'
  telegram?: { userId?: string; username?: string | null; phone?: string; displayName?: string }
  instagram?: { igUserId?: string; username?: string; displayName?: string; tokenExpiresAt?: string | null }
  conversations?: number
  createdAt: string
}

export interface ConversationDto extends BaseDoc {
  channel: { _id: string; name: string; type: ChannelType }
  channelType: ChannelType
  contactName?: string
  contactUsername?: string
  contactPhone?: string
  manager: UserRef
  lead?: { _id: string; title: string; status: LeadStatus } | null
  customer?: { _id: string; name: string } | null
  lastMessageAt: string
  lastMessageText?: string
  unread: number
}

export interface ChatMessageDto extends BaseDoc {
  direction: MessageDirection
  text: string
  user?: UserRef | null
  status: 'received' | 'sent' | 'failed'
  error?: string
  createdAt: string
}

export interface IntegrationsDto {
  telegramApiId: number | null
  telegramApiHash: string
  instagramAppId: string
  instagramAppSecret: string
  instagramVerifyToken: string
  instagramWebhookUrl: string | null
  instagramRedirectUri: string | null
}

export interface AiChatSummary extends BaseDoc {
  title: string
  updatedAt: string
}

export interface AiMessageDto {
  _id: string
  role: 'user' | 'assistant'
  content: string
  files: { id: string; name: string }[]
  tools: string[]
  error?: boolean
  createdAt: string
}

export interface AiChatDto extends AiChatSummary {
  provider?: string
  aiModel?: string
  messages: AiMessageDto[]
}

export interface AiSettingsDto {
  provider: import('../utils/constants').AiProvider
  model: string
  baseUrl: string
  /** Which providers have a stored key, e.g. `{ gemini: '…a1B2' }` (only the last 4 characters). */
  keys: Partial<Record<import('../utils/constants').AiProvider, string>>
  configured: boolean
}

export interface StockDto extends BaseDoc {
  item: ItemRef & { minStock: number; cost: number; price: number }
  location: LocationDto
  qty: number
}

export interface StockMoveDto extends BaseDoc {
  item: ItemRef
  location: LocationDto
  qty: number
  docType: DocType
  docId: string
  docNumber: string
  user?: UserRef | null
  note?: string
  createdAt: string
}

export interface QtyLineDto {
  item: ItemRef
  qty: number
}

export interface PricedLineDto extends QtyLineDto {
  price: number
}

export interface ReceiptDto extends BaseDoc {
  number: string
  supplier?: CounterpartyDto | null
  location: LocationDto
  user: UserRef
  note?: string
  lines: PricedLineDto[]
  total: number
  createdAt: string
}

export interface TransferDto extends BaseDoc {
  number: string
  from: LocationDto
  to: LocationDto
  sender: UserRef
  receiver?: UserRef | null
  acceptedBy?: UserRef | null
  status: TransferStatus
  note?: string
  rejectReason?: string
  lines: QtyLineDto[]
  createdAt: string
  resolvedAt?: string | null
}

export interface OperationOutputDto extends QtyLineDto {
  inspectedQty: number
}

export interface OperationDto extends BaseDoc {
  number: string
  stage: Stage
  sourceLocation: LocationDto
  targetLocation: LocationDto
  afterQcLocation?: LocationDto | null
  worker: UserRef
  createdBy: UserRef
  qcRequired: boolean
  qcStatus: QcStatus
  inputs: QtyLineDto[]
  outputs: OperationOutputDto[]
  wastes: QtyLineDto[]
  serials: string[]
  handoverTransfer?: { _id: string; number: string; status: TransferStatus; to: LocationDto } | null
  note?: string
  createdAt: string
}

export interface OperationSaved {
  _id: string
  number: string
  serials: string[]
  handover: { _id: string; number: string } | null
  handoverError: string | null
}

export interface QcInspectionDto extends BaseDoc {
  number: string
  operation?: Pick<OperationDto, '_id' | 'number' | 'stage'> | null
  stage?: Stage | null
  item: ItemRef
  checkedQty: number
  passedQty: number
  rejectedQty: number
  rejectAction?: RejectAction | null
  scrapItem?: ItemRef | null
  scrapQty: number
  defectReason?: string
  passedLocation: LocationDto
  inspector: UserRef
  note?: string
  createdAt: string
}

export interface AdjustmentLineDto {
  item: ItemRef
  expectedQty: number
  actualQty: number
}

export interface AdjustmentDto extends BaseDoc {
  number: string
  location: LocationDto
  user: UserRef
  note?: string
  lines: AdjustmentLineDto[]
  createdAt: string
}

export interface ProductUnitDto extends BaseDoc {
  serial: string
  item: ItemRef
  operation?: Pick<OperationDto, '_id' | 'number'> | null
  status: ProductUnitStatus
  salesOrder?: { _id: string; number: string } | null
  soldAt?: string | null
  createdAt: string
}

export interface SalesLineDto extends PricedLineDto {
  location: LocationDto
}

export interface PaymentDto {
  _id: string
  amount: number
  method: PaymentMethod
  note?: string
  user: UserRef
  date: string
}

export interface SalesOrderDto extends BaseDoc {
  number: string
  customer: CounterpartyDto
  lead?: { _id: string; title: string } | null
  manager: UserRef
  status: SalesStatus
  lines: SalesLineDto[]
  discount: number
  total: number
  paidAmount: number
  payments: PaymentDto[]
  note?: string
  shippedAt?: string | null
  createdAt: string
}

export interface LeadActivityDto {
  _id: string
  type: ActivityType
  text: string
  dueAt?: string | null
  done: boolean
  user: UserRef
  createdAt: string
}

export interface PhoneCallDto extends BaseDoc {
  phone: string
  contactName?: string
  direction: CallDirection
  startedAt: string
  duration: number
  user: UserRef
  recording: { format: string; bytes: number; duration: number } | null
}

export interface LeadDto extends BaseDoc {
  title: string
  contactName: string
  phone?: string
  company?: string
  source: LeadSource
  status: LeadStatus
  manager?: UserRef | null
  estimatedAmount: number
  productInterest?: string
  note?: string
  lostReason?: string
  customer?: CounterpartyDto | null
  activities: LeadActivityDto[]
  createdAt: string
  updatedAt: string
}

export interface DashboardDto {
  todayProduction: { stage: Stage; qty: number; operations: number }[]
  pendingQc: number
  myPendingTransfers: number
  pendingTransfers: number
  lowStock: { item: ItemRef; qty: number; minStock: number }[]
  finishedStock: { item: ItemRef; qty: number }[]
  salesMonth: { total: number; paid: number; count: number }
  leadsByStatus: { status: LeadStatus; count: number; amount: number }[]
  locationTotals: { location: LocationDto; qtyKg: number; qtyPcs: number; items: number }[]
  recentOperations: OperationDto[]
}
