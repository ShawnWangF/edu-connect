/**
 * 通知服務 - 處理自動通知邏輯
 */
import * as db from './db';
import { format, differenceInDays, addDays } from 'date-fns';

/**
 * 檢查並發送出發前提醒
 * 在團組出發前3天、1天發送提醒
 */
export async function checkDepartureReminders() {
  const groups = await db.getAllGroups();
  const now = new Date();
  
  for (const group of groups) {
    if (group.status !== 'preparing') continue;
    
    const startDate = new Date(group.startDate);
    const daysUntilDeparture = differenceInDays(startDate, now);
    
    // 出發前3天提醒
    if (daysUntilDeparture === 3) {
      await sendDepartureReminder(group, 3);
    }
    
    // 出發前1天提醒
    if (daysUntilDeparture === 1) {
      await sendDepartureReminder(group, 1);
    }
  }
}

/**
 * 發送出發提醒
 */
async function sendDepartureReminder(group: any, daysAhead: number) {
  // 獲取所有管理員和編輯者
  const users = await db.getAllUsers();
  const recipients = users.filter(u => u.role === 'admin' || u.role === 'editor');
  
  for (const user of recipients) {
    await db.createNotification({
      userId: user.id,
      type: 'departure',
      title: `團組「${group.name}」即將出發`,
      content: `團組將在${daysAhead}天後（${format(new Date(group.startDate), 'yyyy-MM-dd')}）出發，請做好準備工作。`,
      relatedGroupId: group.id,
    });
  }
}

/**
 * 發送行程變更通知
 */
export async function notifyItineraryChange(groupId: number, changeDescription: string) {
  const group = await db.getGroupById(groupId);
  if (!group) return;
  
  // 獲取所有管理員和編輯者
  const users = await db.getAllUsers();
  const recipients = users.filter(u => u.role === 'admin' || u.role === 'editor');
  
  for (const user of recipients) {
    await db.createNotification({
      userId: user.id,
      type: 'change',
      title: `團組「${group.name}」行程變更`,
      content: changeDescription,
      relatedGroupId: group.id,
    });
  }
}

/**
 * 發送截止日期提醒
 */
export async function notifyDeadline(groupId: number, title: string, content: string) {
  const group = await db.getGroupById(groupId);
  if (!group) return;
  
  // 獲取所有管理員和編輯者
  const users = await db.getAllUsers();
  const recipients = users.filter(u => u.role === 'admin' || u.role === 'editor');
  
  for (const user of recipients) {
    await db.createNotification({
      userId: user.id,
      type: 'deadline',
      title,
      content,
      relatedGroupId: group.id,
    });
  }
}

/**
 * 啟動定時任務 - 每小時檢查一次
 */
export function startNotificationScheduler() {
  // 立即執行一次
  checkDepartureReminders().catch(console.error);
  
  // 每小時執行一次
  setInterval(() => {
    checkDepartureReminders().catch(console.error);
  }, 60 * 60 * 1000); // 1小時
  
  console.log('[NotificationService] 通知服務已啟動');
}
