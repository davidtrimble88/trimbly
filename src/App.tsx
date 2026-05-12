import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { installGlobalErrorReporting } from "@/lib/errorReporting";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import CookieConsent from "@/components/CookieConsent";

// Eager: high-traffic landing + auth + dashboards
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ProDashboard from "./pages/ProDashboard";
import NotFound from "./pages/NotFound";

// Lazy-load secondary routes for smaller initial bundle
const SearchPros = lazy(() => import("./pages/SearchPros"));
const EstimatorPage = lazy(() => import("./pages/EstimatorPage"));
const SymptomTriage = lazy(() => import("./pages/SymptomTriage"));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage"));
const HomeBinder = lazy(() => import("./pages/HomeBinder"));
const ProPricing = lazy(() => import("./pages/ProPricing"));
const ProRegister = lazy(() => import("./pages/ProRegister"));
const About = lazy(() => import("./pages/About"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Messages = lazy(() => import("./pages/Messages"));
const CoverageAdvisor = lazy(() => import("./pages/CoverageAdvisor"));
const PostJob = lazy(() => import("./pages/PostJob"));
const JobBoard = lazy(() => import("./pages/JobBoard"));
const Contact = lazy(() => import("./pages/Contact"));
const StaffLayout = lazy(() => import("./pages/staff/StaffLayout"));
const StaffDashboard = lazy(() => import("./pages/staff/Dashboard"));
const StaffContacts = lazy(() => import("./pages/staff/Contacts"));
const StaffUsers = lazy(() => import("./pages/staff/Users"));
const StaffProviders = lazy(() => import("./pages/staff/Providers"));
const StaffJobs = lazy(() => import("./pages/staff/Jobs"));
const StaffOutreach = lazy(() => import("./pages/staff/Outreach"));
const StaffModeration = lazy(() => import("./pages/staff/Moderation"));
const StaffBroadcasts = lazy(() => import("./pages/staff/Broadcasts"));
const StaffSearches = lazy(() => import("./pages/staff/Searches"));
const StaffErrors = lazy(() => import("./pages/staff/Errors"));
const PortalChoice = lazy(() => import("./pages/PortalChoice"));
const Help = lazy(() => import("./pages/Help"));
const ManualSearch = lazy(() => import("./pages/ManualSearch"));
const PublicHomeownerProfile = lazy(() => import("./pages/PublicHomeownerProfile"));
const PublicProviderProfile = lazy(() => import("./pages/PublicProviderProfile"));
const QuoteView = lazy(() => import("./pages/QuoteView"));
const CancelSubscription = lazy(() => import("./pages/CancelSubscription"));
const SeoServiceLanding = lazy(() => import("./pages/SeoServiceLanding"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

if (typeof window !== "undefined") installGlobalErrorReporting();

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

function GlobalListeners() {
  useRealtimeNotifications();
  return null;
}

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <GlobalListeners />
          <div className="pb-16 md:pb-0">
          <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<SearchPros />} />
            <Route path="/estimator" element={<EstimatorPage />} />
            <Route path="/symptom-triage" element={<SymptomTriage />} />
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
            <Route path="/u/:userId" element={<PublicHomeownerProfile />} />
            <Route path="/pro/:providerId" element={<PublicProviderProfile />} />
            <Route path="/pros/:slug" element={<PublicProviderProfile />} />
            <Route path="/quote/:quoteId" element={<QuoteView />} />
            <Route path="/cancel-subscription" element={<CancelSubscription />} />
            <Route path="/services/:category/:location" element={<SeoServiceLanding />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="contacts" element={<StaffContacts />} />
              <Route path="users" element={<StaffUsers />} />
              <Route path="providers" element={<StaffProviders />} />
              <Route path="jobs" element={<StaffJobs />} />
              <Route path="outreach" element={<StaffOutreach />} />
              <Route path="moderation" element={<StaffModeration />} />
              <Route path="broadcasts" element={<StaffBroadcasts />} />
              <Route path="searches" element={<StaffSearches />} />
              <Route path="errors" element={<StaffErrors />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </div>
          <MobileBottomNav />
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
