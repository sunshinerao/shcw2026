"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Image as ImageIcon, Plus, RefreshCw } from "lucide-react";
import { AdminSectionGuard } from "@/components/admin/admin-section-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const templateTypes = ["EVENT", "SPEAKER", "AGENDA", "SOCIAL_CARD", "KNOWLEDGE"];

type Template = {
  id: string;
  templateName: string;
  templateType: string;
  aspectRatio: string;
};

type Job = {
  id: string;
  status: string;
  errorMessage?: string | null;
  retryCount?: number;
  maxRetries?: number;
  template: { templateName: string; templateType: string };
  previewEndpoint?: string;
  outputUrl?: string | null;
};

type JobSummary = {
  pending: number;
  running: number;
  completed: number;
  failed: number;
};

export default function AdminPostersPage() {
  const locale = useLocale();
  const t = useTranslations("adminPostersPage");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [summary, setSummary] = useState<JobSummary>({ pending: 0, running: 0, completed: 0, failed: 0 });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isWorkerRunning, setIsWorkerRunning] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("EVENT");
  const [aspectRatio, setAspectRatio] = useState("4:5");
  const [bgColor, setBgColor] = useState("#090f1f");
  const [accentColor, setAccentColor] = useState("#4fd1c5");
  const [titleScale, setTitleScale] = useState("1");
  const [timelineDensity, setTimelineDensity] = useState("balanced");
  const [templateId, setTemplateId] = useState("");
  const [eventId, setEventId] = useState("");
  const [knowledgeAssetId, setKnowledgeAssetId] = useState("");
  const [speakerId, setSpeakerId] = useState("");

  async function loadAll() {
    const [tRes, jRes] = await Promise.all([
      fetch("/api/posters/templates").then((r) => r.json()),
      fetch("/api/posters/jobs").then((r) => r.json()),
    ]);
    if (tRes.success) setTemplates(tRes.data || []);
    if (jRes.success) {
      setJobs(jRes.data || []);
      setSummary(jRes.summary || { pending: 0, running: 0, completed: 0, failed: 0 });
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void loadAll();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  async function createTemplate() {
    const payload = {
      templateName,
      templateType,
      aspectRatio,
      layoutJson: {
        version: 1,
        style: "editorial_timeline",
        sections: ["hero", "timeline", "meta"],
        tokens: {
          bgColor,
          accentColor,
          titleScale: Number(titleScale) || 1,
          timelineDensity,
        },
      },
    };
    const res = await fetch("/api/posters/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      setTemplateName("");
      setTemplateId(json.data.id);
      loadAll();
    }
  }

  async function createJob() {
    const payload = {
      templateId,
      eventId: eventId || undefined,
      knowledgeAssetId: knowledgeAssetId || undefined,
      speakerId: speakerId || undefined,
      locale,
      outputFormat: "png",
      processMode: "queue",
      autoProcess: false,
    };
    const res = await fetch("/api/posters/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      loadAll();
      if (json.data?.previewEndpoint) {
        window.open(json.data.previewEndpoint, "_blank");
      }
    }
  }

  async function processJob(jobId: string) {
    const res = await fetch(`/api/posters/jobs/${jobId}/process`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const json = await res.json();
    if (json.success) {
      loadAll();
    }
  }

  async function retryJob(jobId: string) {
    const res = await fetch(`/api/posters/jobs/${jobId}/retry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const json = await res.json();
    if (json.success) {
      await loadAll();
    }
  }

  async function runWorker(limit = 3) {
    setIsWorkerRunning(true);
    try {
      const res = await fetch(`/api/posters/worker?limit=${limit}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        await loadAll();
      }
    } finally {
      setIsWorkerRunning(false);
    }
  }

  async function retryFailed(limit = 20) {
    setIsRetryingFailed(true);
    try {
      const res = await fetch("/api/posters/jobs/retry-failed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      const json = await res.json();
      if (json.success) {
        await loadAll();
      }
    } finally {
      setIsRetryingFailed(false);
    }
  }

  return (
    <AdminSectionGuard section="posters">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-600">{t("subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("queue.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <div className="text-amber-700">{t("queue.pending")}</div>
                <div className="text-lg font-semibold text-amber-900">{summary.pending}</div>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
                <div className="text-sky-700">{t("queue.running")}</div>
                <div className="text-lg font-semibold text-sky-900">{summary.running}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                <div className="text-emerald-700">{t("queue.completed")}</div>
                <div className="text-lg font-semibold text-emerald-900">{summary.completed}</div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm">
                <div className="text-rose-700">{t("queue.failed")}</div>
                <div className="text-lg font-semibold text-rose-900">{summary.failed}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadAll()}
                className="inline-flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("actions.refresh")}
              </Button>
              <Button
                type="button"
                onClick={() => void runWorker(3)}
                disabled={isWorkerRunning}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isWorkerRunning ? t("actions.running") : t("actions.runWorker")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void retryFailed(20)}
                disabled={isRetryingFailed || summary.failed === 0}
              >
                {isRetryingFailed ? t("actions.retrying") : t("actions.retryFailed")}
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <span className="text-sm text-slate-600">{t("actions.autoRefresh")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("template.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>{t("template.name")}</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("template.type")}</Label><Select value={templateType} onValueChange={setTemplateType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{templateTypes.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{t("template.aspectRatio")}</Label><Input value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} placeholder="4:5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>{t("template.background")}</Label><Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder="#090f1f" /></div>
                <div className="space-y-2"><Label>{t("template.accent")}</Label><Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#4fd1c5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>{t("template.titleScale")}</Label><Input value={titleScale} onChange={(e) => setTitleScale(e.target.value)} placeholder="1.0" /></div>
                <div className="space-y-2"><Label>{t("template.timelineDensity")}</Label><Select value={timelineDensity} onValueChange={setTimelineDensity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compact">{t("template.compact")}</SelectItem><SelectItem value="balanced">{t("template.balanced")}</SelectItem><SelectItem value="airy">{t("template.airy")}</SelectItem></SelectContent></Select></div>
              </div>
              <Button onClick={() => void createTemplate()} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />{t("actions.create")}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("job.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>{t("job.template")}</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder={t("job.selectTemplate")} /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.templateName} ({t.templateType})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{t("job.eventIdOptional")}</Label><Input value={eventId} onChange={(e) => setEventId(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("job.knowledgeAssetIdOptional")}</Label><Input value={knowledgeAssetId} onChange={(e) => setKnowledgeAssetId(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("job.speakerIdOptional")}</Label><Input value={speakerId} onChange={(e) => setSpeakerId(e.target.value)} /></div>
              <Button onClick={() => void createJob()} disabled={!templateId} className="bg-sky-600 hover:bg-sky-700"><ImageIcon className="mr-2 h-4 w-4" />{t("job.enqueue")}</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("recentJobs.title")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                  <div className="font-medium text-slate-900">{job.template.templateName} · {job.template.templateType}</div>
                  <div className="text-slate-500">{job.id} · {job.status}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {t("recentJobs.retries")}: {job.retryCount ?? 0}/{job.maxRetries ?? 3}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <a className="text-emerald-700 hover:underline" href={`/api/posters/jobs/${job.id}/preview`} target="_blank" rel="noreferrer">
                      {t("recentJobs.openPreview")}
                    </a>
                    <a className="text-rose-700 hover:underline" href={`/api/posters/jobs/${job.id}/batch?mode=html&autostart=1`} target="_blank" rel="noreferrer">
                      {t("recentJobs.batchExport")}
                    </a>
                    <a className="text-fuchsia-700 hover:underline" href={`/api/posters/jobs/${job.id}/batch?mode=zip`} target="_blank" rel="noreferrer">
                      {t("recentJobs.downloadZip")}
                    </a>
                    {job.status !== "COMPLETED" && (
                      <button className="text-amber-700 hover:underline" type="button" onClick={() => void processJob(job.id)}>
                        {t("recentJobs.processNow")}
                      </button>
                    )}
                    {job.status === "FAILED" && (
                      <button
                        className="text-rose-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={() => void retryJob(job.id)}
                        disabled={(job.retryCount ?? 0) >= (job.maxRetries ?? 3)}
                      >
                        {t("recentJobs.retry")}
                      </button>
                    )}
                    <a className="inline-flex items-center text-sky-700 hover:underline" href={`/api/posters/jobs/${job.id}/render`} target="_blank" rel="noreferrer">
                      <Download className="mr-1 h-3.5 w-3.5" />
                      {t("recentJobs.downloadSvg")}
                    </a>
                    <a className="inline-flex items-center text-indigo-700 hover:underline" href={`/api/posters/jobs/${job.id}/render?format=png`} target="_blank" rel="noreferrer">
                      <Download className="mr-1 h-3.5 w-3.5" />
                      {t("recentJobs.downloadPng")}
                    </a>
                    <a className="inline-flex items-center text-violet-700 hover:underline" href={`/api/posters/jobs/${job.id}/render?format=pdf`} target="_blank" rel="noreferrer">
                      <Download className="mr-1 h-3.5 w-3.5" />
                      {t("recentJobs.downloadPdf")}
                    </a>
                  </div>
                  {job.outputUrl && (
                    <div className="mt-1 text-xs">
                      <a className="text-emerald-700 hover:underline" href={job.outputUrl} target="_blank" rel="noreferrer">
                        {t("recentJobs.storedOutput")}
                      </a>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <a className="text-slate-600 hover:underline" href={`/api/posters/jobs/${job.id}/render?format=png&preset=portrait`} target="_blank" rel="noreferrer">
                      {t("recentJobs.portrait")}
                    </a>
                    <a className="text-slate-600 hover:underline" href={`/api/posters/jobs/${job.id}/render?format=png&preset=square`} target="_blank" rel="noreferrer">
                      {t("recentJobs.square")}
                    </a>
                    <a className="text-slate-600 hover:underline" href={`/api/posters/jobs/${job.id}/render?format=png&preset=landscape`} target="_blank" rel="noreferrer">
                      {t("recentJobs.landscape")}
                    </a>
                  </div>
                  {job.status === "FAILED" && job.errorMessage && (
                    <div className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                      {job.errorMessage}
                    </div>
                  )}
                  {job.status === "FAILED" && (job.retryCount ?? 0) >= (job.maxRetries ?? 3) && (
                    <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      {t("recentJobs.retryLimitReached")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminSectionGuard>
  );
}
