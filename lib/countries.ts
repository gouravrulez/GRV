export type CountryOption = { name: string; code: string; dial: string };

export const countries: CountryOption[] = [
  { name: "India", code: "IN", dial: "+91" }, { name: "United States", code: "US", dial: "+1" },
  { name: "United Kingdom", code: "GB", dial: "+44" }, { name: "United Arab Emirates", code: "AE", dial: "+971" },
  { name: "Australia", code: "AU", dial: "+61" }, { name: "Canada", code: "CA", dial: "+1" },
  { name: "Singapore", code: "SG", dial: "+65" }, { name: "Germany", code: "DE", dial: "+49" },
  { name: "France", code: "FR", dial: "+33" }, { name: "Italy", code: "IT", dial: "+39" },
  { name: "Spain", code: "ES", dial: "+34" }, { name: "Netherlands", code: "NL", dial: "+31" },
  { name: "Belgium", code: "BE", dial: "+32" }, { name: "Switzerland", code: "CH", dial: "+41" },
  { name: "Austria", code: "AT", dial: "+43" }, { name: "Ireland", code: "IE", dial: "+353" },
  { name: "Portugal", code: "PT", dial: "+351" }, { name: "Sweden", code: "SE", dial: "+46" },
  { name: "Norway", code: "NO", dial: "+47" }, { name: "Denmark", code: "DK", dial: "+45" },
  { name: "Finland", code: "FI", dial: "+358" }, { name: "Poland", code: "PL", dial: "+48" },
  { name: "Greece", code: "GR", dial: "+30" }, { name: "Czechia", code: "CZ", dial: "+420" },
  { name: "Romania", code: "RO", dial: "+40" }, { name: "Hungary", code: "HU", dial: "+36" },
  { name: "Japan", code: "JP", dial: "+81" }, { name: "South Korea", code: "KR", dial: "+82" },
  { name: "China", code: "CN", dial: "+86" }, { name: "Hong Kong", code: "HK", dial: "+852" },
  { name: "Taiwan", code: "TW", dial: "+886" }, { name: "Malaysia", code: "MY", dial: "+60" },
  { name: "Indonesia", code: "ID", dial: "+62" }, { name: "Thailand", code: "TH", dial: "+66" },
  { name: "Philippines", code: "PH", dial: "+63" }, { name: "Vietnam", code: "VN", dial: "+84" },
  { name: "New Zealand", code: "NZ", dial: "+64" }, { name: "Saudi Arabia", code: "SA", dial: "+966" },
  { name: "Qatar", code: "QA", dial: "+974" }, { name: "Kuwait", code: "KW", dial: "+965" },
  { name: "Bahrain", code: "BH", dial: "+973" }, { name: "Oman", code: "OM", dial: "+968" },
  { name: "Israel", code: "IL", dial: "+972" }, { name: "Turkey", code: "TR", dial: "+90" },
  { name: "South Africa", code: "ZA", dial: "+27" }, { name: "Nigeria", code: "NG", dial: "+234" },
  { name: "Kenya", code: "KE", dial: "+254" }, { name: "Egypt", code: "EG", dial: "+20" },
  { name: "Morocco", code: "MA", dial: "+212" }, { name: "Mauritius", code: "MU", dial: "+230" },
  { name: "Brazil", code: "BR", dial: "+55" }, { name: "Mexico", code: "MX", dial: "+52" },
  { name: "Argentina", code: "AR", dial: "+54" }, { name: "Chile", code: "CL", dial: "+56" },
  { name: "Colombia", code: "CO", dial: "+57" }, { name: "Peru", code: "PE", dial: "+51" },
  { name: "Pakistan", code: "PK", dial: "+92" }, { name: "Bangladesh", code: "BD", dial: "+880" },
  { name: "Sri Lanka", code: "LK", dial: "+94" }, { name: "Nepal", code: "NP", dial: "+977" },
  { name: "Other country / region", code: "OTHER", dial: "+" },
];

export const callingCodes = [...new Set(countries.map((country) => country.dial))]
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export function splitInternationalPhone(value = "") {
  const normalized = value.trim();
  const dial = [...callingCodes].sort((a, b) => b.length - a.length)
    .find((code) => code !== "+" && normalized.startsWith(code));
  return { dial: dial || "+91", number: dial ? normalized.slice(dial.length).trim() : normalized.replace(/^\+/, "") };
}
