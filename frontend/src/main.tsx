import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { ThemeProvider } from "@/components/theme-provider";
import RequireRole from "@/layouts/require-role";
import RootLayout from "@/layouts/root-layout";
import HomePage from "@/pages/home";
import AdminEnrollmentsPage from "@/pages/admin/enrollments";
import AdminStudentsPage from "@/pages/admin/students";
import AdminCoursesPage from "@/pages/admin/courses";
import LoginPage from "@/pages/login";
import StudentEnrollmentsPage from "@/pages/student/enrollments";

import "./index.css";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "admin",
        element: <RequireRole role="ADMIN" />,
        children: [
          { path: "enrollments", element: <AdminEnrollmentsPage /> },
          { path: "students", element: <AdminStudentsPage /> },
          { path: "courses", element: <AdminCoursesPage /> },
        ],
      },
      {
        path: "student",
        element: <RequireRole role="STUDENT" />,
        children: [
          { path: "enrollments", element: <StudentEnrollmentsPage /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
