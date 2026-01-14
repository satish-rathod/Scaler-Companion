import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.core.state import JOB_QUEUE, processes
from app.services.pipeline import ProcessingPipeline
from app.models.schemas import ProcessRequest

async def process_worker():
    """Background worker to process jobs sequentially"""
    print("👷 Starting process worker...")

    # We use a loop to constantly check for jobs.
    # In a production system, this would be a Redis/Celery queue.
    while True:
        try:
            if JOB_QUEUE:
                # Pick next job (FIFO)
                job = JOB_QUEUE.pop(0)
                process_id = job["id"]
                request: ProcessRequest = job["request"]

                print(f"👷 Worker picking up job: {process_id} ({request.title})")

                # Update status
                processes[process_id].status = "processing"
                processes[process_id].message = "Starting pipeline..."

                # Run actual processing
                await run_processing_job(process_id, request)

            else:
                # Idle wait
                await asyncio.sleep(1)

        except Exception as e:
            print(f"CRITICAL WORKER ERROR: {e}")
            await asyncio.sleep(5)

async def run_processing_job(process_id: str, request: ProcessRequest):
    """Executes the pipeline for a single job"""
    # Run heavy AI tasks in a thread pool to avoid blocking the event loop
    loop = asyncio.get_running_loop()

    def _execute_pipeline():
        try:
            pipeline = ProcessingPipeline(
                whisper_model=request.whisperModel,
                ollama_model=request.ollamaModel
            )

            def progress_callback(stage: str, current: int, total: int, message: str):
                # Update global state (thread-safe enough for simple dict assignment in Python)
                if process_id in processes:
                    processes[process_id].stage = stage
                    # A rough calculation of total progress based on stage
                    # transcription: 0-40, frames: 40-70, notes: 70-100
                    base_progress = 0
                    if stage == "transcription": base_progress = 0
                    elif stage == "frames": base_progress = 40
                    elif stage == "notes": base_progress = 70
                    elif stage == "complete": base_progress = 100

                    stage_weight = 40 if stage == "transcription" else 30
                    if stage == "complete": stage_weight = 0

                    calc_progress = base_progress + (current / total * stage_weight)
                    processes[process_id].progress = min(calc_progress, 100.0)
                    processes[process_id].message = message

            pipeline.set_progress_callback(progress_callback)

            return pipeline.process(
                video_path=request.videoPath,
                title=request.title,
                skip_transcription=request.skipTranscription,
                skip_frames=request.skipFrames,
                skip_notes=request.skipNotes,
                skip_slide_analysis=request.skipSlideAnalysis
            )

        except Exception as e:
            raise e

    try:
        # Execute blocking pipeline in executor
        result = await loop.run_in_executor(None, _execute_pipeline)

        processes[process_id].status = "complete"
        processes[process_id].progress = 100.0
        processes[process_id].message = "Processing complete"
        processes[process_id].outputDir = result.get("output_dir")

    except Exception as e:
        print(f"❌ Worker error processing {process_id}: {e}")
        processes[process_id].status = "error"
        processes[process_id].error = str(e)
        processes[process_id].message = f"Processing failed: {e}"
