import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useAppContext } from '../context/AppContext';
import { calculateTotals, getMonthKey } from '../utils/calculations';
import { formatCurrency, formatMonth } from '../utils/format';
import { getMonthTransactions, getSixMonthsTrend } from '../storage/database';
import { typography } from '../theme';
import { TRANSACTION_TYPES } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { startOfMonth, subMonths, isAfter, format } from 'date-fns';
import Card from '../components/Card';

const screenWidth = Dimensions.get('window').width;

const colorPalette = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8A2BE2'
];

export default function AnalyticsScreen() {
  const { theme, settings, refreshTrigger } = useAppContext();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [trendData, setTrendData] = useState(null);

  const isCurrentMonth = getMonthKey(currentMonthDate) === getMonthKey(new Date());

  const handlePrevMonth = () => {
    const currentRealMonth = startOfMonth(new Date());
    const minMonth = subMonths(currentRealMonth, 2);
    const newMonth = subMonths(currentMonthDate, 1);
    
    if (!isAfter(minMonth, newMonth)) {
      setCurrentMonthDate(newMonth);
    }
  };

  const handleNextMonth = () => {
    if (!isCurrentMonth) {
      const newDate = new Date(currentMonthDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentMonthDate(newDate);
    }
  };

  const fetchMonthData = useCallback(async () => {
    const data = await getMonthTransactions(getMonthKey(currentMonthDate));
    setMonthTransactions(data);
  }, [currentMonthDate]);

  const fetchTrendData = useCallback(async () => {
    const rawData = await getSixMonthsTrend();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(format(d, 'yyyy-MM'));
    }
    
    const expenseData = months.map(m => {
      const found = rawData.find(r => r.month === m && r.type === TRANSACTION_TYPES.EXPENSE);
      return found ? found.total : 0;
    });

    const incomeData = months.map(m => {
      const found = rawData.find(r => r.month === m && r.type === TRANSACTION_TYPES.INCOME);
      return found ? found.total : 0;
    });

    // Check if there's any data at all to avoid empty chart crashes
    if (expenseData.every(v => v === 0) && incomeData.every(v => v === 0)) {
      setTrendData(null);
      return;
    }

    const labels = months.map(m => format(new Date(m + '-01T12:00:00Z'), 'MMM'));

    setTrendData({
      labels,
      datasets: [
        {
          data: expenseData,
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: incomeData,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Expense", "Income"]
    });
  }, []);

  useEffect(() => {
    fetchMonthData();
    fetchTrendData();
  }, [fetchMonthData, fetchTrendData, refreshTrigger]);

  const { totalExpense, totalIncome, netExpense } = useMemo(() => 
    calculateTotals(monthTransactions), 
  [monthTransactions]);

  const categoryData = useMemo(() => {
    const expenses = monthTransactions.filter(t => t.type === TRANSACTION_TYPES.EXPENSE);
    const categoryTotals = {};
    
    expenses.forEach(t => {
      if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
      categoryTotals[t.category] += parseFloat(t.amount);
    });

    const data = Object.keys(categoryTotals).map((key, index) => ({
      name: key,
      amount: categoryTotals[key],
      color: colorPalette[index % colorPalette.length],
      legendFontColor: theme.text,
      legendFontSize: 12
    }));

    // Sort by amount descending
    return data.sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, theme]);

  const chartConfig = {
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => theme.text,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: theme.text }]}>{formatMonth(currentMonthDate)}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }} disabled={isCurrentMonth}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card>
          <Text style={[typography.h3, { color: theme.text, marginBottom: 16 }]}>Monthly Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>Expense</Text>
              <Text style={[typography.body, { color: theme.danger, fontWeight: 'bold' }]}>{formatCurrency(totalExpense, settings.currencySymbol)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>Income</Text>
              <Text style={[typography.body, { color: theme.success, fontWeight: 'bold' }]}>{formatCurrency(totalIncome, settings.currencySymbol)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>Net</Text>
              <Text style={[typography.body, { color: theme.text, fontWeight: 'bold' }]}>{formatCurrency(netExpense, settings.currencySymbol)}</Text>
            </View>
          </View>
        </Card>

        {categoryData.length > 0 ? (
          <>
            <Card>
              <Text style={[typography.h3, { color: theme.text, marginBottom: 8 }]}>Expenses by Category</Text>
              <PieChart
                data={categoryData}
                width={screenWidth - 64}
                height={220}
                chartConfig={chartConfig}
                accessor={"amount"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
              />
            </Card>

            <Card>
              <Text style={[typography.h3, { color: theme.text, marginBottom: 16 }]}>Top Categories</Text>
              {categoryData.map((item, index) => (
                <View key={item.name} style={[styles.categoryRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={[typography.body, { color: theme.text }]}>{item.name}</Text>
                  </View>
                  <Text style={[typography.body, { color: theme.text, fontWeight: 'bold' }]}>{formatCurrency(item.amount, settings.currencySymbol)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[typography.body, { color: theme.textSecondary, marginTop: 16 }]}>
              No data for this month.
            </Text>
          </View>
        )}

        {trendData && (
          <Card style={{ marginTop: 16 }}>
            <Text style={[typography.h3, { color: theme.text, marginBottom: 16 }]}>6-Month Trend</Text>
            <LineChart
              data={trendData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => theme.primary,
                labelColor: (opacity = 1) => theme.text,
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: theme.surface
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  scrollContent: { paddingBottom: 24 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  }
});
