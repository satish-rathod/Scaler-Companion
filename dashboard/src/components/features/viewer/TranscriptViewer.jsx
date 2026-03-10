import { useState, useMemo } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const TranscriptViewer = ({ content, slides = [], slidesPath }) => {
  const [expandedChunks, setExpandedChunks] = useState({});
  const [slideErrors, setSlideErrors] = useState({});

  const chunks = useMemo(() => {
    if (!content) return [];
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    const result = [];
    let currentChunk = { text: '', startTime: null, slideIndex: null };
    let sentenceCount = 0;

    paragraphs.forEach((para, idx) => {
      const timeMatch = para.match(/[\[\(]?(\d{1,2}:\d{2}(?::\d{2})?)[\]\)]?/);
      if (timeMatch) currentChunk.startTime = timeMatch[1];
      currentChunk.text += (currentChunk.text ? '\n\n' : '') + para;
      sentenceCount += para.split(/[.!?]+/).length;

      if (sentenceCount >= 4 || (idx + 1) % 3 === 0) {
        if (slides.length > 0) {
          const slideIdx = Math.floor(result.length / 2) % slides.length;
          currentChunk.slideIndex = slideIdx;
        }
        result.push({ ...currentChunk, id: result.length });
        currentChunk = { text: '', startTime: null, slideIndex: null };
        sentenceCount = 0;
      }
    });

    if (currentChunk.text) result.push({ ...currentChunk, id: result.length });
    return result;
  }, [content, slides]);

  const toggleChunk = (id) => {
    setExpandedChunks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSlideUrl = (index) => {
    if (!slidesPath) return null;
    const slideNum = String(index + 1).padStart(3, '0');
    return `http://localhost:8000${slidesPath}slide_${slideNum}.jpg`;
  };

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No transcript available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Enhanced Transcript</h3>
        <span className="text-sm text-muted-foreground">
          {chunks.length} sections
        </span>
      </div>
      <Separator />

      <div className="space-y-8">
        {chunks.map((chunk, idx) => (
          <div key={chunk.id} className="group">
            {chunk.slideIndex !== null && idx % 2 === 0 && !slideErrors[chunk.slideIndex] && (
              <Card className="mb-4 overflow-hidden max-w-2xl mx-auto">
                <div className="relative">
                  <img
                    src={getSlideUrl(chunk.slideIndex)}
                    alt={`Slide ${chunk.slideIndex + 1}`}
                    className="w-full"
                    onError={() => setSlideErrors(prev => ({ ...prev, [chunk.slideIndex]: true }))}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Slide {chunk.slideIndex + 1}
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div className="w-0.5 flex-1 bg-border" />
              </div>

              <div className="flex-1 pb-4">
                {chunk.startTime && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" />
                    {chunk.startTime}
                  </div>
                )}

                <div className={`text-foreground leading-relaxed ${expandedChunks[chunk.id] ? '' : 'line-clamp-4'}`}>
                  {chunk.text.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                  ))}
                </div>

                {chunk.text.length > 400 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 p-0 h-auto"
                    onClick={() => toggleChunk(chunk.id)}
                  >
                    {expandedChunks[chunk.id] ? (
                      <><ChevronUp className="mr-1 h-4 w-4" />Show less</>
                    ) : (
                      <><ChevronDown className="mr-1 h-4 w-4" />Show more</>
                    )}
                  </Button>
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
