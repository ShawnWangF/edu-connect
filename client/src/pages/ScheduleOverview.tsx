import React, { useState, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronDown, GripHorizontal, X } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ===== 色塊類型定義 =====
type BlockType = 'sz_arrive' | 'sz_stay' | 'hk_arrive' | 'hk_stay' | 'exchange' | 'border_sz_hk' | 'border_hk_sz' | 'departure' | 'free';

const BLOCK_CONFIG: Record<BlockType, { label: string; shortLabel: string; bg: string; text: string; border: string }> = {
  sz_arrive:    { label: '抵達深圳', shortLabel: '抵深', bg: '#DAEEF3', text: '#1a5276', border: '#9DC3E6' },
  sz_stay:      { label: '深圳住宿', shortLabel: '深圳', bg: '#BDD7EE', text: '#1a5276', border: '#7fb3d3' },
  hk_arrive:    { label: '抵達香港', shortLabel: '抵港', bg: '#9DC3E6', text: '#1a5276', border: '#5b9bd5' },
  hk_stay:      { label: '香港住宿', shortLabel: '香港', bg: '#5b9bd5', text: '#fff', border: '#2e75b6' },
  exchange:     { label: '交流日 ★', shortLabel: '交流★', bg: '#1F4E79', text: '#fff', border: '#1a3f63' },
  border_sz_hk: { label: '過關 深→港', shortLabel: '過關↑', bg: '#FFE699', text: '#7d6608', border: '#f0c040' },
  border_hk_sz: { label: '過關 港→深', shortLabel: '過關↓', bg: '#FFD966', text: '#7d6608', border: '#f0b030' },
  departure:    { label: '離境', shortLabel: '離境', bg: '#E2EFDA', text: '#375623', border: '#a9d18e' },
  free:         { label: '空閒', shortLabel: '', bg: 'transparent', text: '#bbb', border: '#e5e7eb' },
};

// 住宿城市計算
function getHotelCity(blockType: BlockType): 'sz' | 'hk' | null {
  if (['sz_arrive', 'sz_stay', 'border_hk_sz'].includes(blockType)) return 'sz';
  if (['hk_arrive', 'hk_stay', 'exchange', 'border_sz_hk'].includes(blockType)) return 'hk';
  return null;
}

// 是否是抵達類型（需要顯示航班）
function isArrivalType(bt: BlockType) {
  return ['sz_arrive', 'hk_arrive'].includes(bt);
}

// 是否是離開類型
function isDepartureType(bt: BlockType) {
  return ['departure', 'border_sz_hk', 'border_hk_sz'].includes(bt);
}

// 生成日期範圍
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// 格式化日期顯示
function formatDateHeader(dateStr: string): { month: string; day: string; weekday: string; monthNum: number } {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return {
    month: `${d.getMonth() + 1}月`,
    monthNum: d.getMonth() + 1,
    day: `${d.getDate()}`,
    weekday: weekdays[d.getDay()],
  };
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

function toDateStr(val: any): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val).split('T')[0];
}

// ===== 左側固定列寬度 =====
const LEFT_COL_WIDTHS = {
  flight: 52,    // 航班
  type: 44,      // 類型
  studentCount: 52, // 人數
  total: 44,     // 合計
  startCity: 52, // 起始城市
  batchCode: 52, // 批次
  schoolList: 160, // 學校分組
};
const TOTAL_LEFT_WIDTH = Object.values(LEFT_COL_WIDTHS).reduce((a, b) => a + b, 0);
const CELL_WIDTH = 46;

export default function ScheduleOverview() {
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId ? Number(params.projectId) : null;
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem('schedule_last_project_id');
    return saved ? Number(saved) : null;
  });
  const pid = urlProjectId ?? selectedProjectId;

  const { data: allProjects = [] } = trpc.projects.list.useQuery(undefined, { enabled: !urlProjectId });
  const { data: project } = trpc.projects.get.useQuery({ id: pid! }, { enabled: !!pid });
  const { data: groups = [], refetch: refetchGroups } = trpc.projects.getGroups.useQuery({ projectId: pid! }, { enabled: !!pid });
  const { data: blocks = [], refetch: refetchBlocks } = trpc.scheduleBlocks.listByProject.useQuery({ projectId: pid! }, { enabled: !!pid });

  const upsertBlock = trpc.scheduleBlocks.upsert.useMutation();
  const shiftBatch = trpc.scheduleBlocks.shiftBatch.useMutation();
  const batchUpsert = trpc.scheduleBlocks.batchUpsert.useMutation();
  const updateGroup = trpc.groups.update.useMutation();

  // 色塊編輯
  const [editDialog, setEditDialog] = useState<{ groupId: number; date: string; current?: any } | null>(null);
  const [editBlockType, setEditBlockType] = useState<BlockType>('free');
  const [editFlightNumber, setEditFlightNumber] = useState('');
  const [editFlightTime, setEditFlightTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // 模板生成
  const [templateDialog, setTemplateDialog] = useState<{ groupId: number; groupName: string } | null>(null);
  const [templateStartCity, setTemplateStartCity] = useState<'sz' | 'hk'>('sz');
  const [templateSzDays, setTemplateSzDays] = useState(3);
  const [templateHkDays, setTemplateHkDays] = useState(4);
  const [templateStartDate, setTemplateStartDate] = useState('');
  const [templateExchangeOffset, setTemplateExchangeOffset] = useState(2);

  // 拖拽狀態
  const dragState = useRef<{
    groupId: number;
    startX: number;
    originalBlocks: any[];
    isDragging: boolean;
    dragOffset: number;
  } | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState(0);

  // 日期範圍
  const dateRange = useMemo(() => {
    if (!project?.startDate || !project?.endDate) return [];
    return generateDateRange(toDateStr(project.startDate), toDateStr(project.endDate));
  }, [project?.startDate, project?.endDate]);

  // blockMap
  const blockMap = useMemo(() => {
    const map = new Map<string, any>();
    blocks.forEach(b => {
      const dateStr = toDateStr(b.date);
      map.set(`${b.groupId}_${dateStr}`, b);
    });
    return map;
  }, [blocks]);

  // 按 batchCode 分組，再按類型分組
  const groupedByBatch = useMemo(() => {
    const batchMap = new Map<string, any[]>();
    groups.forEach(g => {
      const key = g.batch_code || `__single_${g.id}`;
      if (!batchMap.has(key)) batchMap.set(key, []);
      batchMap.get(key)!.push(g);
    });
    return Array.from(batchMap.entries()).map(([batchCode, batchGroups]) => ({
      batchCode: batchCode.startsWith('__single_') ? '' : batchCode,
      groups: batchGroups,
    }));
  }, [groups]);

  // 每日統計
  const dailyStats = useMemo(() => {
    return dateRange.map(date => {
      let szCount = 0, hkCount = 0;
      const arrivalFlights: string[] = [];
      const departureFlights: string[] = [];
      let arrivalGroupCount = 0, departureGroupCount = 0;

      groups.forEach(g => {
        const block = blockMap.get(`${g.id}_${date}`);
        if (!block) return;
        const bt: BlockType = block.blockType || 'free';
        const city = getHotelCity(bt);
        const count = (g.studentCount || 0) + (g.teacherCount || 0);
        if (city === 'sz') szCount += count;
        if (city === 'hk') hkCount += count;
        if (isArrivalType(bt)) {
          arrivalGroupCount++;
          if (block.flightNumber) arrivalFlights.push(block.flightNumber);
          else arrivalFlights.push(g.code || g.name);
        }
        if (isDepartureType(bt) && bt === 'departure') {
          departureGroupCount++;
          if (block.flightNumber) departureFlights.push(block.flightNumber);
          else departureFlights.push(g.code || g.name);
        }
      });
      return { date, szCount, hkCount, arrivalFlights, departureFlights, arrivalGroupCount, departureGroupCount };
    });
  }, [dateRange, groups, blockMap]);

  function handleCellClick(groupId: number, date: string) {
    const existing = blockMap.get(`${groupId}_${date}`);
    setEditBlockType(existing?.blockType || 'free');
    setEditFlightNumber(existing?.flightNumber || '');
    setEditFlightTime(existing?.flightTime || '');
    setEditNotes(existing?.notes || '');
    setEditDialog({ groupId, date, current: existing });
  }

  async function handleSaveBlock() {
    if (!editDialog) return;
    try {
      await upsertBlock.mutateAsync({
        groupId: editDialog.groupId,
        date: editDialog.date,
        blockType: editBlockType,
        isExchangeDay: editBlockType === 'exchange',
        flightNumber: editFlightNumber || null,
        flightTime: editFlightTime || null,
        notes: editNotes || null,
        hotelCity: getHotelCity(editBlockType),
      });
      await refetchBlocks();
      setEditDialog(null);
      toast.success('色塊已保存');
    } catch {
      toast.error('保存失敗');
    }
  }

  async function handleShiftBatch(groupId: number, days: number) {
    try {
      await shiftBatch.mutateAsync({ groupId, days });
      await refetchBlocks();
      toast.success(`行程已${days > 0 ? '延後' : '提前'} ${Math.abs(days)} 天`);
    } catch {
      toast.error('移動失敗');
    }
  }

  // 拖拽處理
  const handleDragStart = useCallback((e: React.MouseEvent, groupId: number) => {
    e.preventDefault();
    const groupBlocks = blocks.filter(b => b.groupId === groupId);
    dragState.current = {
      groupId,
      startX: e.clientX,
      originalBlocks: groupBlocks,
      isDragging: false,
      dragOffset: 0,
    };
    setDraggingGroupId(groupId);
    setDragPreviewOffset(0);

    const onMouseMove = (me: MouseEvent) => {
      if (!dragState.current) return;
      const dx = me.clientX - dragState.current.startX;
      const dayOffset = Math.round(dx / CELL_WIDTH);
      if (Math.abs(dx) > 5) dragState.current.isDragging = true;
      dragState.current.dragOffset = dayOffset;
      setDragPreviewOffset(dayOffset);
    };

    const onMouseUp = async () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (dragState.current?.isDragging && dragState.current.dragOffset !== 0) {
        const { groupId: gid, dragOffset } = dragState.current;
        try {
          await shiftBatch.mutateAsync({ groupId: gid, days: dragOffset });
          await refetchBlocks();
          toast.success(`行程已${dragOffset > 0 ? '延後' : '提前'} ${Math.abs(dragOffset)} 天`);
        } catch {
          toast.error('移動失敗');
        }
      }
      dragState.current = null;
      setDraggingGroupId(null);
      setDragPreviewOffset(0);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [blocks, shiftBatch, refetchBlocks]);

  async function handleGenerateTemplate() {
    if (!templateDialog || !templateStartDate) return;
    const newBlocks: any[] = [];
    const start = new Date(templateStartDate + 'T00:00:00');
    let dayOffset = 0;

    if (templateStartCity === 'sz') {
      for (let i = 0; i < templateSzDays; i++) {
        const d = new Date(start); d.setDate(d.getDate() + dayOffset);
        newBlocks.push({ date: d.toISOString().split('T')[0], blockType: i === 0 ? 'sz_arrive' : 'sz_stay', hotelCity: 'sz' });
        dayOffset++;
      }
      { const d = new Date(start); d.setDate(d.getDate() + dayOffset); newBlocks.push({ date: d.toISOString().split('T')[0], blockType: 'border_sz_hk', hotelCity: 'hk' }); dayOffset++; }
      for (let i = 0; i < templateHkDays; i++) {
        const d = new Date(start); d.setDate(d.getDate() + dayOffset);
        const isEx = i === templateExchangeOffset;
        newBlocks.push({ date: d.toISOString().split('T')[0], blockType: isEx ? 'exchange' : (i === 0 ? 'hk_arrive' : 'hk_stay'), isExchangeDay: isEx, hotelCity: 'hk' });
        dayOffset++;
      }
      { const d = new Date(start); d.setDate(d.getDate() + dayOffset); newBlocks.push({ date: d.toISOString().split('T')[0], blockType: 'departure', hotelCity: null }); }
    } else {
      for (let i = 0; i < templateHkDays; i++) {
        const d = new Date(start); d.setDate(d.getDate() + dayOffset);
        const isEx = i === templateExchangeOffset;
        newBlocks.push({ date: d.toISOString().split('T')[0], blockType: isEx ? 'exchange' : (i === 0 ? 'hk_arrive' : 'hk_stay'), isExchangeDay: isEx, hotelCity: 'hk' });
        dayOffset++;
      }
      { const d = new Date(start); d.setDate(d.getDate() + dayOffset); newBlocks.push({ date: d.toISOString().split('T')[0], blockType: 'border_hk_sz', hotelCity: 'sz' }); dayOffset++; }
      for (let i = 0; i < templateSzDays; i++) {
        const d = new Date(start); d.setDate(d.getDate() + dayOffset);
        newBlocks.push({ date: d.toISOString().split('T')[0], blockType: i === 0 ? 'sz_arrive' : 'sz_stay', hotelCity: 'sz' });
        dayOffset++;
      }
      { const d = new Date(start); d.setDate(d.getDate() + dayOffset); newBlocks.push({ date: d.toISOString().split('T')[0], blockType: 'departure', hotelCity: null }); }
    }

    try {
      await batchUpsert.mutateAsync({ groupId: templateDialog.groupId, blocks: newBlocks });
      // 同時更新 group 的 startCity
      await updateGroup.mutateAsync({ id: templateDialog.groupId, startCity: templateStartCity });
      await refetchBlocks();
      await refetchGroups();
      setTemplateDialog(null);
      toast.success(`已生成 ${newBlocks.length} 個色塊`);
    } catch {
      toast.error('生成失敗');
    }
  }

  const isHomepageMode = !urlProjectId;

  // 渲染單個 group 行
  const renderGroupRow = (group: any, isDragging: boolean, previewOffset: number) => {
    const types: string[] = Array.isArray(group.type) ? group.type : [];
    const isSecondary = types.some(t => t.includes('中學') || t.includes('中学'));
    const rowBg = isSecondary ? '#FFF4EC' : '#FFFFFF';
    const schoolList: Array<{ name: string; studentCount: number; teacherCount?: number }> = group.school_list || [];
    const flightInfo = group.flight_info || {};
    const startCityLabel = group.startCity === 'sz' ? '深圳' : group.startCity === 'hk' ? '香港' : group.startCity === 'macau' ? '澳門' : '-';

    return (
      <tr
        key={group.id}
        style={{
          backgroundColor: rowBg,
          opacity: isDragging ? 0.7 : 1,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* 航班列 */}
        <td className="border border-gray-200 px-1 py-0.5 text-center align-middle" style={{ width: LEFT_COL_WIDTHS.flight, minWidth: LEFT_COL_WIDTHS.flight, backgroundColor: rowBg }}>
          <div className="text-[9px] text-gray-600 leading-tight">
            {flightInfo.arrivalFlight && <div title={`抵達 ${flightInfo.arrivalTime || ''}`}>↓{flightInfo.arrivalFlight}</div>}
            {flightInfo.departureFlight && <div title={`離開 ${flightInfo.departureTime || ''}`}>↑{flightInfo.departureFlight}</div>}
            {!flightInfo.arrivalFlight && !flightInfo.departureFlight && <span className="text-gray-300">-</span>}
          </div>
        </td>
        {/* 類型列 */}
        <td className="border border-gray-200 px-1 py-0.5 text-center align-middle" style={{ width: LEFT_COL_WIDTHS.type, minWidth: LEFT_COL_WIDTHS.type, backgroundColor: rowBg }}>
          <div className="text-[9px] leading-tight">
            {types.length > 0 ? types.map((t, i) => (
              <div key={i} className={isSecondary ? 'text-orange-700' : 'text-blue-700'}>{t}</div>
            )) : <span className="text-gray-300">-</span>}
          </div>
        </td>
        {/* 人數列 */}
        <td className="border border-gray-200 px-1 py-0.5 text-center align-middle" style={{ width: LEFT_COL_WIDTHS.studentCount, minWidth: LEFT_COL_WIDTHS.studentCount, backgroundColor: rowBg }}>
          <div className="text-[9px] text-gray-700 leading-tight">
            <div>{group.studentCount || 0}+{group.teacherCount || 0}</div>
          </div>
        </td>
        {/* 合計列 */}
        <td className="border border-gray-200 px-1 py-0.5 text-center align-middle" style={{ width: LEFT_COL_WIDTHS.total, minWidth: LEFT_COL_WIDTHS.total, backgroundColor: rowBg }}>
          <div className="text-[10px] font-semibold text-gray-800">{group.totalCount || (group.studentCount || 0) + (group.teacherCount || 0)}</div>
        </td>
        {/* 起始城市列 */}
        <td className="border border-gray-200 px-1 py-0.5 text-center align-middle" style={{ width: LEFT_COL_WIDTHS.startCity, minWidth: LEFT_COL_WIDTHS.startCity, backgroundColor: rowBg }}>
          <div className="text-[9px] text-gray-600">{startCityLabel}</div>
        </td>
        {/* 批次列 */}
        <td className="border border-gray-200 px-1 py-0.5 text-center align-middle" style={{ width: LEFT_COL_WIDTHS.batchCode, minWidth: LEFT_COL_WIDTHS.batchCode, backgroundColor: rowBg }}>
          <div className="text-[9px] text-gray-600">{group.batch_code || '-'}</div>
        </td>
        {/* 學校分組列 */}
        <td className="border border-gray-200 px-1 py-0.5 align-top" style={{ width: LEFT_COL_WIDTHS.schoolList, minWidth: LEFT_COL_WIDTHS.schoolList, backgroundColor: rowBg }}>
          <div className="text-[9px] text-gray-700 leading-tight">
            {schoolList.length > 0 ? schoolList.map((s, i) => (
              <div key={i} className="truncate" title={s.name}>
                {s.name}（{s.studentCount}{s.teacherCount ? `+${s.teacherCount}` : ''}人）
              </div>
            )) : (
              <div className="text-gray-400 italic">{group.name}</div>
            )}
          </div>
        </td>

        {/* 日期色塊列 */}
        {dateRange.map((date, di) => {
          // 拖拽預覽：偏移顯示
          const lookupDate = isDragging && previewOffset !== 0
            ? (() => {
                const d = new Date(date + 'T00:00:00');
                d.setDate(d.getDate() - previewOffset);
                return d.toISOString().split('T')[0];
              })()
            : date;
          const block = blockMap.get(`${group.id}_${lookupDate}`);
          const bt: BlockType = block?.blockType || 'free';
          const cfg = BLOCK_CONFIG[bt];
          const isEx = block?.isExchangeDay || bt === 'exchange';
          const today = isToday(date);
          const weekend = isWeekend(date);

          return (
            <td
              key={date}
              onClick={() => !isDragging && handleCellClick(group.id, date)}
              className="border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity select-none"
              style={{
                backgroundColor: bt === 'free' ? (today ? '#EFF6FF' : weekend ? '#FFFBF5' : 'transparent') : cfg.bg,
                borderColor: bt === 'free' ? '#e5e7eb' : cfg.border,
                width: `${CELL_WIDTH}px`,
                minWidth: `${CELL_WIDTH}px`,
                padding: '2px 1px',
                verticalAlign: 'middle',
                outline: today ? '2px solid #3b82f6' : undefined,
                outlineOffset: '-1px',
              }}
              title={`${group.name} | ${date} | ${cfg.label}${block?.flightNumber ? ` | ${block.flightNumber}` : ''}`}
            >
              <div className="text-center leading-tight">
                <div className="text-[9px] font-semibold" style={{ color: cfg.text }}>
                  {isEx ? '★' : cfg.shortLabel}
                </div>
                {block?.flightNumber && (
                  <div className="text-[8px]" style={{ color: cfg.text, opacity: 0.85 }}>{block.flightNumber}</div>
                )}
              </div>
            </td>
          );
        })}

        {/* 拖拽手柄 */}
        <td className="border border-gray-200 px-1 align-middle" style={{ backgroundColor: rowBg, width: 28, minWidth: 28 }}>
          <div className="flex flex-col gap-0.5 items-center">
            <button
              onMouseDown={(e) => handleDragStart(e, group.id)}
              className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500"
              title="拖拽移動整個行程"
            >
              <GripHorizontal className="w-3 h-3" />
            </button>
            <div className="flex gap-0.5">
              <button onClick={() => handleShiftBatch(group.id, -1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-600" title="提前1天">
                <ChevronLeft className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => handleShiftBatch(group.id, 1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-600" title="延後1天">
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* 頂部標題欄 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {isHomepageMode ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors">
                  <h1 className="text-sm font-bold text-gray-800">{project?.name || '請選擇項目'}</h1>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {allProjects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">暫無項目，請先創建項目</div>
                ) : (
                  allProjects.map((p: any) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        localStorage.setItem('schedule_last_project_id', String(p.id));
                      }}
                      className={`cursor-pointer ${selectedProjectId === p.id ? 'bg-blue-50 text-blue-700' : ''}`}
                    >
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-gray-400">
                          {p.startDate ? new Date(p.startDate).toLocaleDateString('zh-CN') : ''} ~ {p.endDate ? new Date(p.endDate).toLocaleDateString('zh-CN') : ''}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <h1 className="text-sm font-bold text-gray-800">{project?.name || '排程總覽'}</h1>
          )}
          {project && (
            <span className="text-xs text-gray-400">
              {toDateStr(project.startDate)} ~ {toDateStr(project.endDate)} · {groups.length} 個團組
            </span>
          )}
        </div>
        {/* 圖例 */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { bg: '#DAEEF3', label: '抵深' },
            { bg: '#BDD7EE', label: '深圳' },
            { bg: '#5b9bd5', label: '香港' },
            { bg: '#1F4E79', label: '交流★' },
            { bg: '#FFE699', label: '過關' },
            { bg: '#E2EFDA', label: '離境' },
          ].map(({ bg, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block border border-gray-300" style={{ backgroundColor: bg }} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 無項目時的提示 */}
      {isHomepageMode && !pid && (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <div className="text-5xl mb-4">📅</div>
          <div className="text-base font-medium text-gray-600 mb-1">選擇項目以查看排程總覽</div>
          <div className="text-sm text-gray-400 mb-4">點擊上方「請選擇項目」選擇一個項目</div>
          {allProjects.length === 0 && (
            <Button size="sm" onClick={() => window.location.href = '/projects'}>前往創建項目</Button>
          )}
        </div>
      )}

      {/* 主排程表 */}
      {pid && (
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', minWidth: TOTAL_LEFT_WIDTH + dateRange.length * CELL_WIDTH + 28 }}>
            {/* 表頭 */}
            <thead className="sticky top-0 z-20">
              {/* 第一行：月份 + 日期 */}
              <tr>
                {/* 左側固定列標題 */}
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-center text-[9px] font-medium py-1" style={{ width: LEFT_COL_WIDTHS.flight }}>航班</th>
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-center text-[9px] font-medium py-1" style={{ width: LEFT_COL_WIDTHS.type }}>類型</th>
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-center text-[9px] font-medium py-1" style={{ width: LEFT_COL_WIDTHS.studentCount }}>人數</th>
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-center text-[9px] font-medium py-1" style={{ width: LEFT_COL_WIDTHS.total }}>合計</th>
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-center text-[9px] font-medium py-1" style={{ width: LEFT_COL_WIDTHS.startCity }}>起始城市</th>
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-center text-[9px] font-medium py-1" style={{ width: LEFT_COL_WIDTHS.batchCode }}>批次</th>
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-left text-[9px] font-medium px-1 py-1" style={{ width: LEFT_COL_WIDTHS.schoolList }}>學校分組</th>
                {/* 日期列 */}
                {dateRange.map((date, i) => {
                  const { month, day, monthNum } = formatDateHeader(date);
                  const showMonth = i === 0 || formatDateHeader(dateRange[i - 1]).monthNum !== monthNum;
                  const today = isToday(date);
                  const weekend = isWeekend(date);
                  return (
                    <th
                      key={date}
                      className="border border-gray-300 text-center font-medium"
                      style={{
                        width: CELL_WIDTH,
                        minWidth: CELL_WIDTH,
                        backgroundColor: today ? '#1d4ed8' : weekend ? '#374151' : '#1F4E79',
                        color: today ? '#fff' : weekend ? '#fbbf24' : '#fff',
                        padding: '1px 0',
                      }}
                    >
                      {showMonth && <div className="text-[8px] opacity-70">{month}</div>}
                      <div className="text-[11px] font-bold">{day}</div>
                    </th>
                  );
                })}
                <th className="border border-gray-300 bg-[#1F4E79] text-white text-center text-[9px] py-1" style={{ width: 28 }}>操作</th>
              </tr>
              {/* 第二行：星期 */}
              <tr>
                <th colSpan={7} className="border border-gray-200 bg-gray-100 text-center text-[9px] text-gray-500 py-0.5">
                  {project?.name || ''}
                </th>
                {dateRange.map(date => {
                  const { weekday } = formatDateHeader(date);
                  const weekend = isWeekend(date);
                  const today = isToday(date);
                  return (
                    <th
                      key={date}
                      className="border border-gray-200 text-center"
                      style={{
                        width: CELL_WIDTH,
                        minWidth: CELL_WIDTH,
                        backgroundColor: today ? '#DBEAFE' : weekend ? '#FEF3C7' : '#F9FAFB',
                        color: weekend ? '#DC2626' : '#6B7280',
                        padding: '1px 0',
                        fontSize: '10px',
                      }}
                    >
                      {weekday}
                    </th>
                  );
                })}
                <th className="border border-gray-200 bg-gray-100" style={{ width: 28 }}></th>
              </tr>
            </thead>

            <tbody>
              {groupedByBatch.length === 0 && (
                <tr>
                  <td colSpan={dateRange.length + 8} className="text-center py-16 text-gray-400">
                    <div className="text-3xl mb-2">📅</div>
                    <div>尚未添加團組，請先在「批次管理」中添加</div>
                  </td>
                </tr>
              )}

              {groupedByBatch.map(({ batchCode, groups: batchGroups }) => {
                const isSecondaryBatch = batchGroups.some(g => {
                  const types: string[] = Array.isArray(g.type) ? g.type : [];
                  return types.some(t => t.includes('中學') || t.includes('中学'));
                });
                const batchBg = isSecondaryBatch ? '#FFF0E6' : '#EBF5FB';
                const batchTextColor = isSecondaryBatch ? '#9a3412' : '#1e40af';

                return (
                  <React.Fragment key={batchCode || batchGroups[0].id}>
                    {/* 批次標題行 */}
                    {batchCode && (
                      <tr>
                        <td
                          colSpan={dateRange.length + 8}
                          className="border border-gray-200 px-3 py-0.5 font-semibold"
                          style={{ backgroundColor: batchBg, color: batchTextColor, fontSize: '10px' }}
                        >
                          {batchCode}（{batchGroups.length} 個團組 · 共 {batchGroups.reduce((s, g) => s + (g.totalCount || (g.studentCount || 0) + (g.teacherCount || 0)), 0)} 人）
                        </td>
                      </tr>
                    )}
                    {/* 各 group 行 */}
                    {batchGroups.map(g =>
                      renderGroupRow(
                        g,
                        draggingGroupId === g.id,
                        draggingGroupId === g.id ? dragPreviewOffset : 0
                      )
                    )}
                  </React.Fragment>
                );
              })}

              {/* 每日航班統計 */}
              {groups.length > 0 && (
                <>
                  <tr>
                    <td colSpan={dateRange.length + 8} className="border border-gray-300 bg-[#1F4E79] text-white text-[9px] font-semibold px-2 py-0.5">
                      ▼ 每日航班需求統計
                    </td>
                  </tr>
                  {/* 抵達班數 */}
                  <tr className="bg-[#E8F4FD]">
                    <td colSpan={7} className="border border-gray-200 px-2 py-0.5 text-[9px] font-semibold text-blue-800 bg-[#BDD7EE]">抵達班數</td>
                    {dailyStats.map(({ date, arrivalGroupCount }) => (
                      <td key={date} className="border border-gray-200 text-center py-0.5" style={{ backgroundColor: arrivalGroupCount > 0 ? '#70AD47' : '#E8F4FD' }}>
                        {arrivalGroupCount > 0 && <span className="text-[10px] font-bold text-white">{arrivalGroupCount}</span>}
                        {arrivalGroupCount === 0 && <span className="text-[9px] text-gray-300">-</span>}
                      </td>
                    ))}
                    <td className="border border-gray-200 bg-[#E8F4FD]"></td>
                  </tr>
                  {/* 抵達航班列表 */}
                  <tr className="bg-[#F0F8FF]">
                    <td colSpan={7} className="border border-gray-200 px-2 py-0.5 text-[9px] text-blue-700 bg-[#DAEEF3]">抵達航班</td>
                    {dailyStats.map(({ date, arrivalFlights }) => (
                      <td key={date} className="border border-gray-200 text-center py-0.5 bg-[#F0F8FF]">
                        {arrivalFlights.map((f, i) => (
                          <div key={i} className="text-[8px] text-blue-800 leading-tight">{f}</div>
                        ))}
                      </td>
                    ))}
                    <td className="border border-gray-200 bg-[#F0F8FF]"></td>
                  </tr>
                  {/* 離開班數 */}
                  <tr className="bg-[#FFF9E6]">
                    <td colSpan={7} className="border border-gray-200 px-2 py-0.5 text-[9px] font-semibold text-amber-800 bg-[#FFE699]">離開班數</td>
                    {dailyStats.map(({ date, departureGroupCount }) => (
                      <td key={date} className="border border-gray-200 text-center py-0.5" style={{ backgroundColor: departureGroupCount > 0 ? '#FF7F00' : '#FFF9E6' }}>
                        {departureGroupCount > 0 && <span className="text-[10px] font-bold text-white">{departureGroupCount}</span>}
                        {departureGroupCount === 0 && <span className="text-[9px] text-gray-300">-</span>}
                      </td>
                    ))}
                    <td className="border border-gray-200 bg-[#FFF9E6]"></td>
                  </tr>
                  {/* 離開航班列表 */}
                  <tr className="bg-[#FFFBF0]">
                    <td colSpan={7} className="border border-gray-200 px-2 py-0.5 text-[9px] text-amber-700 bg-[#FFE699] opacity-80">離開航班</td>
                    {dailyStats.map(({ date, departureFlights }) => (
                      <td key={date} className="border border-gray-200 text-center py-0.5 bg-[#FFFBF0]">
                        {departureFlights.map((f, i) => (
                          <div key={i} className="text-[8px] text-amber-800 leading-tight">{f}</div>
                        ))}
                      </td>
                    ))}
                    <td className="border border-gray-200 bg-[#FFFBF0]"></td>
                  </tr>

                  {/* 每日住宿統計 */}
                  <tr>
                    <td colSpan={dateRange.length + 8} className="border border-gray-300 bg-[#1F4E79] text-white text-[9px] font-semibold px-2 py-0.5">
                      ▼ 每日住宿需求（深港）統計（學生人數）
                    </td>
                  </tr>
                  <tr className="bg-[#EBF5FB]">
                    <td colSpan={7} className="border border-gray-200 px-2 py-0.5 text-[9px] font-semibold text-blue-900 bg-[#9DC3E6]">香港住宿人數</td>
                    {dailyStats.map(({ date, hkCount }) => (
                      <td key={date} className="border border-gray-200 text-center py-0.5" style={{ backgroundColor: hkCount > 0 ? '#5b9bd5' : '#EBF5FB' }}>
                        {hkCount > 0 && <span className="text-[10px] font-bold text-white">{hkCount}</span>}
                        {hkCount === 0 && <span className="text-[9px] text-gray-300">-</span>}
                      </td>
                    ))}
                    <td className="border border-gray-200 bg-[#EBF5FB]"></td>
                  </tr>
                  <tr className="bg-[#EBF5FB]">
                    <td colSpan={7} className="border border-gray-200 px-2 py-0.5 text-[9px] font-semibold text-blue-800 bg-[#BDD7EE]">深圳住宿人數</td>
                    {dailyStats.map(({ date, szCount }) => (
                      <td key={date} className="border border-gray-200 text-center py-0.5" style={{ backgroundColor: szCount > 0 ? '#DAEEF3' : '#EBF5FB' }}>
                        {szCount > 0 && <span className="text-[10px] font-bold text-blue-900">{szCount}</span>}
                        {szCount === 0 && <span className="text-[9px] text-gray-300">-</span>}
                      </td>
                    ))}
                    <td className="border border-gray-200 bg-[#EBF5FB]"></td>
                  </tr>
                  <tr className="bg-[#F5F5F5]">
                    <td colSpan={7} className="border border-gray-200 px-2 py-0.5 text-[9px] font-semibold text-gray-700 bg-gray-200">合計人數</td>
                    {dailyStats.map(({ date, szCount, hkCount }) => {
                      const total = szCount + hkCount;
                      return (
                        <td key={date} className="border border-gray-200 text-center py-0.5" style={{ backgroundColor: total > 0 ? '#F0F0F0' : '#F5F5F5' }}>
                          {total > 0 && <span className="text-[10px] font-bold text-gray-800">{total}</span>}
                          {total === 0 && <span className="text-[9px] text-gray-300">-</span>}
                        </td>
                      );
                    })}
                    <td className="border border-gray-200 bg-[#F5F5F5]"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* 底部學校分組明細表 */}
          {groups.length > 0 && (
            <div className="mt-4 px-2 pb-4">
              <div className="bg-[#1F4E79] text-white text-xs font-semibold px-3 py-1.5 rounded-t">
                學校分組明細
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#2E75B6] text-white">
                    <th className="border border-gray-300 px-2 py-1 text-left text-[10px]">航班</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-[10px]">批次</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-[10px]">類型</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-[10px]">對應車輛</th>
                    <th className="border border-gray-300 px-2 py-1 text-center text-[10px]">學生人數</th>
                    <th className="border border-gray-300 px-2 py-1 text-center text-[10px]">教師人數</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-[10px]">學校（學生人數）</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => {
                    const types: string[] = Array.isArray(g.type) ? g.type : [];
                    const isSecondary = types.some(t => t.includes('中學') || t.includes('中学'));
                    const rowBg = isSecondary ? '#FFF4EC' : '#FFFFFF';
                    const schoolList: Array<{ name: string; studentCount: number; teacherCount?: number }> = g.school_list || [];
                    const flightInfo = g.flight_info || {};
                    return (
                      <tr key={g.id} style={{ backgroundColor: rowBg }}>
                        <td className="border border-gray-200 px-2 py-1 text-[9px] text-gray-700">
                          {flightInfo.arrivalFlight || '-'}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-[9px] text-gray-700">
                          {g.batch_code || '-'}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-[9px]">
                          {types.map((t, i) => (
                            <span key={i} className={`mr-1 ${isSecondary ? 'text-orange-700' : 'text-blue-700'}`}>{t}</span>
                          ))}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-[9px] text-gray-500">
                          {g.code || '-'}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center text-[10px] font-semibold text-gray-800">
                          {g.studentCount || 0}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center text-[10px] text-gray-700">
                          {g.teacherCount || 0}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-[9px] text-gray-700">
                          {schoolList.length > 0
                            ? schoolList.map((s, i) => (
                                <span key={i} className="mr-1">
                                  {s.name}（{s.studentCount}人）{i < schoolList.length - 1 ? '·' : ''}
                                </span>
                              ))
                            : <span className="text-gray-400">{g.name}</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 色塊編輯側邊面板 */}
      {editDialog && (
        <div
          className="fixed right-0 top-0 h-full z-50 flex"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="w-64 bg-white border-l border-gray-200 shadow-xl flex flex-col"
            style={{ pointerEvents: 'auto', marginTop: '0px' }}
          >
            {/* 面板標題 */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-[#1F4E79]">
              <div>
                <div className="text-xs font-semibold text-white">編輯色塊</div>
                <div className="text-[10px] text-blue-200">{editDialog.date}</div>
              </div>
              <button onClick={() => setEditDialog(null)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* 面板內容 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* 色塊類型快速選擇 */}
              <div>
                <Label className="text-xs text-gray-600 mb-1.5 block">日程類型</Label>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.entries(BLOCK_CONFIG) as [BlockType, any][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setEditBlockType(key as BlockType)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded border text-left transition-all"
                      style={{
                        backgroundColor: editBlockType === key ? cfg.bg : '#f9fafb',
                        borderColor: editBlockType === key ? cfg.border : '#e5e7eb',
                        color: editBlockType === key ? cfg.text : '#374151',
                        fontWeight: editBlockType === key ? 600 : 400,
                        boxShadow: editBlockType === key ? `0 0 0 2px ${cfg.border}` : 'none',
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }} />
                      <span className="text-[10px] leading-tight">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {['sz_arrive', 'hk_arrive', 'departure'].includes(editBlockType) && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-600">航班號</Label>
                    <Input className="h-7 text-xs mt-1" placeholder="如 CZ3456" value={editFlightNumber} onChange={e => setEditFlightNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">航班時間</Label>
                    <Input className="h-7 text-xs mt-1" placeholder="如 14:30" value={editFlightTime} onChange={e => setEditFlightTime(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-600">備注</Label>
                <Input className="h-7 text-xs mt-1" placeholder="可選備注" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
            </div>
            {/* 面板底部按鈕 */}
            <div className="p-3 border-t flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setEditDialog(null)}>取消</Button>
              <Button size="sm" className="flex-1 h-8 text-xs bg-[#1F4E79] hover:bg-[#1a3f63]" onClick={handleSaveBlock} disabled={upsertBlock.isPending}>
                {upsertBlock.isPending ? '保存中...' : '✓ 保存'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 模板生成對話框 */}
      <Dialog open={!!templateDialog} onOpenChange={() => setTemplateDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">快速生成行程模板 — {templateDialog?.groupName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">起始城市</Label>
              <Select value={templateStartCity} onValueChange={v => setTemplateStartCity(v as 'sz' | 'hk')}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sz" className="text-xs">深圳先（深圳 → 香港）</SelectItem>
                  <SelectItem value="hk" className="text-xs">香港先（香港 → 深圳）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">開始日期（第一天抵達）</Label>
              <Input type="date" className="h-7 text-xs mt-1" value={templateStartDate} onChange={e => setTemplateStartDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">深圳天數</Label>
                <Input type="number" min={1} className="h-7 text-xs mt-1" value={templateSzDays} onChange={e => setTemplateSzDays(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">香港天數</Label>
                <Input type="number" min={1} className="h-7 text-xs mt-1" value={templateHkDays} onChange={e => setTemplateHkDays(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">交流日（香港第幾天，從 1 開始）</Label>
              <Input type="number" min={1} max={templateHkDays} className="h-7 text-xs mt-1" value={templateExchangeOffset + 1} onChange={e => setTemplateExchangeOffset(Number(e.target.value) - 1)} />
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              {templateStartCity === 'sz'
                ? `預覽：抵深 → 深圳×${templateSzDays - 1}天 → 過關↑ → 抵港 → 香港×${templateHkDays - 1}天（第${templateExchangeOffset + 1}天★交流）→ 離境`
                : `預覽：抵港 → 香港×${templateHkDays - 1}天（第${templateExchangeOffset + 1}天★交流）→ 過關↓ → 抵深 → 深圳×${templateSzDays - 1}天 → 離境`
              }
              <div className="mt-1 text-gray-400">總計 {templateSzDays + templateHkDays + 2} 天（含過關日和離境日）</div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTemplateDialog(null)}>取消</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleGenerateTemplate} disabled={batchUpsert.isPending || !templateStartDate}>
                {batchUpsert.isPending ? '生成中...' : '生成模板'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
