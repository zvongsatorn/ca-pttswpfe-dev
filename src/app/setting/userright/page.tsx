import React from 'react';
import Main from '@/components/layout/main';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/utils/auth';
import UserRightClient from './UserRightClient';
import { 
    fetchUserGroups, 
    fetchAllUnits, 
    fetchAllEmployees, 
    fetchBGCombo 
} from '@/services/userRightService';

// Helper to build tree on server
function buildTree(flatUnits: any[]) {
  if (!flatUnits || !Array.isArray(flatUnits)) return null;
  const map = new Map();
  flatUnits.forEach(u => {
    const id = String(u.OrgUnitNo || u.orgUnitNo || '').trim();
    map.set(id, {
      code: id,
      name: String(u.UnitText || u.unitText || u.OrgUnitName || u.orgUnitName || '').trim(),
      shortName: String(u.unitAbbr || u.UnitAbbr || u.shortName || ''),
      level: 0, 
      parentCode: u.ParentOrgUnitNo || u.parentOrgUnitNo || null,
      children: [],
      BGNo: u.BGNo ? String(u.BGNo).trim() : null
    });
  });

  let root = null;
  map.forEach(node => {
    if (node.parentCode && map.has(node.parentCode)) {
      map.get(node.parentCode).children.push(node);
    } else if (!root || node.code.length < root.code.length) {
      root = node; // Simple heuristic for root if multiple or missing parent
    }
  });
  return root;
}

export default async function UserRightPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || '';
    const user = getUserFromToken(token);

    // Initial Data Fetching on Server
    const [groups, units, employees, bgs] = await Promise.all([
        fetchUserGroups(token),
        fetchAllUnits(token),
        fetchAllEmployees(token),
        fetchBGCombo(new Date().getMonth() + 1 + '', new Date().getFullYear() + '', token)
    ]);

    const userGroupOptions = (groups || []).map((g: any) => ({
        value: g.userGroupNo,
        label: g.userGroupName,
        activeBorder: 'border-blue-600', // Basic defaults, refined in Client
        activeBg: 'bg-blue-50',
        dotColor: 'bg-blue-500'
    }));

    const businessUnitOptions = (bgs || []).map((b: any) => ({
        value: b.BGNo,
        label: b.BGName
    }));

    const unitOptions = (units || []).map((u: any) => ({
        value: u.OrgUnitNo || u.orgUnitNo || u.OrgUnitCode || u.orgUnitCode,
        label: `(${u.OrgUnitNo || u.orgUnitNo}) ${u.UnitText || u.unitText || u.OrgUnitName || u.orgUnitName}`
    }));

    const employeeList = (employees || []).map((e: any) => ({
        userId: e.employeeID || e.EmployeeID,
        userCode: e.employeeID || e.EmployeeID,
        userName: e.nameAll || e.NameAll
    }));

    const orgStructure = buildTree(units);

    const initialData = {
        userGroupOptions,
        businessUnitOptions,
        unitOptions,
        employees: employeeList,
        orgStructure
    };

    return (
        <Main currentPath="/setting">
            <UserRightClient 
                initialData={initialData as any} 
                token={token} 
                currentUser={user} 
            />
        </Main>
    );
}