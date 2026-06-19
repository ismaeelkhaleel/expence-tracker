const fs = require('fs');

const files = [
  'src/screens/AnalyticsScreen.js',
  'src/screens/BorrowLendScreen.js',
  'src/screens/HomeScreen.js',
  'src/screens/SettingsScreen.js',
  'src/screens/TransactionsScreen.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // ensure settings is extracted
  if (!content.includes('settings')) {
    // AnalyticsScreen.js: const { theme, transactions } = useAppContext();
    content = content.replace('const { theme, transactions } = useAppContext();', 'const { theme, transactions, settings } = useAppContext();');
    
    // BorrowLendScreen.js: const { theme, lendRecords, borrowRecords } = useAppContext();
    content = content.replace('const { theme, lendRecords, borrowRecords } = useAppContext();', 'const { theme, lendRecords, borrowRecords, settings } = useAppContext();');
    
    // HomeScreen.js: const { theme, transactions, budgets } = useAppContext();
    content = content.replace('const { theme, transactions, budgets } = useAppContext();', 'const { theme, transactions, budgets, settings } = useAppContext();');
    
    // TransactionsScreen.js: const { theme, transactions, deleteTransaction } = useAppContext();
    content = content.replace('const { theme, transactions, deleteTransaction } = useAppContext();', 'const { theme, transactions, deleteTransaction, settings } = useAppContext();');
  }

  // replace formatCurrency(xyz) with formatCurrency(xyz, settings.currencySymbol)
  content = content.replace(/formatCurrency\(([^,)]+)\)/g, 'formatCurrency($1, settings.currencySymbol)');
  
  fs.writeFileSync(file, content);
});
