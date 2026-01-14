import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const ViewerPage = () => {
  const { id } = useParams();

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-4">Viewer: {id}</h2>
      <div className="bg-white p-8 rounded-lg border border-gray-200">
        <p className="text-gray-500">
          Detailed viewer implementation coming in next steps (Video + Notes Tabs).
        </p>
      </div>
    </Layout>
  );
};

export default ViewerPage;
