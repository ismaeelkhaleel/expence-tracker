import React, { createContext, useState, useEffect, useContext } from 'react';
import { loadData, clearAllData } from '../storage/asyncStorage';
import * as DB from '../storage/database';
import { lightTheme, darkTheme } from '../theme';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [budgets, setBudgets] = useState({});
  const [lendRecords, setLendRecords] = useState([]);
  const [borrowRecords, setBorrowRecords] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger to tell screens to re-fetch SQLite data
  
  const [settings, setSettings] = useState({
    isDarkMode: false,
    currencySymbol: '₹',
    categories: EXPENSE_CATEGORIES,
    biometricEnabled: false
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setIsLoading(true);
    
    // 1. Initialize SQLite
    await DB.initDB();
    
    // 2. Check for migration from AsyncStorage
    let dbSettings = await DB.getSettings();
    if (!dbSettings.migratedFromAsyncStorage) {
      const oldData = await loadData();
      if (oldData && (oldData.transactions?.length > 0 || oldData.lendRecords?.length > 0)) {
        for (const t of oldData.transactions || []) await DB.insertTransaction(t);
        for (const r of oldData.lendRecords || []) await DB.insertBorrowLend({ ...r, type: 'lend' });
        for (const r of oldData.borrowRecords || []) await DB.insertBorrowLend({ ...r, type: 'borrow' });
        for (const key of Object.keys(oldData.budgets || {})) await DB.saveBudgetDB(key, oldData.budgets[key]);
        
        await DB.saveSetting('isDarkMode', oldData.settings?.isDarkMode || false);
      }
      await DB.saveSetting('migratedFromAsyncStorage', true);
      dbSettings = await DB.getSettings();
    }

    // 3. Load all from SQLite
    const blRows = await DB.getBorrowLendRecords();
    setLendRecords(blRows.filter(r => r.type === 'lend'));
    setBorrowRecords(blRows.filter(r => r.type === 'borrow'));

    const bRows = await DB.getBudgets();
    setBudgets(bRows);

    const loadedSettings = {
      isDarkMode: dbSettings.isDarkMode === true || dbSettings.isDarkMode === 'true',
      currencySymbol: dbSettings.currencySymbol || '₹',
      categories: dbSettings.categories || EXPENSE_CATEGORIES,
      biometricEnabled: dbSettings.biometricEnabled === true || dbSettings.biometricEnabled === 'true'
    };
    setSettings(loadedSettings);

    // 4. Biometric
    if (loadedSettings.biometricEnabled) {
      await performAuthentication();
    } else {
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  };

  const performAuthentication = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Expense Tracker',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        Alert.alert('Authentication Failed', 'Please authenticate to view your data.', [
          { text: 'Try Again', onPress: () => performAuthentication() }
        ]);
      }
    } else {
      setIsAuthenticated(true);
    }
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const addTransaction = async (transaction) => {
    await DB.insertTransaction(transaction);
    triggerRefresh();
  };

  const editTransaction = async (id, updatedTransaction) => {
    await DB.updateTransaction(updatedTransaction);
    triggerRefresh();
  };

  const deleteTransaction = async (id) => {
    await DB.deleteTransaction(id);
    triggerRefresh();
  };

  const setBudget = async (monthKey, amount) => {
    await DB.saveBudgetDB(monthKey, amount);
    setBudgets({ ...budgets, [monthKey]: amount });
  };

  const addLendRecord = async (record) => {
    const r = { ...record, type: 'lend' };
    await DB.insertBorrowLend(r);
    setLendRecords([r, ...lendRecords]);
  };

  const editLendRecord = async (id, updatedRecord) => {
    const r = { ...updatedRecord, type: 'lend' };
    await DB.updateBorrowLend(r);
    setLendRecords(lendRecords.map(item => item.id === id ? r : item));
  };

  const deleteLendRecord = async (id) => {
    await DB.deleteBorrowLend(id);
    setLendRecords(lendRecords.filter(item => item.id !== id));
  };

  const addBorrowRecord = async (record) => {
    const r = { ...record, type: 'borrow' };
    await DB.insertBorrowLend(r);
    setBorrowRecords([r, ...borrowRecords]);
  };

  const editBorrowRecord = async (id, updatedRecord) => {
    const r = { ...updatedRecord, type: 'borrow' };
    await DB.updateBorrowLend(r);
    setBorrowRecords(borrowRecords.map(item => item.id === id ? r : item));
  };

  const deleteBorrowRecord = async (id) => {
    await DB.deleteBorrowLend(id);
    setBorrowRecords(borrowRecords.filter(item => item.id !== id));
  };

  const updateSetting = async (key, value) => {
    await DB.saveSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleDarkMode = () => updateSetting('isDarkMode', !settings.isDarkMode);
  const toggleBiometric = () => updateSetting('biometricEnabled', !settings.biometricEnabled);
  const updateCurrency = (symbol) => updateSetting('currencySymbol', symbol);
  
  const addCategory = (cat) => {
    if (!settings.categories.includes(cat)) {
      updateSetting('categories', [...settings.categories, cat]);
    }
  };
  const deleteCategory = (cat) => {
    updateSetting('categories', settings.categories.filter(c => c !== cat));
  };

  const resetAllData = async () => {
    await DB.clearAllDataDB();
    await clearAllData();
    setBudgets({});
    setLendRecords([]);
    setBorrowRecords([]);
    setSettings({
      isDarkMode: false,
      currencySymbol: '₹',
      categories: EXPENSE_CATEGORIES,
      biometricEnabled: false
    });
    await DB.saveSetting('migratedFromAsyncStorage', true);
    triggerRefresh();
  };

  const handleImportData = async (data) => {
    // Only imports are old JSON transactions in this state
    if (data.transactions) {
      for (const t of data.transactions) await DB.insertTransaction(t);
    }
    await initApp();
    triggerRefresh();
  };

  const theme = settings.isDarkMode ? darkTheme : lightTheme;

  return (
    <AppContext.Provider value={{
      refreshTrigger, addTransaction, editTransaction, deleteTransaction,
      budgets, setBudget,
      lendRecords, addLendRecord, editLendRecord, deleteLendRecord,
      borrowRecords, addBorrowRecord, editBorrowRecord, deleteBorrowRecord,
      settings, updateSetting, toggleDarkMode, toggleBiometric, updateCurrency, addCategory, deleteCategory,
      resetAllData, handleImportData,
      theme, isLoading, isAuthenticated, performAuthentication
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
