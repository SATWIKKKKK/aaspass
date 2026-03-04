export default function SuperAdminLoginLayout({ children }: { children: React.ReactNode }) {
  // Login page has its own layout — no sidebar
  return <>{children}</>;
}
