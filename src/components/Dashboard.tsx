import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Send,
  Package,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { indentService } from "../services/indentService";
import { storageUtils } from "../utils/storage";

interface DashboardStats {
  totalIndents: number;
  totalApprovals: number;
  totalPOSent: number;
  totalQty: number;
  totalReceived: number;
  totalPending: number;
  totalPO: number;
  totalQtyReceived: number;
  totalPOPending: number;
  totalLifting: number;
  totalLiftPending: number;
  totalPOSum: number;
  totalPOPendingCount: number;
  totalLiftingCount: number;
  totalLiftPendingCount: number;
}

interface PendingCounts {
  approvals: number;
  pos: number;
  lifting: number;
  crossChecks: number;
}

export const Dashboard: React.FC = () => {
  const [indents, setIndents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalIndents: 0,
    totalApprovals: 0,
    totalPOSent: 0,
    totalQty: 0,
    totalReceived: 0,
    totalPending: 0,
    totalPO: 0,
    totalQtyReceived: 0,
    totalPOPending: 0,
    totalLifting: 0,
    totalLiftPending: 0,
    totalPOSum: 0,
    totalPOPendingCount: 0,
    totalLiftingCount: 0,
    totalLiftPendingCount: 0,
  });
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    approvals: 0,
    pos: 0,
    lifting: 0,
    crossChecks: 0,
  });

  // -----------------------------------------------------------------
  // Optimized Data Processing with useMemo
  // -----------------------------------------------------------------
  const processedStats = useMemo(() => {
    if (!indents.length) return null;

    // Calculate stats
    const approvedFlag = (i: any) =>
      i.approved === "Yes" || i.status === "approved" || i.approvalDate;
    const poFlag = (i: any) =>
      Boolean(i.poNumber || i.poGeneratedAt || i.poCopyLink);
    const receivedFlag = (i: any) => Boolean(i.actualAL || i.receivedQty);

    const totalIndents = indents.length;
    const totalApprovals = indents.filter(approvedFlag).length;
    const totalPO = indents.filter(poFlag).length;

    // Optimized PO Pending calculation
    const totalPOPending = indents.reduce((sum: number, i: any) => {
      const receivedQty =
        i.receivedQty ||
        i["receivedQty"] ||
        i["Received Qty"] ||
        i["received_qty"] ||
        i["#40"] ||
        i["__col40"] ||
        i["AN"] ||
        0;
      const receivedVal =
        typeof receivedQty === "string"
          ? Number(String(receivedQty).replace(/,/g, "").trim())
          : Number(receivedQty);

      const liftingQty =
        i.liftingData?.qty ||
        i.qty ||
        i["qty"] ||
        i["QTY"] ||
        i["Qty"] ||
        i["lifting_qty"] ||
        i["Lifting Qty"] ||
        i["#35"] ||
        i["__col35"] ||
        i["AI"] ||
        0;
      const liftingVal =
        typeof liftingQty === "string"
          ? Number(String(liftingQty).replace(/,/g, "").trim())
          : Number(liftingQty);

      const pending = receivedVal - liftingVal;
      return sum + (Number.isFinite(pending) && pending > 0 ? pending : 0);
    }, 0);

    // Optimized PO Pending Count
    const totalPOPendingCount = indents.reduce((count: number, i: any) => {
      const poQty =
        i.poQty ||
        i["poQty"] ||
        i["POQty"] ||
        i["po_qty"] ||
        i["PO Qty"] ||
        i["po qty"] ||
        i["#29"] ||
        i["__col29"] ||
        0;
      const poVal =
        typeof poQty === "string"
          ? Number(String(poQty).replace(/,/g, "").trim())
          : Number(poQty);

      const receivedQty =
        i.receivedQty ||
        i["receivedQty"] ||
        i["Received Qty"] ||
        i["received_qty"] ||
        i["#40"] ||
        i["__col40"] ||
        0;
      const receivedVal =
        typeof receivedQty === "string"
          ? Number(String(receivedQty).replace(/,/g, "").trim())
          : Number(receivedQty);

      const pending = poVal - receivedVal;
      return count + (Number.isFinite(pending) && pending > 0 ? 1 : 0);
    }, 0);

    // Optimized Lifting calculations
    const totalLifting = indents.reduce((sum: number, i: any) => {
      const liftingQty =
        i.liftingData?.qty ||
        i.qty ||
        i["qty"] ||
        i["QTY"] ||
        i["Qty"] ||
        i["lifting_qty"] ||
        i["Lifting Qty"] ||
        i["#35"] ||
        i["__col35"] ||
        i["AI"] ||
        0;
      const n =
        typeof liftingQty === "string"
          ? Number(String(liftingQty).replace(/,/g, "").trim())
          : Number(liftingQty);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    const totalLiftPending = indents.reduce((sum: number, i: any) => {
      const poQty =
        i.poQty ||
        i["poQty"] ||
        i["POQty"] ||
        i["po_qty"] ||
        i["PO Qty"] ||
        i["po qty"] ||
        i["#29"] ||
        i["__col29"] ||
        0;
      const poVal =
        typeof poQty === "string"
          ? Number(String(poQty).replace(/,/g, "").trim())
          : Number(poQty);

      const liftingQty =
        i.liftingData?.qty ||
        i.qty ||
        i["qty"] ||
        i["QTY"] ||
        i["Qty"] ||
        i["lifting_qty"] ||
        i["Lifting Qty"] ||
        i["#35"] ||
        i["__col35"] ||
        i["AI"] ||
        0;
      const liftingVal =
        typeof liftingQty === "string"
          ? Number(String(liftingQty).replace(/,/g, "").trim())
          : Number(liftingQty);

      const pending = poVal - liftingVal;
      return sum + (Number.isFinite(pending) && pending > 0 ? pending : 0);
    }, 0);

    const totalLiftingCount = indents.reduce((count: number, i: any) => {
      const liftingQty =
        i.liftingData?.qty ||
        i.qty ||
        i["qty"] ||
        i["QTY"] ||
        i["Qty"] ||
        i["lifting_qty"] ||
        i["Lifting Qty"] ||
        i["#35"] ||
        i["__col35"] ||
        i["AI"] ||
        0;
      const liftingVal =
        typeof liftingQty === "string"
          ? Number(String(liftingQty).replace(/,/g, "").trim())
          : Number(liftingQty);
      return count + (Number.isFinite(liftingVal) && liftingVal > 0 ? 1 : 0);
    }, 0);

    const totalLiftPendingCount = indents.reduce((count: number, i: any) => {
      const poQty =
        i.poQty ||
        i["poQty"] ||
        i["POQty"] ||
        i["po_qty"] ||
        i["PO Qty"] ||
        i["po qty"] ||
        i["#29"] ||
        i["__col29"] ||
        0;
      const poVal =
        typeof poQty === "string"
          ? Number(String(poQty).replace(/,/g, "").trim())
          : Number(poQty);

      const liftingQty =
        i.liftingData?.qty ||
        i.qty ||
        i["qty"] ||
        i["QTY"] ||
        i["Qty"] ||
        i["lifting_qty"] ||
        i["Lifting Qty"] ||
        i["#35"] ||
        i["__col35"] ||
        i["AI"] ||
        0;
      const liftingVal =
        typeof liftingQty === "string"
          ? Number(String(liftingQty).replace(/,/g, "").trim())
          : Number(liftingQty);

      const pending = poVal - liftingVal;
      return count + (Number.isFinite(pending) && pending > 0 ? 1 : 0);
    }, 0);

    const totalQty = indents.reduce((sum: number, i: any) => {
      const qty = i.reorderQuantityPcs || i.poQty || i.qty || 0;
      return sum + (typeof qty === "string" ? parseInt(qty) || 0 : qty);
    }, 0);

    const totalQtyReceived = indents.reduce((sum: number, i: any) => {
      const r =
        i.receivedQty ||
        i["receivedQty"] ||
        i["Received Qty"] ||
        i["received_qty"] ||
        i["#40"] ||
        i["__col40"] ||
        i["AN"] ||
        0;
      const n =
        typeof r === "string"
          ? Number(String(r).replace(/,/g, "").trim())
          : Number(r);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    const totalPOSum = indents.reduce((sum: number, i: any) => {
      const poQty =
        i.poQty ||
        i["poQty"] ||
        i["POQty"] ||
        i["po_qty"] ||
        i["PO Qty"] ||
        i["po qty"] ||
        i["#29"] ||
        i["__col29"] ||
        0;
      const n =
        typeof poQty === "string"
          ? Number(String(poQty).replace(/,/g, "").trim())
          : Number(poQty);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    return {
      totalIndents,
      totalApprovals,
      totalPOSent: totalPO,
      totalQty,
      totalReceived: indents.filter(receivedFlag).length,
      totalPending: totalIndents - totalApprovals,
      totalPO,
      totalQtyReceived,
      totalPOPending,
      totalLifting,
      totalLiftPending,
      totalPOSum,
      totalPOPendingCount,
      totalLiftingCount,
      totalLiftPendingCount,
    };
  }, [indents]);

  // Optimized pending counts calculation
  const pendingCountsData = useMemo(() => {
    if (!indents.length)
      return { approvals: 0, pos: 0, lifting: 0, crossChecks: 0 };

    const pendingApprovals = indents.filter((i: any) => {
      const hasPlanned =
        i.plannedDate?.trim() && String(i.plannedDate).trim().length > 0;
      const hasApproval =
        i.approvalDate?.trim() && String(i.approvalDate).trim().length > 0;
      return hasPlanned && !hasApproval;
    }).length;

    const pendingPOs = indents.filter((i: any) => {
      const isApproved =
        i.approved === "Yes" || i.status === "approved" || i.approvalDate;
      const hasTransporter =
        i.transporterName?.trim() &&
        String(i.transporterName).trim().length > 0;
      return isApproved && !hasTransporter;
    }).length;

    const pendingLifting = indents.filter((i: any) => {
      const hasPlanned =
        i.plannedAE?.trim() && String(i.plannedAE).trim().length > 0;
      const hasLifting =
        i.actualAF?.trim() && String(i.actualAF).trim().length > 0;
      return hasPlanned && !hasLifting;
    }).length;

    const pendingCrossChecks = indents.filter((i: any) => {
      const hasPlanned =
        i.plannedAK?.trim() && String(i.plannedAK).trim().length > 0;
      const hasCrossCheck =
        i.actualAL?.trim() && String(i.actualAL).trim().length > 0;
      return hasPlanned && !hasCrossCheck;
    }).length;

    return {
      approvals: pendingApprovals,
      pos: pendingPOs,
      lifting: pendingLifting,
      crossChecks: pendingCrossChecks,
    };
  }, [indents]);

  // -----------------------------------------------------------------
  // Optimized Data Fetching
  // -----------------------------------------------------------------
  const fetchIndents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const googleSheetData = await indentService.getIndents();

      // Get localStorage data
      const saved = localStorage.getItem("indent_approval_data");
      const localData: any[] = saved ? JSON.parse(saved) : [];

      // Simple merge - localStorage takes precedence for lifting fields
      const mergedData = googleSheetData.map((googleItem) => {
        const localItem = localData.find((local) => local.id === googleItem.id);
        if (localItem) {
          return {
            ...googleItem,
            liftingData: localItem.liftingData || googleItem.liftingData,
            receiveStatus: localItem.receiveStatus || googleItem.receiveStatus,
            receivedQty: localItem.receivedQty || googleItem.receivedQty,
            difference: localItem.difference || googleItem.difference,
            receiveRemarks:
              localItem.receiveRemarks || googleItem.receiveRemarks,
            actualAF: localItem.actualAF || googleItem.actualAF,
            actualAL: localItem.actualAL || googleItem.actualAL,
          };
        }
        return googleItem;
      });

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
          ? mergedData.filter((i: any) =>
              allowedShops.includes((i.shopName || "").trim().toLowerCase())
            )
          : mergedData;
      setIndents(filtered);
    } catch (err: any) {
      console.error("Error fetching indents:", err);
      setError("Failed to load data from Google Sheets");

      // Fallback to localStorage
      const saved = localStorage.getItem("indent_approval_data");
      const localIndents: any[] = saved ? JSON.parse(saved) : [];
      setIndents(localIndents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndents();
  }, [fetchIndents]);

  // Update stats and pending counts when data is ready
  useEffect(() => {
    if (processedStats) {
      setStats(processedStats);
    }
  }, [processedStats]);

  useEffect(() => {
    setPendingCounts(pendingCountsData);
  }, [pendingCountsData]);

  // Components
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    change?: string;
  }> = ({ title, value, icon: Icon, color, bgColor, change }) => (
    <div
      className={`p-5 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg ${bgColor}`}
    >
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold text-gray-600">{title}</p>
        <div className={`p-2.5 rounded-xl ${bgColor} bg-opacity-40`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="flex justify-between items-end">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className="flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-full">
            <TrendingUp className="mr-1 w-3 h-3" />
            {change}
          </p>
        )}
      </div>
    </div>
  );

  const ChartCard: React.FC<{
    title: string;
    count?: number;
    children: React.ReactNode;
  }> = ({ title, count, children }) => (
    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {count !== undefined && (
          <span className="text-sm font-medium text-gray-500">({count})</span>
        )}
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-14 h-14 rounded-full border-b-4 border-indigo-600 animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-red-50 rounded-lg border-l-4 border-red-500">
        <div className="flex items-center">
          <AlertCircle className="mr-3 w-6 h-6 text-red-500" />
          <p className="font-medium text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6 md:p-8 md:pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
          Purchase Dashboard
        </h1>
        <p className="mt-1 text-base text-gray-600">
          Real-time indent & procurement tracking
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        <div className="flex gap-2 items-center px-5 py-3 -mb-px text-sm font-semibold text-indigo-600 bg-white border-t border-gray-200 border-x">
          <FileText className="w-4 h-4" />
          Overview
        </div>
      </div>

      <>
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard
            title="PO QTY"
            value={stats.totalPOSum.toLocaleString()}
            icon={FileText}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="LIFTING QTY"
            value={stats.totalLifting.toLocaleString()}
            icon={Send}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatCard
            title="RECEIVING QTY"
            value={stats.totalQtyReceived.toLocaleString()}
            icon={Package}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <StatCard
            title="RECEIVING PENDING"
            value={stats.totalPOPending.toLocaleString()}
            icon={Clock}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
          <ChartCard title="Stage Summary - All Pending">
            <div className="space-y-3">
              {[
                {
                  label: "Approval Pending",
                  value: pendingCounts.approvals,
                  color: "bg-yellow-500",
                },
                {
                  label: "PO Pending",
                  value: pendingCounts.pos,
                  color: "bg-blue-500",
                },
                {
                  label: "Lifting Pending",
                  value: pendingCounts.lifting,
                  color: "bg-purple-500",
                },
                {
                  label: "Cross-Check Pending",
                  value: pendingCounts.crossChecks,
                  color: "bg-red-500",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex gap-3 items-center">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm font-semibold text-gray-700">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-base font-bold text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </>
    </div>
  );
};
