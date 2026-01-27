import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { indentService, IndentItem } from "../services/indentService";
import { storageUtils } from "../utils/storage";

interface ColumnVisibility {
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
  sizeML: boolean;
  bottlesPerCase: boolean;
  reorderQuantityBox: boolean;
  shopName: boolean;
  orderBy: boolean;
}

// Helper to round numbers
const formatNumber = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === "") return "-";
  const num = Number(value);
  return isNaN(num) ? value : Math.round(num);
};

export const IndentPage: React.FC = () => {
  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterField, setFilterField] = useState<'itemName' | 'shopName' | 'traderName' | ''>('');
  const [filterValue, setFilterValue] = useState("");
  const [filterOptions, setFilterOptions] = useState<string[]>([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = React.useRef<HTMLDivElement | null>(null);
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
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
    sizeML: true,
    bottlesPerCase: true,
    reorderQuantityBox: true,
    shopName: true,
    orderBy: true,
  });

  /* ------------------------------------------------------------------ */
  /*  FETCH INDENTS                                                     */
  /* ------------------------------------------------------------------ */
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
        const filtered =
          allowedShops
            ? data.filter((i: any) =>
                allowedShops.includes((i.shopName || "").trim().toLowerCase())
              )
            : data;
        setIndents(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load indents");
        console.error("Error fetching indents:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIndents();
  }, []);

  // Update filter options when filter field or indents change
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

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (filterRef.current && target && !filterRef.current.contains(target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  COLUMN LABELS & TOGGLE                                            */
  /* ------------------------------------------------------------------ */
  const columnLabels: Record<keyof ColumnVisibility, string> = {
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
    liquor: "Liquor size",
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

  /* ------------------------------------------------------------------ */
  /*  FILTER BY SEARCH TERM                                             */
  /* ------------------------------------------------------------------ */
  const filteredIndents = useMemo(() => {
    return indents.filter((indent) => {
      const term = searchTerm.toLowerCase();
      const searchMatch = (
        indent.indentNumber.toLowerCase().includes(term) ||
        indent.skuCode.toLowerCase().includes(term) ||
        indent.itemName.toLowerCase().includes(term) ||
        indent.brandName.toLowerCase().includes(term) ||
        indent.traderName.toLowerCase().includes(term) ||
        indent.liquor.toLowerCase().includes(term) ||
        indent.shopName.toLowerCase().includes(term) ||
        indent.orderBy.toLowerCase().includes(term)
      );

      let fieldMatch = true;
      if (filterField && (filterValue.trim() || filterSearch.trim())) {
        const filterText = (filterValue.trim() || filterSearch.trim()).toLowerCase();
        const fieldValue = indent[filterField]?.toLowerCase() || "";
        fieldMatch = fieldValue.includes(filterText);
      }

      return searchMatch && fieldMatch;
    });
  }, [indents, searchTerm, filterField, filterValue, filterSearch]);

  /* ------------------------------------------------------------------ */
  /*  UI                                                                */
  /* ------------------------------------------------------------------ */
  return (
    <div className="p-4 md:p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 justify-between items-start mb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Indent Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            View all generated indents
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

      {/* Main content – only when NOT loading & NOT error */}
      {!loading && !error && (
        <>
          {/* Toolbar – Search + Column filter */}
          <div className="flex sticky top-0 z-20 flex-col gap-3 px-4 pt-3 pb-3 -mx-4 -mt-3 mb-4 bg-gray-50 sm:flex-row md:-mx-6 md:px-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by indent, SKU, item, brand, trader, shop..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pr-3 pl-9 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex gap-2 items-center">
              <div className="relative">
                <select
                  value={filterField}
                  onChange={(e) =>
                    setFilterField(
                      e.target.value as "itemName" | "shopName" | "traderName" | ""
                    )
                  }
                  className="px-3 py-2 pr-8 w-40 text-sm bg-white rounded-lg border border-gray-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Filter by...</option>
                  <option value="itemName">Item Name</option>
                  <option value="shopName">Shop Name</option>
                  <option value="traderName">Trader Name</option>
                </select>
                <div className="absolute right-2 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {filterField && (
                <div ref={filterRef} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search ${filterField.replace("Name", "")}...`}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      onFocus={() => setShowFilterDropdown(true)}
                      onClick={() => setShowFilterDropdown(true)}
                      className="px-3 py-2 pr-8 w-40 text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute right-2 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2">
                      <Search className="w-4 h-4" />
                    </div>
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
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Dropdown with searchable options */}
                  {showFilterDropdown && filterOptions.length > 0 && (
                    <div className="overflow-auto absolute z-50 mt-1 w-64 max-h-60 bg-white rounded-lg border border-gray-200 shadow-lg">
                      {filterOptions
                        .filter((option: string) =>
                          option.toLowerCase().includes(filterSearch.toLowerCase())
                        )
                        .map((option: string) => (
                          <div
                            key={option}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                              filterValue === option ? "bg-blue-100" : ""
                            }`}
                            onClick={() => {
                              setFilterValue(option);
                              setFilterSearch(option);
                              setShowFilterDropdown(false);
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

            {/* Column filter button */}
            <div className="relative">
              <button
                onClick={() => setShowColumnFilter((v) => !v)}
                className="flex gap-2 items-center px-3 py-2 text-sm text-white whitespace-nowrap bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Filter className="w-4 h-4" />
                Columns
              </button>

              {/* Dropdown */}
              {showColumnFilter && (
                <>
                  {/* Mobile backdrop */}
                  <div
                    className="fixed inset-0 z-30 bg-black bg-opacity-25 sm:hidden"
                    onClick={() => setShowColumnFilter(false)}
                  />
                  <div className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 bottom-0 sm:bottom-auto top-auto sm:top-full sm:mt-2 w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 z-40 max-h-[70vh] sm:max-h-96 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        Show/Hide Columns
                      </h3>
                      <button
                        onClick={() => setShowColumnFilter(false)}
                        className="text-gray-500 hover:text-gray-700 sm:hidden"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="overflow-y-auto p-4">
                      <div className="space-y-1">
                        {Object.entries(columnLabels).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex gap-2 items-center p-2 rounded cursor-pointer hover:bg-gray-50"
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

          {/* ---------- DESKTOP TABLE ---------- */}
          <div className="hidden overflow-hidden bg-white rounded-xl border border-gray-200 shadow-lg lg:block">
            <div className="overflow-x-auto bg-white">
              <div className="max-h-[70vh] overflow-y-auto bg-white">
                <table className="w-full min-w-full text-sm divide-y divide-gray-200 bg-white">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      {Object.entries(columnVisibility).map(
                        ([col, visible]) =>
                          visible && (
                            <th
                              key={col}
                              className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap"
                            >
                              {columnLabels[col as keyof ColumnVisibility]}
                            </th>
                          )
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIndents.length > 0 ? (
                      filteredIndents.map((indent) => (
                        <tr
                          key={indent.id}
                          className="transition-colors hover:bg-gray-50"
                        >
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
                              {formatNumber(indent.moq)}
                            </td>
                          )}
                          {columnVisibility.maxLevel && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {formatNumber(indent.maxLevel)}
                            </td>
                          )}
                          {columnVisibility.closingStock && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {formatNumber(indent.closingStock)}
                            </td>
                          )}
                          {columnVisibility.reorderQuantityPcs && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {formatNumber(indent.reorderQuantityPcs)}
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
                              {indent.traderName}
                            </td>
                          )}
                          {columnVisibility.liquor && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {indent.liquor}
                            </td>
                          )}
                          {columnVisibility.sizeML && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {formatNumber(indent.sizeML)}
                            </td>
                          )}
                          {columnVisibility.bottlesPerCase && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {formatNumber(indent.bottlesPerCase)}
                            </td>
                          )}
                          {columnVisibility.reorderQuantityBox && (
                            <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                              {formatNumber(indent.reorderQuantityBox)}
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={
                            Object.values(columnVisibility).filter(Boolean)
                              .length
                          }
                          className="px-6 py-6 text-center text-gray-500"
                        >
                          No indents found matching your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ---------- MOBILE CARD VIEW ---------- */}
          <div className="space-y-4 lg:hidden">
            {filteredIndents.length > 0 ? (
              filteredIndents.map((indent) => (
                <div
                  key={indent.id}
                  className="p-4 bg-white rounded-xl border border-gray-200 shadow-md"
                >
                  <div className="flex justify-between items-start mb-3">
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
                    {columnVisibility.itemName && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">Item Name</div>
                          <div className="font-medium text-gray-900">
                            {indent.itemName}
                          </div>
                        </div>
                      </>
                    )}
                    {columnVisibility.brandName && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">Brand</div>
                          <div className="font-medium text-gray-900">
                            {indent.brandName}
                          </div>
                        </div>
                      </>
                    )}
                    {columnVisibility.traderName && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">Trader</div>
                          <div className="font-medium text-gray-900">
                            {indent.traderName}
                          </div>
                        </div>
                      </>
                    )}
                    {columnVisibility.shopName && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">Shop</div>
                          <div className="font-medium text-gray-900">
                            {indent.shopName}
                          </div>
                        </div>
                      </>
                    )}
                    {columnVisibility.closingStock && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">
                            Closing Stock
                          </div>
                          <div className="font-medium text-gray-900">
                            {formatNumber(indent.closingStock)}
                          </div>
                        </div>
                      </>
                    )}
                    {columnVisibility.reorderQuantityPcs && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">
                            Reorder (Pcs)
                          </div>
                          <div className="font-medium text-gray-900">
                            {formatNumber(indent.reorderQuantityPcs)}
                          </div>
                        </div>
                      </>
                    )}
                    {columnVisibility.sizeML && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">Size (ML)</div>
                          <div className="font-medium text-gray-900">
                            {formatNumber(indent.sizeML)}
                          </div>
                        </div>
                      </>
                    )}
                    {columnVisibility.orderBy && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">Order By</div>
                          <div className="font-medium text-gray-900">
                            {indent.orderBy}
                          </div>
                        </div>
                      </>
                    )}
                    {/* Add any other column you want to show on mobile here */}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">
                No indents found matching your search
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default IndentPage;
