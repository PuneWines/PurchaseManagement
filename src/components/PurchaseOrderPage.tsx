import React, { useState, useEffect } from "react";
import { Filter, X, Send, Eye, Truck } from "lucide-react";
import { format } from "date-fns";
import { indentService } from "../services/indentService";
import { storageUtils } from "../utils/storage";
import { generatePOPDF } from "../utils/pdfGenerator";
import { SuccessAnimation } from "./SuccessAnimation";

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

// Extend IndentItem to include optional PO fields
interface POIndentItem {
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
  sizeML: number;
  bottlesPerCase: number;
  reorderQuantityBox: number;
  shopName: string;
  orderBy: string;
  shopManagerStatus?: string;
  remarks?: string;
  approvalDate?: string;
  poNumber?: string;
  transporterName?: string;
  poGeneratedAt?: string;
  poCopyLink?: string;
  remarksFrontend?: string;
  poQty?: number;
  isPO?: boolean;
  actualTimestamp1?: string;
  actualTimestamp2?: string;
  actualTimestamp3?: string;
  _rowIndex?: number;
}

interface ColumnVisibility {
  action: boolean;
  indentNumber: boolean;
  approvalDate: boolean;        // ← Added here
  skuCode: boolean;
  itemName: boolean;
  brandName: boolean;
  moq: boolean;
  maxLevel: boolean;
  closingStock: boolean;
  reorderQuantityPcs: boolean;
  approved: boolean;
  traderName: boolean;
  sizeML: boolean;
  reorderQuantityBox: boolean;
  shopName: boolean;
  status: boolean;
  remarks: boolean;
}

interface POGenerateModalProps {
  indent: POIndentItem;
  onClose: () => void;
  onConfirm: (
    transporterName: string,
    remarks: string,
    items: POIndentItem[],
    companyName: string
  ) => void;
  indents: POIndentItem[];
  isSubmitting?: boolean;
}

const POGenerateModal: React.FC<POGenerateModalProps> = ({
  indent,
  onClose,
  onConfirm,
  indents,
  isSubmitting = false,
}) => {
  const today = new Date();

  // Generate sequential PO number instead of random
  const getNextPONumber = () => {
    const existingNumbers = indents
      .map((i) => i.poNumber)
      .filter(Boolean)
      .map((po) => {
        const match = po?.match(/PO-(\d{4})-(\d{3})/);
        return match ? parseInt(match[2], 10) : 0;
      });

    const highestNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = (highestNumber + 1).toString().padStart(3, "0");
    return `PO-${new Date().getFullYear()}-${nextNumber}`;
  };

  const poNumber = getNextPONumber();

  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (indent) {
      setCompanyName(indent.shopName);
    }
  }, [indent]);

  const [tradeName, setTradeName] = useState(indent.traderName || "");


  const [transporterNames, setTransporterNames] = useState<string[]>([
    "wait loading",
  ]);
  const [transporterName, setTransporterName] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const transporters = await indentService.getTransporterNames();
        setTransporterNames(transporters);
        console.log("Fetched transporterNames:", transporters);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMaster();
  }, []);

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [localIndents, setLocalIndents] = useState<POIndentItem[]>(indents);

  const updateShopName = (id: string, newShopName: string) => {
    setLocalIndents((prevIndents: POIndentItem[]) =>
      prevIndents.map((item: POIndentItem) =>
        item.id === id ? { ...item, shopName: newShopName } : item
      )
    );
  };

  const traderIndents = localIndents.filter((i) => i.traderName === tradeName);

  const uniqueTraderNames = [
    ...new Set(
      localIndents
        .filter(
          (i) =>
            i.shopManagerStatus === "Approved" && !i.transporterName?.trim()
        )
        .map((i) => i.traderName)
        .filter(Boolean)
    ),
  ];

  const visibleTraderIndents = traderIndents.filter(
    (i) =>
      !deletedIds.has(i.id) &&
      i.shopManagerStatus === "Approved" &&
      !i.transporterName?.trim()
  );

  // Always include the selected indent, even if it doesn't match the filters
  const finalVisibleIndents =
    indent && !visibleTraderIndents.find((i) => i.id === indent.id)
      ? [indent, ...visibleTraderIndents]
      : visibleTraderIndents;

  const uniqueShopNames = Array.from(
    new Set(finalVisibleIndents.map((i) => i.shopName?.trim()).filter(Boolean))
  );
  const displayHeader = uniqueShopNames.length > 0 ? uniqueShopNames.join(" | ") : (companyName || indent.shopName);

  return (
    <div className="flex overflow-y-auto fixed inset-0 z-50 justify-center items-center p-2 bg-black bg-opacity-50 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[95vh] overflow-y-auto print:max-w-none print:shadow-none">
        <div className="p-3 sm:p-6 print:p-0">
          <header className="mb-4 sm:mb-8 text-center bg-[#1a2a44] py-4 sm:py-6 text-white print:bg-[#1a2a44]">
            <h2 className="text-lg sm:text-2xl font-bold text-white">
              {displayHeader}
            </h2>
          </header>

          {/* Top Row */}
          <div className="flex flex-col gap-4 mb-8 md:flex-row md:justify-between">
            <div>
              <p className="font-semibold">PO NUMBER</p>
              <p className="text-2xl font-bold">{poNumber}</p>
              <p className="text-sm text-gray-600">
                Date Issued: {format(today, "dd MMM yyyy")}
              </p>
            </div>

            <div className="text-right">
              <div className="flex gap-2 justify-end items-center">
                <span className="font-semibold">Trade Name:</span>
                <select
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="px-2 py-1 text-lg font-medium rounded border border-gray-300"
                >
                  <option value="">Select Trader</option>
                  {uniqueTraderNames.map((name: string) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* All Indents for Selected Trader */}
          {finalVisibleIndents.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold">
                All Products for {tradeName}
              </h3>
              <div className="overflow-x-auto w-full">
                <table className="overflow-x-auto w-full bg-pink-100 border border-gray-300 border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left border border-gray-300">
                        S.NO
                      </th>
                      <th className="px-4 py-2 text-left border border-gray-300">
                        ITEM NAME
                      </th>
                      <th className="px-4 py-2 text-left border border-gray-300">
                        SHOP NAME
                      </th>
                      <th className="px-4 py-2 text-left border border-gray-300">
                        Quantity (Pcs)
                      </th>
                      <th className="px-4 py-2 text-left border border-gray-300">
                        QTY (BOX)
                      </th>
                      <th className="px-4 py-2 text-left border border-gray-300">
                        SIZE (ML)
                      </th>
                      <th className="px-4 py-2 text-left border border-gray-300">
                        Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalVisibleIndents.map((i, index) => (
                      <tr
                        key={`${i.indentNumber}-${i.traderName}-${i.shopName}-${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-2 border border-gray-300">
                          {i.indentNumber}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          {i.itemName}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          <input
                            type="text"
                            value={i.shopName}
                            onChange={(e) =>
                              updateShopName(i.id, e.target.value)
                            }
                            className="px-2 py-1 w-full rounded border border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          {i.bottlesPerCase && i.reorderQuantityBox
                            ? i.bottlesPerCase * i.reorderQuantityBox
                            : i.reorderQuantityPcs || 0}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          {i.reorderQuantityBox}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          {i.sizeML}
                        </td>
                        <td className="px-4 py-2 border border-gray-300">
                          <button
                            onClick={() =>
                              setDeletedIds((prev: Set<string>) =>
                                new Set(prev).add(i.id)
                              )
                            }
                            className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="px-6 pb-6 border-t print:hidden">
            <div className="mt-6">
              <label className="flex gap-2 items-center mb-2 text-sm font-medium text-gray-700">
                <Truck className="w-4 h-4" />
                Transporter Name *
              </label>
              <select
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Transporter</option>
                {transporterNames.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6">
              <label className="flex gap-2 items-center mb-2 text-sm font-medium text-gray-700">
                Remarks1
              </label>
              <input
                type="text"
                placeholder="Enter your remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  onConfirm(
                    transporterName,
                    remarks,
                    finalVisibleIndents,
                    companyName
                  )
                }
                disabled={!transporterName.trim() || isSubmitting}
                className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                  !transporterName.trim() || isSubmitting
                    ? "bg-gray-400 cursor-not-allowed text-gray-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  "Generate & Send PO"
                )}
              </button>
            </div>
            <div className="flex gap-10 justify-center items-center mt-6">
              <div className="text-sm text-gray-500">Powered By Botivate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              .print\\:max-w-none, .print\\:max-w-none * { visibility: visible; }
              .print\\:max-w-none { position: absolute; left: 0; top: 0; width: 100%; }
              .print\\:bg-\\[\\#1a2a44\\] { background-color: #1a2a44 !important; -webkit-print-color-adjust: exact; }
              .print\\:shadow-none { box-shadow: none !important; }
            }
            ::-webkit-scrollbar { display: none; }
            scrollbar-width: none;
            -ms-overflow-style: none;
          `,
        }}
      />
    </div>
  );
};

// Main Component
export const PurchaseOrderPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<POIndentItem | null>(
    null
  );
  const [indents, setIndents] = useState<POIndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [columnVisibility] = useState<ColumnVisibility>({
    action: true,
    indentNumber: true,
    approvalDate: true,          // ← Now visible by default
    skuCode: true,
    itemName: true,
    brandName: true,
    moq: true,
    maxLevel: true,
    closingStock: true,
    reorderQuantityPcs: true,
    approved: true,
    traderName: true,
    sizeML: true,
    reorderQuantityBox: true,
    shopName: true,
    status: true,
    remarks: true,
  });

  // Get the next PO number in sequence
  const getNextPONumber = () => {
    const existingNumbers = indents
      .map((i) => i.poNumber)
      .filter(Boolean)
      .map((po) => {
        const match = po?.match(/PO-(\d{4})-(\d{3})/);
        return match ? parseInt(match[2], 10) : 0;
      });

    const highestNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = (highestNumber + 1).toString().padStart(3, "0");
    return `PO-${new Date().getFullYear()}-${nextNumber}`;
  };

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
          ? (data as POIndentItem[]).filter((i: POIndentItem) =>
            allowedShops.includes((i.shopName || "").trim().toLowerCase())
          )
          : (data as POIndentItem[]);
        setIndents(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load indents");
      } finally {
        setLoading(false);
      }
    };
    fetchIndents();
  }, []);

  useEffect(() => {
    const duplicates = indents
      .map((i) => i.id)
      .filter((id, idx, arr) => arr.indexOf(id) !== idx);
    if (duplicates.length > 0) console.warn("Duplicate IDs:", duplicates);
  }, [indents]);

  // Helper
  const hasValue = (s?: string) => typeof s === "string" && s.trim() !== "";

  // PO Logic: Indent is "pending" if approved but no PO generated
  const basePendingIndents = indents.filter(
    (i) => i.shopManagerStatus === "Approved" && !hasValue(i.transporterName)
  );

  const baseHistoryIndents = indents.filter(
    (i) => i.shopManagerStatus === "Approved" && hasValue(i.transporterName)
  );

  // Apply search and filter
  const filterIndents = (indents: POIndentItem[]) => {
    return indents.filter((indent) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        indent.indentNumber.toLowerCase().includes(searchLower) ||
        indent.skuCode.toLowerCase().includes(searchLower) ||
        indent.itemName.toLowerCase().includes(searchLower) ||
        indent.brandName.toLowerCase().includes(searchLower) ||
        indent.traderName.toLowerCase().includes(searchLower) ||
        indent.shopName.toLowerCase().includes(searchLower) ||
        indent.orderBy.toLowerCase().includes(searchLower)
      );
    });
  };

  const pendingIndents = filterIndents(basePendingIndents);
  const historyIndents = filterIndents(baseHistoryIndents);

  const handleGeneratePO = (indent: POIndentItem) => {
    setSelectedIndent(indent);
    setShowModal(true);
  };

  const handleViewHistory = (indent: POIndentItem) => {
    setSelectedIndent(indent);
    setShowHistoryModal(true);
  };

  const handleSubmitPO = async (
    transporterName: string,
    remarks: string,
    items: POIndentItem[],
    companyName: string
  ) => {
    if (!selectedIndent) return;

    setIsSubmitting(true);
    setErrorMessage("");
    console.log("✅ Validation passed, preparing backend update");

    try {
      const poNumberForSubmit = getNextPONumber();
      let poCopyLink = "";

      // 1. Generate PDF if possible
      const tradeName = selectedIndent.traderName;
      const poData = {
        poNumber: poNumberForSubmit,
        companyName,
        tradeName,
        transporterName: transporterName.trim(),
        items: items.map((i: POIndentItem) => ({
          indentNumber: i.indentNumber,
          itemName: i.itemName,
          reorderQuantityPcs: i.reorderQuantityPcs.toString(),
          reorderQuantityBox: i.reorderQuantityBox?.toString() || "0",
          sizeML: i.sizeML.toString(),
        })),
        remarks: remarks.trim() || "Generated via system",
      };

      try {
        poCopyLink = await generatePOPDF(poData);
        if (poCopyLink && poCopyLink.includes("uc?export=download&id=")) {
          const fileId = poCopyLink.split("id=")[1];
          poCopyLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
        }
        console.log("✅ PDF generated and uploaded, viewUrl:", poCopyLink);
      } catch (error) {
        console.error("Error generating PDF:", error);
      }

      // 2. Prepare common updates
      const currentTime = new Date().toISOString();
      const currentDate = formatTimestamp(new Date());

      // 3. Update backend for each item
      const updatePromises = items.map(async (item) => {
        const itemUpdate = {
          transporterName: transporterName.trim(),
          poNumber: poNumberForSubmit,
          poGeneratedAt: currentTime,
          actualTimestamp1: currentDate,
          actualTimestamp2: currentDate,
          actualTimestamp3: currentDate,
          poCopyLink: poCopyLink,
          remarksFrontend: remarks.trim() || "",
          poQty: item.reorderQuantityPcs,
          isPO: true,
          shopName: item.shopName,
        };

        try {
          await indentService.updateIndent(
            item.indentNumber,
            itemUpdate,
            { skuCode: item.skuCode, itemName: item.itemName },
            item._rowIndex
          );
          return { id: item.id, ...itemUpdate };
        } catch (error) {
          console.error(`❌ Error saving indent ${item.indentNumber}:`, error);
          throw error;
        }
      });

      const updateResults = await Promise.all(updatePromises);

      // 4. Update UI state only after all backend updates succeed
      setIndents((prev) =>
        prev.map((indent) => {
          const result = updateResults.find((r) => r.id === indent.id);
          return result ? { ...indent, ...result } : indent;
        })
      );

      setShowModal(false);
      setSelectedIndent(null);
      setShowSuccessAnimation(true);
      setActiveTab("history");

    } catch (error) {
      console.error("Error in PO submission:", error);
      setErrorMessage("Failed to generate PO. Please try again.");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TableRow: React.FC<{ indent: POIndentItem }> = ({ indent }) => (
    <tr className="hover:bg-gray-50">
      {columnVisibility.action && (
        <td className="px-6 py-4">
          {activeTab === "pending" ? (
            <button
              onClick={() => handleGeneratePO(indent)}
              className="flex gap-1 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              Generate PO
            </button>
          ) : (
            <button
              onClick={() => handleViewHistory(indent)}
              className="flex gap-1 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
          )}
        </td>
      )}
      {columnVisibility.indentNumber && (
        <td className="px-6 py-4 font-medium">{indent.indentNumber}</td>
      )}
      {columnVisibility.approvalDate && (
        <td className="px-6 py-4">
          {indent.approvalDate
            ? format(new Date(indent.approvalDate), "dd/MM/yyyy")
            : "-"}
        </td>
      )}
      {columnVisibility.skuCode && (
        <td className="px-6 py-4">{indent.skuCode}</td>
      )}
      {columnVisibility.itemName && (
        <td className="px-6 py-4 min-w-[200px]">{indent.itemName}</td>
      )}
      {columnVisibility.brandName && (
        <td className="px-6 py-4 min-w-[150px]">{indent.brandName}</td>
      )}
      {columnVisibility.moq && <td className="px-6 py-4">{indent.moq}</td>}
      {columnVisibility.maxLevel && (
        <td className="px-6 py-4">{indent.maxLevel}</td>
      )}
      {columnVisibility.closingStock && (
        <td className="px-6 py-4">{indent.closingStock}</td>
      )}
      {columnVisibility.reorderQuantityPcs && (
        <td className="px-6 py-4">
          {indent.bottlesPerCase && indent.reorderQuantityBox
            ? indent.bottlesPerCase * indent.reorderQuantityBox
            : indent.reorderQuantityPcs || 0}
        </td>
      )}
      {columnVisibility.approved && (
        <td className="px-6 py-4">
          <span
            className={`px-2 py-1 text-xs rounded-full ${indent.approved === "Yes"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
              }`}
          >
            {indent.approved}
          </span>
        </td>
      )}
      {columnVisibility.traderName && (
        <td className="px-6 py-4 min-w-[150px]">{indent.traderName}</td>
      )}
      {columnVisibility.sizeML && (
        <td className="px-6 py-4">{indent.sizeML}</td>
      )}
      {columnVisibility.reorderQuantityBox && (
        <td className="px-6 py-4">{indent.reorderQuantityBox}</td>
      )}
      {columnVisibility.shopName && (
        <td className="px-6 py-4 min-w-[150px]">{indent.shopName}</td>
      )}
      {columnVisibility.status && (
        <td className="px-6 py-4 min-w-[150px]">
          <span
            className={`px-2 py-1 text-xs rounded-full ${indent.shopManagerStatus === "Approved"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
              }`}
          >
            {indent.shopManagerStatus || "Pending"}
          </span>
        </td>
      )}
      {columnVisibility.remarks && (
        <td className="px-6 py-4 min-w-[200px]">{indent.remarks || "-"}</td>
      )}
    </tr>
  );

  return (
    <div className="p-4 min-h-screen bg-gray-50 md:p-6 w-full lg:w-[calc(100vw-279px)] overflow-hidden ">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          PO Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          Generate and manage Purchase Orders
        </p>
      </div>

      {loading && (
        <div className="mb-6 text-center">
          <div className="inline-block w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin" />
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {!loading && !error && (
        <div>
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px space-x-4 md:space-x-8">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === "pending"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  Pending ({pendingIndents.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === "history"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  History ({historyIndents.length})
                </button>
              </nav>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search indents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    {columnVisibility.action && <th className="px-6 py-3">Action</th>}
                    {columnVisibility.indentNumber && <th className="px-6 py-3">Indent #</th>}
                    {columnVisibility.approvalDate && <th className="px-6 py-3">Appr. Date</th>}
                    {columnVisibility.skuCode && <th className="px-6 py-3">SKU</th>}
                    {columnVisibility.itemName && <th className="px-6 py-3 min-w-[200px]">Item</th>}
                    {columnVisibility.brandName && <th className="px-6 py-3">Brand</th>}
                    {columnVisibility.moq && <th className="px-6 py-3">MOQ</th>}
                    {columnVisibility.maxLevel && <th className="px-6 py-3">Max</th>}
                    {columnVisibility.closingStock && <th className="px-6 py-3">Stock</th>}
                    {columnVisibility.reorderQuantityPcs && <th className="px-6 py-3">Qty (Pcs)</th>}
                    {columnVisibility.approved && <th className="px-6 py-3">Approved</th>}
                    {columnVisibility.traderName && <th className="px-6 py-3">Trader</th>}
                    {columnVisibility.sizeML && <th className="px-6 py-3">Size</th>}
                    {columnVisibility.reorderQuantityBox && <th className="px-6 py-3">Box</th>}
                    {columnVisibility.shopName && <th className="px-6 py-3">Shop</th>}
                    {columnVisibility.status && <th className="px-6 py-3">Status</th>}
                    {columnVisibility.remarks && <th className="px-6 py-3">Remarks</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeTab === "pending"
                    ? pendingIndents.map((indent) => (
                      <TableRow key={indent.id} indent={indent} />
                    ))
                    : historyIndents.map((indent) => (
                      <TableRow key={indent.id} indent={indent} />
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {showModal && selectedIndent && (
            <POGenerateModal
              indent={selectedIndent}
              onClose={() => {
                setShowModal(false);
                setSelectedIndent(null);
              }}
              onConfirm={handleSubmitPO}
              indents={indents}
              isSubmitting={isSubmitting}
            />
          )}

          {showHistoryModal && selectedIndent && (
            <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-bold">PO Details</h2>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>
                          <strong>PO #:</strong> {selectedIndent.poNumber || "N/A"}
                        </span>
                        <span>
                          <strong>Transporter:</strong>{" "}
                          {selectedIndent.transporterName || "N/A"}
                        </span>
                        {selectedIndent.poCopyLink && (
                          <a
                            href={selectedIndent.poCopyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 underline hover:text-blue-800"
                          >
                            View PO Copy
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowHistoryModal(false);
                        setSelectedIndent(null);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Generated At</p>
                        <p className="font-medium">
                          {selectedIndent.poGeneratedAt
                            ? format(new Date(selectedIndent.poGeneratedAt), "dd MMM yyyy HH:mm")
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Quantity (Pcs)</p>
                        <p className="font-medium">{selectedIndent.poQty || selectedIndent.reorderQuantityPcs}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Remarks</h3>
                      <p className="p-3 bg-gray-50 rounded italic text-gray-600">
                        {selectedIndent.remarksFrontend || "No remarks provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <SuccessAnimation
        visible={showSuccessAnimation}
        message="PO Generated Successfully!"
        onComplete={() => setShowSuccessAnimation(false)}
      />
    </div>
  );
};

export default PurchaseOrderPage;