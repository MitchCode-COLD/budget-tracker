import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import TransactionList from './features/transactions/TransactionList';
import AccountList from './features/accounts/AccountList';
import CategoryList from './features/categories/CategoryList';
import BudgetList from './features/budgets/BudgetList';
import GoalList from './features/goals/GoalList';
import BillList from './features/bills/BillList';
import Reports from './features/reports/Reports';
import Settings from './features/settings/Settings';
import DocumentScanner from './features/scanner/DocumentScanner';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/accounts" element={<AccountList />} />
        <Route path="/categories" element={<CategoryList />} />
        <Route path="/budgets" element={<BudgetList />} />
        <Route path="/goals" element={<GoalList />} />
        <Route path="/bills" element={<BillList />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/scanner" element={<DocumentScanner />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
