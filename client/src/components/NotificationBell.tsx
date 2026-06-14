import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { notificationApi } from '../services/portal.api';
import { socketService } from '../services/socket';
import type { Notification } from '../types/api';

export const NotificationBell: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getMy().then(r => r.data.data),
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.getUnreadCount().then(r => r.data.data),
  });

  // Listen for real-time notifications
  useEffect(() => {
    const socket = socketService.getNotificationSocket();
    if (!socket) return;

    const handleNewNotification = (notif: Notification) => {
      // Optimistically update cache
      queryClient.setQueryData(['notifications'], (old: Notification[] | undefined) => {
        if (!old) return [notif];
        return [notif, ...old].slice(0, 10);
      });
      queryClient.setQueryData(['notifications', 'unread-count'], (old: { count: number } | undefined) => {
        return { count: (old?.count || 0) + 1 };
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = unreadData?.count || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-forest-ink text-linen-white rounded-full shadow-xl hover:scale-105 hover:bg-forest-ink/90 transition-all duration-300 focus:outline-none flex items-center justify-center border-none group"
      >
        <svg className="w-6 h-6 transform group-hover:-rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-3 right-3.5 w-2.5 h-2.5 bg-danger-500 rounded-full ring-2 ring-forest-ink animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-4 w-80 sm:w-96 bg-linen-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-hairline-gray overflow-hidden z-50 animate-fade-in origin-bottom-right">
          <div className="p-4 border-b border-hairline-gray flex justify-between items-center bg-mint-veil/50">
            <h3 className="font-semibold text-forest-ink">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-medium text-forest-ink hover:text-true-black underline decoration-forest-ink/30"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="p-8 text-center text-charcoal/70 text-sm">
                You're all caught up!
              </div>
            ) : (
              <div className="divide-y divide-hairline-gray">
                {notifications.map((notif: Notification) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 hover:bg-mint-veil/30 transition-colors cursor-pointer ${!notif.isRead ? 'bg-mist-blue/20' : ''}`}
                    onClick={() => {
                      if (!notif.isRead) markReadMutation.mutate(notif.id);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        notif.type === 'VITAL_ALERT' || notif.type === 'CAREGIVER_ALERT' ? 'bg-danger-100 text-danger-600' :
                        notif.type === 'APPOINTMENT_REMINDER' ? 'bg-mist-blue text-forest-ink' :
                        'bg-mint-veil text-forest-ink'
                      }`}>
                        {notif.type === 'VITAL_ALERT' || notif.type === 'CAREGIVER_ALERT' ? '⚠️' : notif.type === 'APPOINTMENT_REMINDER' ? '📅' : 'ℹ️'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-medium ${!notif.isRead ? 'text-true-black' : 'text-charcoal'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-charcoal/60 whitespace-nowrap ml-2">
                            {formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className={`text-sm ${!notif.isRead ? 'text-charcoal' : 'text-charcoal/70'}`}>
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
