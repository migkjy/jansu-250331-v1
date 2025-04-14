"use client"

import React from "react"
import AdminSidebar from "@/components/AdminSidebar"
import UserSidebar from "@/components/UserSidebar"

interface MainLayoutProps {
  children: React.ReactNode
  userRole: "admin" | "user" | null
  showSidebar: boolean
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, userRole, showSidebar }) => {
  return (
    <div className={`flex h-full ${showSidebar ? "" : "justify-center"}`}>
      {showSidebar && (userRole === "admin" ? <AdminSidebar /> : <UserSidebar />)}
      <main className={`flex-1 overflow-y-auto ${showSidebar ? "p-6" : ""}`}>
        <div className={`${showSidebar ? "mx-auto max-w-7xl" : "h-full"}`}>{children}</div>
      </main>
    </div>
  )
}

export default MainLayout
