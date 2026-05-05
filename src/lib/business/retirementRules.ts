export const DISPLAY_YEAR_COUNT = 5;
export const BUSINESS_TYPE_RATE = 1;
export const SUPPORT_TYPE_RATE = 2;

export interface RetirementDataType {
    key: string;
    typeLabel: string;
    [year: string]: string;
}

export const formatLevelGroupLabel = (levelGroupNo: string, levelGroupName?: string): string => {
    const normalizedNo = String(levelGroupNo || "").trim();
    const normalizedName = String(levelGroupName || "").trim();
    if (!normalizedNo) return "";
    return normalizedName ? `${normalizedNo} - ${normalizedName}` : normalizedNo;
};

export const createDefaultRows = (startYear: number): RetirementDataType[] => {
    const businessRow: RetirementDataType = { key: `${BUSINESS_TYPE_RATE}`, typeLabel: "Business" };
    const supportRow: RetirementDataType = { key: `${SUPPORT_TYPE_RATE}`, typeLabel: "Support" };

    for (let i = 0; i < DISPLAY_YEAR_COUNT; i++) {
        const year = (startYear + i).toString();
        businessRow[year] = "0:1";
        supportRow[year] = "0:1";
    }

    return [businessRow, supportRow];
};

export const normalizeRateInput = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const [intPart, ...decimalParts] = cleaned.split(".");
    if (!decimalParts.length) return intPart;
    return `${intPart}.${decimalParts.join("")}`;
};

export const normalizeBaseInput = (value: string): string => value.replace(/[^0-9]/g, "");

export const splitRatioInput = (value: string): { rateText: string; baseText: string } => {
    const raw = String(value || "").trim();
    if (!raw) return { rateText: "0", baseText: "1" };

    const colonIndex = raw.indexOf(":");
    if (colonIndex < 0) {
        return {
            rateText: normalizeRateInput(raw),
            baseText: "1"
        };
    }

    return {
        rateText: normalizeRateInput(raw.slice(0, colonIndex)),
        baseText: normalizeBaseInput(raw.slice(colonIndex + 1))
    };
};

export const parseRatioCell = (value: string): { rate: number; base: number } => {
    const raw = String(value || "").trim();
    if (!raw) return { rate: 0, base: 1 };

    const [rateRaw, baseRaw] = raw.split(":");
    const parsedRate = Number.parseFloat(rateRaw);
    const parsedBase = Number.parseInt(baseRaw, 10);

    return {
        rate: Number.isFinite(parsedRate) ? parsedRate : 0,
        base: Number.isFinite(parsedBase) && parsedBase > 0 ? parsedBase : 1
    };
};
