import os
import asyncio
import httpx
import ffmpeg
import shutil
import aiofiles
from pathlib import Path
from typing import Optional, Callable


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
        Chunk format: data000037.ts (6-digit zero-padded with 'data' prefix)
        """
        total_chunks = end_chunk - start_chunk + 1
        downloaded = 0
        consecutive_failures = 0

        # Clean up existing chunks
        if self.chunks_dir.exists():
            shutil.rmtree(self.chunks_dir)
        self.chunks_dir.mkdir()

        async def fetch_chunk(client, chunk_id) -> bool:
            nonlocal downloaded, consecutive_failures
            
            # Scaler uses data000037.ts format (6-digit zero-padded)
            filename = f"data{chunk_id:06d}.ts"
            url = f"{base_url}{filename}"
            params = {
                "Key-Pair-Id": key_pair_id,
                "Policy": policy,
                "Signature": signature
            }
            file_path = self.chunks_dir / f"{chunk_id:06d}.ts"

            try:
                for attempt in range(3):
                    try:
                        resp = await client.get(url, params=params, timeout=30.0)
                        resp.raise_for_status()
                        async with aiofiles.open(file_path, 'wb') as f:
                            await f.write(resp.content)
                        consecutive_failures = 0
                        break
                    except httpx.HTTPStatusError as e:
                        if e.response.status_code == 403:
                            consecutive_failures += 1
                            if consecutive_failures >= 3:
                                print(f"[Downloader] Chunk {chunk_id} returned 403 - likely end of stream")
                                return False
                        if attempt == 2:
                            print(f"Failed chunk {chunk_id}: {e}")
                            return False
                        await asyncio.sleep(1)
                    except httpx.RequestError as e:
                        if attempt == 2:
                            print(f"Failed chunk {chunk_id}: {e}")
                            return False
                        await asyncio.sleep(1)

                downloaded += 1
                if downloaded % 10 == 0:
                    self._update_progress(downloaded, total_chunks, f"Downloaded {downloaded}/{total_chunks}")
                return True
            except Exception as e:
                print(f"Error downloading chunk {chunk_id}: {e}")
                return False

        limits = httpx.Limits(max_keepalive_connections=10, max_connections=10)
        async with httpx.AsyncClient(limits=limits) as client:
            for i in range(start_chunk, end_chunk + 1):
                success = await fetch_chunk(client, i)
                if not success:
                    consecutive_failures += 1
                    if consecutive_failures >= 10:
                        print(f"[Downloader] Stopping - 10 consecutive failures")
                        break
                else:
                    consecutive_failures = 0
            
            self._update_progress(downloaded, downloaded, f"Downloaded {downloaded} chunks")

        return downloaded > 0

    async def merge_chunks_to_video(self, start_chunk: int, end_chunk: int) -> Optional[str]:
        """Merge downloaded .ts chunks into a single .mp4 file using FFmpeg."""

        def _run_ffmpeg():
            try:
                list_file_path = self.chunks_dir / "file_list.txt"
                
                chunk_files = sorted(
                    [f for f in self.chunks_dir.glob("*.ts")],
                    key=lambda x: int(x.stem)
                )
                
                if not chunk_files:
                    print("[Downloader] No chunk files found")
                    return None
                
                print(f"[Downloader] Merging {len(chunk_files)} chunks...")
                
                with open(list_file_path, "w") as f:
                    for chunk_path in chunk_files:
                        f.write(f"file '{chunk_path.name}'\n")

                output_file = self.output_dir / "full_video.mp4"

                (
                    ffmpeg
                    .input(str(list_file_path), format='concat', safe=0)
                    .output(str(output_file), c='copy')
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )

                if output_file.exists():
                    shutil.rmtree(self.chunks_dir)
                    print(f"[Downloader] Merged: {output_file}")
                    return str(output_file)
                return None
            except ffmpeg.Error as e:
                print(f"FFmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
                return None
            except Exception as e:
                print(f"Merge error: {e}")
                return None

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _run_ffmpeg)
