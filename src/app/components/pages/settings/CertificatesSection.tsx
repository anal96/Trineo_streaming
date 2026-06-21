import React from 'react';
import { Award, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';

interface CertificatesSectionProps {
  isMobile?: boolean;
  purchasedCourses: any[];
  watchHistory: any[];
  setActiveCertificate: (c: any) => void;
  setCertificateModalOpen: (open: boolean) => void;
}

export default function CertificatesSection({
  isMobile = false,
  purchasedCourses,
  watchHistory,
  setActiveCertificate,
  setCertificateModalOpen
}: CertificatesSectionProps) {

  if (isMobile) {
    return (
      <div className="p-4 border-t border-border/45 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {purchasedCourses.map((course) => {
          const lessonsForCourse = watchHistory.filter(h => {
            const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
            return progId && progId.toString() === course._id.toString();
          });
          const progVal = lessonsForCourse.length > 0 
            ? Math.round(lessonsForCourse.reduce((sum, curr) => sum + curr.progress, 0) / lessonsForCourse.length)
            : 0;
          const isCompleted = progVal >= 100;
          return (
            <div key={course._id} className="p-3 bg-muted/20 rounded-xl border border-border/20 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-foreground truncate block">{course.title}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {isCompleted ? 'Completed' : `In Progress · ${progVal}%`}
                </span>
              </div>
              {isCompleted ? (
                <Button 
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] h-8 rounded-lg touch-btn shrink-0"
                  onClick={() => { setActiveCertificate(course); setCertificateModalOpen(true); }}
                >
                  Download
                </Button>
              ) : (
                <Button className="bg-muted text-muted-foreground font-bold text-[10px] h-8 rounded-lg shrink-0" disabled>
                  Locked
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-6">
      <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Official Course Certificates</span>
          </CardTitle>
          <CardDescription>Earn certificates of completion by completing 100% of the lessons in a batch.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4">
            {purchasedCourses.map((course) => {
              const lessonHistory = watchHistory.filter(h => {
                const progId = h.contentId?.lessonId?.unitId?.subjectId?.programId?._id || h.courseId?._id;
                return progId && progId.toString() === course._id.toString();
              });
              const progress = lessonHistory.length > 0
                ? Math.round(lessonHistory.reduce((sum, current) => sum + current.progress, 0) / lessonHistory.length)
                : 0;
              const isCompleted = progress >= 100;

              return (
                <Card key={course._id} className={`border rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-200 ${
                  isCompleted ? 'border-amber-500/25 bg-amber-500/[0.02]' : 'border-border/45 bg-muted/10'
                }`}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${
                        isCompleted ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-muted border-border text-muted-foreground/60'
                      }`}>
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <span className="font-extrabold text-sm text-foreground truncate block">{course.title}</span>
                        <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 flex-wrap">
                          {isCompleted ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-emerald-600 font-extrabold">Certificate Unlocked!</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>In Progress · {progress}% Complete</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                      {isCompleted ? (
                        <Button 
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-md shadow-amber-500/10"
                          onClick={() => {
                            setActiveCertificate(course);
                            setCertificateModalOpen(true);
                          }}
                        >
                          View Certificate
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          disabled 
                          className="text-[10px] font-extrabold text-muted-foreground bg-muted/30 rounded-xl"
                        >
                          Complete Course to Unlock
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {purchasedCourses.length === 0 && (
              <div className="text-center py-12 text-xs font-semibold text-muted-foreground">
                No active courses enrolled.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
