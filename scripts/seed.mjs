import { drizzle } from "drizzle-orm/mysql2";
import { users, locations } from "../drizzle/schema.js";
import { nanoid } from "nanoid";

// 使用bcrypt的簡化版本進行密碼哈希
async function hashPassword(password) {
  // 簡單的哈希實現，實際應使用bcrypt
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seed() {
  const db = drizzle(process.env.DATABASE_URL);
  
  console.log("開始創建初始數據...");
  
  // 創建初始管理員賬號 wang/000000
  const hashedPassword = await hashPassword("000000");
  
  try {
    await db.insert(users).values({
      openId: `local-${nanoid()}`,
      username: "wang",
      password: hashedPassword,
      name: "Wang",
      email: "wang@educonnect.com",
      loginMethod: "local",
      role: "admin",
      isOnline: false,
    });
    console.log("✓ 初始管理員賬號已創建: wang/000000");
  } catch (error) {
    console.log("管理員賬號可能已存在，跳過創建");
  }
  
  // 創建初始景點數據
  const initialLocations = [
    {
      name: "西九文化區",
      address: "西九龍文化區",
      capacity: 300,
      applicableType: "all",
      contact: "",
      phone: "",
      isActive: true,
    },
    {
      name: "諾亞方舟",
      address: "新界馬灣珀欣路33號",
      capacity: 150,
      applicableType: "all",
      restrictedDays: "3", // 周三
      contact: "",
      phone: "",
      isActive: true,
    },
    {
      name: "香港大學",
      address: "薄扶林道",
      capacity: 150,
      applicableType: "all",
      contact: "",
      phone: "",
      isActive: true,
    },
    {
      name: "香港太空館",
      address: "尖沙咀梳士巴利道10號",
      capacity: 100,
      applicableType: "all",
      contact: "",
      phone: "",
      isActive: true,
    },
    {
      name: "香港海洋公園",
      address: "香港仔黃竹坑道180號",
      capacity: 500,
      applicableType: "all",
      contact: "",
      phone: "",
      isActive: true,
    },
    {
      name: "香港科學館",
      address: "尖沙咀科學館道2號",
      capacity: 200,
      applicableType: "all",
      restrictedDays: "4", // 周四
      contact: "",
      phone: "",
      isActive: true,
    },
    {
      name: "香港警隊博物館",
      address: "山頂甘道27號",
      capacity: 100,
      applicableType: "elementary",
      contact: "",
      phone: "",
      isActive: true,
    },
    {
      name: "駐港部隊展覽中心",
      address: "中環軍營",
      capacity: 100,
      applicableType: "middle",
      contact: "",
      phone: "",
      isActive: true,
    },
  ];
  
  try {
    for (const location of initialLocations) {
      await db.insert(locations).values(location);
    }
    console.log("✓ 初始景點數據已創建");
  } catch (error) {
    console.log("景點數據可能已存在，跳過創建");
  }
  
  console.log("初始數據創建完成！");
  process.exit(0);
}

seed().catch((error) => {
  console.error("創建初始數據失敗:", error);
  process.exit(1);
});
