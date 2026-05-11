import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SearchPros from "./pages/SearchPros";
import EstimatorPage from "./pages/EstimatorPage";
import MaintenancePage from "./pages/MaintenancePage";
import HomeBinder from "./pages/HomeBinder";
import ProPricing from "./pages/ProPricing";
import ProRegister from "./pages/ProRegister";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import CoverageAdvisor from "./pages/CoverageAdvisor";
import PostJob from "./pages/PostJob";
import JobBoard from "./pages/JobBoard";
import ProDashboard from "./pages/ProDashboard";
import Contact from "./pages/Contact";
import StaffLayout from "./pages/staff/StaffLayout";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffContacts from "./pages/staff/Contacts";
import StaffUsers from "./pages/staff/Users";
import StaffProviders from "./pages/staff/Providers";
import StaffJobs from "./pages/staff/Jobs";
import StaffOutreach from "./pages/staff/Outreach";
import StaffModeration from "./pages/staff/Moderation";
import StaffBroadcasts from "./pages/staff/Broadcasts";
import PortalChoice from "./pages/PortalChoice";
import Help from "./pages/Help";
import ManualSearch from "./pages/ManualSearch";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<SearchPros />} />
            <Route path="/estimator" element={<EstimatorPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/binder" element={<HomeBinder />} />
            <Route path="/pro-pricing" element={<ProPricing />} />
            <Route path="/pro-register" element={<ProRegister />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/coverage" element={<CoverageAdvisor />} />
            <Route path="/post-job" element={<PostJob />} />
            <Route path="/job-board" element={<JobBoard />} />
            <Route path="/pro-dashboard" element={<ProDashboard />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/portal-choice" element={<PortalChoice />} />
            <Route path="/help" element={<Help />} />
            <Route path="/manual-search" element={<ManualSearch />} />
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="contacts" element={<StaffContacts />} />
              <Route path="users" element={<StaffUsers />} />
              <Route path="providers" element={<StaffProviders />} />
              <Route path="jobs" element={<StaffJobs />} />
              <Route path="outreach" element={<StaffOutreach />} />
              <Route path="moderation" element={<StaffModeration />} />
              <Route path="broadcasts" element={<StaffBroadcasts />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
