import React, { useState, useEffect } from "react";
import { Filter, X, Send, Eye, Truck } from "lucide-react";
import { format } from "date-fns";
import { indentService } from "../services/indentService";
import { storageUtils } from "../utils/storage";
import { generatePOPDF } from "../utils/pdfGenerator";

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
}

const POGenerateModal: React.FC<POGenerateModalProps> = ({
  indent,
  onClose,
  onConfirm,
  indents,
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

  const [masterCompanies, setMasterCompanies] = useState<string[]>([
    "THE LIQUOR STORY",
  ]);
  const [transporterNames, setTransporterNames] = useState<string[]>([
    "wait loading",
  ]);
  const [transporterName, setTransporterName] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [masterData, transporters] = await Promise.all([
          indentService.getMasterCompanies(),
          indentService.getTransporterNames(),
        ]);
        setMasterCompanies(masterData);
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

  return (
    <div className="flex overflow-y-auto fixed inset-0 z-50 justify-center items-center p-2 bg-black bg-opacity-50 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[95vh] overflow-y-auto print:max-w-none print:shadow-none">
        <div className="p-3 sm:p-6 print:p-0">
          <header className="mb-4 sm:mb-8 text-center bg-[#1a2a44] py-4 sm:py-6 text-white print:bg-[#1a2a44]">
            <select
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="text-lg sm:text-2xl font-bold text-white bg-transparent border-none outline-none [&>option]:text-black w-full sm:w-auto px-2 text-center"
            >
              {masterCompanies.map((name: string) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
                        QTY(PCS)
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
                          {i.reorderQuantityPcs}
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
                disabled={!transporterName.trim()}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate & Send PO
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
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
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

  const columnLabels = {
    action: "Action",
    indentNumber: "Indent Number",
    approvalDate: "Approval Date",      // ← Added label
    skuCode: "SKU Code",
    itemName: "Item Name",
    brandName: "Brand Name",
    moq: "MOQ",
    maxLevel: "Max Level",
    closingStock: "Closing Stock",
    reorderQuantityPcs: "Reorder Quantity (Pcs)",
    approved: "Approved",
    traderName: "Trader Name",
    sizeML: "Size (ML)",
    reorderQuantityBox: "Reorder Quantity (Box)",
    shopName: "Shop Name",
    status: "Status",
    remarks: "Remarks",
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

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
      const searchMatch =
        indent.indentNumber.toLowerCase().includes(searchLower) ||
        indent.skuCode.toLowerCase().includes(searchLower) ||
        indent.itemName.toLowerCase().includes(searchLower) ||
        indent.brandName.toLowerCase().includes(searchLower) ||
        indent.traderName.toLowerCase().includes(searchLower) ||
        indent.shopName.toLowerCase().includes(searchLower) ||
        indent.orderBy.toLowerCase().includes(searchLower);

      let fieldMatch = true;
      if (filterField && filterValue.trim()) {
        const fieldValueLower = indent[filterField]?.toLowerCase() || "";
        fieldMatch = fieldValueLower.includes(filterValue.toLowerCase().trim());
      }

      // Date range filter
      let dateMatch = true;
      if (startDate || endDate) {
        const indentDate = indent.approvalDate
          ? new Date(indent.approvalDate)
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
          dateMatch = !startDate && !endDate;
        }
      }

      return searchMatch && fieldMatch && dateMatch;
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
    console.log("🚀 handleSubmitPO called with:", {
      transporterName,
      remarks,
      itemsCount: items.length,
      selectedIndent: selectedIndent?.id,
    });

    if (selectedIndent && transporterName.trim()) {
      console.log("✅ Validation passed, preparing to update indent");

      const currentTime = new Date().toISOString();
      const currentDate = formatTimestamp(new Date());
      console.log("📅 Current timestamp for PO submission:", currentTime);
      console.log("📅 Current date for actual timestamps:", currentDate);

      const poNumber = getNextPONumber();

      const updatedIndents = indents.map((i) => {
        const itemToUpdate = items.find((item) => item.id === i.id);
        if (itemToUpdate) {
          return {
            ...i,
            transporterName: transporterName.trim(),
            poNumber: poNumber,
            poGeneratedAt: currentTime,
            actualTimestamp1: currentDate,
            actualTimestamp2: currentDate,
            actualTimestamp3: currentDate,
            poCopyLink: "",
            remarksFrontend: remarks.trim() || "",
            poQty: itemToUpdate.reorderQuantityPcs,
            isPO: true,
            shopName: itemToUpdate.shopName,
          };
        }
        return i;
      });

      setIndents(updatedIndents);
      setShowModal(false);
      setSelectedIndent(null);

      setSuccessMessage(
        `PO generated successfully! Processed ${items.length} indent(s).`
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      try {
        let poCopyLink = "";
        if (poNumber) {
          const tradeName = selectedIndent.traderName;
          const poData = {
            poNumber,
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
        }

        if (poCopyLink) {
          const finalUpdatedIndents = indents.map((i) => {
            const itemToUpdate = items.find((item) => item.id === i.id);
            if (itemToUpdate) {
              return {
                ...i,
                poCopyLink,
              };
            }
            return i;
          });
          setIndents(finalUpdatedIndents);
        }

        const updatePromises = items.map(async (item) => {
          const updatedIndent = updatedIndents.find((i) => i.id === item.id);
          if (updatedIndent) {
            const finalIndent = poCopyLink
              ? { ...updatedIndent, poCopyLink, shopName: item.shopName }
              : { ...updatedIndent, shopName: item.shopName };
            try {
              await indentService.updateIndent(item.id, finalIndent);
              console.log(
                `✅ Successfully saved indent ${item.indentNumber} to Google Sheet`
              );
            } catch (error) {
              console.error(
                `❌ Error saving indent ${item.indentNumber} to Google Sheet:`,
                error
              );
            }
          }
        });

        await Promise.all(updatePromises);
        console.log("✅ All indents processed for Google Sheet update");
        window.location.reload();
      } catch (error) {
        console.error("Error in background operations:", error);
        const revertedIndents = indents.map((i) => {
          const itemToRevert = items.find((item) => item.id === i.id);
          if (itemToRevert) {
            return {
              ...i,
              transporterName: i.transporterName || "",
              poNumber: i.poNumber || "",
              poGeneratedAt: i.poGeneratedAt || "",
              actualTimestamp1: i.actualTimestamp1 || "",
              actualTimestamp2: i.actualTimestamp2 || "",
              actualTimestamp3: i.actualTimestamp3 || "",
              poCopyLink: i.poCopyLink || "",
              remarksFrontend: i.remarksFrontend || "",
              poQty: i.poQty || 0,
              isPO: false,
            };
          }
          return i;
        });
        setIndents(revertedIndents);
        setSuccessMessage("");
        setErrorMessage("Failed to generate PO. Please try again.");
        setTimeout(() => setErrorMessage(""), 5000);
      }
    } else {
      console.log("❌ Validation failed:", {
        hasSelectedIndent: !!selectedIndent,
        transporterName: transporterName?.trim(),
        transporterNameValid: transporterName?.trim()?.length > 0,
      });
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
        <td className="px-6 py-4">{indent.itemName}</td>
      )}
      {columnVisibility.brandName && (
        <td className="px-6 py-4">{indent.brandName}</td>
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
            className={`px-2 py-1 text-xs rounded-full ${
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
        <td className="px-6 py-4">{indent.traderName}</td>
      )}
      {columnVisibility.sizeML && (
        <td className="px-6 py-4">{indent.sizeML}</td>
      )}
      {columnVisibility.reorderQuantityBox && (
        <td className="px-6 py-4">{indent.reorderQuantityBox}</td>
      )}
      {columnVisibility.shopName && (
        <td className="px-6 py-4">{indent.shopName}</td>
      )}
      {columnVisibility.status && (
        <td className="px-6 py-4">
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              indent.shopManagerStatus === "Approved"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {indent.shopManagerStatus || "Pending"}
          </span>
        </td>
      )}
      {columnVisibility.remarks && (
        <td className="px-6 py-4">{indent.remarks || "-"}</td>
      )}
    </tr>
  );

  return (
    <div className="p-4 min-h-screen bg-gray-50 md:p-6 w-full lg:w-[calc(100vw-279px)] overflow-hidden ">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Generate & Send Purchase Order
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Create POs for approved indents
        </p>
      </div>

      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin" />
          <p className="mt-2 text-gray-600">Loading indents...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 mt-2 text-sm text-red-800 bg-red-100 rounded hover:bg-red-200"
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
                PO Generated Successfully
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
                Error Generating PO
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("pending")}
                className={`py-2 border-b-2 font-medium text-sm ${
                  activeTab === "pending"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Pending ({pendingIndents.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-2 border-b-2 font-medium text-sm ${
                  activeTab === "history"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                History ({historyIndents.length})
              </button>
            </nav>
          </div>

          {/* Search and Filter Section */}
          <div className="flex sticky top-0 z-20 flex-col gap-3 px-4 pt-3 pb-3 -mx-4 -mt-3 mb-4 bg-gray-50 sm:flex-row md:-mx-6 md:px-6">
            <div className="flex flex-col gap-3 w-full md:flex-row">
              {/* Search Bar */}
              <div className="relative flex-1">
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
                  placeholder="Search by indent, SKU, item, brand, trader, shop..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="py-2 pr-3 pl-9 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-col gap-2 sm:flex-row items-center">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 pr-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none sm:w-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start Date"
                  />
                </div>
                <span className="text-gray-400">to</span>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10 pr-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none sm:w-40 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="End Date"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="ml-1 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="Clear date range"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="flex gap-2">
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
                <Filter className="w-4 h-4" />
                Columns
              </button>

              {/* Column Filter Dropdown */}
              {showColumnFilter && (
                <>
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

          <div
            key={activeTab}
            className="hidden bg-white rounded-xl border border-gray-200 shadow-lg lg:block"
          >
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
                          Indent
                        </th>
                      )}
                      {/* Approval Date Header - Right after Indent */}
                      {columnVisibility.approvalDate && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Approval Date
                        </th>
                      )}
                      {columnVisibility.skuCode && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          SKU
                        </th>
                      )}
                      {columnVisibility.itemName && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Item
                        </th>
                      )}
                      {columnVisibility.brandName && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Brand
                        </th>
                      )}
                      {columnVisibility.moq && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          MOQ
                        </th>
                      )}
                      {columnVisibility.maxLevel && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Max
                        </th>
                      )}
                      {columnVisibility.closingStock && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Stock
                        </th>
                      )}
                      {columnVisibility.reorderQuantityPcs && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                         Total Quantity (Pcs)
                        </th>
                      )}
                      {columnVisibility.approved && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Approved
                        </th>
                      )}
                      {columnVisibility.traderName && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Trader
                        </th>
                      )}
                      {columnVisibility.sizeML && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Size (ML)
                        </th>
                      )}
                      {columnVisibility.reorderQuantityBox && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Reorder (Box)
                        </th>
                      )}
                      {columnVisibility.shopName && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Shop
                        </th>
                      )}
                      {columnVisibility.status && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Status
                        </th>
                      )}
                      {columnVisibility.remarks && (
                        <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                          Remarks
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(activeTab === "pending"
                      ? pendingIndents
                      : historyIndents
                    ).map((indent, index) => (
                      <TableRow
                        key={`${indent.indentNumber}-${indent.traderName}-${indent.shopName}-${index}`}
                        indent={indent}
                      />
                    ))}
                  </tbody>
                </table>

                {(activeTab === "pending" ? pendingIndents : historyIndents)
                  .length === 0 && (
                  <div className="py-12 text-center text-gray-500">
                    No {activeTab === "pending" ? "approved indents" : "POs"}{" "}
                    found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Card View - Approval Date added */}
          <div className="space-y-4 lg:hidden">
            {(activeTab === "pending" ? pendingIndents : historyIndents)
              .length > 0 ? (
              (activeTab === "pending" ? pendingIndents : historyIndents).map(
                (indent, index) => (
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
                          Approval: {indent.approvalDate
                            ? format(new Date(indent.approvalDate), "dd/MM/yyyy")
                            : "-"}
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

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                          {indent.traderName}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Shop</div>
                        <div className="font-medium text-gray-900">
                          {indent.shopName}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Status</div>
                        <div className="font-medium text-gray-900">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              indent.shopManagerStatus === "Approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {indent.shopManagerStatus || "Pending"}
                          </span>
                        </div>
                      </div>
                      {activeTab === "history" && indent.poNumber && (
                        <div>
                          <div className="text-xs text-gray-500">PO Number</div>
                          <div className="font-medium text-gray-900">
                            {indent.poNumber}
                          </div>
                        </div>
                      )}
                    </div>

                    {activeTab === "pending" && (
                      <button
                        onClick={() => handleGeneratePO(indent)}
                        className="flex gap-2 justify-center items-center px-4 py-2 w-full text-sm font-medium text-white bg-green-600 rounded-lg transition-colors duration-200 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4" />
                        Generate PO
                      </button>
                    )}

                    {activeTab === "history" && (
                      <button
                        onClick={() => handleViewHistory(indent)}
                        className="flex gap-2 justify-center items-center px-4 py-2 w-full text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    )}
                  </div>
                )
              )
            ) : (
              <div className="p-12 text-center bg-white rounded-xl">
                <p className="text-gray-500">
                  No {activeTab === "pending" ? "approved indents" : "POs"}{" "}
                  found
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* PO Modal */}
      {showModal && selectedIndent && (
        <POGenerateModal
          indent={selectedIndent}
          onClose={() => {
            setShowModal(false);
            setSelectedIndent(null);
          }}
          onConfirm={handleSubmitPO}
          indents={indents}
        />
      )}

      {/* History Modal */}
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
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(
                            selectedIndent.poCopyLink!,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                      >
                        View PDF
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Indent #:</strong> {selectedIndent.indentNumber}
                  </div>
                  <div>
                    <strong>Item:</strong> {selectedIndent.itemName}
                  </div>
                  <div>
                    <strong>Reorder (Box):</strong>{" "}
                    {selectedIndent.reorderQuantityBox}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderPage;