import { NextResponse } from "next/server";

// Comprehensive list of cities worldwide
const LOCATIONS = [
  // North America - United States
  "United States",
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
  "Austin, TX",
  "Boston, MA",
  "Los Angeles, CA",
  "Chicago, IL",
  "Denver, CO",
  "Portland, OR",
  "Atlanta, GA",
  "Miami, FL",
  "San Diego, CA",
  "Washington, DC",
  "Dallas, TX",
  "Houston, TX",
  "Phoenix, AZ",
  "Minneapolis, MN",
  "Detroit, MI",
  "Philadelphia, PA",
  "Las Vegas, NV",
  "San Antonio, TX",
  "Baltimore, MD",
  "Charlotte, NC",
  "Columbus, OH",
  "Indianapolis, IN",
  "Jacksonville, FL",
  "Nashville, TN",
  "Salt Lake City, UT",
  "Tampa, FL",
  "Orlando, FL",
  "Raleigh, NC",
  "Richmond, VA",
  "Sacramento, CA",
  "Pittsburgh, PA",
  "Cincinnati, OH",
  "Kansas City, MO",
  "St. Louis, MO",
  "Cleveland, OH",
  "New Orleans, LA",
  "Tucson, AZ",
  "Albuquerque, NM",
  "Honolulu, HI",
  "Anchorage, AK",
  
  // Canada
  "Canada",
  "Toronto, ON",
  "Vancouver, BC",
  "Montreal, QC",
  "Calgary, AB",
  "Ottawa, ON",
  "Edmonton, AB",
  "Winnipeg, MB",
  "Quebec City, QC",
  "Hamilton, ON",
  "Victoria, BC",
  
  // Mexico
  "Mexico",
  "Mexico City",
  "Guadalajara",
  "Monterrey",
  "Puebla",
  "Tijuana",
  
  // Europe - United Kingdom
  "United Kingdom",
  "London",
  "Manchester",
  "Edinburgh",
  "Birmingham",
  "Glasgow",
  "Bristol",
  "Leeds",
  "Liverpool",
  "Newcastle",
  "Sheffield",
  "Nottingham",
  "Cardiff",
  "Belfast",
  
  // Germany
  "Germany",
  "Berlin",
  "Munich",
  "Hamburg",
  "Frankfurt",
  "Cologne",
  "Düsseldorf",
  "Stuttgart",
  "Dortmund",
  "Essen",
  "Leipzig",
  "Dresden",
  "Nuremberg",
  "Hanover",
  "Bremen",
  "Duisburg",
  
  // France
  "France",
  "Paris",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Nice",
  "Nantes",
  "Strasbourg",
  "Montpellier",
  "Bordeaux",
  "Lille",
  "Rennes",
  "Grenoble",
  
  // Netherlands
  "Netherlands",
  "Amsterdam",
  "Rotterdam",
  "The Hague",
  "Utrecht",
  "Eindhoven",
  "Groningen",
  "Tilburg",
  "Delft",
  "Leiden",
  "Maastricht",
  
  // Spain
  "Spain",
  "Madrid",
  "Barcelona",
  "Valencia",
  "Seville",
  "Bilbao",
  "Malaga",
  "Zaragoza",
  "Granada",
  "San Sebastian",
  "Palma",
  
  // Italy
  "Italy",
  "Rome",
  "Milan",
  "Turin",
  "Naples",
  "Florence",
  "Bologna",
  "Venice",
  "Genoa",
  "Palermo",
  "Bari",
  
  // Sweden
  "Sweden",
  "Stockholm",
  "Gothenburg",
  "Malmö",
  "Uppsala",
  "Västerås",
  "Örebro",
  "Linköping",
  
  // Poland
  "Poland",
  "Warsaw",
  "Krakow",
  "Wroclaw",
  "Poznan",
  "Gdansk",
  "Lodz",
  "Katowice",
  "Lublin",
  
  // Switzerland
  "Switzerland",
  "Zurich",
  "Geneva",
  "Basel",
  "Bern",
  "Lausanne",
  "Lucerne",
  
  // Austria
  "Austria",
  "Vienna",
  "Graz",
  "Linz",
  "Salzburg",
  "Innsbruck",
  
  // Belgium
  "Belgium",
  "Brussels",
  "Antwerp",
  "Ghent",
  "Bruges",
  "Leuven",
  
  // Denmark
  "Denmark",
  "Copenhagen",
  "Aarhus",
  "Odense",
  "Aalborg",
  
  // Norway
  "Norway",
  "Oslo",
  "Bergen",
  "Trondheim",
  "Stavanger",
  "Drammen",
  
  // Finland
  "Finland",
  "Helsinki",
  "Espoo",
  "Tampere",
  "Vantaa",
  "Oulu",
  
  // Portugal
  "Portugal",
  "Lisbon",
  "Porto",
  "Vila Nova de Gaia",
  "Amadora",
  "Braga",
  
  // Ireland
  "Ireland",
  "Dublin",
  "Cork",
  "Galway",
  "Limerick",
  "Waterford",
  
  // Czech Republic
  "Czech Republic",
  "Prague",
  "Brno",
  "Ostrava",
  "Pilsen",
  
  // Hungary
  "Hungary",
  "Budapest",
  "Debrecen",
  "Szeged",
  "Miskolc",
  
  // Romania
  "Romania",
  "Bucharest",
  "Cluj-Napoca",
  "Timisoara",
  "Iasi",
  
  // Greece
  "Greece",
  "Athens",
  "Thessaloniki",
  "Patras",
  "Heraklion",
  
  // Asia - Japan
  "Japan",
  "Tokyo",
  "Osaka",
  "Kyoto",
  "Yokohama",
  "Nagoya",
  "Sapporo",
  "Fukuoka",
  "Hiroshima",
  "Sendai",
  "Kobe",
  
  // South Korea
  "South Korea",
  "Seoul",
  "Busan",
  "Incheon",
  "Daegu",
  "Daejeon",
  "Gwangju",
  "Suwon",
  
  // China
  "China",
  "Beijing",
  "Shanghai",
  "Shenzhen",
  "Guangzhou",
  "Hangzhou",
  "Chengdu",
  "Nanjing",
  "Wuhan",
  "Xian",
  "Tianjin",
  "Suzhou",
  "Dalian",
  
  // India
  "India",
  "Bangalore",
  "Mumbai",
  "Hyderabad",
  "Delhi",
  "Chennai",
  "Pune",
  "Kolkata",
  "Gurgaon",
  "Noida",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Coimbatore",
  "Kochi",
  
  // Singapore
  "Singapore",
  
  // Hong Kong
  "Hong Kong",
  
  // Taiwan
  "Taiwan",
  "Taipei",
  "Kaohsiung",
  "Taichung",
  "Tainan",
  
  // Indonesia
  "Indonesia",
  "Jakarta",
  "Surabaya",
  "Bandung",
  "Bali",
  "Medan",
  
  // Thailand
  "Thailand",
  "Bangkok",
  "Chiang Mai",
  "Phuket",
  "Pattaya",
  
  // Vietnam
  "Vietnam",
  "Ho Chi Minh City",
  "Hanoi",
  "Da Nang",
  "Hai Phong",
  
  // Malaysia
  "Malaysia",
  "Kuala Lumpur",
  "Penang",
  "Johor Bahru",
  
  // Philippines
  "Philippines",
  "Manila",
  "Cebu City",
  "Davao City",
  
  // Oceania - Australia
  "Australia",
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Canberra",
  "Gold Coast",
  "Sydney, NSW",
  "Melbourne, VIC",
  "Brisbane, QLD",
  "Perth, WA",
  "Adelaide, SA",
  
  // New Zealand
  "New Zealand",
  "Auckland",
  "Wellington",
  "Christchurch",
  "Queenstown",
  
  // South America - Brazil
  "Brazil",
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Brasília",
  "Salvador",
  "Fortaleza",
  "Curitiba",
  "Manaus",
  "Recife",
  "Porto Alegre",
  
  // Argentina
  "Argentina",
  "Buenos Aires",
  "Córdoba",
  "Rosario",
  "Mendoza",
  "La Plata",
  
  // Colombia
  "Colombia",
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  
  // Chile
  "Chile",
  "Santiago",
  "Valparaíso",
  "Concepción",
  "La Serena",
  
  // Peru
  "Peru",
  "Lima",
  "Arequipa",
  "Cusco",
  
  // Africa - South Africa
  "South Africa",
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Port Elizabeth",
  
  // Egypt
  "Egypt",
  "Cairo",
  "Alexandria",
  "Giza",
  
  // Nigeria
  "Nigeria",
  "Lagos",
  "Abuja",
  "Port Harcourt",
  
  // Kenya
  "Kenya",
  "Nairobi",
  "Mombasa",
  
  // Morocco
  "Morocco",
  "Casablanca",
  "Rabat",
  "Marrakech",
  
  // Middle East - UAE
  "United Arab Emirates",
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  
  // Israel
  "Israel",
  "Tel Aviv",
  "Jerusalem",
  "Haifa",
  
  // Saudi Arabia
  "Saudi Arabia",
  "Riyadh",
  "Jeddah",
  "Mecca",
  
  // Qatar
  "Qatar",
  "Doha",
  
  // Turkey
  "Turkey",
  "Istanbul",
  "Ankara",
  "Izmir",
  "Antalya",
  
  // Remote
  "Remote",
  "Worldwide",
  "Anywhere",
];

export async function GET() {
  return NextResponse.json(LOCATIONS);
}
