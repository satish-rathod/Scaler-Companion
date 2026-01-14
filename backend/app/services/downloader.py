import os
import asyncio
import httpx
import ffmpeg
import shutil
import aiofiles
from pathlib import Path
from typing import Optional, Callable
from concurrent.futures import ThreadPoolExecutor

class VideoDownloader:
    def __init__(self, output_dir: str, clip_duration: int = 120):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.chunks_dir = self.output_dir / "chunks"
        self.chunks_dir.mkdir(exist_ok=True)
        self.clip_duration = clip_duration
        self.progress_callback: Optional[Callable[[int, int, str], None]] = None

    def set_progress_callback(self, callback: Callable[[int, int, str], None]):
        self.progress_callback = callback

    def _update_progress(self, current: int, total: int, message: str):
        if self.progress_callback:
            self.progress_callback(current, total, message)

    async def download_chunks(self, base_url: str, start_chunk: int, end_chunk: int,
                            key_pair_id: str, policy: str, signature: str):
        """
        Download .ts chunks concurrently using httpx and asyncio.
        """
        total_chunks = end_chunk - start_chunk + 1
        downloaded = 0

        # Clean up existing chunks
        if self.chunks_dir.exists():
            shutil.rmtree(self.chunks_dir)
        self.chunks_dir.mkdir()

        async def fetch_chunk(client, chunk_id):
            nonlocal downloaded
            url = f"{base_url}{chunk_id}.ts"
            params = {
                "Key-Pair-Id": key_pair_id,
                "Policy": policy,
                "Signature": signature
            }
            file_path = self.chunks_dir / f"{chunk_id}.ts"

            try:
                # Retry logic
                for attempt in range(3):
                    try:
                        resp = await client.get(url, params=params, timeout=30.0)
                        resp.raise_for_status()
                        async with aiofiles.open(file_path, 'wb') as f:
                            await f.write(resp.content)
                        break
                    except (httpx.RequestError, httpx.HTTPStatusError) as e:
                        if attempt == 2:
                            print(f"Failed chunk {chunk_id}: {e}")
                            return False
                        await asyncio.sleep(1)

                downloaded += 1
                if downloaded % 5 == 0:  # Update progress every 5 chunks to reduce overhead
                    self._update_progress(downloaded, total_chunks, f"Downloaded chunk {chunk_id}")
                return True
            except Exception as e:
                print(f"Error downloading chunk {chunk_id}: {e}")
                return False

        # Limit concurrency to avoid overwhelming the server or local connection
        limits = httpx.Limits(max_keepalive_connections=20, max_connections=20)
        async with httpx.AsyncClient(limits=limits) as client:
            tasks = []
            for i in range(start_chunk, end_chunk + 1):
                tasks.append(fetch_chunk(client, i))

            results = await asyncio.gather(*tasks)

        success_count = sum(1 for r in results if r)
        return success_count > (total_chunks * 0.9) # Success if > 90% chunks downloaded

    async def merge_chunks_to_video(self, start_chunk: int, end_chunk: int) -> Optional[str]:
        """
        Merge downloaded .ts chunks into a single .mp4 file using FFmpeg.
        Runs in a separate thread to avoid blocking the event loop.
        """

        def _run_ffmpeg():
            try:
                # Create a file list for ffmpeg
                list_file_path = self.chunks_dir / "file_list.txt"
                with open(list_file_path, "w") as f:
                    for i in range(start_chunk, end_chunk + 1):
                        chunk_path = self.chunks_dir / f"{i}.ts"
                        if chunk_path.exists():
                            f.write(f"file '{chunk_path.name}'\n")

                output_file = self.output_dir / "full_video.mp4"

                # Use ffmpeg-python to concat
                (
                    ffmpeg
                    .input(str(list_file_path), format='concat', safe=0)
                    .output(str(output_file), c='copy')
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )

                # Cleanup chunks after successful merge
                if output_file.exists():
                    shutil.rmtree(self.chunks_dir)
                    return str(output_file)
                return None
            except ffmpeg.Error as e:
                print(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
                return None
            except Exception as e:
                print(f"Merge error: {e}")
                return None

        # Run in executor
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _run_ffmpeg)
