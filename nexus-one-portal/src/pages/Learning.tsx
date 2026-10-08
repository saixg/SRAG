import React, { useState } from 'react';
import {
  Search,
  Play,
  Clock,
  Award,
  Star,
  BookOpen,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Course } from '../types';
import { INITIAL_COURSES } from '../data/mockData';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { MetricCard } from '../components/common/MetricCard';
import { ProgressBar } from '../components/common/ProgressBar';
import { Drawer } from '../components/common/Drawer';

export const Learning: React.FC = () => {
  const { showSuccess } = useToast();
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const categories = ['ALL', 'Design', 'Leadership', 'Engineering', 'Communication'];

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const inProgressCourses = courses.filter(c => c.progressPercent > 0 && c.progressPercent < 100);

  const handleOpenCourse = (c: Course) => {
    setSelectedCourse(c);
    setIsDrawerOpen(true);
  };

  const handleProgressCourse = (courseId: string) => {
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const nextPercent = Math.min(100, c.progressPercent + 25);
        const nextCompleted = Math.min(c.totalModules, c.completedModules + 1);
        if (nextPercent === 100) {
          showSuccess('Course Completed! 🎓', `Congratulations on completing "${c.title}"!`);
        } else {
          showSuccess('Module Completed', `Progress updated to ${nextPercent}%.`);
        }
        const updated = { ...c, progressPercent: nextPercent, completedModules: nextCompleted };
        setSelectedCourse(updated);
        return updated;
      }
      return c;
    }));
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22375F]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
              Learning & Professional Development
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-semibold">
              Nexus Academy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build cross-functional craft excellence, design systems architecture, and leadership skills
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Learning Hours YTD"
          value="42.5 hrs"
          subtext="Goal: 50 hrs / year"
          icon={<Clock className="w-5 h-5" />}
          accentColor="violet"
        />
        <MetricCard
          label="Courses in Progress"
          value={inProgressCourses.length}
          subtext="2 active sprints"
          icon={<BookOpen className="w-5 h-5" />}
          accentColor="blue"
        />
        <MetricCard
          label="Certifications Earned"
          value="3 Verified"
          subtext="Design Systems Lead"
          icon={<Award className="w-5 h-5" />}
          accentColor="teal"
        />
        <MetricCard
          label="Nexus Learning Stipend"
          value="$1,500"
          subtext="Available for external books & summits"
          icon={<Sparkles className="w-5 h-5" />}
          accentColor="green"
        />
      </div>

      {/* Continue Learning Section */}
      {inProgressCourses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Continue Learning
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressCourses.map(course => (
              <Card
                key={course.id}
                variant="surface"
                onClick={() => handleOpenCourse(course)}
                className="p-5 flex flex-col justify-between cursor-pointer hover:border-[#4F7CFF]/60 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-cyan-400 font-mono">{course.category}</span>
                    <span className="text-[11px] font-mono text-slate-400">{course.duration}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                    {course.title}
                  </h4>
                  {course.currentLesson && (
                    <p className="text-xs text-slate-300 mt-1 font-mono text-[11px]">
                      Current: {course.currentLesson}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#22375F] space-y-2">
                  <ProgressBar progress={course.progressPercent} color="violet" showLabel />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {course.completedModules} of {course.totalModules} modules
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCourse(course);
                      }}
                      leftIcon={<Play className="w-3 h-3" />}
                    >
                      Resume
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Courses Catalog */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Explore Course Catalog
          </h3>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#111A2E] border border-[#22375F] text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                    selectedCategory === cat ? 'bg-[#4F7CFF] text-white font-semibold' : 'bg-[#111A2E] text-slate-400 hover:text-white border border-[#22375F]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredCourses.map(course => (
            <Card
              key={course.id}
              variant="surface"
              onClick={() => handleOpenCourse(course)}
              className="p-5 flex flex-col justify-between cursor-pointer hover:border-[#4F7CFF]/50 transition-all group"
            >
              <div>
                <div className={`h-24 rounded-xl bg-gradient-to-r ${course.thumbnailColor} p-4 flex items-end justify-between mb-4 shadow-inner`}>
                  <span className="text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {course.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-300" /> {course.rating}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white leading-snug group-hover:text-cyan-200 transition-colors">
                  {course.title}
                </h4>
                <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                <div className="mt-4 pt-3 border-t border-[#22375F] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Instructor: {course.instructor.split(' ')[0]}</span>
                  <span>{course.level} • {course.duration}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#22375F] flex items-center justify-between text-xs text-[#4F7CFF] font-medium">
                <span>{course.progressPercent > 0 ? `${course.progressPercent}% Complete` : 'Start Learning'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Course Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedCourse ? selectedCourse.title : 'Course Overview'}
        subtitle={selectedCourse ? `Taught by ${selectedCourse.instructor}` : ''}
        width="lg"
      >
        {selectedCourse && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#0B1020] border border-[#22375F] space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Duration:</span>
                <span className="text-white">{selectedCourse.duration}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Difficulty Level:</span>
                <span className="text-cyan-300">{selectedCourse.level}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Modules:</span>
                <span className="text-purple-300">{selectedCourse.completedModules} / {selectedCourse.totalModules} completed</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
                Course Syllabus & Description
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {selectedCourse.description}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#15223D] border border-[#22375F] space-y-3">
              <ProgressBar progress={selectedCourse.progressPercent} color="blue" showLabel />
              <Button
                variant="primary"
                size="md"
                onClick={() => handleProgressCourse(selectedCourse.id)}
                leftIcon={<Play className="w-4 h-4" />}
                className="w-full"
              >
                {selectedCourse.progressPercent === 100 ? 'Review Course Material' : 'Complete Next Module (+25%)'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
