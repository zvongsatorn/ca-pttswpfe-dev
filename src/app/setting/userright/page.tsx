'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, { 
    Background, 
    Controls, 
    useNodesState, 
    useEdgesState,
    ConnectionLineType,
    MarkerType,
    ReactFlowProvider,
    Node,
    Edge,
    Handle,
    Position,
    useReactFlow,
    OnNodesChange,
    OnEdgesChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
    Card, 
    Button, 
    Typography, 
    Select, 
    App, 
    Modal, 
    Form, 
    Divider,
    Empty,
    Tag,
    Avatar,
    Tooltip
} from 'antd';
import { 
    SearchOutlined, 
    ApartmentOutlined,
    InfoCircleOutlined,
    TeamOutlined,
    UserOutlined,
    EyeOutlined,
    DeleteOutlined,
    PlusOutlined,
    FileExcelOutlined
} from '@ant-design/icons';
const { Title, Text } = Typography;
import ExcelJS from 'exceljs';
import Main from '@/components/layout/main';
import { getUserFromToken } from '@/utils/auth';
import { saveExcelFile } from '@/utils/fileDownload';
import { 
    fetchOrgUnitsInGroup,
    fetchUserGroups,
    fetchAllUnits,
    fetchAllEmployees,
    fetchBGCombo,
    fetchLineCombo
} from '@/services/userRightService';

const API_BASE_URL = '';

// --- Types & Interfaces ---

interface UserGroup {
    userGroupNo: string;
    userGroupName: string;
}

interface RawOrgUnit {
    OrgUnitNo?: string;
    orgUnitNo?: string;
    id?: string;
    UnitName?: string;
    unitName?: string;
    OrgUnitName?: string;
    orgUnitName?: string;
    UnitText?: string;
    unitText?: string;
    unitAbbr?: string;
    UnitAbbr?: string;
    shortName?: string;
    ParentOrgUnitNo?: string;
    parentOrgUnitNo?: string;
    BGNo?: string | number | null;
    FunctionNo?: string;
    SectionNo?: string;
    DeptNo?: string;
    functionNo?: string;
    sectionNo?: string;
    deptNo?: string;
    FunctionName?: string;
    SectionName?: string;
    DeptName?: string;
}

interface RawEmployee {
    employeeID?: string;
    EmployeeID?: string;
    nameAll?: string;
    NameAll?: string;
    userId?: string;
    userName?: string;
    userCode?: string;
}

interface GroupTheme {
    color: string;
    light: string;
    gradient: string;
    border: string;
    text: string;
}

interface InternalTreeNode {
    code: string;
    name: string;
    shortName: string;
    level: number;
    parentCode: string | null;
    children: InternalTreeNode[];
    BGNo: string | null;
    FunctionNo: string | null;
    raw?: RawOrgUnit;
    __isVisible?: boolean;
    __forceVisible?: boolean;
    __subtreeWidth?: number;
}

interface OrgTreeNodeData {
    id: string;
    label: string;
    shortName: string;
    userCount: number;
    isHighlighted: boolean;
    highlightType?: 'user' | 'search';
    theme: GroupTheme;
    onViewUsers: (id: string, name: string) => void;
    onAddUser: (id: string, name: string) => void;
}


interface OrgDataInGroup {
    OrgUnitID: string;
    users: RawEmployee[];
}

interface SummaryUser extends RawEmployee {
    unitCount: number;
    firstUnitId: string;
    unitIds: string[];
}

interface BGCombo {
    BGNo: string;
    BGName: string;
}

function dedupeEmployeesById(users: RawEmployee[]): RawEmployee[] {
    const seen = new Set<string>();
    const deduped: RawEmployee[] = [];

    for (const user of users || []) {
        const employeeId = String(user.employeeID || user.EmployeeID || '').trim();
        if (!employeeId) continue;
        const key = employeeId.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(user);
    }

    return deduped;
}

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || '';
}

function getAuthHeader(): Record<string, string> {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function addUserToUnit(data: { UserGroupNo: string, EmployeeID: string, OrgUnitNo: string, CreateBy: string }) {
    // Legacy behavior: add selected unit together with its descendant units.
    const res = await fetch(`${API_BASE_URL}/api/user-rights/add-belong-units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to add user rights'); }
    return res.json();
}

async function removeUserFromUnit(data: { UserGroupNo: string, EmployeeID: string, OrgUnitNo: string, UpdateBy: string }) {
    const res = await fetch(`${API_BASE_URL}/api/user-rights/remove-user-from-unit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to remove user from unit'); }
    return res.json();
}

// Helper to build tree on client
function buildTree(flatUnits: RawOrgUnit[]): InternalTreeNode | null {
  if (!flatUnits || !Array.isArray(flatUnits)) return null;
  const map = new Map<string, InternalTreeNode>();
  flatUnits.forEach(u => {
    const id = String(u.OrgUnitNo || u.orgUnitNo || u.id || '').trim();
    const pCode = (u.ParentOrgUnitNo || u.parentOrgUnitNo) ? String(u.ParentOrgUnitNo || u.parentOrgUnitNo).trim() : null;
    
    // Extracting Function (สายงาน) from common fields
    const functionNo = u.FunctionNo || u.SectionNo || u.DeptNo || u.functionNo || u.sectionNo || u.deptNo || null;

    map.set(id, {
      code: id,
      name: String(u.UnitName || u.unitName || u.OrgUnitName || u.orgUnitName || u.UnitText || u.unitText || u.id || '').trim(),
      shortName: String(u.unitAbbr || u.UnitAbbr || u.shortName || ''),
      level: 0, 
      parentCode: pCode,
      children: [],
      BGNo: u.BGNo ? String(u.BGNo).trim() : null,
      FunctionNo: functionNo ? String(functionNo).trim() : null,
      raw: u
    });
  });

  let root: InternalTreeNode | null = null;
  map.forEach(node => {
    if (node.parentCode && map.has(node.parentCode)) {
      map.get(node.parentCode)!.children.push(node);
    } else if (!root || node.code.length < root.code.length) {
      root = node;
    }
  });
  return root;
}

// --- Custom Node Component ---

const OrgTreeNode = ({ data }: { data: OrgTreeNodeData }) => {
    const isHighlighted = data.isHighlighted;
    const theme = data.theme || { 
        color: '#3b82f6', 
        light: '#eff6ff', 
        gradient: 'from-blue-600 to-blue-400',
        border: 'border-blue-100',
        text: 'text-blue-600'
    };

    return (
        <div className={`
            relative p-4 rounded-[2rem] bg-white transition-all duration-500
            ${isHighlighted ? 'ring-4 ring-orange-400 shadow-[0_0_40px_rgba(251,146,60,0.3)] scale-110 z-50' : `shadow-2xl border-[5px] ${theme.border} hover:shadow-blue-200/50`}
            w-[320px] group
        `}>
            {/* Pulsing Label for Highlighted Node */}
            {isHighlighted && data.highlightType === 'user' && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-lg animate-bounce">
                    ผู้ดูแลที่เลือกพบที่นี่!
                </div>
            )}

            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 bg-blue-400 border-2 border-white -translate-y-1.5 rounded-full" 
            />
            
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1">
                    <Tag style={{ backgroundColor: theme.color }} className="m-0 text-white! border-none rounded-lg font-bold text-[12px] px-2 py-0.5">
                        {data.shortName || 'N/A'}
                    </Tag>
                    <Text className="text-[10px] text-slate-400 font-mono">#{data.id}</Text>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className={`
                        p-2.5 rounded-xl shadow-inner shrink-0
                        ${isHighlighted ? 'bg-orange-100 text-orange-600' : `bg-[${theme.light}] ${theme.text}`}
                    `} style={!isHighlighted ? { backgroundColor: theme.light, color: theme.color } : {}}>
                        <ApartmentOutlined className="text-xl" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <Text strong className="block leading-tight text-slate-800 text-[11px] whitespace-normal">
                            {data.label}
                        </Text>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-1 mt-1">
                    <div className="flex items-center gap-1">
                        <Tag color={theme.light === '#eff6ff' ? 'blue' : theme.light === '#fdf2f8' ? 'pink' : 'cyan'} variant="filled" className="m-0 text-[12px] px-2 rounded-lg font-bold border-none">
                            <TeamOutlined className="mr-1 text-[12px]" /> {data.userCount}
                        </Tag>
                    </div>
                    <div className="flex gap-1">
                        <Tooltip title="View Users">
                            <Button 
                                size="small" 
                                shape="circle" 
                                icon={<EyeOutlined className="text-[10px]" />} 
                                className="bg-slate-50 border-none text-slate-400 hover:text-blue-600"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    data.onViewUsers(data.id, data.label);
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Add User">
                            <Button 
                                size="small" 
                                shape="circle" 
                                icon={<PlusOutlined className="text-[10px]" />} 
                                className="bg-emerald-50 border-none text-emerald-600 hover:bg-emerald-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    data.onAddUser(data.id, data.label);
                                }}
                            />
                        </Tooltip>
                    </div>
                </div>
            </div>

            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="w-3 h-3 border-2 border-white translate-y-1.5 rounded-full" 
                style={{ backgroundColor: theme.color }}
            />
        </div>
    );
};

const nodeTypes = {
    orgTree: OrgTreeNode
};

// --- Flow Interior (Needed for useReactFlow) ---

interface FlowInnerProps {
    nodes: Node<OrgTreeNodeData>[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    isChartVisible: boolean;
    summaryUsers: SummaryUser[];
    isSummaryOpen: boolean;
    setIsSummaryOpen: (open: boolean) => void;
    groupTheme: GroupTheme;
    handleSearch: (id: string | string[] | null, zoom?: number, type?: 'user' | 'search') => void;
}

const FlowInner = ({ 
    nodes, edges, onNodesChange, onEdgesChange, 
    isChartVisible, summaryUsers, isSummaryOpen, setIsSummaryOpen,
    groupTheme, handleSearch
}: FlowInnerProps) => {
    const [searchValue, setSearchValue] = useState<string | undefined>(undefined);

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        if (node.data && typeof node.data.onViewUsers === 'function') {
            node.data.onViewUsers(node.id, node.data.label);
        }
    };

    if (!isChartVisible) return null;

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                minZoom={0.2}
                maxZoom={4}
                fitView
                fitViewOptions={{ padding: 0.2, duration: 800 }}
                className="bg-slate-50/20"
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                    type: ConnectionLineType.SmoothStep,
                    style: { stroke: '#94a3b8', strokeWidth: 2 }
                }}
            >
                <Background color="#f1f5f9" gap={20} />
                <Controls className="bg-white border-none shadow-lg rounded-xl overflow-hidden" />
            </ReactFlow>

            {/* Reverting to Floating Summary Tool on the Left side as requested */}
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                <Button 
                    type="primary" 
                    icon={<TeamOutlined />} 
                    size="large"
                    style={{ backgroundColor: groupTheme.color, border: 'none' }}
                    className="h-14 w-14 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
                    onClick={() => setIsSummaryOpen(true)}
                />

                {nodes.some(n => n.data?.isHighlighted) && (
                    <Tooltip title="ล้างการเลือก" placement="right">
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            size="large"
                            className="h-12 w-12 rounded-xl shadow-xl flex flex-col items-center justify-center hover:scale-110 transition-transform"
                            onClick={() => {
                                handleSearch(null);
                                setSearchValue(undefined);
                            }}
                        />
                    </Tooltip>
                )}
            </div>

            {/* Quick Search Tool on the Right */}
            <div className="absolute top-6 right-20 z-10 w-80">
                <Select
                    showSearch
                    allowClear
                    value={searchValue}
                    placeholder="ระบุรหัสหรือชื่อหน่วยงาน..."
                    optionFilterProp="label"
                    className="w-full custom-select-v2 shadow-2xl rounded-2xl"
                    size="large"
                    onSelect={(id: string) => {
                        if (id === searchValue) {
                            handleSearch(null);
                            setSearchValue(undefined);
                        } else {
                            handleSearch(id, 2.0, 'search');
                            setSearchValue(id);
                        }
                    }}
                    onClear={() => {
                        handleSearch(null);
                        setSearchValue(undefined);
                    }}
                    styles={{ popup: { root: { borderRadius: '1rem' } } }}
                    suffixIcon={<SearchOutlined className="text-blue-500" />}
                    options={nodes.map((n: Node<OrgTreeNodeData>) => ({
                        value: n.id,
                        label: `${n.id} - ${n.data.label}`
                    }))}
                />
            </div>

            {/* Summary Modal - Colorful Reversion */}
            <Modal
                title={
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md" style={{ backgroundColor: groupTheme.color }}>
                            <TeamOutlined />
                        </div>
                        <span className="text-slate-800 font-bold">ผู้รับผิดชอบทั้งหมดในกลุ่ม</span>
                    </div>
                }
                open={isSummaryOpen}
                onCancel={() => setIsSummaryOpen(false)}
                footer={null}
                width={500}
                className="custom-modal-v2"
                styles={{ mask: { backdropFilter: 'blur(4px)' } }}
            >
                <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                    {(summaryUsers || []).map((user: SummaryUser, idx: number) => (
                        <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 border-slate-100 group`} style={{ backgroundColor: groupTheme.light }}>
                            <div className="flex gap-4 items-center overflow-hidden">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0" style={{ backgroundColor: groupTheme.color }}>
                                    <span className="text-white font-bold text-lg">{(user.NameAll || user.nameAll)?.charAt(0)}</span>
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <Text strong style={{ color: groupTheme.color }} className="text-[13px] truncate">{user.NameAll || user.nameAll}</Text>
                                    <div className="text-[10px] text-slate-500 font-semibold truncate leading-tight">
                                        ID: {user.employeeID || user.EmployeeID} • ดูแล <span className="text-sky-600 font-bold">{user.unitCount}</span> หน่วยงาน
                                    </div>
                                </div>
                            </div>
                            <Button 
                                size="small" 
                                type="primary"
                                onClick={() => {
                                    handleSearch(user.unitIds, 0.5, 'user');
                                    setIsSummaryOpen(false);
                                }}
                                icon={<EyeOutlined />} 
                                className="shadow-sm font-bold text-[10px] h-9 rounded-xl flex items-center gap-1 group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: groupTheme.color, border: 'none' }}
                            >
                                ดูในผัง
                            </Button>
                        </div>
                    ))}
                    {(summaryUsers || []).length === 0 && <Empty description="ไม่พบผู้ดูแลในกลุ่มนี้" />}
                </div>
            </Modal>
        </div>
    );
};

// --- Main Component ---

function UserRightContent() {
    const { notification, modal, message } = App.useApp();
    const [form] = Form.useForm();
    const token = getToken();
    const currentUser = getUserFromToken();
    
    // Initial data
    const [initialData, setInitialData] = useState<{
        userGroupOptions: { value: string; label: React.ReactNode }[];
        businessUnitOptions: { value: string; label: string }[];
        functionOptions: { value: string; label: string }[];
        unitOptions: { value: string; label: string }[];
        employees: { userId: string; userCode: string; userName: string }[];
        orgStructure: InternalTreeNode | null;
        groups: UserGroup[];
    }>({
        userGroupOptions: [],
        businessUnitOptions: [],
        functionOptions: [],
        unitOptions: [],
        employees: [],
        orgStructure: null,
        groups: []
    });

    // UI State
    const [isChartVisible, setIsChartVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSavingAssignment, setIsSavingAssignment] = useState(false);
    const isSavingAssignmentRef = useRef(false);
    
    // Selection State
    const [selectedUserGroup, setSelectedUserGroup] = useState<string | undefined>(undefined);
    const [selectedBG, setSelectedBG] = useState<string | null>(null);
    const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
    const [selectedUnitHead, setSelectedUnitHead] = useState<string | null>(null);
    const [activeUnit, setActiveUnit] = useState<{ code: string; name: string } | null>(null);
    const [activeUsers, setActiveUsers] = useState<RawEmployee[]>([]);
    
    // Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState<OrgTreeNodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [summaryUsers, setSummaryUsers] = useState<SummaryUser[]>([]);
    const [fetchedOrgData, setFetchedOrgData] = useState<OrgDataInGroup[]>([]);

    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const { setCenter } = useReactFlow();
    const [headerUserGroupNo, setHeaderUserGroupNo] = useState<string>('');
    const normalizeUserGroupNo = useCallback((groupNo: string | undefined | null) => {
        const raw = String(groupNo ?? '').trim();
        if (!raw) return '';
        return /^\d+$/.test(raw) ? raw.padStart(2, '0') : raw;
    }, []);

    const isHRPolicyRole = useMemo(() => {
        return headerUserGroupNo === '04';
    }, [headerUserGroupNo]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncHeaderGroup = () => {
            setHeaderUserGroupNo(normalizeUserGroupNo(localStorage.getItem('selected_usergroup')));
        };

        const onUserGroupChanged = (event: Event) => {
            const customEvent = event as CustomEvent<{ id?: string; userGroupNo?: string }>;
            const eventGroupNo = customEvent.detail?.id || customEvent.detail?.userGroupNo;
            setHeaderUserGroupNo(normalizeUserGroupNo(eventGroupNo || localStorage.getItem('selected_usergroup')));
        };

        syncHeaderGroup();
        window.addEventListener('user-group-changed', onUserGroupChanged as EventListener);

        return () => {
            window.removeEventListener('user-group-changed', onUserGroupChanged as EventListener);
        };
    }, [normalizeUserGroupNo]);

    const getGroupTheme = useCallback((groupNo: string | undefined | null): GroupTheme => {
        const defaultTheme: GroupTheme = { 
            color: '#0284c7', // sky-600
            light: '#f0f9ff', // sky-50
            gradient: 'from-sky-600 to-sky-400',
            border: 'border-sky-100',
            text: 'text-sky-600'
        };

        if (!groupNo) return defaultTheme;
        
        const themes: Record<string, GroupTheme> = {
            '01': { color: '#dc2626', light: '#fef2f2', gradient: 'from-red-600 to-red-400', border: 'border-red-100', text: 'text-red-600' },
            '02': { color: '#2563eb', light: '#eff6ff', gradient: 'from-blue-600 to-blue-400', border: 'border-blue-100', text: 'text-blue-600' },
            '03': { color: '#16a34a', light: '#f0fdf4', gradient: 'from-green-600 to-green-400', border: 'border-green-100', text: 'text-green-600' },
            '04': { color: '#9333ea', light: '#f5f3ff', gradient: 'from-purple-600 to-purple-400', border: 'border-purple-100', text: 'text-purple-600' },
            '05': { color: '#ea580c', light: '#fff7ed', gradient: 'from-orange-600 to-orange-400', border: 'border-orange-100', text: 'text-orange-600' },
            '06': { color: '#0d9488', light: '#f0fdfa', gradient: 'from-teal-600 to-teal-400', border: 'border-teal-100', text: 'text-teal-600' },
            '07': { color: '#0284c7', light: '#f0f9ff', gradient: 'from-sky-600 to-sky-400', border: 'border-sky-100', text: 'text-sky-600' },
        };
        
        return themes[groupNo] || defaultTheme;
    }, []);

    const highlightNode = useCallback((nodeId: string | string[] | null, zoomOverride?: number, type: 'user' | 'search' = 'search') => {
        const targetIds = Array.isArray(nodeId) ? nodeId : (nodeId ? [nodeId] : []);
        setNodes(nds => nds.map(n => ({
            ...n,
            data: { 
                ...n.data, 
                isHighlighted: targetIds.includes(n.id),
                highlightType: targetIds.includes(n.id) ? type : undefined
            }
        })));
        
        if (targetIds.length > 0) {
            const firstNode = nodes.find(n => n.id === targetIds[0]);
            if (firstNode) {
                const finalZoom = zoomOverride || 1.2;
                setCenter(firstNode.position.x + 160, firstNode.position.y + 80, { zoom: finalZoom, duration: 800 });
            }
        }
    }, [nodes, setCenter, setNodes]);


    // Load initial data on client
    useEffect(() => {
        const loadData = async () => {
            try {
                const [groups, units, employees, bgs] = await Promise.all([
                    fetchUserGroups(token),
                    fetchAllUnits(token),
                    fetchAllEmployees(token),
                    fetchBGCombo(new Date().getMonth() + 1 + '', new Date().getFullYear() + '', token)
                ]);

                const userGroupOptions = (groups || []).map((g: UserGroup) => {
                    const theme = getGroupTheme(g.userGroupNo);
                    return {
                        value: g.userGroupNo,
                        label: (
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.color }} />
                                <span className="font-semibold">{g.userGroupName}</span>
                            </div>
                        ),
                    };
                });

                const businessUnitOptions = (bgs || []).map((b: BGCombo) => ({
                    value: b.BGNo,
                    label: b.BGName
                }));

                const unitOptions = (units || []).map((u: RawOrgUnit) => ({
                    value: u.OrgUnitNo || u.orgUnitNo || u.id || '',
                    label: u.UnitName || u.unitName || u.OrgUnitName || u.orgUnitName || u.UnitText || u.unitText || ''
                }));

                const employeeList = (employees || []).map((e: RawEmployee) => ({
                    userId: e.employeeID || e.EmployeeID || '',
                    userCode: e.employeeID || e.EmployeeID || '',
                    userName: e.nameAll || e.NameAll || ''
                }));

                const orgStructure = buildTree(units);

                setInitialData({
                    userGroupOptions,
                    businessUnitOptions,
                    functionOptions: [], // Will be loaded dynamically
                    unitOptions,
                    employees: employeeList,
                    orgStructure,
                    groups: groups || []
                });
            } catch {
                // Ignore errors
            }
        };
        loadData();
    }, [token, getGroupTheme]);

    // Dynamic Line options based on Group
    useEffect(() => {
        if (!selectedUserGroup || !currentUser?.employeeID) {
            setInitialData(prev => ({ ...prev, functionOptions: [] }));
            return;
        }

        const loadLines = async () => {
            const lines = await fetchLineCombo(
                new Date().getMonth() + 1 + '', 
                new Date().getFullYear() + '', 
                token
            );
            
            if (lines) {
                const options = lines.map((l: RawOrgUnit) => ({
                    value: l.OrgUnitNo || '',
                    label: l.UnitText || l.UnitName || ''
                }));
                setInitialData(prev => ({ ...prev, functionOptions: options }));
            }
        };
        loadLines();
    }, [selectedUserGroup, currentUser?.employeeID, token]);
    const groupTheme = useMemo(() => getGroupTheme(selectedUserGroup), [getGroupTheme, selectedUserGroup]);

    const buildTreeNodes = useCallback((
        root: InternalTreeNode | null, 
        usersInGroup: OrgDataInGroup[], 
        filters: { bg: string | null; func: string | null; unit: string | null }
    ): { newNodes: Node<OrgTreeNodeData>[]; newEdges: Edge[]; uniqueUsers: SummaryUser[] } => {
        const newNodes: Node<OrgTreeNodeData>[] = [];
        const newEdges: Edge[] = [];
        const summaryMap = new Map<string, SummaryUser>();
        
        const HORIZONTAL_SPACING = 450;
        const VERTICAL_SPACING = 280;

        const checkVisibility = (
            node: InternalTreeNode,
            ancestorBgMatch: boolean = false,
            ancestorFuncMatch: boolean = false
        ): boolean => {
            const hasNoFilters = !filters.bg && !filters.func && !filters.unit;

            // Does node or ancestor match broad filters?
            const isBgMatch = !filters.bg || ancestorBgMatch || node.code === filters.bg || node.BGNo === filters.bg;
            const isFuncMatch = !filters.func || ancestorFuncMatch || node.code === filters.func || node.FunctionNo === filters.func;
            
            // For broad match, it must satisfy both active broad filters
            const isBroadMatch = (filters.bg || filters.func) ? (isBgMatch && isFuncMatch) : true;
            
            // Unit match check
            const isExactUnit = !!filters.unit && node.code === filters.unit;

            // Process children FIRST so we know if any descendant is visible (Path)
            let anyChildVisible = false;
            node.children.forEach(child => {
                if (checkVisibility(child, isBgMatch, isFuncMatch)) {
                    anyChildVisible = true;
                }
            });

            // If no filters at all
            if (hasNoFilters) {
                node.__isVisible = true;
                return true;
            }

            // If an explicit unit filter is set, ONLY show paths leading to it
            if (filters.unit) {
                if (isExactUnit || anyChildVisible) {
                    node.__isVisible = true;
                    return true;
                }
                node.__isVisible = false;
                return false;
            }

            // If no unit filter but BG/Func filters exist
            if (isBroadMatch || anyChildVisible) {
                node.__isVisible = true;
                return true;
            }

            node.__isVisible = false;
            return false;
        };

        const computeWidth = (node: InternalTreeNode): number => {
            if (!node.__isVisible) {
                node.__subtreeWidth = 0;
                return 0;
            }
            
            let totalWidth = 0;
            node.children.forEach(child => {
                totalWidth += computeWidth(child);
            });

            node.__subtreeWidth = Math.max(1, totalWidth);
            return node.__subtreeWidth;
        };

        const traverse = (node: InternalTreeNode, level: number, startX: number, parentId: string | null) => {
            if (!node.__isVisible) return;

            const nodeId = node.code;
            const subtreeWidth = node.__subtreeWidth || 0;
            const xPos = startX + (subtreeWidth * HORIZONTAL_SPACING) / 2;
            
            const unitData = (usersInGroup || []).find(u => u.OrgUnitID === nodeId);
            const users: RawEmployee[] = dedupeEmployeesById(unitData?.users || []);
            
            // Collect summary users ONLY for visible matching nodes
            if (node.__isVisible) {
                users.forEach(u => {
                    const empIdRaw = String(u.employeeID || u.EmployeeID || '').trim();
                    const empKey = empIdRaw.toLowerCase();
                    if (empIdRaw) {
                        if (!summaryMap.has(empKey)) {
                            summaryMap.set(empKey, { ...u, unitCount: 1, firstUnitId: nodeId, unitIds: [nodeId] } as SummaryUser);
                        } else {
                            const existing = summaryMap.get(empKey)!;
                            existing.unitCount += 1;
                            existing.unitIds.push(nodeId);
                        }
                    }
                });
            }

            newNodes.push({
                id: nodeId,
                type: 'orgTree',
                data: { 
                    label: node.name, 
                    shortName: node.shortName,
                    id: nodeId,
                    userCount: users.length,
                    isHighlighted: false,
                    theme: groupTheme,
                    onViewUsers: (id, name) => {
                        setActiveUnit({ code: id, name });
                        setActiveUsers(users);
                        setIsDetailModalOpen(true);
                    },
                    onAddUser: (id, name) => {
                        setActiveUnit({ code: id, name });
                        setIsAssignmentModalOpen(true);
                        form.setFieldsValue({ unitId: id });
                    }
                },
                position: { x: xPos, y: level * VERTICAL_SPACING },
            });

            if (parentId) {
                newEdges.push({
                    id: `e-${parentId}-${nodeId}`,
                    source: parentId,
                    target: nodeId,
                    type: ConnectionLineType.SmoothStep,
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
                });
            }

            let currentStartX = startX;
            node.children.forEach(child => {
                if (child.__isVisible) {
                    traverse(child, level + 1, currentStartX, nodeId);
                    currentStartX += (child.__subtreeWidth || 0) * HORIZONTAL_SPACING;
                }
            });
        };

        if (root) {
            const resetFlags = (n: InternalTreeNode) => {
                n.__isVisible = false;
                n.__forceVisible = false;
                n.children.forEach(resetFlags);
            };
            resetFlags(root);
            checkVisibility(root);
            computeWidth(root);
            traverse(root, 0, 0, null);
        }

        return { 
            newNodes, 
            newEdges, 
            uniqueUsers: Array.from(summaryMap.values()) 
        };
    }, [form, groupTheme]);

    // Auto-rebuild chart when filters change
    useEffect(() => {
        if (!isChartVisible || !initialData.orgStructure) return;
        
        const { newNodes, newEdges, uniqueUsers } = buildTreeNodes(
            initialData.orgStructure, 
            fetchedOrgData, 
            { bg: selectedBG, func: selectedFunction, unit: selectedUnitHead }
        );
        
        setNodes(newNodes);
        setEdges(newEdges);
        setSummaryUsers(uniqueUsers);

        // Auto-focus and zoom to 0.5x if Unit or Line is selected
        const focusId = selectedUnitHead || selectedFunction;
        if (focusId) {
            const targetNode = newNodes.find(n => n.id === focusId);
            if (targetNode) {
                setTimeout(() => {
                    setCenter(targetNode.position.x + 160, targetNode.position.y + 80, { zoom: 0.5, duration: 800 });
                }, 100); // small delay to ensure nodes are mounted
            }
        }
    }, [selectedBG, selectedFunction, selectedUnitHead, fetchedOrgData, initialData.orgStructure, buildTreeNodes, isChartVisible, setNodes, setEdges, setCenter]);

    const handleFetch = async () => {
        if (!selectedUserGroup) {
            message.warning('กรุณาเลือกกลุ่มผู้ใช้งาน');
            return;
        }

        setLoading(true);
        try {
            const data = await fetchOrgUnitsInGroup(selectedUserGroup, token);
            setFetchedOrgData(data || []);
            setIsChartVisible(true);
            message.success('ดึงข้อมูลสำเร็จ');
        } catch (err) {
            console.error(err);
            notification.error({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (empId: string) => {
        if (!activeUnit || !selectedUserGroup) return;

        modal.confirm({
            title: 'ยืนยันการลบสิทธิ์',
            icon: <InfoCircleOutlined className="text-red-500" />,
            content: 'คุณต้องการลบสิทธิ์การจัดการของพนักงานคนนี้ออกจากหน่วยงานนี้ใช่หรือไม่?',
            okText: 'ลบสิทธิ์',
            cancelText: 'ยกเลิก',
            okType: 'danger',
            onOk: async () => {
                try {
                    await removeUserFromUnit({
                        UserGroupNo: selectedUserGroup,
                        OrgUnitNo: activeUnit.code,
                        EmployeeID: empId,
                        UpdateBy: currentUser?.employeeID || ''
                    });
                    message.success('ลบสิทธิ์เรียบร้อยแล้ว');
                    await handleFetch();
                    // Update detail modal
                    const orgData: OrgDataInGroup[] = await fetchOrgUnitsInGroup(selectedUserGroup, token);
                    const unitData = orgData.find((u: OrgDataInGroup) => u.OrgUnitID === activeUnit.code);
                    setActiveUsers(dedupeEmployeesById(unitData?.users || []));
                } catch (e: unknown) {
                    const error = e as Error;
                    message.error(error.message || 'ไม่สามารถลบสิทธิ์ได้');
                }
            }
        });
    };

    const handleSearch = handleFetch;

    const handleExportRawRights = async () => {
        if (!isHRPolicyRole) {
            message.warning('ปุ่มนี้ใช้ได้เฉพาะกลุ่มผู้ใช้งาน HRPolicy (UserGroupNo 04) จาก Header');
            return;
        }
        const exportUserGroupNo = normalizeUserGroupNo(selectedUserGroup);
        if (!exportUserGroupNo) {
            message.warning('กรุณาเลือกกลุ่มผู้ใช้งาน');
            return;
        }

        setExporting(true);
        try {
            const rawData: OrgDataInGroup[] = (fetchedOrgData && fetchedOrgData.length > 0 && normalizeUserGroupNo(selectedUserGroup) === exportUserGroupNo)
                ? fetchedOrgData
                : await fetchOrgUnitsInGroup(exportUserGroupNo, token);

            if (!Array.isArray(rawData) || rawData.length === 0) {
                message.warning('ไม่พบข้อมูลสิทธิ์สำหรับการ Export');
                return;
            }

            const selectedGroupName = initialData.groups.find(
                (g: UserGroup) => normalizeUserGroupNo(g.userGroupNo) === exportUserGroupNo
            )?.userGroupName || '';
            const unitNameById = new Map(
                initialData.unitOptions.map((u) => [String(u.value), String(u.label)])
            );

            const rows: Array<{
                userGroupName: string;
                orgUnitNo: string;
                orgUnitName: string;
                employeeId: string;
                employeeName: string;
            }> = [];

            rawData.forEach((unit: OrgDataInGroup) => {
                const orgUnitNo = String(unit.OrgUnitID || '').trim();
                const orgUnitName = unitNameById.get(orgUnitNo) || '';
                const users = Array.isArray(unit.users) ? unit.users : [];

                if (users.length === 0) {
                    rows.push({
                        userGroupName: selectedGroupName,
                        orgUnitNo,
                        orgUnitName,
                        employeeId: '',
                        employeeName: ''
                    });
                    return;
                }

                users.forEach((user: RawEmployee) => {
                    rows.push({
                        userGroupName: selectedGroupName,
                        orgUnitNo,
                        orgUnitName,
                        employeeId: user.employeeID || user.EmployeeID || '',
                        employeeName: user.nameAll || user.NameAll || ''
                    });
                });
            });

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Raw User Rights');
            worksheet.columns = [
                { header: 'ชื่อกลุ่มผู้ใช้งาน', key: 'userGroupName', width: 28 },
                { header: 'รหัสหน่วยงาน', key: 'orgUnitNo', width: 16 },
                { header: 'ชื่อหน่วยงาน', key: 'orgUnitName', width: 38 },
                { header: 'รหัสพนักงาน', key: 'employeeId', width: 16 },
                { header: 'ชื่อพนักงาน', key: 'employeeName', width: 30 }
            ];

            rows.forEach((row) => worksheet.addRow(row));

            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true };
            });
            worksheet.autoFilter = {
                from: 'A1',
                to: 'E1'
            };
            worksheet.views = [{ state: 'frozen', ySplit: 1 }];

            const now = new Date();
            const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const fileName = `UserRights_${exportUserGroupNo}_${stamp}.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer();
            await saveExcelFile(buffer, fileName);
            message.success(`Export สำเร็จ ${rows.length.toLocaleString()} รายการ`);
        } catch (e: unknown) {
            const error = e as Error;
            message.error(error.message || 'Export ไม่สำเร็จ');
        } finally {
            setExporting(false);
        }
    };

    const handleAddUser = async (values: { employeeId: string; unitId: string }) => {
        if (!selectedUserGroup) return;
        if (isSavingAssignmentRef.current) return;
        
        isSavingAssignmentRef.current = true;
        setIsSavingAssignment(true);
        try {
            await addUserToUnit({
                UserGroupNo: selectedUserGroup,
                OrgUnitNo: values.unitId,
                EmployeeID: values.employeeId,
                CreateBy: currentUser?.employeeID || ''
            });
            message.success('Assigned successfully');
            setIsAssignmentModalOpen(false);
            form.resetFields();
            await handleFetch();
        } catch (e: unknown) {
            const error = e as Error;
            message.error(error.message || 'Failed to assign');
        } finally {
            isSavingAssignmentRef.current = false;
            setIsSavingAssignment(false);
        }
    };

    return (
        <>
            <div className="w-full bg-[#f8fafc] min-h-screen p-4">
                {/* Modernized & Consolidated Header */}
                <div className="mb-6">
                    <div className="p-4 rounded-[1.5rem] bg-linear-to-r from-sky-600 to-sky-400 shadow-2xl text-white flex items-center justify-between gap-4 overflow-hidden h-18">
                        {/* Title - Left */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner hidden lg:block">
                                <ApartmentOutlined className="text-2xl" />
                            </div>
                            <h1 className="text-lg font-extrabold tracking-tight m-0 text-white truncate max-w-[250px]">จัดการสิทธิ์ผู้ดูแลตามสายงาน</h1>
                        </div>

                        {/* Search & Group - Center */}
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg p-2 rounded-3xl border border-white/20 shadow-inner flex-1 justify-center max-w-[42rem]">
                            <div className="flex flex-col gap-0.5 px-3 shrink-0">
                           
                                <Select 
                                    placeholder="-- เลือกกลุ่มสิทธิ์ --" 
                                    className="w-48 custom-select-header-white"
                                    options={initialData.userGroupOptions}
                                    value={selectedUserGroup}
                                    onChange={setSelectedUserGroup}
                                    allowClear
                                />
                            </div>
                            <Button 
                                type="primary" 
                                size="large" 
                                icon={<SearchOutlined />}
                                onClick={handleSearch}
                                loading={loading}
                                className="h-12 px-8 rounded-2xl bg-white text-slate-800 border-none font-bold hover:bg-white/90! hover:text-slate-900! transition-all shadow-lg shadow-black/5"
                            >
                                เรียกดู
                            </Button>
                            {isHRPolicyRole && !!normalizeUserGroupNo(selectedUserGroup) && (
                                <Tooltip title="Export Excel">
                                    <Button
                                        size="large"
                                        icon={<FileExcelOutlined className="text-[20px]! text-emerald-600!" />}
                                        onClick={handleExportRawRights}
                                        loading={exporting}
                                        className="h-12 w-12 rounded-2xl bg-white text-emerald-600 border border-emerald-300 font-bold hover:bg-emerald-50! hover:text-emerald-700! transition-all shadow-lg shadow-black/10 flex items-center justify-center"
                                        aria-label="Export Raw Data Excel"
                                    />
                                </Tooltip>
                            )}
                        </div>

                        {/* Filters - Right (Revealed after search) */}
                        <div className="flex items-center gap-3 shrink-0 min-w-[350px] justify-end">
                            {isChartVisible && (
                                <div className="flex items-center gap-1.5 bg-white p-1 rounded-3xl shadow-lg border border-white/40">
                                    {/* BG Filter */}
                                    <div className="flex flex-col gap-0 px-3 border-r border-slate-100">
                                    
                                        <Select 
                                            placeholder="-- BU --" 
                                            className="w-28 custom-select-v2-header"
                                            variant="borderless"
                                            allowClear
                                            options={initialData.businessUnitOptions}
                                            value={selectedBG}
                                            onChange={setSelectedBG}
                                        />
                                    </div>
                                    {/* Function Filter (สายงาน) */}
                                    <div className="flex flex-col gap-0 px-3 border-r border-slate-100">
                                       
                                        <Select 
                                            placeholder="-- สายงาน --" 
                                            className="w-40 custom-select-v2-header"
                                            variant="borderless"
                                            allowClear
                                            showSearch
                                            options={initialData.functionOptions}
                                            value={selectedFunction}
                                            onChange={setSelectedFunction}
                                        />
                                    </div>
                                    {/* Unit Focus */}
                                    <div className="flex flex-col gap-0 px-3 pr-4">
                                      
                                        <Select 
                                            showSearch
                                            placeholder="-- หน่วยงาน --"
                                            className="w-40 custom-select-v2-header"
                                            variant="borderless"
                                            value={selectedUnitHead}
                                            onChange={setSelectedUnitHead}
                                            allowClear
                                            options={nodes.map((n: Node<OrgTreeNodeData>) => ({
                                                value: n.id,
                                                label: `${n.id} - ${n.data.label}`
                                            }))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* Content Area */}
                <Card 
                    className="h-[calc(100vh-250px)] rounded-[3rem] shadow-2xl border-0 overflow-hidden relative"
                    styles={{ body: { padding: 0, height: '100%' } }}
                >
                    {!isChartVisible ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-white">
                            <div className="p-16 rounded-[4rem] bg-blue-50/50 mb-8 border border-blue-50">
                                <InfoCircleOutlined style={{ fontSize: '80px' }} className="text-blue-200" />
                            </div>
                            <Title level={3} className="text-slate-400 m-0 font-bold">โปรดเลือกกลุ่มผู้ใช้งานและคลิก &quot;เรียกดู&quot;</Title>
                            <Text className="text-slate-300 mt-2">ระบบจะสร้างผังโครงสร้างสายงานที่เป็นลำดับชั้นเพื่อให้คุณจัดการสิทธิ์ได้ทันที</Text>
                        </div>
                    ) : (
                        <FlowInner 
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            isChartVisible={isChartVisible}
                            summaryUsers={summaryUsers}
                            isSummaryOpen={isSummaryOpen}
                            setIsSummaryOpen={setIsSummaryOpen}
                            groupTheme={groupTheme}
                            handleSearch={highlightNode}
                        />
                    )}
                </Card>

                {/* Detail Modal */}
                <Modal
                    title={<span className="font-bold text-slate-800">รายชื่อผู้ดูแล: {activeUnit?.name}</span>}
                    open={isDetailModalOpen}
                    onCancel={() => setIsDetailModalOpen(false)}
                    footer={null}
                    width={500}
                    className="rounded-3xl"
                >
                    <div className="py-4 flex flex-col gap-3">
                        {activeUsers.map((user: RawEmployee, idx: number) => (
                            <div key={`${String(user.employeeID || user.EmployeeID || '').toLowerCase()}-${idx}`} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Avatar className="bg-blue-100 text-blue-600 shrink-0" icon={<UserOutlined />} />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{user.NameAll || user.nameAll || '-'}</span>
                                        <span className="text-slate-400 text-xs">Employee ID: {user.EmployeeID || user.employeeID || '-'}</span>
                                    </div>
                                </div>
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => handleRemoveUser(user.employeeID || user.EmployeeID || '')}
                                />
                            </div>
                        ))}
                        {activeUsers.length === 0 && <Empty description="ไม่พบผู้รับผิดชอบสำหรับหน่วยงานนี้" />}
                    </div>
                </Modal>

                {/* Assignment Modal */}
                <Modal
                    title={<span className="font-extrabold text-blue-800 text-xl">เพิ่มสิทธิ์พนักงาน</span>}
                    open={isAssignmentModalOpen}
                    onCancel={() => {
                        if (isSavingAssignment) return;
                        setIsAssignmentModalOpen(false);
                    }}
                    footer={null}
                    width={550}
                    className="assignment-modal"
                    closable={!isSavingAssignment}
                    maskClosable={!isSavingAssignment}
                    keyboard={!isSavingAssignment}
                >
                    <Form form={form} layout="vertical" onFinish={handleAddUser} className="pt-4">
                        <Form.Item name="unitId" label="หน่วยงาน">
                            <Select options={initialData.unitOptions} showSearch className="custom-select-v2 h-12" disabled />
                        </Form.Item>
                        <Form.Item name="employeeId" label="พนักงาน" rules={[{ required: true }]}>
                            <Select 
                                options={initialData.employees.map(e => ({ value: e.userId, label: `${e.userCode} - ${e.userName}` }))}
                                showSearch
                                placeholder="ค้นหารายชื่อพนักงาน..."
                                className="custom-select-v2 h-12"
                                disabled={isSavingAssignment}
                            />
                        </Form.Item>
                        <Divider />
                        <div className="flex gap-4">
                            <Button type="primary" block htmlType="submit" loading={isSavingAssignment} disabled={isSavingAssignment} className="h-[52px] rounded-2xl bg-emerald-500 font-bold border-none shadow-xl shadow-emerald-100">บันทึกสิทธิ์</Button>
                            <Button block disabled={isSavingAssignment} onClick={() => setIsAssignmentModalOpen(false)} className="h-[52px] rounded-2xl font-bold bg-slate-100 border-none text-slate-400">ยกเลิก</Button>
                        </div>
                    </Form>
                </Modal>
            </div>

            <style jsx global>{`
                .custom-select-header-white .ant-select-selector {
                    background: white !important;
                    border-radius: 12px !important;
                    height: 48px !important;
                    display: flex !important;
                    align-items: center !important;
                    border: 1px solid rgba(255,255,255,0.2) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
                }
                .custom-select-header-white .ant-select-selection-item {
                    color: #1e293b !important;
                    font-weight: 800 !important;
                    font-size: 14px !important;
                }
                .custom-select-header-white .ant-select-selection-placeholder {
                    color: #64748b !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                }
                .custom-select-header-white .ant-select-arrow {
                    color: #1e293b !important;
                }
                .custom-select-v2 .ant-select-selector {
                    height: 52px !important;
                    border-radius: 16px !important;
                    background: transparent !important;
                    border: none !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .summary-modal .ant-modal-content {
                    border-radius: 28px !important;
                    box-shadow: 0 4px 60px rgba(0,0,0,0.1) !important;
                    border: 1px solid #f1f5f9;
                }
                .assignment-modal .ant-modal-content {
                    border-radius: 36px !important;
                    padding: 40px !important;
                }
                 .custom-select-v2-header .ant-select-selection-item, 
                .custom-select-v2-header .ant-select-selection-placeholder {
                    color: #334155 !important;
                    font-weight: 800 !important;
                    font-size: 13px !important;
                }
                .custom-select-v2-header .ant-select-arrow {
                    color: #3b82f6 !important;
                    font-size: 10px !important;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                
                .custom-modal-v2 .ant-modal-content {
                    border-radius: 32px !important;
                    padding: 24px !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                }
                .custom-modal-v2 .ant-modal-header {
                    margin-bottom: 20px !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                    padding-bottom: 12px !important;
                }
            `}</style>
        </>
    );
}

export default function UserRightPage() {
    return (
        <Main currentPath="/setting">
            <App>
                <ReactFlowProvider>
                    <UserRightContent />
                </ReactFlowProvider>
            </App>
        </Main>
    );
}
