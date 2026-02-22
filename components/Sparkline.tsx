import React from 'react';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, width = 112, height = 40, strokeColor = '#4a5568', strokeWidth = 1.5 }) => {
    if (!data || data.length < 2) {
        return <div style={{ width, height }} />;
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;

    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d - min) / (range || 1)) * (height - 4) + 2; // Add padding to avoid hitting edges
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    const lastPoint = data[data.length - 1];
    const prevPoint = data[data.length - 2];
    const lastPointColor = lastPoint >= prevPoint ? '#4ade80' : '#f87171';

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle 
                cx={width} 
                cy={height - ((lastPoint - min) / (range || 1)) * (height - 4) + 2} 
                r="2" 
                fill={lastPointColor} 
            />
        </svg>
    );
};

export default Sparkline;
