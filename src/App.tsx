import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { IndentPage } from "./components/IndentPage";
import { ApprovalPage } from "./components/ApprovalPage";
import { PurchaseOrderPage } from "./components/PurchaseOrderPage";
import { GetLiftingPage } from "./components/GetLiftingPage";
import { CrossCheckPage } from "./components/CrossCheckPage";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";
import { User } from "./types";
import { storageUtils } from "./utils/storage";
import { initializeDummyData } from "./utils/dummyData";

// Helper function to check page access
const hasPageAccess = (user: User | null, page: string): boolean => {
  if (!user || !user.pageAccess) return false;

  if (user.pageAccess === "all") return true;

  const normalize = (p: string) => {
    const s = p.trim().toLowerCase();
    if (s === "all") return "all";
    if (s.includes("purchase") || s.includes("po")) return "purchase-order";
    if (s.includes("get") && s.includes("lifting")) return "get-lifting";
    if (s === "lifting") return "get-lifting";
    if (s.includes("cross") && (s.includes("check") || s.includes("receive"))) return "cross-check";
    return s.replace(/\s+/g, "-");
  };

  const allowedPages = user.pageAccess
    .split(',')
    .map(normalize);

  const target = normalize(page);
  return allowedPages.includes(target);
};

// Get the first allowed page for the user based on pageAccess
const getFirstAllowedPage = (user: User | null): string => {
  const pagesInOrder = [
    "dashboard",
    "indent",
    "approval",
    "purchase-order",
    "get-lifting",
    "cross-check",
  ];
  for (const p of pagesInOrder) {
    if (hasPageAccess(user, p)) return p;
  }
  // Fallback to dashboard if nothing matches
  return "dashboard";
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(storageUtils.getCurrentPage());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize dummy data on first load
    initializeDummyData();

    // Check for existing user session
    const user = storageUtils.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      // If user is logged in, restore their last page if allowed, else first allowed
      const savedPage = storageUtils.getCurrentPage();
      const candidate = savedPage && savedPage !== 'login' ? savedPage : 'dashboard';
      if (hasPageAccess(user, candidate)) {
        setCurrentPage(candidate);
      } else {
        setCurrentPage(getFirstAllowedPage(user));
      }
    } else {
      // If no user, redirect to login
      setCurrentPage('login');
    }
    
    setIsInitialized(true);
  }, []);
  
  // Update stored page when currentPage changes
  useEffect(() => {
    if (isInitialized && currentPage !== 'login') {
      storageUtils.setCurrentPage(currentPage);
    }
  }, [currentPage, isInitialized]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    storageUtils.setCurrentUser(user);
    // After login, redirect to saved page if allowed; else first allowed page
    const savedPage = storageUtils.getCurrentPage();
    const candidate = savedPage && savedPage !== 'login' ? savedPage : 'dashboard';
    if (hasPageAccess(user, candidate)) {
      setCurrentPage(candidate);
    } else {
      setCurrentPage(getFirstAllowedPage(user));
    }
  };

  const handleLogout = () => {
    storageUtils.clearCurrentUser();
    storageUtils.clearCurrentPage();
    setCurrentUser(null);
    setCurrentPage("login");
    setSidebarOpen(false);
    // Full page refresh to clear any cached state
    window.location.reload();
  };

  const handlePageChange = (page: string) => {
    if (hasPageAccess(currentUser, page)) {
      setCurrentPage(page);
    } else {
      // Redirect to the first allowed page if access is denied
      const fallback = getFirstAllowedPage(currentUser);
      setCurrentPage(fallback);
      alert("You don't have permission to access this page.");
    }
  };

  const renderPage = () => {
    // Check access before rendering
    if (!hasPageAccess(currentUser, currentPage)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "indent":
        return <IndentPage />;
      case "approval":
        return <ApprovalPage />;
      case "purchase-order":
        return <PurchaseOrderPage />;
      case "get-lifting":
        return <GetLiftingPage />;
      case "cross-check":
        return <CrossCheckPage />;
      default:
        return <Dashboard />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Hamburger Menu Button - Only visible on mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        <main className="flex-1 pb-16">
          <div className="pt-16 lg:pt-0">{renderPage()}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
