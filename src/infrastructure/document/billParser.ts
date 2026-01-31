export interface ParsedBillData {
  vendor: string | null;
  amount: number | null;
  dueDate: Date | null;
  accountNumber: string | null;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
}

// Common vendor patterns - order matters, more specific patterns first
const VENDOR_PATTERNS = [
  // Government / public sector (check first as they're common employers)
  /^(Government\s+of\s+[A-Za-z]+)/im,
  // Utilities
  /(?:from|bill from|billed by|payable to)[:\s]*([A-Z][A-Za-z\s&]+(?:Electric|Gas|Water|Power|Energy|Utilities?))/i,
  // Telecom
  /(?:from|bill from)[:\s]*([A-Z][A-Za-z\s&]+(?:Wireless|Mobile|Telecom|Communications?|Internet|Broadband))/i,
  // Employer / Pay stub patterns
  /(?:employer|company|paid by)[:\s]*([A-Za-z][A-Za-z\s&\-\.]{2,40})/i,
  /^([A-Za-z][A-Za-z\s&\-\.]+(?:Inc\.?|LLC|Corp\.?|Ltd\.?|Government|University|College|Hospital|Agency))/im,
  // Generic company names at top of document
  /^([A-Z][A-Z\s&]{2,30}(?:Inc\.?|LLC|Corp\.?|Company|Co\.?)?)\s*$/m,
];

// Amount patterns (various formats)
const AMOUNT_PATTERNS = [
  // Bill patterns
  /(?:total\s*(?:amount\s*)?due|amount\s*due|total\s*due|balance\s*due|please\s*pay|pay\s*this\s*amount)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
  /(?:total|amount|balance)[:\s]*\$\s*([\d,]+\.\d{2})/i,
  /\$\s*([\d,]+\.\d{2})(?:\s*(?:due|total|balance))/i,
  /(?:due|owe|pay)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  // Pay stub / income patterns
  /(?:net\s*pay|net\s*amount|take\s*home|direct\s*deposit|net\s*deposit)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  /(?:total\s*net|net\s*total|amount\s*deposited|deposit\s*amount)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  /(?:gross\s*pay|gross\s*earnings|total\s*earnings)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  /(?:this\s*period)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  /(?:net\s*claim\s*amt\.?|net\s*claim\s*amount)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
];

// Date patterns
const DATE_PATTERNS = [
  // Bill patterns
  /(?:due\s*date|payment\s*due|due\s*by|pay\s*by|due)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  /(?:due\s*date|payment\s*due|due\s*by|pay\s*by|due)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s*(?:due|deadline))/i,
  // Pay stub patterns
  /(?:pay\s*date|payment\s*date|paid\s*on|check\s*date|advice\s*date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  /(?:pay\s*end\s*date|period\s*end(?:ing)?|pay\s*period\s*end)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  /(?:pay\s*date|payment\s*date|advice\s*date)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
];

// Account number patterns
const ACCOUNT_PATTERNS = [
  /(?:account\s*(?:number|#|no\.?)?|acct\.?\s*(?:#|no\.?)?)[:\s]*([A-Z0-9\-]{5,20})/i,
  /(?:customer\s*(?:id|number|#))[:\s]*([A-Z0-9\-]{5,20})/i,
];

/**
 * Parse bill data from extracted text
 */
export function parseBillData(text: string): ParsedBillData {
  const result: ParsedBillData = {
    vendor: null,
    amount: null,
    dueDate: null,
    accountNumber: null,
    confidence: 'low',
    rawText: text,
  };

  // Extract vendor
  for (const pattern of VENDOR_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.vendor = cleanVendorName(match[1]);
      break;
    }
  }

  // Extract amount
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        result.amount = amount;
        break;
      }
    }
  }

  // Extract due date
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const date = parseDate(match[1]);
      if (date) {
        result.dueDate = date;
        break;
      }
    }
  }

  // Extract account number
  for (const pattern of ACCOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.accountNumber = match[1].trim();
      break;
    }
  }

  // Calculate confidence
  const fieldsFound = [result.vendor, result.amount, result.dueDate].filter(Boolean).length;
  if (fieldsFound >= 3) {
    result.confidence = 'high';
  } else if (fieldsFound >= 2) {
    result.confidence = 'medium';
  } else {
    result.confidence = 'low';
  }

  return result;
}

function cleanVendorName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&\-\.]/g, '')
    .substring(0, 50);
}

function parseDate(dateStr: string): Date | null {
  try {
    // Try various date formats
    const cleaned = dateStr.trim();

    // MM/DD/YYYY or MM-DD-YYYY
    const slashMatch = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      let year = parseInt(slashMatch[3]);
      if (year < 100) year += 2000;
      const date = new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
      if (!isNaN(date.getTime())) return date;
    }

    // Month DD, YYYY
    const monthMatch = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (monthMatch) {
      const date = new Date(`${monthMatch[1]} ${monthMatch[2]}, ${monthMatch[3]}`);
      if (!isNaN(date.getTime())) return date;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Suggest a category based on vendor name and transaction type
 */
export function suggestCategory(vendor: string | null, type: 'income' | 'expense' = 'expense'): string | null {
  if (!vendor) return null;

  const v = vendor.toLowerCase();

  if (type === 'income') {
    // Income category suggestions
    if (/government|federal|state|province|ei\b|employment\s*insurance|benefits/i.test(v)) return 'cat-income-other';
    if (/freelance|contract|consulting|gig/i.test(v)) return 'cat-income-freelance';
    if (/dividend|stock|etf|investment|capital\s*gain/i.test(v)) return 'cat-income-investments';
    if (/interest|savings|bank/i.test(v)) return 'cat-income-investments';
    // Default to salary for most employer-like names
    return 'cat-income-salary';
  }

  // Expense category suggestions
  if (/electric|power|energy/.test(v)) return 'cat-expense-utilities';
  if (/gas|propane/.test(v)) return 'cat-expense-utilities';
  if (/water|sewer/.test(v)) return 'cat-expense-utilities';
  if (/internet|cable|broadband|wifi/.test(v)) return 'cat-expense-subscriptions';
  if (/wireless|mobile|phone|cellular|verizon|at&t|t-mobile/.test(v)) return 'cat-expense-subscriptions';
  if (/insurance/.test(v)) return 'cat-expense-other';
  if (/mortgage|rent|housing/.test(v)) return 'cat-expense-housing';
  if (/netflix|hulu|spotify|disney|hbo|streaming/.test(v)) return 'cat-expense-subscriptions';
  if (/grocery|groceries|supermarket|walmart|costco|safeway/i.test(v)) return 'cat-expense-groceries';
  if (/restaurant|dining|cafe|coffee|starbucks|mcdonald/i.test(v)) return 'cat-expense-dining';
  if (/uber|lyft|taxi|transit|bus|subway|parking|fuel/i.test(v)) return 'cat-expense-transportation';
  if (/amazon|shop|store|mall/i.test(v)) return 'cat-expense-shopping';
  if (/doctor|hospital|pharmacy|medical|dental|health/i.test(v)) return 'cat-expense-health';
  if (/movie|cinema|theater|concert|ticket|entertainment/i.test(v)) return 'cat-expense-entertainment';

  return null;
}
