import './App.css'
import { useNews } from './hooks/useNews'
import Map from './components/Map'
import NewsSidebar from './components/NewsSidebar'

function App() {
  const {
    news,
    displayData,
    sidebarOpen,
    selectedId,
    mapRef,
    handleDataChange,
    handleSelectNews,
    toggleSidebar,
  } = useNews()

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Map newsData={displayData} mapRef={mapRef} sidebarOpen={sidebarOpen} />
      <NewsSidebar
        isOpen={sidebarOpen}
        newsData={news}
        selectedId={selectedId}
        onToggle={toggleSidebar}
        onSelectNews={handleSelectNews}
        onDataChange={handleDataChange}
      />
    </div>
  )
}

export default App
