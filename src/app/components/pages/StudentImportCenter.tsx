import { useEffect, useState, useRef } from 'react';
import { FileUp, History, Upload, CheckCircle, Download, AlertTriangle, FileSpreadsheet, FileText, UserPlus, HelpCircle } from 'lucide-react';
import { apiFetch, getApiUrl } from '../../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ResponsiveDataView, MobileRecordCard } from '../responsive/ResponsiveDataView';

export default function StudentImportCenter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<string>('skip'); // skip | update | import_new
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    try {
      const jobs = await apiFetch('/student-import/history');
      setHistory(jobs || []);
    } catch (e) {}
  };

  useEffect(() => { loadHistory(); }, []);

  const downloadTemplate = async () => {
    try {
      const url = getApiUrl('/student-import/template/excel');
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token && token !== 'session_active') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers, credentials: 'include' });
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'student-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || 'Template download failed');
    }
  };

  const uploadPreview = async () => {
    if (!file) return;
    setReport(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await apiFetch('/student-import/preview', { method: 'POST', body: formData });
      setPreview(result);
      loadHistory();
    } catch (err: any) {
      alert(err.message || 'Validation failed. Please verify format and headings.');
    }
  };

  const confirmImport = async () => {
    if (!preview?.importJobId) return;
    try {
      const result = await apiFetch(`/student-import/confirm/${preview.importJobId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicateAction })
      });
      setReport(result);
      setPreview(null);
      setFile(null);
      loadHistory();
    } catch (err: any) {
      alert(err.message || 'Import confirmation failed.');
    }
  };

  const downloadErrorReport = () => {
    if (!preview?.errors?.length) return;
    const header = 'Row Number,Error,Student Name,Email,Phone,Batch,Admission Date\n';
    const rows = preview.errors.map((e: any) => 
      `${e.rowNumber},"${e.error}","${e.row?.name || ''}","${e.row?.email || ''}","${e.row?.phone || ''}","${e.row?.batch || ''}","${e.row?.admissionDate || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-import-validation-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadHistoryReport = async (jobId: string, fileName: string, type: 'error' | 'success') => {
    try {
      const job = await apiFetch(`/student-import/history/${jobId}`);
      const filteredRows = job.rows.filter((r: any) => 
        type === 'error' ? (r.status === 'failed' || r.status === 'skipped') : (r.status === 'imported' || r.status === 'updated')
      );
      if (!filteredRows.length) {
        alert(`No matching ${type === 'error' ? 'failed/skipped' : 'imported/updated'} rows found for this job.`);
        return;
      }
      const header = 'Row Number,Student Name,Email,Phone,Batch,Admission Date,Status,Message\n';
      const rows = filteredRows.map((r: any) => 
        `${r.rowNumber},"${r.name || ''}","${r.email || ''}","${r.phone || ''}","${r.batch || ''}","${r.admissionDate || ''}","${r.status || ''}","${r.error || ''}"`
      ).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'error' ? 'error-report' : 'import-report'}-${fileName.replace(/\.[^/.]+$/, "")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download report: ' + err.message);
    }
  };

  const studentsToBeImportedCount = 
    duplicateAction === 'update' 
      ? (preview?.validRows || 0)
      : (preview?.newRowsCount || 0);

  return (
    <div className="space-y-6">
      {/* IMPORT TEMPLATE CARD */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Import Template</CardTitle>
              <CardDescription>Download a template, fill student details, and upload it back.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadTemplate} variant="outline" className="min-h-11 border-primary/20 hover:bg-primary/5">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" /> Download Excel Template
            </Button>
          </div>

          <div className="border border-border/50 rounded-xl overflow-hidden bg-muted/10">
            <div className="p-3 bg-muted/20 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Template Column Structure Preview
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium">Student Name *</TableHead>
                    <TableHead className="text-xs font-medium">Email *</TableHead>
                    <TableHead className="text-xs font-medium">Phone *</TableHead>
                    <TableHead className="text-xs font-medium">Batch *</TableHead>
                    <TableHead className="text-xs font-medium">Admission Date *</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-sm font-medium">John Smith</TableCell>
                    <TableCell className="text-sm">john.smith@example.com</TableCell>
                    <TableCell className="text-sm">9876543210</TableCell>
                    <TableCell className="text-sm">BCA</TableCell>
                    <TableCell className="text-sm text-muted-foreground">2026-01-15</TableCell>
                    <TableCell className="text-sm text-muted-foreground">ACTIVE</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STUDENT IMPORT UPLOADER CARD */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle>Import Students</CardTitle>
          <CardDescription>Select an Excel or CSV file containing student details to upload.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="h-10 rounded-md border px-3 py-2 bg-background border-border/60 text-sm cursor-pointer" 
            />
            <Button className="min-h-11 w-full bg-primary hover:bg-[#1f5fa7]" onClick={uploadPreview} disabled={!file}>
              <Upload className="w-4 h-4 mr-2" /> Preview & Validate
            </Button>
            <Button className="min-h-11 w-full" variant="outline" onClick={confirmImport} disabled={!preview?.importJobId}>
              <FileUp className="w-4 h-4 mr-2" /> Confirm Import
            </Button>
          </div>

          {/* PREVIEW SUMMARY CARD */}
          {preview && (
            <div className="p-6 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
              <div className="font-semibold text-foreground text-base">Import Summary Preview:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="bg-slate-950/45 p-3 rounded-xl border border-border/40 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Records</div>
                  <div className="text-lg font-bold mt-1 text-slate-200">{preview.totalRows}</div>
                </div>
                <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-center">
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">Valid Records</div>
                  <div className="text-lg font-bold mt-1 text-emerald-400">{preview.validRows}</div>
                </div>
                <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-center">
                  <div className="text-[10px] text-red-400 uppercase font-semibold">Invalid Records</div>
                  <div className="text-lg font-bold mt-1 text-red-400">{preview.failedRows}</div>
                </div>
                <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-center">
                  <div className="text-[10px] text-amber-400 uppercase font-semibold">Duplicate Students</div>
                  <div className="text-lg font-bold mt-1 text-amber-400">{preview.duplicateRowsCount}</div>
                </div>
                <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 text-center">
                  <div className="text-[10px] text-blue-400 uppercase font-semibold">New Students</div>
                  <div className="text-lg font-bold mt-1 text-blue-400">{preview.newRowsCount}</div>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-center">
                  <div className="text-[10px] text-primary uppercase font-semibold">To Import</div>
                  <div className="text-lg font-bold mt-1 text-primary">{studentsToBeImportedCount}</div>
                </div>
              </div>

              {preview.duplicateRowsCount > 0 && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <AlertTriangle className="w-5 h-5 animate-pulse" /> Existing Students Found ({preview.duplicateRowsCount})
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The file contains students whose email or phone number already exists in the system. Select an action below.
                  </p>
                </div>
              )}

              {preview.duplicateRows && preview.duplicateRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" /> Duplicate Students Log
                  </div>
                  <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {preview.duplicateRows.map((dupRow: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-amber-500/10 bg-amber-950/20 text-xs space-y-3 text-slate-300">
                        <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                          <span className="font-bold text-amber-400">Row {dupRow.rowNumber}</span>
                          <span className="text-[10px] text-muted-foreground">Student: <span className="text-slate-200 font-semibold">{dupRow.name}</span></span>
                          <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-semibold text-[9px] uppercase">
                            SKIPPED
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground font-medium">Reason: </span>
                            <span className="text-amber-400 font-semibold">Duplicate Student Found</span>
                          </div>
                          {dupRow.duplicateDetails && (
                            <>
                              <div>
                                <span className="text-muted-foreground font-medium">Matched By: </span>
                                <span className="font-semibold text-amber-400">{dupRow.duplicateDetails.matchedBy}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground font-medium">Existing User ID: </span>
                                <span className="font-mono text-slate-200 font-semibold">{dupRow.duplicateDetails.existingUserId}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground font-medium">Existing Student: </span>
                                <span className="font-semibold text-slate-200">{dupRow.duplicateDetails.existingName}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground font-medium">Email: </span>
                                <a href={`mailto:${dupRow.duplicateDetails.existingEmail}`} className="text-blue-400 hover:underline">
                                  {dupRow.duplicateDetails.existingEmail}
                                </a>
                              </div>
                              <div>
                                <span className="text-muted-foreground font-medium">Phone: </span>
                                <span className="text-slate-200 font-semibold">{dupRow.duplicateDetails.existingPhone}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/10">
                          <Button 
                            size="sm" 
                            variant={duplicateAction === 'update' ? 'default' : 'outline'}
                            onClick={() => setDuplicateAction('update')}
                            className={`h-7 text-[10px] px-2.5 ${duplicateAction === 'update' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/5'}`}
                          >
                            Update Existing Student
                          </Button>
                          <Button 
                            size="sm" 
                            variant={duplicateAction === 'skip' ? 'default' : 'outline'}
                            onClick={() => setDuplicateAction('skip')}
                            className={`h-7 text-[10px] px-2.5 ${duplicateAction === 'skip' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/5'}`}
                          >
                            Skip Existing Student
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (dupRow.duplicateDetails) {
                                alert(
                                  `Existing Student Profile:\n` +
                                  `---------------------------\n` +
                                  `User ID: ${dupRow.duplicateDetails.existingUserId}\n` +
                                  `Name: ${dupRow.duplicateDetails.existingName}\n` +
                                  `Email: ${dupRow.duplicateDetails.existingEmail}\n` +
                                  `Phone: ${dupRow.duplicateDetails.existingPhone}\n` +
                                  `Matched By: ${dupRow.duplicateDetails.matchedBy}`
                                );
                              }
                            }}
                            className="h-7 text-[10px] px-2.5 border-amber-500/20 text-amber-400 hover:bg-amber-500/5"
                          >
                            View Existing Student
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation errors preview table */}
              {preview.errors && preview.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Validation Warnings / Errors
                  </div>
                  <div className="border border-red-500/20 rounded-xl overflow-hidden text-xs bg-red-500/5 max-h-[160px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-red-500/10">
                        <TableRow>
                          <TableHead className="w-20 py-2">Row</TableHead>
                          <TableHead className="py-2">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.errors.map((err: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold py-1.5">Row {err.rowNumber}</TableCell>
                            <TableCell className="text-red-400 py-1.5">{err.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="pt-1">
                    <Button variant="outline" size="sm" onClick={downloadErrorReport} className="border-red-500/30 text-red-500 hover:bg-red-500/5">
                      Download Error Report
                    </Button>
                  </div>
                </div>
              )}

              {/* Confirm Import Options Panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Duplicate Student Option</Label>
                  <select
                    value={duplicateAction}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="flex h-10 w-full sm:w-[260px] rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="skip">Skip Existing Students (Default)</option>
                    <option value="update">Update Existing Students</option>
                    <option value="import_new">Import New Students Only</option>
                  </select>
                </div>
                <Button className="min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmImport}>
                  Confirm & Import Valid Records
                </Button>
              </div>
            </div>
          )}

          {/* SUMMARY REPORT POST IMPORT */}
          {report && (
            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-sm space-y-3 mt-4">
              <h4 className="font-semibold text-emerald-400 text-base flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Import Summary Report
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Total Records</div>
                  <div className="text-lg font-bold mt-1 text-slate-200">{report.totalRecords}</div>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <div className="text-xs text-emerald-400 uppercase tracking-wider">Created/Updated</div>
                  <div className="text-lg font-bold mt-1 text-emerald-400">{report.created}</div>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                  <div className="text-xs text-blue-400 uppercase tracking-wider">Skipped</div>
                  <div className="text-lg font-bold mt-1 text-blue-400">{report.skipped}</div>
                </div>
                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  <div className="text-xs text-red-400 uppercase tracking-wider">Errors</div>
                  <div className="text-lg font-bold mt-1 text-red-400">{report.errors}</div>
                </div>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setReport(null)}>Dismiss Report</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IMPORT HISTORY / EMPTY STATE */}
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" /> Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-2xl border-border/60 bg-muted/5 space-y-4">
              <UserPlus className="w-12 h-12 mx-auto text-muted-foreground opacity-55" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">No student imports yet.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Download templates, populate user rows, and upload spreadsheets to perform batch enrollment.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" /> Download Template
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-primary hover:bg-[#1f5fa7]">
                  <Upload className="w-4 h-4 mr-2" /> Upload Student File
                </Button>
              </div>
            </div>
          ) : (
            <ResponsiveDataView
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Imported By</TableHead>
                      <TableHead>Imported On</TableHead>
                      <TableHead>Imported</TableHead>
                      <TableHead>Skipped</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((job) => (
                      <TableRow key={job._id}>
                        <TableCell className="font-medium">{job.fileName}</TableCell>
                        <TableCell className="capitalize">{job.status}</TableCell>
                        <TableCell className="text-muted-foreground">{job.uploadedBy?.name || 'Admin'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-emerald-400 font-semibold">{job.importedCount}</TableCell>
                        <TableCell className="text-blue-400 font-semibold">{job.skippedCount || 0}</TableCell>
                        <TableCell className="text-red-400 font-semibold">{job.failedCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {job.failedCount > 0 && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => downloadHistoryReport(job._id, job.fileName, 'error')}
                                className="text-xs border-red-500/20 text-red-400 hover:bg-red-500/5 py-1 px-2.5 h-8"
                              >
                                <Download className="w-3 h-3 mr-1" /> Error Report
                              </Button>
                            )}
                            {job.importedCount > 0 && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => downloadHistoryReport(job._id, job.fileName, 'success')}
                                className="text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 py-1 px-2.5 h-8"
                              >
                                <Download className="w-3 h-3 mr-1" /> Import Report
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
              mobile={history.map((job) => (
                <MobileRecordCard
                  key={job._id}
                  title={job.fileName}
                  badges={<span className="text-xs font-semibold uppercase text-muted-foreground">{job.status}</span>}
                  rows={[
                    { label: 'Imported By', value: job.uploadedBy?.name || 'Admin' },
                    { label: 'Imported On', value: new Date(job.createdAt).toLocaleString() },
                    { label: 'Imported', value: job.importedCount },
                    { label: 'Skipped', value: job.skippedCount || 0 },
                    { label: 'Failed', value: job.failedCount },
                  ]}
                  actions={
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50 w-full justify-end">
                      {job.failedCount > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => downloadHistoryReport(job._id, job.fileName, 'error')}
                          className="text-xs border-red-500/20 text-red-400 hover:bg-red-500/5 py-1 px-2 h-8"
                        >
                          Error Report
                        </Button>
                      )}
                      {job.importedCount > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => downloadHistoryReport(job._id, job.fileName, 'success')}
                          className="text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 py-1 px-2 h-8"
                        >
                          Import Report
                        </Button>
                      )}
                    </div>
                  }
                />
              ))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
