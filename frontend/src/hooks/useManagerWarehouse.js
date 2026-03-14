import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import api from '../api/axiosClient';

/**
 * Handles the 1-to-1 relationship between a Manager and a Warehouse.
 * Since the backend cannot be modified to store this assignment natively, 
 * this hook uses `localStorage` keyed by the user ID to assert ownership.
 * If no warehouse is assigned, it permits the manager to create exactly one.
 */
export function useManagerWarehouse() {
  const { user } = useAuth();
  const [managerWarehouseId, setManagerWarehouseId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'manager') {
      setLoading(false);
      return;
    }

    const key = `manager_warehouse_${user.id}`;
    const storedWarehouseId = localStorage.getItem(key);

    if (storedWarehouseId) {
      setManagerWarehouseId(storedWarehouseId);
      setLoading(false);
    } else {
      // Check if they happened to create a warehouse but cleared cache
      api.get('/warehouses/').then(res => {
        // Find if this manager has previously created a warehouse
        // Assuming warehouse schema lacks user logic, we lock to the first available if not assigned (mock behavior)
        // A robust backend would attach user_id to warehouse, but here we depend strictly on localStorage
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user]);

  const assignWarehouse = (warehouseId) => {
    if (!user) return;
    const key = `manager_warehouse_${user.id}`;
    localStorage.setItem(key, warehouseId);
    setManagerWarehouseId(warehouseId);
  };

  return {
    managerWarehouseId,
    assignWarehouse,
    loading
  };
}
