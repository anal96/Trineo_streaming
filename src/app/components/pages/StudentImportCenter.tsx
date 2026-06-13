import { useEffect, useState } from 'react';
import { FileUp, History, Upload } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';

export default function StudentImportCenter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    const jobs = await apiFetch('/student-import/history');
    setHistory(jobs);
  };

  useEffect(() => { loadHistory(); }, []);

  const uploadPreview = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const result = await apiFetch('/student-import/preview', { method: 'POST', body: formData });
    setPreview(result);
    loadHistory();
  };

  const confirmImport = async () => {
    if (!preview?.importJobId) return;
    await apiFetch(`/student-import/confirm/${preview.importJobId}`, { method: 'POST' });
    setPreview(null);
    setFile(null);
    loadHistory();
  };

  const downloadErrorReport = () => {
    if (!preview?.errors?.length) return;
    const header = 'rowNumber,error,email,studentId,course,batch\n';
    const rows = preview.errors.map((e: any) => `${e.rowNumber},"${e.error}","${e.row?.email || ''}","${e.row?.studentId || ''}","${e.row?.course || ''}","${e.row?.batch || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Import Center</CardTitle>
          <CardDescription>Upload CSV/XLSX, preview, validate, and confirm import with error reporting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="h-10 rounded-md border px-3 py-2" />
            <Button className="min-h-11 w-full md:w-auto" onClick={uploadPreview}><Upload className="w-4 h-4 mr-2" />Preview & Validate</Button>
            <Button className="min-h-11 w-full md:w-auto" variant="outline" onClick={confirmImport} disabled={!preview?.importJobId}><FileUp className="w-4 h-4 mr-2" />Confirm Import</Button>
          </div>
          {preview && (
            <div className="p-4 rounded-lg border bg-muted/30 text-sm space-y-1">
              <div>Total Rows: {preview.totalRows}</div>
              <div>Valid Rows: {preview.validRows}</div>
              <div>Failed Rows: {preview.failedRows}</div>
              {preview.failedRows > 0 && <Button variant="outline" size="sm" onClick={downloadErrorReport}>Download Error Report</Button>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />Import History</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveDataView
            desktop={
              <Table>
                <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Status</TableHead><TableHead>Imported</TableHead><TableHead>Failed</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {history.map((job) => (
                    <TableRow key={job._id}>
                      <TableCell>{job.fileName}</TableCell>
                      <TableCell>{job.status}</TableCell>
                      <TableCell>{job.importedCount}</TableCell>
                      <TableCell>{job.failedCount}</TableCell>
                      <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
            mobile={history.map((job) => (
              <MobileRecordCard
                key={job._id}
                title={job.fileName}
                badges={<span className="text-xs font-medium">{job.status}</span>}
                rows={[
                  { label: 'Imported', value: job.importedCount },
                  { label: 'Failed', value: job.failedCount },
                  { label: 'Created', value: new Date(job.createdAt).toLocaleString() },
                ]}
              />
            ))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
