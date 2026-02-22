
import React from 'react';

type SystemMode = 'Light' | 'Medium' | 'Full' | 'UltraLight' | 'VeryLight' | 'Liquidity' | 'FastFull' | 'CustomAnalysis' | 'GlobalScanner' | 'WaveMasterSystem';

interface SystemSelectorProps {
  onSelect: (mode: SystemMode) => void;
}

const SystemCard: React.FC<{
  icon: React.ReactElement;
  title: string;
  description: string;
  details: string;
  onClick: () => void;
  highlight?: boolean;
}> = ({ icon, title, description, details, onClick, highlight }) => (
  <button
    onClick={onClick}
    className={`group w-full max-w-sm text-center bg-gray-800 border ${highlight ? 'border-cyan-500 shadow-cyan-500/20' : 'border-gray-700'} rounded-xl p-6 transition-all duration-300 hover:border-cyan-glow hover:bg-gray-900/50 hover:shadow-2xl hover:shadow-cyan-glow/20 transform hover:-translate-y-2`}
  >
    <div className="flex justify-center items-center h-20 w-20 mx-auto bg-gray-900 border-2 border-gray-700 rounded-full transition-all duration-300 group-hover:border-cyan-glow/80 group-hover:scale-110">
      {icon}
    </div>
    <h3 className="mt-6 text-2xl font-bold text-white transition-colors duration-300 group-hover:text-cyan-glow">{title}</h3>
    <p className="mt-2 text-gray-400 text-sm">{description}</p>
    <p className={`mt-4 text-xs font-mono ${highlight ? 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30' : 'text-yellow-glow bg-yellow-glow/10 border-yellow-glow/20'} border px-3 py-1 rounded-full inline-block`}>{details}</p>
    <div className="mt-6 text-sm font-semibold text-cyan-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      اختر هذا النظام &rarr;
    </div>
  </button>
);

const SystemSelector: React.FC<SystemSelectorProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 sm:p-8">
      <div className="flex items-center space-x-4 mb-4">
        <svg className="h-12 w-auto text-cyan-glow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H6L9 3L15 21L18 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h1 className="text-4xl font-bold text-white tracking-tight">منصة WaveSight</h1>
      </div>
      <p className="mb-12 text-lg text-gray-400">اختر وضع التحليل لبدء التشغيل</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-screen-xl">
        
        {/* NEW: Wave Master System */}
        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400 transition-colors duration-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          title="نظام التحليل الموجي الشامل"
          description="تحليل موجي دقيق (إليوت) مع تحديد الأهداف ووقف الخسارة لعملات مختارة."
          details="PHB, APT, DASH, UMA, FIL, API3 🌊"
          onClick={() => onSelect('WaveMasterSystem')}
          highlight={true}
        />
        
        {/* NEW: Global Scanner */}
        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400 transition-colors duration-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          title="الماسح الذهبي الشامل"
          description="فحص شامل لجميع عملات الفيوتشر (300+) لاستخراج فرص الشراء الجاهزة فقط."
          details="استخراج الفرص الذهبية 💎"
          onClick={() => onSelect('GlobalScanner')}
          highlight={true}
        />
        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400 transition-colors duration-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          title="نظام التحليل المخصص"
          description="تحليل متكامل ومخصص لعملات مختارة (PHB, BTC, ETH...) مع توصيات دقيقة."
          details="تحليل عميق متعدد العملات 🎯"
          onClick={() => onSelect('CustomAnalysis')}
          highlight={true}
        />

        {/* NEW: Fast Comprehensive System */}
        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400 transition-colors duration-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          title="النظام الشامل السريع"
          description="عرض فوري لجميع العملات مع تحليل ذكي للأهم فقط."
          details="الأسرع والأكثر كفاءة 🚀"
          onClick={() => onSelect('FastFull')}
          highlight={true}
        />

        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 transition-colors duration-300 group-hover:text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          title="النظام فائق الخفة"
          description="تحليل لحظي لأكثر 10 عملات تقلبًا في السعر."
          details="إشارات دخول سريعة"
          onClick={() => onSelect('UltraLight')}
        />
        
        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 transition-colors duration-300 group-hover:text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
          title="نظام السيولة"
          description="ترتيب العملات حسب تدفق السيولة (API مباشر)."
          details="أعلى 10 تغيير في الحجم"
          onClick={() => onSelect('Liquidity')}
        />

        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 transition-colors duration-300 group-hover:text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>}
          title="النظام الخفيف جداً"
          description="تحليل يركز فقط على قائمة المراقبة الخاصة بك."
          details="قائمة المراقبة + BTC"
          onClick={() => onSelect('VeryLight')}
        />
        
        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 transition-colors duration-300 group-hover:text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V3m0 18v-3" /></svg>}
          title="النظام الخفيف"
          description="تحليل سريع ومركز لأهم العملات."
          details="تحليل أفضل 25 عملة"
          onClick={() => onSelect('Light')}
        />
        
        <SystemCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 transition-colors duration-300 group-hover:text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" /></svg>}
          title="النظام الشامل (الكامل)"
          description="تحليل جميع العملات بعمق كامل (أبطأ في التحميل)."
          details="تحليل جميع العملات + تاريخ كامل"
          onClick={() => onSelect('Full')}
        />
      </div>
      <p className="mt-12 text-sm text-gray-600">يمكنك دائمًا إعادة تشغيل التطبيق لتغيير الوضع.</p>
    </div>
  );
};

export default SystemSelector;
