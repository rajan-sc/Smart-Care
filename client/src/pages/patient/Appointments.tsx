import React, { useState, Suspense } from 'react';
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppShell } from '../../layouts/AppShell';
import { patientApi, doctorApi } from '../../services/portal.api';
import api from '../../services/api';
import { load } from '@cashfreepayments/cashfree-js';
import jsPDF from 'jspdf';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';
import { bookAppointmentSchema, type BookAppointmentInput } from '../../validators';

let cashfree: any;
load({ mode: 'sandbox' }).then((cf) => {
  cashfree = cf;
});

const AddAppointmentForm: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState('');

  const { data: doctors } = useSuspenseQuery({
    queryKey: ['doctors'],
    queryFn: () => patientApi.getDoctors().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BookAppointmentInput>({
    resolver: zodResolver(bookAppointmentSchema),
    defaultValues: {
      doctorId: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      slotStart: '',
      slotEnd: '',
      type: 'IN_PERSON',
      notes: '',
    }
  });

  const selectedDoctorId = watch('doctorId');
  const selectedDate = watch('scheduledDate');
  const selectedSlotStart = watch('slotStart');

  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', selectedDoctorId],
    queryFn: () => doctorApi.getDoctorProfile(selectedDoctorId).then((r) => r.data.data),
    enabled: !!selectedDoctorId,
  });

  const availableSlots = React.useMemo(() => {
    if (!doctorProfile?.profile?.availability || !selectedDate) return [];
    
    const dateObj = new Date(selectedDate);
    if (isNaN(dateObj.getTime())) return [];
    
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = days[dateObj.getDay()];
    
    return doctorProfile.profile.availability.filter((a: any) => a.dayOfWeek === dayOfWeek && a.isActive);
  }, [doctorProfile, selectedDate]);

  const bookMutation = useMutation({
    mutationFn: (payload: BookAppointmentInput) => patientApi.createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess();
    },
    onError: (err: any) => {
      setApiError(err.response?.data?.error?.message || 'Failed to book appointment.');
    }
  });

  const onSubmit = (data: BookAppointmentInput) => {
    setApiError('');
    bookMutation.mutate(data);
  };

  return (
    <div className="card mb-ease-28 animate-slide-up border border-forest-ink">
      <div className="flex items-center justify-between mb-ease-21 border-b border-hairline-gray pb-ease-14">
        <h3 className="text-ease-subheading font-display text-forest-ink tracking-tight">Book a New Appointment</h3>
        <button onClick={onCancel} className="text-charcoal hover:bg-mint-veil p-2 rounded-nav transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-ease-21">
        {apiError && <div className="p-ease-14 bg-danger-50 text-danger-700 rounded-cards text-ease-body-sm font-normal border border-danger-100 flex gap-3 animate-fade-in">{apiError}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-ease-21">
          <div className="space-y-1.5">
            <label className="label">Doctor</label>
            <select {...register('doctorId')} className="input">
              <option value="">Select a doctor...</option>
              {doctors?.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.firstName} {doc.lastName} {doc.doctorProfile?.specialty ? `— ${doc.doctorProfile.specialty}` : ''}
                </option>
              ))}
            </select>
            {errors.doctorId && <p className="error-text">{errors.doctorId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="label">Appointment Type</label>
            <select {...register('type')} className="input">
              <option value="IN_PERSON">In Person</option>
              <option value="TELECONSULT">Online / Telehealth</option>
            </select>
            {errors.type && <p className="error-text">{errors.type.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-ease-21">
          <div className="space-y-1.5">
            <label className="label">Date</label>
            <input type="date" {...register('scheduledDate')} className="input" min={format(new Date(), 'yyyy-MM-dd')} />
            {errors.scheduledDate && <p className="error-text">{errors.scheduledDate.message}</p>}
          </div>
        </div>

        {selectedDoctorId && selectedDate && (
          <div className="space-y-1.5">
            <label className="label">Available Slots</label>
            <div className="flex flex-wrap gap-2">
              {availableSlots.length > 0 ? (
                availableSlots.map((slot: any, idx: number) => {
                  const isSelected = selectedSlotStart === slot.startTime;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setValue('slotStart', slot.startTime, { shouldValidate: true });
                        setValue('slotEnd', slot.endTime, { shouldValidate: true });
                      }}
                      className={`px-4 py-2 text-sm rounded-cards border transition-colors ${
                        isSelected 
                          ? 'bg-forest-ink text-linen-white border-forest-ink' 
                          : 'bg-linen-white text-forest-ink border-hairline-gray hover:bg-mint-veil'
                      }`}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-graphite p-3 bg-linen rounded-cards w-full">Doctor is not available on this day. Please select another date.</p>
              )}
            </div>
            {errors.slotStart && <p className="error-text">Please select an available slot.</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="label">Reason / Notes</label>
          <input type="text" {...register('notes')} className="input" placeholder="E.g., Experiencing mild headaches" />
          {errors.notes && <p className="error-text">{errors.notes.message}</p>}
        </div>

        <div className="flex justify-end pt-ease-14">
          <button type="submit" disabled={isSubmitting || bookMutation.isPending} className="btn-primary">
            {isSubmitting || bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AppointmentLists: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { data: appointments } = useSuspenseQuery({
    queryKey: ['appointments'],
    queryFn: () => patientApi.getAppointments().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => patientApi.cancelAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  });

  const handlePayment = async (appointmentId: string) => {
    try {
      const res = await api.post('/payments/orders', { appointmentId });
      const { paymentSessionId } = res.data.data;
      if (!cashfree) {
        showToast('Payment gateway is loading. Please try again in a moment.', 'error');
        return;
      }
      cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to initiate payment.', 'error');
    }
  };

  const downloadPrescription = (appt: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Smart Care - E-Prescription', 20, 20);
    doc.setFontSize(12);
    doc.text(`Doctor: Dr. ${appt.doctor?.firstName} ${appt.doctor?.lastName}`, 20, 40);
    doc.text(`Date: ${format(parseISO(appt.scheduledDate), 'MMM d, yyyy')}`, 20, 50);
    doc.text('Clinical Notes:', 20, 70);
    doc.setFontSize(10);
    const notesLines = doc.splitTextToSize(appt.clinicalNotes || 'None', 170);
    doc.text(notesLines, 20, 80);
    let currentY = 80 + (notesLines.length * 6) + 10;
    doc.setFontSize(12);
    doc.text('Prescription:', 20, currentY);
    doc.setFontSize(10);
    const rxLines = doc.splitTextToSize(appt.prescription || 'None', 170);
    doc.text(rxLines, 20, currentY + 10);
    doc.save(`Prescription_${appt.id.slice(0,8)}.pdf`);
  };

  const upcomingAppts = appointments?.filter((a: any) => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status)) || [];
  const pastAppts = appointments?.filter((a: any) => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-ease-section">
      {/* Upcoming Appointments */}
      <div>
        <div className="flex items-center gap-ease-7 mb-ease-21">
          <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink">Upcoming</h3>
        </div>
        
        {upcomingAppts.length > 0 ? (
          <div className="flex flex-col gap-ease-14">
            {upcomingAppts.map((appt: any) => (
              <div key={appt.id} className="card relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-mist-blue rounded-l-cards transition-all"></div>
                <div className="flex justify-between items-start mb-ease-14">
                  <div>
                    <h4 className="font-bold text-ease-body text-forest-ink tracking-tight">
                      Dr. {appt.doctor?.firstName || 'Unknown'} {appt.doctor?.lastName || ''}
                    </h4>
                    <p className="text-ease-caption text-charcoal mt-0.5">{appt.type.replace('_', ' ')}</p>
                  </div>
                  <span className={`badge-pill ${appt.status === 'CONFIRMED' ? 'bg-mint-veil text-forest-ink' : 'bg-mist-blue text-forest-ink'}`}>{appt.status}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-ease-14 text-ease-body-sm text-charcoal mb-ease-14 bg-linen p-ease-14 rounded-nav">
                  <span className="font-mono">{format(parseISO(appt.scheduledDate), 'MMM d, yyyy')}</span>
                  {appt.slotStart && <span className="font-mono">— {format(parseISO(appt.slotStart), 'hh:mm a')}</span>}
                </div>
                
                {appt.notes && (
                  <p className="text-ease-body-sm text-charcoal bg-mist-blue/20 p-ease-14 rounded-nav mb-ease-14">
                    {appt.notes}
                  </p>
                )}
                
                {['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status) && (
                  <div className="flex flex-wrap items-center justify-end border-t border-hairline-gray pt-ease-14 gap-ease-7 mt-ease-7">
                    {appt.type === 'TELECONSULT' && appt.meetingUrl && appt.status === 'IN_PROGRESS' && (
                      <a 
                        href={appt.meetingUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="badge-pill bg-mint-veil text-forest-ink hover:bg-sage-wash cursor-pointer transition-colors"
                      >
                        Join Call
                      </a>
                    )}
                    {(!appt.payment || appt.payment.status !== 'SUCCESS') && (
                       <button 
                         onClick={() => handlePayment(appt.id)}
                         className="btn-primary py-ease-7 px-ease-14 text-ease-caption"
                       >
                         Pay Now
                       </button>
                    )}
                    <button 
                      disabled={cancelMutation.isPending}
                      onClick={async () => {
                        const isConfirmed = await confirm({
                          title: 'Cancel appointment?',
                          message: 'Are you sure you want to cancel this appointment?',
                          confirmText: 'Cancel appointment',
                          cancelText: 'Keep appointment',
                          isDestructive: true,
                        });
                        if (isConfirmed) {
                          cancelMutation.mutate(appt.id);
                        }
                      }}
                      className="px-ease-14 py-ease-7 rounded-nav border border-hairline-gray text-danger-700 hover:bg-danger-50 transition-colors text-ease-caption disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center p-ease-56 text-charcoal bg-linen-white">
            <h3 className="font-normal text-ease-body-sm mb-1">No upcoming appointments</h3>
          </div>
        )}
      </div>

      {/* Past Appointments */}
      <div>
        <div className="flex items-center gap-ease-7 mb-ease-21">
          <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink">Past & Cancelled</h3>
        </div>
        
        {pastAppts.length > 0 ? (
          <div className="flex flex-col gap-ease-14 opacity-80 hover:opacity-100 transition-opacity duration-300">
            {pastAppts.map((appt: any) => (
              <div key={appt.id} className="card">
                <div className="flex justify-between items-start mb-ease-7">
                  <div>
                    <h4 className="font-bold text-ease-body text-forest-ink tracking-tight">
                      Dr. {appt.doctor?.firstName || 'Unknown'} {appt.doctor?.lastName || ''}
                    </h4>
                    <p className="text-ease-caption text-charcoal mt-0.5">{appt.type.replace('_', ' ')}</p>
                  </div>
                  <span className={`badge-pill ${appt.status === 'COMPLETED' ? 'bg-mint-veil text-forest-ink' : 'bg-hairline-gray text-charcoal'}`}>
                    {appt.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-ease-body-sm text-charcoal font-mono">
                  <span>{format(parseISO(appt.scheduledDate), 'MMM d, yyyy')}</span>
                  {appt.slotStart && <span>— {format(parseISO(appt.slotStart), 'hh:mm a')}</span>}
                </div>

                {appt.prescription && (
                  <div className="mt-ease-14 pt-ease-14 border-t border-hairline-gray">
                    <button 
                      onClick={() => downloadPrescription(appt)}
                      className="text-ease-caption px-ease-14 py-ease-7 border border-forest-ink text-forest-ink rounded-nav hover:bg-mint-veil transition-colors"
                    >
                      Download Prescription
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center p-ease-56 text-charcoal bg-linen-white">
            <h3 className="font-normal text-ease-body-sm mb-1">No past appointments</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export const AppointmentsPage: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-ease-21 mb-ease-section animate-fade-in">
          <div className="flex flex-col items-start">
            <span className="badge-pill mb-ease-14">Scheduling</span>
            <h1 className="text-ease-display font-display tracking-tight text-forest-ink">Appointments</h1>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
            {showAddForm ? 'Cancel' : 'Book Appointment'}
          </button>
        </div>

        {showAddForm && (
          <Suspense fallback={<div className="skeleton h-[400px] rounded-cards mb-ease-28" />}>
            <AddAppointmentForm onSuccess={() => setShowAddForm(false)} onCancel={() => setShowAddForm(false)} />
          </Suspense>
        )}

        <Suspense fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-ease-section">
            <div className="space-y-4">{[1,2].map(i => <div key={i} className="skeleton h-[200px] rounded-cards" />)}</div>
            <div className="space-y-4">{[1,2].map(i => <div key={i} className="skeleton h-[120px] rounded-cards" />)}</div>
          </div>
        }>
          <AppointmentLists />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default AppointmentsPage;
