// Version: 001.00002
// Service Categories Constants
// Used for "current_need" and "offerings" fields

const SERVICE_CATEGORIES = {
  EMERGENCY: {
    label: 'Спешни',
    subcategories: [
      'Доктор',
      'Болница',
      'Бърза помощ',
      'Полиция',
      'Загубих се/ориентир'
    ]
  },
  
  CRAFTSMAN: {
    label: 'Майстор',
    subcategories: [
      'Строител',
      'Електротехник',
      'Вик майстор',
      'Шпакловчик',
      'Автомонтьор',
      'Помпане на гуми'
    ]
  },
  
  TRANSLATOR: {
    label: 'Преводач',
    subcategories: [
      'Английски',
      'Турски',
      'Китайски',
      'Френски',
      'Португалски',
      'Суахили',
      'Немски',
      'Италиански',
      'Испански',
      'Руски'
    ]
  },
  
  FOOD_DRINK: {
    label: 'Храна/Пиене',
    subcategories: [
      'Ресторант висока класа',
      'Ресторант бързо хранене',
      'Сладкарница/кафене',
      'Пиене',
      'Ядене'
    ]
  },
  
  SOCIAL: {
    label: 'Социално',
    subcategories: [
      'Любов',
      'Сериозно запознанство',
      'Еднократно забавление',
      'Приятели',
      'Просто чат',
      'Научни дискусии',
      'Политика'
    ]
  }
};

// Services that require admin verification
const VERIFIED_ONLY_SERVICES = [
  'Доктор',
  'Болница',
  'Бърза помощ',
  'Полиция'
];

// All available services (flat list)
const ALL_SERVICES = Object.values(SERVICE_CATEGORIES)
  .flatMap(category => category.subcategories);

// Services available for regular users in "offerings"
const PUBLIC_OFFERING_SERVICES = ALL_SERVICES.filter(
  service => !VERIFIED_ONLY_SERVICES.includes(service)
);

// Check if a service requires verification
function requiresVerification(service) {
  return VERIFIED_ONLY_SERVICES.includes(service);
}

// Check if user can offer a service
function canOffer(service, isVerified) {
  if (requiresVerification(service)) {
    return isVerified; // Only verified users can offer emergency services
  }
  return true; // Anyone can offer public services
}

// Validate offerings (max 3)
function validateOfferings(offerings) {
  if (!offerings) return { valid: true };
  
  const list = offerings.split(',').map(s => s.trim()).filter(Boolean);
  
  if (list.length > 3) {
    return { valid: false, error: 'Maximum 3 offerings allowed' };
  }
  
  for (const service of list) {
    if (!ALL_SERVICES.includes(service)) {
      return { valid: false, error: `Invalid service: ${service}` };
    }
  }
  
  return { valid: true };
}

module.exports = {
  SERVICE_CATEGORIES,
  VERIFIED_ONLY_SERVICES,
  ALL_SERVICES,
  PUBLIC_OFFERING_SERVICES,
  requiresVerification,
  canOffer,
  validateOfferings
};
