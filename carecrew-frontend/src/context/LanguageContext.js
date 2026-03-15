import { createContext, useContext, useState } from 'react'

const translations = {
  en: {
    dashboard: 'Dashboard',
    alerts: 'Alerts',
    hospitals: 'Hospitals',
    appointments: 'Appointments',
    logout: 'Logout',
    bookAppointment: 'Book Appointment',
    findHospital: 'Find Hospital',
    emergency: 'Find Emergency Hospital',
    submitReport: 'Submit Disease Report',
    submitCapacity: 'Submit Capacity',
    history: 'Submission History',
    wardName: 'Ward Name',
    disease: 'Disease',
    cases: 'Cases',
    beds: 'Available Beds',
    icu: 'ICU Available',
    riskLevel: 'Risk Level',
    lastUpdated: 'Last Updated',
    totalCases: 'Total Cases Today',
    wardsOnAlert: 'Wards on Alert',
    hospitalsReporting: 'Hospitals Reporting',
    appointmentsToday: 'Appointments Today',
    zone: 'Zone',
    population: 'Population',
    accessibilityIndex: 'Accessibility Index',
    outbreakAlert: 'Outbreak Alert',
    shortageAlert: 'Shortage Alert',
    confirmed: 'Confirmed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    green: 'Safe',
    yellow: 'Moderate Risk',
    red: 'High Risk'
  },
  mr: {
    dashboard: 'डॅशबोर्ड',
    alerts: 'सतर्कता',
    hospitals: 'रुग्णालये',
    appointments: 'भेटी',
    logout: 'बाहेर पडा',
    bookAppointment: 'भेट बुक करा',
    findHospital: 'रुग्णालय शोधा',
    emergency: 'आपत्कालीन रुग्णालय शोधा',
    submitReport: 'रोग अहवाल सादर करा',
    submitCapacity: 'क्षमता सादर करा',
    history: 'सादरीकरण इतिहास',
    wardName: 'वॉर्डाचे नाव',
    disease: 'रोग',
    cases: 'प्रकरणे',
    beds: 'उपलब्ध बेड',
    icu: 'ICU उपलब्ध',
    riskLevel: 'धोका पातळी',
    lastUpdated: 'शेवटचे अपडेट',
    totalCases: 'आजची एकूण प्रकरणे',
    wardsOnAlert: 'सतर्कतेवरील वॉर्ड',
    hospitalsReporting: 'अहवाल देणारी रुग्णालये',
    appointmentsToday: 'आजच्या भेटी',
    zone: 'झोन',
    population: 'लोकसंख्या',
    accessibilityIndex: 'प्रवेशयोग्यता निर्देशांक',
    outbreakAlert: 'उद्रेक सतर्कता',
    shortageAlert: 'तुटवडा सतर्कता',
    confirmed: 'पुष्टी झाली',
    pending: 'प्रलंबित',
    cancelled: 'रद्द केले',
    green: 'सुरक्षित',
    yellow: 'मध्यम धोका',
    red: 'उच्च धोका'
  }
}

const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en')

  const toggle = () => {
    setLanguage(prev => prev === 'en' ? 'mr' : 'en')
  }

  const t = (key) => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)