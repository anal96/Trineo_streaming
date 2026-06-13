import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';

export default function AnalyticsUpgrade() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const response = await apiFetch(`/analytics/overview?range=${range}`);
    setData(response);
  };

  useEffect(() => { load(); }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {['today', '7d', '30d', '90d'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`min-h-11 px-3 py-2 rounded-full text-xs border ${range === r ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground'}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ['Total Students', data?.metrics?.totalStudents || 0],
          ['Active Students', data?.metrics?.activeStudents || 0],
          ['Total Courses', data?.metrics?.activeCourses || 0],
          ['Total Lessons', data?.metrics?.totalLessons || 0],
          ['Watch Hours', data?.metrics?.watchHours || 0],
          ['Study Materials', data?.metrics?.totalStudyMaterials || 0]
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{value}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Student Analytics</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveDataView
            desktop={
              <Table>
                <TableHeader><TableRow><TableHead>Student ID</TableHead><TableHead>Avg Progress</TableHead><TableHead>Activity Count</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(data?.studentAnalytics?.mostActiveStudents || []).map((student: any) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell>{student.avgProgress}%</TableCell>
                      <TableCell>{student.activityCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
            mobile={(data?.studentAnalytics?.mostActiveStudents || []).map((student: any) => (
              <MobileRecordCard
                key={student.studentId}
                title={student.studentId}
                rows={[
                  { label: 'Avg Progress', value: `${student.avgProgress}%` },
                  { label: 'Activity', value: student.activityCount },
                ]}
              />
            ))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Course / Video Analytics</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Most Viewed Course: {data?.courseAnalytics?.mostViewedCourse?.[0] || 'N/A'} ({data?.courseAnalytics?.mostViewedCourse?.[1] || 0} views)</div>
          <div>Least Viewed Course: {data?.courseAnalytics?.leastViewedCourse?.[0] || 'N/A'} ({data?.courseAnalytics?.leastViewedCourse?.[1] || 0} views)</div>
          <div>Most Watched Lesson: {data?.videoAnalytics?.mostWatchedLesson?.[0] || 'N/A'} ({data?.videoAnalytics?.mostWatchedLesson?.[1] || 0} views)</div>
          <div>Least Watched Lesson: {data?.videoAnalytics?.leastWatchedLesson?.[0] || 'N/A'} ({data?.videoAnalytics?.leastWatchedLesson?.[1] || 0} views)</div>
          <div>Total Watch Time (seconds): {data?.videoAnalytics?.totalWatchTimeSeconds || 0}</div>
          <div>Avg Watch Duration (seconds): {data?.videoAnalytics?.averageWatchDurationSeconds || 0}</div>
          <div>DAU / WAU / MAU: {data?.engagement?.dailyActiveStudents || 0} / {data?.engagement?.weeklyActiveStudents || 0} / {data?.engagement?.monthlyActiveStudents || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}
