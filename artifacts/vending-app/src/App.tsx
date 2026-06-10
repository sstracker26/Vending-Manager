import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import { OperatorLayout } from "@/components/layouts/OperatorLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminClients from "@/pages/admin/Clients";
import AdminClientDetail from "@/pages/admin/ClientDetail";
import AdminMachines from "@/pages/admin/Machines";
import AdminProducts from "@/pages/admin/Products";
import AdminStock from "@/pages/admin/Stock";
import AdminOperators from "@/pages/admin/Operators";
import AdminSchedules from "@/pages/admin/Schedules";
import AdminExpenses from "@/pages/admin/Expenses";
import AdminReports from "@/pages/admin/Reports";
import AdminLogs from "@/pages/admin/Logs";

import OperatorHome from "@/pages/operator/Home";
import OperatorSchedule from "@/pages/operator/Schedule";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedAdminRoute({ component: Component, ...rest }: { component: any; path: string }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!session) return <Redirect to="/admin/login" />;
  
  return (
    <AdminLayout>
      <Component {...rest} />
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <OperatorLayout>
          <OperatorHome />
        </OperatorLayout>
      </Route>
      <Route path="/operator/schedule">
        <OperatorLayout>
          <OperatorSchedule />
        </OperatorLayout>
      </Route>
      
      <Route path="/admin/login" component={AdminLogin} />
      
      <Route path="/admin/dashboard">
        <ProtectedAdminRoute component={AdminDashboard} path="/admin/dashboard" />
      </Route>
      <Route path="/admin/clients">
        <ProtectedAdminRoute component={AdminClients} path="/admin/clients" />
      </Route>
      <Route path="/admin/clients/:id">
        <ProtectedAdminRoute component={AdminClientDetail} path="/admin/clients/:id" />
      </Route>
      <Route path="/admin/machines">
        <ProtectedAdminRoute component={AdminMachines} path="/admin/machines" />
      </Route>
      <Route path="/admin/products">
        <ProtectedAdminRoute component={AdminProducts} path="/admin/products" />
      </Route>
      <Route path="/admin/stock">
        <ProtectedAdminRoute component={AdminStock} path="/admin/stock" />
      </Route>
      <Route path="/admin/operators">
        <ProtectedAdminRoute component={AdminOperators} path="/admin/operators" />
      </Route>
      <Route path="/admin/schedules">
        <ProtectedAdminRoute component={AdminSchedules} path="/admin/schedules" />
      </Route>
      <Route path="/admin/expenses">
        <ProtectedAdminRoute component={AdminExpenses} path="/admin/expenses" />
      </Route>
      <Route path="/admin/reports">
        <ProtectedAdminRoute component={AdminReports} path="/admin/reports" />
      </Route>
      <Route path="/admin/logs">
        <ProtectedAdminRoute component={AdminLogs} path="/admin/logs" />
      </Route>
      
      <Route path="/admin">
        <Redirect to="/admin/dashboard" />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
