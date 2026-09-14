/**
 * emailTimeHelper.js
 * 
 * Provides robust, timezone-aware date and greeting calculations for Vista Holidays emails.
 * All calculations explicitly use the Asia/Kolkata (IST) timezone.
 */

/**
 * Extract IST date and time parts reliably using Intl.DateTimeFormat
 * @param {Date|string|number} date 
 * @returns {object} { hour, weekday, isWeekend, year, month, day, minute, second }
 */
export const getISTDateComponents = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  
  // Guard for invalid date
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  });

  const parts = formatter.formatToParts(validDate);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const hour = parseInt(partMap.hour, 10) % 24;
  const weekday = partMap.weekday; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  return {
    hour,
    weekday,
    isWeekend,
    year: parseInt(partMap.year, 10),
    month: partMap.month,
    day: partMap.day,
    minute: partMap.minute,
    second: partMap.second
  };
};

/**
 * Computes dynamic time-based and weekend greetings based on IST
 * 
 * Time rules:
 *   12:00 AM – 11:59 AM (hour 0-11): Good Morning 🌅
 *   12:00 PM – 4:59 PM  (hour 12-16): Good Afternoon ☀️
 *   5:00 PM – 11:59 PM  (hour 17-23): Good Evening 🌙
 * 
 * Weekend rule:
 *   Saturday & Sunday: Prepend "Happy Weekend 🎉"
 * 
 * @param {object} options
 * @param {string} options.userName
 * @param {Date|string|number} [options.date]
 * @returns {object} { isWeekend, weekendGreeting, timeGreeting, fullGreetingHtml, fullGreetingText }
 */
export const getISTGreeting = ({ userName = '', date = new Date() } = {}) => {
  const { hour, isWeekend } = getISTDateComponents(date);

  let timeBase = 'Good Morning 🌅';
  if (hour >= 12 && hour < 17) {
    timeBase = 'Good Afternoon ☀️';
  } else if (hour >= 17) {
    timeBase = 'Good Evening 🌙';
  }

  // Never use generic "Hello User" unless name cannot be determined
  const cleanName = (userName && String(userName).trim()) || 'Traveler';
  const personalizedGreeting = `${timeBase}, ${cleanName}`;
  const weekendGreeting = isWeekend ? 'Happy Weekend 🎉' : null;

  const fullGreetingHtml = isWeekend
    ? `<div style="font-size: 15px; font-weight: 700; color: #0284c7; margin-bottom: 6px; letter-spacing: 0.5px;">Happy Weekend 🎉</div>
       <div style="font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">${personalizedGreeting}</div>`
    : `<div style="font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">${personalizedGreeting}</div>`;

  const fullGreetingText = isWeekend
    ? `Happy Weekend 🎉\n${personalizedGreeting}`
    : personalizedGreeting;

  return {
    isWeekend,
    weekendGreeting,
    timeGreeting: personalizedGreeting,
    fullGreetingHtml,
    fullGreetingText
  };
};

/**
 * Formats a given timestamp to Indian Standard Time (Asia/Kolkata)
 * Example output: "14 Sep 2026, 09:30 PM IST"
 * @param {Date|string|number} date 
 * @returns {string}
 */
export const formatISTDateTime = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const options = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  return new Intl.DateTimeFormat('en-IN', options).format(validDate) + ' IST';
};

/**
 * Returns the current year in IST
 * @returns {number}
 */
export const getCurrentISTYear = () => {
  return getISTDateComponents().year;
};

export default {
  getISTDateComponents,
  getISTGreeting,
  formatISTDateTime,
  getCurrentISTYear
};
