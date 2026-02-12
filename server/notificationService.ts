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
 * 發送行程變更通知（通知全體成員）
 */
export async function notifyItineraryChange(groupId: number, changeDescription: string) {
  const group = await db.getGroupById(groupId);
  if (!group) return;
  
  // 獲取所有用戶（全體成員）
  const users = await db.getAllUsers();
  
  for (const user of users) {
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
 * 發送截止日期提醒（通知全體成員）
 */
export async function notifyDeadline(groupId: number, title: string, content: string) {
  const group = await db.getGroupById(groupId);
  if (!group) return;
  
  // 獲取所有用戶（全體成員）
  const users = await db.getAllUsers();
  
  for (const user of users) {
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
 * 發送團組創建通知（通知全體成員）
 */
export async function notifyGroupCreated(group: any) {
  const users = await db.getAllUsers();
  
  for (const user of users) {
    await db.createNotification({
      userId: user.id,
      type: 'reminder',
      title: `新團組「${group.name}」已創建`,
      content: `團組編號：${group.code}，出發日期：${format(new Date(group.startDate), 'yyyy-MM-dd')}，共${group.days}天。`,
      relatedGroupId: group.id,
    });
  }
}

/**
 * 發送團組重大變更通知（通知全體成員）
 */
export async function notifyGroupUpdated(group: any, changes: string) {
  const users = await db.getAllUsers();
  
  for (const user of users) {
    await db.createNotification({
      userId: user.id,
      type: 'change',
      title: `團組「${group.name}」信息更新`,
      content: changes,
      relatedGroupId: group.id,
    });
  }
}

/**
 * 發送團組狀態變更通知（通知全體成員）
 */
export async function notifyGroupStatusChanged(group: any, oldStatus: string, newStatus: string) {
  const users = await db.getAllUsers();
  const statusMap: Record<string, string> = {
    preparing: '準備中',
    ongoing: '進行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  
  for (const user of users) {
    await db.createNotification({
      userId: user.id,
      type: 'change',
      title: `團組「${group.name}」狀態變更`,
      content: `團組狀態從「${statusMap[oldStatus]}」變更為「${statusMap[newStatus]}」。`,
      relatedGroupId: group.id,
    });
  }
}

/**
 * 發送文件上傳通知（通知全體成員）
 */
export async function notifyFileUploaded(groupId: number, fileName: string, uploaderName: string) {
  const group = await db.getGroupById(groupId);
  if (!group) return;
  
  const users = await db.getAllUsers();
  
  for (const user of users) {
    await db.createNotification({
      userId: user.id,
      type: 'reminder',
      title: `團組「${group.name}」有新文件`,
      content: `${uploaderName} 上傳了文件：${fileName}`,
      relatedGroupId: group.id,
    });
  }
}

/**
 * 發送成員批量導入通知（通知全體成員）
 */
export async function notifyMembersBatchImported(groupId: number, count: number) {
  const group = await db.getGroupById(groupId);
  if (!group) return;
  
  const users = await db.getAllUsers();
  
  for (const user of users) {
    await db.createNotification({
      userId: user.id,
      type: 'reminder',
      title: `團組「${group.name}」成員更新`,
      content: `已批量導入 ${count} 名成員。`,
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
