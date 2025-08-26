import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService } from '@/services/locationService';

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

// Country to currency mapping
const COUNTRY_CURRENCY_MAP: { [key: string]: CurrencyCode } = {
  'India': 'INR',
  'United States': 'USD',
  'United States of America': 'USD',
  'US': 'USD',
  'USA': 'USD',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'Great Britain': 'GBP',
  'England': 'GBP',
  'Scotland': 'GBP',
  'Wales': 'GBP',
  'Germany': 'EUR',
  'France': 'EUR',
  'Italy': 'EUR',
  'Spain': 'EUR',
  'Netherlands': 'EUR',
  'Belgium': 'EUR',
  'Austria': 'EUR',
  'Portugal': 'EUR',
  'Ireland': 'EUR',
  'Finland': 'EUR',
  'Greece': 'EUR',
  'Luxembourg': 'EUR',
};

interface CurrencyContextType {
  currency: Currency;
  formatPrice: (amount: number, showSymbol?: boolean) => string;
  convertPrice: (amount: number, fromCurrency?: Currency) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[1]); // Default to USD

  useEffect(() => {
    const detectLocationAndSetCurrency = async () => {
      try {
        // Check if we have a cached currency based on location
        const cachedCurrency = await AsyncStorage.getItem('locationBasedCurrency');
        if (cachedCurrency) {
          const savedCurrency = CURRENCIES.find(c => c.code === cachedCurrency);
          if (savedCurrency) {
            setCurrencyState(savedCurrency);
            return;
          }
        }

        // Get user's location
        const { data: locationData } = await locationService.getCurrentLocation();
        if (locationData?.country) {
          const currencyCode = COUNTRY_CURRENCY_MAP[locationData.country] || 'USD';
          const detectedCurrency = CURRENCIES.find(c => c.code === currencyCode);
          
          if (detectedCurrency) {
            setCurrencyState(detectedCurrency);
            // Cache the detected currency
            await AsyncStorage.setItem('locationBasedCurrency', currencyCode);
          }
        }
      } catch (error) {
        console.error('Error detecting location for currency:', error);
        // Fallback to USD if location detection fails
        setCurrencyState(CURRENCIES.find(c => c.code === 'USD') || CURRENCIES[1]);
      }
    };

    detectLocationAndSetCurrency();
  }, []);

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
    formatPrice,
    convertPrice,
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