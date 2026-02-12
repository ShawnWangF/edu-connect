import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Groups from "./pages/Groups";
import GroupNew from "./pages/GroupNew";
import GroupDetail from "./pages/GroupDetail";
import Locations from "./pages/Locations";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      <Route path="/groups">
        <DashboardLayout>
          <Groups />
        </DashboardLayout>
      </Route>
      <Route path="/groups/new">
        <DashboardLayout>
          <GroupNew />
        </DashboardLayout>
      </Route>
      <Route path="/groups/:id">
        <DashboardLayout>
          <GroupDetail />
        </DashboardLayout>
      </Route>
      <Route path="/resources">
        <DashboardLayout>
          <Locations />
        </DashboardLayout>
      </Route>
      <Route path="/users">
        <DashboardLayout>
          <Users />
        </DashboardLayout>
      </Route>
      <Route path="/reports">
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
