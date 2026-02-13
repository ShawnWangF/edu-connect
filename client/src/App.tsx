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
import GroupEdit from "./pages/GroupEdit";
import Attractions from "./pages/Attractions";
import Resources from "./pages/Resources";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Planner from "./pages/Planner";
import Calendar from "./pages/Calendar";
import Notifications from "./pages/Notifications";

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
      <Route path="/groups/:id/edit">
        <DashboardLayout>
          <GroupEdit />
        </DashboardLayout>
      </Route>
      <Route path="/groups/:id">
        <DashboardLayout>
          <GroupDetail />
        </DashboardLayout>
      </Route>
      <Route path="/resources">
        <DashboardLayout>
          <Resources />
        </DashboardLayout>
      </Route>
      <Route path="/attractions">
        <DashboardLayout>
          <Attractions />
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
      <Route path="/planner">
        <DashboardLayout>
          <Planner />
        </DashboardLayout>
      </Route>
      <Route path="/calendar">
        <DashboardLayout>
          <Calendar />
        </DashboardLayout>
      </Route>
      <Route path="/notifications">
        <DashboardLayout>
          <Notifications />
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
