/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  region: string;
}

/**
 * All 22 official languages of India (Eighth Schedule of Indian Constitution) + English
 */
export const INDIAN_LANGUAGES: LanguageInfo[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North / Central India' },
  { code: 'en', name: 'English', nativeName: 'English', region: 'Pan-India Commercial' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal & Tripura' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra Pradesh & Telangana' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu & Puducherry' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Pan-India' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', region: 'Bihar & Jharkhand' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', region: 'Jharkhand & Odisha' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر / कॉशुर', region: 'Jammu & Kashmir' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'Sikkim & West Bengal' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', region: 'Goa & Coastal Karnataka' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي / सिंधी', region: 'Pan-India' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', region: 'Jammu & Kashmir' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'মৈতৈলোন্', region: 'Manipur' },
  { code: 'brx', name: 'Bodo', nativeName: 'बर’ / बड़ो', region: 'Assam & Bodoland' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', region: 'Classical Language of India' },
];
