export interface ApiMenuItem {
    MenuID: number;
    MenuKey: string;
    MenuName: string;
    MenuTitle: string | null;
    SortNumber: number;
    MenuPath: string | null;
    SubMenu: boolean;
    ShowCounter: boolean;
    Expanded: boolean; // default from DB, but UI state controls actual expansion
    MenuIcon: string | null;
    color: string | null;
    lightColor: string | null;
    textColor: string | null;
    ParentID: number | null;
    children?: ApiMenuItem[];
}
