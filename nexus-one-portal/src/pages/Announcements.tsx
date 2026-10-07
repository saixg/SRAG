import React, { useState } from 'react';
import {
  Megaphone,
  Search,
  Bookmark,
  Heart,
  MessageSquare,
  Share2,
  CheckCircle2,
  Clock,
  Filter,
  Pin,
  ArrowRight,
  Send,
  Eye
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Announcement, AnnouncementCategory } from '../types';
import { INITIAL_ANNOUNCEMENTS } from '../data/mockData';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';

export const Announcements: React.FC = () => {
  const { showSuccess, showInfo } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterRead, setFilterRead] = useState<string>('ALL');

  // Drawer & Modal states
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const categories: (AnnouncementCategory | 'ALL')[] = [
    'ALL',
    'Company News',
    'Product Updates',
    'People & Culture',
    'Benefits',
    'Technology',
    'Events'
  ];

  const filtered = announcements.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesRead = filterRead === 'ALL' || (filterRead === 'UNREAD' ? !item.isRead : item.isRead);
    return matchesSearch && matchesCat && matchesRead;
  });

  const featured = announcements.find(a => a.isPinned) || announcements[0];

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, likesCount: a.likesCount + 1 };
      }
      return a;
    }));
    showSuccess('Liked Announcement', 'Your appreciation was recorded.');
  };

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        const next = !a.isBookmarked;
        if (next) showSuccess('Bookmarked', 'Added to saved articles.');
        return { ...a, isBookmarked: next };
      }
      return a;
    }));
  };

  const handleOpenDetail = (ann: Announcement) => {
    // Mark as read
    setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, isRead: true } : a));
    setSelectedAnn({ ...ann, isRead: true });
    setIsDrawerOpen(true);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedAnn) return;
    setAnnouncements(prev => prev.map(a => {
      if (a.id === selectedAnn.id) {
        return { ...a, commentsCount: a.commentsCount + 1 };
      }
      return a;
    }));
    showSuccess('Comment Posted', 'Your reply is visible to the team.');
    setCommentText('');
    setCommentModalOpen(false);
  };

  const handleShare = (ann: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href);
    showSuccess('Link Copied', `Direct link to "${ann.title}" copied.`);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22375F]">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
            Company Announcements
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Stay informed with company news, leadership vision, product launches, and culture updates
          </p>
        </div>
      </div>

      {/* Hero Featured Announcement Banner */}
      {featured && (
        <Card
          variant="blue"
          isGlow
          onClick={() => handleOpenDetail(featured)}
          className="p-6 lg:p-8 cursor-pointer relative overflow-hidden group hover:border-[#4F7CFF]"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40">
              <Pin className="w-3 h-3 text-cyan-300" /> Featured Milestone
            </span>
            <StatusBadge type={featured.category} size="sm" />
            <span className="text-[11px] font-mono text-slate-400 ml-auto">{featured.publishedAt}</span>
          </div>

          <h3 className="text-xl lg:text-2xl font-bold text-white leading-snug group-hover:text-cyan-200 transition-colors">
            {featured.title}
          </h3>
          <p className="text-xs text-slate-300 max-w-3xl mt-2 leading-relaxed">
            {featured.summary}
          </p>

          <div className="mt-5 pt-4 border-t border-[#22375F] flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>By <strong className="text-white font-sans">{featured.author}</strong> ({featured.authorRole})</span>
              <span>•</span>
              <span>{featured.readTime}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => handleToggleLike(featured.id, e)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Heart className="w-4 h-4" /> <span>{featured.likesCount}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAnn(featured);
                  setCommentModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> <span>{featured.commentsCount}</span>
              </button>
              <span className="text-xs font-semibold text-[#4F7CFF] flex items-center gap-1">
                Read Story <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Filter & Search Bar */}
      <Card variant="surface" className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search announcements by title, author, or keyword..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterRead}
              onChange={e => setFilterRead(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="UNREAD">Unread Only</option>
              <option value="READ">Read</option>
            </select>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#4F7CFF] text-white font-semibold shadow'
                  : 'bg-[#0B1020] text-slate-400 hover:text-white border border-[#22375F]'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </Card>

      {/* Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ann => (
          <Card
            key={ann.id}
            variant="surface"
            onClick={() => handleOpenDetail(ann)}
            className="p-5 flex flex-col justify-between cursor-pointer hover:border-[#4F7CFF]/50 transition-all group relative"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <StatusBadge type={ann.category} size="sm" />
                <div className="flex items-center gap-1.5">
                  {!ann.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#27D8E8]" title="Unread" />
                  )}
                  <span className="text-[10px] font-mono text-slate-400">{ann.publishedAt}</span>
                </div>
              </div>

              <h4 className="text-sm font-bold text-white leading-snug group-hover:text-cyan-200 transition-colors">
                {ann.title}
              </h4>
              <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                {ann.summary}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#22375F] flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[120px] font-mono text-[11px]">{ann.author}</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleLike(ann.id, e)}
                  className="p-1 rounded hover:text-rose-400 flex items-center gap-1"
                >
                  <Heart className="w-3.5 h-3.5" /> <span className="text-[11px]">{ann.likesCount}</span>
                </button>
                <button
                  onClick={(e) => handleToggleBookmark(ann.id, e)}
                  className={`p-1 rounded ${ann.isBookmarked ? 'text-[#4F7CFF]' : 'hover:text-white'}`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleShare(ann, e)}
                  className="p-1 rounded hover:text-white"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Announcement Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedAnn ? selectedAnn.title : 'Announcement Details'}
        subtitle={selectedAnn ? `Published: ${selectedAnn.publishedAt} • By ${selectedAnn.author}` : ''}
        width="lg"
      >
        {selectedAnn && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge type={selectedAnn.category} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleToggleLike(selectedAnn.id, e)}
                  leftIcon={<Heart className="w-3.5 h-3.5 text-rose-400" />}
                >
                  {selectedAnn.likesCount} Likes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCommentModalOpen(true)}
                  leftIcon={<MessageSquare className="w-3.5 h-3.5 text-cyan-400" />}
                >
                  Comment ({selectedAnn.commentsCount})
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1020] border border-[#22375F] text-xs font-mono text-slate-400">
              <p>Author: <span className="text-white font-sans font-semibold">{selectedAnn.author}</span> ({selectedAnn.authorRole})</p>
              <p>Estimated Reading Time: {selectedAnn.readTime}</p>
            </div>

            <div className="text-sm text-slate-200 leading-relaxed space-y-4 font-sans whitespace-pre-line">
              {selectedAnn.content || selectedAnn.summary}
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Comment Modal */}
      <Modal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        title="Reply to Announcement"
        subtitle={selectedAnn ? selectedAnn.title : 'Leave feedback for the team'}
        maxWidth="md"
      >
        <form onSubmit={handleAddComment} className="space-y-4">
          <div>
            <textarea
              rows={4}
              required
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write your constructive thoughts or celebration..."
              className="w-full p-3 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setCommentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" rightIcon={<Send className="w-3 h-3" />}>
              Post Reply
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
