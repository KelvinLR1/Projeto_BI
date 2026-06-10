"use client";
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, PieChart, UserPlus } from 'lucide-react';

const icons = {
  "Faturamento Total": DollarSign,
  "Usuários Ativos": Users,
  "Taxa de Churn": PieChart,
  "Novos Clientes": UserPlus
};

interface KPIProps {
  title: string;
  value: string;
  trend: number;
  spark: number[];
}

const KPICard = ({ title, value, trend, spark }: KPIProps) => {
  const Icon = icons[title as keyof typeof icons] || DollarSign;
  const isUp = trend >= 0;
  const sparkData = spark.map((v, i) => ({ v }));

  return (
    <div className="glass-card neon-border p-6 flex flex-col h-full relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
        </div>
        <div className="p-2 rounded-lg bg-[var(--neon-red)]/10 text-[var(--neon-red)]">
          <Icon size={20} />
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        {isUp ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
        <span className={`text-sm font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{trend}%
        </span>
      </div>

      {/* Gráfico de Tendência (Sparkline) */}
      <div className="h-16 w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line 
              type="monotone" 
              dataKey="v" 
              stroke="var(--neon-red)" 
              strokeWidth={3} 
              dot={false}
              className="drop-shadow-[0_0_8px_var(--accent-glow)]"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Glow highlight bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--neon-red)]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const KPIStats = ({ data }: { data: any[] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {data.map((kpi) => (
        <KPICard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
};

export default KPIStats;
