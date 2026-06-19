import { format } from 'date-fns';

export const formatDate = (dateString) => {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM dd, yyyy');
};

export const formatMonth = (date) => {
  return format(date, 'MMMM yyyy');
};

export const formatCurrency = (amount, symbol = '₹') => {
  return `${symbol}${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};
