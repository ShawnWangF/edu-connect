import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// 定義類型
interface Group {
  id: number;
  name: string;
  code: string;
  startDate: string | Date;
  endDate: string | Date;
  days: number;
  type: string[];
  status: string;
  studentCount: number;
  teacherCount: number;
  totalCount: number;
  hotel?: string | null;
  contact?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  notes?: string | null;
  requiredItineraries?: number[] | null;
}

interface Itinerary {
  id: number;
  groupId: number;
  date: string | Date;
  dayNumber: number;
  startTime?: string | null;
  endTime?: string | null;
  locationName?: string | null;
  description?: string | null;
  notes?: string | null;
}

interface Member {
  id: number;
  groupId: number;
  name: string;
  identity: string;
  gender?: string | null;
  phone?: string | null;
  notes?: string | null;
  customFields?: any;
}

interface DailyCard {
  id: number;
  groupId: number;
  date: string | Date;
  departureTime?: string | null;
  arrivalTime?: string | null;
  departurePlace?: string | null;
  arrivalPlace?: string | null;
  hotelName?: string | null;
  hotelAddress?: string | null;
  vehiclePlate?: string | null;
  guideName?: string | null;
  guidePhone?: string | null;
  securityName?: string | null;
  securityPhone?: string | null;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  specialNotes?: string | null;
}

interface Attraction {
  id: number;
  name: string;
  location?: string | null;
}

const statusMap: Record<string, string> = {
  preparing: "準備中",
  ongoing: "進行中",
  completed: "已完成",
  cancelled: "已取消",
};

/**
 * 導出團組信息為PDF
 */
export async function exportGroupToPDF(
  group: Group,
  itineraries: Itinerary[],
  members: Member[],
  dailyCards: DailyCard[],
  attractions: Attraction[]
) {
  try {
    // 創建PDF文檔（A4尺寸）
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 20;

    // 標題
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(group.name, 105, yPos, { align: "center" });
    yPos += 10;

    // 副標題
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${group.code} | ${statusMap[group.status] || group.status}`, 105, yPos, { align: "center" });
    yPos += 15;

    // 基本信息
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Basic Information", 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const basicInfo = [
      ["Date Range", `${format(new Date(group.startDate), "yyyy-MM-dd")} to ${format(new Date(group.endDate), "yyyy-MM-dd")}`],
      ["Duration", `${group.days} days`],
      ["Type", Array.isArray(group.type) ? group.type.join(", ") : group.type],
      ["Participants", `Total ${group.totalCount} (Students ${group.studentCount} / Teachers ${group.teacherCount})`],
    ];

    if (group.hotel) {
      basicInfo.push(["Hotel", group.hotel]);
    }
    if (group.contact) {
      basicInfo.push(["Contact", `${group.contact}${group.phone ? ` (${group.phone})` : ""}`]);
    }
    if (group.emergencyContact) {
      basicInfo.push(["Emergency Contact", `${group.emergencyContact}${group.emergencyPhone ? ` (${group.emergencyPhone})` : ""}`]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: basicInfo,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: 130 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // 必去行程
    if (group.requiredItineraries && group.requiredItineraries.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Required Itineraries", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const requiredList = group.requiredItineraries
        .map((id: number) => {
          const attraction = attractions.find(a => a.id === id);
          return attraction ? attraction.name : `ID: ${id}`;
        })
        .join(", ");
      
      doc.text(requiredList, 20, yPos, { maxWidth: 170 });
      yPos += 10;
    }

    // 檢查是否需要新頁面
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // 行程表
    if (itineraries.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Itinerary Schedule", 20, yPos);
      yPos += 8;

      const itineraryData = itineraries.map((item) => [
        format(new Date(item.date), "MM/dd"),
        item.startTime || "-",
        item.endTime || "-",
        item.locationName || "Not specified",
        item.description || "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Start", "End", "Location", "Description"]],
        body: itineraryData,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 50 },
          4: { cellWidth: 60 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 檢查是否需要新頁面
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // 成員名單
    if (members.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Member List", 20, yPos);
      yPos += 8;

      const memberData = members.map((member) => [
        member.name,
        member.identity || "-",
        member.gender || "-",
        member.phone || "-",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Name", "Role", "Gender", "Phone"]],
        body: memberData,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [92, 184, 92], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 60 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 檢查是否需要新頁面
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // 食行卡片
    if (dailyCards.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Daily Arrangements", 20, yPos);
      yPos += 8;

      dailyCards.forEach((card, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Day ${index + 1} - ${format(new Date(card.date), "yyyy-MM-dd")}`, 20, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const cardInfo: string[][] = [];

        if (card.departurePlace || card.arrivalPlace) {
          cardInfo.push([
            "Transportation",
            `${card.departurePlace || "-"} (${card.departureTime || "-"}) → ${card.arrivalPlace || "-"} (${card.arrivalTime || "-"})`,
          ]);
        }

        if (card.hotelName) {
          cardInfo.push(["Hotel", `${card.hotelName}${card.hotelAddress ? ` - ${card.hotelAddress}` : ""}`]);
        }

        if (card.vehiclePlate) {
          cardInfo.push(["Vehicle", card.vehiclePlate]);
        }

        if (card.guideName) {
          cardInfo.push(["Guide", `${card.guideName}${card.guidePhone ? ` (${card.guidePhone})` : ""}`]);
        }

        if (card.securityName) {
          cardInfo.push(["Security", `${card.securityName}${card.securityPhone ? ` (${card.securityPhone})` : ""}`]);
        }

        if (card.breakfast || card.lunch || card.dinner) {
          const meals = [];
          if (card.breakfast) meals.push(`Breakfast: ${card.breakfast}`);
          if (card.lunch) meals.push(`Lunch: ${card.lunch}`);
          if (card.dinner) meals.push(`Dinner: ${card.dinner}`);
          cardInfo.push(["Meals", meals.join(" | ")]);
        }

        if (card.specialNotes) {
          cardInfo.push(["Notes", card.specialNotes]);
        }

        if (cardInfo.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [],
            body: cardInfo,
            theme: "plain",
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
              0: { fontStyle: "bold", cellWidth: 35 },
              1: { cellWidth: 135 },
            },
          });

          yPos = (doc as any).lastAutoTable.finalY + 8;
        }
      });
    }

    // 保存PDF
    const fileName = `${group.code}_${group.name}_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("PDF export error:", error);
    return { success: false, error: String(error) };
  }
}
