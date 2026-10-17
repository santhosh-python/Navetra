/**
 * SYNTHETIC DEMO DATA: past deliveries from suppliers (received orders).
 * Used for stock history (deliveries inside the 30-day window) and for the lead-time analysis.
 * Scheduled deliveries come from each item's expectedDeliveryDate (see lib/deliveries.ts).
 */
import type { DeliveryRecord } from '../types/inventory';

export const DEMO_DELIVERY_HISTORY: DeliveryRecord[] = [
  // Inside the 30-day stock-history window
  { id: 'DL-1001', itemId: 'MED-ORS-001', supplierName: 'Deccan Medical Traders', quantity: 400, orderedDate: '2026-09-21', expectedLeadTimeDays: 5, actualLeadTimeDays: 7, deliveryDate: '2026-09-28', status: 'received' },
  { id: 'DL-1002', itemId: 'MED-PAR-500', supplierName: 'Vaidya Pharma Distributors', quantity: 1000, orderedDate: '2026-09-25', expectedLeadTimeDays: 6, actualLeadTimeDays: 8, deliveryDate: '2026-10-03', status: 'received' },
  { id: 'DL-1003', itemId: 'MED-GLV-M', supplierName: 'Telangana Surgical Supplies', quantity: 40, orderedDate: '2026-09-16', expectedLeadTimeDays: 4, actualLeadTimeDays: 6, deliveryDate: '2026-09-22', status: 'received' },
  { id: 'DL-1004', itemId: 'MED-SAL-075', supplierName: 'Telangana Surgical Supplies', quantity: 200, orderedDate: '2026-09-26', expectedLeadTimeDays: 9, actualLeadTimeDays: 10, deliveryDate: '2026-10-06', status: 'received' },
  { id: 'DL-1005', itemId: 'FOOD-BWT-20L', supplierName: 'Charminar Food Wholesale', quantity: 150, orderedDate: '2026-10-02', expectedLeadTimeDays: 2, actualLeadTimeDays: 2, deliveryDate: '2026-10-04', status: 'received' },
  { id: 'DL-1006', itemId: 'LAB-DTK-330', supplierName: 'Musi Lab Systems', quantity: 100, orderedDate: '2026-09-08', expectedLeadTimeDays: 14, actualLeadTimeDays: 21, deliveryDate: '2026-09-29', status: 'received' },
  { id: 'DL-1007', itemId: 'MED-INS-1ML', supplierName: 'Deccan Medical Traders', quantity: 12, orderedDate: '2026-10-01', expectedLeadTimeDays: 5, actualLeadTimeDays: 7, deliveryDate: '2026-10-08', status: 'received' },
  { id: 'DL-1008', itemId: 'MED-MSK-50', supplierName: 'Krishna Hygiene Co.', quantity: 40, orderedDate: '2026-09-20', expectedLeadTimeDays: 7, actualLeadTimeDays: 10, deliveryDate: '2026-09-30', status: 'received' },
  { id: 'DL-1009', itemId: 'MED-GAU-10', supplierName: 'Telangana Surgical Supplies', quantity: 120, orderedDate: '2026-09-19', expectedLeadTimeDays: 6, actualLeadTimeDays: 8, deliveryDate: '2026-09-27', status: 'received' },
  { id: 'DL-1010', itemId: 'EMG-O2-D', supplierName: 'Deccan Medical Traders', quantity: 10, orderedDate: '2026-09-10', expectedLeadTimeDays: 12, actualLeadTimeDays: 14, deliveryDate: '2026-09-24', status: 'received' },
  { id: 'DL-1011', itemId: 'LAB-GLU-50', supplierName: 'Musi Lab Systems', quantity: 20, orderedDate: '2026-09-22', expectedLeadTimeDays: 8, actualLeadTimeDays: 9, deliveryDate: '2026-10-01', status: 'received' },
  { id: 'DL-1012', itemId: 'MED-AMX-250', supplierName: 'Vaidya Pharma Distributors', quantity: 120, orderedDate: '2026-09-18', expectedLeadTimeDays: 8, actualLeadTimeDays: 8, deliveryDate: '2026-09-26', status: 'received' },
  { id: 'DL-1013', itemId: 'EMG-FAK-01', supplierName: 'Emergency Relief Logistics', quantity: 40, orderedDate: '2026-09-08', expectedLeadTimeDays: 10, actualLeadTimeDays: 12, deliveryDate: '2026-09-20', status: 'received' },
  { id: 'DL-1014', itemId: 'LAB-CBC-RGT', supplierName: 'Musi Lab Systems', quantity: 20, orderedDate: '2026-09-09', expectedLeadTimeDays: 21, actualLeadTimeDays: 21, deliveryDate: '2026-09-30', status: 'received' },
  // Older deliveries (outside the stock-history window) for lead-time analysis
  { id: 'DL-0901', itemId: 'MED-ORS-001', supplierName: 'Deccan Medical Traders', quantity: 500, orderedDate: '2026-07-14', expectedLeadTimeDays: 5, actualLeadTimeDays: 5, deliveryDate: '2026-07-19', status: 'received' },
  { id: 'DL-0902', itemId: 'LAB-DTK-330', supplierName: 'Musi Lab Systems', quantity: 300, orderedDate: '2026-07-01', expectedLeadTimeDays: 14, actualLeadTimeDays: 18, deliveryDate: '2026-07-19', status: 'received' },
  { id: 'DL-0903', itemId: 'MED-SAL-075', supplierName: 'Telangana Surgical Supplies', quantity: 300, orderedDate: '2026-07-22', expectedLeadTimeDays: 9, actualLeadTimeDays: 9, deliveryDate: '2026-07-31', status: 'received' },
  { id: 'DL-0904', itemId: 'MED-AMX-250', supplierName: 'Vaidya Pharma Distributors', quantity: 400, orderedDate: '2026-06-10', expectedLeadTimeDays: 8, actualLeadTimeDays: 11, deliveryDate: '2026-06-21', status: 'received' },
  { id: 'DL-0905', itemId: 'MED-GLV-M', supplierName: 'Telangana Surgical Supplies', quantity: 60, orderedDate: '2026-06-18', expectedLeadTimeDays: 4, actualLeadTimeDays: 5, deliveryDate: '2026-06-23', status: 'received' },
  { id: 'DL-0906', itemId: 'MED-MSK-50', supplierName: 'Krishna Hygiene Co.', quantity: 120, orderedDate: '2026-08-03', expectedLeadTimeDays: 7, actualLeadTimeDays: 7, deliveryDate: '2026-08-10', status: 'received' },
  { id: 'DL-0907', itemId: 'FOOD-BWT-20L', supplierName: 'Charminar Food Wholesale', quantity: 200, orderedDate: '2026-08-20', expectedLeadTimeDays: 2, actualLeadTimeDays: 3, deliveryDate: '2026-08-23', status: 'received' },
  { id: 'DL-0908', itemId: 'EMG-O2-D', supplierName: 'Deccan Medical Traders', quantity: 12, orderedDate: '2026-08-01', expectedLeadTimeDays: 12, actualLeadTimeDays: 13, deliveryDate: '2026-08-14', status: 'received' },
  { id: 'DL-0909', itemId: 'LAB-GLU-50', supplierName: 'Musi Lab Systems', quantity: 60, orderedDate: '2026-07-20', expectedLeadTimeDays: 8, actualLeadTimeDays: 10, deliveryDate: '2026-07-30', status: 'received' },
];
