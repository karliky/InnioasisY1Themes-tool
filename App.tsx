import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EditorPage from './src/pages/EditorPage';
import GalleryPage from './src/pages/GalleryPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
