"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Main from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function MKDDashboardPage({ params }: { params: Promise<{ mkdId: string }> }) {
  const { mkdId } = React.use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"CHART" | "DETAIL">("CHART");
  const [isLoading, setIsLoading] = useState(true);

  const [headerInfo, setHeaderInfo] = useState({ reqNo: "-", date: "-", orgUnit: "-" });
  const [effYear, setEffYear] = useState<number>(0);
  const [years, setYears] = useState<{ ad: number; label: string; th: number }[]>([]);
  
  interface SummaryRow {
    title: string;
    isTotal: boolean;
    data: Record<number, number>;
  }

  interface ChartDataItem {
    year: string;
    value: number;
    type: string;
    ad: number;
  }

  interface MKDDriver {
    id: number;
    name: string;
    unit: string;
    weight: number;
    raw: Record<number, number>;
    ratio: Record<number, number>;
    headcount: Record<number, number>;
  }

  interface RawDashItem {
    KeyYear: string | number;
    SumHeadCount?: number;
    Headcount?: number;
    UnitHead?: number;
    ImpRate?: number;
    ManDriverKeyID?: number;
    KeyManName?: string;
    Unit?: string;
    Weight?: number;
    KeySumAmount?: number;
    RatioCal?: number;
    HeadCountCal?: number;
  }

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [productivityRate, setProductivityRate] = useState<Record<number, number>>({});
  const [drivers, setDrivers] = useState<MKDDriver[]>([]);

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editRateValues, setEditRateValues] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [detailRes, dashRes] = await Promise.all([
          fetch(`/api/mkd/${mkdId}/details`).then(r => r.json()),
          fetch(`/api/mkd/${mkdId}/dashboard`).then(r => r.json())
        ]);

        let currentEffYear = 0;
        if (detailRes.success && detailRes.data?.header) {
            const h = detailRes.data.header;
            const d = new Date(h.RequestDate);
            currentEffYear = Number(h.EffectiveYear);
            setHeaderInfo({
                reqNo: h.fullRequestNo || `${h.RequestNo}/${d.getFullYear().toString().substr(2, 2)}`,
                date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear() + 543}`,
                orgUnit: h.UnitNameAll || h.OrgUnitName || "-"
            });
            setEffYear(currentEffYear);
        }

        if (dashRes.success && dashRes.data) {
            const { chart, chartDetail, chartDetailCal } = dashRes.data;
            
            const allYears = Array.from(new Set([
                ...(chartDetail || []).map((x: RawDashItem) => Number(x.KeyYear)),
                ...(chartDetailCal || []).map((x: RawDashItem) => Number(x.KeyYear))
            ])).sort((a, b) => (a as number) - (b as number));
            
            const yearObjs = allYears.map((y) => {
                const yearTh = y + 543;
                let label = yearTh.toString();
                if (y === currentEffYear) label += ' E';
                else if (y > currentEffYear) label += ' F';
                return { ad: y, label: label, th: yearTh };
            });
            setYears(yearObjs);

            const cData = (chart || []).map((item: RawDashItem) => {
                const y = Number(item.KeyYear);
                let type = "past";
                if (y === currentEffYear) type = "estimate";
                if (y > currentEffYear) type = "forecast";
                return {
                    year: yearObjs.find(yo => yo.ad === y)?.label || y.toString(),
                    value: item.SumHeadCount || 0,
                    type,
                    ad: y
                };
            }).sort((a: ChartDataItem, b: ChartDataItem) => a.ad - b.ad);
            setChartData(cData);

            const headcounts: Record<number, number> = {};
            const unitHeads: Record<number, number> = {};
            const totals: Record<number, number> = {};
            const prodRate: Record<number, number> = {};

            (chartDetail || []).forEach((item: RawDashItem) => {
                const y = Number(item.KeyYear);
                headcounts[y] = item.Headcount || 0;
                unitHeads[y] = item.UnitHead || 0;
                totals[y] = item.SumHeadCount || 0;
                prodRate[y] = item.ImpRate || 0;
            });
            setSummaryRows([
                { title: "Headcount", isTotal: false, data: headcounts },
                { title: "UnitHead", isTotal: false, data: unitHeads },
                { title: "TOTAL", isTotal: true, data: totals }
            ]);
            setProductivityRate(prodRate);

            const driverMap: Record<number, MKDDriver> = {};
            (chartDetailCal || []).forEach((item: RawDashItem) => {
                const y = Number(item.KeyYear);
                const id = Number(item.ManDriverKeyID);
                if (isNaN(id)) return;
                
                if (!driverMap[id]) {
                    driverMap[id] = {
                        id,
                        name: item.KeyManName || '',
                        unit: item.Unit || '',
                        weight: item.Weight || 0,
                        raw: {},
                        ratio: {},
                        headcount: {}
                    };
                }
                driverMap[id].raw[y] = item.KeySumAmount || 0;
                driverMap[id].ratio[y] = item.RatioCal || 0;
                driverMap[id].headcount[y] = item.HeadCountCal || 0;
            });
            setDrivers(Object.values(driverMap).sort((a: MKDDriver, b: MKDDriver) => a.id - b.id));
        }
      } catch (e) {
         console.error(e);
      } finally {
         setIsLoading(false);
      }
    };
    fetchData();
  }, [mkdId]);

  const handleSaveRate = async () => {
      try {
          const payload = Object.entries(editRateValues).map(([year, amount]) => ({
              id: Number(mkdId),
              year: year.toString(),
              amount: Number(amount)
          }));
          const res = await fetch(`/api/mkd/${mkdId}/dashboard/rate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: payload })
          });
          const result = await res.json();
          if (result.success) {
              setProductivityRate({ ...productivityRate, ...editRateValues });
              setIsEditingRate(false);
              toast.success("บันทึกข้อมูลสำเร็จ");
          } else {
              toast.error(result.message || "เกิดข้อผิดพลาด");
          }
      } catch (e) {
          console.error(e);
          toast.error("เกิดข้อผิดพลาด");
      }
  };

  const startEditRate = () => {
      const fYears = years.filter(y => y.ad > effYear);
      const initial: Record<number, number> = {};
      fYears.forEach(y => {
          initial[y.ad] = productivityRate[y.ad] || 0;
      });
      setEditRateValues(initial);
      setIsEditingRate(true);
  };

  const getYearColor = (y: { ad: number }) => {
    if (y.ad > effYear) return "text-purple-700";
    if (y.ad === effYear) return "text-blue-600";
    return "text-black";
  };

  const SimpleBarChart = () => {
    const maxVal = Math.max(...chartData.map(d => d.value), 4);
    
    return (
      <div className="w-full h-[400px] bg-white p-4 relative mt-4">
        <div className="absolute top-0 text-sm text-gray-500 flex items-center gap-2">
             <div className="w-8 h-4 bg-gray-300 opacity-50"></div> # of HeadCount
        </div>
        
        <div className="h-[300px] flex items-end justify-between pl-12 pr-4 border-l border-b relative top-10">
            {/* Y-Axis Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => (
                <div key={ratio} className="absolute w-full border-t border-gray-200 -z-10" style={{ bottom: `${ratio * 100}%`, left: 0 }}>
                    <span className="absolute -left-8 -top-2 text-xs text-gray-400">{(maxVal * ratio).toFixed(1)}</span>
                </div>
            ))}

            {chartData.map((item, idx) => {
                const heightPercent = maxVal === 0 ? 0 : (item.value / maxVal) * 100;
                let bgColor = "bg-gray-300";
                if (item.type === 'estimate') bgColor = "bg-blue-400";
                if (item.type === 'forecast') bgColor = "bg-pink-300";

                return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full w-full mx-2 group">
                        <span className="mb-2 text-xs font-bold text-gray-600">{item.value > 0 ? item.value : '0'}</span>
                        <div 
                            className={`w-full max-w-[60px] transition-all duration-500 ${bgColor} hover:opacity-80`} 
                            style={{ height: `${heightPercent}%` }}
                        ></div>
                        <span className="mt-4 text-xs text-gray-500">{item.year}</span>
                    </div>
                )
            })}
        </div>
      </div>
    );
  };

  const SummaryTableComp = () => (
    <div className="overflow-x-auto mt-8 border-t-4 border-blue-500">
      <Table>
        <TableHeader className="bg-blue-200/50">
          <TableRow className="border-none">
            <TableHead className="w-[200px] font-bold text-blue-900"></TableHead>
            {years.map(y => (
               <TableHead key={y.ad} className={`text-center font-bold ${getYearColor(y)}`}>{y.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaryRows.map((row, index) => (
            <TableRow 
                key={index} 
                className={row.isTotal ? "bg-orange-50/50 border-t font-bold hover:bg-orange-100/50" : "hover:bg-gray-50"}
            >
              <TableCell className={row.isTotal ? "font-bold text-black" : "font-bold text-blue-600"}>
                {row.title}
              </TableCell>
              {years.map(y => (
                  <TableCell key={y.ad} className={`text-center ${row.isTotal ? 'font-bold' : ''} ${getYearColor(y)}`}>
                      {row.data[y.ad] || 0}
                  </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Main>
      <div className="min-h-screen bg-white p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">
          Manpower Key Driver
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 items-end">
          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">Request No</Label>
            <Input value={headerInfo.reqNo} readOnly className="bg-gray-50 mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-gray-700">Date</Label>
            <Input value={headerInfo.date} readOnly className="bg-gray-50 mt-1" />
          </div>
          <div className="md:col-span-6">
            <Label className="text-sm font-medium text-gray-700">หน่วยงาน</Label>
            <Input value={headerInfo.orgUnit} readOnly className="bg-gray-50 mt-1" />
          </div>
          <div className="md:col-span-2 text-right">
            <Button 
                className="bg-gray-500 hover:bg-gray-600 text-white min-w-[100px]"
                onClick={() => router.back()}
            >
              ย้อนกลับ
            </Button>
          </div>
        </div>

        <div className="border-b border-pink-200 mb-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("CHART")}
              className={`pb-3 font-semibold text-sm transition-colors relative ${
                activeTab === "CHART" 
                ? "text-blue-500 after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-pink-500" 
                : "text-gray-500 hover:text-gray-700"
              }`}
            >
              CHART
            </button>
            <button
              onClick={() => setActiveTab("DETAIL")}
              className={`pb-3 font-semibold text-sm transition-colors relative ${
                activeTab === "DETAIL" 
                ? "text-blue-500 after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-pink-500" 
                : "text-gray-500 hover:text-gray-700"
              }`}
            >
              DETAIL
            </button>
          </div>
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
        ) : (
            <>
                {activeTab === "CHART" && (
                <div className="animate-in fade-in duration-300">
                    <SimpleBarChart />
                    <SummaryTableComp />
                </div>
                )}

                {activeTab === "DETAIL" && (
                <div className="animate-in fade-in duration-300">
                    
                    <div className="flex justify-end mb-4">
                        <div className="w-full md:w-1/2 lg:w-5/12">
                            <Table>
                                <TableHeader className="bg-blue-200/50">
                                    <TableRow>
                                        <TableHead className="text-right"></TableHead>
                                        {years.filter(y => y.ad > effYear).map(y => (
                                            <TableHead key={y.ad} className="text-center text-black font-semibold text-xs">{y.label}</TableHead>
                                        ))}
                                        <TableHead className="text-center w-16">
                                            {isEditingRate ? (
                                                <div className="flex gap-2 justify-center">
                                                    <Save className="w-4 h-4 text-green-600 cursor-pointer" onClick={handleSaveRate} />
                                                    <X className="w-4 h-4 text-red-500 cursor-pointer" onClick={() => setIsEditingRate(false)} />
                                                </div>
                                            ) : (
                                                <Edit2 className="w-4 h-4 text-orange-400 cursor-pointer mx-auto" onClick={startEditRate} />
                                            )}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-bold text-blue-600 text-xs whitespace-nowrap">Productivity Improvement Rate</TableCell>
                                        {years.filter(y => y.ad > effYear).map(y => (
                                            <TableCell key={y.ad} className="text-center text-xs">
                                                {isEditingRate ? (
                                                    <Input 
                                                        type="number"
                                                        className="w-16 h-8 text-center text-xs"
                                                        value={editRateValues[y.ad] !== undefined ? editRateValues[y.ad] : ''}
                                                        onChange={(e) => setEditRateValues({...editRateValues, [y.ad]: Number(e.target.value)})}
                                                    />
                                                ) : (
                                                    `${productivityRate[y.ad] || 0}%`
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="mb-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-600 cursor-pointer hover:text-green-700" />
                    </div>

                    <div className="overflow-x-auto border rounded-sm">
                        <Table>
                            <TableHeader className="bg-blue-200/50">
                                <TableRow>
                                    <TableHead className="font-bold text-black min-w-[200px]">Manpower Key Driver</TableHead>
                                    <TableHead className="font-bold text-black">Unit</TableHead>
                                    <TableHead className="font-bold text-black">Weight</TableHead>
                                    {years.map(y => (
                                        <TableHead key={y.ad} className={`font-bold text-center ${getYearColor(y)}`}>{y.label}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drivers.map((driver) => (
                                    <React.Fragment key={driver.id}>
                                        <TableRow className="bg-white border-none hover:bg-gray-50">
                                            <TableCell className="font-bold text-blue-700">{driver.name}</TableCell>
                                            <TableCell className="font-medium">{driver.unit}</TableCell>
                                            <TableCell className="font-bold">{driver.weight}%</TableCell>
                                            {years.map(y => (
                                                <TableCell key={y.ad} className={`text-right font-bold ${getYearColor(y)}`}>
                                                    {Number(driver.raw[y.ad] || 0).toFixed(2)}
                                                </TableCell>
                                            ))}
                                        </TableRow>

                                        <TableRow className="bg-white border-none hover:bg-gray-50">
                                            <TableCell className="font-bold text-black pl-4" colSpan={3}>Productivity Ratio</TableCell>
                                            {years.map(y => (
                                                <TableCell key={y.ad} className={`text-right ${getYearColor(y)}`}>
                                                    {Number(driver.ratio[y.ad] || 0).toFixed(2)}
                                                </TableCell>
                                            ))}
                                        </TableRow>

                                        <TableRow className="bg-white border-b hover:bg-gray-50">
                                            <TableCell className="font-bold text-black pl-4" colSpan={3}>HeadCount</TableCell>
                                            {years.map(y => (
                                                <TableCell key={y.ad} className={`text-right ${getYearColor(y)}`}>
                                                    {Number(driver.headcount[y.ad] || 0).toFixed(2)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <SummaryTableComp />
                </div>
                )}
            </>
        )}
      </div>
    </Main>
  );
}
