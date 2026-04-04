import {
    AudioJobRecord,
    AudioJobRepository,
    AudioStatusMessageDTO,
    CreateAudioJobRecordDTO,
    ListAudioJobsResult,
} from "@app/repositories/audio-job-repository";

export class InMemoryAudioJobRepository implements AudioJobRepository {
    public jobs: AudioJobRecord[] = [];
    public queuedMessages: Array<{ queue: string; message: any }> = [];
    public shouldFailSendToQueue = false;

    async sendToQueue(queue: string, message: any): Promise<void> {
        if (this.shouldFailSendToQueue) {
            throw new Error("queue failure");
        }

        this.queuedMessages.push({ queue, message });
    }

    async createJobRecord(data: CreateAudioJobRecordDTO): Promise<void> {
        this.jobs.push({
            job_id: data.job_id,
            user_id: data.user_id,
            input_url: data.input_url,
            output_key: null,
            output_url: null,
            output_size_bytes: null,
            status: data.status,
            created_at: new Date(),
            updated_at: new Date(),
            completed_at: null,
        });
    }

    async updateJobStatus(jobId: string, status: string): Promise<void> {
        this.jobs = this.jobs.map((job) =>
            job.job_id === jobId
                ? {
                    ...job,
                    status,
                    updated_at: new Date(),
                    completed_at: status === "completed" ? new Date() : null,
                }
                : job,
        );
    }

    async handleJobComplete(message: AudioStatusMessageDTO): Promise<void> {
        this.jobs = this.jobs.map((job) =>
            job.job_id === message.job_id
                ? {
                    ...job,
                    status: message.status,
                    output_key: message.output_key ?? null,
                    output_url: message.output_url ?? null,
                    output_size_bytes: message.output_size_bytes ?? null,
                    updated_at: new Date(),
                    completed_at: message.status === "completed" ? new Date() : null,
                }
                : job,
        );
    }

    async findByJobIdAndUser(jobId: string, userId: string): Promise<AudioJobRecord | null> {
        return this.jobs.find((job) => job.job_id === jobId && job.user_id === userId) ?? null;
    }

    async listByUser(userId: string, page: number, limit: number): Promise<ListAudioJobsResult> {
        const jobs = this.jobs.filter((job) => job.user_id === userId);
        const skip = (page - 1) * limit;

        return {
            items: jobs.slice(skip, skip + limit),
            total: jobs.length,
        };
    }
}
