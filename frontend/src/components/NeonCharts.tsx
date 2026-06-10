"use client";
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export const RevenueChart = ({ data }: { data: any[] }) => {
  return (
    <div className="glass-card neon-border p-8 h-[450px]">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold">Visão Geral de Receita (Q4 2023)</h3>
        <div className="flex space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#ff2d55]" />
          <span className="text-xs text-gray-400">Receita Mensal</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <defs>
            {/* Gradiente para o Gráfico de Área */}
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ff2d55" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `$${value/1000000}M`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#161b22', border: '1px solid rgba(255,45,85,0.2)', borderRadius: '12px' }}
            itemStyle={{ color: '#ff2d55' }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#ff2d55" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorRev)" 
            className="drop-shadow-[0_0_10px_rgba(255,45,85,0.4)]"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RegionSalesChart = ({ data }: { data: any[] }) => {
  return (
    <div className="glass-card neon-border p-8 h-[400px]">
      <h3 className="text-xl font-bold mb-8">Vendas por Região</h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} layout="vertical" barSize={12}>
          <XAxis type="number" hide />
          <YAxis 
            dataKey="region" 
            type="category" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 14, fontWeight: 500 }}
            width={100}
          />
          <Bar dataKey="sales" radius={[0, 10, 10, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#ff2d55" fillOpacity={1 - index * 0.15} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const LeadConversionChart = ({ data }: { data: any }) => {
  const pieData = [
    { name: 'Convertido', value: data.converted },
    { name: 'Restante', value: data.remaining }
  ];

  return (
    <div className="glass-card neon-border p-8 h-[400px] flex flex-col items-center justify-center relative">
      <h3 className="text-xl font-bold mb-2 absolute top-8 left-8">Conversão de Leads</h3>
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={pieData}
            innerRadius={80}
            outerRadius={110}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="#ff2d55" className="drop-shadow-[0_0_15px_rgba(255,45,85,0.5)]" />
            <Cell fill="#1f2937" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold neon-glow-red">{data.converted}%</span>
      </div>
    </div>
  );
};
