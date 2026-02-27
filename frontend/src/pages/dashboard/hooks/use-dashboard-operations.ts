import { useState } from 'react';
import { promocodesApi, ordersApi, usersApi } from '../../../lib/api';
import { AnalyticsPromocodesRow, AnalyticsUsersRow, PaginatedResponse } from '../../../types';
import { EditPromocodeForm } from '../dashboard-models';
import { endOfDayIso, normalizeApiMessage, startOfDayIso } from '../dashboard-utils';

type Notifier = {
  notify: (type: 'success' | 'error' | 'warning', message: string) => void;
};

type UseDashboardOperationsParams = {
  notifications: Notifier;
  setUsersData: React.Dispatch<React.SetStateAction<PaginatedResponse<AnalyticsUsersRow> | null>>;
  setPromocodesData: React.Dispatch<React.SetStateAction<PaginatedResponse<AnalyticsPromocodesRow> | null>>;
  refetchUsers: () => void;
  refetchPromocodes: () => void;
  refetchPromoUsages: () => void;
  refetchMyOrders: () => void;
};

type UseDashboardOperationsResult = {
  createPromocodeCode: string;
  createPromocodeDiscountPercent: string;
  createPromocodeUsageLimitTotal: string;
  createPromocodeUsageLimitPerUser: string;
  createPromocodeDateFrom: string;
  createPromocodeDateTo: string;
  createPromocodeSubmitting: boolean;
  setCreatePromocodeCode: React.Dispatch<React.SetStateAction<string>>;
  setCreatePromocodeDiscountPercent: React.Dispatch<React.SetStateAction<string>>;
  setCreatePromocodeUsageLimitTotal: React.Dispatch<React.SetStateAction<string>>;
  setCreatePromocodeUsageLimitPerUser: React.Dispatch<React.SetStateAction<string>>;
  setCreatePromocodeDateFrom: React.Dispatch<React.SetStateAction<string>>;
  setCreatePromocodeDateTo: React.Dispatch<React.SetStateAction<string>>;
  createPromocode: () => Promise<void>;

  editPromocodeId: string;
  editPromocodeForm: EditPromocodeForm;
  editPromocodeSubmitting: boolean;
  setEditPromocodeId: React.Dispatch<React.SetStateAction<string>>;
  setEditPromocodeForm: React.Dispatch<React.SetStateAction<EditPromocodeForm>>;
  editPromocode: () => Promise<void>;

  createOrderAmount: string;
  createOrderSubmitting: boolean;
  setCreateOrderAmount: React.Dispatch<React.SetStateAction<string>>;
  createOrder: () => Promise<void>;

  applyPromoByOrderId: Record<string, string>;
  applyPromocodeSubmittingByOrderId: Record<string, boolean>;
  setApplyPromoByOrderId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyPromocodeToOrder: (orderId: string) => Promise<void>;

  usersDeactivationPending: Record<string, boolean>;
  promocodesDeactivationPending: Record<string, boolean>;
  deactivateUser: (userId: string) => Promise<void>;
  deactivatePromocode: (promocodeId: string) => Promise<void>;
};

export function useDashboardOperations({
  notifications,
  setUsersData,
  setPromocodesData,
  refetchUsers,
  refetchPromocodes,
  refetchPromoUsages,
  refetchMyOrders,
}: UseDashboardOperationsParams): UseDashboardOperationsResult {
  const [createPromocodeCode, setCreatePromocodeCode] = useState<string>('');
  const [createPromocodeDiscountPercent, setCreatePromocodeDiscountPercent] = useState<string>('');
  const [createPromocodeUsageLimitTotal, setCreatePromocodeUsageLimitTotal] = useState<string>('');
  const [createPromocodeUsageLimitPerUser, setCreatePromocodeUsageLimitPerUser] = useState<string>('');
  const [createPromocodeDateFrom, setCreatePromocodeDateFrom] = useState<string>('');
  const [createPromocodeDateTo, setCreatePromocodeDateTo] = useState<string>('');
  const [createPromocodeSubmitting, setCreatePromocodeSubmitting] = useState<boolean>(false);

  const [editPromocodeId, setEditPromocodeId] = useState<string>('');
  const [editPromocodeForm, setEditPromocodeForm] = useState<EditPromocodeForm>({
    code: '',
    discountPercent: '',
    usageLimitTotal: '',
    usageLimitPerUser: '',
    isActive: 'keep',
  });
  const [editPromocodeSubmitting, setEditPromocodeSubmitting] = useState<boolean>(false);

  const [createOrderAmount, setCreateOrderAmount] = useState<string>('');
  const [createOrderSubmitting, setCreateOrderSubmitting] = useState<boolean>(false);

  const [applyPromoByOrderId, setApplyPromoByOrderId] = useState<Record<string, string>>({});
  const [applyPromocodeSubmittingByOrderId, setApplyPromocodeSubmittingByOrderId] = useState<Record<string, boolean>>({});

  const [usersDeactivationPending, setUsersDeactivationPending] = useState<Record<string, boolean>>({});
  const [promocodesDeactivationPending, setPromocodesDeactivationPending] = useState<Record<string, boolean>>({});

  const createPromocode = async (): Promise<void> => {
    const code = createPromocodeCode.trim().toUpperCase();
    const discountPercent = Number(createPromocodeDiscountPercent);
    const usageLimitTotal = Number(createPromocodeUsageLimitTotal);
    const usageLimitPerUser = Number(createPromocodeUsageLimitPerUser);

    if (!code || code.length < 3) {
      notifications.notify('warning', 'Promocode code must have at least 3 characters');
      return;
    }

    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
      notifications.notify('warning', 'Discount percent must be an integer between 1 and 100');
      return;
    }

    if (!Number.isInteger(usageLimitTotal) || usageLimitTotal < 1) {
      notifications.notify('warning', 'Total usage limit must be a positive integer');
      return;
    }

    if (!Number.isInteger(usageLimitPerUser) || usageLimitPerUser < 1) {
      notifications.notify('warning', 'Per-user usage limit must be a positive integer');
      return;
    }

    const payload: {
      code: string;
      discountPercent: number;
      usageLimitTotal: number;
      usageLimitPerUser: number;
      dateFrom?: string;
      dateTo?: string;
    } = {
      code,
      discountPercent,
      usageLimitTotal,
      usageLimitPerUser,
    };

    if (createPromocodeDateFrom) {
      payload.dateFrom = startOfDayIso(new Date(createPromocodeDateFrom));
    }

    if (createPromocodeDateTo) {
      payload.dateTo = endOfDayIso(new Date(createPromocodeDateTo));
    }

    if (payload.dateFrom && payload.dateTo && payload.dateFrom > payload.dateTo) {
      notifications.notify('warning', 'Promocode dateFrom must be before dateTo');
      return;
    }

    setCreatePromocodeSubmitting(true);
    try {
      await promocodesApi.create(payload);
      notifications.notify('success', 'Promocode created');
      setCreatePromocodeCode('');
      setCreatePromocodeDiscountPercent('');
      setCreatePromocodeUsageLimitTotal('');
      setCreatePromocodeUsageLimitPerUser('');
      setCreatePromocodeDateFrom('');
      setCreatePromocodeDateTo('');
      refetchPromocodes();
      refetchPromoUsages();
      refetchUsers();
    } catch (error) {
      notifications.notify('error', `Promocode creation failed: ${normalizeApiMessage(error)}`);
    } finally {
      setCreatePromocodeSubmitting(false);
    }
  };

  const editPromocode = async (): Promise<void> => {
    if (!editPromocodeId) {
      notifications.notify('warning', 'Select promocode to update');
      return;
    }

    const payload: {
      code?: string;
      discountPercent?: number;
      usageLimitTotal?: number;
      usageLimitPerUser?: number;
      isActive?: boolean;
    } = {};

    if (editPromocodeForm.code.trim()) {
      payload.code = editPromocodeForm.code.trim().toUpperCase();
    }

    if (editPromocodeForm.discountPercent.trim()) {
      const value = Number(editPromocodeForm.discountPercent);
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        notifications.notify('warning', 'Discount percent must be an integer between 1 and 100');
        return;
      }
      payload.discountPercent = value;
    }

    if (editPromocodeForm.usageLimitTotal.trim()) {
      const value = Number(editPromocodeForm.usageLimitTotal);
      if (!Number.isInteger(value) || value < 1) {
        notifications.notify('warning', 'Total usage limit must be a positive integer');
        return;
      }
      payload.usageLimitTotal = value;
    }

    if (editPromocodeForm.usageLimitPerUser.trim()) {
      const value = Number(editPromocodeForm.usageLimitPerUser);
      if (!Number.isInteger(value) || value < 1) {
        notifications.notify('warning', 'Per-user usage limit must be a positive integer');
        return;
      }
      payload.usageLimitPerUser = value;
    }

    if (editPromocodeForm.isActive !== 'keep') {
      payload.isActive = editPromocodeForm.isActive === 'true';
    }

    if (Object.keys(payload).length === 0) {
      notifications.notify('warning', 'Set at least one field to update');
      return;
    }

    setEditPromocodeSubmitting(true);
    try {
      await promocodesApi.update(editPromocodeId, payload);
      notifications.notify('success', 'Promocode updated');
      setEditPromocodeForm({
        code: '',
        discountPercent: '',
        usageLimitTotal: '',
        usageLimitPerUser: '',
        isActive: 'keep',
      });
      refetchPromocodes();
      refetchPromoUsages();
      refetchUsers();
    } catch (error) {
      notifications.notify('error', `Promocode update failed: ${normalizeApiMessage(error)}`);
    } finally {
      setEditPromocodeSubmitting(false);
    }
  };

  const createOrder = async (): Promise<void> => {
    const amount = Number(createOrderAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notifications.notify('warning', 'Order amount must be a positive number');
      return;
    }

    setCreateOrderSubmitting(true);
    try {
      await ordersApi.create({ amount });
      notifications.notify('success', 'Order created');
      setCreateOrderAmount('');
      refetchMyOrders();
      refetchUsers();
    } catch (error) {
      notifications.notify('error', `Order creation failed: ${normalizeApiMessage(error)}`);
    } finally {
      setCreateOrderSubmitting(false);
    }
  };

  const applyPromocodeToOrder = async (orderId: string): Promise<void> => {
    const code = (applyPromoByOrderId[orderId] ?? '').trim().toUpperCase();
    if (!code) {
      notifications.notify('warning', 'Enter promocode before applying');
      return;
    }

    setApplyPromocodeSubmittingByOrderId((current) => ({
      ...current,
      [orderId]: true,
    }));
    try {
      await ordersApi.applyPromocode(orderId, { code });
      notifications.notify('success', 'Promocode applied to order');
      setApplyPromoByOrderId((current) => ({
        ...current,
        [orderId]: '',
      }));
      refetchMyOrders();
      refetchUsers();
      refetchPromocodes();
      refetchPromoUsages();
    } catch (error) {
      notifications.notify('error', `Applying promocode failed: ${normalizeApiMessage(error)}`);
    } finally {
      setApplyPromocodeSubmittingByOrderId((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    }
  };

  const deactivateUser = async (userId: string): Promise<void> => {
    if (usersDeactivationPending[userId]) {
      return;
    }

    let previousStatus: boolean | null = null;

    setUsersData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map((row) => {
          if (row.userId !== userId) {
            return row;
          }

          previousStatus = row.isActive;
          return {
            ...row,
            isActive: false,
          };
        }),
      };
    });

    setUsersDeactivationPending((current) => ({
      ...current,
      [userId]: true,
    }));

    try {
      await usersApi.deactivate(userId);
      notifications.notify('success', 'User deactivated');
      refetchUsers();
      refetchPromocodes();
      refetchPromoUsages();
    } catch (error) {
      const message = normalizeApiMessage(error);
      if (previousStatus !== null) {
        setUsersData((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((row) => {
              if (row.userId !== userId) {
                return row;
              }

              return {
                ...row,
                isActive: previousStatus ?? row.isActive,
              };
            }),
          };
        });
      }
      notifications.notify('error', `User deactivation failed: ${message}`);
    } finally {
      setUsersDeactivationPending((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
    }
  };

  const deactivatePromocode = async (promocodeId: string): Promise<void> => {
    if (promocodesDeactivationPending[promocodeId]) {
      return;
    }

    let previousStatus: boolean | null = null;

    setPromocodesData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map((row) => {
          if (row.promocodeId !== promocodeId) {
            return row;
          }

          previousStatus = row.isActive;
          return {
            ...row,
            isActive: false,
          };
        }),
      };
    });

    setPromocodesDeactivationPending((current) => ({
      ...current,
      [promocodeId]: true,
    }));

    try {
      await promocodesApi.deactivate(promocodeId);
      notifications.notify('success', 'Promocode deactivated');
      refetchUsers();
      refetchPromocodes();
      refetchPromoUsages();
    } catch (error) {
      const message = normalizeApiMessage(error);
      if (previousStatus !== null) {
        setPromocodesData((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((row) => {
              if (row.promocodeId !== promocodeId) {
                return row;
              }

              return {
                ...row,
                isActive: previousStatus ?? row.isActive,
              };
            }),
          };
        });
      }
      notifications.notify('error', `Promocode deactivation failed: ${message}`);
    } finally {
      setPromocodesDeactivationPending((current) => {
        const next = { ...current };
        delete next[promocodeId];
        return next;
      });
    }
  };

  return {
    createPromocodeCode,
    createPromocodeDiscountPercent,
    createPromocodeUsageLimitTotal,
    createPromocodeUsageLimitPerUser,
    createPromocodeDateFrom,
    createPromocodeDateTo,
    createPromocodeSubmitting,
    setCreatePromocodeCode,
    setCreatePromocodeDiscountPercent,
    setCreatePromocodeUsageLimitTotal,
    setCreatePromocodeUsageLimitPerUser,
    setCreatePromocodeDateFrom,
    setCreatePromocodeDateTo,
    createPromocode,

    editPromocodeId,
    editPromocodeForm,
    editPromocodeSubmitting,
    setEditPromocodeId,
    setEditPromocodeForm,
    editPromocode,

    createOrderAmount,
    createOrderSubmitting,
    setCreateOrderAmount,
    createOrder,

    applyPromoByOrderId,
    applyPromocodeSubmittingByOrderId,
    setApplyPromoByOrderId,
    applyPromocodeToOrder,

    usersDeactivationPending,
    promocodesDeactivationPending,
    deactivateUser,
    deactivatePromocode,
  };
}
