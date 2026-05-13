import { useState } from "react";
import { ComposableMap, Geographies, Geography, Sphere } from "react-simple-maps";
import type { GeoDrilldownItem } from "../types";
import { useTheme } from "../context/ThemeContext";

type ViewMode = "volume" | "language" | "model";

const CAT_PALETTE = [
  "#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa",
  "#fb923c", "#38bdf8", "#4ade80", "#facc15", "#f472b6",
  "#94a3b8", "#2dd4bf", "#c084fc", "#fb7185", "#818cf8",
  "#e879f9", "#22d3ee", "#86efac",
];
function catColor(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length];
}

const US_GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const FIPS_TO_STATE: Record<string, string> = {
  "01": "Alabama",        "02": "Alaska",         "04": "Arizona",
  "05": "Arkansas",       "06": "California",     "08": "Colorado",
  "09": "Connecticut",    "10": "Delaware",        "11": "District of Columbia",
  "12": "Florida",        "13": "Georgia",         "15": "Hawaii",
  "16": "Idaho",          "17": "Illinois",        "18": "Indiana",
  "19": "Iowa",           "20": "Kansas",          "21": "Kentucky",
  "22": "Louisiana",      "23": "Maine",           "24": "Maryland",
  "25": "Massachusetts",  "26": "Michigan",        "27": "Minnesota",
  "28": "Mississippi",    "29": "Missouri",        "30": "Montana",
  "31": "Nebraska",       "32": "Nevada",          "33": "New Hampshire",
  "34": "New Jersey",     "35": "New Mexico",      "36": "New York",
  "37": "North Carolina", "38": "North Dakota",    "39": "Ohio",
  "40": "Oklahoma",       "41": "Oregon",          "42": "Pennsylvania",
  "44": "Rhode Island",   "45": "South Carolina",  "46": "South Dakota",
  "47": "Tennessee",      "48": "Texas",           "49": "Utah",
  "50": "Vermont",        "51": "Virginia",        "53": "Washington",
  "54": "West Virginia",  "55": "Wisconsin",       "56": "Wyoming",
};

interface CountryGeoConfig {
  url: string;
  projection: string;
  scale: number;
  center: [number, number];
}

// All GeoJSON files are served locally from /geo/ (Natural Earth 10m admin-1, per-country).
// The `name` property from NE is used for all; REGION_ALIASES handles NE→parquet name differences.
const COUNTRY_GEO_CONFIG: Record<string, CountryGeoConfig> = {
  "Russia":               { url: "/geo/rus.json", projection: "geoNaturalEarth1", scale: 340,  center: [97, 65]   },
  "China":                { url: "/geo/chn.json", projection: "geoMercator",      scale: 500,  center: [104, 35]  },
  "United Kingdom":       { url: "/geo/gbr.json", projection: "geoMercator",      scale: 2200, center: [-2, 54]   },
  "Germany":              { url: "/geo/deu.json", projection: "geoMercator",      scale: 2500, center: [10, 51]   },
  "France":               { url: "/geo/fra.json", projection: "geoMercator",      scale: 2200, center: [2, 47]    },
  "Japan":                { url: "/geo/jpn.json", projection: "geoMercator",      scale: 1200, center: [138, 37]  },
  "India":                { url: "/geo/ind.json", projection: "geoMercator",      scale: 700,  center: [80, 23]   },
  "Canada":               { url: "/geo/can.json", projection: "geoMercator",      scale: 300,  center: [-97, 62]  },
  "Brazil":               { url: "/geo/bra.json", projection: "geoMercator",      scale: 550,  center: [-53, -14] },
  "Australia":            { url: "/geo/aus.json", projection: "geoMercator",      scale: 450,  center: [133, -27] },
  "Egypt":                { url: "/geo/egy.json", projection: "geoMercator",      scale: 1500, center: [29, 26]   },
  "Philippines":          { url: "/geo/phl.json", projection: "geoMercator",      scale: 1500, center: [122, 12]  },
  "Türkiye":              { url: "/geo/tur.json", projection: "geoMercator",      scale: 1800, center: [35, 39]   },
  "Italy":                { url: "/geo/ita.json", projection: "geoMercator",      scale: 2200, center: [12, 42]   },
  "Vietnam":              { url: "/geo/vnm.json", projection: "geoMercator",      scale: 2000, center: [107, 16]  },
  "South Korea":          { url: "/geo/kor.json", projection: "geoMercator",      scale: 3500, center: [128, 36]  },
  "Indonesia":            { url: "/geo/idn.json", projection: "geoMercator",      scale: 700,  center: [118, -2]  },
  "Mexico":               { url: "/geo/mex.json", projection: "geoMercator",      scale: 850,  center: [-102, 24] },
  "Argentina":            { url: "/geo/arg.json", projection: "geoMercator",      scale: 600,  center: [-65, -35] },
  "South Africa":         { url: "/geo/zaf.json", projection: "geoMercator",      scale: 1000, center: [25, -29]  },
  "Poland":               { url: "/geo/pol.json", projection: "geoMercator",      scale: 2500, center: [19, 52]   },
  "Spain":                { url: "/geo/esp.json", projection: "geoMercator",      scale: 2500, center: [-4, 40]   },
  "Ukraine":              { url: "/geo/ukr.json", projection: "geoMercator",      scale: 2200, center: [31, 49]   },
  "Thailand":             { url: "/geo/tha.json", projection: "geoMercator",      scale: 1500, center: [101, 15]  },
  "Malaysia":             { url: "/geo/mys.json", projection: "geoMercator",      scale: 1800, center: [109, 4]   },
  "Morocco":              { url: "/geo/mar.json", projection: "geoMercator",      scale: 2000, center: [-5, 32]   },
  "Nigeria":              { url: "/geo/nga.json", projection: "geoMercator",      scale: 1500, center: [8, 9]     },
  "Pakistan":             { url: "/geo/pak.json", projection: "geoMercator",      scale: 1200, center: [69, 30]   },
  "Bangladesh":           { url: "/geo/bgd.json", projection: "geoMercator",      scale: 4000, center: [90, 24]   },
  "Romania":              { url: "/geo/rou.json", projection: "geoMercator",      scale: 2500, center: [25, 46]   },
  "Hungary":              { url: "/geo/hun.json", projection: "geoMercator",      scale: 3000, center: [19, 47]   },
  "Portugal":             { url: "/geo/prt.json", projection: "geoMercator",      scale: 3000, center: [-8, 39]   },
  "Greece":               { url: "/geo/grc.json", projection: "geoMercator",      scale: 3000, center: [22, 39]   },
  "Belgium":              { url: "/geo/bel.json", projection: "geoMercator",      scale: 5000, center: [4, 50]    },
  "Switzerland":          { url: "/geo/che.json", projection: "geoMercator",      scale: 5000, center: [8, 47]    },
  "Austria":              { url: "/geo/aut.json", projection: "geoMercator",      scale: 4000, center: [14, 47]   },
  "Denmark":              { url: "/geo/dnk.json", projection: "geoMercator",      scale: 3500, center: [10, 56]   },
  "Norway":               { url: "/geo/nor.json", projection: "geoMercator",      scale: 1200, center: [15, 65]   },
  "Finland":              { url: "/geo/fin.json", projection: "geoMercator",      scale: 1500, center: [26, 64]   },
  "Israel":               { url: "/geo/isr.json", projection: "geoMercator",      scale: 7000, center: [35, 31]   },
  "Iran":                 { url: "/geo/irn.json", projection: "geoMercator",      scale: 1200, center: [53, 33]   },
  "Iraq":                 { url: "/geo/irq.json", projection: "geoMercator",      scale: 1500, center: [43, 33]   },
  "Saudi Arabia":         { url: "/geo/sau.json", projection: "geoMercator",      scale: 1000, center: [45, 24]   },
  "United Arab Emirates": { url: "/geo/are.json", projection: "geoMercator",      scale: 5000, center: [54, 24]   },
  "Sweden":               { url: "/geo/swe.json", projection: "geoMercator",      scale: 1200, center: [17, 63]   },
  "The Netherlands":      { url: "/geo/nld.json", projection: "geoMercator",      scale: 5000, center: [5, 52]    },
  "Chile":                { url: "/geo/chl.json", projection: "geoMercator",      scale: 800,  center: [-71, -35] },
  "Colombia":             { url: "/geo/col.json", projection: "geoMercator",      scale: 1200, center: [-74, 4]   },
  "Taiwan":               { url: "/geo/twn.json", projection: "geoMercator",      scale: 5000, center: [121, 24]  },
  "Hong Kong":            { url: "/geo/hkg.json", projection: "geoMercator",      scale: 15000, center: [114, 22] },
  "Czechia":              { url: "/geo/cze.json", projection: "geoMercator",      scale: 4000, center: [15, 50]   },
  "Singapore":            { url: "/geo/sgp.json", projection: "geoMercator",      scale: 60000, center: [104, 1]  },
  "DR Congo":             { url: "/geo/cod.json", projection: "geoMercator",      scale: 900,  center: [24, -2]   },
};

// Strip accents, apostrophes + lowercase for fuzzy fallback matching
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[''ʼ`]/g, "").toLowerCase().trim();
}

// NE `name` → parquet `state` for countries where they differ systematically.
const REGION_ALIASES: Record<string, Record<string, string>> = {
  "Germany": {
    "Bayern": "Bavaria",
    "Hessen": "Hesse",
    "Nordrhein-Westfalen": "North Rhine-Westphalia",
    "Niedersachsen": "Lower Saxony",
    "Sachsen": "Saxony",
    "Sachsen-Anhalt": "Saxony-Anhalt",
    "Thüringen": "Thuringia",
    "Baden-Württemberg": "Baden-Wurttemberg",
    "Berlin": "Land Berlin",
    "Hamburg": "Free and Hanseatic City of Hamburg",
  },
  "Russia": {
    "Moskva": "Moscow",
    "City of St. Petersburg": "St.-Petersburg",
    "Moskovskaya": "Moscow Oblast",
    "Krasnodar": "Krasnodar Krai",
    "Novosibirsk": "Novosibirsk Oblast",
    "Bashkortostan": "Bashkortostan Republic",
    "Tatarstan": "Tatarstan Republic",
    "Chelyabinsk": "Chelyabinsk Oblast",
    "Samara": "Samara Oblast",
    "Kaliningrad": "Kaliningrad Oblast",
    "Sverdlovsk": "Sverdlovsk Oblast",
    "Nizhegorod": "Nizhny Novgorod Oblast",
    "Novgorod": "Novgorod Oblast",
    "Rostov": "Rostov Oblast",
    "Perm'": "Perm Krai",
    "Krasnoyarsk": "Krasnoyarsk Krai",
    "Volgograd": "Volgograd Oblast",
    "Omsk": "Omsk Oblast",
    "Saratov": "Saratov Oblast",
    "Voronezh": "Voronezh Oblast",
    "Kemerovo": "Kemerovo Oblast",
    "Belgorod": "Belgorod Oblast",
    "Penza": "Penza Oblast",
    "Leningrad": "Leningrad Oblast",
    "Yaroslavl'": "Yaroslavl Oblast",
    "Stavropol'": "Stavropol Kray",
    "Chita": "Transbaikal Territory",
    "Irkutsk": "Irkutsk Oblast",
    "Murmansk": "Murmansk Oblast",
    "Tomsk": "Tomsk Oblast",
    "Kursk": "Kursk Oblast",
    "Orenburg": "Orenburg Oblast",
    "Ivanovo": "Ivanovo Oblast",
    "Tula": "Tula Oblast",
    "Vladimir": "Vladimir Oblast",
    "Kurgan": "Kurgan Oblast",
    "Bryansk": "Bryansk Oblast",
    "Lipetsk": "Lipetsk Oblast",
    "Tambov": "Tambov Oblast",
    "Smolensk": "Smolensk Oblast",
    "Kostroma": "Kostroma Oblast",
    "Kirov": "Kirov Oblast",
    "Ryazan'": "Ryazan Oblast",
    "Tver'": "Tver Oblast",
    "Tyumen'": "Tyumen Oblast",
    "Khabarovsk": "Khabarovsk Krai",
    "Ul'yanovsk": "Ulyanovsk Oblast",
    "Primor'ye": "Primorsky Krai",
    "Sakhalin": "Sakhalin Oblast",
    "Arkhangel'sk": "Arkhangelsk Oblast",
    "Astrakhan'": "Astrakhan Oblast",
    "Vologda": "Vologda Oblast",
    "Pskov": "Pskov Oblast",
    "Amur": "Amur Oblast",
    "Kamchatka": "Kamchatka Krai",
    "Buryat": "Buryat Republic",
    "Adygey": "Republic of Adygea",
    "Karelia": "Republic of Karelia",
    "Komi": "Komi Republic",
    "Chuvash": "Chuvash Republic",
    "Dagestan": "Dagestan Republic",
    "Chechnya": "Chechen Republic",
    "Ingush": "Ingushetia",
    "North Ossetia": "North Ossetia-Alania",
    "Mariy-El": "Mari El Republic",
    "Mordovia": "Republic of Mordovia",
    "Udmurt": "Udmurt Republic",
    "Tuva": "Tuva Republic",
    "Altay": "Altai Krai",
    "Gorno-Altay": "Altai Republic",
    "Sakha (Yakutia)": "Sakha Republic",
    "Khakass": "Khakassia",
    "Orel": "Oryol Oblast",
    "Kabardin-Balkar": "Kabardino-Balkaria",
    "Karachay-Cherkess": "Karachay-Cherkessia",
    "Maga Buryatdan": "Magadan Oblast",
    "Yamal-Nenets": "Yamalo-Nenets Autonomous Okrug",
    "Khanty-Mansiy": "Khanty-Mansiysk Autonomous Okrug",
  },
  "Ukraine": {
    "Kiev City": "Kyiv City",
    "Donets'k": "Donetsk",
    "Dnipropetrovs'k": "Dnipropetrovsk Oblast",
    "Luhans'k": "Luhansk",
    "L'viv": "Lviv",
    "Mykolayiv": "Mykolaiv",
    "Khmel'nyts'kyy": "Khmelnytskyi Oblast",
    "Ivano-Frankivs'k": "Ivano-Frankivsk Oblast",
    "Ternopil'": "Ternopil Oblast",
    "Vinnytsya": "Vinnytsia",
    "Zaporizhzhya": "Zaporizhzhia",
    "Transcarpathia": "Zakarpattia Oblast",
    "Cherkasy": "Cherkasy Oblast",
    "Kirovohrad": "Kirovohrad Oblast",
    "Kiev": "Kyiv Oblast",
    "Poltava": "Poltava Oblast",
    "Sevastopol": "Sebastopol City",
  },
  "South Korea": {
    "Gyeonggi": "Gyeonggi-do",
    "Gangwon": "Gangwon-do",
    "South Chungcheong": "Chungcheongnam-do",
    "North Chungcheong": "Chungcheongbuk-do",
    "South Gyeongsang": "Gyeongsangnam-do",
    "North Gyeongsang": "Gyeongsangbuk-do",
    "South Jeolla": "Jeollanam-do",
    "North Jeolla": "Jeollabuk-do",
    "Jeju": "Jeju-do",
    "Sejong": "Sejong-si",
  },
  "France": {
    "Nord": "North",
    "Val-d'Oise": "Val d'Oise",
    "Haute-Garonne": "Upper Garonne",
    "Haute-Savoie": "Upper Savoy",
    "Savoie": "Savoy",
    "Meurthe-et-Moselle": "Meurthe et Moselle",
  },
  "India": {
    "NCT of Delhi": "National Capital Territory of Delhi",
    "Delhi": "National Capital Territory of Delhi",
    "Puducherry": "Union Territory of Puducherry",
  },
  "Canada": {
    "Québec": "Quebec",
  },
  "Brazil": {
    "Distrito Federal": "Federal District",
  },
  "Mexico": {
    "Distrito Federal": "Mexico City",
    "Ciudad de México": "Mexico City",
  },
  "Egypt": {
    "Al Qahirah": "Cairo Governorate",
    "Al Jizah": "Giza",
    "Al Iskandariyah": "Alexandria",
    "Al Gharbiyah": "Gharbia",
    "Ad Daqahliyah": "Dakahlia",
    "Ash Sharqiyah": "Sharqia",
    "Bur Sa`id": "Port Said",
    "Al Buhayrah": "Beheira",
    "Al Qalyubiyah": "Qalyubia",
    "Suhaj": "Sohag",
    "Bani Suwayf": "Beni Suweif",
    "Al Minufiyah": "Monufia",
    "As Suways": "Suez",
    "Al Isma`iliyah": "Ismailia Governorate",
    "Dumyat": "Damietta Governorate",
    "Al Fayyum": "Faiyum",
    "Al Minya": "Minya",
    "Al Bahr al Ahmar": "Red Sea",
    "Kafr ash Shaykh": "Kafr el-Sheikh",
    "Qina": "Qena",
    "Janub Sina'": "South Sinai",
    "Asyut": "Assiut",
  },
  "Morocco": {
    "Grand Casablanca": "Casablanca",
    "Marrakech - Tensift - Al Haouz": "Marrakech",
    "Rabat - Salé - Zemmour - Zaer": "Rabat",
    "Meknès - Tafilalet": "Meknès Prefecture",
    "Fès - Boulemane": "Fes",
    "Tanger - Tétouan": "Tetouan",
    "Doukkala - Abda": "El-Jadida",
    "Chaouia - Ouardigha": "Khouribga Province",
    "Oriental": "Oujda-Angad",
  },
  "Vietnam": {
    "Hồ Chí Minh city": "Ho Chi Minh",
    "Ha Noi": "Hanoi",
    "Hải Phòng": "Haiphong",
    "Đà Nẵng": "Da Nang",
    "Can Tho": "Can Tho",
  },
  "Taiwan": {
    "New Taipei City": "New Taipei",
    "Kaohsiung City": "Kaohsiung",
    "Tainan City": "Tainan",
    "Taipei City": "Taipei City",
  },
  "Hong Kong": {
    "Central and Western": "Central and Western District",
    "Yuen Long": "Yuen Long District",
    "Tai Po": "Tai Po District",
    "Sai Kung": "Sai Kung District",
    "Islands": "Islands District",
    "Eastern": "Eastern District",
    "Southern": "Southern District",
    "North": "North District",
    "Sha Tin": "Sha Tin District",
    "Kwun Tong": "Kwun Tong District",
    "Sham Shui Po": "Sham Shui Po District",
    "Kowloon City": "Kowloon City District",
    "Kwai Tsing": "Kwai Tsing District",
  },
  "Iran": {
    "Alborz": "Alborz Province",
    "West Azarbaijan": "West Azerbaijan Province",
    "East Azarbaijan": "East Azerbaijan Province",
    "Qom": "Qom Province",
    "Gilan": "Gilan Province",
    "Kermanshah": "Kermanshah Province",
    "Qazvin": "Qazvin Province",
  },
  "Saudi Arabia": {
    "Ar Riyad": "Riyadh Region",
    "Makkah": "Mecca Region",
    "Ash Sharqiyah": "Eastern Province",
    "Al Madinah": "Medina Region",
    "`Asir": "'Asir Region",
    "Al Quassim": "Al-Qassim Region",
    "Ha'il": "Ha'il Region",
    "Jizan": "Jazan Region",
    "Najran": "Najran Region",
    "Al Hudud ash Shamaliyah": "Northern Borders Region",
    "Al Jawf": "Al Jawf Region",
    "Tabuk": "Tabuk Region",
    "Al Bahah": "Al Bahah Region",
  },
  "DR Congo": {
    "Nord-Kivu": "Nord Kivu",
    "Sud-Kivu": "South Kivu Province",
    "Katanga": "Haut-Katanga",
  },
  "China": {
    "Inner Mongol": "Inner Mongolia",
  },
};

interface Props {
  country: string;
  items: GeoDrilldownItem[];
  selectedState?: string | null;
  onStateClick?: (state: string) => void;
}

export default function CountryMapView({ country, items, selectedState, onStateClick }: Props) {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>("volume");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const maxCount = Math.max(...items.map(i => i.count), 1);
  const itemByName: Record<string, GeoDrilldownItem> = {};
  const itemByNorm: Record<string, GeoDrilldownItem> = {};
  items.forEach(item => {
    itemByName[item.name] = item;
    itemByNorm[norm(item.name)] = item;
  });

  const aliases = REGION_ALIASES[country] ?? {};

  function resolveItem(topoName: string | undefined): GeoDrilldownItem | undefined {
    if (!topoName) return undefined;
    if (itemByName[topoName]) return itemByName[topoName];
    const aliased = aliases[topoName];
    if (aliased && itemByName[aliased]) return itemByName[aliased];
    const byNorm = itemByNorm[norm(topoName)];
    if (byNorm) return byNorm;
    // Philippines: NE uses bare province name, parquet prefixes "Province of "
    if (country === "Philippines") {
      const r = itemByName[`Province of ${topoName}`];
      if (r) return r;
    }
    // Taiwan: NE appends " City" or parquet appends " County"
    if (country === "Taiwan") {
      const withoutCity = topoName.replace(/ City$/, "");
      if (itemByName[withoutCity]) return itemByName[withoutCity];
      const withCounty = `${topoName} County`;
      if (itemByName[withCounty]) return itemByName[withCounty];
    }
    // Vietnam: NE omits " Province" suffix
    if (country === "Vietnam") {
      const r = itemByName[`${topoName} Province`] ?? itemByNorm[norm(`${topoName} Province`)];
      if (r) return r;
    }
    // Russia/Ukraine/Iran: NE omits " Oblast" / " Krai" / " Republic" suffix
    if (country === "Russia" || country === "Ukraine" || country === "Iran") {
      for (const suffix of [" Oblast", " Krai", " Republic", " Province", " Autonomous Okrug"]) {
        const r = itemByName[`${topoName}${suffix}`];
        if (r) return r;
      }
    }
    return undefined;
  }

  function getColor(name: string): string {
    const item = resolveItem(name);
    if (!item) return colors.mapNoData;
    if (viewMode === "language") return item.dominant_language ? catColor(item.dominant_language) : colors.mapNoData;
    if (viewMode === "model")    return item.dominant_model    ? catColor(item.dominant_model)    : colors.mapNoData;
    // Log scale so low-count regions stay visible against the dark background
    const ratio = maxCount > 1 ? Math.log1p(item.count) / Math.log1p(maxCount) : 1;
    const s = colors.mapScale;
    if (ratio > 0.8) return s[5];
    if (ratio > 0.6) return s[4];
    if (ratio > 0.4) return s[3];
    if (ratio > 0.2) return s[2];
    if (ratio > 0.05) return s[1];
    return s[0];
  }

  function getCatLegend(): { label: string; color: string }[] {
    const seen = new Map<string, string>();
    for (const item of items) {
      const val = viewMode === "language" ? item.dominant_language : item.dominant_model;
      if (val && !seen.has(val)) seen.set(val, catColor(val));
      if (seen.size >= 8) break;
    }
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }

  function tooltipContent(name: string, item: GeoDrilldownItem): string {
    const extra =
      viewMode === "language" ? ` · ${item.dominant_language ?? "unknown"}` :
      viewMode === "model"    ? ` · ${item.dominant_model    ?? "unknown"}` : "";
    return `${name}: ${item.count.toLocaleString()} convs${extra}`;
  }

  const modeBtns = (
    <div className="flex gap-1 mb-1">
      {(["volume", "language", "model"] as ViewMode[]).map(mode => (
        <button
          key={mode}
          className={`filter-btn text-xs ${viewMode === mode ? "active" : ""}`}
          style={{ padding: "2px 8px", fontSize: 10 }}
          onClick={() => setViewMode(mode)}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  );

  const legend = viewMode === "volume" ? (
    <div className="flex items-center gap-2 mt-1 mb-2">
      <span className="text-text-secondary text-xs">fewer</span>
      <div
        className="flex-1 h-2 rounded"
        style={{ background: `linear-gradient(90deg, ${colors.mapScale[0]}, ${colors.mapScale[2]}, ${colors.mapScale[5]})` }}
      />
      <span className="text-text-secondary text-xs">more</span>
    </div>
  ) : (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 mb-2">
      {getCatLegend().map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
          <span className="text-text-secondary text-xs truncate" style={{ maxWidth: 120 }}>{label}</span>
        </div>
      ))}
    </div>
  );

  const tooltipEl = tooltip && (
    <div style={{
      position: "fixed", left: tooltip.x, top: tooltip.y,
      background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: 4, padding: "4px 8px", fontSize: 11,
      color: colors.tooltipText, pointerEvents: "none", zIndex: 9999, whiteSpace: "nowrap",
    }}>
      {tooltip.content}
    </div>
  );

  // ── US: Albers USA projection with FIPS lookup ──────────────────────────────
  if (country === "United States") {
    return (
      <div style={{ position: "relative" }}>
        {modeBtns}
        <ComposableMap projection="geoAlbersUsa" style={{ width: "100%", height: "auto" }}>
          <Geographies geography={US_GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const fips = String(geo.id).padStart(2, "0");
                const stateName = FIPS_TO_STATE[fips];
                const item = resolveItem(stateName);
                const isSelected = stateName === selectedState;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? colors.mapHover : getColor(stateName)}
                    stroke={colors.mapBorder}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: colors.mapHover, outline: "none", cursor: item ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={evt => {
                      setTooltip({
                        x: evt.clientX + 12, y: evt.clientY - 28,
                        content: item ? tooltipContent(stateName, item) : (stateName ?? ""),
                      });
                    }}
                    onMouseMove={evt =>
                      setTooltip(t => t ? { ...t, x: evt.clientX + 12, y: evt.clientY - 28 } : null)
                    }
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => { if (item && onStateClick) onStateClick(stateName); }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        {legend}
        {tooltipEl}
      </div>
    );
  }

  // ── Configured countries: local NE GeoJSON choropleth ──────────────────────
  const geoConfig = COUNTRY_GEO_CONFIG[country];
  if (geoConfig) {
    return (
      <div style={{ position: "relative" }}>
        {modeBtns}
        <ComposableMap
          projection={geoConfig.projection}
          projectionConfig={{ scale: geoConfig.scale, center: geoConfig.center }}
          style={{ width: "100%", height: "auto" }}
        >
          <Sphere id="sphere" fill={colors.mapOcean} stroke={colors.mapOcean} strokeWidth={0.5} />
          <Geographies geography={geoConfig.url}>
            {({ geographies }) =>
              geographies.map(geo => {
                const regionName = geo.properties["name"] as string | undefined;
                const item = resolveItem(regionName);
                const isSelected = item
                  ? item.name === selectedState
                  : regionName === selectedState;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? colors.mapHover : getColor(regionName ?? "")}
                    stroke={colors.mapBorder}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: colors.mapHover, outline: "none", cursor: item ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={evt => {
                      setTooltip({
                        x: evt.clientX + 12, y: evt.clientY - 28,
                        content: item
                          ? tooltipContent(item.name, item)
                          : (regionName ?? ""),
                      });
                    }}
                    onMouseMove={evt =>
                      setTooltip(t => t ? { ...t, x: evt.clientX + 12, y: evt.clientY - 28 } : null)
                    }
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (item && onStateClick) onStateClick(item.name);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        {legend}
        {tooltipEl}
      </div>
    );
  }

  // ── Fallback: proportional bubble grid ─────────────────────────────────────
  if (items.length === 0) {
    return <div className="text-text-muted text-xs py-2">No regional breakdown available.</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 py-2 mb-3">
      {items.map(item => {
        const ratio = item.count / maxCount;
        const size = Math.max(52, Math.round(ratio * 156));
        const isSelected = item.name === selectedState;
        return (
          <button
            key={item.name}
            className="flex flex-col items-center justify-center rounded-xl"
            style={{
              width: size, height: size,
              background: isSelected ? colors.mapHover : getColor(item.name),
              border: `2px solid ${isSelected ? colors.accent : "transparent"}`,
              cursor: "pointer", flexShrink: 0,
            }}
            onClick={() => onStateClick && onStateClick(item.name)}
            title={`${item.name}: ${item.count.toLocaleString()} conversations`}
          >
            <span
              className="text-white font-medium text-center leading-tight px-1"
              style={{ fontSize: size < 80 ? 9 : 11 }}
            >
              {item.name.length > 14 && size < 110 ? item.name.slice(0, 12) + "…" : item.name}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.8)" }}>
              {item.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
