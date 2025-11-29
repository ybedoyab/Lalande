import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { MaterialsPage } from './pages/MaterialsPage';
import { MaterialDetail } from './components/MaterialDetail';
import { MarsDataView } from './components/MarsDataView';
import { EspacioPage } from './pages/EspacioPage';
import { ColonyPage } from './pages/ColonyPage';

/**
 * Main App Component
 * Follows Single Responsibility Principle - orchestrates main app structure
 */
function App() {
  return (
    <Layout>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/materials/:material" element={<MaterialDetail />} />
        <Route path="/mars" element={<MarsDataView />} />
        <Route path="/espacio" element={<EspacioPage />} />
        <Route path="/colony" element={<ColonyPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
