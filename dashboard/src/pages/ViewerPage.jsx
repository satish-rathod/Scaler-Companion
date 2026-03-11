import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecordings, getArtifact, exportRecording } from '../services/api';
import Layout from '../components/layout/Layout';
import MarkdownViewer from '../components/features/viewer/MarkdownViewer';
import TranscriptViewer from '../components/features/viewer/TranscriptViewer';
import StatusBadge from '../components/features/recording/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Download, Play, FileText, BookOpen, HelpCircle, ScrollText, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

const tabConfig = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'summary', label: 'Summary', icon: BookOpen },
  { id: 'qa', label: 'Q&A', icon: HelpCircle },
  { id: 'transcript', label: 'Transcript', icon: ScrollText },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
];

const ViewerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [tabContent, setTabContent] = useState({});
  const [loadingContent, setLoadingContent] = useState(false);
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const data = await getRecordings();
        const found = data.recordings.find(r => r.id === id);
        if (found) setRecording(found);
      } catch (err) {
        console.error('Failed to load recording', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecording();
  }, [id]);

  useEffect(() => {
    if (!recording?.artifacts?.slides) return;
    const slidePath = recording.artifacts.slides;
    const slideUrls = [];
    for (let i = 1; i <= 50; i++) {
      slideUrls.push(`http://localhost:8000${slidePath}slide_${String(i).padStart(3, '0')}.jpg`);
    }
    setSlides(slideUrls);
  }, [recording]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!recording || !recording.artifacts) return;
      const artifactMap = {
        notes: recording.artifacts.notes,
        transcript: recording.artifacts.transcript,
        summary: recording.artifacts.summary,
        qa: recording.artifacts.qa_cards,
        announcements: recording.artifacts.announcements,
      };
      const path = artifactMap[activeTab];
      if (path && !tabContent[activeTab]) {
        setLoadingContent(true);
        try {
          const content = await getArtifact(path);
          setTabContent(prev => ({ ...prev, [activeTab]: content }));
        } catch (err) {
          console.error(`Failed to load ${activeTab}`, err);
          setTabContent(prev => ({ ...prev, [activeTab]: 'Content not available.' }));
        } finally {
          setLoadingContent(false);
        }
      }
    };
    fetchContent();
  }, [activeTab, recording]);

  const handleExport = async () => {
    try {
      const response = await exportRecording(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'export.zip';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches?.[1]) filename = matches[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Failed to export recording');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!recording) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-xl font-semibold">Recording Not Found</h2>
          <p className="text-muted-foreground mt-1">This recording may have been deleted.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
        </div>
      </Layout>
    );
  }

  let videoUrl = '';
  if (recording.videoPath) {
    const parts = recording.videoPath.split('output/');
    if (parts.length > 1) {
      videoUrl = `http://localhost:8000/content/${parts[1]}`;
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{recording.title}</h1>
              <StatusBadge status={recording.status} />
            </div>
            <p className="text-sm text-muted-foreground">{recording.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {videoUrl && (
            <Button render={<a href={videoUrl} target="_blank" rel="noopener noreferrer" />}>
              <Play className="mr-2 h-4 w-4" />
              Watch Video
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Card className="py-4 gap-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
          <TabsList variant="line" className="px-6 pb-4">
            {tabConfig.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-3">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabConfig.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <CardContent className="p-8 min-h-[60vh] max-h-[75vh] overflow-y-auto">
                {loadingContent && activeTab === tab.id ? (
                  <div className="flex justify-center py-12">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : !tabContent[tab.id] ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <tab.icon className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No {tab.label.toLowerCase()} available</p>
                  </div>
                ) : tab.id === 'transcript' ? (
                  <TranscriptViewer
                    content={tabContent[tab.id]}
                    slides={slides}
                    slidesPath={recording.artifacts?.slides}
                  />
                ) : (
                  <MarkdownViewer content={tabContent[tab.id]} />
                )}
              </CardContent>
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </Layout>
  );
};

export default ViewerPage;
