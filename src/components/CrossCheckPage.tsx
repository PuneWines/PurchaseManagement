import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Image as ImageIcon,
  CheckCircle,
  X,
  FileText,
} from "lucide-react";
import { indentService } from "../services/indentService";
import { storageUtils } from "../utils/storage";

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

// Helper to format date as DD/MM/YYYY
const formatDateOnly = (dateString?: string): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
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
  reorderQuantityPcs: number; // This is from column I
  reorderQuantityBox: number; // This is from column O
  shopName: string;
  orderBy: string;
  traderName: string;
  orderDate: string;
  transporterName?: string;
  status?: string;
  vendorName?: string;
  sizes?: string[];

  // From Lifting
  liftingData?: {
    transportCopy?: string;
    billCopy?: string;
    qty?: string;
    driverName?: string;
    driverWhatsapp?: string;
    vehicleNo?: string;
    liftingCompletedAt?: string;
  };

  // Lifting Date from column AF (actualAF)
  liftingDate?: string;

  // From Cross Check
  receiveStatus?: "All Okay" | "Not Okay";
  receivedQty?: string;
  difference?: string;
  receiveRemarks?: string;

  // Planned & Actual
  plannedAE?: string;
  actualAF?: string;
  plannedAK?: string;
  actualAL?: string;
  transportDifference?: string;
  pendingReceivingQty?: string; // From column AS
}

interface ColumnVisibility {
  action: boolean;
  indentNumber: boolean;
  shopName: boolean;
  itemName: boolean;
  transporterName: boolean;
  transportCopy: boolean;
  billCopy: boolean;
  difference: boolean;
  remarks: boolean;
  traderName: boolean;
  pendingReceivingQty: boolean;
  liftingDate: boolean;
}

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export const CrossCheckPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentItem | null>(null);
  const [receiveData, setReceiveData] = useState({
    receivedQty: "",
    difference: "",
    receiveRemarks: "",
  });
  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
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
    shopName: true,
    itemName: true,
    transporterName: true,
    transportCopy: true,
    billCopy: true,
    difference: true,
    remarks: true,
    traderName: true,
    pendingReceivingQty: true,
    liftingDate: true,
  });

  // Helper function to process and validate image URLs
  const getImageUrl = (url?: string): string => {
    if (!url || url.trim() === "") {
      return "";
    }

    const trimmed = url.trim();

    // Handle Google Drive shared links
    if (trimmed.includes("drive.google.com")) {
      const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
      }
    }

    // Handle direct links
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }

    if (trimmed.startsWith("data:")) {
      return trimmed;
    }

    // Default to https:// for other cases
    return `https://${trimmed}`;
  };

  // Handle viewing image in new tab
  const handleViewImage = (rawUrl: string) => {
    const url = getImageUrl(rawUrl);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // -----------------------------------------------------------------
  // Fetch ALL Indents from Google Sheets
  // -----------------------------------------------------------------
  const fetchIndents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const googleSheetData = await indentService.getIndents();
      const saved = localStorage.getItem("indent_approval_data");
      const localData: IndentItem[] = saved ? JSON.parse(saved) : [];

      const mergedData = googleSheetData.map((googleItem) => {
        const localItem = localData.find((local) => local.id === googleItem.id);
        if (localItem) {
          return {
            ...googleItem,
            ...localItem,
            liftingData: localItem.liftingData || googleItem.liftingData,
            liftingDate: localItem.liftingDate || googleItem.liftingDate || googleItem.actualAF,
            receiveStatus: localItem.receiveStatus || googleItem.receiveStatus,
            receivedQty: localItem.receivedQty || googleItem.receivedQty,
            difference: localItem.difference || googleItem.difference,
            receiveRemarks:
              localItem.receiveRemarks || googleItem.receiveRemarks,
            actualAF: localItem.actualAF || googleItem.actualAF,
            actualAL: localItem.actualAL || googleItem.actualAL,
          };
        }
        return {
          ...googleItem,
          liftingDate: googleItem.liftingDate || googleItem.actualAF,
        };
      });

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

      const saved = localStorage.getItem("indent_approval_data");
      const localIndents: IndentItem[] = saved ? JSON.parse(saved) : [];
      setIndents(localIndents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndents();
  }, [fetchIndents]);

  const columnLabels = {
    action: "Action",
    indentNumber: "Indent No.",
    shopName: "Shop",
    itemName: "Item",
    transporterName: "Transporter",
    transportCopy: "Transport Copy",
    billCopy: "Bill Copy",
    difference: "Difference",
    remarks: "Remarks",
    traderName: "Trader Name",
    liftingDate: "Lifting Date",
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // -----------------------------------------------------------------
  // Filters based on Planned AK & Actual AL
  // -----------------------------------------------------------------
  const basePendingIndents = indents.filter(
    (i) => i.plannedAK?.trim() && !i.actualAL?.trim()
  );
  const baseHistoryIndents = indents.filter((i) => i.actualAL?.trim());

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
        const indentDate = indent.actualAL
          ? new Date(indent.actualAL)
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

  // -----------------------------------------------------------------
  // Calculate Difference
  // -----------------------------------------------------------------
  const calculateDifference = (receivedQty: string) => {
    if (!selectedIndent?.liftingData?.qty) return "";
    const expected = parseFloat(selectedIndent.liftingData.qty) || 0;
    const received = parseFloat(receivedQty) || 0;
    return (expected - received).toString();
  };

  const handleReceivedQtyChange = (value: string) => {
    const difference = calculateDifference(value);
    setReceiveData((prev) => ({
      ...prev,
      receivedQty: value,
      difference,
    }));
  };

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const handleCrossCheck = (indent: IndentItem) => {
    setSelectedIndent(indent);
    setReceiveData({
      receivedQty: indent.liftingData?.qty || "",
      difference: calculateDifference(indent.liftingData?.qty || ""),
      receiveRemarks: indent.receiveRemarks || "",
    });
    setShowModal(true);
  };

  const handleSubmitReceive = async () => {
    if (!selectedIndent || !receiveData.receivedQty.trim()) return;

    // Optimistic update: Update local state immediately
    const now = formatTimestamp(new Date());
    const receiveStatus: "All Okay" | "Not Okay" =
      receiveData.difference === "0" ? "All Okay" : "Not Okay";

    const updateData = {
      actualAL: now,
      receivedQty: receiveData.receivedQty,
      difference: receiveData.difference,
      receiveRemarks: receiveData.receiveRemarks,
      receiveStatus,
      shopName: selectedIndent.shopName,
      isReceived: true,
    };

    const updatedIndents = indents.map((i) =>
      i.id === selectedIndent.id ? { ...i, ...updateData } : i
    );

    setIndents(updatedIndents);
    setShowModal(false);
    setSelectedIndent(null);
    setReceiveData({ receivedQty: "", difference: "", receiveRemarks: "" });

    // Show success message immediately
    setSuccessMessage(
      `Cross check completed successfully for indent ${selectedIndent.indentNumber}.`
    );
    setTimeout(() => setSuccessMessage(""), 5000);

    // Perform background operations
    try {
      // Update Google Sheets
      await indentService.updateIndent(selectedIndent.id, updateData);

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

      console.log("Cross check submission completed successfully");

      // Automatically refresh page after successful submission to reload updated data
      setTimeout(() => {
        window.location.reload();
      }, 500); // 0.5 second delay for faster feedback
    } catch (error: any) {
      console.error("Submit error:", error);
      // Revert optimistic update on failure
      const revertedIndents = indents.map((i) => {
        if (i.id === selectedIndent.id) {
          return {
            ...i,
            actualAL: i.actualAL || "",
            receivedQty: i.receivedQty || "",
            difference: i.difference || "",
            receiveRemarks: i.receiveRemarks || "",
            receiveStatus:
              (i.receiveStatus as "All Okay" | "Not Okay" | undefined) ||
              undefined,
            isReceived: false,
          };
        }
        return i;
      });
      setIndents(revertedIndents);
      setSuccessMessage(""); // Clear success message
      setErrorMessage("Failed to complete cross check. Please try again.");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  // -----------------------------------------------------------------
  // Table Row Component
  // -----------------------------------------------------------------
  const TableRow = React.memo(
    ({
      indent,
      activeTab,
      onCrossCheck,
      onViewImage,
    }: {
      indent: IndentItem;
      activeTab: "pending" | "history";
      onCrossCheck: (indent: IndentItem) => void;
      onViewImage: (url: string) => void;
    }) => {
      return (
        <tr className="hover:bg-gray-50">
          {/* Action */}
          {columnVisibility.action && (
            <td className="px-6 py-4 whitespace-nowrap">
              {activeTab === "pending" ? (
                <button
                  onClick={() => onCrossCheck(indent)}
                  className="flex gap-1 items-center px-3 py-1 text-sm text-white bg-purple-600 rounded-lg transition hover:bg-purple-700"
                >
                  <Package className="w-4 h-4" />
                  <span>Receive</span>
                </button>
              ) : (
                <span className="text-sm text-gray-500">Received</span>
              )}
            </td>
          )}

          {/* Indent Number */}
          {columnVisibility.indentNumber && (
            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
              {indent.indentNumber}
            </td>
          )}

          {/* Shop */}
          {columnVisibility.shopName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.shopName}
            </td>
          )}

          {/* Trader Name */}
          {columnVisibility.traderName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.traderName}
            </td>
          )}
          
          {/* Pending Receiving Qty - From column AS */}
          {columnVisibility.pendingReceivingQty && activeTab === "history" && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.pendingReceivingQty || "-"}
            </td>
          )}

          {/* Lifting Date - From column AF */}
          {columnVisibility.liftingDate && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {formatDateOnly(indent.liftingDate || indent.actualAF)}
            </td>
          )}

          {/* Item */}
          {columnVisibility.itemName && (
            <td className="px-6 py-4 text-sm text-gray-500">
              <div>
                <div className="font-medium">{indent.itemName}</div>
                <div className="text-xs text-gray-400">
                  {indent.sizes?.join(", ") || "-"}
                </div>
              </div>
            </td>
          )}

          {/* Transporter */}
          {columnVisibility.transporterName && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.transporterName || "-"}
            </td>
          )}

          {/* Transport Copy */}
          {columnVisibility.transportCopy && (
            <td className="px-6 py-4 text-sm whitespace-nowrap">
              {indent.liftingData?.transportCopy ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (indent.liftingData?.transportCopy) {
                      onViewImage(indent.liftingData.transportCopy);
                    }
                  }}
                  className="flex gap-1 items-center font-medium text-blue-600 hover:text-blue-800"
                >
                  <ImageIcon className="w-4 h-4" />
                  View
                </button>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
          )}

          {/* Bill Copy */}
          {columnVisibility.billCopy && (
            <td className="px-6 py-4 text-sm whitespace-nowrap">
              {indent.liftingData?.billCopy ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (indent.liftingData?.billCopy) {
                      onViewImage(indent.liftingData.billCopy);
                    }
                  }}
                  className="flex gap-1 items-center font-medium text-blue-600 hover:text-blue-800"
                >
                  <ImageIcon className="w-4 h-4" />
                  View
                </button>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
          )}

          {/* Show Diff only in history tab */}
          {activeTab === "history" && columnVisibility.difference && (
            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
              {indent.difference || "-"}
            </td>
          )}

          {/* History Columns */}
          {activeTab === "history" && columnVisibility.remarks && (
            <td className="px-6 py-4 text-sm text-gray-500">
              {indent.receiveRemarks || "-"}
            </td>
          )}
        </tr>
      );
    }
  );

  TableRow.displayName = "TableRow";

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center p-6 min-h-screen">
        <div className="w-10 h-10 rounded-full border-4 border-purple-600 animate-spin border-t-transparent" />
        <p className="mt-3 text-gray-600">Loading indents...</p>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen bg-gray-50 md:p-6 w-full lg:w-[calc(100vw-279px)] overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Cross Check & Receive
          {filterField === "traderName" && filterValue
            ? ` - Trader: ${filterValue}`
            : ""}
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          Verify lifted items where Planned 5 (AK) is set. History shows
          completed cross-checks.
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
                Cross Check Completed Successfully
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
                Error Completing Cross Check
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="flex sticky top-0 z-20 flex-col gap-3 px-4 pt-3 pb-3 -mx-4 -mt-3 mb-4 bg-gray-50 sm:flex-row md:-mx-6 md:px-6">
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
        <div className="flex items-center gap-2">
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
            <FileText className="w-4 h-4" />
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
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
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
                ? "border-purple-500 text-purple-600"
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
                ? "border-purple-500 text-purple-600"
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
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr>
                  {columnVisibility.action && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Action
                    </th>
                  )}
                  {columnVisibility.indentNumber && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Indent No.
                    </th>
                  )}
                  {columnVisibility.shopName && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Shop
                    </th>
                  )}
                  {columnVisibility.traderName && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Trader Name
                    </th>
                  )}
                  {columnVisibility.pendingReceivingQty &&
                    activeTab === "history" && (
                      <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                        Pending Receiving Qty
                      </th>
                    )}
                  {columnVisibility.liftingDate && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Lifting Date
                    </th>
                  )}
                  {columnVisibility.itemName && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Item
                    </th>
                  )}
                  {columnVisibility.transporterName && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Transporter
                    </th>
                  )}
                  {columnVisibility.transportCopy && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Transport Copy
                    </th>
                  )}
                  {columnVisibility.billCopy && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Bill Copy
                    </th>
                  )}
                  {activeTab === "history" && columnVisibility.difference && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Difference
                    </th>
                  )}
                  {activeTab === "history" && columnVisibility.remarks && (
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                      Remarks
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentIndents.map((indent) => (
                  <TableRow
                    key={indent.id}
                    indent={indent}
                    activeTab={activeTab}
                    onCrossCheck={handleCrossCheck}
                    onViewImage={handleViewImage}
                  />
                ))}
              </tbody>
            </table>

            {currentIndents.length === 0 && (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-3 w-12 h-12 text-gray-400" />
                <p className="text-gray-500">
                  No {activeTab === "pending" ? "pending" : "received"} items
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 lg:hidden">
        {currentIndents.map((indent) => (
          <div key={indent.id} className="p-4 bg-white rounded-xl shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-gray-900">
                  {indent.indentNumber}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(indent.orderDate).toLocaleDateString()}
                </div>
              </div>
              {activeTab === "pending" && (
                <button
                  onClick={() => handleCrossCheck(indent)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  <Package className="w-4 h-4" />
                  <span>Receive</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs text-gray-500">Shop</span>
                <div>{indent.shopName}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Trader Name</span>
                <div>{indent.traderName}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Lifting Date</span>
                <div>{formatDateOnly(indent.liftingDate || indent.actualAF)}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Item</span>
                <div>{indent.itemName}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Sizes</span>
                <div>{indent.sizes?.join(", ") || "-"}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Transporter</span>
                <div>{indent.transporterName || "-"}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">QTY</span>
                <div>{indent.liftingData?.qty || "-"}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Transport Copy</span>
                <div>
                  {indent.liftingData?.transportCopy ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewImage(indent.liftingData!.transportCopy!);
                      }}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Bill Copy</span>
                <div>
                  {indent.liftingData?.billCopy ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewImage(indent.liftingData!.billCopy!);
                      }}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
            </div>

            {activeTab === "history" && (
              <div className="pt-2 mt-2 space-y-1 text-sm border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending Receiving Qty</span>
                  <span>{indent.pendingReceivingQty || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Received</span>
                  <span>{indent.receivedQty || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Difference</span>
                  <span>{indent.difference || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Remark</span>
                  <span>{indent.receiveRemarks || "-"}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Receive Modal */}
      {showModal && selectedIndent && (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
            <div className="flex sticky top-0 justify-between items-center p-4 bg-white border-b md:p-6">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                Cross Check & Receive
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

            <div className="p-4 space-y-4 md:p-6">
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
                    Lifting Date
                  </label>
                  <input
                    type="text"
                    value={formatDateOnly(selectedIndent.liftingDate || selectedIndent.actualAF)}
                    readOnly
                    className="p-3 mt-1 w-full bg-gray-50 rounded-lg border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Qty
                  </label>
                  <input
                    type="text"
                    value={selectedIndent.reorderQuantityPcs || ""}
                    readOnly
                    className="p-3 mt-1 w-full bg-gray-50 rounded-lg border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lifting Qty
                  </label>
                  <input
                    type="text"
                    value={selectedIndent.liftingData?.qty || ""}
                    readOnly
                    className="p-3 mt-1 w-full bg-gray-50 rounded-lg border"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Received Qty
                </label>
                <input
                  type="number"
                  value={receiveData.receivedQty}
                  onChange={(e) => handleReceivedQtyChange(e.target.value)}
                  placeholder="Enter received quantity"
                  className="p-3 w-full rounded-lg border focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Difference
                </label>
                <input
                  type="text"
                  value={receiveData.difference}
                  readOnly
                  className="p-3 w-full bg-gray-50 rounded-lg border"
                  placeholder="Auto-calculated"
                />
              </div>

              <div>
                <label className="flex gap-1 items-center mb-2 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4" /> Remark
                </label>
                <textarea
                  value={receiveData.receiveRemarks}
                  onChange={(e) =>
                    setReceiveData((p) => ({
                      ...p,
                      receiveRemarks: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Enter any remarks..."
                  className="p-3 w-full rounded-lg border focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 p-4 md:flex-row md:justify-end md:p-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedIndent(null);
                }}
                className="px-6 py-2 w-full text-gray-700 rounded-lg border md:w-auto hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReceive}
                disabled={!receiveData.receivedQty.trim()}
                className="px-6 py-2 w-full text-white bg-purple-600 rounded-lg md:w-auto hover:bg-purple-700 disabled:opacity-50"
              >
                Submit Receive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};