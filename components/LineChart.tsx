import React from 'react';

// New native SVG Line Chart to replace Recharts.
// This component is self-contained and supports multiple lines.

interface LineConfig {
    key: string;
    color: string;
    name?: string;
    strokeWidth?: number;
    dashArray?: string;
}

interface LineChartProps {
    data: { [key: string]: number | string }[];
    lines: LineConfig[];
    domain?: [number | string, number | string];
    xAxisKey?: string;
}

const SimpleLineChart: React.FC<LineChartProps> = ({ data, lines, domain, xAxisKey = 'time' }) => {
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 250;
    const PADDING = { top: 20, right: 60, bottom: 40, left: 10 };
    const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
    const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

    if (!data || data.length < 2) {
        return <div className="flex items-center justify-center h-full text-xs text-gray-500">بيانات غير كافية للرسم.</div>;
    }

    const xValues = data.map(d => d[xAxisKey] as number);
    const yValues = data.flatMap(d => lines.map(line => d[line.key] as number)).filter(v => v !== undefined && v !== null);
    
    if (yValues.length === 0) {
         return <div className="flex items-center justify-center h-full text-xs text-gray-500">لا توجد بيانات صالحة للعرض.</div>;
    }
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = domain && typeof domain[0] === 'number' ? domain[0] : Math.min(...yValues);
    const maxY = domain && typeof domain[1] === 'number' ? domain[1] : Math.max(...yValues);
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    const scaleX = (x: number) => PADDING.left + ((x - minX) / (rangeX || 1)) * CHART_WIDTH;
    const scaleY = (y: number) => (SVG_HEIGHT - PADDING.bottom) - ((y - minY) / (rangeY || 1)) * CHART_HEIGHT;

    const pathData = lines.map(line => {
        let pathStr = '';
        let onPath = false;
        data.forEach(d => {
            const value = d[line.key];
            if (value !== undefined && value !== null) {
                if (!onPath) {
                    pathStr += `M ${scaleX(d[xAxisKey] as number)},${scaleY(value as number)}`;
                    onPath = true;
                } else {
                    pathStr += ` L ${scaleX(d[xAxisKey] as number)},${scaleY(value as number)}`;
                }
            } else {
                onPath = false;
            }
        });
        return { ...line, path: pathStr };
    });

    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = minY + (rangeY / 4) * i;
        return { value: value.toFixed(typeof domain?.[0] === 'number' && (domain[0] === -1 || domain[0] === 0) ? 1 : 2), y: scaleY(value) };
    });

    return (
        <div className="relative w-full h-full">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
                {/* Grid & Axes */}
                {yAxisLabels.map(label => (
                    <g key={`y-axis-${label.value}`}>
                        <line x1={PADDING.left} y1={label.y} x2={CHART_WIDTH + PADDING.left} y2={label.y} stroke="#30363d" strokeWidth="0.5" strokeDasharray="3 3" />
                        <text x={CHART_WIDTH + PADDING.left + 5} y={label.y + 3} fill="#a0aec0" fontSize="10">{label.value}</text>
                    </g>
                ))}
                <text x={PADDING.left} y={SVG_HEIGHT - 25} fill="#a0aec0" fontSize="10">{data[0][xAxisKey]}</text>
                <text x={CHART_WIDTH + PADDING.left} y={SVG_HEIGHT - 25} fill="#a0aec0" fontSize="10" textAnchor="end">{data[data.length - 1][xAxisKey]}</text>
                
                {/* Lines */}
                {pathData.map(line => (
                    <path key={line.key} d={line.path} stroke={line.color} strokeWidth={line.strokeWidth || 2} fill="none" strokeDasharray={line.dashArray} strokeLinecap="round" strokeLinejoin="round" />
                ))}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex justify-center space-x-4 text-xs">
                {lines.map(line => line.name && (
                    <div key={line.key} className="flex items-center space-x-2">
                        <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={line.color} strokeWidth={line.strokeWidth || 2} strokeDasharray={line.dashArray} /></svg>
                        <span className="text-gray-400">{line.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SimpleLineChart;