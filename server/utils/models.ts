import mongoose, { Schema } from 'mongoose'
import {
  ACTIVITY_TYPES,
  AI_PROVIDERS,
  CHANNEL_STATUSES,
  CHANNEL_TYPES,
  CLIENT_KINDS,
  CLIENT_SEGMENTS,
  COUNTERPARTY_TYPES,
  DOC_TYPES,
  ITEM_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LOCATION_TYPES,
  MESSAGE_DIRECTIONS,
  PAYMENT_METHODS,
  PRODUCT_KINDS,
  PRODUCT_UNIT_STATUSES,
  QC_STATUSES,
  REJECT_ACTIONS,
  ROLES,
  SALES_STATUSES,
  TRANSFER_STATUSES,
  UNITS,
} from '../../shared/utils/constants'
import { STAGES } from '../../shared/utils/stages'

const { ObjectId } = Schema.Types
const opts = { timestamps: true, versionKey: false } as const

/** Recompile models on HMR reloads in dev instead of throwing OverwriteModelError. */
function model<T extends Schema>(name: string, schema: T) {
  if (mongoose.models[name]) mongoose.deleteModel(name)
  return mongoose.model(name, schema)
}

const qtyLine = new Schema(
  {
    item: { type: ObjectId, ref: 'Item', required: true },
    qty: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const pricedLine = new Schema(
  {
    item: { type: ObjectId, ref: 'Item', required: true },
    qty: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
)

// ---------------------------------------------------------------- Directories

const counterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false })
export const CounterModel = model('Counter', counterSchema)

const locationSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: LOCATION_TYPES, required: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  opts,
)
export const LocationModel = model('Location', locationSchema)

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    location: { type: ObjectId, ref: 'Location', default: null },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
    /** When the user finished the first-run introduction (null = show it on next login). */
    onboardedAt: { type: Date, default: null },
  },
  opts,
)
export const UserModel = model('User', userSchema)

const bomLineSchema = new Schema(
  {
    component: { type: ObjectId, ref: 'Item', required: true },
    qty: { type: Number, required: true, min: 0 },
    stage: { type: String, enum: STAGES, required: true },
  },
  { _id: false },
)

const itemSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ITEM_TYPES, required: true, index: true },
    unit: { type: String, enum: UNITS, required: true },
    productKind: { type: String, enum: [...PRODUCT_KINDS, null], default: null },
    unitWeightKg: { type: Number, default: null, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 0, min: 0 },
    serialTracked: { type: Boolean, default: false },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
    bom: { type: [bomLineSchema], default: [] },
  },
  opts,
)
itemSchema.index({ name: 'text', code: 'text' })
export const ItemModel = model('Item', itemSchema)

const counterpartySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: COUNTERPARTY_TYPES, required: true },
    kind: { type: String, enum: CLIENT_KINDS, default: 'b2b' },
    segment: { type: String, enum: [...CLIENT_SEGMENTS, null], default: null },
    manager: { type: ObjectId, ref: 'User', default: null, index: true },
    inn: { type: String, trim: true },
    legalName: { type: String, trim: true },
    director: { type: String, trim: true },
    bankName: { type: String, trim: true },
    bankAccount: { type: String, trim: true },
    mfo: { type: String, trim: true },
    oked: { type: String, trim: true },
    vatCode: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    telegram: { type: String, trim: true },
    instagram: { type: String, trim: true },
    region: { type: String, trim: true },
    address: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    contractNumber: { type: String, trim: true },
    contractDate: { type: Date, default: null },
    paymentTermsDays: { type: Number, default: 0, min: 0 },
    creditLimit: { type: Number, default: 0, min: 0 },
    note: { type: String, trim: true },
  },
  opts,
)
counterpartySchema.index({ name: 'text', legalName: 'text' })
export const CounterpartyModel = model('Counterparty', counterpartySchema)

// ---------------------------------------------------------------- Inventory

const stockSchema = new Schema(
  {
    item: { type: ObjectId, ref: 'Item', required: true },
    location: { type: ObjectId, ref: 'Location', required: true },
    qty: { type: Number, required: true, default: 0 },
  },
  { versionKey: false, timestamps: { createdAt: false, updatedAt: true } },
)
stockSchema.index({ item: 1, location: 1 }, { unique: true })
export const StockModel = model('Stock', stockSchema)

const stockMoveSchema = new Schema(
  {
    item: { type: ObjectId, ref: 'Item', required: true },
    location: { type: ObjectId, ref: 'Location', required: true },
    qty: { type: Number, required: true },
    docType: { type: String, enum: DOC_TYPES, required: true },
    docId: { type: ObjectId, required: true },
    docNumber: { type: String, required: true },
    user: { type: ObjectId, ref: 'User' },
    note: { type: String },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
)
stockMoveSchema.index({ createdAt: -1 })
stockMoveSchema.index({ item: 1, location: 1, createdAt: -1 })
stockMoveSchema.index({ docId: 1 })
export const StockMoveModel = model('StockMove', stockMoveSchema)

const receiptSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    supplier: { type: ObjectId, ref: 'Counterparty', default: null },
    location: { type: ObjectId, ref: 'Location', required: true },
    user: { type: ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
    lines: { type: [pricedLine], required: true },
    total: { type: Number, default: 0 },
  },
  opts,
)
export const ReceiptModel = model('Receipt', receiptSchema)

const transferSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    from: { type: ObjectId, ref: 'Location', required: true },
    to: { type: ObjectId, ref: 'Location', required: true },
    sender: { type: ObjectId, ref: 'User', required: true },
    receiver: { type: ObjectId, ref: 'User', default: null },
    acceptedBy: { type: ObjectId, ref: 'User', default: null },
    status: { type: String, enum: TRANSFER_STATUSES, default: 'pending', index: true },
    note: { type: String, trim: true },
    rejectReason: { type: String, trim: true },
    lines: { type: [qtyLine], required: true },
    resolvedAt: { type: Date, default: null },
  },
  opts,
)
export const TransferModel = model('Transfer', transferSchema)

const adjustmentSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    location: { type: ObjectId, ref: 'Location', required: true },
    user: { type: ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
    lines: {
      type: [
        new Schema(
          {
            item: { type: ObjectId, ref: 'Item', required: true },
            expectedQty: { type: Number, required: true },
            actualQty: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
  },
  opts,
)
export const AdjustmentModel = model('Adjustment', adjustmentSchema)

// ---------------------------------------------------------------- Production

const operationSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    stage: { type: String, enum: STAGES, required: true, index: true },
    sourceLocation: { type: ObjectId, ref: 'Location', required: true },
    targetLocation: { type: ObjectId, ref: 'Location', required: true },
    afterQcLocation: { type: ObjectId, ref: 'Location', default: null },
    worker: { type: ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    qcRequired: { type: Boolean, default: false },
    qcStatus: { type: String, enum: QC_STATUSES, default: 'none', index: true },
    inputs: { type: [qtyLine], default: [] },
    outputs: {
      type: [
        new Schema(
          {
            item: { type: ObjectId, ref: 'Item', required: true },
            qty: { type: Number, required: true, min: 0 },
            inspectedQty: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    wastes: { type: [qtyLine], default: [] },
    serials: { type: [String], default: [] },
    handoverTransfer: { type: ObjectId, ref: 'Transfer', default: null },
    note: { type: String, trim: true },
  },
  opts,
)
operationSchema.index({ createdAt: -1 })
export const OperationModel = model('Operation', operationSchema)

const qcInspectionSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    operation: { type: ObjectId, ref: 'Operation', default: null },
    stage: { type: String, enum: [...STAGES, null], default: null },
    item: { type: ObjectId, ref: 'Item', required: true },
    checkedQty: { type: Number, required: true, min: 0 },
    passedQty: { type: Number, required: true, min: 0 },
    rejectedQty: { type: Number, required: true, min: 0 },
    rejectAction: { type: String, enum: [...REJECT_ACTIONS, null], default: null },
    scrapItem: { type: ObjectId, ref: 'Item', default: null },
    scrapQty: { type: Number, default: 0 },
    defectReason: { type: String, trim: true },
    passedLocation: { type: ObjectId, ref: 'Location', required: true },
    inspector: { type: ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
  },
  opts,
)
qcInspectionSchema.index({ createdAt: -1 })
export const QcInspectionModel = model('QcInspection', qcInspectionSchema)

const productUnitSchema = new Schema(
  {
    serial: { type: String, required: true, unique: true },
    item: { type: ObjectId, ref: 'Item', required: true },
    operation: { type: ObjectId, ref: 'Operation', default: null },
    status: { type: String, enum: PRODUCT_UNIT_STATUSES, default: 'in_stock', index: true },
    salesOrder: { type: ObjectId, ref: 'SalesOrder', default: null },
    soldAt: { type: Date, default: null },
  },
  opts,
)
export const ProductUnitModel = model('ProductUnit', productUnitSchema)

// ---------------------------------------------------------------- Sales & CRM

const salesOrderSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    customer: { type: ObjectId, ref: 'Counterparty', required: true },
    lead: { type: ObjectId, ref: 'Lead', default: null },
    manager: { type: ObjectId, ref: 'User', required: true },
    status: { type: String, enum: SALES_STATUSES, default: 'draft', index: true },
    lines: {
      type: [
        new Schema(
          {
            item: { type: ObjectId, ref: 'Item', required: true },
            location: { type: ObjectId, ref: 'Location', required: true },
            qty: { type: Number, required: true, min: 0 },
            price: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    payments: {
      type: [
        new Schema(
          {
            amount: { type: Number, required: true, min: 0 },
            method: { type: String, enum: PAYMENT_METHODS, required: true },
            note: { type: String, trim: true },
            user: { type: ObjectId, ref: 'User', required: true },
            date: { type: Date, default: () => new Date() },
          },
          { versionKey: false },
        ),
      ],
      default: [],
    },
    note: { type: String, trim: true },
    shippedAt: { type: Date, default: null },
  },
  opts,
)
salesOrderSchema.index({ createdAt: -1 })
export const SalesOrderModel = model('SalesOrder', salesOrderSchema)

const leadSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, enum: LEAD_SOURCES, default: 'other' },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    manager: { type: ObjectId, ref: 'User', default: null, index: true },
    estimatedAmount: { type: Number, default: 0, min: 0 },
    productInterest: { type: String, trim: true },
    note: { type: String, trim: true },
    lostReason: { type: String, trim: true },
    customer: { type: ObjectId, ref: 'Counterparty', default: null },
    activities: {
      type: [
        new Schema(
          {
            type: { type: String, enum: ACTIVITY_TYPES, required: true },
            text: { type: String, required: true, trim: true },
            dueAt: { type: Date, default: null },
            done: { type: Boolean, default: false },
            user: { type: ObjectId, ref: 'User', required: true },
          },
          { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
        ),
      ],
      default: [],
    },
  },
  opts,
)
export const LeadModel = model('Lead', leadSchema)

// ---------------------------------------------------------------- Messaging (Telegram / Instagram)

const channelSchema = new Schema(
  {
    type: { type: String, enum: CHANNEL_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    active: { type: Boolean, default: true },
    status: { type: String, enum: CHANNEL_STATUSES, default: 'connected' },
    lastError: { type: String, default: null },
    /** Auto-reply sent to a new contact on their first message (empty = none). */
    greeting: { type: String, trim: true },
    /**
     * Which chats of a personal profile enter the CRM. "new_contacts": only people who are not in the
     * owner's phone contacts (new enquiries) — family and friends stay private. "all": every private chat.
     */
    capture: { type: String, enum: ['new_contacts', 'all'], default: 'new_contacts' },
    /** Personal Telegram account connected over MTProto (phone + code login). */
    telegram: {
      userId: { type: String },
      username: { type: String },
      phone: { type: String },
      displayName: { type: String },
      session: { type: String, select: false }, // encrypted StringSession
    },
    /** Instagram professional account connected with "Instagram Login" (OAuth). */
    instagram: {
      igUserId: { type: String, index: true },
      username: { type: String },
      displayName: { type: String },
      accessToken: { type: String, select: false }, // encrypted long-lived token
      tokenExpiresAt: { type: Date, default: null },
    },
  },
  opts,
)
export const ChannelModel = model('Channel', channelSchema)
export type ChannelDoc = InstanceType<typeof ChannelModel>

const conversationSchema = new Schema(
  {
    channel: { type: ObjectId, ref: 'Channel', required: true },
    channelType: { type: String, enum: CHANNEL_TYPES, required: true },
    externalChatId: { type: String, required: true },
    businessConnectionId: { type: String, default: null },
    /** Telegram access hash of the contact, needed to message them after a restart. */
    accessHash: { type: String, default: null },
    contactName: { type: String, trim: true },
    contactUsername: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    manager: { type: ObjectId, ref: 'User', required: true, index: true },
    lead: { type: ObjectId, ref: 'Lead', default: null },
    customer: { type: ObjectId, ref: 'Counterparty', default: null, index: true },
    lastMessageAt: { type: Date, default: () => new Date(), index: true },
    lastMessageText: { type: String },
    unread: { type: Number, default: 0 },
  },
  opts,
)
conversationSchema.index({ channel: 1, externalChatId: 1 }, { unique: true })
export const ConversationModel = model('Conversation', conversationSchema)

const chatMessageSchema = new Schema(
  {
    conversation: { type: ObjectId, ref: 'Conversation', required: true, index: true },
    direction: { type: String, enum: MESSAGE_DIRECTIONS, required: true },
    text: { type: String, default: '' },
    externalId: { type: String },
    user: { type: ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['received', 'sent', 'failed'], default: 'received' },
    error: { type: String },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
)
chatMessageSchema.index({ conversation: 1, createdAt: 1 })
export const ChatMessageModel = model('ChatMessage', chatMessageSchema)

// ---------------------------------------------------------------- Settings & AI

/** Key/value settings documents (e.g. `_id: 'ai'`, `_id: 'general'`). Secrets never leave the server. */
const settingSchema = new Schema(
  { _id: { type: String, required: true }, value: { type: Schema.Types.Mixed, default: {} } },
  { versionKey: false, timestamps: true, minimize: false },
)
export const SettingModel = model('Setting', settingSchema)

const aiChatSchema = new Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Yangi suhbat' },
    provider: { type: String, enum: AI_PROVIDERS },
    aiModel: { type: String },
    messages: {
      type: [
        new Schema(
          {
            role: { type: String, enum: ['user', 'assistant'], required: true },
            content: { type: String, default: '' },
            files: { type: [{ _id: false, id: String, name: String }], default: [] },
            tools: { type: [String], default: [] },
            error: { type: Boolean, default: false },
          },
          { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
        ),
      ],
      default: [],
    },
  },
  opts,
)
aiChatSchema.index({ user: 1, updatedAt: -1 })
export const AiChatModel = model('AiChat', aiChatSchema)

const generatedFileSchema = new Schema(
  {
    name: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
    user: { type: ObjectId, ref: 'User', required: true },
    chat: { type: ObjectId, ref: 'AiChat', default: null },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
)
export const GeneratedFileModel = model('GeneratedFile', generatedFileSchema)

/** One-time OAuth `state` values (Instagram Login), auto-expired by MongoDB. */
const oauthStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    user: { type: ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { versionKey: false },
)
export const OAuthStateModel = model('OAuthState', oauthStateSchema)
