export interface User {
  id: string;
  username: string;
  role: "admin" | "user";
  pageAccess?: string;
  shopName?: string;
}

export interface IndentItem {
  id: string;
  indentNumber: string;
  serialNumber: number;
  orderDate: string;
  vendorName: string;
  shopName: string;
  orderPreparedBy: string;
  orderSubmittedBy: string;
  itemName: string;
  sizes: string[];
  remarks: string;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "po_generated"
    | "lifting"
    | "received";
  approvalStatus?: "approved" | "rejected";
  transporterName?: string;
  transportCopy?: string;
  qty?: string;
  billCopy?: string;
  driverName?: string;
  driverWhatsapp?: string;
  vehicleNo?: string;
  receiveStatus?: "All Okay" | "Not Okay";
  receivedQty?: string;
  receiveRemarks?: string;
  difference?: string;
  createdAt: string;
  skuCode?: string;
  brandName?: string;
  moq?: number;
  maxLevel?: number;
  closingStock?: number;
  reorderQuantityPcs?: number;
  approved?: string;
  traderName?: string;
  liquor?: string;
  size?: string;
  sizeML?: number;
  bottlesPerCase?: number;
  reorderQuantityBox?: number;
  orderBy?: string;
  poNumber?: string;
  poImageLink?: string;
  liftingData?: {
    transportCopy: string;
    qty: string;
    billCopy: string;
    driverName?: string;
    driverWhatsapp?: string;
    vehicleNo?: string;
    liftingCompletedAt: string;
  };
  sizeQuantities?: { size: string; quantity: number }[];
}

export interface DashboardStats {
  totalIndents: number;
  totalApprovals: number;
  totalPOSent: number;
  totalQty: number;
  totalReceived: number;
  totalPending: number;
  vendorEfficiency: number;
  productEfficiency: number;
  transporterAmount: number;
  transporterPendingAmount: number;
}
