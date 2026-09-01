// ============================================================
// i18n.js — Multilingual UI Translations
// Supported: English (en), Hindi (hi), Marathi (mr)
// ============================================================

const TRANSLATIONS = {
  en: {
    // Nav
    nav_citizen_portal: "Citizen Portal",
    nav_dashboard: "Municipal Authority Dashboard",
    nav_citizen_login: "Citizen Login",
    nav_admin_login: "Admin Login",
    nav_logout: "Logout",
    lang_label: "Language",

    // Citizen Form
    form_title: "Submit Citizen Grievance",
    form_desc: "Report civic issues in English, Hindi, or Marathi with location & photo evidence.",
    form_lang_label: "Complaint Language",
    form_complaint_label: "Complaint Description",
    form_complaint_placeholder: "Describe the issue in detail (e.g. Dangerous pothole near ABC College)...",
    form_location_label: "Location / Area",
    form_pick_map: "📍 Pick on Map",
    form_use_gps: "📡 Use My Location",
    form_photo_label: "Optional Photo Evidence",
    form_demo_label: "Demo Test Inputs (Click to paste):",
    form_submit_btn: "Submit Complaint & Process AI",
    form_submit_loading: "AI Analyzing Complaint...",
    form_voice_btn: "Voice Input",

    // Voice Recorder
    voice_title: "Voice Complaint Recorder",
    voice_desc: "Tap record, speak your complaint, then submit for AI transcription.",
    voice_start: "🎙️ Start Recording",
    voice_stop: "⏹️ Stop Recording",
    voice_rerecord: "🔄 Re-record",
    voice_send: "📤 Send for Transcription",
    voice_preview: "Audio Preview:",
    voice_recording: "Recording...",
    voice_transcribing: "Transcribing voice...",
    voice_success: "Voice transcribed! Review & submit below.",
    voice_err_permission: "Microphone permission denied. Please allow microphone access in your browser settings.",
    voice_err_unsupported: "Voice recording is not supported in this browser. Please use Chrome or Firefox.",
    voice_err_failed: "Voice processing failed. Please try again or type your complaint.",
    voice_err_no_speech: "No audio detected. Please try speaking again.",

    // Location Picker
    map_modal_title: "Pick Complaint Location",
    map_instruction: "Click/tap on the map to pin your location, or drag the marker.",
    map_selected: "Selected Location:",
    map_confirm_btn: "Confirm Location",
    map_cancel_btn: "Cancel",
    map_use_gps: "📡 Use My Location",
    map_gps_error: "Could not get your location. Please pick manually.",
    map_geocoding: "Looking up address...",
    map_no_address: "Location selected",

    // AI Results
    ai_complete: "AI ANALYSIS COMPLETE",
    ai_priority: "Priority",
    ai_category: "Category",
    ai_department: "Routing Department",
    ai_summary: "Issue Summary",
    ai_why: "Why",
    ai_duplicate: "Duplicate / Related Complaints Detected!",
    ai_duplicate_desc: "existing report(s) found describing the same issue at this location cluster.",
    ai_ticket: "Ticket Ref",
    ai_status: "Status",
    ai_standby_title: "AI Pipeline Standing By",
    ai_standby_desc: "Submit a complaint on the left to see real-time AI classification, priority detection, department routing, duplicate detection, and summary.",

    // Timeline Tracker
    tracker_title: "Live Grievance Timeline Tracker",
    tracker_desc: "Track on-ground redressal progress and visual proof of resolution in real time.",
    tracker_btn: "Track Status",

    // Dashboard
    dash_title: "Municipal Authority Command Dashboard",
    dash_desc: "Monitor grievance statistics, AI routing, duplicate clusters, and smart Officer Assistant recommendations.",
    dash_stat_total: "Total Complaints",
    dash_stat_pending: "Pending Action",
    dash_stat_high: "High Priority",
    dash_stat_resolved: "Resolved",
    dash_stat_clusters: "Related Clusters",
    dash_filter_all_cat: "All Categories",
    dash_filter_all_pri: "All Priorities",
    dash_filter_all_status: "All Statuses",
    dash_search_placeholder: "Search by text, location, or ticket ID...",
    dash_col_ticket: "Ticket ID",
    dash_col_summary: "Summary",
    dash_col_category: "Category",
    dash_col_priority: "Priority",
    dash_col_department: "Department",
    dash_col_status: "Status",
    dash_col_date: "Date",
    dash_col_related: "Related",
    dash_loading: "Loading dashboard data...",
    dash_hotspot_title: "Live Hotspot Radar Visualization",
    dash_cluster_title: "Active Grievance Clusters",
    dash_no_hotspot: "No hotspot clusters detected.",
    dash_restricted_title: "Municipal Authority Dashboard",
    dash_restricted_desc: "This dashboard is exclusively managed by Municipal Corporation Officials. Please log in with your official government credentials.",
    dash_restricted_notice: "Citizens are not permitted to access the Municipal Authority Dashboard.",
    dash_go_admin_login: "Go to Municipal Admin Login",

    // Errors
    err_empty_complaint: "Please enter a complaint description.",
    err_server: "Server error",
    err_processing: "Error processing grievance",
  },

  hi: {
    // Nav
    nav_citizen_portal: "नागरिक पोर्टल",
    nav_dashboard: "नगर पालिका प्राधिकरण डैशबोर्ड",
    nav_citizen_login: "नागरिक लॉगिन",
    nav_admin_login: "एडमिन लॉगिन",
    nav_logout: "लॉगआउट",
    lang_label: "भाषा",

    // Citizen Form
    form_title: "नागरिक शिकायत दर्ज करें",
    form_desc: "हिंदी, अंग्रेज़ी या मराठी में स्थान व फोटो सहित नागरिक समस्याएँ रिपोर्ट करें।",
    form_lang_label: "शिकायत की भाषा",
    form_complaint_label: "शिकायत विवरण",
    form_complaint_placeholder: "समस्या का विस्तृत विवरण दें (जैसे: ABC कॉलेज के पास बड़ा गड्ढा)...",
    form_location_label: "स्थान / क्षेत्र",
    form_pick_map: "📍 मानचित्र पर चुनें",
    form_use_gps: "📡 मेरा स्थान उपयोग करें",
    form_photo_label: "वैकल्पिक फोटो प्रमाण",
    form_demo_label: "डेमो इनपुट (क्लिक करें):",
    form_submit_btn: "शिकायत दर्ज करें और AI प्रोसेस करें",
    form_submit_loading: "AI शिकायत का विश्लेषण कर रहा है...",
    form_voice_btn: "आवाज़ इनपुट",

    // Voice Recorder
    voice_title: "आवाज़ शिकायत रिकॉर्डर",
    voice_desc: "रिकॉर्ड दबाएँ, शिकायत बोलें, फिर AI ट्रांसक्रिप्शन के लिए भेजें।",
    voice_start: "🎙️ रिकॉर्डिंग शुरू करें",
    voice_stop: "⏹️ रिकॉर्डिंग रोकें",
    voice_rerecord: "🔄 दोबारा रिकॉर्ड करें",
    voice_send: "📤 ट्रांसक्रिप्शन के लिए भेजें",
    voice_preview: "ऑडियो प्रीव्यू:",
    voice_recording: "रिकॉर्डिंग हो रही है...",
    voice_transcribing: "आवाज़ ट्रांसक्राइब हो रही है...",
    voice_success: "आवाज़ ट्रांसक्राइब हुई! नीचे समीक्षा करें और सबमिट करें।",
    voice_err_permission: "माइक्रोफोन की अनुमति अस्वीकृत। कृपया ब्राउज़र सेटिंग में माइक्रोफोन की अनुमति दें।",
    voice_err_unsupported: "इस ब्राउज़र में आवाज़ रिकॉर्डिंग समर्थित नहीं है। कृपया Chrome या Firefox उपयोग करें।",
    voice_err_failed: "आवाज़ प्रोसेसिंग विफल। कृपया पुनः प्रयास करें या शिकायत टाइप करें।",
    voice_err_no_speech: "कोई ऑडियो नहीं मिला। कृपया फिर से बोलें।",

    // Location Picker
    map_modal_title: "शिकायत स्थान चुनें",
    map_instruction: "अपना स्थान पिन करने के लिए मानचित्र पर क्लिक/टैप करें, या मार्कर खींचें।",
    map_selected: "चयनित स्थान:",
    map_confirm_btn: "स्थान की पुष्टि करें",
    map_cancel_btn: "रद्द करें",
    map_use_gps: "📡 मेरा स्थान उपयोग करें",
    map_gps_error: "आपका स्थान नहीं मिला। कृपया मैन्युअल रूप से चुनें।",
    map_geocoding: "पता खोजा जा रहा है...",
    map_no_address: "स्थान चुना गया",

    // AI Results
    ai_complete: "AI विश्लेषण पूर्ण",
    ai_priority: "प्राथमिकता",
    ai_category: "श्रेणी",
    ai_department: "विभाग रूटिंग",
    ai_summary: "समस्या सारांश",
    ai_why: "क्यों",
    ai_duplicate: "डुप्लीकेट / संबंधित शिकायतें मिलीं!",
    ai_duplicate_desc: "इस स्थान पर समान समस्या की मौजूदा रिपोर्ट मिली।",
    ai_ticket: "टिकट संदर्भ",
    ai_status: "स्थिति",
    ai_standby_title: "AI पाइपलाइन प्रतीक्षा में",
    ai_standby_desc: "AI वर्गीकरण, प्राथमिकता पहचान और विभाग रूटिंग देखने के लिए बाईं ओर शिकायत दर्ज करें।",

    // Timeline Tracker
    tracker_title: "लाइव शिकायत टाइमलाइन ट्रैकर",
    tracker_desc: "जमीनी स्तर पर निवारण प्रगति और फोटो प्रमाण रीयल-टाइम में देखें।",
    tracker_btn: "स्थिति ट्रैक करें",

    // Dashboard
    dash_title: "नगर पालिका प्राधिकरण डैशबोर्ड",
    dash_desc: "शिकायत आँकड़े, AI रूटिंग और डुप्लीकेट क्लस्टर मॉनिटर करें।",
    dash_stat_total: "कुल शिकायतें",
    dash_stat_pending: "लंबित कार्रवाई",
    dash_stat_high: "उच्च प्राथमिकता",
    dash_stat_resolved: "हल की गईं",
    dash_stat_clusters: "संबंधित क्लस्टर",
    dash_filter_all_cat: "सभी श्रेणियाँ",
    dash_filter_all_pri: "सभी प्राथमिकताएँ",
    dash_filter_all_status: "सभी स्थितियाँ",
    dash_search_placeholder: "टेक्स्ट, स्थान या टिकट ID से खोजें...",
    dash_col_ticket: "टिकट ID",
    dash_col_summary: "सारांश",
    dash_col_category: "श्रेणी",
    dash_col_priority: "प्राथमिकता",
    dash_col_department: "विभाग",
    dash_col_status: "स्थिति",
    dash_col_date: "तारीख",
    dash_col_related: "संबंधित",
    dash_loading: "डैशबोर्ड डेटा लोड हो रहा है...",
    dash_hotspot_title: "लाइव हॉटस्पॉट रडार",
    dash_cluster_title: "सक्रिय शिकायत क्लस्टर",
    dash_no_hotspot: "कोई हॉटस्पॉट क्लस्टर नहीं मिला।",
    dash_restricted_title: "नगर पालिका प्राधिकरण डैशबोर्ड",
    dash_restricted_desc: "यह डैशबोर्ड केवल नगर पालिका अधिकारियों के लिए है। कृपया आधिकारिक क्रेडेंशियल से लॉगिन करें।",
    dash_restricted_notice: "नागरिकों को इस डैशबोर्ड तक पहुँचने की अनुमति नहीं है।",
    dash_go_admin_login: "Municipal Admin Login पर जाएं",

    // Errors
    err_empty_complaint: "कृपया शिकायत विवरण दर्ज करें।",
    err_server: "सर्वर त्रुटि",
    err_processing: "शिकायत प्रोसेस करने में त्रुटि",
  },

  mr: {
    // Nav
    nav_citizen_portal: "नागरिक पोर्टल",
    nav_dashboard: "महानगरपालिका प्राधिकरण डॅशबोर्ड",
    nav_citizen_login: "नागरिक लॉगिन",
    nav_admin_login: "अॅडमिन लॉगिन",
    nav_logout: "लॉगआउट",
    lang_label: "भाषा",

    // Citizen Form
    form_title: "नागरिक तक्रार दाखल करा",
    form_desc: "मराठी, हिंदी किंवा इंग्रजीत स्थान व फोटोसह नागरिक समस्या नोंदवा।",
    form_lang_label: "तक्रारीची भाषा",
    form_complaint_label: "तक्रारीचा तपशील",
    form_complaint_placeholder: "समस्येचे सविस्तर वर्णन करा (उदा. ABC कॉलेजजवळ मोठा खड्डा)...",
    form_location_label: "स्थान / परिसर",
    form_pick_map: "📍 नकाशावर निवडा",
    form_use_gps: "📡 माझे स्थान वापरा",
    form_photo_label: "वैकल्पिक फोटो पुरावा",
    form_demo_label: "डेमो इनपुट (क्लिक करा):",
    form_submit_btn: "तक्रार दाखल करा आणि AI प्रक्रिया करा",
    form_submit_loading: "AI तक्रारीचे विश्लेषण करत आहे...",
    form_voice_btn: "आवाज इनपुट",

    // Voice Recorder
    voice_title: "आवाज तक्रार रेकॉर्डर",
    voice_desc: "रेकॉर्ड दाबा, तक्रार सांगा, नंतर AI ट्रान्सक्रिप्शनसाठी पाठवा।",
    voice_start: "🎙️ रेकॉर्डिंग सुरू करा",
    voice_stop: "⏹️ रेकॉर्डिंग थांबवा",
    voice_rerecord: "🔄 पुन्हा रेकॉर्ड करा",
    voice_send: "📤 ट्रान्सक्रिप्शनसाठी पाठवा",
    voice_preview: "ऑडिओ पूर्वावलोकन:",
    voice_recording: "रेकॉर्डिंग सुरू आहे...",
    voice_transcribing: "आवाज ट्रान्सक्राइब होत आहे...",
    voice_success: "आवाज ट्रान्सक्राइब झाला! खाली तपासा व सबमिट करा.",
    voice_err_permission: "मायक्रोफोनची परवानगी नाकारली. कृपया ब्राउझर सेटिंगमध्ये मायक्रोफोनला परवानगी द्या.",
    voice_err_unsupported: "या ब्राउझरमध्ये आवाज रेकॉर्डिंग समर्थित नाही. कृपया Chrome किंवा Firefox वापरा.",
    voice_err_failed: "आवाज प्रक्रिया अयशस्वी. कृपया पुन्हा प्रयत्न करा किंवा तक्रार टाइप करा.",
    voice_err_no_speech: "कोणताही ऑडिओ आढळला नाही. कृपया पुन्हा बोला.",

    // Location Picker
    map_modal_title: "तक्रारीचे स्थान निवडा",
    map_instruction: "स्थान पिन करण्यासाठी नकाशावर क्लिक/टॅप करा, किंवा मार्कर ड्रॅग करा.",
    map_selected: "निवडलेले स्थान:",
    map_confirm_btn: "स्थान निश्चित करा",
    map_cancel_btn: "रद्द करा",
    map_use_gps: "📡 माझे स्थान वापरा",
    map_gps_error: "तुमचे स्थान मिळाले नाही. कृपया मॅन्युअली निवडा.",
    map_geocoding: "पत्ता शोधला जात आहे...",
    map_no_address: "स्थान निवडले",

    // AI Results
    ai_complete: "AI विश्लेषण पूर्ण",
    ai_priority: "प्राधान्य",
    ai_category: "श्रेणी",
    ai_department: "विभाग रूटिंग",
    ai_summary: "समस्येचा सारांश",
    ai_why: "का",
    ai_duplicate: "डुप्लिकेट / संबंधित तक्रारी आढळल्या!",
    ai_duplicate_desc: "या ठिकाणी समान समस्येचे अहवाल आधीच नोंदवले आहेत.",
    ai_ticket: "तिकीट संदर्भ",
    ai_status: "स्थिती",
    ai_standby_title: "AI पाइपलाइन प्रतीक्षेत",
    ai_standby_desc: "AI वर्गीकरण, प्राधान्य शोध आणि विभाग रूटिंग पाहण्यासाठी डाव्या बाजूस तक्रार दाखल करा.",

    // Timeline Tracker
    tracker_title: "थेट तक्रार टाइमलाइन ट्रॅकर",
    tracker_desc: "ग्राउंडवरील निवारण प्रगती आणि फोटो पुरावा रिअल-टाइममध्ये पहा.",
    tracker_btn: "स्थिती ट्रॅक करा",

    // Dashboard
    dash_title: "महानगरपालिका प्राधिकरण डॅशबोर्ड",
    dash_desc: "तक्रार आकडेवारी, AI रूटिंग आणि डुप्लिकेट क्लस्टर निरीक्षण करा.",
    dash_stat_total: "एकूण तक्रारी",
    dash_stat_pending: "प्रलंबित कारवाई",
    dash_stat_high: "उच्च प्राधान्य",
    dash_stat_resolved: "निराकरण झाले",
    dash_stat_clusters: "संबंधित क्लस्टर",
    dash_filter_all_cat: "सर्व श्रेणी",
    dash_filter_all_pri: "सर्व प्राधान्ये",
    dash_filter_all_status: "सर्व स्थिती",
    dash_search_placeholder: "मजकूर, स्थान किंवा तिकीट ID ने शोधा...",
    dash_col_ticket: "तिकीट ID",
    dash_col_summary: "सारांश",
    dash_col_category: "श्रेणी",
    dash_col_priority: "प्राधान्य",
    dash_col_department: "विभाग",
    dash_col_status: "स्थिती",
    dash_col_date: "तारीख",
    dash_col_related: "संबंधित",
    dash_loading: "डॅशबोर्ड डेटा लोड होत आहे...",
    dash_hotspot_title: "लाइव्ह हॉटस्पॉट रडार",
    dash_cluster_title: "सक्रिय तक्रार क्लस्टर",
    dash_no_hotspot: "कोणतेही हॉटस्पॉट क्लस्टर आढळले नाहीत.",
    dash_restricted_title: "महानगरपालिका प्राधिकरण डॅशबोर्ड",
    dash_restricted_desc: "हा डॅशबोर्ड केवळ महानगरपालिकेच्या अधिकाऱ्यांसाठी आहे. कृपया अधिकृत क्रेडेन्शियल्सने लॉगिन करा.",
    dash_restricted_notice: "नागरिकांना या डॅशबोर्डमध्ये प्रवेश करण्याची परवानगी नाही.",
    dash_go_admin_login: "Municipal Admin Login वर जा",

    // Errors
    err_empty_complaint: "कृपया तक्रारीचा तपशील भरा.",
    err_server: "सर्व्हर त्रुटी",
    err_processing: "तक्रार प्रक्रिया करताना त्रुटी",
  }
};

// ─── i18n Engine ───────────────────────────────────────────
let currentLang = localStorage.getItem('sih_lang') || 'en';

function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key])
      || TRANSLATIONS['en'][key]
      || key;
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  localStorage.setItem('sih_lang', lang);
  applyTranslations();
  // Update html lang attribute
  document.documentElement.lang = lang;
}

function applyTranslations() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.hasAttribute('placeholder')) el.placeholder = val;
    } else if (el.tagName === 'OPTION') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });

  // Update placeholder-only elements
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  // Update language selector display
  const langSel = document.getElementById('uiLangSelector');
  if (langSel) langSel.value = currentLang;
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});
