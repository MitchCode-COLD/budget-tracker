import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type FirstDayOfWeek = 'sunday' | 'monday';

interface SettingsState {
  currency: Currency;
  dateFormat: DateFormat;
  firstDayOfWeek: FirstDayOfWeek;
  setCurrency: (currency: Currency) => void;
  setDateFormat: (format: DateFormat) => void;
  setFirstDayOfWeek: (day: FirstDayOfWeek) => void;
}

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CAD', label: 'CAD ($)', symbol: '$' },
  { value: 'AUD', label: 'AUD ($)', symbol: '$' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
];

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export const FIRST_DAY_OPTIONS: { value: FirstDayOfWeek; label: string }[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      firstDayOfWeek: 'sunday',
      setCurrency: (currency) => set({ currency }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setFirstDayOfWeek: (firstDayOfWeek) => set({ firstDayOfWeek }),
    }),
    {
      name: 'budget-tracker-settings',
    }
  )
);

// Currency formatting helper
export function formatCurrency(value: number, currency: Currency): string {
  return value.toLocaleString('en-US', { style: 'currency', currency });
}

// Hook for currency formatting using current settings
export function useCurrencyFormatter() {
  const currency = useSettingsStore((state) => state.currency);
  return (value: number) => formatCurrency(value, currency);
}
