import React, { useState } from 'react';
import { patientApi } from '../services/portal.api';
import { useToast } from './ToastProvider';
import { format, subDays, startOfYear } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const [dataType, setDataType] = useState<'all' | 'vitals' | 'medications'>('all');
  const [dateRange, setDateRange] = useState<'30days' | '7days' | 'year' | 'custom'>('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      let startDate, endDate;
      const today = new Date();
      
      if (dateRange === '7days') {
        startDate = subDays(today, 7);
        endDate = today;
      } else if (dateRange === '30days') {
        startDate = subDays(today, 30);
        endDate = today;
      } else if (dateRange === 'year') {
        startDate = startOfYear(today);
        endDate = today;
      } else {
        if (!customStart || !customEnd) {
          showToast('Please select custom start and end dates', 'error');
          setIsExporting(false);
          return;
        }
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
      }

      const res = await patientApi.exportData({
        type: dataType,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      });

      const data = res.data.data;
      generatePDF(data, dataType, startDate, endDate);
      showToast('Report generated successfully', 'success');
      onClose();
    } catch (err: any) {
      console.error('Export Error:', err);
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Failed to generate report';
      showToast(`Error: ${errorMessage}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDF = (data: any, type: string, start: Date, end: Date) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(34, 40, 49); // forest-ink
    doc.text('Smart Care', 14, 22);
    
    doc.setFontSize(14);
    doc.text('Patient Health Report', 14, 32);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`, 14, 40);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy, HH:mm')}`, 14, 46);

    let currentY = 56;

    // Vitals Section
    if ((type === 'all' || type === 'vitals') && data.vitals?.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 40, 49);
      doc.text('Vitals History', 14, currentY);
      
      const vitalsData = data.vitals.map((v: any) => [
        format(new Date(v.recordedAt), 'MMM dd, HH:mm'),
        v.type.replace('_', ' '),
        v.measurement,
        v.notes || '-'
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Date/Time', 'Vital', 'Measurement', 'Notes']],
        body: vitalsData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        margin: { left: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 14;
    } else if (type === 'vitals' && data.vitals?.length === 0) {
      doc.setFontSize(12);
      doc.text('No vitals recorded in this period.', 14, currentY);
      currentY += 14;
    }

    // Medications Section
    if ((type === 'all' || type === 'medications') && data.medications?.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 40, 49);
      doc.text('Medication Logs', 14, currentY);

      const medsData = data.medications.map((m: any) => [
        format(new Date(m.scheduledAt), 'MMM dd, HH:mm'),
        m.medicineName || 'Unknown',
        m.dosage,
        m.status,
        m.takenAt ? format(new Date(m.takenAt), 'HH:mm') : '-'
      ]);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Scheduled Date/Time', 'Medicine', 'Dosage', 'Status', 'Taken At']],
        body: medsData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        margin: { left: 14 }
      });
    } else if (type === 'medications' && data.medications?.length === 0) {
      doc.setFontSize(12);
      doc.text('No medication logs found in this period.', 14, currentY);
    }

    doc.save(`Health_Report_${format(start, 'yyyyMMdd')}_${format(end, 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-forest-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-linen-white rounded-cards w-full max-w-md p-ease-28 animate-slide-up shadow-xl border border-hairline-gray">
        <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-ease-21">Download Health Report</h2>
        
        <div className="space-y-ease-14 mb-ease-21">
          <div>
            <label className="label">Data to Include</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button onClick={() => setDataType('all')} className={`py-2 px-3 text-center rounded-nav text-sm transition-colors ${dataType === 'all' ? 'bg-forest-ink text-linen-white font-semibold' : 'bg-linen text-charcoal hover:bg-mist-blue'}`}>Both</button>
              <button onClick={() => setDataType('vitals')} className={`py-2 px-3 text-center rounded-nav text-sm transition-colors ${dataType === 'vitals' ? 'bg-forest-ink text-linen-white font-semibold' : 'bg-linen text-charcoal hover:bg-mist-blue'}`}>Vitals</button>
              <button onClick={() => setDataType('medications')} className={`py-2 px-3 text-center rounded-nav text-sm transition-colors ${dataType === 'medications' ? 'bg-forest-ink text-linen-white font-semibold' : 'bg-linen text-charcoal hover:bg-mist-blue'}`}>Meds</button>
            </div>
          </div>

          <div>
            <label className="label">Time Period</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="input w-full mt-1">
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="year">Year to Date</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-1 animate-fade-in">
              <div>
                <label className="text-xs text-charcoal">Start Date</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input w-full text-sm py-2" />
              </div>
              <div>
                <label className="text-xs text-charcoal">End Date</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input w-full text-sm py-2" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-hairline-gray">
          <button onClick={onClose} className="px-5 py-2.5 rounded-nav text-charcoal hover:bg-mist-blue/20 transition-colors">Cancel</button>
          <button onClick={handleExport} disabled={isExporting} className="btn-primary flex items-center gap-2">
            {isExporting ? 'Generating...' : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
