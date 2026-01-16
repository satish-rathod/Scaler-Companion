import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecordings, getArtifact, exportRecording } from '../services/api';
import Layout from '../components/layout/Layout';
import MarkdownViewer from '../components/features/viewer/MarkdownViewer';
import TranscriptViewer from '../components/features/viewer/TranscriptViewer';
import Tabs from '../components/common/Tabs';
import { Loader, Download, ArrowLeft, Play } from 'lucide-react';

const ViewerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [tabContent, setTabContent] = useState({});
  const [loadingContent, setLoadingContent] = useState(false);
  const [slides, setSlides] = useState([]);

  // Fetch Recording Metadata
  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const data = await getRecordings();
        const found = data.recordings.find(r => r.id === id);
        if (found) {
          setRecording(found);
        }
      } catch (err) {
        console.error("Failed to load recording", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecording();
  }, [id]);

  // Fetch slides list
  useEffect(() => {
    const fetchSlides = async () => {
      if (!recording?.artifacts?.slides) return;
      try {
        // Slides are in /content/{id}/slides/ - fetch list
        const slidePath = recording.artifacts.slides;
        // We'll construct slide URLs from 1 to N (assume max 50)
        const slideUrls = [];
        for (let i = 1; i <= 50; i++) {
          slideUrls.push(`http://localhost:8000${slidePath}slide_${String(i).padStart(3, '0')}.jpg`);
        }
        setSlides(slideUrls);
      } catch (err) {
        console.error("Failed to load slides", err);
      }
    };
    fetchSlides();
  }, [recording]);

  // Fetch Content when Tab Changes
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
          setTabContent(prev => ({ ...prev, [activeTab]: "Content not available." }));
        } finally {
          setLoadingContent(false);
        }
      }
    };

    fetchContent();
  }, [activeTab, recording]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  if (!recording) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-700">Recording Not Found</h2>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'notes', label: 'Lecture Notes' },
    { id: 'summary', label: 'Summary' },
    { id: 'qa', label: 'Q&A Cards' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'announcements', label: 'Announcements' },
  ];

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
      console.error("Export failed", err);
      alert("Failed to export recording.");
    }
  };

  // Video URL construction
  let videoUrl = "";
  if (recording.videoPath) {
    const parts = recording.videoPath.split("output/");
    if (parts.length > 1) {
      videoUrl = `http://localhost:8000/content/${parts[1]}`;
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{recording.title}</h1>
            <p className="text-sm text-gray-500">{recording.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              Watch Video
            </a>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Full-width Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6 pt-4">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="p-8 min-h-[60vh] max-h-[75vh] overflow-y-auto">
          {loadingContent ? (
            <div className="flex justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'transcript' ? (
            <TranscriptViewer
              content={tabContent[activeTab]}
              slides={slides}
              slidesPath={recording.artifacts?.slides}
            />
          ) : (
            <MarkdownViewer content={tabContent[activeTab]} />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ViewerPage;
