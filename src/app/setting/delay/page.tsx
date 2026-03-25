import React from 'react';
import Main from '@/components/layout/main';
import { App as AntdApp } from 'antd';
import DelayClient from './DelayClient';
import { getDelayRetirementData, getEmployeeOptions } from '@/services/delayService';

export default async function DelayRetirementPage() {
    // Initial Data Fetching (Mocked Service)
    const [dataRes, empRes] = await Promise.all([
        getDelayRetirementData(),
        getEmployeeOptions()
    ]);

    const initialData = dataRes.data || [];
    const employeeOptions = empRes.data || [];

    return (
        <Main currentPath="/setting">
            <AntdApp>
                <DelayClient 
                    initialData={initialData} 
                    employeeOptions={employeeOptions}
                />
            </AntdApp>
        </Main>
    );
}
