import { ReactNode } from "react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Sidebar is now handled by the root layout
  return (
    // The outer div and sidebar are removed
    // The main element and max-width div are also handled by root layout now
    <>{children}</>
  )
}
