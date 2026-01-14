import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRecordings, getArtifact, exportRecording } from '../services/api';
import Layout from '../components/layout/Layout';
import VideoPlayer from '../components/features/viewer/VideoPlayer';
import MarkdownViewer from '../components/features/viewer/MarkdownViewer';
import Tabs from '../components/common/Tabs';
import { Loader, Download } from 'lucide-react';

const ViewerPage = () => {
  const { id } = useParams();
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [tabContent, setTabContent] = useState({});
  const [loadingContent, setLoadingContent] = useState(false);

  // 1. Fetch Recording Metadata
  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const data = await getRecordings();
        const found = data.recordings.find(r => r.id === id);
        if (found) {
          setRecording(found);
        } else {
          console.error("Recording not found");
        }
      } catch (err) {
        console.error("Failed to load recording", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecording();
  }, [id]);

  // 2. Fetch Content when Tab Changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!recording || !recording.artifacts) return;

      const artifactMap = {
        notes: recording.artifacts.notes,
        transcript: recording.artifacts.transcript,
        summary: recording.artifacts.summary,
        qa: recording.artifacts.qa_cards,
      };

      const path = artifactMap[activeTab];

      if (path && !tabContent[activeTab]) {
        setLoadingContent(true);
        try {
          const content = await getArtifact(path);
          setTabContent(prev => ({ ...prev, [activeTab]: content }));
        } catch (err) {
          console.error(`Failed to load ${activeTab}`, err);
          setTabContent(prev => ({ ...prev, [activeTab]: "Failed to load content." }));
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
  ];

  // Construct video URL
  // If videoPath is absolute path (from backend), we need to serve it.
  // Currently backend serves /content -> output/
  // But video might be in output/videos/Title/full_video.mp4 OR output/Date_Title/video.mp4
  // The 'videoPath' from API is absolute file path. We need to convert it to a URL relative to /content
  // or serve it via a dedicated endpoint.
  // Given strict static mounting: app.mount("/content", output_dir)
  // We need to find the relative path from output_dir.

  // Hacky fix for URL generation based on our file structure knowledge
  // If videoPath contains "output/", take everything after "output/"
  let videoUrl = "";
  if (recording.videoPath) {
      const parts = recording.videoPath.split("output/");
      if (parts.length > 1) {
          videoUrl = `/content/${parts[1]}`;
      }
  }

  const handleExport = async () => {
    try {
      const response = await exportRecording(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from header or fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'export.zip';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
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

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{recording.title}</h1>
          <p className="text-sm text-gray-500">{recording.date}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Video */}
        <div className="lg:col-span-2 space-y-6">
          <VideoPlayer src={videoUrl} />
        </div>

        {/* Right Column: Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[calc(100vh-200px)] flex flex-col">
          <div className="px-4 pt-2">
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loadingContent ? (
              <div className="flex justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <MarkdownViewer content={tabContent[activeTab]} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ViewerPage;
