// Google Sheets API Service for Indents
const _isBrowser = typeof window !== "undefined";
const _isLocalhost =
  _isBrowser && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const SCRIPT_URL =
  import.meta.env.DEV || _isLocalhost
    ? "/gas"
    : import.meta.env.VITE_GOOGLE_SCRIPT_URL || "/api/gas";
const SHEET_ID = import.meta.env.VITE_SHEET_ID || "";
const SHEET_NAME = import.meta.env.VITE_SHEET_NAME || "FMS"; // default tab name per user

export interface LoginUser {
  userName: string;
  userId: string;
  password: string;
  role: string;
  pageAccess?: string;
  shopName?: string;
}

export const buildUrl = (action: string = "fetch"): string => {
  if (!SCRIPT_URL) return "";
  try {
    const url = new URL(SCRIPT_URL);
    if (SHEET_ID && !url.searchParams.has("sheetId")) {
      url.searchParams.set("sheetId", SHEET_ID);
    }
    if (SHEET_NAME && !url.searchParams.has("sheet")) {
      url.searchParams.set("sheet", SHEET_NAME);
    }
    if (!url.searchParams.has("action")) {
      url.searchParams.set("action", action);
    }
    return url.toString();
  } catch {
    // Fallback if SCRIPT_URL isn't a fully qualified URL
    let qs: string[] = [];
    if (SHEET_ID) qs.push(`sheetId=${encodeURIComponent(SHEET_ID)}`);
    if (SHEET_NAME) qs.push(`sheet=${encodeURIComponent(SHEET_NAME)}`);
    qs.push(`action=${action}`);
    return `${SCRIPT_URL}${SCRIPT_URL.includes("?") ? "&" : "?"}${qs.join(
      "&"
    )}`;
  }
};

// Function to fetch map of indentNumber -> timestamp (from columns B and A respectively)
const fetchTimestampIndentMap = async (): Promise<Record<string, string>> => {
  if (!SCRIPT_URL) return {};
  try {
    const base = buildUrl("fetch");
    let urlStr = base;
    try {
      const absolute = new URL(
        base,
        _isBrowser ? window.location.origin : "http://localhost"
      );
      absolute.searchParams.set("range", `${SHEET_NAME}!A:B`);
      urlStr = absolute.toString();
    } catch {
      urlStr = `${base}${
        base.includes("?") ? "&" : "?"
      }range=${encodeURIComponent(`${SHEET_NAME}!A:B`)}`;
    }

    const res = await fetch(urlStr, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const rows: any[] = Array.isArray(data)
      ? data
      : data?.values || data?.data || [];
    const map: Record<string, string> = {};
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const a = Array.isArray(r) ? String(r[0] ?? "").trim() : ""; // timestamp
      const b = Array.isArray(r) ? String(r[1] ?? "").trim() : ""; // indent number
      if (!a && !b) continue;
      // skip header row
      if (
        i === 0 &&
        (a.toLowerCase() === "timestamp" || b.toLowerCase().includes("indent"))
      )
        continue;
      if (b) map[b] = a;
    }
    return map;
  } catch (e) {
    console.error("Error fetching timestamp map:", e);
    return {};
  }
};

export interface IndentItem {
  id: string;
  indentNumber: string;
  skuCode: string;
  itemName: string;
  brandName: string;
  moq: number;
  maxLevel: number;
  closingStock: number;
  reorderQuantityPcs: number;
  approved: string;
  traderName: string;
  liquor: string;
  size: string;
  sizeML: number;
  bottlesPerCase: number;
  reorderQuantityBox: number;
  shopName: string;
  orderBy: string;
  // Approval fields
  shopManagerStatus?: string;
  remarks?: string;
  approvalDate?: string;
  approvalName?: string;
  isApproval?: boolean;
  isPO?: boolean;
  isLifting?: boolean;
  isReceived?: boolean;
  plannedDate?: string;
  plannedDate3?: string; // Planned 3 (column W)
  columnX?: string; // Column X for filtering logic
  approvedBy?: string;
  status?: string;
  _rowIndex?: number; // Optimization: Cached row index from sheet
  // Purchase Order fields
  orderDate: string;
  vendorName: string;
  orderPreparedBy: string;
  orderSubmittedBy: string;
  sizes: string[];
  transporterName?: string;
  poNumber?: string;
  poGeneratedAt?: string;
  actualTimestamp1?: string;
  actualTimestamp2?: string;
  actualTimestamp3?: string;
  poCopyLink?: string;
  poQty?: number;
  remarksFrontend?: string;
  plannedAE?: string;
  actualAF?: string;
  plannedAK?: string; // Planned 5 (AK column) - for cross-check
  actualAL?: string; // Actual AL (AL column) - for cross-check
  // NEW FIELD: PO Date from Column X (Actual 3)
  poDate?: string;
  liftingData?: {
    transportCopy?: string;
    billCopy?: string;
    qty?: string;
    liftingCompletedAt?: string;
  };
  // Cross-check fields
  receiveStatus?: "All Okay" | "Not Okay";
  receivedQty?: string;
  difference?: string;
  receiveRemarks?: string;
  pendingReceivingQty?: string; // From column AS
}

// Helper function to check if response is JSON
const isJsonResponse = (response: Response): boolean => {
  const contentType = response.headers.get("content-type");
  return contentType ? contentType.includes("application/json") : false;
};

const getMockData = (): IndentItem[] => {
  return [
    {
      id: "mock-1",
      indentNumber: "IND-001",
      skuCode: "SKU-001",
      itemName: "Sample Item",
      brandName: "Sample Brand",
      moq: 10,
      maxLevel: 100,
      closingStock: 50,
      reorderQuantityPcs: 20,
      approved: "Yes",
      traderName: "Sample Trader",
      liquor: "Vodka",
      size: "750ml",
      sizeML: 750,
      bottlesPerCase: 12,
      reorderQuantityBox: 5,
      shopName: "Main Store",
      orderBy: "John Doe",
      orderDate: new Date().toISOString().split("T")[0],
      vendorName: "Sample Vendor",
      orderPreparedBy: "John Doe",
      orderSubmittedBy: "Jane Smith",
      sizes: ["750ml"],
      poDate: "15/01/2024", // Mock PO Date
      poCopyLink: "https://example.com/po-copy.pdf", // Mock PO Copy
    },
  ];
};

interface IndentService {
  getIndents(): Promise<IndentItem[]>;
  updateIndent(
    id: string,
    updates: Partial<IndentItem>,
    secondaryKeys?: { skuCode?: string; itemName?: string },
    rowIndexOverride?: number
  ): Promise<void>;
  updateIndentsBulk(
    items: {
      id: string;
      updates: Partial<IndentItem>;
      secondaryKeys?: { skuCode?: string; itemName?: string };
      rowIndexOverride?: number;
    }[]
  ): Promise<void>;
  getMasterCompanies(): Promise<string[]>;
  getTransporterNames(): Promise<string[]>;
  getApprovalNames(): Promise<string[]>;
  getLoginUsers(): Promise<LoginUser[]>;
  getColumnAData(): Promise<string[]>;
  getTimestampsByIndent(): Promise<Record<string, string>>;
  getProcessedPOIndentNumbers(): Promise<Set<string>>;
}

// Function to fetch data from column A of the FMS sheet
const fetchColumnAData = async (): Promise<string[]> => {
  if (!SCRIPT_URL) {
    console.warn("SCRIPT_URL is not defined");
    return [];
  }

  try {
    const base = buildUrl("fetch");
    let urlStr = base;
    try {
      const absolute = new URL(
        base,
        _isBrowser ? window.location.origin : "http://localhost"
      );
      absolute.searchParams.set("range", `${SHEET_NAME}!A:A`);
      urlStr = absolute.toString();
    } catch {
      urlStr = `${base}${
        base.includes("?") ? "&" : "?"
      }range=${encodeURIComponent(`${SHEET_NAME}!A:A`)}`;
    }

    const response = await fetch(urlStr, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const out: string[] = [];

    if (Array.isArray(data)) {
      data.forEach((row) => {
        if (Array.isArray(row) && row.length > 0) {
          const v = String(row[0] ?? "").trim();
          if (v) out.push(v);
        } else if (typeof row === "string") {
          const v = row.trim();
          if (v) out.push(v);
        }
      });
    } else if (data && typeof data === "object") {
      const values = (data as any).values || (data as any).data || [];
      values.forEach((row: any) => {
        if (Array.isArray(row) && row.length > 0) {
          const v = String(row[0] ?? "").trim();
          if (v) out.push(v);
        } else if (typeof row === "string") {
          const v = row.trim();
          if (v) out.push(v);
        }
      });
    }

    // Drop header row if present
    if (out.length && out[0].toLowerCase() === "timestamp") {
      out.shift();
    }
    return out;
  } catch (err) {
    console.error("Error fetching column A data:", err);
    return [];
  }
};

// Function to fetch indent numbers from the PO sheet (Column B)
const fetchProcessedPOIndentNumbers = async (): Promise<Set<string>> => {
  if (!SCRIPT_URL) return new Set();

  try {
    const base = buildUrl("fetch");
    let urlStr = base;
    try {
      const absolute = new URL(
        base,
        _isBrowser ? window.location.origin : "http://localhost"
      );
      // PO sheet, Column B is Indent Number
      absolute.searchParams.set("range", "PO!B:B");
      urlStr = absolute.toString();
    } catch {
      urlStr = `${base}${
        base.includes("?") ? "&" : "?"
      }range=${encodeURIComponent("PO!B:B")}`;
    }

    const response = await fetch(urlStr, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return new Set();

    const data = await response.json();
    const set = new Set<string>();

    const rows = Array.isArray(data) ? data : data?.values || data?.data || [];
    rows.forEach((row: any, i: number) => {
      if (i === 0) return; // skip header
      const val = Array.isArray(row) ? String(row[0] ?? "").trim() : String(row ?? "").trim();
      if (val) set.add(val);
    });

    return set;
  } catch (err) {
    console.error("Error fetching processed PO indent numbers:", err);
    return new Set();
  }
};

// -----------------------------------------------------------------
// Cache for Indents
// -----------------------------------------------------------------
let _indentsCache: { data: IndentItem[]; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

export const clearIndentCache = () => {
  _indentsCache = null;
};

export const indentService: IndentService = {
  async getColumnAData(): Promise<string[]> {
    return fetchColumnAData();
  },
  async getTimestampsByIndent(): Promise<Record<string, string>> {
    return fetchTimestampIndentMap();
  },
  async getProcessedPOIndentNumbers(): Promise<Set<string>> {
    return fetchProcessedPOIndentNumbers();
  },
  async getIndents(): Promise<IndentItem[]> {
    // Return from cache if valid
    const now = Date.now();
    if (_indentsCache && now - _indentsCache.timestamp < CACHE_TTL) {
      console.log("Serving indents from cache");
      return _indentsCache.data;
    }

    if (!SCRIPT_URL) {
      console.warn(
        "Using mock data because Google Script URL is not configured"
      );
      return getMockData();
    }

    try {
      const url = buildUrl();
      console.log("Fetching indents from:", url);
      const t0 = performance.now();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("Response status:", response.status, response.statusText);
      const t1 = performance.now();
      console.log("fetch_ms:", Math.round(t1 - t0));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        );
      }

      if (!isJsonResponse(response)) {
        const text = await response.text();
        console.error("Expected JSON but got:", text.substring(0, 200));
        throw new Error(
          "Response is not valid JSON. The server might be returning an error page."
        );
      }

      const data = await response.json();
      const t2 = performance.now();
      console.log("json_ms:", Math.round(t2 - t1));
      console.log(
        "api_payload:",
        Array.isArray(data)
          ? `array_len=${data.length}`
          : typeof data === "object" && data
          ? `keys=${Object.keys(data).slice(0, 10).join(",")}`
          : typeof data
      );

      // Helpers to normalize and extract values regardless of header formatting
      const normalizeKey = (k: string) =>
        k
          .toString()
          .toLowerCase()
          .replace(/[()\s_]/g, "");
      const val = (row: any, keys: string[], def: any = "") => {
        // Direct lookups using several variants
        for (const k of keys) {
          const variants = [
            k,
            k.toLowerCase(),
            k.replace(/\s+/g, ""),
            k.replace(/\s+/g, "_"),
          ];
          for (const c of variants) {
            const val = row[c];
            if (val !== undefined && val !== null) {
              const s = String(val).trim();
              if (s !== "" && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined") {
                return val;
              }
            }
          }
        }
        // Column index fallback e.g. "#19" => use __col19 if present
        for (const k of keys) {
          const m = /^#(\d+)$/.exec(k);
          if (m) {
            const idxKey = `__col${Number(m[1])}`;
            const v = row[idxKey];
            if (v !== undefined && v !== null && v !== "") return v;
          }
        }
        // Normalized lookup
        const lookup = Object.fromEntries(
          Object.entries(row).map(([rk, rv]) => [normalizeKey(rk), rv])
        );
        for (const k of keys) {
          const nk = normalizeKey(k);
          if (
            lookup[nk] !== undefined &&
            lookup[nk] !== null &&
            lookup[nk] !== ""
          )
            return lookup[nk];
        }
        return def;
      };
      const num = (x: any) => {
        const n = Number(String(x).replace(/,/g, "").trim());
        return Number.isFinite(n) ? n : 0;
      };
      const mapItem = (item: any, index: number, realRowIndex?: number): IndentItem => ({
        // Use Indent Number as id when an explicit id is not provided
        id: String(
          item.id ||
            val(
              item,
              [
                "Indent Number",
                "IndentNumber",
                "indent_number",
                "Indent No",
                "IndentNo",
                "indent",
                "#2",
              ],
              `indent-${index}`
            )
        ),
        indentNumber: String(
          val(
            item,
            [
              "Indent Number",
              "IndentNumber",
              "indent_number",
              "Indent No",
              "IndentNo",
              "indent",
              "#2",
            ],
            ""
          )
        ),
        skuCode: String(val(item, ["SKU Code", "SKU", "sku_code", "sku"], "")),
        itemName: String(val(item, ["Item Name", "Item", "item_name"], "")),
        plannedAE: String(
          val(item, ["Planned 4", "planned_4", "plannedAE"], "")
        ),
        actualAF: String(
          val(item, ["Actual 4", "actual_4", "actualAF", "Actual 4"], "")
        ),
        plannedAK: String(
          val(item, ["Planned 5", "planned_5", "plannedAK"], "")
        ),
        actualAL: String(
          val(
            item,
            [
              "Actual 5", // This matches your sheet header
              "Actual AL",
              "actual_al",
              "actualAL",
              "Actual5",
              "actual_5",
            ],
            ""
          )
        ),
        brandName: String(val(item, ["Brand Name", "Brand", "brand_name"], "")),
        moq: num(val(item, ["MOQ", "moq"], 0)),
        maxLevel: num(val(item, ["Max Level", "max_level", "MaxLevel"], 0)),
        closingStock: num(
          val(item, ["Closing Stock", "closing_stock", "Closing", "Stock"], 0)
        ),
        reorderQuantityPcs: num(
          val(
            item,
            [
              "Reorder Quantity (Pcs)",
              "ReorderQuantityPcs",
              "reorder_qty_pcs",
              "Reorder Pcs",
              "ReorderPcs",
            ],
            0
          )
        ),
        approved: String(val(item, ["Approved", "Status", "approved"], "No")),
        traderName: String(
          val(item, ["Trader Name", "Trader", "trader_name"], "")
        ),
        liquor: String(val(item, ["Liquor", "liquor", "LiquorSize"], "")),
        size: String(val(item, ["Size", "size"], "")),
        sizeML: num(
          val(item, ["SIZE (ML)", "Size (ML)", "size_ml", "ML", "ml"], 0)
        ),
        bottlesPerCase: num(
          val(
            item,
            ["Bottles Per Case", "BottlesPerCase", "bpc", "bottles_per_case"],
            0
          )
        ),
        reorderQuantityBox: num(
          val(
            item,
            [
              "Reorder Quantity (Box)",
              "ReorderQuantityBox",
              "reorder_qty_box",
              "Reorder Box",
              "ReorderBox",
            ],
            0
          )
        ),
        shopName: String(val(item, ["Shop Name", "Shop", "shop_name"], "")),
        orderBy: String(val(item, ["Order By", "OrderBy", "order_by"], "")),
        // NEW: PO Date from Column X (Actual 3)
        poDate: String(
          val(
            item,
            [
              "Actual 3",
              "Actual3", 
              "actual_3",
              "PO Date",
              "po_date",
              "poDate",
              "#24", // Column X is index 23 (0-based), so #24
            ],
            ""
          )
        ),
        // Approval fields
        shopManagerStatus: String(
          val(
            item,
            ["Shop Manager Status", "shop_manager_status", "managerStatus"],
            ""
          )
        ),
        remarks: String(
          val(item, ["Remarks", "remarks", "Notes", "notes"], "")
        ),
        approvalDate: String(
          val(
            item,
            [
              "Actual 1",
              "actual1",
              "Actual 1",
              "ActualDate",
              "actual_date",
              "Approval Date",
              "approval_date",
              "approvedOn",
              "APPROVAL_DATE",
              "#19",
            ],
            ""
          )
        ),
        plannedDate: String(
          val(
            item,
            [
              "Planned 1",
              "Planned1",
              "planned_date",
              "Planned Date",
              "Plan Date",
              "PlanDate",
              "Planned",
              "plan_date",
            ],
            ""
          )
        ),
        approvedBy: String(
          val(item, ["Approved By", "approved_by", "approvedBy"], "")
        ),
        status: String(val(item, ["Status", "status", "Approval Status"], "")),
        // Purchase Order fields
        orderDate: String(
          val(
            item,
            ["Order Date", "order_date", "orderDate"],
            new Date().toISOString().split("T")[0]
          )
        ),
        vendorName: String(
          val(item, ["Vendor Name", "vendor_name", "vendorName"], "")
        ),
        orderPreparedBy: String(
          val(
            item,
            ["Order Prepared By", "order_prepared_by", "orderPreparedBy"],
            ""
          )
        ),
        orderSubmittedBy: String(
          val(
            item,
            ["Order Submitted By", "order_submitted_by", "orderSubmittedBy"],
            ""
          )
        ),
        sizes: Array.isArray(val(item, ["Sizes", "sizes"], []))
          ? val(item, ["Sizes", "sizes"], [])
          : String(val(item, ["Sizes", "sizes"], ""))
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s),
        transporterName: String(
          val(
            item,
            [
              "Transport Name", // This matches your sheet header
              "Transporter Name",
              "transporter_name",
              "Trasnport Name",
              "transporterName",
              "Transporter",
              "transport_name",
              "Transport",
            ],
            ""
          )
        ),
        poNumber: String(
          val(item, ["Po No.", "PO Number", "po_number", "poNumber"], "")
        ),
        poGeneratedAt: String(
          val(item, ["PO Generated At", "po_generated_at", "poGeneratedAt"], "")
        ),
        actualTimestamp1: String(
          val(
            item,
            ["Actual Timestamp 1", "actual_timestamp_1", "actualTimestamp1"],
            ""
          )
        ),
        actualTimestamp2: String(
          val(
            item,
            ["Actual Timestamp 2", "actual_timestamp_2", "actualTimestamp2"],
            ""
          )
        ),
        actualTimestamp3: String(
          val(
            item,
            ["Actual Timestamp 3", "actual_timestamp_3", "actualTimestamp3"],
            ""
          )
        ),
        poCopyLink: String(
          val(
            item,
            [
              "PO Copy", 
              "PO Copy Link", 
              "po_copy_link",
              "poCopyLink",
              "#27", // Column AA is index 26 (0-based), so #27
            ],
            ""
          )
        ),
        poQty: num(val(item, ["PO Qty", "po_qty", "poQty", "PO Qty"], 0)),
        remarksFrontend: String(
          val(
            item,
            ["Remarks Frontend", "remarks_frontend", "remarksFrontend"],
            ""
          )
        ),
        receiveStatus: (() => {
          const status = String(
            val(item, ["Receive Status", "receive_status", "receiveStatus"], "")
          );
          return status === "All Okay" || status === "Not Okay"
            ? status
            : undefined;
        })(),
        receivedQty: String(
          val(item, ["Received Qty", "received_qty", "receivedQty"], "")
        ),
        difference: String(val(item, ["Difference", "difference", "#41"], "")), // Column AO
        receiveRemarks: String(
          val(
            item,
            [
              "Remark2", // Specific header name
              "Receive Remarks",
              "receive_remarks",
              "receiveRemarks",
              "#42", // Column AP
            ],
            ""
          )
        ),
        pendingReceivingQty: String(
          val(
            item,
            [
              "Pending Receiving Qty",
              "pending_receiving_qty",
              "pendingReceivingQty",
              "AS", // Column AS
              "#45", // Column number reference
            ],
            ""
          )
        ),
        liftingData: {
          transportCopy: String(
            val(item, ["Transport Copy", "transport_copy", "TransportCopy"], "")
          ),
          billCopy: String(
            val(item, ["Bill Copy", "bill_copy", "BillCopy"], "")
          ),
          qty: String(
            val(item, ["QTY", "Lifting Qty", "lifting_qty", "Qty"], "")
          ),
          liftingCompletedAt: String(
            val(
              item,
              [
                "Lifting Completed At",
                "lifting_completed_at",
                "liftingCompletedAt",
              ],
              ""
            )
          ),
        },
        _rowIndex: realRowIndex,
      });

      // Normalize response into an array of row objects
      let rows: any[] | null = null;
      if (Array.isArray(data)) {
        rows = data;
      } else if (data && Array.isArray(data.indents)) {
        rows = data.indents;
      } else if (data && Array.isArray(data.rows)) {
        const rr = data.rows as any[];
        if (Array.isArray(rr[0])) {
          const [header, ...rest] = rr as any[];
          if (Array.isArray(header)) {
            rows = rest.map((r: any[]) =>
              Object.fromEntries(header.map((h: any, i: number) => [h, r[i]]))
            );
          }
        } else {
          rows = rr;
        }
      } else if (data && Array.isArray(data.data)) {
        console.log("Raw sheet data length:", data.data.length);
        const dd = data.data as any[];
        // Detect header row by scanning first few rows for known header names
        // Make headerRowIdx available for row index calculation
        var headerRowIdx_SCOPED = -1; 

        const normalizeKey = (k: string) =>
          k
            .toString()
            .toLowerCase()
            .replace(/[()\s_]/g, "");
        let headerRowIdx = -1; // Declare here to be available in this scope
        for (let i = 0; i < Math.min(dd.length, 10); i++) {
          const row = dd[i];
          if (!Array.isArray(row)) continue;
          const norm = row.map((c: any) => normalizeKey(String(c ?? "")));
          if (
            norm.includes("indentnumber") ||
            norm.includes("indentno") ||
            norm.includes("indent") ||
            norm.includes("skucode") ||
            norm.includes("sku") ||
            norm.includes("itemname")
          ) {
            headerRowIdx = i;
            headerRowIdx_SCOPED = i;
            break;
          }
        }
        if (headerRowIdx < 0) headerRowIdx = 0; // fallback to first row
        const header = dd[headerRowIdx] as any[];
        console.log("Detected header row index:", headerRowIdx, header);
        const dataRows = dd.slice(headerRowIdx + 1);
        console.log("Data rows count:", dataRows.length);
        if (Array.isArray(header)) {
          rows = dataRows
            .filter(
              (r: any[]) =>
                Array.isArray(r) &&
                r.some(
                  (cell: any) =>
                    cell !== "" && cell !== null && cell !== undefined
                )
            )
            .map((r: any[]) => {
              const base = Object.fromEntries(
                header.map((h: any, i: number) => [h, r[i]])
              );
              const numeric = Object.fromEntries(
                r.map((cell: any, i: number) => [`__col${i + 1}`, cell])
              );
              return { ...base, ...numeric };
            });
        }
      } else if (data && Array.isArray((data as any).values)) {
        const values = (data as any).values as any[];
        const [header, ...rest] = values;
        if (Array.isArray(header)) {
          rows = rest.map((r: any[]) => {
            const base = Object.fromEntries(
              header.map((h: any, i: number) => [h, r[i]])
            );
            const numeric = Object.fromEntries(
              r.map((cell: any, i: number) => [`__col${i + 1}`, cell])
            );
            return { ...base, ...numeric };
          });
        }
      }

      if (rows && Array.isArray(rows) && rows.length > 0) {
        console.log("rows_count:", rows.length);
        // Determine start row for index calculation
        // If we found a header row index in 'data' scanning, we use that.
        // The headerRowIdx was calculated inside the block dealing with 'data.data'.
        // However, 'rows' might be derived differently.
        // We'll approximate: if we detected headerRowIdx, data starts at headerRowIdx + 2 (1-based).
        // If not explicit, assume row 2 (header at 1).
        

        
        // Try to recover headerRowIdx from the scope if possible, or re-detect quickly if rows came from raw data
        // Since we can't easily access the scoped headerRowIdx variable from the if/else blocks above without refactoring,
        // we will map 'mapItem' without it first, or we can trust the 'index' if the data is sequential.
        // A safer way is to just use the index passed to map, assuming 'rows' contains contagious data starting after header.
        
        // Refined approach: We found 'headerRowIdx' in the 'data.data' block.
        // But scope prevents access. We'll rely on the caller or just assume basic structure.
        // Actually, let's just use the index + 2 assumption for now as most valid assumption.
        
        const tMapStart = performance.now();
        // Recalculate start offset if possible.
        // For now, allow mapItem to accept a 3rd arg if we can pass it.
        // Re-defining mapItem behavior:
        const mapped = rows.map((r, i) => mapItem(r, i, (headerRowIdx_SCOPED > 0 ? headerRowIdx_SCOPED : 0) + i + 2));
        const t3 = performance.now();
        console.log(
          "map_ms:",
          Math.round(t3 - tMapStart),
          "total_ms:",
          Math.round(t3 - t0)
        );
        
        // Log sample data to verify PO Date and PO Copy are being mapped
        if (mapped.length > 0) {
          console.log("🔍 Sample mapped item with PO data:", {
            indentNumber: mapped[0].indentNumber,
            poDate: mapped[0].poDate,
            poCopyLink: mapped[0].poCopyLink,
            transporterName: mapped[0].transporterName,
            poNumber: mapped[0].poNumber,
            poQty: mapped[0].poQty
          });
        }
        
        // Update cache
        _indentsCache = { data: mapped, timestamp: Date.now() };
        
        return mapped;
      }

      // If script is reachable but returns only a status message
      if (
        (data as any).status === "ready" &&
        (data as any).message === "Google Apps Script is running"
      ) {
        console.warn(
          "Google Apps Script is running but returned no data. Using mock data instead."
        );
        return getMockData();
      }

      console.warn(
        "Unexpected response format or empty data, using mock data. Response was:",
        data
      );
      return getMockData();
    } catch (error) {
      console.error("Error in getIndents:", error);
      // Return mock data for development
      if (import.meta.env.DEV) {
        console.warn("Using mock data due to error");
        return getMockData();
      }
      throw error;
    }
  },

  async updateIndent(
    id: string,
    updates: Partial<IndentItem>,
    secondaryKeys?: { skuCode?: string; itemName?: string },
    rowIndexOverride?: number
  ): Promise<void> {
    if (!SCRIPT_URL) {
      console.warn("Update not supported in mock mode");
      return;
    }

    try {
      // Shared state variables
      let rowIndex = -1;
      let colApproval = -1;
      let colStatus = -1;
      let colRemarks = -1;
      let colApprovalName = -1;

      // Define column search patterns
      const patApproval = ["Actual 1", "actual1", "Approval Date", "approval_date", "approvedOn", "APPROVAL_DATE"];
      const patStatus = ["Shop Manager Status", "shop_manager_status", "managerStatus"];
      const patRemarks = ["Remarks", "remarks", "Notes", "notes"];
      const patApprovalName = ["Approval Name", "approval_name", "ApprovalName", "APPROVAL_NAME"];

      // Helper to find column index in a header array
      const normalizeKey = (k: string) => k.toString().toLowerCase().replace(/[()\s_]/g, "");
      const findColInHeader = (headerArr: any[], alts: string[]) => {
          const hn = headerArr.map(h => normalizeKey(String(h??"")));
          for(const a of alts) {
              const idx = hn.indexOf(normalizeKey(a));
              if(idx !== -1) return idx;
          }
          return -1;
      };
      
      if (rowIndexOverride && rowIndexOverride > 0) {
        // --- OPTIMIZED PATH ---
        rowIndex = rowIndexOverride;
        console.log("Using cached row index:", rowIndex);
        
        // Fetch only headers to map columns (very fast)
        const headerUrl = buildUrl("fetch") + "&range=" + encodeURIComponent(`${SHEET_NAME}!1:1`);
        const res = await fetch(headerUrl);
        let headerRow: any[] = [];
        
        if (res.ok) {
           const json = await res.json();
           headerRow = (Array.isArray(json) ? json[0] : (json.values?.[0] || json.data?.[0])) || [];
        }
        
        if (headerRow.length > 0) {
            colApproval = findColInHeader(headerRow, patApproval);
            colStatus = findColInHeader(headerRow, patStatus);
            colRemarks = findColInHeader(headerRow, patRemarks);
            colApprovalName = findColInHeader(headerRow, patApprovalName);
        } else {
            console.warn("Could not fetch headers, utilizing default indices.");
            colApproval = 18; // S
            colStatus = 29; // AD
            colApprovalName = 42; // AQ
        }

      } else {
        // --- FALLBACK FULL SCAN PATH ---
        console.log("Updating indent with full scan at:", buildUrl("fetch"));
        const fetchUrl = buildUrl("fetch");
        const res = await fetch(fetchUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
            mode: "cors",
            cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch sheet data for update");
        const txt = await res.text();
        let values: any[] = [];
        try {
            const json = JSON.parse(txt);
            if (Array.isArray(json)) values = json;
            else if (json && Array.isArray(json.data)) values = json.data;
            else if (json && Array.isArray(json.values)) values = json.values;
        } catch (_) { throw new Error("Invalid response format"); }
        
        if (!Array.isArray(values) || values.length === 0) throw new Error("No data found");

        // Find header row
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(values.length, 15); i++) {
            const row = values[i];
            if (Array.isArray(row)) {
                const norm = row.map((c: any) => normalizeKey(String(c ?? "")));
                if (norm.includes("indentnumber") || norm.includes("indentno")) {
                   headerRowIdx = i;
                   break;
                }
            }
        }
        if (headerRowIdx < 0) headerRowIdx = 0; 
        const header = values[headerRowIdx] as any[];
        
        // Map Columns
        colApproval = findColInHeader(header, patApproval);
        colStatus = findColInHeader(header, patStatus);
        colRemarks = findColInHeader(header, patRemarks);
        colApprovalName = findColInHeader(header, patApprovalName);
        
        // Find Row
        const colIndent = findColInHeader(header, ["Indent Number", "IndentNumber", "indent"]);
        const colSku = findColInHeader(header, ["SKU Code", "SKU", "sku"]);
        const colItemName = findColInHeader(header, ["Item Name", "Item", "item_name"]);

        const dataStart = headerRowIdx + 1;
        for (let i = dataStart; i < values.length; i++) {
             const row = values[i];
             const cell = Array.isArray(row) ? (row[colIndent >= 0 ? colIndent : 1] || row[0]) : null;
             
             let match = String(cell ?? "").trim() === String(id).trim();

             if (match && secondaryKeys) {
                if (secondaryKeys.skuCode && colSku >= 0) {
                    const valSku = String(row[colSku] ?? "").trim();
                    if (valSku !== secondaryKeys.skuCode.trim()) match = false;
                }
                if (match && secondaryKeys.itemName && colItemName >= 0) {
                    const valItem = String(row[colItemName] ?? "").trim().toLowerCase();
                    const searchItem = secondaryKeys.itemName.trim().toLowerCase();
                    if (valItem !== searchItem) match = false;
                }
             }

             if (match) {
                rowIndex = i + 1;
                break;
             }
        }
      }

      if (rowIndex < 1) throw new Error("Indent not found or row index invalid");

      // Update approval fields using markdeleted to FMS sheet
      if (
        !updates.isPO &&
        !updates.isLifting &&
        !updates.isReceived
      ) {

        // Update approval fields using markdeleted to FMS sheet
        const markUrl = buildUrl("markdeleted");
        const setCell = async (colIdx0: number, value: any, label: string) => {
          if (colIdx0 === undefined || colIdx0 === null || colIdx0 < 0) return;
          if (value === undefined) return;
          const params = new URLSearchParams();
          params.set("action", "markdeleted");
          params.set("sheet", SHEET_NAME);
          if (SHEET_ID) params.set("sheetId", SHEET_ID);
          params.set("rowIndex", String(rowIndex));
          params.set("columnIndex", String(colIdx0 + 1)); // 1-based
          params.set("value", String(value));
          const r = await fetch(markUrl, {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
              Accept: "application/json",
            },
            body: params.toString(),
            mode: "cors",
          });
          if (!r.ok) {
            const t = await r.text();
            console.error(`markdeleted failed for ${label}:`, t);
            throw new Error(`markdeleted failed for ${label}`);
          }
          console.log(
            `✅ Updated ${label} at row ${rowIndex}, col ${colIdx0 + 1}`
          );
        };

        // Update approval fields to FMS sheet
        await setCell(colApproval, updates.approvalDate, "Approval Date");
        await setCell(
          colStatus,
          updates.shopManagerStatus,
          "Shop Manager Status"
        );
        await setCell(colRemarks, updates.remarks, "Remarks");
        // Log Approval Name and column info
        console.log("Approval Name to save:", updates.approvalName);
        console.log(
          "Found Approval Name column index (0-based):",
          colApprovalName
        );

        // Update Approval Name in the found column or fallback to column AQ (1-based column 43)
        const approvalNameCol = colApprovalName >= 0 ? colApprovalName : 42; // Fallback to column AQ if not found
        console.log(
          "Using column index (0-based):",
          approvalNameCol,
          "(Column",
          String.fromCharCode(65 + approvalNameCol) + ")"
        );

        await setCell(approvalNameCol, updates.approvalName, "Approval Name");
        console.log(
          "Approval Name saved successfully to column",
          String.fromCharCode(65 + approvalNameCol)
        );

        console.log("✅ Approval fields updated in FMS sheet");
      }

      // Handle approval insertion to "Approval" sheet
      if (updates.isApproval) {
        console.log("Inserting approval record to Approval sheet");
        const approvalUrl = new URL(
          SCRIPT_URL,
          typeof window !== "undefined" ? window.location.origin : undefined
        );
        approvalUrl.searchParams.set("action", "insert");
        approvalUrl.searchParams.set("sheet", "Approval");
        if (SHEET_ID) approvalUrl.searchParams.set("sheetId", SHEET_ID);
        const approvalRowData = [
          new Date().toISOString().slice(0, 19).replace("T", " "), // Timestamp auto generated col A
          id, // Indent Number col B
          updates.shopName || "", // Shop Name col C
          updates.shopManagerStatus || "", // Shop Manager Status col D
          updates.remarks || "", // Remarks col E
          updates.approvalName || "", // Approval Name col F
        ];
        console.log(
          "Approval Name being saved to Approval sheet:",
          updates.approvalName
        );
        console.log("Approval rowData being sent:", approvalRowData);
        approvalUrl.searchParams.set(
          "rowData",
          JSON.stringify(approvalRowData)
        );

        const approvalResponse = await fetch(approvalUrl.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        });

        if (!approvalResponse.ok) {
          const errTxt = await approvalResponse.text();
          console.error("Approval insert error:", errTxt);
          throw new Error(
            `Approval insert failed: HTTP ${approvalResponse.status}`
          );
        } else {
          console.log("✅ Approval record inserted to Approval sheet");
        }
      }

      // Handle PO insertion to "PO" sheet
      if (updates.isPO) {
        console.log("Inserting PO record to PO sheet");
        const poUrl = new URL(
          SCRIPT_URL,
          typeof window !== "undefined" ? window.location.origin : undefined
        );
        poUrl.searchParams.set("action", "insert");
        poUrl.searchParams.set("sheet", "PO");
        if (SHEET_ID) poUrl.searchParams.set("sheetId", SHEET_ID);
        const poRowData = [
          new Date().toISOString().slice(0, 19).replace("T", " "), // Timestamp col A
          id, // Indent Number col B
          updates.shopName || "", // Shop Name col C
          updates.transporterName || "", // Transport Name col D
          updates.poCopyLink || "", // PO Copy col E
          updates.poNumber || "", // Po No. col F
          updates.poQty || "", // PO Qty col G
          updates.remarksFrontend || "", // Remarks1 col H
        ];
        console.log("PO rowData being sent:", poRowData);
        poUrl.searchParams.set("rowData", JSON.stringify(poRowData));

        const poResponse = await fetch(poUrl.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        });

        console.log("PO insert response status:", poResponse.status);
        console.log("PO insert response ok:", poResponse.ok);

        const result = await poResponse.json();
        console.log("PO insert JSON result:", result);

        if (!poResponse.ok || !result.success) {
          const errorMsg = result.error || `HTTP ${poResponse.status}`;
          console.error("PO insert error:", errorMsg);
          throw new Error(`PO insert failed: ${errorMsg}`);
        } else {
          console.log("✅ PO record inserted to PO sheet");
        }
      }

      // Handle lifting insertion to "Lift" sheet
      if (updates.isLifting) {
        console.log("Inserting lifting record to Lift sheet");
        const liftUrl = new URL(
          SCRIPT_URL,
          typeof window !== "undefined" ? window.location.origin : undefined
        );
        liftUrl.searchParams.set("action", "insert");
        liftUrl.searchParams.set("sheet", "Lift");
        if (SHEET_ID) liftUrl.searchParams.set("sheetId", SHEET_ID);
        const liftRowData = [
          new Date().toISOString().slice(0, 19).replace("T", " "), // Timestamp col A
          id, // Indent Number col B
          updates.shopName || "", // Shop Name col C
          updates.liftingData?.transportCopy || "", // Transport Copy col D
          updates.liftingData?.qty || "", // QTY col E
          updates.liftingData?.billCopy || "", // Bill Copy col F
        ];
        console.log("Lift rowData being sent:", liftRowData);
        liftUrl.searchParams.set("rowData", JSON.stringify(liftRowData));

        const liftResponse = await fetch(liftUrl.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        });

        console.log("Lift insert response status:", liftResponse.status);
        console.log("Lift insert response ok:", liftResponse.ok);

        const liftResult = await liftResponse.json();
        console.log("Lift insert JSON result:", liftResult);

        if (!liftResponse.ok || !liftResult.success) {
          const errorMsg = liftResult.error || `HTTP ${liftResponse.status}`;
          console.error("Lift insert error:", errorMsg);
          throw new Error(`Lift insert failed: ${errorMsg}`);
        } else {
          console.log("✅ Lifting record inserted to Lift sheet");
        }
      }

      // Handle receiving insertion to "Received" sheet
      if (updates.isReceived) {
        console.log("Inserting receiving record to Received sheet");
        const receivedUrl = new URL(
          SCRIPT_URL,
          typeof window !== "undefined" ? window.location.origin : undefined
        );
        receivedUrl.searchParams.set("action", "insert");
        receivedUrl.searchParams.set("sheet", "Received");
        if (SHEET_ID) receivedUrl.searchParams.set("sheetId", SHEET_ID);
        const receivedRowData = [
          new Date().toISOString().slice(0, 19).replace("T", " "), // Timestamp col A
          id, // Indent Number col B
          updates.shopName || "", // Shop Name col C
          updates.receivedQty || "", // Received Qty col D
          updates.difference || "", // Diff col E
          updates.receiveRemarks || "", // Remark2 col F
        ];
        console.log("Received rowData being sent:", receivedRowData);
        receivedUrl.searchParams.set(
          "rowData",
          JSON.stringify(receivedRowData)
        );

        const receivedResponse = await fetch(receivedUrl.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        });

        console.log(
          "Received insert response status:",
          receivedResponse.status
        );
        console.log("Received insert response ok:", receivedResponse.ok);

        const receivedResult = await receivedResponse.json();
        console.log("Received insert JSON result:", receivedResult);

        if (!receivedResponse.ok || !receivedResult.success) {
          const errorMsg =
            receivedResult.error || `HTTP ${receivedResponse.status}`;
          console.error("Received insert error:", errorMsg);
          throw new Error(`Received insert failed: ${errorMsg}`);
        } else {
          console.log("✅ Receiving record inserted to Received sheet");
        }
      }

      // Always run fallback logic to ensure PO fields are updated (except for PO, lifting, and receiving submissions)
      if (!updates.isPO && !updates.isLifting && !updates.isReceived) {
        console.log("🔄 Running fallback update for PO fields...");
        try {
          const normalizeKey = (k: string) =>
            k
              .toString()
              .toLowerCase()
              .replace(/[()\s_]/g, "");

          // Resolve header row index, target row index, and column indexes
          const resolvePositions = async () => {
            const fetchUrl = buildUrl("fetch");
            const res = await fetch(fetchUrl, {
              method: "GET",
              headers: { Accept: "application/json" },
              mode: "cors",
              cache: "no-store",
            });
            if (!res.ok) return null;
            const txt = await res.text();
            let values: any[] = [];
            try {
              const json = JSON.parse(txt);
              if (Array.isArray(json)) values = json;
              else if (json && Array.isArray(json.data)) values = json.data;
              else if (json && Array.isArray(json.values)) values = json.values;
            } catch (_) {
              return null; // not JSON
            }
            if (!Array.isArray(values) || values.length === 0) return null;

            // Find header row by looking for an 'Indent Number' column
            let headerRowIdx = -1;
            for (let i = 0; i < Math.min(values.length, 15); i++) {
              const row = values[i];
              if (!Array.isArray(row)) continue;
              const norm = row.map((c: any) => normalizeKey(String(c ?? "")));
              if (
                norm.includes("indentnumber") ||
                norm.includes("indentno") ||
                norm.includes("indent")
              ) {
                headerRowIdx = i;
                break;
              }
            }
            if (headerRowIdx < 0) headerRowIdx = 0; // best effort
            const header = values[headerRowIdx] as any[];
            const dataStart = headerRowIdx + 1;

            // Determine column index for 'Indent Number'
            const headerNorm = header.map((h: any) =>
              normalizeKey(String(h ?? ""))
            );
            const findCol = (alts: string[]) => {
              for (const a of alts) {
                const idx = headerNorm.indexOf(normalizeKey(a));
                if (idx !== -1) return idx;
              }
              return -1;
            };
            const colIndent = findCol([
              "Indent Number",
              "IndentNumber",
              "indent_number",
              "Indent No",
              "IndentNo",
              "indent",
            ]);

            // Secondary key columns
            const colSku = findCol(["SKU Code", "SKU", "sku_code", "sku"]);
            const colItemName = findCol(["Item Name", "Item", "item_name"]);

            // Find target row by matching the 'Indent Number' column with id AND secondary keys
            let rowIndex = -1; // 1-based index expected by GAS
            for (let i = dataStart; i < values.length; i++) {
              const row = values[i];
              const cell =
                Array.isArray(row) && colIndent >= 0
                  ? row[colIndent]
                  : row?.[0];

              let match = Array.isArray(row) && String(cell ?? "").trim() === String(id).trim();

              if (match && secondaryKeys) {
                 if (secondaryKeys.skuCode && colSku >= 0) {
                     const valSku = String(row[colSku] ?? "").trim();
                     if (valSku !== secondaryKeys.skuCode.trim()) match = false;
                 }
                 if (match && secondaryKeys.itemName && colItemName >= 0) {
                     const valItem = String(row[colItemName] ?? "").trim().toLowerCase();
                     const searchItem = secondaryKeys.itemName.trim().toLowerCase();
                     if (valItem !== searchItem) match = false;
                 }
              }

              if (match) {
                rowIndex = i + 1;
                break;
              }
            }

            const colApproval = findCol([
              "Actual 1",
              "actual1",
              "Approval Date",
              "approval_date",
              "approvedOn",
              "APPROVAL_DATE",
            ]);
            const colStatus = findCol([
              "Shop Manager Status",
              "shop_manager_status",
              "managerStatus",
            ]);
            const colRemarks = findCol([
              "Remarks",
              "remarks",
              "Notes",
              "notes",
            ]);

            // Add PO field column mappings
            const colActualTimestamp1 = findCol([
              "Actual Timestamp 1",
              "actual_timestamp_1",
              "Actual 3", // Column X
            ]);
            const colTransportName = findCol([
              "Transport Name",
              "transport_name",
              "transporterName", // Column Z
            ]);
            const colPOCopyLink = findCol([
              "PO Copy",
              "PO Copy Link",
              "po_copy_link",
              "poCopyLink", // Column AA
            ]);
            const colPONumber = findCol([
              "Po No.",
              "PO Number",
              "po_number",
              "poNumber", // Column AB
            ]);
            const colPOQty = findCol([
              "PO Qty",
              "po_qty",
              "poQty", // Column AC
            ]);
            const colRemarksFrontend = findCol([
              "Remarks1",
              "Remarks",
              "Remarks Frontend",
              "remarks_frontend",
              "remarksFrontend", // Column AD
            ]);

            // Add lifting field column mappings
            const colActual4AF = findCol([
              "Actual 4",
              "Actual4",
              "actual_4",
              "Actual AF",
              "actualAF",
            ]);
            const colActualAL = findCol([
              "Actual 5",
              "Actual AL",
              "actual_al",
              "actualAL",
            ]);
            const colTransportCopy = findCol([
              "Transport Copy",
              "transport_copy",
              "TransportCopy", // Column AI
            ]);
            const colLiftingQty = findCol([
              "QTY",
              "Lifting Qty",
              "lifting_qty",
              "Qty", // Column AJ
            ]);
            const colBillCopy = findCol([
              "Bill Copy",
              "bill_copy",
              "BillCopy", // Column AK
            ]);

            // Add cross-check field column mappings
            const colPlannedAK = findCol([
              "Planned 5",
              "planned_5",
              "plannedAK",
            ]);
            const colReceiveStatus = findCol([
              "Receive Status",
              "receive_status",
              "receiveStatus",
            ]);
            const colReceivedQty = findCol([
              "Received Qty",
              "received_qty",
              "receivedQty",
            ]);
            const colDifference = findCol(["Diff", "Difference", "difference"]);
            const colReceiveRemarks = findCol([
              "Remark2",
              "Receive Remarks",
              "receive_remarks",
              "receiveRemarks",
            ]);

            return {
              rowIndex,
              colApproval,
              colStatus,
              colRemarks,
              colActualTimestamp1,
              colTransportName,
              colPOCopyLink,
              colPONumber,
              colPOQty,
              colRemarksFrontend,
              colActual4AF,
              colActualAL,
              colTransportCopy,
              colLiftingQty,
              colBillCopy,
              colPlannedAK,
              colReceiveStatus,
              colReceivedQty,
              colDifference,
              colReceiveRemarks,
            };
          };

          const pos = await resolvePositions();
          console.log("Resolved positions for PO update:", pos);
          console.log("Column indices found:", {
            colActual4AF: pos!.colActual4AF,
            colActualAL: pos!.colActualAL,
            colActual4AF_Column:
              pos!.colActual4AF >= 0
                ? String.fromCharCode(65 + pos!.colActual4AF)
                : "Not found",
            colActualAL_Column:
              pos!.colActualAL >= 0
                ? String.fromCharCode(65 + pos!.colActualAL)
                : "Not found",
          });
          if (pos && pos.rowIndex > 1) {
            // Update PO fields using markdeleted
            const markUrl = buildUrl("markdeleted");
            const setPOCell = async (
              colIdx0: number,
              value: any,
              label: string
            ) => {
              if (colIdx0 === undefined || colIdx0 === null || colIdx0 < 0)
                return;
              if (value === undefined) return;
              const params = new URLSearchParams();
              params.set("action", "markdeleted");
              params.set("sheet", SHEET_NAME);
              if (SHEET_ID) params.set("sheetId", SHEET_ID);
              params.set("rowIndex", String(pos.rowIndex));
              params.set("columnIndex", String(colIdx0 + 1)); // 1-based
              params.set("value", String(value));
              const r = await fetch(markUrl, {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                  Accept: "application/json",
                },
                body: params.toString(),
                mode: "cors",
              });
              if (!r.ok) {
                const t = await r.text();
                console.error(`markdeleted failed for ${label}:`, t);
                throw new Error(`markdeleted failed for ${label}`);
              }
              console.log(
                `✅ Updated ${label} at row ${pos.rowIndex}, col ${colIdx0 + 1}`
              );
            };

            // Parallelize all updates for faster processing
            await Promise.all([
              setPOCell(pos.colActualTimestamp1, updates.actualTimestamp1, "Actual 3"),
              setPOCell(pos.colTransportName, updates.transporterName, "Transport Name"),
              setPOCell(pos.colPOCopyLink, updates.poCopyLink, "PO Copy"),
              setPOCell(pos.colPONumber, updates.poNumber, "Po No."),
              setPOCell(pos.colPOQty, updates.poQty, "PO Qty"),
              setPOCell(pos.colRemarksFrontend, updates.remarksFrontend, "Remarks1"),
              // Lifting fields
              setPOCell(pos.colActual4AF, updates.actualAF, "Actual 4"),
              setPOCell(pos.colTransportCopy, updates.liftingData?.transportCopy, "Transport Copy"),
              setPOCell(pos.colLiftingQty, updates.liftingData?.qty, "Lifting Qty"),
              setPOCell(pos.colBillCopy, updates.liftingData?.billCopy, "Bill Copy"),
              // Cross-check fields
              setPOCell(pos.colPlannedAK, updates.plannedAK, "Planned 5"),
              setPOCell(pos.colActualAL, updates.actualAL, "Actual 5"),
              setPOCell(pos.colReceiveStatus, updates.receiveStatus, "Receive Status"),
              setPOCell(pos.colReceivedQty, updates.receivedQty, "Received Qty"),
              setPOCell(pos.colDifference, updates.difference, "Difference"),
              setPOCell(pos.colReceiveRemarks, updates.receiveRemarks, "Receive Remarks")
            ]);

            console.log(
              "✅ PO and related fields updated via markdeleted endpoints"
            );
          } else {
            console.warn(
              "Could not resolve positions for PO update; some fields may not be saved"
            );
          }
        } catch (fallbackErr) {
          console.error("PO field update failed:", fallbackErr);
          // Don't throw error here - main update might have succeeded
        }
      }
      // Clear cache after successful update
      clearIndentCache();
    } catch (error) {
      console.error("Error in updateIndent:", error);
      throw error;
    }
  },

  async updateIndentsBulk(
    items: {
      id: string;
      updates: Partial<IndentItem>;
      secondaryKeys?: { skuCode?: string; itemName?: string };
      rowIndexOverride?: number;
    }[]
  ): Promise<void> {
    if (!SCRIPT_URL) return;

    try {
      // 1. Single Fetch for Header mapping (Optimization)
      const headerUrl =
        buildUrl("fetch") + "&range=" + encodeURIComponent(`${SHEET_NAME}!1:1`);
      const res = await fetch(headerUrl);
      let headerRow: any[] = [];
      if (res.ok) {
        const json = await res.json();
        headerRow =
          (Array.isArray(json)
            ? json[0]
            : json.values?.[0] || json.data?.[0]) || [];
      }

      const normalizeKey = (k: string) =>
        k.toString().toLowerCase().replace(/[()\s_]/g, "");
      const findColInHeader = (headerArr: any[], alts: string[]) => {
        const hn = headerArr.map((h) => normalizeKey(String(h ?? "")));
        for (const a of alts) {
          const idx = hn.indexOf(normalizeKey(a));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const patApproval = [
        "Actual 1",
        "actual1",
        "Approval Date",
        "approval_date",
        "approvedOn",
        "APPROVAL_DATE",
      ];
      const patStatus = [
        "Shop Manager Status",
        "shop_manager_status",
        "managerStatus",
      ];
      const patRemarks = ["Remarks", "remarks", "Notes", "notes"];
      const patApprovalName = [
        "Approval Name",
        "approval_name",
        "ApprovalName",
        "APPROVAL_NAME",
      ];

      const colApproval = findColInHeader(headerRow, patApproval);
      const colStatus = findColInHeader(headerRow, patStatus);
      const colRemarks = findColInHeader(headerRow, patRemarks);
      const colApprovalName = findColInHeader(headerRow, patApprovalName);

      const allOps: Promise<any>[] = [];

      for (const item of items) {
        const { id, updates, rowIndexOverride } = item;
        const rowIndex = rowIndexOverride || -1;
        if (rowIndex <= 0) continue;

        const markUrl = buildUrl("markdeleted");
        const setCell = (colIdx0: number, value: any) => {
          if (colIdx0 < 0 || value === undefined) return;
          const params = new URLSearchParams();
          params.set("action", "markdeleted");
          params.set("sheet", SHEET_NAME);
          if (SHEET_ID) params.set("sheetId", SHEET_ID);
          params.set("rowIndex", String(rowIndex));
          params.set("columnIndex", String(colIdx0 + 1));
          params.set("value", String(value));
          allOps.push(
            fetch(markUrl, {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded; charset=UTF-8",
                Accept: "application/json",
              },
              body: params.toString(),
              mode: "cors",
            })
          );
        };

        // Approval fields updates
        if (colApproval >= 0) setCell(colApproval, updates.approvalDate);
        if (colStatus >= 0) setCell(colStatus, updates.shopManagerStatus);
        if (colRemarks >= 0) setCell(colRemarks, updates.remarks);
        const appNameCol = colApprovalName >= 0 ? colApprovalName : 42;
        setCell(appNameCol, updates.approvalName);

        // Approval sheet insertion (Parallel request preparation)
        if (updates.isApproval) {
          const approvalUrl = new URL(
            SCRIPT_URL,
            typeof window !== "undefined" ? window.location.origin : undefined
          );
          approvalUrl.searchParams.set("action", "insert");
          approvalUrl.searchParams.set("sheet", "Approval");
          if (SHEET_ID) approvalUrl.searchParams.set("sheetId", SHEET_ID);
          const approvalRowData = [
            new Date().toISOString().slice(0, 19).replace("T", " "),
            id,
            updates.shopName || "",
            updates.shopManagerStatus || "",
            updates.remarks || "",
            updates.approvalName || "",
          ];
          approvalUrl.searchParams.set(
            "rowData",
            JSON.stringify(approvalRowData)
          );
          allOps.push(
            fetch(approvalUrl.toString(), {
              method: "POST",
              headers: { Accept: "application/json" },
              mode: "cors",
            })
          );
        }
      }

      // Parallel Requests Execution
      if (allOps.length > 0) {
        await Promise.all(allOps);
        console.log(
          `✅ Bulk update completed for ${items.length} items (${allOps.length} parallel requests)`
        );
      }
      clearIndentCache();
    } catch (e) {
      console.error("Bulk update failed:", e);
      throw e;
    }
  },

  async getMasterCompanies(): Promise<string[]> {
    if (!SCRIPT_URL) {
      return ["THE LIQUOR STORY", "ABC Distributors", "XYZ Suppliers"];
    }

    try {
      // Temporarily set sheet to "Master"
      // Since SHEET_NAME is const, we can't change it easily, so use a custom URL
      const url = buildUrl().replace(`sheet=${SHEET_NAME}`, `sheet=Master`);
      console.log("Fetching master companies from:", url);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Master data:", data);

      // Assume data is array of objects, take column C (index 2 if 0-based)
      let rows: any[] = [];
      if (Array.isArray(data)) rows = data;
      else if (data && Array.isArray(data.data)) rows = data.data;
      else if (data && Array.isArray((data as any).values)) {
        rows = (data as any).values;
      }

      console.log("Rows to process:", rows);

      const companies = rows
        .map((row: any) => {
          if (Array.isArray(row)) return String(row[2] || ""); // Column C is index 2
          return String(row["Header"] || row.Header || "");
        })
        .filter(Boolean);

      console.log("Companies extracted:", companies);

      return companies.length > 0 ? companies : ["THE LIQUOR STORY"];
    } catch (error) {
      console.error("Error fetching master companies:", error);
      return ["THE LIQUOR STORY"];
    }
  },

  async getTransporterNames(): Promise<string[]> {
    if (!SCRIPT_URL) {
      return ["ABC Logistics", "XYZ Transport"];
    }

    try {
      // Fetch from Master sheet
      const url = buildUrl().replace(`sheet=${SHEET_NAME}`, `sheet=Master`);
      console.log("Fetching transporter names from:", url);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Master data for transporters:", data);

      // Normalize response into an array of row objects
      let rows: any[] = [];
      if (Array.isArray(data)) {
        rows = data;
      } else if (data && Array.isArray(data.data)) {
        rows = data.data;
      } else if (data && Array.isArray((data as any).values)) {
        rows = (data as any).values;
      }

      console.log("Rows to process for transporters:", rows);

      const transporters = rows
        .slice(1) // Start from row 2 (index 1) to the end
        .map((row: any) => {
          if (Array.isArray(row)) return String(row[1] || ""); // Column B is index 1
          return String(
            row["Transport Name"] ||
              row.TransportName ||
              row["Trasnport Name"] ||
              ""
          );
        })
        .filter(Boolean);

      console.log("Transporters extracted:", transporters);

      return transporters.length > 0 ? transporters : ["ABC Logistics"];
    } catch (error) {
      console.error("Error fetching transporter names:", error);
      return ["ABC Logistics"];
    }
  },

  async getLoginUsers(): Promise<LoginUser[]> {
    if (!SCRIPT_URL) {
      return [
        {
          userName: "Admin User",
          userId: "admin",
          password: "admin123",
          role: "admin",
          pageAccess: "all",
          shopName: "all",
        },
        {
          userName: "Regular User",
          userId: "user",
          password: "user123",
          role: "user",
          pageAccess: "all",
          shopName: "all",
        },
      ];
    }

    try {
      // Fetch from Login sheet
      const url = buildUrl().replace(`sheet=${SHEET_NAME}`, `sheet=Login`);
      console.log("🔍 FETCHING LOGIN USERS FROM:", url);
      console.log("📊 SCRIPT_URL:", SCRIPT_URL);
      console.log("📊 SHEET_NAME:", SHEET_NAME);
      console.log("📊 SHEET_ID:", SHEET_ID);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("🌐 Response status:", response.status);
      console.log("🌐 Response ok:", response.ok);
      console.log(
        "🌐 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ HTTP Error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data: any;
      if (isJsonResponse(response)) {
        data = await response.json();
        console.log("✅ JSON Response received");
      } else {
        const text = await response.text();
        console.error("❌ Non-JSON response received:", text.substring(0, 500));
        throw new Error(
          "Non-JSON response from Apps Script (first 500 chars): " +
            text.substring(0, 500)
        );
      }

      console.log("📋 Raw Login API response:", data);
      console.log("📋 Data type:", typeof data);
      console.log("📋 Data keys:", data ? Object.keys(data) : "No keys");

      // Normalize response into an array of row objects
      let rows: any[] = [];
      if (Array.isArray(data)) {
        rows = data;
        console.log("📋 Data is array with", rows.length, "items");
      } else if (data && Array.isArray(data.data)) {
        rows = data.data;
        console.log("📋 Data.data is array with", rows.length, "items");
      } else if (data && Array.isArray((data as any).values)) {
        rows = (data as any).values;
        console.log("📋 Data.values is array with", rows.length, "items");
      } else {
        console.warn("⚠️ Data is not in expected array format:", data);
      }

      console.log("📋 Final rows to process:", rows);
      console.log("📋 Number of rows:", rows.length);

      if (rows.length === 0) {
        console.warn("⚠️ No rows found in Login sheet!");
        return []; // Return empty array to fall back to mock data
      }

      // Skip header row if it exists
      if (rows.length > 0) {
        const firstRow = rows[0];
        console.log("🔍 Checking first row for headers:", firstRow);

        // Check if first row looks like headers
        if (Array.isArray(firstRow)) {
          const headerStrings = firstRow.map((cell) =>
            String(cell || "")
              .toLowerCase()
              .trim()
          );
          console.log("🔍 Header strings:", headerStrings);

          if (
            headerStrings.includes("user name") ||
            headerStrings.includes("userid") ||
            headerStrings.includes("pass") ||
            headerStrings.includes("role")
          ) {
            console.log("✅ Detected header row, skipping it");
            rows = rows.slice(1); // Skip header row
          } else {
            console.log("❌ No header row detected, processing all rows");
          }
        } else if (typeof firstRow === "object") {
          const keys = Object.keys(firstRow || {});
          console.log("🔍 Object keys:", keys);

          if (
            keys.some(
              (key) =>
                key.toLowerCase().includes("user") ||
                key.toLowerCase().includes("pass") ||
                key.toLowerCase().includes("role")
            )
          ) {
            console.log("✅ Detected header row (object), skipping it");
            rows = rows.slice(1); // Skip header row
          } else {
            console.log(
              "❌ No header row detected (object), processing all rows"
            );
          }
        }
      }

      console.log("📋 Rows to process after header check:", rows);
      console.log("📋 Number of data rows:", rows.length);

      const users = rows
        .map((row: any, index: number) => {
          console.log(`👤 Processing data row ${index}:`, row);
          if (Array.isArray(row)) {
            console.log(`👤 Row ${index} is array with ${row.length} columns`);
            console.log(`👤 Column A (0): "${row[0]}"`);
            console.log(`👤 Column B (1): "${row[1]}"`);
            console.log(`👤 Column C (2): "${row[2]}"`);
            console.log(`👤 Column D (3): "${row[3]}"`);
            console.log(`👤 Column E (4): "${row[4]}"`);
            console.log(`👤 Column F (5): "${row[5]}"`);

            const pageAccessValue = String(row[4] || "all")
              .trim()
              .toLowerCase();
            const shopNameValue = String(row[5] || "").trim();
            console.log(`🎯 Row ${index} FINAL shopName: "${shopNameValue}"`);

            return {
              userName: String(row[0] || ""), // Column A
              userId: String(row[1] || ""), // Column B
              password: String(row[2] || ""), // Column C
              role: String(row[3] || "").toLowerCase(), // Column D
              pageAccess: pageAccessValue, // Column E (Page Access)
              shopName: shopNameValue, // Column F (Shop Name)
            };
          }
          const shopNameValue = String(
            row["Shop Name"] || row.ShopName || row.shopName || ""
          ).trim();
          console.log(`👤 Row ${index} object shopName: "${shopNameValue}"`);
          return {
            userName: String(row["User Name"] || row.UserName || ""),
            userId: String(row["User ID"] || row.UserID || ""),
            password: String(row["Pass"] || row.Password || ""),
            role: String(row["Role"] || "").toLowerCase(),
            pageAccess:
              String(row["Page Access"] || row.pageAccess || "all") || "all",
            shopName: shopNameValue,
          };
        })
        .filter((user: LoginUser) => user.userId && user.password); // Filter out empty entries

      console.log("✅ Final users extracted:", users);
      console.log("✅ Number of valid users:", users.length);

      return users.length > 0
        ? users
        : [
            {
              userName: "Admin User",
              userId: "admin",
              password: "admin123",
              role: "admin",
              pageAccess: "all",
              shopName: "all",
            },
            {
              userName: "Regular User",
              userId: "user",
              password: "user123",
              role: "user",
              pageAccess: "all",
              shopName: "all",
            },
          ];
    } catch (error) {
      console.error("Error fetching login users:", error);
      return [
        {
          userName: "Admin User",
          userId: "admin",
          password: "admin123",
          role: "admin",
          pageAccess: "all",
          shopName: "all",
        },
        {
          userName: "Regular User",
          userId: "user",
          password: "user123",
          role: "user",
          pageAccess: "all",
          shopName: "all",
        },
      ];
    }
  },

  async getApprovalNames(): Promise<string[]> {
    if (!SCRIPT_URL) {
      return ["Ram Karan", "Shrawan"];
    }

    try {
      // Fetch from Master sheet
      const url = buildUrl().replace(`sheet=${SHEET_NAME}`, `sheet=Master`);
      console.log("Fetching approval names from:", url);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Master data for approval names:", data);

      // Normalize response into an array of row objects
      let rows: any[] = [];
      if (Array.isArray(data)) {
        rows = data;
      } else if (data && Array.isArray(data.data)) {
        rows = data.data;
      } else if (data && Array.isArray((data as any).values)) {
        rows = (data as any).values;
      }

      console.log("Rows to process for approval names:", rows);

      // Column D is index 3 (0-based)
      const approvalNames = rows
        .slice(1) // Skip header row
        .map((row: any) => {
          if (Array.isArray(row)) return String(row[3] || "").trim(); // Column D is index 3
          return String(
            row["Approval Name"] ||
              row.approvalName ||
              row["approval name"] ||
              ""
          ).trim();
        })
        .filter((name: string) => name); // Remove empty strings

      console.log("Approval names extracted:", approvalNames);

      // Remove duplicates and sort
      const uniqueNames = [...new Set(approvalNames)].sort();

      return uniqueNames.length > 0 ? uniqueNames : ["Ram Karan", "Shrawan"];
    } catch (error) {
      console.error("Error fetching approval names:", error);
      return ["Ram Karan", "Shrawan"];
    }
  },
};