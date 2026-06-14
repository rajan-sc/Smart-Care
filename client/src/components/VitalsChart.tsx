import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import type { ScriptableContext } from 'chart.js';
// @ts-expect-error Type issues with verbatimModuleSyntax
import { Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import type { Vital } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface VitalsChartProps {
  vitals: Vital[];
  title?: string;
  hideEmptyState?: boolean;
}

export const VitalsChart: React.FC<VitalsChartProps> = ({ 
  vitals, 
  title, 
  hideEmptyState = false 
}) => {
  const [activeTab, setActiveTab] = useState<'BLOOD_PRESSURE' | 'GLUCOSE' | 'WEIGHT' | 'TEMPERATURE' | 'OXYGEN_SATURATION'>('BLOOD_PRESSURE');
  const bpVitals = vitals
    .filter((v) => v.vitalType === 'BLOOD_PRESSURE')
    .slice(0, 14)
    .reverse();

  const glucoseVitals = vitals
    .filter((v) => v.vitalType === 'GLUCOSE')
    .slice(0, 14)
    .reverse();

  const weightVitals = vitals
    .filter((v) => v.vitalType === 'WEIGHT')
    .slice(0, 14)
    .reverse();

  const tempVitals = vitals
    .filter((v) => v.vitalType === 'TEMPERATURE')
    .slice(0, 14)
    .reverse();

  const spo2Vitals = vitals
    .filter((v) => v.vitalType === 'OXYGEN_SATURATION')
    .slice(0, 14)
    .reverse();

  const createGradient = (context: ScriptableContext<'line'>, colorHex: string) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return 'transparent';
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, `${colorHex}00`);
    gradient.addColorStop(1, `${colorHex}40`);
    return gradient;
  };

  // Smart Care Palettes
  const colorForestInk = '#0f3e17';
  const colorMistBlue = '#b6ced5';
  const colorSageWash = '#b1dbb8';
  const colorHairlineGray = '#e5e7eb';
  const colorCharcoal = '#222222';
  const colorLinenWhite = '#fffefc';

  const bpLabels = bpVitals.map((v) => format(parseISO(v.recordedAt), 'MMM d, h:mm a'));
  const bpData = {
    labels: bpLabels,
    datasets: [
      {
        label: 'Systolic',
        data: bpVitals.map((v) => Number(v.values['systolic'] ?? 0)),
        borderColor: colorForestInk,
        backgroundColor: (c: ScriptableContext<'line'>) => createGradient(c, colorForestInk),
        fill: true,
        tension: 0, // Flat rigid lines suit the brand better
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colorLinenWhite,
        pointBorderColor: colorForestInk,
        pointBorderWidth: 2,
        borderWidth: 1.5,
      },
      {
        label: 'Diastolic',
        data: bpVitals.map((v) => Number(v.values['diastolic'] ?? 0)),
        borderColor: colorMistBlue,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colorLinenWhite,
        pointBorderColor: colorMistBlue,
        pointBorderWidth: 2,
        borderWidth: 1.5,
        borderDash: [5, 5],
      },
      {
        label: 'Pulse',
        data: bpVitals.map((v) => v.values['pulse'] ? Number(v.values['pulse']) : null),
        borderColor: colorSageWash,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colorLinenWhite,
        pointBorderColor: colorSageWash,
        pointBorderWidth: 2,
        borderWidth: 1.5,
      },
    ],
  };

  const glucoseLabels = glucoseVitals.map((v) => format(parseISO(v.recordedAt), 'MMM d, h:mm a'));
  const glucoseData = {
    labels: glucoseLabels,
    datasets: [{
      label: 'Glucose (mg/dL)',
      data: glucoseVitals.map((v) => Number(v.values['value'] ?? 0)),
      borderColor: colorForestInk,
      backgroundColor: (c: ScriptableContext<'line'>) => createGradient(c, colorForestInk),
      fill: true,
      tension: 0,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: colorLinenWhite,
      pointBorderColor: colorForestInk,
      pointBorderWidth: 2,
      borderWidth: 1.5,
    }],
  };

  const weightLabels = weightVitals.map((v) => format(parseISO(v.recordedAt), 'MMM d, h:mm a'));
  const weightData = {
    labels: weightLabels,
    datasets: [{
      label: 'Weight (kg)',
      data: weightVitals.map((v) => Number(v.values['value'] ?? 0)),
      borderColor: colorSageWash,
      backgroundColor: (c: ScriptableContext<'line'>) => createGradient(c, colorSageWash),
      fill: true,
      tension: 0,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: colorLinenWhite,
      pointBorderColor: colorSageWash,
      pointBorderWidth: 2,
      borderWidth: 1.5,
    }],
  };

  const tempLabels = tempVitals.map((v) => format(parseISO(v.recordedAt), 'MMM d, h:mm a'));
  const tempData = {
    labels: tempLabels,
    datasets: [{
      label: 'Temperature (°F)',
      data: tempVitals.map((v) => Number(v.values['value'] ?? 0)),
      borderColor: '#f59e0b', // Amber color for temp
      backgroundColor: (c: ScriptableContext<'line'>) => createGradient(c, '#f59e0b'),
      fill: true,
      tension: 0,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: colorLinenWhite,
      pointBorderColor: '#f59e0b',
      pointBorderWidth: 2,
      borderWidth: 1.5,
    }],
  };

  const spo2Labels = spo2Vitals.map((v) => format(parseISO(v.recordedAt), 'MMM d, h:mm a'));
  const spo2Data = {
    labels: spo2Labels,
    datasets: [{
      label: 'SpO2 (%)',
      data: spo2Vitals.map((v) => Number(v.values['value'] ?? 0)),
      borderColor: '#3b82f6', // Blue color for O2
      backgroundColor: (c: ScriptableContext<'line'>) => createGradient(c, '#3b82f6'),
      fill: true,
      tension: 0,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: colorLinenWhite,
      pointBorderColor: '#3b82f6',
      pointBorderWidth: 2,
      borderWidth: 1.5,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { 
        position: 'top' as const, 
        labels: { 
          font: { family: 'Inter', size: 12, weight: 'normal' as const }, 
          color: colorCharcoal,
          boxWidth: 8, 
          usePointStyle: true,
          padding: 20
        } 
      },
      tooltip: { 
        backgroundColor: colorMistBlue,
        titleColor: colorForestInk,
        bodyColor: colorForestInk,
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        padding: 12,
        cornerRadius: 7,
        displayColors: false,
        boxPadding: 6,
        borderColor: colorForestInk,
        borderWidth: 1,
      },
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { font: { family: 'JetBrains Mono', size: 11 }, color: colorCharcoal },
        border: { display: false }
      },
      y: { 
        grid: { color: colorHairlineGray, drawTicks: false }, 
        ticks: { font: { family: 'JetBrains Mono', size: 11 }, color: colorCharcoal, padding: 10 },
        border: { display: false }
      },
    },
  };

  const isEmpty = bpVitals.length === 0 && glucoseVitals.length === 0 && weightVitals.length === 0 && tempVitals.length === 0 && spo2Vitals.length === 0;

  if (isEmpty && hideEmptyState) return null;

  return (
    <div className="flex flex-col h-full animate-fade-in animate-delay-150">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-ease-21">
        {title && <h3 className="text-ease-body-sm text-forest-ink m-0">{title}</h3>}
        
        {!isEmpty && (
          <div className="flex items-center gap-ease-7 p-1 bg-linen rounded-nav">
            <button 
              onClick={() => setActiveTab('BLOOD_PRESSURE')}
              className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded-nav transition-all ${activeTab === 'BLOOD_PRESSURE' ? 'bg-linen-white text-forest-ink shadow-sm' : 'text-charcoal/70 hover:text-charcoal'}`}
            >
              BP
            </button>
            <button 
              onClick={() => setActiveTab('GLUCOSE')}
              className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded-nav transition-all ${activeTab === 'GLUCOSE' ? 'bg-linen-white text-forest-ink shadow-sm' : 'text-charcoal/70 hover:text-charcoal'}`}
            >
              GLUCOSE
            </button>
            <button 
              onClick={() => setActiveTab('WEIGHT')}
              className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded-nav transition-all ${activeTab === 'WEIGHT' ? 'bg-linen-white text-forest-ink shadow-sm' : 'text-charcoal/70 hover:text-charcoal'}`}
            >
              WEIGHT
            </button>
            <button 
              onClick={() => setActiveTab('TEMPERATURE')}
              className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded-nav transition-all ${activeTab === 'TEMPERATURE' ? 'bg-linen-white text-forest-ink shadow-sm' : 'text-charcoal/70 hover:text-charcoal'}`}
            >
              TEMP
            </button>
            <button 
              onClick={() => setActiveTab('OXYGEN_SATURATION')}
              className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded-nav transition-all ${activeTab === 'OXYGEN_SATURATION' ? 'bg-linen-white text-forest-ink shadow-sm' : 'text-charcoal/70 hover:text-charcoal'}`}
            >
              SPO2
            </button>
          </div>
        )}
      </div>

      <div className="flex-1">
        {activeTab === 'BLOOD_PRESSURE' && bpVitals.length > 0 && (
          <div className="h-64">
            <Line data={bpData} options={chartOptions} />
          </div>
        )}
        {activeTab === 'BLOOD_PRESSURE' && bpVitals.length === 0 && !isEmpty && (
          <div className="h-64 flex items-center justify-center text-charcoal/70 text-sm">No Blood Pressure records yet.</div>
        )}

        {activeTab === 'GLUCOSE' && glucoseVitals.length > 0 && (
          <div className="h-64">
            <Line data={glucoseData} options={chartOptions} />
          </div>
        )}
        {activeTab === 'GLUCOSE' && glucoseVitals.length === 0 && !isEmpty && (
          <div className="h-64 flex items-center justify-center text-charcoal/70 text-sm">No Glucose records yet.</div>
        )}

        {activeTab === 'WEIGHT' && weightVitals.length > 0 && (
          <div className="h-64">
            <Line data={weightData} options={chartOptions} />
          </div>
        )}
        {activeTab === 'WEIGHT' && weightVitals.length === 0 && !isEmpty && (
          <div className="h-64 flex items-center justify-center text-charcoal/70 text-sm">No Weight records yet.</div>
        )}

        {activeTab === 'TEMPERATURE' && tempVitals.length > 0 && (
          <div className="h-64">
            <Line data={tempData} options={chartOptions} />
          </div>
        )}
        {activeTab === 'TEMPERATURE' && tempVitals.length === 0 && !isEmpty && (
          <div className="h-64 flex items-center justify-center text-charcoal/70 text-sm">No Temperature records yet.</div>
        )}

        {activeTab === 'OXYGEN_SATURATION' && spo2Vitals.length > 0 && (
          <div className="h-64">
            <Line data={spo2Data} options={chartOptions} />
          </div>
        )}
        {activeTab === 'OXYGEN_SATURATION' && spo2Vitals.length === 0 && !isEmpty && (
          <div className="h-64 flex items-center justify-center text-charcoal/70 text-sm">No SpO2 records yet.</div>
        )}

        {isEmpty && (
          <div className="h-48 flex flex-col items-center justify-center text-charcoal rounded-cards border border-hairline-gray bg-linen-white">
            <p className="text-ease-body-sm font-normal">No vitals recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
