import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import Papa from 'papaparse';
import { useAppContext } from '../context/AppContext';
import { typography } from '../theme';
import { getMonthKey } from '../utils/calculations';
import { formatMonth, formatCurrency, formatDate } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { exportData } from '../storage/asyncStorage';
import { getAllTransactionsForExport } from '../storage/database';
import { TRANSACTION_TYPES } from '../constants/categories';

export default function SettingsScreen() {
  const { theme, settings, toggleDarkMode, toggleBiometric, updateCurrency, addCategory, deleteCategory, resetAllData, budgets, setBudget, handleImportData } = useAppContext();
  
  const currentMonthKey = getMonthKey(new Date());
  const currentMonthName = formatMonth(new Date());
  const [budgetInput, setBudgetInput] = useState(budgets[currentMonthKey] ? budgets[currentMonthKey].toString() : '');

  const handleSaveBudget = () => {
    if (!budgetInput || isNaN(budgetInput) || parseFloat(budgetInput) < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setBudget(currentMonthKey, parseFloat(budgetInput));
    Alert.alert('Success', 'Budget saved for ' + currentMonthName);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure? This will delete all your transactions, budgets, and records permanently.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear Data", style: "destructive", onPress: resetAllData }
      ]
    );
  };

  const handleExportCSV = async () => {
    try {
      const transactions = await getAllTransactionsForExport();
      const csvData = Papa.unparse(transactions);
      const fileUri = LegacyFileSystem.documentDirectory + 'transactions_backup.csv';
      
      await LegacyFileSystem.writeAsStringAsync(fileUri, csvData, { encoding: LegacyFileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Transactions (CSV)' });
      } else {
        Alert.alert('Export Successful', 'Data saved to ' + fileUri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const transactions = await getAllTransactionsForExport();
      const htmlRows = transactions.map(t => {
        const isExpense = t.type === TRANSACTION_TYPES.EXPENSE;
        const amountStr = isExpense ? `-${formatCurrency(t.amount, settings.currencySymbol)}` : `+${formatCurrency(t.amount, settings.currencySymbol)}`;
        const color = isExpense ? '#f44336' : '#4caf50';
        return `
          <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.note || t.category}</td>
            <td>${t.category}</td>
            <td style="color: ${color}; font-weight: bold; text-align: right;">${amountStr}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f8f9fa; color: #333; }
            </style>
          </head>
          <body>
            <h1>Expense Tracker Report</h1>
            <table>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th style="text-align: right;">Amount</th>
              </tr>
              ${htmlRows}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const pdfUri = LegacyFileSystem.documentDirectory + 'transactions_report.pdf';
      
      // Move to document directory to give it a proper name and ensure readability
      await LegacyFileSystem.moveAsync({
        from: uri,
        to: pdfUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Export Transactions (PDF)' });
      } else {
        Alert.alert('Export Successful', 'Data saved to ' + pdfUri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to export PDF');
    }
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true
      });
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const fileContents = await LegacyFileSystem.readAsStringAsync(fileUri, { encoding: LegacyFileSystem.EncodingType.UTF8 });
        
        Papa.parse(fileContents, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            if (results.data && results.data.length > 0) {
              const fullData = await exportData(); // get current data (budgets, records, etc)
              // Override transactions with imported CSV rows
              fullData.transactions = results.data.map(row => ({
                id: row.id || Date.now().toString() + Math.random().toString(),
                type: row.type,
                amount: parseFloat(row.amount),
                category: row.category,
                date: row.date,
                note: row.note
              }));
              
              Alert.alert(
                "Import Data",
                `Found ${results.data.length} transactions. This will replace your current transactions. Proceed?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Import", onPress: () => handleImportData(fullData) }
                ]
              );
            } else {
              Alert.alert('Error', 'No valid data found in CSV file.');
            }
          },
          error: (error) => {
            console.error(error);
            Alert.alert('Error', 'Failed to parse CSV file.');
          }
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to import CSV.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card>
        <Text style={[typography.h3, { color: theme.text, marginBottom: 16 }]}>Monthly Budget</Text>
        <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 8 }]}>Set limit for {currentMonthName}</Text>
        <View style={styles.budgetRow}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, flex: 1, marginRight: 8 }]}
            value={budgetInput}
            onChangeText={setBudgetInput}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
          />
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, marginRight: 8 }]} onPress={handleSaveBudget}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
          </TouchableOpacity>
          {budgets[currentMonthKey] > 0 && (
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.danger }]} 
              onPress={() => {
                setBudget(currentMonthKey, 0);
                setBudgetInput('');
                Alert.alert('Deleted', 'Budget limit removed for ' + currentMonthName);
              }}
            >
              <Ionicons name="trash" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.text, marginBottom: 16 }]}>Preferences</Text>
        
        <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1, paddingBottom: 16, marginBottom: 16 }]}>
          <View style={styles.rowCenter}>
            <Ionicons name="moon-outline" size={24} color={theme.text} style={{marginRight: 12}} />
            <Text style={[typography.body, { color: theme.text }]}>Dark Mode</Text>
          </View>
          <Switch 
            value={settings.isDarkMode} 
            onValueChange={toggleDarkMode} 
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1, paddingBottom: 16, marginBottom: 16 }]}>
          <View style={styles.rowCenter}>
            <Ionicons name="finger-print-outline" size={24} color={theme.text} style={{marginRight: 12}} />
            <Text style={[typography.body, { color: theme.text }]}>Biometric Lock</Text>
          </View>
          <Switch 
            value={settings.biometricEnabled} 
            onValueChange={toggleBiometric} 
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1, paddingBottom: 16 }]}>
          <View style={styles.rowCenter}>
            <Ionicons name="cash-outline" size={24} color={theme.text} style={{marginRight: 12}} />
            <Text style={[typography.body, { color: theme.text }]}>Currency Symbol</Text>
          </View>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, width: 60, textAlign: 'center', padding: 8 }]}
            value={settings.currencySymbol}
            onChangeText={updateCurrency}
            maxLength={3}
          />
        </View>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.text, marginBottom: 16 }]}>Manage Categories</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
          {settings.categories.map(cat => (
            <View key={cat} style={[styles.categoryChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: theme.text, marginRight: 8 }}>{cat}</Text>
              <TouchableOpacity onPress={() => deleteCategory(cat)}>
                <Ionicons name="close-circle" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, flex: 1, marginRight: 8 }]}
            placeholder="New category..."
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={(e) => {
              const val = e.nativeEvent.text.trim();
              if (val) addCategory(val);
              e.target.clear();
            }}
          />
        </View>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.text, marginBottom: 16 }]}>Data Management</Text>
        
        <TouchableOpacity style={[styles.actionBtn, { borderBottomColor: theme.border, borderBottomWidth: 1 }]} onPress={handleExportCSV}>
          <View style={styles.rowCenter}>
            <Ionicons name="document-text-outline" size={24} color={theme.success} style={{marginRight: 12}} />
            <Text style={[typography.body, { color: theme.text }]}>Export Transactions (CSV / Excel)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { borderBottomColor: theme.border, borderBottomWidth: 1 }]} onPress={handleExportPDF}>
          <View style={styles.rowCenter}>
            <Ionicons name="document-outline" size={24} color={theme.danger} style={{marginRight: 12}} />
            <Text style={[typography.body, { color: theme.text }]}>Export Transactions (PDF)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { borderBottomColor: theme.border, borderBottomWidth: 1 }]} onPress={handleImportCSV}>
          <View style={styles.rowCenter}>
            <Ionicons name="cloud-download-outline" size={24} color={theme.primary} style={{marginRight: 12}} />
            <Text style={[typography.body, { color: theme.text }]}>Import Transactions (CSV)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleClearData}>
          <View style={styles.rowCenter}>
            <Ionicons name="trash-outline" size={24} color={theme.danger} style={{marginRight: 12}} />
            <Text style={[typography.body, { color: theme.danger }]}>Clear All Data</Text>
          </View>
        </TouchableOpacity>
      </Card>
      
      <View style={{ alignItems: 'center', marginVertical: 32 }}>
        <Text style={[typography.small, { color: theme.textSecondary }]}>Expense Tracker App</Text>
        <Text style={[typography.small, { color: theme.textSecondary }]}>Made with React Native & Expo</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  }
});
