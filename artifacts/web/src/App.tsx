import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import { Navbar } from "@/components/layout/Navbar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import EventLanding from "@/pages/event-landing";
import DashboardEventList from "@/pages/dashboard/event-list";
import EventNew from "@/pages/dashboard/event-new";
import EventDetail from "@/pages/dashboard/event-detail";
import EventEdit from "@/pages/dashboard/event-edit";
import CheckoutSuccess from "@/pages/checkout-success";
import TicketView from "@/pages/ticket-view";
import MyTickets from "@/pages/my-tickets";
import ScanPage from "@/pages/dashboard/scan";
import Profile from "@/pages/profile";
import FindTickets from "@/pages/find-tickets";
import { Terms, Privacy } from "@/pages/legal";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import { Footer } from "@/components/layout/Footer";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const isDashboard = location.startsWith("/dashboard");

  const routes = (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/e/:slug" component={EventLanding} />
      <Route path="/dashboard" component={DashboardEventList} />
      <Route path="/dashboard/events" component={DashboardEventList} />
      <Route path="/dashboard/events/new" component={EventNew} />
      <Route path="/dashboard/events/:id/scan" component={ScanPage} />
      <Route path="/dashboard/events/:id/edit" component={EventEdit} />
      <Route path="/dashboard/events/:id" component={EventDetail} />
      <Route path="/my-tickets" component={MyTickets} />
      <Route path="/profile" component={Profile} />
      <Route path="/find-tickets" component={FindTickets} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/tickets/:qrToken" component={TicketView} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );

  if (isDashboard) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <DashboardLayout>{routes}</DashboardLayout>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col">{routes}</main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
