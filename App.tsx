import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EditorPage from './src/pages/EditorPage';
import GalleryPage from './src/pages/GalleryPage';

const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
