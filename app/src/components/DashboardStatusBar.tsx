export type DashboardStatusBarProps = {
  message: string;
  detail: string;
};

export function DashboardStatusBar({ message, detail }: DashboardStatusBarProps) {
  return (
    <section className="dashboard-status" aria-label="Dashboard status">
      <div className="dashboard-status__mark" aria-hidden="true" />
      <div>
        <p className="dashboard-status__message">{message}</p>
        <p className="dashboard-status__detail">{detail}</p>
      </div>
    </section>
  );
}
