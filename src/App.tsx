import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Splash from "@/components/Splash";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientForm from "@/pages/ClientForm";
import ClientDetail from "@/pages/ClientDetail";
import ClientServices from "@/pages/ClientServices";
import Documents from "@/pages/Documents";
import Work from "@/pages/Work";
import WorkForm from "@/pages/WorkForm";
import VAT from "@/pages/VAT";
import Fees from "@/pages/Fees";
import InvoiceForm from "@/pages/InvoiceForm";
import PaymentForm from "@/pages/PaymentForm";
import Payments from "@/pages/Payments";
import FeeEstimate from "@/pages/FeeEstimate";
import Deadlines from "@/pages/Deadlines";
import Staff from "@/pages/Staff";
import StaffForm from "@/pages/StaffForm";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import Notifications from "@/pages/Notifications";
import { initializeDatabase } from "@/lib/db";
import { getSavedTheme, applyTheme } from "@/lib/theme";
import { recalculateDueDates } from "@/lib/dueDate";
import {
  scanAndCreateNotifications,
  cleanupOldNotifications,
} from "@/lib/notifications";

function App() {
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const minSplash = new Promise((r) => setTimeout(r, 800));

        await initializeDatabase();

        // Load and apply saved theme
        const theme = await getSavedTheme();
        applyTheme(theme);

        await recalculateDueDates();
        await cleanupOldNotifications();
        await scanAndCreateNotifications();

        // Silent update check (non-blocking)
        import("@tauri-apps/api/app").then(({ getVersion }) => {
          import("@/lib/notifications").then(({ checkForUpdateNotification }) => {
            getVersion().then((v) => {
              checkForUpdateNotification(v).catch(() => {});
            });
          });
        });

        await minSplash;

        setReady(true);
        setFadingOut(true);
        setTimeout(() => setShowSplash(false), 400);

        // Re-scan every 15 minutes while app is open
        interval = setInterval(() => {
          scanAndCreateNotifications().catch(console.error);
        }, 15 * 60 * 1000);
      } catch (err) {
        setError(String(err));
      }
    })();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
        <div className="max-w-lg bg-white dark:bg-slate-800 p-5 rounded-lg shadow">
          <h1 className="text-2xl font-semibold text-red-700 mb-2">
            Initialization Failed
          </h1>
          <pre className="text-xs bg-gray-100 dark:bg-slate-700 p-3 rounded overflow-auto">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSplash && (
        <div className={fadingOut ? "splash-fade-out" : "splash-fade-in"}>
          <Splash />
        </div>
      )}

      {ready && (
        <div className="app-fade-in">
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/new" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/clients/:id/edit" element={<ClientForm />} />
              <Route path="/clients/:id/services" element={<ClientServices />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/work" element={<Work />} />
              <Route path="/work/new" element={<WorkForm />} />
              <Route path="/work/:id/edit" element={<WorkForm />} />
              <Route path="/vat" element={<VAT />} />
              <Route path="/fees" element={<Fees />} />
              <Route path="/fees/estimate" element={<FeeEstimate />} />
              <Route path="/fees/invoices/new" element={<InvoiceForm />} />
              <Route path="/fees/invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="/fees/payments" element={<Payments />} />
              <Route path="/fees/payments/new" element={<PaymentForm />} />
              <Route path="/deadlines" element={<Deadlines />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/staff/new" element={<StaffForm />} />
              <Route path="/staff/:id/edit" element={<StaffForm />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
            </Routes>
          </Layout>
        </div>
      )}
    </>
  );
}

export default App;
