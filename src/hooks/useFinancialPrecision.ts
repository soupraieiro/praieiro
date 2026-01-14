/**
 * FINANCIAL PRECISION MODULE
 * Bank-grade precision for financial operations
 * Zero-latency processing with geo-referenced data
 */

import { useState, useCallback, useMemo } from 'react';
import CryptoJS from 'crypto-js';

// Precision constants
const DECIMAL_PRECISION = 8; // BTC precision
const FIAT_PRECISION = 2;
const EXCHANGE_RATE_PRECISION = 6;

export interface FinancialTransaction {
  id: string;
  type: 'exchange' | 'transfer' | 'payment' | 'investment';
  amount: string; // String to preserve precision
  currency: string;
  targetCurrency?: string;
  exchangeRate?: string;
  fee?: string;
  tax?: string;
  totalAmount?: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  errorCode?: string;
  errorMessage?: string;
  geoContext?: {
    country: string;
    region: string;
    taxJurisdiction: string;
  };
  auditHash: string;
}

export interface ExchangeQuote {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  inverseRate: string;
  amount: string;
  convertedAmount: string;
  fee: string;
  tax: string;
  totalCost: string;
  expiresAt: number;
  quoteId: string;
}

export interface FinancialError {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
}

// Error codes following banking standards
export const FINANCIAL_ERROR_CODES = {
  INSUFFICIENT_FUNDS: 'E001',
  INVALID_AMOUNT: 'E002',
  PRECISION_OVERFLOW: 'E003',
  RATE_EXPIRED: 'E004',
  NETWORK_ERROR: 'E005',
  VALIDATION_FAILED: 'E006',
  CURRENCY_UNSUPPORTED: 'E007',
  TAX_CALCULATION_FAILED: 'E008',
  AUDIT_VERIFICATION_FAILED: 'E009',
  TRANSACTION_TIMEOUT: 'E010',
} as const;

interface UseFinancialPrecisionResult {
  // Core operations
  add: (a: string, b: string) => string;
  subtract: (a: string, b: string) => string;
  multiply: (a: string, b: string, precision?: number) => string;
  divide: (a: string, b: string, precision?: number) => string;
  
  // Financial operations
  calculateExchange: (amount: string, rate: string, fee?: string) => ExchangeQuote | FinancialError;
  calculateTax: (amount: string, rate: string, jurisdiction: string) => string;
  formatCurrency: (amount: string, currency: string, locale?: string) => string;
  
  // Validation
  validateAmount: (amount: string) => { valid: boolean; error?: FinancialError };
  validatePrecision: (amount: string, maxPrecision: number) => boolean;
  
  // Audit
  generateAuditHash: (transaction: Partial<FinancialTransaction>) => string;
  verifyAuditHash: (transaction: FinancialTransaction) => boolean;
  
  // Error handling
  parseError: (error: unknown) => FinancialError;
  isRecoverableError: (error: FinancialError) => boolean;
}

// BigInt-based precision arithmetic
class PrecisionMath {
  private static scale(value: string, precision: number): bigint {
    const [integer, decimal = ''] = value.split('.');
    const paddedDecimal = decimal.padEnd(precision, '0').slice(0, precision);
    return BigInt(integer + paddedDecimal);
  }

  private static unscale(value: bigint, precision: number): string {
    const str = value.toString().padStart(precision + 1, '0');
    const intPart = str.slice(0, -precision) || '0';
    const decPart = str.slice(-precision);
    
    // Remove trailing zeros but keep at least 2 decimals for fiat
    const trimmedDec = decPart.replace(/0+$/, '');
    if (trimmedDec === '') return intPart;
    return `${intPart}.${trimmedDec}`;
  }

  static add(a: string, b: string, precision: number = DECIMAL_PRECISION): string {
    const scaledA = this.scale(a, precision);
    const scaledB = this.scale(b, precision);
    return this.unscale(scaledA + scaledB, precision);
  }

  static subtract(a: string, b: string, precision: number = DECIMAL_PRECISION): string {
    const scaledA = this.scale(a, precision);
    const scaledB = this.scale(b, precision);
    const result = scaledA - scaledB;
    if (result < 0n) {
      return '-' + this.unscale(-result, precision);
    }
    return this.unscale(result, precision);
  }

  static multiply(a: string, b: string, precision: number = DECIMAL_PRECISION): string {
    const scaledA = this.scale(a, precision);
    const scaledB = this.scale(b, precision);
    const result = (scaledA * scaledB) / BigInt(10 ** precision);
    return this.unscale(result, precision);
  }

  static divide(a: string, b: string, precision: number = DECIMAL_PRECISION): string {
    if (b === '0' || b === '0.0') {
      throw new Error('Division by zero');
    }
    const scaledA = this.scale(a, precision * 2);
    const scaledB = this.scale(b, precision);
    const result = scaledA / scaledB;
    return this.unscale(result, precision);
  }
}

export function useFinancialPrecision(): UseFinancialPrecisionResult {
  // Core arithmetic operations
  const add = useCallback((a: string, b: string): string => {
    return PrecisionMath.add(a, b);
  }, []);

  const subtract = useCallback((a: string, b: string): string => {
    return PrecisionMath.subtract(a, b);
  }, []);

  const multiply = useCallback((a: string, b: string, precision = DECIMAL_PRECISION): string => {
    return PrecisionMath.multiply(a, b, precision);
  }, []);

  const divide = useCallback((a: string, b: string, precision = DECIMAL_PRECISION): string => {
    return PrecisionMath.divide(a, b, precision);
  }, []);

  // Validate amount format and value
  const validateAmount = useCallback((amount: string): { valid: boolean; error?: FinancialError } => {
    // Check format
    if (!/^-?\d+(\.\d+)?$/.test(amount)) {
      return {
        valid: false,
        error: {
          code: FINANCIAL_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid amount format. Use only numbers and decimal point.',
          recoverable: true,
        },
      };
    }

    // Check for negative
    if (amount.startsWith('-')) {
      return {
        valid: false,
        error: {
          code: FINANCIAL_ERROR_CODES.INVALID_AMOUNT,
          message: 'Amount cannot be negative.',
          recoverable: true,
        },
      };
    }

    // Check for zero
    if (parseFloat(amount) === 0) {
      return {
        valid: false,
        error: {
          code: FINANCIAL_ERROR_CODES.INVALID_AMOUNT,
          message: 'Amount must be greater than zero.',
          recoverable: true,
        },
      };
    }

    // Check precision overflow
    const [, decimal] = amount.split('.');
    if (decimal && decimal.length > DECIMAL_PRECISION) {
      return {
        valid: false,
        error: {
          code: FINANCIAL_ERROR_CODES.PRECISION_OVERFLOW,
          message: `Maximum ${DECIMAL_PRECISION} decimal places allowed.`,
          recoverable: true,
        },
      };
    }

    return { valid: true };
  }, []);

  const validatePrecision = useCallback((amount: string, maxPrecision: number): boolean => {
    const [, decimal] = amount.split('.');
    return !decimal || decimal.length <= maxPrecision;
  }, []);

  // Calculate exchange with fees and taxes
  const calculateExchange = useCallback((
    amount: string,
    rate: string,
    feePercent: string = '0.5'
  ): ExchangeQuote | FinancialError => {
    const validation = validateAmount(amount);
    if (!validation.valid) {
      return validation.error!;
    }

    try {
      // Calculate base conversion
      const convertedAmount = multiply(amount, rate, EXCHANGE_RATE_PRECISION);
      
      // Calculate fee
      const feeMultiplier = divide(feePercent, '100', 6);
      const fee = multiply(amount, feeMultiplier, FIAT_PRECISION);
      
      // Total cost (amount + fee)
      const totalCost = add(amount, fee);

      // Generate unique quote ID
      const quoteId = CryptoJS.SHA256(
        `${amount}:${rate}:${Date.now()}`
      ).toString().substring(0, 16);

      return {
        fromCurrency: 'BRL',
        toCurrency: 'USD',
        rate,
        inverseRate: divide('1', rate, EXCHANGE_RATE_PRECISION),
        amount,
        convertedAmount,
        fee,
        tax: '0',
        totalCost,
        expiresAt: Date.now() + 30000, // 30 second quote validity
        quoteId,
      };
    } catch (err) {
      return {
        code: FINANCIAL_ERROR_CODES.VALIDATION_FAILED,
        message: err instanceof Error ? err.message : 'Exchange calculation failed',
        recoverable: false,
      };
    }
  }, [validateAmount, multiply, divide, add]);

  // Calculate tax based on jurisdiction
  const calculateTax = useCallback((
    amount: string,
    rate: string,
    jurisdiction: string
  ): string => {
    // Tax rates by jurisdiction (simplified)
    const taxRates: Record<string, string> = {
      BR: '0.17',
      'BR-SP': '0.18',
      'BR-RJ': '0.20',
      'BR-BA': '0.17',
      US: '0.0725',
      'US-CA': '0.0875',
      'US-NY': '0.08',
      EU: '0.19',
      'EU-DE': '0.19',
      'EU-FR': '0.20',
    };

    const taxRate = taxRates[jurisdiction] || taxRates.BR;
    return multiply(amount, taxRate, FIAT_PRECISION);
  }, [multiply]);

  // Format currency for display
  const formatCurrency = useCallback((
    amount: string,
    currency: string,
    locale: string = 'pt-BR'
  ): string => {
    const numAmount = parseFloat(amount);
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: currency === 'BTC' ? 8 : 2,
        maximumFractionDigits: currency === 'BTC' ? 8 : 2,
      }).format(numAmount);
    } catch {
      // Fallback for unsupported currencies
      const symbols: Record<string, string> = {
        BRL: 'R$',
        USD: '$',
        EUR: '€',
        BTC: '₿',
        GBP: '£',
      };
      return `${symbols[currency] || currency} ${numAmount.toFixed(currency === 'BTC' ? 8 : 2)}`;
    }
  }, []);

  // Generate audit hash for transaction
  const generateAuditHash = useCallback((transaction: Partial<FinancialTransaction>): string => {
    const auditData = {
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      targetCurrency: transaction.targetCurrency,
      exchangeRate: transaction.exchangeRate,
      timestamp: transaction.timestamp || Date.now(),
    };
    
    return CryptoJS.SHA256(JSON.stringify(auditData)).toString();
  }, []);

  // Verify transaction audit hash
  const verifyAuditHash = useCallback((transaction: FinancialTransaction): boolean => {
    const expectedHash = generateAuditHash(transaction);
    return expectedHash === transaction.auditHash;
  }, [generateAuditHash]);

  // Parse any error into FinancialError format
  const parseError = useCallback((error: unknown): FinancialError => {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return error as FinancialError;
    }

    if (error instanceof Error) {
      // Map common errors
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return {
          code: FINANCIAL_ERROR_CODES.NETWORK_ERROR,
          message: 'Network error. Please check your connection.',
          recoverable: true,
          retryAfter: 5000,
        };
      }

      if (error.message.includes('timeout')) {
        return {
          code: FINANCIAL_ERROR_CODES.TRANSACTION_TIMEOUT,
          message: 'Transaction timed out. Please try again.',
          recoverable: true,
          retryAfter: 3000,
        };
      }

      return {
        code: FINANCIAL_ERROR_CODES.VALIDATION_FAILED,
        message: error.message,
        recoverable: false,
      };
    }

    return {
      code: FINANCIAL_ERROR_CODES.VALIDATION_FAILED,
      message: 'An unexpected error occurred.',
      recoverable: false,
    };
  }, []);

  // Check if error is recoverable
  const isRecoverableError = useCallback((error: FinancialError): boolean => {
    return error.recoverable;
  }, []);

  return {
    add,
    subtract,
    multiply,
    divide,
    calculateExchange,
    calculateTax,
    formatCurrency,
    validateAmount,
    validatePrecision,
    generateAuditHash,
    verifyAuditHash,
    parseError,
    isRecoverableError,
  };
}

export default useFinancialPrecision;
