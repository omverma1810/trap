"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Centralized navigation hook for all page transitions.
 * Ensures consistent navigation behavior across the app.
 */
export function useNavigation() {
  const router = useRouter();

  const navigate = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  // Dashboard Quick Actions
  const goToNewSale = useCallback(() => navigate("/pos"), [navigate]);
  const goToAddProduct = useCallback(() => navigate("/inventory?openAddProduct=true"), [navigate]);
  const goToInvoices = useCallback(() => navigate("/invoices"), [navigate]);
  const goToAnalytics = useCallback(() => navigate("/analytics"), [navigate]);
  const goToInventory = useCallback(() => navigate("/inventory"), [navigate]);
  const goToDashboard = useCallback(() => navigate("/"), [navigate]);
  const goToSettings = useCallback(() => navigate("/settings"), [navigate]);

  // Detail views
  const goToProduct = useCallback((productId: string | number) => {
    navigate(`/inventory/${productId}`);
  }, [navigate]);

  const goToInvoice = useCallback((invoiceId: string | number) => {
    navigate(`/invoices/${invoiceId}`);
  }, [navigate]);

  const goToReceipt = useCallback((saleId: string | number) => {
    navigate(`/pos?receipt=${saleId}`);
  }, [navigate]);

  // Auth (stub for now)
  const goToLogin = useCallback(() => {
    // Clear any auth state here in future
    navigate("/login");
  }, [navigate]);

  return {
    navigate,
    goToNewSale,
    goToAddProduct,
    goToInvoices,
    goToAnalytics,
    goToInventory,
    goToDashboard,
    goToSettings,
    goToProduct,
    goToInvoice,
    goToReceipt,
    goToLogin,
  };
}
