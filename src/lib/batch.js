/**
 * Batch Export system for exporting multiple channels at once.
 * 
 * Allows users to export multiple channels/servers in a single operation
 * with progress tracking and individual status monitoring.
 */

(() => {
  /**
   * @typedef {Object} BatchJob
   * @property {string} id - Unique job ID
   * @property {string} status - 'pending' | 'running' | 'completed' | 'failed'
   * @property {Array<{channelId, channelName, serverId, serverName}>} channels
   * @property {number} completed - Channels completed
   * @property {number} total - Total channels
   * @property {number} progress - 0-100
   * @property {Date} createdAt
   * @property {Date} startedAt
   * @property {Date} completedAt
   * @property {string} error - Error message if failed
   */

  const BATCH_JOBS_KEY = 'discordExporterBatchJobs';
  const MAX_CONCURRENT_JOBS = 3; // Limit concurrent channel exports

  /**
   * Creates a new batch job.
   * @param {Array} channels - Channels to export {channelId, channelName, serverId, serverName}
   * @param {Object} options - Export options {format, filters, template}
   * @returns {Object} Created batch job
   */
  function createBatchJob(channels, options = {}) {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      status: 'pending',
      channels: channels || [],
      completed: 0,
      total: (channels || []).length,
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      options: {
        format: options.format || 'csv',
        filters: options.filters || {},
        template: options.template || 'standard',
        includeMetadata: options.includeMetadata !== false
      },
      results: [] // Array of {channelId, fileName, status, size, error}
    };

    saveBatchJob(job);
    return job;
  }

  /**
   * Gets a batch job by ID.
   * @param {string} jobId - Job ID
   * @returns {Object | null} Batch job or null
   */
  function getBatchJob(jobId) {
    const stored = localStorage.getItem(BATCH_JOBS_KEY);
    if (!stored) return null;
    
    const jobs = JSON.parse(stored);
    return jobs[jobId] || null;
  }

  /**
   * Gets all batch jobs.
   * @param {string} filter - Filter by status: 'all', 'pending', 'running', 'completed', 'failed'
   * @returns {Array} Batch jobs
   */
  function getAllBatchJobs(filter = 'all') {
    const stored = localStorage.getItem(BATCH_JOBS_KEY);
    if (!stored) return [];
    
    const jobs = Object.values(JSON.parse(stored));
    if (filter === 'all') return jobs;
    return jobs.filter(j => j.status === filter);
  }

  /**
   * Saves a batch job to storage.
   * @param {Object} job - Batch job object
   * @returns {void}
   */
  function saveBatchJob(job) {
    const stored = localStorage.getItem(BATCH_JOBS_KEY);
    const jobs = stored ? JSON.parse(stored) : {};
    jobs[job.id] = job;
    localStorage.setItem(BATCH_JOBS_KEY, JSON.stringify(jobs));
  }

  /**
   * Updates batch job progress.
   * @param {string} jobId - Job ID
   * @param {number} completed - Channels completed
   * @param {Object} result - Result for current channel {channelId, fileName, status, size}
   * @returns {Object} Updated job
   */
  function updateBatchProgress(jobId, completed, result = null) {
    const job = getBatchJob(jobId);
    if (!job) return null;

    job.completed = completed;
    job.progress = Math.round((completed / job.total) * 100);
    
    if (result) {
      job.results = job.results || [];
      job.results.push(result);
    }

    if (completed >= job.total) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    } else if (job.status === 'pending') {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
    }

    saveBatchJob(job);
    return job;
  }

  /**
   * Marks batch job as failed.
   * @param {string} jobId - Job ID
   * @param {string} error - Error message
   * @returns {Object} Updated job
   */
  function failBatchJob(jobId, error) {
    const job = getBatchJob(jobId);
    if (!job) return null;

    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date().toISOString();

    saveBatchJob(job);
    return job;
  }

  /**
   * Cancels a batch job.
   * @param {string} jobId - Job ID
   * @returns {boolean} Success
   */
  function cancelBatchJob(jobId) {
    const job = getBatchJob(jobId);
    if (!job) return false;

    if (job.status === 'pending' || job.status === 'running') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      saveBatchJob(job);
      return true;
    }

    return false;
  }

  /**
   * Deletes a batch job.
   * @param {string} jobId - Job ID
   * @returns {boolean} Success
   */
  function deleteBatchJob(jobId) {
    const stored = localStorage.getItem(BATCH_JOBS_KEY);
    if (!stored) return false;

    const jobs = JSON.parse(stored);
    if (jobId in jobs) {
      delete jobs[jobId];
      localStorage.setItem(BATCH_JOBS_KEY, JSON.stringify(jobs));
      return true;
    }

    return false;
  }

  /**
   * Gets batch job statistics.
   * @returns {Object} {totalJobs, pending, running, completed, failed, totalChannels}
   */
  function getBatchStats() {
    const jobs = getAllBatchJobs();
    const stats = {
      totalJobs: jobs.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalChannels: 0,
      totalExported: 0
    };

    jobs.forEach(job => {
      stats[job.status] = (stats[job.status] || 0) + 1;
      stats.totalChannels += job.total;
      stats.totalExported += job.completed;
    });

    return stats;
  }

  /**
   * Exports batch job results as CSV manifest.
   * @param {string} jobId - Job ID
   * @returns {string} CSV manifest content
   */
  function exportBatchManifest(jobId) {
    const job = getBatchJob(jobId);
    if (!job) return '';

    let csv = 'Channel ID,Channel Name,Server ID,Server Name,Status,File Name,File Size (KB),Error\n';
    
    job.results.forEach(result => {
      const row = [
        result.channelId || '',
        result.channelName || '',
        result.serverId || '',
        result.serverName || '',
        result.status || 'pending',
        result.fileName || '',
        result.size ? Math.round(result.size / 1024) : '',
        result.error ? `"${result.error.replace(/"/g, '""')}"` : ''
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Downloads batch job results as manifest.
   * @param {string} jobId - Job ID
   * @returns {void}
   */
  function downloadBatchManifest(jobId) {
    const job = getBatchJob(jobId);
    if (!job) return;

    const manifest = exportBatchManifest(jobId);
    const blob = new Blob([manifest], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_export_${jobId}_manifest.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const api = {
    createBatchJob,
    getBatchJob,
    getAllBatchJobs,
    updateBatchProgress,
    failBatchJob,
    cancelBatchJob,
    deleteBatchJob,
    getBatchStats,
    exportBatchManifest,
    downloadBatchManifest,
    MAX_CONCURRENT_JOBS
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterBatch = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
