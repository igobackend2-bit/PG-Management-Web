// ─── Auth / User ──────────────────────────────────────────────────────────────
export type UserRole = 'owner' | 'manager' | 'staff';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  ownerId: string;
}

// ─── Branch ───────────────────────────────────────────────────────────────────
export type BranchGender = 'MENS' | 'WOMENS' | 'BOTH';
export type AcType = 'AC' | 'NON-AC' | 'BOTH';

export interface Branch {
  id: string;
  ownerId: string;
  name: string;
  location: string;
  address: string;
  pincode: string;
  gender: BranchGender;
  type: AcType;
  isFoodAvailable: boolean;
  createdAt: string;
}

// ─── Room ─────────────────────────────────────────────────────────────────────
export type RoomType = 'AC' | 'NON-AC';

export interface Room {
  id: string;
  branchId: string;
  number: string;
  type: RoomType;
  capacity: number;
  rent: number;
  perDayRent: number;
  ebReading?: number;
  guests: GuestSummary[];
  fields?: CustomField[];
  selected?: boolean;
}

// ─── Guest / Tenant ───────────────────────────────────────────────────────────
export type KycStatus = 'pending' | 'partial' | 'complete';

export interface GuestSummary {
  guestId: string;
  name: string;
  rentPaid: boolean;
  ebPaid: boolean;
}

export interface Guest {
  guestId: string;
  name: string;
  type: string;
  roomNumber: string;
  rentPaid: boolean;
  ebPaid: boolean;
  doj: string;
  dov?: string;
  phoneNo: string;
  address: string;
  advance: number;
  advancePaid: boolean;
  advanceReturned: boolean;
  kycStatus?: KycStatus;
  dues: Due[];
  fields?: CustomField[];
}

export interface Due {
  id?: string;
  month: string;
  isRent: boolean;
  isEb: boolean;
  amount?: number;
}

// ─── Custom Fields ────────────────────────────────────────────────────────────
export type FieldType = 'text' | 'number' | 'radio' | 'checkbox' | 'dropdown';

export interface FieldDefinition {
  name: string;
  type: FieldType;
  options?: string[];
}

export interface CustomField {
  name: string;
  value: string | number | boolean;
}

// ─── Tickets / Operations ─────────────────────────────────────────────────────
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'plumbing' | 'electrical' | 'cleaning' | 'wifi' | 'food' | 'other';

export interface Ticket {
  id: string;
  branchId: string;
  roomId?: string;
  roomNumber?: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  assignedTo?: string;
  cost?: number;
  createdAt: string;
  resolvedAt?: string;
  createdBy: string;
  updatedBy?: string;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque';

export interface RentRecord {
  id: string;
  tenantId: string;
  month: string; // "YYYY-MM"
  amount: number;
  paidAmount?: number;
  paidAt?: string;
  isPartial: boolean;
  lateFee?: number;
  paymentMethod?: PaymentMethod;
}

export interface Expense {
  id: string;
  branchId: string;
  category: string;
  amount: number;
  vendor?: string;
  description?: string;
  date: string;
  receiptUrl?: string;
  isRecurring: boolean;
}

export interface CashbookEntry {
  id: string;
  branchId: string;
  type: 'in' | 'out';
  amount: number;
  method: PaymentMethod;
  description: string;
  date: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────────
export type StaffRole = 'warden' | 'cook' | 'cleaner' | 'security' | 'maintenance';

export interface StaffMember {
  id: string;
  branchId: string;
  name: string;
  role: StaffRole;
  phone: string;
  salary: number;
  joinedAt: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export type LeadStatus = 'inquiry' | 'visit' | 'negotiation' | 'booking' | 'moved_in' | 'lost';
export type LeadSource = 'justdial' | 'google' | 'referral' | 'walkin' | 'other';

export interface Lead {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  interestedRoomType?: RoomType;
  visitDate?: string;
  notes?: string;
  createdAt: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
