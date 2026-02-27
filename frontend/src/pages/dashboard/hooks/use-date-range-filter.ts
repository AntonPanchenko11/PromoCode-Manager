import { useState } from 'react';
import { DatePreset, DateRange } from '../dashboard-models';
import { buildPresetRange, endOfDayIso, startOfDayIso, toDateInputValue } from '../dashboard-utils';

type UseDateRangeFilterParams = {
  onWarning: (message: string) => void;
};

type UseDateRangeFilterResult = {
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
  appliedDateRange: DateRange;
  dateError: string | null;
  applyPreset: (preset: DatePreset) => void;
  setCustomFrom: (value: string) => void;
  setCustomTo: (value: string) => void;
  applyCustomRange: () => boolean;
};

export function useDateRangeFilter({ onWarning }: UseDateRangeFilterParams): UseDateRangeFilterResult {
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange>(buildPresetRange('30d'));
  const [dateError, setDateError] = useState<string | null>(null);

  const applyPreset = (preset: DatePreset): void => {
    setDatePreset(preset);
    if (preset === 'custom') {
      return;
    }

    const nextRange = buildPresetRange(preset);
    setAppliedDateRange(nextRange);
    setCustomFrom(nextRange.dateFrom ? toDateInputValue(nextRange.dateFrom) : '');
    setCustomTo(nextRange.dateTo ? toDateInputValue(nextRange.dateTo) : '');
    setDateError(null);
  };

  const applyCustomRange = (): boolean => {
    if (datePreset !== 'custom') {
      return false;
    }

    if (!customFrom || !customTo) {
      setDateError('Both custom dates are required');
      onWarning('Set both custom dates');
      return false;
    }

    const fromDate = new Date(customFrom);
    const toDate = new Date(customTo);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setDateError('Custom date value is invalid');
      onWarning('Custom date value is invalid');
      return false;
    }

    if (fromDate.getTime() > toDate.getTime()) {
      setDateError('dateFrom must be before dateTo');
      onWarning('dateFrom must be before dateTo');
      return false;
    }

    setDateError(null);
    setAppliedDateRange({
      dateFrom: startOfDayIso(fromDate),
      dateTo: endOfDayIso(toDate),
    });

    return true;
  };

  return {
    datePreset,
    customFrom,
    customTo,
    appliedDateRange,
    dateError,
    applyPreset,
    setCustomFrom,
    setCustomTo,
    applyCustomRange,
  };
}
