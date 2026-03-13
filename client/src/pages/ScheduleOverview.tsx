import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, Plus, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ===== 色塊類型定義 =====
type BlockType = 'sz_arrive' | 'sz_stay' | 'hk_arrive' | 'hk_stay' | 'exchange' | 'border_sz_hk' | 'border_hk_sz' | 'departure' | 'free';

const BLOCK_CONFIG: Record<BlockType, { label: string; shortLabel: string; bg: string; text: string; border: string }> = {
  sz_arrive:    { label: '抵達深圳', shortLabel: '抵深', bg: '#DAEEF3', text: '#1a5276', border: '#9DC3E6' },
  sz_stay:      { label: '深圳住宿', shortLabel: '深圳', bg: '#BDD7EE', text: '#1a5276', border: '#7fb3d3' },
  hk_arrive:    { label: '抵達香港', shortLabel: '抵港', bg: '#9DC3E6', text: '#fff', border: '#5b9bd5' },
  hk_stay:      { label: '香港住宿', shortLabel: '香港', bg: '#5b9bd5', text: '#fff', border: '#2e75b6' },
  exchange:     { label: '交流日 ★', shortLabel: '交流★', bg: '#1F4E79', text: '#fff', border: '#1a3f63' },
  border_sz_hk: { label: '過關 深→港', shortLabel: '過關↑', bg: '#FFE699', text: '#7d6608', border: '#f0c040' },
  border_hk_sz: { label: '過關 港→深', shortLabel: '過關↓', bg: '#FFD966', text: '#7d6608', border: '#f0b030' },
  departure:    { label: '離境', shortLabel: '離境', bg: '#E2EFDA', text: '#375623', border: '#a9d18e' },
  free:         { label: '空閒', shortLabel: '', bg: 'transparent', text: '#999', border: '#e5e7eb' },
};

// 住宿城市計算
function getHotelCity(blockType: BlockType): 'sz' | 'hk' | null {
  if (['sz_arrive', 'sz_stay', 'border_hk_sz'].includes(blockType)) return 'sz';
  if (['hk_arrive', 'hk_stay', 'exchange', 'border_sz_hk'].includes(blockType)) return 'hk';
  return null;
}

// 生成日期範圍
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// 格式化日期顯示
function formatDateHeader(dateStr: string): { month: string; day: string; weekday: string } {
  const d = new Date(dateStr);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return {
    month: `${d.getMonth() + 1}月`,
    day: `${d.getDate()}`,
    weekday: weekdays[d.getDay()],
  };
}

// 判斷是否週末
function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

// 判斷是否今天
function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

export default function ScheduleOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);

  const { data: project } = trpc.projects.get.useQuery({ id: pid }, { enabled: !!pid });
  const { data: groups = [], refetch: refetchGroups } = trpc.projects.getGroups.useQuery({ projectId: pid }, { enabled: !!pid });
  const { data: blocks = [], refetch: refetchBlocks } = trpc.scheduleBlocks.listByProject.useQuery({ projectId: pid }, { enabled: !!pid });

  const upsertBlock = trpc.scheduleBlocks.upsert.useMutation();
  const shiftBatch = trpc.scheduleBlocks.shiftBatch.useMutation();
  const batchUpsert = trpc.scheduleBlocks.batchUpsert.useMutation();

  // 選中的色塊編輯
  const [editDialog, setEditDialog] = useState<{ groupId: number; date: string; current?: any } | null>(null);
  const [editBlockType, setEditBlockType] = useState<BlockType>('free');
  const [editFlightNumber, setEditFlightNumber] = useState('');
  const [editFlightTime, setEditFlightTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsExchange, setEditIsExchange] = useState(false);

  // 拖拽整體移動
  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const cellWidth = 52; // px per day

  // 模板生成對話框
  const [templateDialog, setTemplateDialog] = useState<{ groupId: number } | null>(null);
  const [templateSzDays, setTemplateSzDays] = useState(3);
  const [templateHkDays, setTemplateHkDays] = useState(4);
  const [templateStartDate, setTemplateStartDate] = useState('');
  const [templateExchangeOffset, setTemplateExchangeOffset] = useState(2); // 第幾天是交流日（從港第1天算）

  // 計算日期範圍
  const dateRange = project?.startDate && project?.endDate
    ? generateDateRange(
        project.startDate instanceof Date ? project.startDate.toISOString().split('T')[0] : String(project.startDate),
        project.endDate instanceof Date ? project.endDate.toISOString().split('T')[0] : String(project.endDate)
      )
    : [];

  // 建立 blockMap: groupId -> date -> block
  // 注意： MySQL date 類型由 Drizzle ORM 返回為 Date 對象，需要轉為 YYYY-MM-DD 字串
  const blockMap = new Map<string, any>();
  blocks.forEach(b => {
    const dateStr = b.date instanceof Date 
      ? b.date.toISOString().split('T')[0] 
      : String(b.date).split('T')[0];
    blockMap.set(`${b.groupId}_${dateStr}`, b);
  });

  // 計算每日住宿統計
  const dailyStats = dateRange.map(date => {
    let szCount = 0, hkCount = 0;
    groups.forEach(g => {
      const block = blockMap.get(`${g.id}_${date}`);
      const city = block ? getHotelCity(block.blockType) : null;
      if (city === 'sz') szCount += (g.studentCount || 0);
      if (city === 'hk') hkCount += (g.studentCount || 0);
    });
    return { date, szCount, hkCount };
  });

  // 按 tags 或 type 分組（中學/小學）
  const secondaryGroups = groups.filter(g => 
    (g.tags && g.tags.includes('中學')) || 
    (g.type && g.type.includes('中學'))
  );
  const primaryGroups = groups.filter(g => !secondaryGroups.includes(g));

  // 點擊色塊打開編輯
  function handleCellClick(groupId: number, date: string) {
    const existing = blockMap.get(`${groupId}_${date}`);
    setEditBlockType(existing?.blockType || 'free');
    setEditFlightNumber(existing?.flightNumber || '');
    setEditFlightTime(existing?.flightTime || '');
    setEditNotes(existing?.notes || '');
    setEditIsExchange(existing?.isExchangeDay || false);
    setEditDialog({ groupId, date, current: existing });
  }

  async function handleSaveBlock() {
    if (!editDialog) return;
    try {
      await upsertBlock.mutateAsync({
        groupId: editDialog.groupId,
        date: editDialog.date,
        blockType: editBlockType,
        isExchangeDay: editIsExchange || editBlockType === 'exchange',
        flightNumber: editFlightNumber || null,
        flightTime: editFlightTime || null,
        notes: editNotes || null,
        hotelCity: getHotelCity(editBlockType),
      });
      await refetchBlocks();
      setEditDialog(null);
      toast.success(`${editDialog.date} 色塊已保存`);
    } catch (e) {
      toast.error('保存失敗');
    }
  }

  // 整體移動批次
  async function handleShiftBatch(groupId: number, days: number) {
    try {
      await shiftBatch.mutateAsync({ groupId, days });
      await refetchBlocks();
      toast.success(`批次行程已${days > 0 ? '延後' : '提前'} ${Math.abs(days)} 天`);
    } catch (e) {
      toast.error('移動失敗');
    }
  }

  // 模板快速生成
  async function handleGenerateTemplate() {
    if (!templateDialog || !templateStartDate) return;
    const blocks: any[] = [];
    const start = new Date(templateStartDate);
    let dayOffset = 0;

    // 深圳天數
    for (let i = 0; i < templateSzDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + dayOffset);
      blocks.push({
        date: d.toISOString().split('T')[0],
        blockType: i === 0 ? 'sz_arrive' : 'sz_stay',
        hotelCity: 'sz',
      });
      dayOffset++;
    }

    // 過關日（深→港）
    {
      const d = new Date(start);
      d.setDate(d.getDate() + dayOffset);
      blocks.push({ date: d.toISOString().split('T')[0], blockType: 'border_sz_hk', hotelCity: 'hk' });
      dayOffset++;
    }

    // 香港天數
    for (let i = 0; i < templateHkDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + dayOffset);
      const isExchange = i === templateExchangeOffset;
      blocks.push({
        date: d.toISOString().split('T')[0],
        blockType: isExchange ? 'exchange' : (i === 0 ? 'hk_arrive' : 'hk_stay'),
        isExchangeDay: isExchange,
        hotelCity: 'hk',
      });
      dayOffset++;
    }

    // 過關日（港→深）
    {
      const d = new Date(start);
      d.setDate(d.getDate() + dayOffset);
      blocks.push({ date: d.toISOString().split('T')[0], blockType: 'border_hk_sz', hotelCity: 'sz' });
      dayOffset++;
    }

    // 離境
    {
      const d = new Date(start);
      d.setDate(d.getDate() + dayOffset);
      blocks.push({ date: d.toISOString().split('T')[0], blockType: 'departure', hotelCity: null });
    }

    try {
      await batchUpsert.mutateAsync({ groupId: templateDialog.groupId, blocks });
      await refetchBlocks();
      setTemplateDialog(null);
      toast.success(`共生成 ${blocks.length} 個色塊`);
    } catch (e) {
      toast.error('生成失敗');
    }
  }

  const renderGroupRow = (group: any) => {
    const isSecondary = secondaryGroups.includes(group);
    const rowBg = isSecondary ? '#FFF4EC' : '#FFFFFF';

    return (
      <tr key={group.id} style={{ backgroundColor: rowBg }}>
        {/* 批次名稱 */}
        <td className="sticky left-0 z-10 border border-gray-200 px-2 py-1 min-w-[140px]" style={{ backgroundColor: rowBg }}>
          <div className="flex items-center justify-between gap-1">
            <div>
              <div className="font-semibold text-xs text-gray-800 leading-tight">{group.name}</div>
              {group.studentCount && (
                <div className="text-[10px] text-gray-500">{group.studentCount}人</div>
              )}
            </div>
            <div className="flex gap-0.5">
              <button
                onClick={() => handleShiftBatch(group.id, -1)}
                className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
                title="提前1天"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleShiftBatch(group.id, 1)}
                className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
                title="延後1天"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setTemplateDialog({ groupId: group.id });
                  setTemplateStartDate(project?.startDate ? (project.startDate instanceof Date ? project.startDate.toISOString().split('T')[0] : String(project.startDate)) : '');
                }}
                className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
                title="模板快速生成"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </td>

        {/* 日期色塊 */}
        {dateRange.map(date => {
          const block = blockMap.get(`${group.id}_${date}`);
          const bt: BlockType = block?.blockType || 'free';
          const cfg = BLOCK_CONFIG[bt];
          const isEx = block?.isExchangeDay || bt === 'exchange';

          return (
            <td
              key={date}
              onClick={() => handleCellClick(group.id, date)}
              className="border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: cfg.bg,
                borderColor: cfg.border,
                width: `${cellWidth}px`,
                minWidth: `${cellWidth}px`,
                padding: '2px 3px',
                verticalAlign: 'middle',
              }}
              title={`${group.name} | ${date} | ${cfg.label}${block?.flightNumber ? ` | 航班: ${block.flightNumber}` : ''}${block?.notes ? ` | ${block.notes}` : ''}`}
            >
              <div className="text-center leading-tight">
                <div className="text-[10px] font-medium" style={{ color: cfg.text }}>
                  {isEx ? '★' : cfg.shortLabel}
                </div>
                {block?.flightNumber && (
                  <div className="text-[8px]" style={{ color: cfg.text, opacity: 0.8 }}>
                    {block.flightNumber}
                  </div>
                )}
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 頂部標題欄 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div>
          <h1 className="text-base font-bold text-gray-800">
            {project?.name || '排程總覽'}
          </h1>
          <p className="text-xs text-gray-500">
            {project?.startDate ? new Date(project.startDate).toLocaleDateString('zh-CN') : ''} ~ {project?.endDate ? new Date(project.endDate).toLocaleDateString('zh-CN') : ''} | {groups.length} 個批次
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{ backgroundColor: '#BDD7EE' }}></span>深圳
          </Badge>
          <Badge variant="outline" className="text-xs">
            <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{ backgroundColor: '#5b9bd5' }}></span>香港
          </Badge>
          <Badge variant="outline" className="text-xs">
            <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{ backgroundColor: '#1F4E79' }}></span>交流★
          </Badge>
          <Badge variant="outline" className="text-xs">
            <span className="w-2 h-2 rounded-sm inline-block mr-1" style={{ backgroundColor: '#FFE699' }}></span>過關
          </Badge>
        </div>
      </div>

      {/* 排程表格 */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-20 bg-white">
            {/* 月份行 */}
            <tr>
              <th className="sticky left-0 z-30 bg-white border border-gray-200 px-2 py-1 min-w-[140px] text-left text-gray-600 font-medium">
                批次 / 日期
              </th>
              {dateRange.map((date, i) => {
                const { month, day } = formatDateHeader(date);
                const showMonth = i === 0 || formatDateHeader(dateRange[i - 1]).month !== month;
                return (
                  <th
                    key={date}
                    className="border border-gray-200 text-center font-medium text-gray-500"
                    style={{
                      width: `${cellWidth}px`,
                      minWidth: `${cellWidth}px`,
                      backgroundColor: isToday(date) ? '#EFF6FF' : isWeekend(date) ? '#FEF9F0' : 'white',
                      padding: '2px 0',
                    }}
                  >
                    {showMonth && <div className="text-[9px] text-blue-500">{month}</div>}
                    <div className="text-[11px] font-bold">{day}</div>
                  </th>
                );
              })}
            </tr>
            {/* 星期行 */}
            <tr>
              <th className="sticky left-0 z-30 bg-gray-50 border border-gray-200"></th>
              {dateRange.map(date => {
                const { weekday } = formatDateHeader(date);
                const weekend = isWeekend(date);
                return (
                  <th
                    key={date}
                    className="border border-gray-200 text-center"
                    style={{
                      width: `${cellWidth}px`,
                      minWidth: `${cellWidth}px`,
                      backgroundColor: isToday(date) ? '#DBEAFE' : weekend ? '#FEF9F0' : '#F9FAFB',
                      color: weekend ? '#DC2626' : '#6B7280',
                      padding: '1px 0',
                      fontSize: '10px',
                    }}
                  >
                    {weekday}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* 小學批次 */}
            {primaryGroups.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={dateRange.length + 1}
                    className="bg-blue-50 border border-gray-200 px-3 py-0.5"
                    style={{ fontSize: '10px', color: '#1e40af', fontWeight: 600 }}
                  >
                    小學組 ({primaryGroups.length} 批次)
                  </td>
                </tr>
                {primaryGroups.map(renderGroupRow)}
              </>
            )}

            {/* 中學批次 */}
            {secondaryGroups.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={dateRange.length + 1}
                    className="bg-orange-50 border border-gray-200 px-3 py-0.5"
                    style={{ fontSize: '10px', color: '#9a3412', fontWeight: 600 }}
                  >
                    中學組 ({secondaryGroups.length} 批次)
                  </td>
                </tr>
                {secondaryGroups.map(renderGroupRow)}
              </>
            )}

            {/* 住宿統計行 */}
            <tr className="bg-gray-50">
              <td className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
                深圳住宿人數
              </td>
              {dailyStats.map(({ date, szCount }) => (
                <td
                  key={date}
                  className="border border-gray-200 text-center"
                  style={{ backgroundColor: szCount > 0 ? '#DAEEF3' : '#F9FAFB', padding: '2px 0' }}
                >
                  {szCount > 0 && (
                    <span className="text-[10px] font-bold text-blue-800">{szCount}</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
                香港住宿人數
              </td>
              {dailyStats.map(({ date, hkCount }) => (
                <td
                  key={date}
                  className="border border-gray-200 text-center"
                  style={{ backgroundColor: hkCount > 0 ? '#BDD7EE' : '#F9FAFB', padding: '2px 0' }}
                >
                  {hkCount > 0 && (
                    <span className="text-[10px] font-bold text-blue-900">{hkCount}</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* 空狀態 */}
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📅</div>
            <div className="text-sm font-medium">尚未添加批次</div>
            <div className="text-xs mt-1">請先在「批次管理」中添加批次</div>
          </div>
        )}
      </div>

      {/* 色塊編輯對話框 */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              編輯色塊 — {editDialog?.date}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">日程類型</Label>
              <Select value={editBlockType} onValueChange={v => setEditBlockType(v as BlockType)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(BLOCK_CONFIG) as [BlockType, any][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      <span
                        className="inline-block w-3 h-3 rounded-sm mr-2 border"
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                      />
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['sz_arrive', 'hk_arrive', 'departure'].includes(editBlockType) && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">航班號</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    placeholder="如 CZ3456"
                    value={editFlightNumber}
                    onChange={e => setEditFlightNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">航班時間</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    placeholder="如 14:30"
                    value={editFlightTime}
                    onChange={e => setEditFlightTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">備注</Label>
              <Input
                className="h-7 text-xs mt-1"
                placeholder="可選備注"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditDialog(null)}>
                取消
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveBlock} disabled={upsertBlock.isPending}>
                {upsertBlock.isPending ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 模板生成對話框 */}
      <Dialog open={!!templateDialog} onOpenChange={() => setTemplateDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">快速生成行程模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">開始日期（抵達深圳）</Label>
              <Input
                type="date"
                className="h-7 text-xs mt-1"
                value={templateStartDate}
                onChange={e => setTemplateStartDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">深圳天數</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-7 text-xs mt-1"
                  value={templateSzDays}
                  onChange={e => setTemplateSzDays(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">香港天數</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-7 text-xs mt-1"
                  value={templateHkDays}
                  onChange={e => setTemplateHkDays(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">交流日（香港第幾天，從0開始）</Label>
              <Input
                type="number"
                min={0}
                max={templateHkDays - 1}
                className="h-7 text-xs mt-1"
                value={templateExchangeOffset}
                onChange={e => setTemplateExchangeOffset(Number(e.target.value))}
              />
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              預覽：深圳 {templateSzDays} 天 → 過關 → 香港 {templateHkDays} 天（第 {templateExchangeOffset + 1} 天交流）→ 過關 → 離境
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTemplateDialog(null)}>
                取消
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleGenerateTemplate} disabled={batchUpsert.isPending}>
                {batchUpsert.isPending ? '生成中...' : '生成模板'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
