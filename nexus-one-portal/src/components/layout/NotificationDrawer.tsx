import React, { useState } from 'react';
import { Bell, CheckCircle2, Megaphone, Calendar, CheckSquare, GraduationCap, Trash2 } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { INITIAL_NOTIFICATIONS } from '../../data/mockData';
import { NotificationItem } from '../../types';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    if (item.type === 'leave') onNavigate('attendance');
    else if (item.type === 'announcement') onNavigate('announcements');
    else if (item.type === 'task') onNavigate('tasks');
    else if (item.type === 'event') onNavigate('events');
    else if (item.type === 'learning') onNavigate('learning');
    onClose();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Center"
      subtitle={`${unreadCount} unread workspace updates`}
      width="md"
    >
      <div className="space-y-4">
        {/* Actions bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#22375F]">
          <span className="text-xs text-slate-400 font-mono">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#4F7CFF] hover:underline"
              >
                Mark all as read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <Bell className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-semibold text-white">No notifications right now</p>
            <p>You'll receive alerts for approved leave, task assignments, and announcements here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map(item => {
              let icon = <Bell className="w-4 h-4 text-cyan-400" />;
              if (item.type === 'leave') icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
              else if (item.type === 'announcement') icon = <Megaphone className="w-4 h-4 text-cyan-400" />;
              else if (item.type === 'task') icon = <CheckSquare className="w-4 h-4 text-amber-400" />;
              else if (item.type === 'event') icon = <Calendar className="w-4 h-4 text-purple-400" />;
              else if (item.type === 'learning') icon = <GraduationCap className="w-4 h-4 text-teal-400" />;

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    item.isRead
                      ? 'bg-[#111A2E]/60 border-[#22375F]/60 text-slate-400 hover:bg-[#15223D]'
                      : 'bg-[#15223D] border-[#4F7CFF]/40 text-slate-200 shadow-md hover:border-[#4F7CFF]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-[#0B1020] border border-[#22375F] shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs font-bold truncate ${item.isRead ? 'text-slate-300' : 'text-white'}`}>
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-snug">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
};
