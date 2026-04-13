import { parsePosterRetryMeta } from "@/lib/poster-retry-meta";

type PosterJobLike = {
  id: string;
  outputUrl?: string | null;
  errorMessage?: string | null;
};

export function buildPosterJobResponse<T extends PosterJobLike>(job: T) {
  const retryMeta = parsePosterRetryMeta(job.errorMessage);

  return {
    ...job,
    errorMessage: retryMeta.cleanMessage,
    retryCount: retryMeta.retryCount,
    maxRetries: retryMeta.maxRetries,
    outputUrl: job.outputUrl || `/api/posters/jobs/${job.id}/render`,
    renderEndpoint: `/api/posters/jobs/${job.id}/render`,
    previewEndpoint: `/api/posters/jobs/${job.id}/preview`,
    batchEndpoint: `/api/posters/jobs/${job.id}/batch`,
    processEndpoint: `/api/posters/jobs/${job.id}/process`,
    retryEndpoint: `/api/posters/jobs/${job.id}/retry`,
    workerEndpoint: "/api/posters/worker",
  };
}
