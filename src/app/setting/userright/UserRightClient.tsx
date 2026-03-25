'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, { 
    Background, 
    Controls, 
    MiniMap, 
    useNodesState, 
    useEdgesState,
    Handle,
    Position,
    Node,
    Edge,
    ConnectionLineType,
    MarkerType,
    useReactFlow,
    ReactFlowProvider
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
    Tooltip,
    Input,
    List,
    Avatar,
    Space
} from 'antd';
import { 
    SearchOutlined, 
    PlusOutlined, 
    DeleteOutlined, 
    UserOutlined, 
    UserAddOutlined,
    BankOutlined,
    UserSwitchOutlined,
    ApartmentOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    TeamOutlined,
    GlobalOutlined,
    CloseOutlined,
    SearchOutlined as LucideSearch,
    InfoCircleOutlined
} from '@ant-design/icons';
import Main from '@/components/layout/main';
import { 
    addUserToUnitAction, 
    removeUserFromUnitAction 
} from './actions';
import { 
    fetchOrgUnitsInGroup
} from './api';

const { Title, Text } = Typography;

// --- Custom Node Component ---

const OrgTreeNode = ({ data }: any) => {
    const isHighlighted = data.isHighlighted;
    
    return (
        <div className={`
            relative px-5 py-4 shadow-xl rounded-2xl border-2 transition-all duration-300
            ${isHighlighted 
                ? 'border-orange-500 ring-8 ring-orange-500/30 animate-pulse bg-white scale-110 z-50' 
                : 'bg-white/90 backdrop-blur-md border-blue-100 text-slate-800 hover:border-blue-400 hover:shadow-2xl'
            }
        `}>
            {/* Pulsing Label for Highlighted Node */}
            {isHighlighted && (
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
                <div className="flex items-center gap-3">
                    <div className={`
                        p-2 rounded-xl shadow-inner
                        ${isHighlighted ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}
                    `}>
                        <ApartmentOutlined className="text-xl" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <Text strong className="truncate block leading-tight text-slate-800 text-[13px]">
                            {data.label}
                        </Text>
                        <Text className="text-[10px] text-slate-400">#{data.id}</Text>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-1 mt-1">
                    <div className="flex items-center gap-1">
                        <Tag color="blue" bordered={false} className="m-0 text-[10px] bg-blue-50 text-blue-700 px-2 rounded-lg font-bold">
                            <TeamOutlined className="mr-1" /> {data.userCount}
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
                className="w-3 h-3 bg-blue-500 border-2 border-white translate-y-1.5 rounded-full" 
            />
        </div>
    );
};

const nodeTypes = {
    orgTree: OrgTreeNode
};

// --- Flow Interior (Needed for useReactFlow) ---

const FlowInner = ({ 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onNodeClick,
    onViewUsers,
    onAddUser,
    summaryUsers,
    onHighlightNode,
    isChartVisible
}: any) => {
    const { setCenter, zoomTo } = useReactFlow();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);

    const handleSearch = (value: string) => {
        const node = nodes.find((n: any) => 
            n.id === value || 
            n.data.label.toLowerCase().includes(value.toLowerCase())
        );
        if (node) {
            setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.5, duration: 800 });
            onHighlightNode(node.id);
        }
    };

    const handleSummaryJump = (unitId: string) => {
        const node = nodes.find((n: any) => n.id === unitId);
        if (node) {
            setCenter(node.position.x + 100, node.position.y + 50, { zoom: 2, duration: 1000 });
            onHighlightNode(unitId);
            setIsSummaryOpen(false);
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
                fitView
                className="bg-slate-50/20"
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#CBD5E1', strokeWidth: 2 }
                }}
            >
                <Background color="#E2E8F0" gap={25} size={1} />
                <Controls className="bg-white border-none shadow-lg rounded-xl overflow-hidden" />
                <MiniMap 
                    className="border border-slate-100 rounded-2xl shadow-xl"
                    nodeColor={(n: any) => n.data.isHighlighted ? '#f97316' : '#3b82f6'}
                    maskColor="rgba(248, 250, 252, 0.7)"
                    style={{ height: 120 }}
                />
            </ReactFlow>

            {/* Floating Summary Tool */}
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                <Button 
                    type="primary" 
                    icon={<TeamOutlined />} 
                    size="large"
                    className="h-14 w-14 rounded-2xl bg-blue-600 shadow-2xl shadow-blue-200 border-none flex items-center justify-center hover:scale-110 transition-transform"
                    onClick={() => setIsSummaryOpen(true)}
                />
                <Button 
                    icon={<CloseOutlined />} 
                    size="large"
                    className="h-10 w-14 rounded-xl bg-white text-slate-400 shadow-lg border-none flex items-center justify-center hover:text-red-500"
                    onClick={() => onHighlightNode(null)}
                />
            </div>

            {/* Quick Search Tool */}
            <div className="absolute top-6 right-20 z-10 w-72">
                <Input.Search
                    placeholder="Find Unit ID or Name..."
                    enterButton={<LucideSearch />}
                    size="large"
                    className="custom-flow-search shadow-2xl rounded-2xl"
                    onSearch={handleSearch}
                />
            </div>

            {/* Admin Summary Sidebar-like Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-3">
                        <TeamOutlined className="text-blue-600" />
                        <span className="font-bold text-slate-800">สรุปรายชื่อผู้ดูแลกลุ่ม</span>
                    </div>
                }
                open={isSummaryOpen}
                onCancel={() => setIsSummaryOpen(false)}
                footer={null}
                width={450}
                style={{ position: 'absolute', left: 20, top: 100, margin: 0 }}
                mask={false}
                className="summary-modal"
            >
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    <List
                        dataSource={summaryUsers}
                        renderItem={(user: any) => (
                            <List.Item 
                                className="hover:bg-blue-50/50 rounded-xl px-3 transition-colors cursor-pointer group mb-2 border border-slate-50"
                                onClick={() => handleSummaryJump(user.OrgUnitNo)}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Avatar className="bg-slate-100 text-blue-600" icon={<UserOutlined />} />
                                    }
                                    title={<span className="text-[13px] font-bold text-slate-700">{user.NameAll}</span>}
                                    description={
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-slate-400">EmpID: {user.EmployeeID}</span>
                                            <Tag color="cyan" className="m-0 mt-1 text-[9px] w-fit border-none font-bold">
                                                {user.UnitAbbr || user.OrgUnitNo}
                                            </Tag>
                                        </div>
                                    }
                                />
                                <Button 
                                    type="link" 
                                    icon={<EyeOutlined />} 
                                    className="text-blue-500 opacity-0 group-hover:opacity-100"
                                >
                                    ดูในผัง
                                </Button>
                            </List.Item>
                        )}
                    />
                </div>
            </Modal>
        </div>
    );
};

// --- Main Component ---

interface UserRightClientProps {
    initialData: {
        userGroupOptions: { value: string; label: string }[];
        businessUnitOptions: { value: string; label: string }[];
        unitOptions: { value: string; label: string; BGNo?: string }[];
        employees: { userId: string; userCode: string; userName: string }[];
        orgStructure: any;
    };
    token: string;
    currentUser: { employeeID: string };
}

export default function UserRightClient({ initialData, token, currentUser }: UserRightClientProps) {
    const { notification, modal, message } = App.useApp();
    const [form] = Form.useForm();
    
    // UI State
    const [isChartVisible, setIsChartVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isAssigmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    // Selection State
    const [selectedUserGroup, setSelectedUserGroup] = useState<string | null>(null);
    const [selectedBG, setSelectedBG] = useState<string | null>(null);
    const [activeUnit, setActiveUnit] = useState<any>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    
    // Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [summaryUsers, setSummaryUsers] = useState<any[]>([]);

    // --- Actions ---

    const highlightNode = useCallback((nodeId: string | null) => {
        setNodes(nds => nds.map(n => ({
            ...n,
            data: { ...n.data, isHighlighted: n.id === nodeId }
        })));
    }, [setNodes]);

    const buildTreeNodes = useCallback((root: any, usersInGroup: any[], bgFilter: string | null) => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const allListedUsers: any[] = [];
        
        const HORIZONTAL_SPACING = 350;
        const VERTICAL_SPACING = 250;

        const traverse = (node: any, level: number, xPos: number, parentId: string | null) => {
            const nodeId = node.code;
            
            // Check if matches BG filter
            if (bgFilter && node.BGNo !== bgFilter && level > 0) return null;

            const unitData = (usersInGroup || []).find(u => u.OrgUnitID === nodeId);
            const users = unitData?.users || [];
            
            users.forEach((u: any) => {
                allListedUsers.push({ ...u, OrgUnitNo: nodeId, UnitAbbr: node.shortName });
            });

            newNodes.push({
                id: nodeId,
                type: 'orgTree',
                data: { 
                    label: node.name, 
                    id: nodeId,
                    userCount: users.length,
                    users,
                    onViewUsers: (id: string, name: string) => {
                        setActiveUnit({ code: id, name });
                        setActiveUsers(users);
                        setIsDetailModalOpen(true);
                    },
                    onAddUser: (id: string, name: string) => {
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

            if (node.children && node.children.length > 0) {
                const visibleChildren = node.children.filter((c: any) => !bgFilter || c.BGNo === bgFilter || level === 0);
                const totalWidth = (visibleChildren.length - 1) * HORIZONTAL_SPACING;
                const startX = xPos - totalWidth / 2;
                
                visibleChildren.forEach((child: any, idx: number) => {
                    traverse(child, level + 1, startX + idx * HORIZONTAL_SPACING, nodeId);
                });
            }
        };

        if (root) {
            traverse(root, 0, 0, null);
        }

        return { newNodes, newEdges, uniqueUsers: allListedUsers };
    }, [form]);

    const handleSearch = async () => {
        if (!selectedUserGroup) {
            notification.warning({ message: 'โปรดเลือกกลุ่มสิทธิ์ผู้ใช้งาน' });
            return;
        }

        setLoading(true);
        try {
            const orgData = await fetchOrgUnitsInGroup(selectedUserGroup, token);
            const { newNodes, newEdges, uniqueUsers } = buildTreeNodes(initialData.orgStructure, orgData, selectedBG);

            setNodes(newNodes);
            setEdges(newEdges);
            setSummaryUsers(uniqueUsers);
            setIsChartVisible(true);
            message.success('ดึงข้อมูลสำเร็จ');
        } catch (error) {
            notification.error({ message: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (empId: string) => {
        if (!activeUnit || !selectedUserGroup) return;

        modal.confirm({
            title: 'Confirm Remove Access',
            icon: <InfoCircleOutlined className="text-red-500" />,
            content: 'Are you sure you want to remove this employee\'s management rights for this unit?',
            okText: 'Remove',
            okType: 'danger',
            onOk: async () => {
                const res = await removeUserFromUnitAction({
                    UserGroupNo: selectedUserGroup,
                    OrgUnitNo: activeUnit.code,
                    EmployeeID: empId,
                    UpdateBy: currentUser.employeeID
                }, token);
                if (res.success) {
                    message.success('Removed successfully');
                    await handleSearch();
                    // Update detail modal
                    const orgData = await fetchOrgUnitsInGroup(selectedUserGroup);
                    const unitData = orgData.find((u: any) => u.OrgUnitID === activeUnit.code);
                    setActiveUsers(unitData?.users || []);
                } else {
                    message.error(res.message);
                }
            }
        });
    };

    const handleAddUser = async (values: any) => {
        if (!selectedUserGroup) return;
        
        try {
            const res = await addUserToUnitAction({
                UserGroupNo: selectedUserGroup,
                OrgUnitNo: values.unitId,
                EmployeeID: values.employeeId,
                CreateBy: currentUser.employeeID
            }, token);
            if (res.success) {
                message.success('Assigned successfully');
                setIsAssignmentModalOpen(false);
                form.resetFields();
                await handleSearch();
            } else {
                message.error(res.message);
            }
        } catch (error) {
            message.error('Failed to assign');
        }
    };

    return (
        <ReactFlowProvider>
            <div className="w-full bg-[#f8fafc] min-h-screen p-8">
                {/* Selection Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div className="flex-1">
                        <Title level={2} className="m-0 text-slate-900 font-extrabold flex items-center gap-3">
                            <ApartmentOutlined className="text-blue-600" />
                            จัดการสิทธิ์ผู้ดูแลตามสายงาน
                        </Title>
                        <Text className="text-slate-400 mt-1 block">บริหารจัดการสิทธิ์การมองเห็นและอนุมัติผ่านผังองค์กรแบบลำดับชั้น</Text>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-50">
                        <div className="flex flex-col gap-1 w-56">
                            <Label text="User Authorization Group" color="blue" />
                            <Select 
                                placeholder="-- เลือกกลุ่มสิทธิ์ --" 
                                className="w-full custom-select-v2"
                                size="large"
                                options={initialData.userGroupOptions}
                                value={selectedUserGroup}
                                onChange={setSelectedUserGroup}
                            />
                        </div>
                        <div className="flex flex-col gap-1 w-56">
                            <Label text="Business Group (Filter)" color="slate" />
                            <Select 
                                placeholder="-- All Groups --" 
                                className="w-full custom-select-v2"
                                size="large"
                                allowClear
                                options={initialData.businessUnitOptions}
                                value={selectedBG}
                                onChange={setSelectedBG}
                            />
                        </div>
                        <Button 
                            type="primary" 
                            size="large" 
                            icon={<SearchOutlined />}
                            onClick={handleSearch}
                            loading={loading}
                            className="h-[52px] px-8 rounded-2xl bg-blue-600 shadow-xl shadow-blue-100 font-bold border-none hover:translate-y-[-2px] transition-all"
                        >
                            เรียกดู
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <Card 
                    className="h-[calc(100vh-250px)] rounded-[3rem] shadow-2xl border-0 overflow-hidden relative"
                    bodyStyle={{ padding: 0, height: '100%' }}
                >
                    {!isChartVisible ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-white">
                            <div className="p-16 rounded-[4rem] bg-blue-50/50 mb-8 border border-blue-50">
                                <InfoCircleOutlined style={{ fontSize: '80px' }} className="text-blue-200" />
                            </div>
                            <Title level={3} className="text-slate-400 m-0 font-bold">โปรดเลือกกลุ่มผู้ใช้งานและคลิก "เรียกดู"</Title>
                            <Text className="text-slate-300 mt-2">ระบบจะสร้างผังโครงสร้างสายงานที่เป็นลำดับชั้นเพื่อให้คุณจัดการสิทธิ์ได้ทันที</Text>
                        </div>
                    ) : (
                        <FlowInner 
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onViewUsers={(id: any, name: any) => {
                                handleSearch(); // Refresh logic
                            }}
                            onAddUser={(id: any, name: any) => {
                                setActiveUnit({ code: id, name });
                                setIsAssignmentModalOpen(true);
                                form.setFieldsValue({ unitId: id });
                            }}
                            summaryUsers={summaryUsers}
                            onHighlightNode={highlightNode}
                            isChartVisible={isChartVisible}
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
                    <div className="py-4">
                        <List
                            dataSource={activeUsers}
                            renderItem={(user: any) => (
                                <List.Item className="bg-slate-50 mb-3 p-4 rounded-2xl border border-slate-100">
                                    <List.Item.Meta
                                        avatar={<Avatar className="bg-blue-100 text-blue-600" icon={<UserOutlined />} />}
                                        title={<span className="font-bold text-slate-700">{user.NameAll}</span>}
                                        description={<span className="text-slate-400 text-xs">Employee ID: {user.EmployeeID}</span>}
                                    />
                                    <Button 
                                        type="text" 
                                        danger 
                                        icon={<DeleteOutlined />} 
                                        onClick={() => handleRemoveUser(user.EmployeeID)}
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: <Empty description="ไม่พบผู้รับผิดชอบสำหรับหน่วยงานนี้" /> }}
                        />
                    </div>
                </Modal>

                {/* Assignment Modal */}
                <Modal
                    title={<span className="font-extrabold text-blue-800 text-xl">เพิ่มสิทธิ์พนักงาน</span>}
                    open={isAssigmentModalOpen}
                    onCancel={() => setIsAssignmentModalOpen(false)}
                    footer={null}
                    width={550}
                    className="assignment-modal"
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
                            />
                        </Form.Item>
                        <Divider />
                        <div className="flex gap-4">
                            <Button type="primary" block htmlType="submit" className="h-[52px] rounded-2xl bg-emerald-500 font-bold border-none shadow-xl shadow-emerald-100">บันทึกสิทธิ์</Button>
                            <Button block onClick={() => setIsAssignmentModalOpen(false)} className="h-[52px] rounded-2xl font-bold bg-slate-100 border-none text-slate-400">ยกเลิก</Button>
                        </div>
                    </Form>
                </Modal>
            </div>

            <style jsx global>{`
                .custom-select-v2 .ant-select-selector {
                    height: 52px !important;
                    border-radius: 16px !important;
                    background: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .custom-flow-search .ant-input-wrapper {
                    background: white !important;
                    border-radius: 16px !important;
                    overflow: hidden !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1) !important;
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
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
            `}</style>
        </ReactFlowProvider>
    );
}

const Label = ({ text, color }: { text: string; color: string }) => (
    <span className={`text-[10px] uppercase font-bold tracking-widest pl-1 ${color === 'blue' ? 'text-blue-600' : 'text-slate-400'}`}>
        {text}
    </span>
);
