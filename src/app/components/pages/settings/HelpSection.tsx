import React from 'react';
import { HelpCircle, Video, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../ui/accordion';
import { toast } from 'sonner';

interface HelpSectionProps {
  isMobile?: boolean;
}

export default function HelpSection({ isMobile = false }: HelpSectionProps) {

  if (isMobile) {
    return (
      <div className="p-4 border-t border-border/45 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* FAQ list */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider">FAQs</h4>
          <div className="space-y-2">
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground block">How many devices can I log in from simultaneously?</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed block"> Login is restricted to one active browser session. Second device login terminates the previous connection.</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground block">Why did I receive a compliance security warning?</span>
              <span className="text-[11px] text-muted-foreground leading-relaxed block">Algorithms monitor screen recording, screenshots, and tab hidden states during video playback.</span>
            </div>
          </div>
        </div>

        {/* Support Request */}
        <div className="pt-4 border-t border-border/40 space-y-3">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider">Submit support ticket</h4>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject</label>
            <Input className="rounded-xl bg-background/50 border-border/50 text-xs" placeholder="e.g., video loader error" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea className="w-full min-h-20 p-2 text-xs bg-background/50 border border-border/50 rounded-xl focus:border-purple-500 outline-none" placeholder="Provide details..." />
          </div>
          <div className="flex justify-end pt-1">
            <Button 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-xs touch-btn"
              onClick={() => { toast.success('Ticket submitted successfully!'); }}
            >
              Submit Ticket
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-6">
      {/* FAQ Accordion */}
      <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Frequently Asked Questions</span>
          </CardTitle>
          <CardDescription>Quick solutions to common queries regarding account limits, video loading, and devices.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1" className="border-b border-border/30">
              <AccordionTrigger className="text-xs font-bold hover:no-underline">How many devices can I log in from simultaneously?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                To ensure platform security, your institute restricts login to one active browser session at any time. Logging in from a second device will terminate the previous connection. Review device sessions under the <strong>Security & Devices</strong> settings page.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2" className="border-b border-border/30">
              <AccordionTrigger className="text-xs font-bold hover:no-underline">Why did I receive a compliance security warning?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Our LMS anti-piracy algorithms monitor screenshots, screen recordings, and tab switches during video playback. Accumulating violations lowers your Security Compliance Score and may automatically lock access. Keep third-party recording software closed when learning.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Submit ticket form */}
      <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-sm font-bold">Submit a Support Request</CardTitle>
          <CardDescription>Need assistance? File a ticket and a representative will reply shortly.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject</label>
              <Input className="rounded-xl bg-background/50 border-border/50 text-xs" placeholder="e.g. Video loading issues, payment discrepancy" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description of the Issue</label>
              <textarea 
                className="w-full min-h-24 p-3 text-xs bg-background/50 border border-border/50 rounded-xl focus:border-purple-500 outline-none" 
                placeholder="Provide as much detail as possible to help our team resolve your query..." 
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-95 shadow-md shadow-purple-500/10 text-xs"
              onClick={() => {
                toast.success('Support ticket submitted successfully!', { description: 'Our support team will follow up via email.' });
              }}
            >
              Submit Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
