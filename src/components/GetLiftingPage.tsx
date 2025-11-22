import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Package,
  CheckCircle,
  X,
  Upload,
  Hash,
  Loader2,
  Pencil,
} from "lucide-react";
import { Camera } from "lucide-react";
import Webcam from "react-webcam";
import { indentService } from "../services/indentService";
import { storageUtils } from "../utils/storage";
import { uploadFileToDrive } from "../utils/pdfGenerator";

// Helper to format timestamp as DD/MM/YYYY
const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  
  try {
    // Try to parse the date string
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If it's not a valid date, try to parse from different formats
      const parts = dateString.split(/[/-]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${day}/${month}/${year}`;
      }
      return dateString; // Return as is if can't parse
    }
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

// Helper to format timestamp as DD/MM/YYYY HH:mm:ss
const formatTimestamp = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// ---------------------------------------------------------------------
// Indent Item Interface
// ---------------------------------------------------------------------
interface IndentItem {
  id: string;
  indentNumber: string;
  skuCode: string;
  itemName: string;
  brandName: string;
  bottlesPerCase: number;
  reorderQuantityBox: number;
  shopName: string;
  orderBy: string;
  traderName: string;
  orderDate: string;
  transporterName?: string;
  status?: string;

  plannedAE?: string;
  actualAF?: string;
  poQty?: number;
  poDate?: string;
  poCopyLink?: string;

  liftingData?: {
    transportCopy?: string;
    billCopy?: string;
    qty?: string;
    driverName?: string;
    driverWhatsapp?: string;
    vehicleNo?: string;
    liftingCompletedAt?: string;
  };
}

interface ColumnVisibility {
  action: boolean;
  indentNumber: boolean;
  poDate: boolean;
  skuCode: boolean;
  itemName: boolean;
  brandName: boolean;
  bottlesPerCase: boolean;
  reorderQuantityBox: boolean;
  poQty: boolean;
  shopName: boolean;
  orderBy: boolean;
  transporterName: boolean;
  poCopy: boolean;
  poNo: boolean;
  qty: boolean;
  transportCopy: boolean;
  billCopy: boolean;
  completedAt: boolean;
}

// ---------------------------------------------------------------------
// Lifting Form Data
// ---------------------------------------------------------------------
interface CameraState {
  isOpen: boolean;
  type: "transport" | "bill" | "bulk-transport" | "bulk-bill" | null;
}
interface LiftingFormData {
  transportCopy: File | null;
  qty: string;
  billCopy: File | null;
  transportCopyUrl?: string;
  billCopyUrl?: string;
}

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export const GetLiftingPage = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentItem | null>(null);
  const [formData, setFormData] = useState<LiftingFormData>({
    transportCopy: null,
    qty: "",
    billCopy: null,
  });

  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingPoQtyId, setEditingPoQtyId] = useState<string | null>(null);
  const [editingPoQtyValue, setEditingPoQtyValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editAreaRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [camera, setCamera] = useState<CameraState>({
    isOpen: false,
    type: null,
  });

  // Camera capture for single and bulk
  const capturePhoto = useCallback(() => {
    const type = camera.type;
    if (!webcamRef.current || !type) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const fnameBase = type.replace("bulk-", "");
        const file = new File([blob], `${fnameBase}_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        if (type === "transport") {
          setFormData((prev) => ({
            ...prev,
            transportCopy: file,
            transportCopyUrl: URL.createObjectURL(file),
          }));
        } else if (type === "bill") {
          setFormData((prev) => ({
            ...prev,
            billCopy: file,
            billCopyUrl: URL.createObjectURL(file),
          }));
        } else if (type === "bulk-transport") {
          // Reuse existing bulk handler
          handleBulkFileChange("transportCopy", file);
        } else if (type === "bulk-bill") {
          handleBulkFileChange("billCopy", file);
        }
        setCamera({ isOpen: false, type: null });
      });
  }, [camera.type]);

  // Focus the input when editing starts
  useEffect(() => {
    if (editingPoQtyId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPoQtyId]);
  // Bulk lifting modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkIndents, setBulkIndents] = useState<IndentItem[]>([]);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkFormData, setBulkFormData] = useState<{
    transportCopyUrl?: string;
    billCopyUrl?: string;
  }>({});
  const [filterField, setFilterField] = useState<
    "itemName" | "shopName" | "traderName" | ""
  >("");
  const [filterValue, setFilterValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Column filter states
  const [showColumnFilter, setShowColumnFilter] = useState(false);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    action: true,
    indentNumber: true,
    poDate: true,
    skuCode: true,
    itemName: true,
    brandName: true,
    bottlesPerCase: true,
    reorderQuantityBox: true,
    poQty: true,
    shopName: true,
    orderBy: true,
    transporterName: true,
    poCopy: true,
    poNo: true,
    qty: true,
    transportCopy: true,
    billCopy: true,
    completedAt: true,
  });

  // Upload states
  const [uploadingTransport, setUploadingTransport] = useState(false);
  const [uploadingBill, setUploadingBill] = useState(false);

  // -----------------------------------------------------------------
  // Fetch Indents from Google Sheets
  // -----------------------------------------------------------------
  const fetchIndents = async () => {
    try {
      setLoading(true);
      setError(null);
      const googleSheetData = await indentService.getIndents();

      console.log("🔍 Fetched data from Google Sheets:", googleSheetData, "items");
      console.log("🔍 Sample item with PO data:", googleSheetData[0] ? {
        indentNumber: googleSheetData[0].indentNumber,
        poDate: googleSheetData[0].poDate,
        poCopyLink: googleSheetData[0].poCopyLink,
        transporterName: googleSheetData[0].transporterName
      } : null);
      
      // Get localStorage data
      const saved = localStorage.getItem("indent_approval_data");
      const localData: IndentItem[] = saved ? JSON.parse(saved) : [];

      // Merge Google Sheets data with localStorage data
      // LocalStorage takes precedence for fields that might not be synced to Google Sheets
      const mergedData = googleSheetData.map((googleItem) => {
        const localItem = localData.find((local) => local.id === googleItem.id);
        if (localItem) {
          // Merge, with local data taking precedence for lifting fields
          return {
            ...googleItem,
            ...localItem,
            // Ensure lifting data is preserved
            liftingData: localItem.liftingData || googleItem.liftingData,
            // Ensure actualAF is preserved if it exists locally
            actualAF: localItem.actualAF || googleItem.actualAF,
          };
        }
        return googleItem;
      });

      console.log("🔍 Merged data:", mergedData.length, "items");
      console.log(
        "🔍 Sample merged item with PO data:",
        mergedData[0]
          ? {
              id: mergedData[0].id,
              indentNumber: mergedData[0].indentNumber,
              poDate: mergedData[0].poDate,
              poCopyLink: mergedData[0].poCopyLink,
              transporterName: mergedData[0].transporterName,
              plannedAE: mergedData[0].plannedAE,
              actualAF: mergedData[0].actualAF,
            }
          : null
      );

      const userShopRaw = storageUtils.getCurrentUser()?.shopName || "";
      const allowedShops =
        userShopRaw && userShopRaw.toLowerCase() !== "all"
          ? userShopRaw
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          : null;
      const filtered = allowedShops
        ? mergedData.filter((i) =>
            allowedShops.includes((i.shopName || "").trim().toLowerCase())
          )
        : mergedData;
      setIndents(filtered);
    } catch (err: any) {
      console.error("Error fetching indents:", err);
      setError("Failed to load indents. Using local data as fallback.");

      // Fallback to localStorage
      const saved = localStorage.getItem("indent_approval_data");
      const localIndents: IndentItem[] = saved ? JSON.parse(saved) : [];
      setIndents(localIndents);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // Bulk Lifting Handlers
  // -----------------------------------------------------------------
  const handleBulkFileChange = async (
    field: "transportCopy" | "billCopy",
    file: File | null
  ) => {
    if (!file) {
      setBulkFormData((prev) => ({
        ...prev,
        [field === "transportCopy" ? "transportCopyUrl" : "billCopyUrl"]:
          undefined,
      }));
      return;
    }
    try {
      if (field === "transportCopy") {
        setUploadingTransport(true);
        const fileUrl = await uploadFileToDrive(
          file,
          "1FdPTqxGZN_Rx6EtubY6P-VsP7VVYKZd7",
          "transport-copy"
        );
        setBulkFormData((prev) => ({ ...prev, transportCopyUrl: fileUrl }));
      } else {
        setUploadingBill(true);
        const fileUrl = await uploadFileToDrive(
          file,
          "1ccqbLEJBqs_0RACRTV55uSse6GCQbea0",
          "bill-copy"
        );
        setBulkFormData((prev) => ({ ...prev, billCopyUrl: fileUrl }));
      }
    } catch (e) {
      alert("Failed to upload file. Please try again.");
    } finally {
      if (field === "transportCopy") setUploadingTransport(false);
      if (field === "billCopy") setUploadingBill(false);
    }
  };

  const handleSubmitLiftingBulk = async () => {
    if (bulkIndents.length === 0) return;
    if (!bulkFormData.transportCopyUrl || !bulkFormData.billCopyUrl) {
      alert("Please upload both Transport and Bill copies.");
      return;
    }
    const now = formatTimestamp(new Date());
    const updated = indents.map((i) => {
      const match = bulkIndents.find((b) => b.id === i.id);
      if (!match) return i;
      return {
        ...i,
        status: "lifting",
        actualAF: now,
        isLifting: true,
        liftingData: {
          transportCopy: bulkFormData.transportCopyUrl || "",
          billCopy: bulkFormData.billCopyUrl || "",
          qty: (match.poQty ?? 0).toString(),
          liftingCompletedAt: now,
        },
      };
    });
    setIndents(updated);
    setShowBulkModal(false);

    try {
      for (const indent of bulkIndents) {
        const updateData = {
          status: "lifting",
          actualAF: now,
          shopName: indent.shopName,
          isLifting: true,
          liftingData: {
            transportCopy: bulkFormData.transportCopyUrl || "",
            billCopy: bulkFormData.billCopyUrl || "",
            qty: (indent.poQty ?? 0).toString(),
            liftingCompletedAt: now,
          },
        } as any;
        await indentService.updateIndent(indent.id, updateData);
        const saved = localStorage.getItem("indent_approval_data");
        const localIndents: IndentItem[] = saved ? JSON.parse(saved) : [];
        const updatedLocal = localIndents.map((i) =>
          i.id === indent.id ? { ...i, ...updateData } : i
        );
        localStorage.setItem(
          "indent_approval_data",
          JSON.stringify(updatedLocal)
        );
      }
      setSuccessMessage(`Lifting completed for ${bulkIndents.length} indents.`);
      setTimeout(() => setSuccessMessage(""), 5000);
      setBulkIndents([]);
      setSelectedRows([]);
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error("Bulk submit error:", err);
      setErrorMessage("Failed to complete bulk lifting. Please try again.");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  useEffect(() => {
    fetchIndents();
  }, []);

  const columnLabels = {
    action: "Action",
    indentNumber: "Indent",
    poDate: "PO Date",
    skuCode: "SKU",
    itemName: "Item",
    brandName: "Brand",
    bottlesPerCase: "Bottles/Case",
    reorderQuantityBox: "Reorder (Box)",
    poQty: "PO Qty",
    shopName: "Shop",
    orderBy: "Order By",
    transporterName: "Transport Name",
    poCopy: "PO Copy",
    poNo: "Po No.",
    qty: "Qty",
    transportCopy: "Transport Copy",
    billCopy: "Bill Copy",
    completedAt: "Completed At",
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // -----------------------------------------------------------------
  // Filters (No duplicate logic)
  // -----------------------------------------------------------------

  console.log("Total indents loaded:", indents);
  const basePendingIndents = indents.filter((i) => {
    const hasPlanned = i.plannedAE && String(i.plannedAE).trim().length > 0;
    const hasActual = i.actualAF && String(i.actualAF).trim().length > 0;
    return hasPlanned && !hasActual;
  });
  const baseHistoryIndents = indents.filter((i) => {
    const hasActual = i.actualAF && String(i.actualAF).trim().length > 0;
    return hasActual; // If AF is not null, show in history
  });

  // Apply search and filter
  const filterIndents = (indents: IndentItem[]) => {
    return indents.filter((indent) => {
      const searchLower = searchTerm.toLowerCase();
      const searchMatch =
        indent.indentNumber?.toLowerCase().includes(searchLower) ||
        indent.skuCode?.toLowerCase().includes(searchLower) ||
        indent.itemName?.toLowerCase().includes(searchLower) ||
        indent.brandName?.toLowerCase().includes(searchLower) ||
        indent.traderName?.toLowerCase().includes(searchLower) ||
        indent.shopName?.toLowerCase().includes(searchLower) ||
        indent.orderBy?.toLowerCase().includes(searchLower);

      let fieldMatch = true;
      if (filterField && filterValue.trim()) {
        const fieldValueLower = indent[filterField]?.toLowerCase() || "";
        fieldMatch = fieldValueLower.includes(filterValue.toLowerCase().trim());
      }

      // Date range filtering
      let dateMatch = true;
      if (startDate || endDate) {
        const indentDate = indent.actualAF
          ? new Date(indent.actualAF)
          : indent.liftingData?.liftingCompletedAt
          ? new Date(indent.liftingData.liftingCompletedAt)
          : null;

        if (indentDate) {
          if (startDate && new Date(startDate) > indentDate) {
            dateMatch = false;
          }
          if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (endOfDay < indentDate) {
              dateMatch = false;
            }
          }
        } else {
          // If there's no timestamp, only include if no date range is set
          dateMatch = !startDate && !endDate;
        }
      }

      return searchMatch && fieldMatch && dateMatch;
    });
  };

  const pendingIndents = filterIndents(basePendingIndents);
  const historyIndents = filterIndents(baseHistoryIndents);
  const currentIndents =
    activeTab === "pending" ? pendingIndents : historyIndents;

  // Log selected rows when they change
  useEffect(() => {
    console.log("Selected Indents:", selectedRows);
  }, [selectedRows]);

  // Keep selectAll in sync with current selection
  useEffect(() => {
    if (currentIndents.length === 0) {
      setSelectAll(false);
      return;
    }
    const allIds = currentIndents.map((i: IndentItem) => i.id);
    const isAllSelected = allIds.every((id) => selectedRows.includes(id));
    setSelectAll(isAllSelected);
  }, [selectedRows, currentIndents]);

  // Keep edit mode active until user saves (Enter) or cancels (Escape/X)
  // Intentionally no outside-click handler to avoid unintended closures while typing or clicking

  console.log("🔍 Filter results:", {
    totalIndents: indents.length,
    pendingIndents: pendingIndents.length,
    historyIndents: historyIndents.length,
  });

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const openLiftingModal = (indent: IndentItem) => {
    setSelectedIndent(indent);
    setFormData({
      transportCopy: null,
      qty: indent.poQty?.toString() || "",
      billCopy: null,
    });
    setShowModal(true);
  };

  const handleFileChange = async (
    field: "transportCopy" | "billCopy",
    file: File | null
  ) => {
    // Set the file in form data
    setFormData((prev) => ({ ...prev, [field]: file }));

    if (!file) {
      // Clear the URL if file is removed
      setFormData((prev) => ({
        ...prev,
        [field === "transportCopy" ? "transportCopyUrl" : "billCopyUrl"]:
          undefined,
      }));
      return;
    }

    // Upload the file immediately
    try {
      console.log(`Uploading ${field} file:`, file.name, file.size);
      if (field === "transportCopy") {
        setUploadingTransport(true);
        const fileUrl = await uploadFileToDrive(
          file,
          "1FdPTqxGZN_Rx6EtubY6P-VsP7VVYKZd7", // Transport Copy folder
          "transport-copy"
        );
        console.log(`Transport copy uploaded to:`, fileUrl);
        setFormData((prev) => ({ ...prev, transportCopyUrl: fileUrl }));
      } else if (field === "billCopy") {
        setUploadingBill(true);
        const fileUrl = await uploadFileToDrive(
          file,
          "1ccqbLEJBqs_0RACRTV55uSse6GCQbea0", // Bill Copy folder
          "bill-copy"
        );
        console.log(`Bill copy uploaded to:`, fileUrl);
        setFormData((prev) => ({ ...prev, billCopyUrl: fileUrl }));
      }
    } catch (error) {
      console.error(`Error uploading ${field}:`, error);
      alert(`Failed to upload ${field}. Please try again.`);
      // Clear the file on error
      setFormData((prev) => ({ ...prev, [field]: null }));
    } finally {
      if (field === "transportCopy") {
        setUploadingTransport(false);
      } else if (field === "billCopy") {
        setUploadingBill(false);
      }
    }
  };

  const handleSubmitLifting = async () => {
    console.log("Starting lifting submission");
    console.log("Form data:", formData);
    console.log("Selected indent:", selectedIndent);
    if (!selectedIndent || !formData.qty) return;

    // Optimistic update: Update local state immediately
    const now = formatTimestamp(new Date());
    console.log("Current timestamp:", now);

    const updateData = {
      status: "lifting",
      actualAF: now,
      shopName: selectedIndent.shopName,
      isLifting: true,
      liftingData: {
        transportCopy: formData.transportCopyUrl || "",
        billCopy: formData.billCopyUrl || "",
        qty: formData.qty,
        liftingCompletedAt: now,
      },
    };
    console.log("Update data being sent:", updateData);

    const updatedIndents = indents.map((i) =>
      i.id === selectedIndent.id ? { ...i, ...updateData } : i
    );

    setIndents(updatedIndents);
    setShowModal(false);
    setSelectedIndent(null);
    setFormData({
      transportCopy: null,
      qty: "",
      billCopy: null,
      transportCopyUrl: undefined,
      billCopyUrl: undefined,
    });

    // Show success message immediately
    setSuccessMessage(
      `Lifting completed successfully for indent ${selectedIndent.indentNumber}.`
    );
    setTimeout(() => setSuccessMessage(""), 5000);

    // Perform background operations
    try {
      // Update Google Sheets
      console.log("Calling indentService.updateIndent");
      await indentService.updateIndent(selectedIndent.id, updateData);
      console.log("Google Sheets update completed successfully");

      // Update localStorage
      const saved = localStorage.getItem("indent_approval_data");
      const localIndents: IndentItem[] = saved ? JSON.parse(saved) : [];
      const updatedLocal = localIndents.map((i) =>
        i.id === selectedIndent.id ? { ...i, ...updateData } : i
      );
      localStorage.setItem(
        "indent_approval_data",
        JSON.stringify(updatedLocal)
      );
      console.log("LocalStorage updated");
      console.log("Lifting submission completed successfully");

      // Automatically refresh page after successful submission to reload updated data
      setTimeout(() => {
        window.location.reload();
      }, 500); // 0.5 second delay for faster feedback
    } catch (err: any) {
      console.error("Submit error:", err);
      // Revert optimistic update on failure
      const revertedIndents = indents.map((i) => {
        if (i.id === selectedIndent.id) {
          return {
            ...i,
            status: i.status || "",
            actualAF: i.actualAF || "",
            shopName: i.shopName || "",
            isLifting: false,
            liftingData: i.liftingData || undefined,
          };
        }
        return i;
      });
      setIndents(revertedIndents);
      setSuccessMessage(""); // Clear success message
      setErrorMessage("Failed to complete lifting. Please try again.");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  // -----------------------------------------------------------------
  // Table Header
  // -----------------------------------------------------------------
  const TableHeader = () => (
    <thead className="sticky top-0 z-10 bg-gray-50">
      <tr>
        {activeTab === "pending" && columnVisibility.action && (
          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">
            {/* SELECT ALL CHECKBOX */}
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelectAll(checked);
                if (checked) {
                  // Select ALL current indents in table
                  const allIds = currentIndents.map((i: IndentItem) => i.id);
                  setSelectedRows(allIds);
                } else {
                  // Unselect all
                  setSelectedRows([]);
                }
              }}
              className="mr-2 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            Action
          </th>
        )}
        {columnVisibility.indentNumber && (
          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
            Indent
          </th>
        )}
        {columnVisibility.poDate && (
          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
            PO Date
          </th>
        )}

        {activeTab === "pending" && (
          <>
            {columnVisibility.skuCode && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                SKU
              </th>
            )}
            {columnVisibility.itemName && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Item
              </th>
            )}
            {columnVisibility.brandName && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Brand
              </th>
            )}
            {columnVisibility.bottlesPerCase && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Bottles/Case
              </th>
            )}
            {columnVisibility.reorderQuantityBox && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Reorder (Box)
              </th>
            )}
            {columnVisibility.poQty && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                PO Qty
              </th>
            )}
            {columnVisibility.shopName && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Shop
              </th>
            )}
            {columnVisibility.orderBy && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Order By
              </th>
            )}
            {columnVisibility.transporterName && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Transport Name
              </th>
            )}
            {columnVisibility.poCopy && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                PO Copy
              </th>
            )}
            {columnVisibility.poNo && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Po No.
              </th>
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {columnVisibility.skuCode && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                SKU
              </th>
            )}
            {columnVisibility.itemName && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Item
              </th>
            )}
            {columnVisibility.brandName && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Brand
              </th>
            )}
            {columnVisibility.bottlesPerCase && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Bottles/Case
              </th>
            )}
            {columnVisibility.reorderQuantityBox && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Reorder (Box)
              </th>
            )}
            {columnVisibility.poQty && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                PO Qty
              </th>
            )}
            {columnVisibility.shopName && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Shop
              </th>
            )}
            {columnVisibility.orderBy && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Order By
              </th>
            )}
            {columnVisibility.qty && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Qty
              </th>
            )}
            {columnVisibility.transportCopy && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Transport Copy
              </th>
            )}
            {columnVisibility.billCopy && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Bill Copy
              </th>
            )}
            {columnVisibility.completedAt && (
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Completed At
              </th>
            )}
          </>
        )}
      </tr>
    </thead>
  );

  // -----------------------------------------------------------------
  // Table Row
  // -----------------------------------------------------------------
  const TableRow: React.FC<{ indent: IndentItem }> = ({ indent }) => (
    <tr className="hover:bg-gray-50">
      {activeTab === "pending" && columnVisibility.action && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={selectedRows.includes(indent.id)}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  setSelectedRows((prev) => [...prev, indent.id]);
                } else {
                  setSelectedRows((prev) =>
                    prev.filter((id) => id !== indent.id)
                  );
                  setSelectAll(false);
                }
              }}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </td>
      )}

      {columnVisibility.indentNumber && (
        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
          {indent.indentNumber}
        </td>
      )}

      {columnVisibility.poDate && (
        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
          {formatDate(indent.poDate || "")}
        </td>
      )}

      {activeTab === "pending" && (
        <>
          {columnVisibility.skuCode && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.skuCode}
            </td>
          )}
          {columnVisibility.itemName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.itemName}
            </td>
          )}
          {columnVisibility.brandName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.brandName}
            </td>
          )}
          {columnVisibility.bottlesPerCase && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.bottlesPerCase}
            </td>
          )}
          {columnVisibility.reorderQuantityBox && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.reorderQuantityBox}
            </td>
          )}
          {columnVisibility.poQty && (
            <td
              className="px-6 py-4 text-sm whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();

                // 🛑 STOP CLICK LOOP THAT BREAKS INPUT
                if (editingPoQtyId === indent.id) return;

                setEditingPoQtyId(indent.id);
                setEditingPoQtyValue(indent.poQty ? String(indent.poQty) : "");
              }}
            >
              <div className="relative">
                {editingPoQtyId === indent.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingPoQtyValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v)) {
                        setEditingPoQtyValue(v);
                        setBulkIndents((prev) =>
                          prev.map((x) =>
                            x.id === indent.id
                              ? { ...x, poQty: v === "" ? 0 : parseInt(v) }
                              : x
                          )
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingPoQtyId(null);
                      if (e.key === "Escape") setEditingPoQtyId(null);
                    }}
                    autoFocus
                    className="w-24 px-2 py-1.5 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer">
                    {indent.poQty || "Click to edit"}
                  </div>
                )}
              </div>
            </td>
          )}
          {columnVisibility.shopName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.shopName}
            </td>
          )}
          {columnVisibility.orderBy && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.orderBy}
            </td>
          )}
          {columnVisibility.transporterName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.transporterName || "-"}
            </td>
          )}
          {columnVisibility.poCopy && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.poCopyLink ? (
                <a
                  href={indent.poCopyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View
                </a>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
          )}
          {columnVisibility.poNo && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.indentNumber}
            </td>
          )}
        </>
      )}

      {activeTab === "history" && (
        <>
          {columnVisibility.skuCode && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.skuCode}
            </td>
          )}
          {columnVisibility.itemName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.itemName}
            </td>
          )}
          {columnVisibility.brandName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.brandName}
            </td>
          )}
          {columnVisibility.bottlesPerCase && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.bottlesPerCase}
            </td>
          )}
          {columnVisibility.reorderQuantityBox && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.reorderQuantityBox}
            </td>
          )}
          {columnVisibility.poQty && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.poQty || "-"}
            </td>
          )}
          {columnVisibility.shopName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.shopName}
            </td>
          )}
          {columnVisibility.orderBy && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.orderBy}
            </td>
          )}
          {columnVisibility.qty && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.liftingData?.qty || "-"}
            </td>
          )}
          {columnVisibility.transportCopy && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.liftingData?.transportCopy ? (
                <a
                  href={indent.liftingData.transportCopy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View PDF
                </a>
              ) : (
                <span className="text-gray-400">Not Uploaded</span>
              )}
            </td>
          )}
          {columnVisibility.billCopy && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.liftingData?.billCopy ? (
                <a
                  href={indent.liftingData.billCopy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View PDF
                </a>
              ) : (
                <span className="text-gray-400">Not Uploaded</span>
              )}
            </td>
          )}
          {columnVisibility.completedAt && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.actualAF
                ? new Date(indent.actualAF).toLocaleString()
                : indent.liftingData?.liftingCompletedAt
                ? new Date(
                    indent.liftingData.liftingCompletedAt
                  ).toLocaleString()
                : "Completed"}
            </td>
          )}
        </>
      )}
    </tr>
  );

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  const CameraModal = () => {
    if (!camera.isOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75">
        <div className="p-6 w-full max-w-2xl bg-white rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              Capture{" "}
              {camera.type?.includes("bill") ? "Bill Copy" : "Transport Copy"}
            </h3>
            <button
              onClick={() => setCamera({ isOpen: false, type: null })}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="overflow-hidden relative w-full h-96 bg-gray-200 rounded-lg">
            <Webcam
              audio={false}
              ref={webcamRef}
              className="object-cover w-full h-full"
              screenshotFormat="image/jpeg"
              screenshotQuality={0.92}
              mirrored={false}
              forceScreenshotSourceSize
              playsInline
              videoConstraints={{
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
              onUserMediaError={(e) => {
                console.error("Camera error:", e);
              }}
            />
          </div>
          <div className="flex gap-3 justify-center mt-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg"
            >
              <Camera className="w-5 h-5" />
              <span>Capture Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setCamera({ isOpen: false, type: null })}
              className="px-4 py-2 text-white bg-gray-500 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center p-6 min-h-screen">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="mt-3 text-gray-600">Loading indents...</p>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen bg-white md:p-6 w-full lg:w-[calc(100vw-279px)] overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Get Lifting
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          Complete lifting for POs where Planned 4 AE is set. History shows
          completed lifting tasks.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 mb-6 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
          {error}
          <button
            onClick={fetchIndents}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 mb-6 bg-green-50 rounded-lg border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Lifting Completed Successfully
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error Completing Lifting
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="flex sticky top-0 z-20 flex-col gap-3 px-4 pt-3 pb-3 -mx-4 -mt-3 mb-4 bg-gray-50 md:static md:top-auto sm:flex-row md:-mx-6 md:px-6">
        <div className="flex flex-wrap flex-1 gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by indent, SKU, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-2 pr-3 pl-9 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 w-36 text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 w-36 text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="p-1 text-gray-400 rounded-full hover:bg-gray-100"
                title="Clear dates"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Start Lifting Button */}
          {activeTab === "pending" && selectedRows.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {selectedRows.length} selected
              </span>
              <button
                onClick={() => {
                  const selected = currentIndents.filter((i) =>
                    selectedRows.includes(i.id)
                  );
                  setBulkIndents(selected);
                  setShowBulkModal(true);
                }}
                className="flex gap-1 items-center px-4 py-2 text-sm text-white whitespace-nowrap bg-purple-600 rounded-lg transition hover:bg-purple-700"
              >
                <Package className="w-4 h-4" />
                <span>Start Lifting ({selectedRows.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="flex gap-2">
          <select
            value={filterField}
            onChange={(e) =>
              setFilterField(
                e.target.value as "itemName" | "shopName" | "traderName" | ""
              )
            }
            className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Filter by...</option>
            <option value="itemName">Item Name</option>
            <option value="shopName">Shop Name</option>
            <option value="traderName">Trader Name</option>
          </select>
          {filterField && (
            <input
              type="text"
              placeholder={`Filter by ${
                filterField === "itemName"
                  ? "Item"
                  : filterField === "shopName"
                  ? "Shop"
                  : "Trader"
              } Name`}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="px-3 py-2 w-40 text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>

        {/* Column Filter Button */}
        <div className="relative">
          <button
            onClick={() => setShowColumnFilter(!showColumnFilter)}
            className="flex gap-2 justify-center items-center px-3 py-2 w-full text-sm text-white whitespace-nowrap bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <Package className="w-4 h-4" />
            Columns
          </button>

          {/* Column Filter Dropdown */}
          {showColumnFilter && (
            <>
              {/* Backdrop for mobile */}
              <div
                className="fixed inset-0 z-30 bg-black bg-opacity-25 sm:hidden"
                onClick={() => setShowColumnFilter(false)}
              ></div>

              <div className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 bottom-0 sm:bottom-auto top-auto sm:top-full sm:mt-2 w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 z-40 max-h-[70vh] sm:max-h-96 overflow-hidden flex flex-col">
                <div className="flex flex-shrink-0 justify-between items-center p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">
                    Show/Hide Columns
                  </h3>
                  <button
                    onClick={() => setShowColumnFilter(false)}
                    className="text-gray-500 sm:hidden hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="overflow-y-auto p-4">
                  <div className="space-y-1">
                    {Object.entries(columnLabels).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex gap-2 items-center p-2 rounded transition-colors cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={
                            columnVisibility[key as keyof ColumnVisibility]
                          }
                          onChange={() =>
                            toggleColumn(key as keyof ColumnVisibility)
                          }
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          <button
            onClick={() => setActiveTab("pending")}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "pending"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex gap-2 items-center">
              <Package className="w-4 h-4" />
              <span>Pending ({pendingIndents.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex gap-2 items-center">
              <CheckCircle className="w-4 h-4" />
              <span>History ({historyIndents.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Desktop Table */}
      <div className="hidden bg-white rounded-xl border border-gray-200 shadow-lg lg:block">
        <div className="overflow-x-auto w-full lg:w-[calc(100vw-16rem)]">
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <TableHeader />
              <tbody className="bg-white divide-y divide-gray-199">
                {(activeTab === "pending"
                  ? pendingIndents
                  : historyIndents
                ).map((indent) => (
                  <TableRow key={indent.id} indent={indent} />
                ))}
              </tbody>
            </table>

            {(activeTab === "pending" ? pendingIndents : historyIndents)
              .length === 0 && (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-3 w-12 h-12 text-gray-400" />
                <p className="text-gray-500">
                  {activeTab === "pending"
                    ? "No indents ready for lifting"
                    : "No lifting history"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 lg:hidden">
        {(activeTab === "pending" ? pendingIndents : historyIndents).map(
          (indent) => (
            <div key={indent.id} className="p-4 bg-white rounded-xl shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-gray-900">
                    {indent.indentNumber}
                  </div>
                  <div className="text-xs text-gray-500">
                    PO Date: {formatDate(indent.poDate || "")}
                  </div>
                </div>
                {activeTab === "pending" && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(indent.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedRows((prev) =>
                          checked
                            ? [...prev, indent.id]
                            : prev.filter((id) => id !== indent.id)
                        );
                      }}
                      className="w-5 h-5 accent-blue-600"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-xs text-gray-500">PO Date</span>
                  <div>{formatDate(indent.poDate || "")}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">SKU</span>
                  <div>{indent.skuCode}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Item</span>
                  <div>{indent.itemName}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Brand</span>
                  <div>{indent.brandName}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Bottles/Case</span>
                  <div>{indent.bottlesPerCase}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Reorder</span>
                  <div>{indent.reorderQuantityBox}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">PO Qty</span>
                  <div>{indent.poQty || "-"}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Shop</span>
                  <div>{indent.shopName}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Order By</span>
                  <div>{indent.orderBy}</div>
                </div>
                {activeTab === "pending" && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">Transport Name</span>
                      <div>{indent.transporterName || "-"}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">PO Copy</span>
                      <div>
                        {indent.poCopyLink ? (
                          <a
                            href={indent.poCopyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Po No.</span>
                      <div>{indent.indentNumber}</div>
                    </div>
                  </>
                )}
                {activeTab === "history" && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">QTY</span>
                      <div>{indent.liftingData?.qty || "Completed"}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Transport Copy</span>
                      <div>
                        {indent.liftingData?.transportCopy ? (
                          <a
                            href={indent.liftingData.transportCopy}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            View PDF
                          </a>
                        ) : (
                          <span className="text-gray-400">Not Uploaded</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Bill Copy</span>
                      <div>
                        {indent.liftingData?.billCopy ? (
                          <a
                            href={indent.liftingData.billCopy}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            View PDF
                          </a>
                        ) : (
                          <span className="text-gray-400">Not Uploaded</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">
                        Completed At
                      </span>
                      <div>
                        {indent.actualAF
                          ? new Date(indent.actualAF).toLocaleString()
                          : indent.liftingData?.liftingCompletedAt
                          ? new Date(
                              indent.liftingData.liftingCompletedAt
                            ).toLocaleString()
                          : "Completed"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Lifting Modal */}
      {showModal && selectedIndent && (
        <div className="flex fixed inset-0 z-50 justify-center items-stretch p-0 bg-black bg-opacity-50 sm:items-center sm:p-4">
          <div className="w-full h-[100dvh] max-w-none overflow-y-auto bg-white rounded-none shadow-xl sm:h-auto sm:max-w-2xl sm:rounded-xl">
            <div className="flex sticky top-0 justify-between items-center p-4 bg-white border-b md:p-6">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                Start Lifting
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedIndent(null);
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3 md:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Indent Number
                  </label>
                  <input
                    type="text"
                    value={selectedIndent.indentNumber}
                    readOnly
                    className="p-3 mt-1 w-full bg-gray-50 rounded-lg border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={selectedIndent.shopName}
                    readOnly
                    className="p-3 mt-1 w-full bg-gray-50 rounded-lg border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Trader Name
                  </label>
                  <input
                    type="text"
                    value={selectedIndent.traderName}
                    readOnly
                    className="p-3 mt-1 w-full bg-gray-50 rounded-lg border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transporter
                  </label>
                  <div className="p-3 mt-1 w-full bg-gray-50 rounded-lg border min-h-[44px]">
                    {selectedIndent.transporterName || "-"}
                  </div>
                </div>
              </div>

              <div>
                <label className="flex gap-1 items-center mb-2 text-sm font-medium text-gray-700">
                  <Upload className="w-4 h-4" /> Transport Copy
                  {formData.transportCopyUrl && (
                    <span className="text-xs text-green-600">✓ Uploaded</span>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    handleFileChange(
                      "transportCopy",
                      e.target.files?.[0] || null
                    )
                  }
                  className="p-3 w-full text-sm rounded-lg border"
                  disabled={uploadingTransport}
                />
                {uploadingTransport && (
                  <div className="flex gap-2 items-center mt-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to Transport folder...</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  <Hash className="inline mr-1 w-4 h-4" /> QTY *
                </label>
                <input
                  type="number"
                  value={formData.qty}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, qty: e.target.value }))
                  }
                  placeholder="Enter quantity"
                  className="p-3 w-full rounded-lg border focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="flex gap-1 items-center mb-2 text-sm font-medium text-gray-700">
                  <Upload className="w-4 h-4" /> Bill Copy
                  {formData.billCopyUrl && (
                    <span className="text-xs text-green-600">✓ Uploaded</span>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    handleFileChange("billCopy", e.target.files?.[0] || null)
                  }
                  className="p-3 w-full text-sm rounded-lg border"
                  disabled={uploadingBill}
                />
                {uploadingBill && (
                  <div className="flex gap-2 items-center mt-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to Bill folder...</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 p-4 md:flex-row md:justify-end md:p-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedIndent(null);
                    setFormData({
                      transportCopy: null,
                      qty: "",
                      billCopy: null,
                      transportCopyUrl: undefined,
                      billCopyUrl: undefined,
                    });
                  }}
                  className="px-6 py-2 w-full text-gray-700 rounded-lg border hover:bg-gray-50 md:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitLifting}
                  disabled={
                    !formData.qty ||
                    !formData.transportCopyUrl ||
                    !formData.billCopyUrl
                  }
                  className="flex justify-center items-center px-6 py-2 w-full text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 md:w-auto"
                >
                  Submit Lifting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Bulk Lifting Modal */}
      {showBulkModal && bulkIndents.length > 0 && (
        <div className="flex overflow-y-auto fixed inset-0 z-50 justify-center items-center p-0 backdrop-blur-sm bg-black/50 animate-fadeIn sm:p-4">
          <div className="relative w-full h-full max-h-[90vh] max-w-6xl bg-white rounded-none shadow-2xl flex flex-col sm:rounded-2xl">
            {/* Modal Header */}
            <div className="flex sticky top-0 z-10 justify-between items-center p-4 bg-white border-b border-gray-100 sm:p-6">
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-10 h-10 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                    Bulk Lifting
                  </h2>
                  <p className="text-sm text-gray-500">
                    {bulkIndents.length}{" "}
                    {bulkIndents.length === 1 ? "item" : "items"} selected
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkIndents([]);
                }}
                className="p-2 -m-2 text-gray-400 hover:text-gray-500"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              {/* Selected Items Table */}
              <div className="mb-6">
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <div className="overflow-x-auto max-h-[calc(100vh-450px)]">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 w-12 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Action
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Indent #
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            PO Qty (pcs)
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Shop
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Trader
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Transporter
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bulkIndents.map((i) => (
                          <tr
                            key={i.id}
                            className="transition-colors hover:bg-gray-50"
                          >
                            <td className="px-3 py-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                              {editingPoQtyId === i.id ? (
                                <div className="flex items-center">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const qty =
                                          editingPoQtyValue === ""
                                            ? 0
                                            : parseInt(editingPoQtyValue, 10);
                                        if (!isNaN(qty) && qty >= 0) {
                                          await indentService.updateIndent(
                                            i.id,
                                            { poQty: qty }
                                          );
                                          const updatedIndents = indents.map(
                                            (item) =>
                                              item.id === i.id
                                                ? { ...item, poQty: qty }
                                                : item
                                          );
                                          setIndents(updatedIndents);
                                          setEditingPoQtyId(null);
                                          setSuccessMessage(
                                            "PO Qty updated successfully"
                                          );
                                          setTimeout(
                                            () => setSuccessMessage(""),
                                            3000
                                          );
                                        }
                                      } catch (error) {
                                        console.error(
                                          "Error updating PO Qty:",
                                          error
                                        );
                                        setErrorMessage(
                                          "Failed to update PO Qty"
                                        );
                                        setTimeout(
                                          () => setErrorMessage(""),
                                          3000
                                        );
                                      }
                                    }}
                                    className="p-1 mr-1 text-green-600 rounded-md hover:bg-green-50"
                                    title="Save"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPoQtyId(null)}
                                    className="p-1 text-red-600 rounded-md hover:bg-red-50"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPoQtyId(i.id);
                                    setEditingPoQtyValue(
                                      i.poQty ? String(i.poQty) : ""
                                    );
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit PO Qty"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                              {i.indentNumber || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                              {editingPoQtyId === i.id ? (
                                <div
                                  ref={editAreaRef}
                                  className="flex gap-2 items-center"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={editingPoQtyValue}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === "" || /^\d+$/.test(v)) {
                                        // update edit input
                                        setEditingPoQtyValue(v);

                                        // also update BULK INDENTS so React stops resetting value
                                        setBulkIndents((prev) =>
                                          prev.map((item) =>
                                            item.id === i.id
                                              ? {
                                                  ...item,
                                                  poQty:
                                                    v === "" ? 0 : parseInt(v),
                                                }
                                              : item
                                          )
                                        );
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === "Enter") {
                                        const qty =
                                          editingPoQtyValue === ""
                                            ? 0
                                            : parseInt(editingPoQtyValue);

                                        indentService.updateIndent(i.id, {
                                          poQty: qty,
                                        });
                                        setEditingPoQtyId(null);
                                      }

                                      if (e.key === "Escape") {
                                        setEditingPoQtyId(null);
                                      }
                                    }}
                                    className="px-2 py-1 w-20 text-sm rounded-md border border-blue-300 focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="flex gap-2 items-center px-2 py-1 rounded cursor-pointer hover:bg-gray-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPoQtyId(i.id);
                                    setEditingPoQtyValue(
                                      i.poQty ? String(i.poQty) : ""
                                    );
                                  }}
                                >
                                  {i.poQty || "-"}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 max-w-xs text-sm text-gray-500 truncate">
                              {i.shopName || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                              {i.traderName || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                              {i.transporterName || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="p-5 mt-6 space-y-6 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">
                  Upload Documents
                </h3>
                <p className="text-sm text-gray-500">
                  Please upload the required documents to complete the bulk
                  lifting process.
                </p>
                {/* Transport Copy */}
                <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    <div className="flex gap-2 items-center">
                      <Upload className="w-4 h-4 text-blue-500" />
                      <span>Transport Copy (shared)</span>
                      {bulkFormData.transportCopyUrl && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          Uploaded
                        </span>
                      )}
                    </div>
                  </label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                      onChange={(e) =>
                        handleBulkFileChange(
                          "transportCopy",
                          e.target.files?.[0] || null
                        )
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={uploadingTransport}
                    />
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCamera({ isOpen: true, type: "bulk-transport" })
                        }
                        className="inline-flex gap-2 items-center px-3 py-2 text-sm bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        <Camera className="w-4 h-4" /> Use Camera
                      </button>
                    </div>
                    {uploadingTransport && (
                      <div className="flex gap-2 items-center mt-2 text-sm text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to Transport folder...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bill Copy */}
                <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    <div className="flex gap-2 items-center">
                      <Upload className="w-4 h-4 text-blue-500" />
                      <span>Bill Copy (shared)</span>
                      {bulkFormData.billCopyUrl && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          Uploaded
                        </span>
                      )}
                    </div>
                  </label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                      onChange={(e) =>
                        handleBulkFileChange(
                          "billCopy",
                          e.target.files?.[0] || null
                        )
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={uploadingBill}
                    />
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCamera({ isOpen: true, type: "bulk-bill" })
                        }
                        className="inline-flex gap-2 items-center px-3 py-2 text-sm bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        <Camera className="w-4 h-4" /> Use Camera
                      </button>
                    </div>
                    {uploadingBill && (
                      <div className="flex gap-2 items-center mt-2 text-sm text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to Bill folder...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 justify-end items-center p-5 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkIndents([]);
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitLiftingBulk}
                disabled={
                  !bulkFormData.transportCopyUrl || !bulkFormData.billCopyUrl
                }
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <span>Submit All ({bulkIndents.length})</span>
                {submittingBulk && <Loader2 className="w-4 h-4 animate-spin" />}
              </button>
            </div>
          </div>
        </div>
      )}
      <CameraModal />
    </div>
  );
};