import { startOfMonth, endOfMonth, isWithinInterval, format, parseISO, differenceInDays } from 'date-fns';
import { TRANSACTION_TYPES } from '../constants/categories';

export const getMonthKey = (date) => {
  return format(date, 'yyyy-MM');
};

export const filterTransactionsByMonth = (transactions, monthDate) => {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  
  return transactions.filter(t => {
    const tDate = new Date(t.date);
    return isWithinInterval(tDate, { start, end });
  });
};

export const calculateTotals = (transactions) => {
  let totalExpense = 0;
  let totalIncome = 0;

  transactions.forEach(t => {
    const amount = parseFloat(t.amount);
    if (t.type === TRANSACTION_TYPES.EXPENSE) {
      totalExpense += amount;
    } else if (t.type === TRANSACTION_TYPES.INCOME) {
      totalIncome += amount;
    }
  });

  const netExpense = totalExpense - totalIncome;
  
  return {
    totalExpense,
    totalIncome,
    netExpense: netExpense > 0 ? netExpense : 0 // sometimes income > expense
  };
};

export const calculateBudgetInfo = (budgetLimit, netExpense, monthDate) => {
  const limit = parseFloat(budgetLimit) || 0;
  const remaining = limit - netExpense;
  const usagePercentage = limit > 0 ? (netExpense / limit) * 100 : 0;
  
  const today = new Date();
  const isCurrentMonth = getMonthKey(today) === getMonthKey(monthDate);
  
  let daysPassed = 1;
  let remainingDays = 1;
  
  if (isCurrentMonth) {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    daysPassed = differenceInDays(today, start) + 1;
    remainingDays = differenceInDays(end, today);
    if (remainingDays === 0) remainingDays = 1; // avoid division by zero
  } else {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    daysPassed = differenceInDays(end, start) + 1;
    remainingDays = 0;
  }

  const dailyAverage = netExpense / daysPassed;
  const recommendedDaily = remaining > 0 && remainingDays > 0 ? remaining / remainingDays : 0;

  return {
    limit,
    remaining,
    usagePercentage,
    dailyAverage,
    recommendedDaily,
    isExceeded: remaining < 0,
    daysPassed,
    remainingDays
  };
};
