// Mock Delay Retirement Service
// Since there's no backend API yet, this service provides mock data following the standard service pattern

export interface DelayRetirementDataType {
    key: string;
    DelayID: string;
    EmployeeID: string;
    PosName: string;
    DelayYear: string;
    DelayStatus: number; 
}

const MOCK_DATA: DelayRetirementDataType[] = [
    {
        key: '1',
        DelayID: '1001',
        EmployeeID: '00600100',
        PosName: 'ผจก. แผนกบริหารงานทั่วไป',
        DelayYear: '2568',
        DelayStatus: 1,
    },
    {
        key: '2',
        DelayID: '1002',
        EmployeeID: '00344552',
        PosName: 'ผู้อำนวยการส่วนเทคโนโลยี',
        DelayYear: '2568',
        DelayStatus: 1,
    },
    {
        key: '3',
        DelayID: '1003',
        EmployeeID: '00600101',
        PosName: 'วิศวกรอาวุโส',
        DelayYear: '2569',
        DelayStatus: 0,
    },
];

export const getDelayRetirementData = async (token?: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, data: MOCK_DATA };
};

export const getEmployeeOptions = async (token?: string) => {
    return {
        success: true,
        data: [
            { value: '00600100', label: '00600100 - นายสมชาติ รักดี', name: 'นายสมชาติ รักดี', position: 'ผจก. แผนกบริหารงานทั่วไป' },
            { value: '00600101', label: '00600101 - นางสาวสมหญิง จริงใจ', name: 'นางสาวสมหญิง จริงใจ', position: 'วิศวกรอาวุโส' },
            { value: '00600102', label: '00600102 - นายธนา มีสุข', name: 'นายธนา มีสุข', position: 'เจ้าหน้าที่บริหารงานบุคคล' },
            { value: '00344552', label: '00344552 - นายวิชัย สุขสันต์', name: 'นายวิชัย สุขสันต์', position: 'ผู้อำนวยการส่วนเทคโนโลยี' },
        ]
    };
};
