import { useState, useMemo } from 'react';
import { Image, Clock, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * TranscriptViewer - Displays transcript with slides interleaved
 * Chunks transcript into paragraphs with timestamps
 */
const TranscriptViewer = ({ content, slides = [], slidesPath }) => {
    const [expandedChunks, setExpandedChunks] = useState({});
    const [slideErrors, setSlideErrors] = useState({});

    // Parse transcript into chunks (by timestamp or paragraph breaks)
    const chunks = useMemo(() => {
        if (!content) return [];

        // Split by double newlines or timestamp patterns
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

        // Group into chunks of ~3-4 sentences for readability
        const result = [];
        let currentChunk = { text: '', startTime: null, slideIndex: null };
        let sentenceCount = 0;

        paragraphs.forEach((para, idx) => {
            // Check for timestamp pattern like [00:01:23] or (00:01:23)
            const timeMatch = para.match(/[\[\(]?(\d{1,2}:\d{2}(?::\d{2})?)[\]\)]?/);
            if (timeMatch) {
                currentChunk.startTime = timeMatch[1];
            }

            currentChunk.text += (currentChunk.text ? '\n\n' : '') + para;
            sentenceCount += para.split(/[.!?]+/).length;

            // Create new chunk every ~4 sentences or every 3 paragraphs
            if (sentenceCount >= 4 || (idx + 1) % 3 === 0) {
                // Assign a slide roughly every 2-3 chunks
                if (slides.length > 0) {
                    const slideIdx = Math.floor(result.length / 2) % slides.length;
                    currentChunk.slideIndex = slideIdx;
                }

                result.push({ ...currentChunk, id: result.length });
                currentChunk = { text: '', startTime: null, slideIndex: null };
                sentenceCount = 0;
            }
        });

        // Don't forget the last chunk
        if (currentChunk.text) {
            result.push({ ...currentChunk, id: result.length });
        }

        return result;
    }, [content, slides]);

    const toggleChunk = (id) => {
        setExpandedChunks(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSlideError = (index) => {
        setSlideErrors(prev => ({ ...prev, [index]: true }));
    };

    // Build slide URL
    const getSlideUrl = (index) => {
        if (!slidesPath) return null;
        const slideNum = String(index + 1).padStart(3, '0');
        return `http://localhost:8000${slidesPath}slide_${slideNum}.jpg`;
    };

    if (!content) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>No transcript available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-800">
                    Enhanced Transcript
                </h3>
                <span className="text-sm text-gray-500">
                    {chunks.length} sections • {slides.length > 0 ? `${slides.length} slides` : 'No slides'}
                </span>
            </div>

            {/* Transcript Chunks */}
            <div className="space-y-8">
                {chunks.map((chunk, idx) => (
                    <div key={chunk.id} className="group">
                        {/* Slide (shown every few chunks) */}
                        {chunk.slideIndex !== null && idx % 2 === 0 && !slideErrors[chunk.slideIndex] && (
                            <div className="mb-4 flex justify-center">
                                <div className="relative max-w-2xl w-full">
                                    <img
                                        src={getSlideUrl(chunk.slideIndex)}
                                        alt={`Slide ${chunk.slideIndex + 1}`}
                                        className="w-full rounded-lg shadow-md border border-gray-200"
                                        onError={() => handleSlideError(chunk.slideIndex)}
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                        Slide {chunk.slideIndex + 1}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Transcript Chunk */}
                        <div className="flex gap-4">
                            {/* Timeline indicator */}
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <div className="w-0.5 flex-1 bg-gray-200" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-4">
                                {/* Timestamp */}
                                {chunk.startTime && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                        <Clock className="w-3 h-3" />
                                        {chunk.startTime}
                                    </div>
                                )}

                                {/* Text */}
                                <div
                                    className={`text-gray-700 leading-relaxed ${expandedChunks[chunk.id] ? '' : 'line-clamp-4'
                                        }`}
                                >
                                    {chunk.text.split('\n').map((line, i) => (
                                        <p key={i} className={i > 0 ? 'mt-2' : ''}>
                                            {line}
                                        </p>
                                    ))}
                                </div>

                                {/* Expand/Collapse for long chunks */}
                                {chunk.text.length > 400 && (
                                    <button
                                        onClick={() => toggleChunk(chunk.id)}
                                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        {expandedChunks[chunk.id] ? (
                                            <>
                                                <ChevronUp className="w-4 h-4" />
                                                Show less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4" />
                                                Show more
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TranscriptViewer;
