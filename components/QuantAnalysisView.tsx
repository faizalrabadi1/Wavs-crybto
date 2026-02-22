
import React from 'react';
import type { QuantAnalysis } from '../types';

interface Props {
    analysis: QuantAnalysis;
}

const MetricRow: React.FC<{ label: string; value: string | number; status: string; desc?: string }> = ({ label, value, status, desc }) => (
    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-xs">{label}</span>
            <span className={`font-mono font-bold text-sm ${status === 'Extreme' ? 'text-red-400' : status === 'Warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                {value}
            </span>
        </div>
        {desc && <p className="text-[10px] text-gray-500">{desc}</p>}
    </div>
);

const QuantAnalysisView: React.FC<Props> = ({ analysis }) => {
    if (!analysis) return null;

    const { mean, stdDev, zScore, metrics, bellCurveData, summary, linearRegression } = analysis;

    // Charting for Bell Curve
    const width = 300;
    const height = 150;
    const padding = 20;
    
    const minX = mean - 4 * stdDev;
    const maxX = mean + 4 * stdDev;
    const maxY = Math.max(...bellCurveData.map(p => p.y));
    
    const scaleX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
    const scaleY = (y: number) => height - padding - (y / maxY) * (height - 2 * padding);
    
    const pathData = bellCurveData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`).join(' ');
    const currentX = scaleX(mean + zScore * stdDev);

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>التحليل الإحصائي الكمي (Quantitative Stats)</span>
            </h3>

            <p className="text-sm text-cyan-glow bg-gray-800/50 p-3 rounded-md border border-gray-700 mb-4">{summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-4">
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                        {/* Bell Curve */}
                        <path d={pathData} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
                        
                        {/* Mean Line */}
                        <line x1={scaleX(mean)} y1={padding} x2={scaleX(mean)} y2={height - padding} stroke="#6b7280" strokeDasharray="4 4" />
                        
                        {/* Current Price Line */}
                        <line x1={currentX} y1={padding} x2={currentX} y2={height - padding} stroke={Math.abs(zScore) > 2 ? '#f87171' : '#34d399'} strokeWidth="2" />
                        <circle cx={currentX} cy={height-padding} r="4" fill={Math.abs(zScore) > 2 ? '#f87171' : '#34d399'} />
                        
                        {/* Labels */}
                        <text x={scaleX(mean)} y={height} textAnchor="middle" fontSize="10" fill="#9ca3af">Mean</text>
                        <text x={scaleX(mean - 2*stdDev)} y={height} textAnchor="middle" fontSize="10" fill="#9ca3af">-2σ</text>
                        <text x={scaleX(mean + 2*stdDev)} y={height} textAnchor="middle" fontSize="10" fill="#9ca3af">+2σ</text>
                    </svg>
                    <p className="text-xs text-gray-400 mt-2">توزيع السعر الطبيعي (Bell Curve)</p>
                </div>

                <div className="space-y-2">
                    {metrics.map((m, i) => (
                        <MetricRow key={i} label={m.label} value={m.value} status={m.status} desc={m.description} />
                    ))}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-gray-800 p-2 rounded border border-gray-700 text-center">
                            <span className="block text-[10px] text-gray-500">المتوسط (Mean)</span>
                            <span className="font-mono text-white">{mean.toFixed(4)}</span>
                        </div>
                        <div className="bg-gray-800 p-2 rounded border border-gray-700 text-center">
                            <span className="block text-[10px] text-gray-500">الانحراف (StdDev)</span>
                            <span className="font-mono text-white">{stdDev.toFixed(4)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuantAnalysisView;
