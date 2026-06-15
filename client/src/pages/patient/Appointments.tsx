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
import { socketService } from '../../services/socket';

let cashfree: any;

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
      let cf = cashfree;
      if (!cf) {
        cf = await load({ mode: 'sandbox' });
        cashfree = cf;
      }

      const res = await api.post('/payments/orders', { appointmentId });
      const { paymentSessionId } = res.data.data;
      
      if (!paymentSessionId || paymentSessionId.startsWith('session_simulated')) {
        showToast('Payment Failed: Gateway keys not configured.', 'error');
        return;
      }

      cf.checkout({ paymentSessionId, redirectTarget: "_self" });
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

const LiveTracker: React.FC<{ appointment: any }> = ({ appointment }) => {
  const doctorId = appointment.doctorId;
  const myTokenNumber = appointment.tokenNumber;

  const { data: initialQueue, isLoading } = useQuery({
    queryKey: ['liveQueue', doctorId],
    queryFn: () => patientApi.getLiveQueue(doctorId).then((r) => r.data.data),
    refetchInterval: false,
  });

  const [liveQueue, setLiveQueue] = useState<any>(null);

  React.useEffect(() => {
    if (initialQueue) setLiveQueue(initialQueue);
  }, [initialQueue]);

  React.useEffect(() => {
    const socket = socketService.getQueueSocket();
    if (!socket) return;
    
    socket.emit('join_queue', doctorId);
    
    const handleUpdate = (data: any) => setLiveQueue(data);
    socket.on('queue:update', handleUpdate);
    
    return () => {
      socket.emit('leave_queue', doctorId);
      socket.off('queue:update', handleUpdate);
    };
  }, [doctorId]);

  if (isLoading || !liveQueue) {
    return <div className="skeleton h-[400px] rounded-cards w-full max-w-lg mx-auto" />;
  }

  const activeToken = liveQueue.activeToken;
  const avgMinutes = liveQueue.avgMinutes || 15;
  
  let tokensAhead = 0;
  if (activeToken === null) {
    tokensAhead = myTokenNumber - 1;
  } else if (myTokenNumber >= activeToken) {
    tokensAhead = myTokenNumber - activeToken;
  } else {
    tokensAhead = 0;
  }

  const waitMinutes = tokensAhead * avgMinutes;
  const isMyTurn = myTokenNumber === activeToken;
  const isPast = myTokenNumber < activeToken && activeToken !== null;

  const renderLineage = () => {
    if (isPast) {
      return <p className="text-center text-charcoal py-8 font-semibold">Your token has already been called.</p>;
    }
    
    if (isMyTurn) {
      return (
        <div className="flex flex-col items-center py-10 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-mint-veil/50 border-4 border-mint-veil flex items-center justify-center animate-pulse z-10 shadow-lg relative">
            <span className="font-mono text-forest-ink text-3xl font-bold">{myTokenNumber}</span>
          </div>
          <span className="text-xl text-forest-ink mt-6 font-display font-bold">It's your turn!</span>
          <span className="text-sm text-charcoal mt-2">Please head to the doctor's room.</span>
        </div>
      );
    }

    const nodes = [];
    const displayCount = Math.min(tokensAhead, 5); 
    const hasMore = tokensAhead > 5;
    
    nodes.push(
      <div key="active" className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-mist-blue/20 border-2 border-mist-blue flex items-center justify-center z-10 relative shadow-sm">
          <span className="font-mono text-forest-ink font-bold text-lg">{activeToken || '-'}</span>
        </div>
        <span className="text-xs text-charcoal mt-2 font-bold uppercase tracking-widest">Currently Serving</span>
      </div>
    );
    
    if (tokensAhead > 0) nodes.push(<div key="line-1" className="w-px h-10 bg-hairline-gray my-1" />);
    
    if (hasMore) {
      nodes.push(
        <div key="more" className="flex flex-col items-center my-3 text-hairline-gray">
          <span className="text-xs font-mono">• • •</span>
          <span className="text-[10px] font-bold text-charcoal mt-1 uppercase tracking-wider">{tokensAhead - 1} patients between</span>
        </div>
      );
      nodes.push(<div key="line-more" className="w-px h-10 bg-hairline-gray my-1" />);
    } else {
      for (let i = 1; i < tokensAhead; i++) {
        nodes.push(
          <div key={`node-${i}`} className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-linen border border-hairline-gray flex items-center justify-center z-10">
              <span className="font-mono text-[10px] text-charcoal">{activeToken ? activeToken + i : i}</span>
            </div>
          </div>
        );
        nodes.push(<div key={`line-${i}`} className="w-px h-10 bg-hairline-gray my-1" />);
      }
    }
    
    if (tokensAhead > 0) {
      nodes.push(
        <div key="user" className="flex flex-col items-center mt-2">
          <div className="w-16 h-16 rounded-full bg-forest-ink border-4 border-mist-blue flex items-center justify-center z-10 shadow-lg">
            <span className="font-mono text-linen-white text-2xl font-bold">{myTokenNumber}</span>
          </div>
          <span className="text-sm text-forest-ink mt-3 font-bold tracking-tight uppercase">Your Token</span>
        </div>
      );
    }
    
    return <div className="flex flex-col items-center justify-center py-8">{nodes}</div>;
  };

  return (
    <div className="max-w-lg mx-auto w-full animate-slide-up">
      <div className="bg-linen-white rounded-cards border border-hairline-gray overflow-hidden shadow-sm">
        
        {/* Header */}
        <div className="p-6 border-b border-hairline-gray text-center bg-linen">
          <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-4">Live Queue Status</h2>
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <p className="text-[10px] text-charcoal font-bold uppercase tracking-widest mb-1">Estimated Wait</p>
              <p className="font-mono text-3xl text-forest-ink">{isMyTurn || isPast ? '-' : `~${waitMinutes}m`}</p>
            </div>
            <div className="w-px h-10 bg-hairline-gray"></div>
            <div className="text-center">
              <p className="text-[10px] text-charcoal font-bold uppercase tracking-widest mb-1">Ahead of You</p>
              <p className="font-mono text-3xl text-forest-ink">{isMyTurn || isPast ? '-' : tokensAhead}</p>
            </div>
          </div>
        </div>

        {/* Lineage Visualization */}
        <div className="p-8 bg-white relative">
          {renderLineage()}
        </div>

        <div className="p-4 bg-linen text-center border-t border-hairline-gray">
          <p className="text-xs text-charcoal">
            Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
          </p>
        </div>
      </div>
    </div>
  );
};

export const AppointmentsPage: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIST' | 'TRACKER'>('LIST');

  const { data: appointments } = useSuspenseQuery({
    queryKey: ['appointments'],
    queryFn: () => patientApi.getAppointments().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  // Find the earliest appointment today that is still pending or confirmed
  const todayAppt = React.useMemo(() => {
    if (!appointments) return null;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return appointments.find(
      (a: any) => ['PENDING', 'CONFIRMED'].includes(a.status) && a.scheduledDate.startsWith(todayStr)
    );
  }, [appointments]);

  // Auto-switch to TRACKER tab if a valid appointment exists for today and we are not explicitly doing something else
  React.useEffect(() => {
    if (todayAppt) {
      setActiveTab('TRACKER');
    }
  }, [todayAppt?.id]);

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

        {todayAppt && !showAddForm && (
          <div className="flex items-center gap-8 border-b border-hairline-gray mb-10 animate-fade-in">
            <button 
              className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === 'TRACKER' ? 'text-forest-ink' : 'text-charcoal hover:text-forest-ink'}`}
              onClick={() => setActiveTab('TRACKER')}
            >
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-veil opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-mint-veil"></span>
                </span>
                Live Tracker
              </span>
              {activeTab === 'TRACKER' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-forest-ink rounded-t-full"></div>}
            </button>
            <button 
              className={`pb-3 font-semibold text-sm transition-colors relative ${activeTab === 'LIST' ? 'text-forest-ink' : 'text-charcoal hover:text-forest-ink'}`}
              onClick={() => setActiveTab('LIST')}
            >
              My Appointments
              {activeTab === 'LIST' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-forest-ink rounded-t-full"></div>}
            </button>
          </div>
        )}

        {showAddForm && (
          <Suspense fallback={<div className="skeleton h-[400px] rounded-cards mb-ease-28" />}>
            <AddAppointmentForm onSuccess={() => setShowAddForm(false)} onCancel={() => setShowAddForm(false)} />
          </Suspense>
        )}

        {!showAddForm && activeTab === 'TRACKER' && todayAppt && (
          <LiveTracker appointment={todayAppt} />
        )}

        {!showAddForm && (activeTab === 'LIST' || !todayAppt) && (
          <Suspense fallback={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-ease-section">
              <div className="space-y-4">{[1,2].map(i => <div key={i} className="skeleton h-[200px] rounded-cards" />)}</div>
              <div className="space-y-4">{[1,2].map(i => <div key={i} className="skeleton h-[120px] rounded-cards" />)}</div>
            </div>
          }>
            <AppointmentLists />
          </Suspense>
        )}
      </div>
    </AppShell>
  );
};

export default AppointmentsPage;
