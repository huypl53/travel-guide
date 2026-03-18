import type { LocationType } from "@/lib/types";

export interface TemplateLocation {
  type: LocationType;
  name: string;
  lat: number;
  lon: number;
  address: string | null;
  priority?: number;
}

export interface TripTemplate {
  id: string;
  name: string;
  description: string;
  region: string;
  duration: string;
  coverEmoji: string;
  locations: TemplateLocation[];
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: "da-lat-weekend",
    name: "Da Lat Weekend",
    description:
      "Escape to the cool Central Highlands. Explore flower gardens, waterfalls, and French colonial architecture.",
    region: "Central Highlands",
    duration: "2-3 days",
    coverEmoji: "\u{1F338}",
    locations: [
      { type: "base", name: "The LOCAL Dalat Hostel", lat: 11.9404, lon: 108.4383, address: "45 Truong Cong Dinh, Ward 1, Da Lat" },
      { type: "base", name: "Zen Valley Dalat", lat: 11.9186, lon: 108.4308, address: "12 Hoang Hoa Tham, Ward 10, Da Lat" },
      { type: "base", name: "Dalat De Charme Village", lat: 11.9352, lon: 108.4528, address: "Trai Mat, Da Lat" },
      { type: "destination", name: "Xuan Huong Lake", lat: 11.9446, lon: 108.4380, address: "Tran Quoc Toan, Ward 1, Da Lat", priority: 5 },
      { type: "destination", name: "Datanla Waterfall", lat: 11.9058, lon: 108.4504, address: "Highway 20, Da Lat", priority: 4 },
      { type: "destination", name: "Crazy House (Hang Nga)", lat: 11.9362, lon: 108.4314, address: "3 Huynh Thuc Khang, Ward 4, Da Lat", priority: 4 },
      { type: "destination", name: "Da Lat Night Market", lat: 11.9433, lon: 108.4413, address: "Nguyen Thi Minh Khai, Da Lat", priority: 3 },
      { type: "destination", name: "Langbiang Mountain", lat: 12.0491, lon: 108.4424, address: "Lac Duong, Lam Dong", priority: 3 },
    ],
  },
  {
    id: "hoi-an-da-nang",
    name: "Hoi An & Da Nang",
    description:
      "Ancient town lanterns by night, golden beaches by day. The best of Central Vietnam's coast.",
    region: "Central Coast",
    duration: "3-4 days",
    coverEmoji: "\u{1F3EE}",
    locations: [
      { type: "base", name: "Hoi An Chic Homestay", lat: 15.8780, lon: 108.3260, address: "18 Le Loi, Hoi An" },
      { type: "base", name: "An Bang Seaside Village", lat: 15.9020, lon: 108.3510, address: "An Bang Beach, Hoi An" },
      { type: "base", name: "Da Nang Riverside Homestay", lat: 16.0610, lon: 108.2240, address: "Bach Dang, Hai Chau, Da Nang" },
      { type: "destination", name: "Hoi An Ancient Town", lat: 15.8801, lon: 108.3380, address: "Hoi An Old Quarter", priority: 5 },
      { type: "destination", name: "An Bang Beach", lat: 15.9030, lon: 108.3540, address: "An Bang, Hoi An", priority: 4 },
      { type: "destination", name: "Marble Mountains", lat: 16.0038, lon: 108.2633, address: "Hoa Hai, Ngu Hanh Son, Da Nang", priority: 4 },
      { type: "destination", name: "Ba Na Hills & Golden Bridge", lat: 15.9977, lon: 107.9882, address: "Hoa Ninh, Hoa Vang, Da Nang", priority: 5 },
      { type: "destination", name: "My Khe Beach", lat: 16.0544, lon: 108.2480, address: "Pham Van Dong, Da Nang", priority: 3 },
      { type: "destination", name: "Dragon Bridge", lat: 16.0610, lon: 108.2278, address: "Nguyen Van Linh, Da Nang", priority: 3 },
    ],
  },
  {
    id: "phu-quoc-beach",
    name: "Phu Quoc Beach Escape",
    description:
      "Crystal-clear waters, fresh seafood, and stunning sunsets on Vietnam's largest island.",
    region: "Southern Island",
    duration: "3-4 days",
    coverEmoji: "\u{1F3D6}\u{FE0F}",
    locations: [
      { type: "base", name: "Long Beach Bungalow", lat: 10.2115, lon: 103.9570, address: "Tran Hung Dao, Duong Dong, Phu Quoc" },
      { type: "base", name: "Ong Lang Beach Homestay", lat: 10.2680, lon: 103.9420, address: "Ong Lang, Phu Quoc" },
      { type: "base", name: "Starfish Beach House", lat: 10.3620, lon: 103.9980, address: "Rach Vem, Phu Quoc" },
      { type: "destination", name: "Sao Beach", lat: 10.1392, lon: 104.0308, address: "An Thoi, Phu Quoc", priority: 5 },
      { type: "destination", name: "Phu Quoc Night Market", lat: 10.2166, lon: 103.9630, address: "Bach Dang, Duong Dong, Phu Quoc", priority: 4 },
      { type: "destination", name: "Vinpearl Safari", lat: 10.3230, lon: 103.8710, address: "Ganh Dau, Phu Quoc", priority: 4 },
      { type: "destination", name: "Hon Thom Cable Car", lat: 10.0920, lon: 104.0210, address: "An Thoi, Phu Quoc", priority: 5 },
      { type: "destination", name: "Dinh Cau Rock Temple", lat: 10.2130, lon: 103.9580, address: "Duong Dong, Phu Quoc", priority: 3 },
    ],
  },
  {
    id: "ha-noi-old-quarter",
    name: "Ha Noi Old Quarter",
    description:
      "Thousand-year-old capital city. Street food, ancient temples, and a vibrant Old Quarter to explore.",
    region: "North",
    duration: "2-3 days",
    coverEmoji: "\u{1F3DB}\u{FE0F}",
    locations: [
      { type: "base", name: "Old Quarter View Homestay", lat: 21.0340, lon: 105.8510, address: "Hang Bac, Hoan Kiem, Ha Noi" },
      { type: "base", name: "West Lake House", lat: 21.0530, lon: 105.8260, address: "Xuan Dieu, Tay Ho, Ha Noi" },
      { type: "base", name: "French Quarter Stay", lat: 21.0210, lon: 105.8530, address: "Hai Ba Trung, Ha Noi" },
      { type: "destination", name: "Hoan Kiem Lake", lat: 21.0288, lon: 105.8525, address: "Hoan Kiem, Ha Noi", priority: 5 },
      { type: "destination", name: "Temple of Literature", lat: 21.0275, lon: 105.8362, address: "Quoc Tu Giam, Dong Da, Ha Noi", priority: 5 },
      { type: "destination", name: "Ho Chi Minh Mausoleum", lat: 21.0368, lon: 105.8350, address: "Hung Vuong, Ba Dinh, Ha Noi", priority: 4 },
      { type: "destination", name: "Old Quarter 36 Streets", lat: 21.0340, lon: 105.8520, address: "Hoan Kiem, Ha Noi", priority: 4 },
      { type: "destination", name: "Train Street", lat: 21.0244, lon: 105.8469, address: "Tran Phu, Hoan Kiem, Ha Noi", priority: 3 },
    ],
  },
  {
    id: "ho-chi-minh-explorer",
    name: "Ho Chi Minh City Explorer",
    description:
      "Dynamic southern metropolis. French colonial landmarks, buzzing markets, and incredible street food.",
    region: "South",
    duration: "2-3 days",
    coverEmoji: "\u{1F310}",
    locations: [
      { type: "base", name: "District 1 Central Homestay", lat: 10.7756, lon: 106.7019, address: "Bui Vien, Pham Ngu Lao, District 1" },
      { type: "base", name: "Thao Dien Village Stay", lat: 10.8030, lon: 106.7340, address: "Thao Dien, Thu Duc City" },
      { type: "base", name: "Homestay District 3", lat: 10.7834, lon: 106.6856, address: "Vo Thi Sau, Ward 7, District 3" },
      { type: "destination", name: "Ben Thanh Market", lat: 10.7725, lon: 106.6980, address: "Le Loi, District 1", priority: 5 },
      { type: "destination", name: "War Remnants Museum", lat: 10.7794, lon: 106.6922, address: "Vo Van Tan, District 3", priority: 5 },
      { type: "destination", name: "Notre-Dame Cathedral Basilica", lat: 10.7798, lon: 106.6991, address: "Han Thuyen, District 1", priority: 4 },
      { type: "destination", name: "Saigon Central Post Office", lat: 10.7800, lon: 106.7000, address: "Cong xa Paris, District 1", priority: 4 },
      { type: "destination", name: "Cu Chi Tunnels", lat: 11.1417, lon: 106.4627, address: "Phu Hiep, Cu Chi", priority: 4 },
      { type: "destination", name: "Bui Vien Walking Street", lat: 10.7680, lon: 106.6937, address: "Pham Ngu Lao, District 1", priority: 3 },
    ],
  },
  {
    id: "ninh-binh-tam-coc",
    name: "Ninh Binh & Tam Coc",
    description:
      "Dramatic limestone karsts, ancient temples, and peaceful boat rides through flooded rice paddies.",
    region: "North",
    duration: "2 days",
    coverEmoji: "\u{26F0}\u{FE0F}",
    locations: [
      { type: "base", name: "Tam Coc Garden Homestay", lat: 20.2155, lon: 105.9400, address: "Ninh Hai, Hoa Lu, Ninh Binh" },
      { type: "base", name: "Trang An Retreat", lat: 20.2530, lon: 105.8900, address: "Truong Yen, Hoa Lu, Ninh Binh" },
      { type: "destination", name: "Tam Coc Boat Tour", lat: 20.2155, lon: 105.9372, address: "Van Lam Wharf, Ninh Hai, Ninh Binh", priority: 5 },
      { type: "destination", name: "Trang An Scenic Landscape", lat: 20.2508, lon: 105.8976, address: "Trang An, Ninh Binh", priority: 5 },
      { type: "destination", name: "Bai Dinh Pagoda", lat: 20.2730, lon: 105.8490, address: "Gia Sinh, Gia Vien, Ninh Binh", priority: 4 },
      { type: "destination", name: "Mua Cave Viewpoint", lat: 20.2200, lon: 105.9310, address: "Khe Dau Ha, Ninh Binh", priority: 4 },
    ],
  },
];
