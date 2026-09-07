import PageHeader from "@/components/PageHeader";
import { useParams } from "react-router";

function Section({ title }: { title: string }) {
  const { groupId } = useParams();
  return <PageHeader title={title} description={groupId} />;
}

export function OverviewPage() {
  return <Section title="Overview" />;
}

export function ExpensesPage() {
  return <Section title="Expenses" />;
}

export function BalancesPage() {
  return <Section title="Balances" />;
}

export function SettlementsPage() {
  return <Section title="Settlements" />;
}

export function SettleUpPage() {
  return <Section title="Settle Up" />;
}

export function BudgetsPage() {
  return <Section title="Group Budgets" />;
}

export function CategoriesPage() {
  return <Section title="Categories" />;
}

export function MembersPage() {
  return <Section title="Members" />;
}

export function MemberInvitationsPage() {
  return <Section title="Invitations" />;
}

export function ActivityPage() {
  return <Section title="Activity" />;
}

export function SettingsPage() {
  return <Section title="Group Settings" />;
}
