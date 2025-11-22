import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  X,
  CheckCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { indentService } from "../services/indentService";
import { storageUtils } from "../utils/storage";

// Helper to format timestamp as YYYY-MM-DD HH:mm:ss
const formatTimestamp = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// small debounce hook to avoid re-filtering on every keystroke
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface IndentItem {
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
  shopManagerStatus?: string;
  remarks?: string;
  approvalDate?: string;
  approvalName?: string;
  plannedDate?: string;
  approvedBy?: string;
  status?: string;
  actualTimestamp1?: string;
}

interface ColumnVisibility {
  timestamp: boolean;
  indentNumber: boolean;
  skuCode: boolean;
  itemName: boolean;
  brandName: boolean;
  moq: boolean;
  maxLevel: boolean;
  closingStock: boolean;
  reorderQuantityPcs: boolean;
  approved: boolean;
  traderName: boolean;
  liquor: boolean;
  size: boolean;
  sizeML: boolean;
  bottlesPerCase: boolean;
  reorderQuantityBox: boolean;
  shopName: boolean;
  orderBy: boolean;
}

export const ApprovalPage: React.FC = () => {
  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterField, setFilterField] = useState<
    "itemName" | "shopName" | "traderName" | ""
  >("");
  const [filterValue, setFilterValue] = useState("");
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterOptions, setFilterOptions] = useState<string[]>([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentItem | null>(null);
  const [shopManagerStatus, setShopManagerStatus] = useState("Approved");
  const [remarks, setRemarks] = useState("");
  const [approvalNames, setApprovalNames] = useState<string[]>([]);
  const [selectedApprovalName, setSelectedApprovalName] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    total: 0,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    timestamp: true,
    indentNumber: true,
    skuCode: true,
    itemName: true,
    brandName: true,
    moq: true,
    maxLevel: true,
    closingStock: true,
    reorderQuantityPcs: true,
    approved: true,
    traderName: true,
    liquor: true,
    size: true,
    sizeML: true,
    bottlesPerCase: true,
    reorderQuantityBox: true,
    shopName: true,
    orderBy: true,
  });

  // Fetch approval names on component mount
  useEffect(() => {
    const fetchApprovalNames = async () => {
      try {
        const names = await indentService.getApprovalNames();
        setApprovalNames(names);
        if (names.length > 0) {
          setSelectedApprovalName(names[0]);
        }
      } catch (error) {
        console.error("Failed to fetch approval names:", error);
        // Fallback to default names
        setApprovalNames(["Ram Karan", "Shrawan"]);
        setSelectedApprovalName("Ram Karan");
      }
    };

    fetchApprovalNames();
  }, []);

  useEffect(() => {
    const fetchIndents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await indentService.getIndents();
        const userShopRaw = storageUtils.getCurrentUser()?.shopName || "";
        const allowedShops =
          userShopRaw && userShopRaw.toLowerCase() !== "all"
            ? userShopRaw
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)
            : null;
        const filtered = allowedShops
          ? data.filter((i: any) =>
              allowedShops.includes((i.shopName || "").trim().toLowerCase())
            )
          : data;
        // Attach timestamps for matching Indent Numbers from FMS (A: Timestamp, B: Indent Number)
        try {
          const map = await indentService.getTimestampsByIndent?.();
          if (map && typeof map === "object") {
            const withTs = filtered.map((it) => ({
              ...it,
              actualTimestamp1:
                map[it.indentNumber] || it.actualTimestamp1 || "",
            }));
            setIndents(withTs);
          } else {
            setIndents(filtered);
          }
        } catch (e) {
          // If fetching mapping fails, proceed with original data
          setIndents(filtered);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load indents");
      } finally {
        setLoading(false);
      }
    };
    fetchIndents();
  }, []);

  const columnLabels = {
    timestamp: "Timestamp",
    indentNumber: "Indent Number",
    skuCode: "SKU Code",
    itemName: "Item Name",
    brandName: "Brand Name",
    moq: "MOQ",
    maxLevel: "Max Level",
    closingStock: "Closing Stock",
    reorderQuantityPcs: "Reorder Quantity (Pcs)",
    approved: "Approved",
    traderName: "Trader Name",
    liquor: "Liquor",
    size: "Size",
    sizeML: "SIZE (ML)",
    bottlesPerCase: "Bottles Per Case",
    reorderQuantityBox: "Reorder Quantity (Box)",
    shopName: "Shop Name",
    orderBy: "Order By",
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const handleApprove = (indent: IndentItem) => {
    setSelectedIndent(indent);
    // Pre-fill with existing data if available
    setShopManagerStatus(indent.shopManagerStatus || "Approved");
    setRemarks(indent.remarks || "");
    setShowModal(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisible = new Set(filteredIndents.map((i) => i.indentNumber));
      const allSelected = filteredIndents.every((i) =>
        prev.has(i.indentNumber)
      );
      if (allSelected) {
        const next = new Set(prev);
        allVisible.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allVisible.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!selectedApprovalName) {
      setError("Please select an approval name");
      setTimeout(() => setError(""), 3000);
      return;
    }
    const currentDate = formatTimestamp(new Date());
    const ids = Array.from(selectedIds);
    const updates = {
      shopManagerStatus: "Approved",
      remarks: "",
      approvalDate: currentDate,
      approvalName: selectedApprovalName,
      approvedBy: selectedApprovalName,
      status: "approved",
      actualTimestamp1: currentDate,
    } as const;

    const updatedIndents = indents.map((indent) =>
      ids.includes(indent.indentNumber) ? { ...indent, ...updates } : indent
    );
    setIndents(updatedIndents);
    try {
      await Promise.all(
        ids.map((indentNumber) =>
          indentService.updateIndent(indentNumber, {
            ...updates,
            shopName:
              indents.find((i) => i.indentNumber === indentNumber)?.shopName ||
              "",
            isApproval: true,
            indentNumber,
          })
        )
      );
      setSuccessMessage(
        `Approved ${ids.length} indent${
          ids.length > 1 ? "s" : ""
        } successfully!`
      );
      setTimeout(() => setSuccessMessage(""), 3000);
      setSelectedIds(new Set());
    } catch (e) {
      setError("Failed to approve selected indents. Please try again.");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleSaveApproval = async () => {
    if (selectedIndent) {
      // Add validation for approval name
      if (!selectedApprovalName) {
        setError("Please select an approval name");
        setTimeout(() => setError(""), 3000);
        return;
      }

      // Optimistic update: Update local state immediately
      const currentDate = formatTimestamp(new Date());
      const updates = {
        shopManagerStatus,
        remarks,
        approvalDate: currentDate,
        approvalName: selectedApprovalName, // This will be saved to column AQ
        approvedBy: selectedApprovalName,
        status:
          shopManagerStatus.toLowerCase() === "approved"
            ? "approved"
            : "rejected",
        actualTimestamp1: currentDate,
      };

      console.log("Submitting approval with updates:", updates);

      const updatedIndents = indents.map((indent) =>
        indent.indentNumber === selectedIndent.indentNumber
          ? {
              ...indent,
              ...updates,
            }
          : indent
      );
      setIndents(updatedIndents);
      setShowModal(false);
      setSelectedIndent(null);
      setShopManagerStatus("Approved");
      setRemarks("");
      setSelectedApprovalName(approvalNames[0] || "");

      // Show success message immediately
      const action =
        shopManagerStatus.toLowerCase() === "approved"
          ? "approved"
          : "rejected";
      setSuccessMessage(
        `Indent ${selectedIndent.indentNumber} has been ${action} successfully!`
      );
      setTimeout(() => setSuccessMessage(""), 3000);

      // Perform API call in background
      try {
        // Update backend with all necessary fields
        await indentService.updateIndent(selectedIndent.indentNumber, {
          shopManagerStatus,
          remarks,
          approvalDate: currentDate,
          approvalName: selectedApprovalName,
          approvedBy: selectedApprovalName,
          status:
            shopManagerStatus.toLowerCase() === "approved"
              ? "approved"
              : "rejected",
          shopName: selectedIndent.shopName,
          isApproval: true,
          actualTimestamp1: currentDate,
          indentNumber: selectedIndent.indentNumber, // Ensure indent number is included
        });

        // Update completed successfully - keep optimistic update
        console.log("Approval submitted successfully");

        // Automatically refresh page after successful submission to reload updated data
        setTimeout(() => {
          window.location.reload();
        }, 100); // 0.1 second delay for faster feedback
      } catch (error) {
        // Revert optimistic update on failure
        const revertedIndents = indents.map((indent) =>
          indent.indentNumber === selectedIndent.indentNumber
            ? {
                ...indent,
                shopManagerStatus: indent.shopManagerStatus || "",
                remarks: indent.remarks || "",
                approvalDate: indent.approvalDate || "",
                approvedBy: indent.approvedBy || "",
                status: indent.status || "",
              }
            : indent
        );
        setIndents(revertedIndents);
        setSuccessMessage(""); // Clear success message
        // Optionally show error message
        setError("Failed to update approval. Please try again.");
        setTimeout(() => setError(""), 5000);
      }
    }
  };

  // Update filter options when filter field changes
  useEffect(() => {
    if (filterField) {
      const uniqueValues = Array.from(
        new Set(
          indents
            .map((indent) => {
              const value = indent[filterField as keyof IndentItem];
              return value ? String(value).trim() : null;
            })
            .filter((value): value is string => value !== null && value !== "")
        )
      ).sort();
      setFilterOptions(uniqueValues);
      setFilterSearch("");
    } else {
      setFilterOptions([]);
    }
  }, [filterField, indents]);

  // Filter indents based on tab
  // Only show items that have plannedDate (are in the approval process)
  const hasValue = (s?: string) => typeof s === "string" && s.trim() !== "";

  // Pending: Planned1 has value AND Actual 1 (approvalDate) is empty
  const pendingIndents = indents.filter(
    (indent) => hasValue(indent.plannedDate) && !hasValue(indent.approvalDate)
  );

  // History: Planned1 has value AND Actual 1 (approvalDate) has value
  const historyIndents = indents.filter(
    (indent) => hasValue(indent.plannedDate) && hasValue(indent.approvalDate)
  );

  // Get current tab data

  const currentTabIndents = useMemo(() => {
    return activeTab === "pending" ? pendingIndents : historyIndents;
  }, [activeTab, pendingIndents, historyIndents]);

  // Build filtered list with memoization
  const filteredIndentsAll = useMemo(() => {
    if (!currentTabIndents) return [];

    return currentTabIndents.filter((indent) => {
      // Text search
      const searchLower = debouncedSearch.toLowerCase();
      const searchMatch =
        indent.indentNumber.toLowerCase().includes(searchLower) ||
        indent.skuCode.toLowerCase().includes(searchLower) ||
        indent.itemName.toLowerCase().includes(searchLower) ||
        indent.brandName.toLowerCase().includes(searchLower) ||
        indent.traderName.toLowerCase().includes(searchLower) ||
        indent.liquor.toLowerCase().includes(searchLower) ||
        indent.shopName.toLowerCase().includes(searchLower) ||
        indent.orderBy.toLowerCase().includes(searchLower) ||
        (indent.shopManagerStatus &&
          indent.shopManagerStatus.toLowerCase().includes(searchLower));

      // Field filter
      let fieldMatch = true;
      if (filterField && filterValue.trim()) {
        const fieldValue = (indent[filterField] as unknown as string) || "";
        fieldMatch = fieldValue
          .toLowerCase()
          .includes(filterValue.toLowerCase().trim());
      }

      // Date range filter
      let dateMatch = true;
      if (startDate || endDate) {
        const indentDate = indent.actualTimestamp1
          ? new Date(indent.actualTimestamp1)
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
  }, [
    currentTabIndents,
    debouncedSearch,
    filterField,
    filterValue,
    startDate,
    endDate,
  ]);

  // Pagination slice
  const filteredIndents = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredIndentsAll.slice(start, end);
  }, [filteredIndentsAll, pagination.page, pagination.pageSize]);

  // Update counts and reset page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, total: filteredIndentsAll.length }));
  }, [filteredIndentsAll.length]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [
    activeTab,
    debouncedSearch,
    filterField,
    filterValue,
    startDate,
    endDate,
  ]);
  useEffect(() => {
    console.log(filteredIndents, "currennt table indent");
  }, [activeTab, filteredIndents, currentTabIndents]);

  return (
    <div className="p-4 min-h-screen bg-white md:p-6 w-full lg:w-[calc(100vw-279px)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 justify-between items-start mb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Approval Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            Review and approve purchase indents
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mb-6 text-center">
          <div className="inline-block w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin" />
          <p className="mt-2 text-gray-600">Loading indents...</p>
        </div>
      )}

      {/* Error */}
      {error && (
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
                Error loading indents
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-2 text-sm font-medium text-red-800 bg-red-100 rounded-md hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
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
                Approval Successful
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content – only when NOT loading & NOT error */}
      {!loading && !error && (
        <div>
          {/* Tabs */}
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px space-x-4 md:space-x-8">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2 ${
                    activeTab === "pending"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Pending ({pendingIndents.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2 ${
                    activeTab === "history"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  History ({historyIndents.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="flex sticky top-0 z-20 flex-col gap-3 px-4 pt-3 pb-3 -mx-4 -mt-3 mb-4 bg-gray-50 sm:flex-row md:-mx-6 md:px-6">
            {/* Search Bar */}
            <div className="flex flex-col gap-3 w-full md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by indent, SKU, item, brand, trader, shop..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="py-2 pr-3 pl-9 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none sm:w-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start Date"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none sm:w-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="End Date"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="px-3 py-2 text-sm text-red-600 whitespace-nowrap hover:text-red-800"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>{" "}
            {/* Close the search/date range container */}
            {/* Filter Dropdown and Approve Button */}
            <div className="flex gap-2 items-center">
              {activeTab === "pending" && (
                <button
                  onClick={handleBulkApprove}
                  disabled={selectedIds.size === 0}
                  className={`px-4 py-2 text-sm rounded-lg ${
                    selectedIds.size === 0
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  Approve
                </button>
              )}
              <div className="relative">
                <select
                  value={filterField}
                  onChange={(e) =>
                    setFilterField(
                      e.target.value as
                        | "itemName"
                        | "shopName"
                        | "traderName"
                        | ""
                    )
                  }
                  className="px-3 py-2 pr-8 w-40 text-sm bg-white rounded-lg border border-gray-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Filter by...</option>
                  <option value="itemName">Item Name</option>
                  <option value="shopName">Shop Name</option>
                  <option value="traderName">Trader Name</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none" />
              </div>
              {filterField && (
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search ${filterField.replace(
                        "Name",
                        ""
                      )}...`}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="px-3 py-2 pr-8 w-40 text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Search className="absolute right-2 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
                  </div>

                  {/* Clear Filter Button */}
                  {(filterValue || filterSearch) && (
                    <button
                      onClick={() => {
                        setFilterValue("");
                        setFilterSearch("");
                      }}
                      className="absolute -top-2 -right-2 p-1 text-xs text-white bg-red-500 rounded-full transition-colors hover:bg-red-600"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* Dropdown with searchable options */}
                  {filterOptions.length > 0 && (
                    <div className="overflow-auto absolute z-10 mt-1 w-full max-h-60 bg-white rounded-lg border border-gray-200 shadow-lg">
                      {filterOptions
                        .filter((option) =>
                          option
                            .toLowerCase()
                            .includes(filterSearch.toLowerCase())
                        )
                        .map((option) => (
                          <div
                            key={option}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                              filterValue === option ? "bg-blue-100" : ""
                            }`}
                            onClick={() => {
                              setFilterValue(option);
                              setFilterSearch(option);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Column Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className="flex gap-2 justify-center items-center px-3 py-2 w-full text-sm text-white whitespace-nowrap bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:w-auto"
              >
                <Filter className="w-4 h-4" />
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
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={columnVisibility.orderBy}
                            onChange={() => toggleColumn("orderBy")}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span>{columnLabels.orderBy}</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={columnVisibility.timestamp}
                            onChange={() => toggleColumn("timestamp")}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            disabled={activeTab !== "history"}
                          />
                          <span
                            className={
                              activeTab !== "history" ? "text-gray-400" : ""
                            }
                          >
                            {columnLabels.timestamp}
                          </span>
                        </label>
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
                            <span className="text-sm text-gray-700">
                              {label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ✅ Desktop Table View (Fixed) */}
          <div
            key={activeTab}
            className="hidden bg-white rounded-xl border border-gray-200 shadow-lg lg:block"
          >
            {/* This wrapper fixes the scrolling issue */}
            <div className="overflow-x-auto w-full lg:w-[calc(100vw-16rem)]">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full min-w-[1200px] text-sm divide-y divide-gray-200">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      {activeTab === "pending" && (
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={toggleSelectAllVisible}
                            checked={
                              filteredIndents.length > 0 &&
                              filteredIndents.every((i) =>
                                selectedIds.has(i.indentNumber)
                              )
                            }
                          />
                        </th>
                      )}

                      {columnVisibility.timestamp && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Timestamp
                        </th>
                      )}
                      {columnVisibility.indentNumber && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Indent Number
                        </th>
                      )}
                      {columnVisibility.skuCode && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          SKU Code
                        </th>
                      )}
                      {columnVisibility.itemName && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Item Name
                        </th>
                      )}
                      {columnVisibility.brandName && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Brand Name
                        </th>
                      )}
                      {columnVisibility.moq && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          MOQ
                        </th>
                      )}
                      {columnVisibility.maxLevel && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Max Level
                        </th>
                      )}
                      {columnVisibility.closingStock && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Closing Stock
                        </th>
                      )}
                      {columnVisibility.reorderQuantityPcs && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Reorder Quantity (Pcs)
                        </th>
                      )}
                      {columnVisibility.approved && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Approved
                        </th>
                      )}
                      {columnVisibility.traderName && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Trader Name
                        </th>
                      )}
                      {columnVisibility.liquor && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Liquor
                        </th>
                      )}
                      {columnVisibility.size && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Size
                        </th>
                      )}
                      {columnVisibility.sizeML && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          SIZE (ML)
                        </th>
                      )}
                      {columnVisibility.bottlesPerCase && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Bottles Per Case
                        </th>
                      )}
                      {columnVisibility.reorderQuantityBox && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Reorder Quantity (Box)
                        </th>
                      )}
                      {columnVisibility.shopName && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Shop Name
                        </th>
                      )}
                      {columnVisibility.orderBy && (
                        <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                          Order By
                        </th>
                      )}
                      {activeTab === "history" && (
                        <>
                          <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                            Shop Manager Status
                          </th>
                          <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                            Approval Date
                          </th>
                          <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                            Remarks
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIndents.length > 0 ? (
                      filteredIndents.map((indent, index) => (
                        <tr
                          key={`${indent.indentNumber}-${indent.traderName}-${indent.shopName}-${index}`}
                          className="transition-colors duration-150 hover:bg-gray-50"
                        >
                          {activeTab === "pending" && (
                            <td className="px-3 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(indent.indentNumber)}
                                onChange={() =>
                                  toggleSelect(indent.indentNumber)
                                }
                              />
                            </td>
                          )}

                          {columnVisibility.timestamp && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.actualTimestamp1
                                ? formatTimestamp(
                                    new Date(indent.actualTimestamp1)
                                  )
                                : "-"}
                            </td>
                          )}
                          {columnVisibility.indentNumber && (
                            <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">
                              {indent.indentNumber}
                            </td>
                          )}
                          {columnVisibility.skuCode && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.skuCode}
                            </td>
                          )}
                          {columnVisibility.itemName && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.itemName}
                            </td>
                          )}
                          {columnVisibility.brandName && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.brandName}
                            </td>
                          )}
                          {columnVisibility.moq && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.moq}
                            </td>
                          )}
                          {columnVisibility.maxLevel && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.maxLevel}
                            </td>
                          )}
                          {columnVisibility.closingStock && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.closingStock}
                            </td>
                          )}
                          {columnVisibility.reorderQuantityPcs && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.reorderQuantityPcs}
                            </td>
                          )}
                          {columnVisibility.approved && (
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  indent.approved === "Yes"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {indent.approved}
                              </span>
                            </td>
                          )}
                          {columnVisibility.traderName && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.traderName || "-"}
                            </td>
                          )}
                          {columnVisibility.liquor && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.liquor}
                            </td>
                          )}
                          {columnVisibility.size && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.size}
                            </td>
                          )}
                          {columnVisibility.sizeML && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.sizeML}
                            </td>
                          )}
                          {columnVisibility.bottlesPerCase && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.bottlesPerCase}
                            </td>
                          )}
                          {columnVisibility.reorderQuantityBox && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.reorderQuantityBox}
                            </td>
                          )}
                          {columnVisibility.shopName && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.shopName}
                            </td>
                          )}
                          {columnVisibility.orderBy && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.orderBy}
                            </td>
                          )}
                          {activeTab === "history" && (
                            <>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    indent.shopManagerStatus === "Approved"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {indent.shopManagerStatus}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                                {indent.approvalDate
                                  ? new Date(
                                      indent.approvalDate
                                    ).toLocaleDateString()
                                  : "-"}
                              </td>
                              <td className="px-4 py-4 max-w-xs text-gray-600 truncate">
                                {indent.remarks || "-"}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={
                            Object.values(columnVisibility).filter(Boolean)
                              .length + (activeTab === "history" ? 4 : 1)
                          }
                          className="px-6 py-6 text-center text-gray-500"
                        >
                          No {activeTab === "pending" ? "pending" : "history"}{" "}
                          indents found matching your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-4 lg:hidden">
            {filteredIndents.length > 0 ? (
              filteredIndents.map((indent, index) => (
                <div
                  key={`${indent.indentNumber}-${indent.traderName}-${indent.shopName}-${index}`}
                  className="p-4 space-y-3 bg-white rounded-xl border border-gray-200 shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {indent.indentNumber}
                      </div>
                      <div className="text-xs text-gray-500">
                        {indent.skuCode}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        indent.approved === "Yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {indent.approved}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Item Name</div>
                      <div className="font-medium text-gray-900">
                        {indent.itemName}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Brand</div>
                      <div className="font-medium text-gray-900">
                        {indent.brandName}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Trader</div>
                      <div className="font-medium text-gray-900">
                        {indent.traderName || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Shop</div>
                      <div className="font-medium text-gray-900">
                        {indent.shopName}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Closing Stock</div>
                      <div className="font-medium text-gray-900">
                        {indent.closingStock}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Reorder (Pcs)</div>
                      <div className="font-medium text-gray-900">
                        {indent.reorderQuantityPcs}
                      </div>
                    </div>
                  </div>

                  {activeTab === "history" && indent.shopManagerStatus && (
                    <div className="pt-3 space-y-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Shop Manager Status:
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            indent.shopManagerStatus === "Approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {indent.shopManagerStatus}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Approval Date:</span>
                        <span className="font-medium text-gray-900">
                          {indent.approvalDate
                            ? new Date(indent.approvalDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                      {indent.remarks && (
                        <div className="text-xs">
                          <span className="text-gray-500">Remarks:</span>
                          <p className="mt-1 font-medium text-gray-900">
                            {indent.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "pending" && (
                    <button
                      onClick={() => handleApprove(indent)}
                      className="flex gap-2 justify-center items-center px-4 py-2 w-full text-sm font-medium text-white bg-green-600 rounded-lg transition-colors duration-200 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white rounded-xl">
                <p className="text-gray-500">
                  No {activeTab === "pending" ? "pending" : "history"} indents
                  found matching your search
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showModal && selectedIndent && (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex sticky top-0 justify-between items-center p-4 bg-white rounded-t-xl border-b border-gray-200 md:p-6">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                Approve Indent
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedIndent(null);
                  setShopManagerStatus("Approved");
                  setRemarks("");
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4 md:p-6">
              {/* Indent Number - Read Only */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Indent Number
                </label>
                <input
                  type="text"
                  value={selectedIndent.indentNumber}
                  readOnly
                  className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300"
                />
              </div>

              {/* SKU Code - Read Only */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  SKU Code
                </label>
                <input
                  type="text"
                  value={selectedIndent.skuCode}
                  readOnly
                  className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300"
                />
              </div>

              {/* Item Name - Read Only */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Item Name
                </label>
                <input
                  type="text"
                  value={selectedIndent.itemName}
                  readOnly
                  className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300"
                />
              </div>

              {/* Brand Name - Read Only */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={selectedIndent.brandName}
                  readOnly
                  className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300"
                />
              </div>

              {/* Reorder Quantity (Pcs) - Read Only */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Reorder Quantity (Pcs)
                </label>
                <input
                  type="text"
                  value={selectedIndent.reorderQuantityPcs}
                  readOnly
                  className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300"
                />
              </div>

              {/* Reorder Quantity (Box) - Read Only */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Reorder Quantity (Box)
                </label>
                <input
                  type="text"
                  value={selectedIndent.reorderQuantityBox}
                  readOnly
                  className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300"
                />
              </div>

              {/* Shop Manager Status - Dropdown */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Shop Manager Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={shopManagerStatus}
                  onChange={(e) => setShopManagerStatus(e.target.value)}
                  className="px-4 py-2 w-full text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Approved">Approved</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>

              {/* Approval Name - Dropdown */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Approval Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedApprovalName}
                  onChange={(e) => setSelectedApprovalName(e.target.value)}
                  className="px-4 py-2 w-full text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Approval Name</option>
                  {approvalNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks - Input */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any remarks or comments..."
                  rows={4}
                  className="px-4 py-2 w-full text-sm rounded-lg border border-gray-300 outline-none resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedIndent(null);
                  setShopManagerStatus("Approved");
                  setRemarks("");
                }}
                className="px-6 py-2 w-full font-medium text-gray-700 rounded-lg border border-gray-300 transition-colors duration-200 sm:w-auto hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApproval}
                className="flex gap-2 justify-center items-center px-6 py-2 w-full font-medium text-white bg-blue-600 rounded-lg transition-colors duration-200 sm:w-auto hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;
