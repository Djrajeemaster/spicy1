import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  position: 'prefix' | 'suffix';
  exchangeRate: number; // Rate to USD
}

export const CURRENCIES: Currency[] = [
  {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    position: 'prefix',
    exchangeRate: 83.0, // 1 USD = 83 INR (approximate)
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    position: 'prefix',
    exchangeRate: 1.0,
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    position: 'prefix',
    exchangeRate: 0.85, // 1 USD = 0.85 EUR (approximate)
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    position: 'prefix',
    exchangeRate: 0.73, // 1 USD = 0.73 GBP (approximate)
  },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number, showSymbol?: boolean) => string;
  convertPrice: (amount: number, fromCurrency?: Currency) => number;
  CURRENCIES: Currency[]; // Expose CURRENCIES array
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]); // Default to INR

  useEffect(() => {
    // Load saved currency from storage
    const loadSavedCurrency = async () => {
      try {
        const savedCurrencyCode = await AsyncStorage.getItem('selectedCurrency');
        if (savedCurrencyCode) {
          const savedCurrency = CURRENCIES.find(c => c.code === savedCurrencyCode);
          if (savedCurrency) {
            setCurrencyState(savedCurrency);
          }
        }
      } catch (error) {
        console.error('Error loading saved currency:', error);
      }
    };

    loadSavedCurrency();
  }, []);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      await AsyncStorage.setItem('selectedCurrency', newCurrency.code);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const formatPrice = (amount: number, showSymbol: boolean = true): string => {
    const convertedAmount = convertPrice(amount);
    const formattedAmount = new Intl.NumberFormat('en-IN', { // Using en-IN for consistent formatting
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(convertedAmount);

    if (!showSymbol) {
      return formattedAmount;
    }

    return currency.position === 'prefix'
      ? `${currency.symbol}${formattedAmount}`
      : `${formattedAmount}${currency.symbol}`;
  };

  const convertPrice = (amount: number, fromCurrency?: Currency): number => {
    const from = fromCurrency || CURRENCIES.find(c => c.code === 'USD')!; // Default from USD
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / from.exchangeRate;
    const convertedAmount = usdAmount * currency.exchangeRate;
    
    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  };

  const value = {
    currency,
    setCurrency,
    formatPrice,
    convertPrice,
    CURRENCIES,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}